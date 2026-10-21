import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
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
      target_group_id TEXT,
      pin TEXT NOT NULL DEFAULT '1234',
      avatar TEXT,
      color TEXT NOT NULL DEFAULT '#16a34a'
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      child_count INTEGER NOT NULL,
      target_ratio REAL NOT NULL,
      min_fachkraft_percent REAL NOT NULL DEFAULT 0.5,
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
  `);

  // Check if initial seeding needed
  const staffCount = (db.prepare('SELECT COUNT(*) as c FROM staff').get() as { c: number }).c;
  if (staffCount === 0) {
    seedDatabase();
  } else {
    seedAnnouncementsAndNotesIfMissing();
  }
}

function seedAnnouncementsAndNotesIfMissing() {
  const annCount = (db.prepare('SELECT COUNT(*) as c FROM announcements').get() as { c: number }).c;
  if (annCount === 0) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const insertAnn = db.prepare('INSERT INTO announcements (id, title, content, priority, author, date) VALUES (?, ?, ?, ?, ?, ?)');
    insertAnn.run('ann_1', 'Teammeeting am Donnerstag um 16:30 Uhr', 'Bitte alle vorbereiteten Beobachtungsbögen der Vorschulkinder mitbringen. Besprechung im Personalraum.', 'HIGH', 'Sabine Weber (Leitung)', today);
    insertAnn.run('ann_2', 'Fotografentag am 28. Oktober', 'Ab 08:30 Uhr kommt der Kitafotograf. Bitte die Gruppenräume vormittags für Einzel- und Gruppenfotos freihalten.', 'NORMAL', 'Sabine Weber (Leitung)', today);
    insertAnn.run('ann_3', 'Neuer Erste-Hilfe-Kurs für Bildungs- & Betreuungseinrichtungen', 'Die Auffrischung findet am Konzeptionstag (12. November) statt. Teilnahme ist für alle Fach- und Ergänzungskräfte verpflichtend.', 'NORMAL', 'Sabine Weber (Leitung)', today);

    const insertNote = db.prepare('INSERT INTO group_notes (id, group_id, child_name, category, note) VALUES (?, ?, ?, ?, ?)');
    // U3 Krabbelmäuse
    insertNote.run('gn_1', 'g_u3_maeuse', 'Felix (2J)', 'ALLERGY', 'Starke Erdnuss- & Haselnussallergie (Notfall-Pen im Erste-Hilfe-Kasten Gruppe)');
    insertNote.run('gn_2', 'g_u3_maeuse', 'Emilia (1.5J)', 'HEALTH', 'Muss nach dem Mittagsschlaf mit Wundsalbe versorgt werden');
    insertNote.run('gn_3', 'g_u3_maeuse', 'Noah (2J)', 'PICKUP', 'Wird heute ausnahmsweise von der Oma (Frau Berger) um 14:30 Uhr abgeholt');
    // Ü3 Sonnenschein
    insertNote.run('gn_4', 'g_ue3_sonne', 'Mia (4J)', 'DIET', 'Laktose- & Glutenunverträglichkeit (Spezialessen vom Caterer)');
    insertNote.run('gn_5', 'g_ue3_sonne', 'Ben (5J)', 'INFO', 'Beginnt heute mit der Eingewöhnung in die Vorschulgruppe');
    // Ü3 Waldwichtel
    insertNote.run('gn_6', 'g_ue3_wald', 'Lina (4J)', 'ALLERGY', 'Wespenstich-Allergie');
  }
}

function seedDatabase() {
  console.log('🌱 Seeding Kita database with realistic data...');

  const insertGroup = db.prepare(`
    INSERT INTO groups (id, name, type, child_count, target_ratio, min_fachkraft_percent, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertGroup.run('g_u3_maeuse', 'Krabbelmäuse (Krippe U3)', 'U3', 10, 3.33, 0.67, '#f43f5e'); // 1:3.3
  insertGroup.run('g_ue3_sonne', 'Sonnenschein (Elementar Ü3)', 'UE3', 25, 8.0, 0.50, '#eab308'); // 1:8
  insertGroup.run('g_ue3_wald', 'Waldwichtel (Elementar Ü3)', 'UE3', 24, 8.0, 0.50, '#10b981'); // 1:8

  const insertStaff = db.prepare(`
    INSERT INTO staff (id, name, email, phone, role, qualification, is_fachkraft, weekly_hours, target_group_id, pin, avatar, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStaff.run('s_sabine', 'Sabine Weber (Leitung)', 'leitung@kita-sonnenschein.de', '0171-112233', 'LEITUNG', 'Staatl. anerkannte Sozialpädagogin', 1, 39.0, null, '1111', 'SW', '#4f46e5');
  insertStaff.run('s_sarah', 'Sarah Klein', 'sarah.k@kita-sonnenschein.de', '0172-223344', 'FACHKRAFT', 'Staatl. anerkannte Erzieherin', 1, 39.0, 'g_u3_maeuse', '2222', 'SK', '#ec4899');
  insertStaff.run('s_lisa', 'Lisa Hoffmann', 'lisa.h@kita-sonnenschein.de', '0173-334455', 'FACHKRAFT', 'Staatl. anerkannte Erzieherin', 1, 35.0, 'g_u3_maeuse', '3333', 'LH', '#f97316');
  insertStaff.run('s_markus', 'Markus Becker', 'markus.b@kita-sonnenschein.de', '0174-445566', 'ERGAENZUNGSKRAFT', 'Staatl. geprüfter Kinderpfleger', 0, 30.0, 'g_u3_maeuse', '4444', 'MB', '#06b6d4');
  insertStaff.run('s_anna', 'Anna Schmidt', 'anna.s@kita-sonnenschein.de', '0175-556677', 'FACHKRAFT', 'Staatl. anerkannte Erzieherin', 1, 39.0, 'g_ue3_sonne', '5555', 'AS', '#eab308');
  insertStaff.run('s_lukas', 'Lukas Wagner', 'lukas.w@kita-sonnenschein.de', '0176-667788', 'FACHKRAFT', 'Staatl. anerkannter Erzieher', 1, 39.0, 'g_ue3_sonne', '6666', 'LW', '#84cc16');
  insertStaff.run('s_elena', 'Elena Rossi', 'elena.r@kita-sonnenschein.de', '0177-778899', 'FACHKRAFT', 'Staatl. anerkannte Erzieherin', 1, 32.0, 'g_ue3_wald', '7777', 'ER', '#10b981');
  insertStaff.run('s_jonas', 'Jonas Meyer', 'jonas.m@kita-sonnenschein.de', '0178-889900', 'ERGAENZUNGSKRAFT', 'Kinderpfleger & Heilerziehungspflege', 0, 25.0, 'g_ue3_wald', '8888', 'JM', '#14b8a6');
  insertStaff.run('s_julia', 'Julia Fischer (Springerin)', 'julia.f@kita-sonnenschein.de', '0179-990011', 'SPRINGER', 'Staatl. anerkannte Erzieherin', 1, 20.0, null, '9999', 'JF', '#8b5cf6');
  insertStaff.run('s_leonie', 'Leonie Wolf (FSJ)', 'leonie.w@kita-sonnenschein.de', '0170-001122', 'AZUBI', 'Bundesfreiwilligendienst', 0, 39.0, 'g_ue3_sonne', '0000', 'LW', '#64748b');

  // Shift templates
  const insertTemplate = db.prepare(`
    INSERT INTO shift_templates (id, name, start_time, end_time, break_minutes, color)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertTemplate.run('t_frueh', 'Frühdienst', '07:00', '15:30', 30, '#38bdf8');
  insertTemplate.run('t_mittel1', 'Mitteldienst 1', '08:00', '16:30', 30, '#4ade80');
  insertTemplate.run('t_mittel2', 'Mitteldienst 2', '08:30', '17:00', 30, '#a3e635');
  insertTemplate.run('t_spaet', 'Spätdienst', '09:00', '17:30', 30, '#fb923c');

  // Generate shifts for this week
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });

  const insertShift = db.prepare(`
    INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const dStr = format(addDays(monday, dayOffset), 'yyyy-MM-dd');

    // U3 Gruppe
    insertShift.run(`shift_${dStr}_sarah`, 's_sarah', 'g_u3_maeuse', dStr, '07:00', '15:30', 30, 'CONFIRMED');
    insertShift.run(`shift_${dStr}_lisa`, 's_lisa', 'g_u3_maeuse', dStr, '08:00', '16:00', 30, 'CONFIRMED');
    insertShift.run(`shift_${dStr}_markus`, 's_markus', 'g_u3_maeuse', dStr, '08:30', '15:00', 30, 'CONFIRMED');

    // Ü3 Sonne
    insertShift.run(`shift_${dStr}_anna`, 's_anna', 'g_ue3_sonne', dStr, '07:30', '16:00', 30, 'CONFIRMED');
    insertShift.run(`shift_${dStr}_lukas`, 's_lukas', 'g_ue3_sonne', dStr, '08:30', '17:30', 45, 'CONFIRMED');
    insertShift.run(`shift_${dStr}_leonie`, 's_leonie', 'g_ue3_sonne', dStr, '08:00', '16:30', 30, 'CONFIRMED');

    // Ü3 Wald
    insertShift.run(`shift_${dStr}_elena`, 's_elena', 'g_ue3_wald', dStr, '07:45', '16:15', 30, 'CONFIRMED');
    insertShift.run(`shift_${dStr}_jonas`, 's_jonas', 'g_ue3_wald', dStr, '08:30', '14:30', 30, 'CONFIRMED');

    // Leitung
    insertShift.run(`shift_${dStr}_sabine`, 's_sabine', 'g_ue3_sonne', dStr, '08:00', '16:30', 30, 'CONFIRMED');
  }

  // Pre-seed an active emergency: Sarah Klein is reported SICK today!
  const todayStr = format(today, 'yyyy-MM-dd');
  const insertAbsence = db.prepare(`
    INSERT INTO absences (id, staff_id, type, start_date, end_date, status, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAbsence.run('abs_sarah_sick', 's_sarah', 'SICK', todayStr, format(addDays(today, 2), 'yyyy-MM-dd'), 'APPROVED', 'Grippaler Infekt (eAU angefordert)', new Date().toISOString());

  db.prepare(`UPDATE shifts SET status = 'CANCELLED' WHERE staff_id = 's_sarah' AND date = ?`).run(todayStr);

  // Pre-seed timelog
  const insertTimelog = db.prepare(`
    INSERT INTO timelogs (id, staff_id, date, clock_in, clock_out, break_minutes, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTimelog.run('log_lisa_today', 's_lisa', todayStr, '07:55', null, 0, 'CLOCKED_IN', 'Pünktlich');
  insertTimelog.run('log_markus_today', 's_markus', todayStr, '08:28', null, 0, 'CLOCKED_IN', null);
  insertTimelog.run('log_anna_today', 's_anna', todayStr, '07:25', null, 0, 'CLOCKED_IN', null);

  // Approvals
  const insertApproval = db.prepare(`
    INSERT INTO approvals (id, type, requester_id, target_id, shift_id, absence_id, details, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertApproval.run(
    'appr_swap_1',
    'SHIFT_SWAP',
    's_lukas',
    's_elena',
    `shift_${todayStr}_lukas`,
    null,
    JSON.stringify({
      title: 'Schichttausch für Freitag',
      description: 'Lukas Wagner bittet Elena Rossi um Übernahme des Spätdienstes (14:00 - 17:30 Uhr). Elena hat in der Mitarbeiter-App zugestimmt.',
      date: format(addDays(monday, 4), 'yyyy-MM-dd'),
      shift: 'Spätdienst 09:00 - 17:30',
      ratio_impact: 'Neutral: Beide sind anerkannte Fachkräfte, Betreuungsschlüssel bleibt auf 100% grün.',
      arbzg_check: 'Geprüft: 11 Stunden Ruhezeit bei Elena bis zum nächsten Montag eingehalten.'
    }),
    'PENDING',
    new Date(Date.now() - 3600000 * 2).toISOString()
  );

  insertApproval.run(
    'appr_vac_1',
    'VACATION_REQUEST',
    's_anna',
    null,
    null,
    null,
    JSON.stringify({
      title: 'Urlaubsantrag Brückentag',
      description: 'Anna Schmidt beantragt 1 Urlaubstag für nächsten Freitag.',
      start_date: format(addDays(today, 8), 'yyyy-MM-dd'),
      end_date: format(addDays(today, 8), 'yyyy-MM-dd'),
      remaining_vacation: '24 Tage verbleibend',
      team_availability: '3 von 4 Kollegen in Gruppe Sonnenschein anwesend.'
    }),
    'PENDING',
    new Date(Date.now() - 3600000 * 5).toISOString()
  );

  insertApproval.run(
    'appr_emerg_1',
    'EMERGENCY_REPLACEMENT',
    's_julia',
    's_sarah',
    `shift_${todayStr}_sarah`,
    'abs_sarah_sick',
    JSON.stringify({
      title: 'Notfall-Zuweisung: Springerin Julia Fischer in Krippe',
      description: 'Durch den Ausfall von Sarah Klein droht in der Krippengruppe Unterbesetzung (Schlüssel 1:5.0 statt 1:3.3). Julia Fischer steht als Springerin zur Verfügung.',
      group: 'Krabbelmäuse (Krippe U3)',
      time: '08:30 - 15:30 Uhr',
      ratio_impact: 'Stellt den gesetzeskonformen Betreuungsschlüssel sofort wieder auf 1:2.5 her.'
    }),
    'PENDING',
    new Date(Date.now() - 1800000).toISOString()
  );

  seedAnnouncementsAndNotesIfMissing();
  console.log('✅ Database seeded successfully!');
}
