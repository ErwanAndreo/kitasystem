import Database from 'better-sqlite3';
import path from 'path';
import { format, addDays, startOfWeek } from 'date-fns';

const dbPath = path.resolve(process.cwd(), 'kita.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL,
      qualification TEXT NOT NULL,
      is_fachkraft INTEGER NOT NULL DEFAULT 1,
      weekly_hours REAL NOT NULL,
      work_days INTEGER NOT NULL DEFAULT 5,
      annual_vacation_days INTEGER NOT NULL DEFAULT 30,
      target_group_id TEXT,
      pin TEXT NOT NULL DEFAULT '1234',
      avatar TEXT,
      color TEXT NOT NULL DEFAULT '#16a34a',
      is_active INTEGER NOT NULL DEFAULT 1,
      skills TEXT NOT NULL DEFAULT '[]',
      secondary_roles TEXT NOT NULL DEFAULT '[]',
      can_spring INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      child_count INTEGER NOT NULL,
      target_ratio REAL NOT NULL,
      min_fachkraft_percent REAL NOT NULL DEFAULT 0.5,
      required_skills TEXT NOT NULL DEFAULT '[]',
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      role_override TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS timelogs (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      break_minutes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      note TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS absences (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      target_id TEXT,
      shift_id TEXT,
      absence_id TEXT,
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      decision_note TEXT,
      decision_by TEXT,
      decided_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (requester_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      author TEXT NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_notes (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      child_name TEXT NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS overtime_adjustments (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      hours REAL NOT NULL,
      reason TEXT NOT NULL,
      date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff_audit_log (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff_wishes (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff_certifications (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      issue_date TEXT,
      expires_at TEXT NOT NULL,
      institution TEXT,
      notes TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS director_notes (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'ALLGEMEIN',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#fef08a',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      checklist TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Populate certifications seed if empty
  const certCount = db.prepare('SELECT COUNT(*) as count FROM staff_certifications').get() as { count: number };
  if (certCount.count === 0) {
    const insertCert = db.prepare(`
      INSERT INTO staff_certifications (id, staff_id, type, title, issue_date, expires_at, institution, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Sabine Weber
    insertCert.run('c_1', 's_sabine', 'ERSTE_HILFE_KIND', 'Erste-Hilfe am Kind (DGUV)', '2025-04-15', '2027-04-15', 'DRK Kreisverband', 'Zertifikat gültig');
    insertCert.run('c_2', 's_sabine', 'KINDERSCHUTZ_8A', 'Kinderschutzfachkraft § 8a SGB VIII', '2024-09-01', '2028-09-01', 'Paritätisches Bildungswerk', 'Vertiefungsmodul absolviert');
    // Julia Fischer (Springer)
    insertCert.run('c_3', 's_julia', 'ERSTE_HILFE_KIND', 'Erste-Hilfe am Kind (DGUV)', '2025-02-10', '2027-02-10', 'Malteser Hilfsdienst', 'Vollzertifikat');
    insertCert.run('c_4', 's_julia', 'U3_QUALIFIKATION', 'U3-Zertifikatskurs (160 Std.)', '2023-01-10', '2029-01-10', 'LVR Landesjugendamt', 'Anerkannte Zusatzqualifikation');
    // Markus Becker (Erste Hilfe läuft in 15 Tagen ab!)
    insertCert.run('c_5', 's_markus', 'ERSTE_HILFE_KIND', 'Erste-Hilfe am Kind (DGUV)', '2024-11-05', '2026-11-05', 'Johanniter-Unfall-Hilfe', 'Auffrischung dringend buchen!');
    // Lukas Wagner (Erste Hilfe ist seit 3 Wochen abgelaufen!)
    insertCert.run('c_6', 's_lukas', 'ERSTE_HILFE_KIND', 'Erste-Hilfe am Kind (DGUV)', '2024-09-30', '2026-09-30', 'DRK', 'Abgelaufen! Nachschulung erforderlich.');
    // Elena Rossi (Erweitertes Führungszeugnis erneuern)
    insertCert.run('c_7', 's_elena', 'FUEHRUNGSZEUGNIS_72A', 'Erweitertes Führungszeugnis § 72a SGB VIII', '2021-12-15', '2026-12-15', 'Bundesamt für Justiz', 'Regelprüfung nach 5 Jahren');
    insertCert.run('c_8', 's_elena', 'ERSTE_HILFE_KIND', 'Erste-Hilfe am Kind (DGUV)', '2025-06-20', '2027-06-20', 'ASB', 'Gültig');
    // Lisa Hoffmann
    insertCert.run('c_9', 's_lisa', 'ERSTE_HILFE_KIND', 'Erste-Hilfe am Kind (DGUV)', '2025-08-10', '2027-08-10', 'DRK', 'Gültig');
  }

  // Populate OneNote-style director notes seed if empty
  const notesCount = db.prepare('SELECT COUNT(*) as count FROM director_notes').get() as { count: number };
  if (notesCount.count === 0) {
    const insertNote = db.prepare(`
      INSERT INTO director_notes (id, category, title, content, color, is_pinned, checklist, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    insertNote.run(
      'n_1', 'TEAM', 'Team-Besprechung & Personalplanung November',
      'Besprechungspunkte für die kommende Teamsitzung:\n- Urlaubsanträge für die Weihnachtsferien abstimmen (Notgruppe mit mind. 1 Fachkraft planen)\n- Auffrischungskurs Erste Hilfe am Kind für Markus und Lukas organisieren (DRK Angebot liegt vor)\n- Hospitation der neuen Praktikantin Leonie in der Krippe',
      '#fef08a', 1,
      JSON.stringify([
        { id: 'c1', text: 'DRK Schulungstermin am 12.11. bestätigen', done: false },
        { id: 'c2', text: 'Aushang für Schließzeiten Weihnachten erstellen', done: true },
        { id: 'c3', text: 'Gruppenwechsel Markus ➔ Krabbelmäuse prüfen', done: false }
      ]),
      now, now
    );
    insertNote.run(
      'n_2', 'ELTERN', 'Elternbeirat & Martinsumzug 2026',
      'Rücksprache mit Frau Müller (Elternbeiratsvorsitzende):\n- Laternenfest am 11.11. ab 17:00 Uhr im Garten\n- Freiwillige Feuerwehr für Streckensicherung angefragt\n- Weckmänner-Bestellung bei Bäckerei Schmidt (120 Stück)',
      '#bfdbfe', 0,
      JSON.stringify([
        { id: 'c4', text: 'Feuerwehr Bestätigung abwarten', done: true },
        { id: 'c5', text: 'Elternbrief mit Abholzeiten aushängen', done: false }
      ]),
      now, now
    );
    insertNote.run(
      'n_3', 'TRAEGER', 'Träger-Gespräch & Budgetplanung 2027',
      'Vorbereitung für Träger-Termin am 28.10.:\n- Beantragung Erhöhung Springer-Stunden auf 39h Vollzeit\n- Anschaffung Spielpodest für Krabbelmäuse U3\n- Sachkosten-Abrechnung für Fortbildungen einreichen',
      '#bbf7d0', 0,
      JSON.stringify([
        { id: 'c6', text: 'Kostenvoranschlag Podest beifügen', done: false },
        { id: 'c7', text: 'Überstunden-Statistik für Träger ausdrucken', done: true }
      ]),
      now, now
    );
    insertNote.run(
      'n_4', 'KONZEPTE', 'Kinderschutzkonzept & Notfallplan 2026/27',
      'Überarbeitung des Gewaltschutzkonzepts nach § 8a SGB VIII:\n- Notfallnummern im Leitungsbüro aktualisiert\n- Vertrauenserzieherin: Anna Schmidt & Sabine Weber\n- Dokumentationsbögen für Verdachtsfälle in Ordner B3',
      '#e9d5ff', 0,
      JSON.stringify([
        { id: 'c8', text: 'Dokumentenmappe im Leitungsbüro deponieren', done: true }
      ]),
      now, now
    );
  }

  // Populate standard Kita shift templates
  const insertTemplate = db.prepare(`
    INSERT OR REPLACE INTO shift_templates (id, name, start_time, end_time, break_minutes, color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertTemplate.run('tpl_fd', 'Frühdienst (FD)', '07:00', '15:30', 30, '#f59e0b');
  insertTemplate.run('tpl_md', 'Mitteldienst (MD)', '08:00', '16:30', 30, '#10b981');
  insertTemplate.run('tpl_sd', 'Spätdienst (SD)', '08:30', '17:00', 30, '#6366f1');
  insertTemplate.run('tpl_vz', 'Verfügungszeit (VZ)', '13:30', '16:30', 15, '#8b5cf6');
  insertTemplate.run('tpl_tz', 'Teilzeit-Vormittag (TZ)', '08:00', '12:30', 0, '#06b6d4');

  // Seed sample staff wishes for current week
  const today = format(new Date(), 'yyyy-MM-dd');
  const thisFriday = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 4), 'yyyy-MM-dd');
  const thisWednesday = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 2), 'yyyy-MM-dd');

  db.prepare(`
    INSERT OR IGNORE INTO staff_wishes (id, staff_id, date, type, note, created_at)
    VALUES 
      ('w_1', 's_elena', ?, 'WUNSCH_FRUEH', 'Bitte Frühdienst wegen Facharzt-Termin ab 16:30 Uhr', ?),
      ('w_2', 's_markus', ?, 'WUNSCH_SPAET', 'Fahrgemeinschaft morgens, lieber Spätdienst', ?)
  `).run(thisFriday, new Date().toISOString(), thisWednesday, new Date().toISOString());

  // Migrate columns if needed
  try { db.prepare("ALTER TABLE staff ADD COLUMN skills TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN secondary_roles TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN can_spring INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE groups ADD COLUMN required_skills TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE shifts ADD COLUMN role_override TEXT").run(); } catch (_) {}

  // Check if seeding or updating skills is needed
  updateStaffSkillsSeed();
}

function updateStaffSkillsSeed() {
  // Update groups with required skills
  db.prepare("UPDATE groups SET required_skills = ? WHERE id = 'g_u3_maeuse'")
    .run(JSON.stringify(['FACHKRAFT', 'U3_QUALIFIKATION']));
  db.prepare("UPDATE groups SET required_skills = ? WHERE id = 'g_ue3_sonne'")
    .run(JSON.stringify(['FACHKRAFT']));
  db.prepare("UPDATE groups SET required_skills = ? WHERE id = 'g_ue3_wald'")
    .run(JSON.stringify(['FACHKRAFT']));

  // Update staff members with rich skills and substitute capabilities
  const updateStaff = db.prepare(`
    UPDATE staff SET 
      skills = ?,
      secondary_roles = ?,
      can_spring = ?
    WHERE id = ?
  `);

  // Sabine Weber (Leitung: Primary Büro/Leitung, can spring into U3 or Ü3 with full qualification!)
  updateStaff.run(
    JSON.stringify(['FACHKRAFT', 'U3_QUALIFIKATION', 'ERSTE_HILFE_KIND', 'KINDERSCHUTZ_8A', 'LEITUNG_SPRINGER']),
    JSON.stringify(['BÜRO_LEITUNG', 'KRIPPE_NOTFALL_SPRINGER', 'UE3_SPRINGER']),
    1,
    's_sabine'
  );

  // Julia Fischer (Springerin: can jump anywhere!)
  updateStaff.run(
    JSON.stringify(['FACHKRAFT', 'U3_QUALIFIKATION', 'ERSTE_HILFE_KIND', 'SPRINGER_FLEXIBEL']),
    JSON.stringify(['KRIPPE_VERTRETUNG', 'ELEMENTAR_VERTRETUNG']),
    1,
    's_julia'
  );

  // Sarah Klein (U3 Krippe Fachkraft)
  updateStaff.run(
    JSON.stringify(['FACHKRAFT', 'U3_QUALIFIKATION', 'ERSTE_HILFE_KIND']),
    JSON.stringify(['KRIPPE_LEITUNG']),
    0,
    's_sarah'
  );

  // Lisa Hoffmann (U3 Krippe Fachkraft)
  updateStaff.run(
    JSON.stringify(['FACHKRAFT', 'U3_QUALIFIKATION', 'ERSTE_HILFE_KIND']),
    JSON.stringify(['KRIPPE_BETREUUNG']),
    0,
    's_lisa'
  );

  // Markus Becker (U3 Kinderpfleger / Ergänzungskraft)
  updateStaff.run(
    JSON.stringify(['ERSTE_HILFE_KIND', 'U3_AUSHILFE']),
    JSON.stringify(['GRUPPEN_UNTERSTÜTZUNG']),
    0,
    's_markus'
  );

  // Elena Rossi (Ü3 Fachkraft + Inklusion)
  updateStaff.run(
    JSON.stringify(['FACHKRAFT', 'INKLUSION', 'ERSTE_HILFE_KIND']),
    JSON.stringify(['INKLUSIONS_BETREUUNG', 'UE3_VERTRETUNG']),
    1,
    's_elena'
  );

  // Jonas Meyer (Ü3 Kinderpfleger)
  updateStaff.run(
    JSON.stringify(['ERSTE_HILFE_KIND', 'WERKSTATTPÄDAGOGIK']),
    JSON.stringify(['GRUPPEN_UNTERSTÜTZUNG']),
    0,
    's_jonas'
  );

  // Anna Schmidt (Ü3 Fachkraft + Kinderschutz)
  updateStaff.run(
    JSON.stringify(['FACHKRAFT', 'ERSTE_HILFE_KIND', 'KINDERSCHUTZ_8A']),
    JSON.stringify(['KINDERSCHUTZ_BEAUFTRAGTE']),
    0,
    's_anna'
  );

  // Lukas Wagner (Ü3 Fachkraft)
  updateStaff.run(
    JSON.stringify(['FACHKRAFT', 'ERSTE_HILFE_KIND', 'BEWEGUNGSPÄDAGOGIK']),
    JSON.stringify(['SPORT_BEWEGUNG', 'UE3_VERTRETUNG']),
    1,
    's_lukas'
  );

  // Leonie Wolf (FSJ)
  updateStaff.run(
    JSON.stringify(['UNTERSTÜTZUNG']),
    JSON.stringify(['BETREUUNGS_AUSHILFE']),
    0,
    's_leonie'
  );
}
