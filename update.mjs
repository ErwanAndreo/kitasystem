// Installiert oder aktualisiert KitaPlaner aus dem GitHub-Stand von main.
// Vor einem Update wird alles nach backups/update_* gesichert; schlägt die Prüfung fehl, wird zurückgerollt.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ZIP_URL = process.env.KITA_ZIP_URL || 'https://github.com/ErwanAndreo/kitasystem/archive/refs/heads/main.zip';
// Windows-eigenes tar entpackt ZIPs; ein tar aus Git Bash im PATH kann das nicht.
const TAR = process.platform === 'win32' ? path.join(process.env.SystemRoot, 'System32', 'tar.exe') : 'tar';
const TMP = path.join(ROOT, '.update_tmp');
const PROBE_PORT = 3199;
const DB_FILES = ['kita.sqlite', 'kita.sqlite-wal', 'kita.sqlite-shm'];
const NOT_BACKED_UP = new Set(['node_modules', 'node', 'backups', '.update_tmp']);
const NOT_SHIPPED = new Set([...NOT_BACKED_UP, 'logs', 'kita_mobile', 'test_backend_full.js', '.claude']);
// Der Start leert group_hourly_children bewusst (Migration), notification_queue ändert sich im Betrieb.
const MAY_SHRINK = new Set(['group_hourly_children', 'notification_queue']);

const copy = (from, to, options) => fs.cpSync(from, to, { recursive: true, ...options });
// Wiederholen, weil Virenscanner frische Dateien unter Windows kurz sperren.
const remove = (target) => fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(command, args, options) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} fehlgeschlagen`);
}
const npm = (...args) => run('npm', args, { shell: true });

async function isUp(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
    return (await res.json()).status === 'UP';
  } catch {
    return false;
  }
}

function rowCounts() {
  if (!fs.existsSync(path.join(ROOT, 'kita.sqlite'))) return null;
  const code = `const D = require('better-sqlite3'); const db = new D('kita.sqlite'); const out = {};
    for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())
      out[name] = db.prepare('SELECT COUNT(*) c FROM "' + name + '"').get().c;
    console.log(JSON.stringify(out));`;
  // Eigener Prozess: ein hier geladenes better-sqlite3 bliebe unter Windows gesperrt und würde npm ci beim Rollback blockieren.
  const result = spawnSync(process.execPath, ['-e', code], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Datenbank nicht lesbar: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

async function probeNewVersion() {
  const child = spawn(process.execPath, ['dist/server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PROBE_PORT) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  let up = false;
  for (let i = 0; i < 30 && !up && child.exitCode === null; i++) {
    await sleep(1000);
    up = await isUp(PROBE_PORT);
  }
  child.kill();
  await exited;
  if (!up) throw new Error('Die neue Version startet nicht.');
}

function createBackup() {
  const target = path.join(ROOT, 'backups', `update_${new Date().toISOString().replace(/[:.]/g, '-')}`);
  for (const name of fs.readdirSync(ROOT)) {
    if (!NOT_BACKED_UP.has(name)) copy(path.join(ROOT, name), path.join(target, name));
  }
  console.log(`Backup gespeichert: ${target}`);
  return target;
}

function rollback(backup, shipped) {
  console.error('Stelle den vorherigen Stand aus dem Backup wieder her...');
  // Eine liegengebliebene -wal-Datei der neuen Version darf nicht auf die alte Datenbank treffen.
  for (const name of [...shipped, ...DB_FILES]) remove(path.join(ROOT, name));
  for (const name of fs.readdirSync(backup)) {
    remove(path.join(ROOT, name));
    copy(path.join(backup, name), path.join(ROOT, name));
  }
  npm('ci');
  console.error('Der vorherige Stand ist wiederhergestellt.');
}

async function main() {
  if (await isUp(3000)) throw new Error('KitaPlaner läuft noch. Bitte erst das Server-Fenster schließen.');

  remove(TMP);
  fs.mkdirSync(TMP);
  console.log('Lade aktuelle Version...');
  const res = await fetch(ZIP_URL);
  if (!res.ok) throw new Error(`Download fehlgeschlagen: HTTP ${res.status}`);
  const zip = path.join(TMP, 'release.zip');
  fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  run(TAR, ['-xf', zip, '-C', TMP]);
  const release = path.join(TMP, fs.readdirSync(TMP).find((name) => name !== 'release.zip'));
  if (!fs.existsSync(path.join(release, 'package.json'))) throw new Error('Download ist unvollständig.');

  const isUpdate = fs.existsSync(path.join(ROOT, 'kita.sqlite'));
  const backup = isUpdate ? createBackup() : null;
  const shipped = fs.readdirSync(release).filter((name) => !NOT_SHIPPED.has(name) && !DB_FILES.includes(name) && !name.startsWith('.env') && !/^install_V\d+\.bat$/.test(name));

  try {
    for (const name of shipped) {
      remove(path.join(ROOT, name));
      copy(path.join(release, name), path.join(ROOT, name));
    }
    // Was nicht zur Auslieferung gehört, aber fehlt, kommt aus dem Backup zurück; Vorhandenes bleibt unangetastet.
    if (backup) {
      for (const name of fs.readdirSync(backup)) {
        if (!shipped.includes(name)) copy(path.join(backup, name), path.join(ROOT, name), { force: false });
      }
    }
    npm('ci');
    npm('run', 'build');

    const before = rowCounts();
    await probeNewVersion();
    const after = rowCounts();
    const lost = Object.keys(before ?? {}).filter((table) => !MAY_SHRINK.has(table) && !(after[table] >= before[table]));
    if (lost.length) throw new Error(`Daten wurden nicht übernommen: ${lost.join(', ')}`);
  } catch (err) {
    if (backup) rollback(backup, shipped);
    throw err;
  }

  remove(TMP);
  console.log(isUpdate ? 'Update abgeschlossen. KitaPlaner kann wieder gestartet werden.' : 'Installation abgeschlossen.');
}

main().catch((err) => {
  console.error(`FEHLER: ${err.message}`);
  process.exitCode = 1;
});
