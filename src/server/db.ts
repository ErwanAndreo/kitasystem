import Database from 'better-sqlite3';
import path from 'path';
import { format, addDays, startOfWeek } from 'date-fns';

const dbPath = path.resolve(process.cwd(), 'kita.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Demo-Inhalte nur in Datenbanken, die schon die Demo-Belegschaft haben; Neuinstallationen bleiben leer.
const hasDemoData = () => !!db.prepare("SELECT 1 FROM staff WHERE id = 's_lukas'").get();

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
      can_spring INTEGER NOT NULL DEFAULT 0,
      username TEXT NOT NULL DEFAULT 'admin',
      password TEXT NOT NULL DEFAULT 'admin',
      password_changed INTEGER NOT NULL DEFAULT 0,
      share_favorites TEXT NOT NULL DEFAULT '[]',
      critical_alerts_mode TEXT NOT NULL DEFAULT 'CRITICAL'
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
      warning TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS standard_shifts (
      staff_id TEXT NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 5),
      group_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER NOT NULL DEFAULT 30,
      PRIMARY KEY (staff_id, weekday),
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roster_day_status (
      date TEXT PRIMARY KEY,
      followed INTEGER NOT NULL,
      decided_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roster_generated_days (
      date TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS group_quarter_children (
      group_id TEXT NOT NULL,
      slot INTEGER NOT NULL,
      child_count INTEGER NOT NULL,
      PRIMARY KEY (group_id, slot),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS excursions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      group_id TEXT NOT NULL,
      staff_count INTEGER NOT NULL,
      UNIQUE (date, group_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_hourly_children (
      group_id TEXT NOT NULL,
      hour INTEGER NOT NULL,
      child_count INTEGER NOT NULL,
      PRIMARY KEY (group_id, hour),
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

    CREATE TABLE IF NOT EXISTS kita_closures (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS policy_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target_ratio REAL NOT NULL,
      min_fachkraft_percent REAL NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_queue (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      change_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      sent_at TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS autopilot_proposals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      situation TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_group_id TEXT NOT NULL,
      target_staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'PENDING',
      confidence_score REAL NOT NULL DEFAULT 1.0,
      matched_reason TEXT,
      created_at TEXT NOT NULL,
      decided_at TEXT,
      FOREIGN KEY (target_group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (target_staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'ROUTINE',
      created_by_id TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      is_shared INTEGER NOT NULL DEFAULT 0,
      share_scope TEXT NOT NULL DEFAULT 'ALL',
      shared_group_id TEXT,
      shared_group_name TEXT,
      shared_staff_ids TEXT DEFAULT '[]',
      shared_staff_names TEXT DEFAULT '[]',
      color TEXT NOT NULL DEFAULT '#3b82f6',
      items TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS substitute_cycles (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      group_id TEXT NOT NULL,
      absent_staff_id TEXT,
      reason TEXT,
      candidates TEXT NOT NULL DEFAULT '[]',
      current_candidate_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      accepted_staff_id TEXT,
      director_decision_staff_id TEXT,
      director_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      gender TEXT,
      photo_url TEXT,
      care_hours INTEGER NOT NULL DEFAULT 35,
      contract_start TEXT NOT NULL,
      contract_end TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone_primary TEXT NOT NULL,
      phone_secondary TEXT,
      priority INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pickup_authorizations (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone TEXT,
      id_card_number TEXT,
      photo_url TEXT,
      is_forbidden INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS child_health_records (
      child_id TEXT PRIMARY KEY,
      allergies TEXT NOT NULL DEFAULT '[]',
      dietary_needs TEXT,
      medication_plan TEXT,
      emergency_instructions TEXT,
      measles_vaccinated INTEGER NOT NULL DEFAULT 0,
      doctor_name TEXT,
      doctor_phone TEXT,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS child_attendance (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present',
      check_in_time TEXT,
      check_out_time TEXT,
      picked_up_by TEXT,
      absence_reason TEXT,
      meal_ordered INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      UNIQUE(child_id, date)
    );

    CREATE TABLE IF NOT EXISTS child_daily_logs (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      date TEXT NOT NULL,
      log_type TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT,
      details TEXT NOT NULL,
      staff_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS parent_accounts (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'de',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parent_child_links (
      parent_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      is_primary_contact INTEGER NOT NULL DEFAULT 1,
      photo_consent INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (parent_id, child_id),
      FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ratio_settings (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      target_ratio REAL NOT NULL,
      warning_threshold_percent REAL NOT NULL DEFAULT 15.0,
      critical_threshold_percent REAL NOT NULL DEFAULT 25.0,
      two_person_rule INTEGER NOT NULL DEFAULT 1,
      core_time_start TEXT NOT NULL DEFAULT '09:00',
      core_time_end TEXT NOT NULL DEFAULT '13:00',
      min_qualification_quote REAL NOT NULL DEFAULT 0.50,
      bundesland_preset TEXT NOT NULL DEFAULT 'NRW_KIBIZ',
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Elterndienste, Arbeitseinsätze & Pflichtstunden
    CREATE TABLE IF NOT EXISTS parent_duties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL, -- 'GARTEN', 'RENOVIERUNG', 'NOTFALL_KOCHEN', 'FEST', 'WAESCHE', 'SONSTIGES'
      hours_credit REAL NOT NULL DEFAULT 2.0,
      max_helpers INTEGER NOT NULL DEFAULT 4,
      date TEXT NOT NULL,
      time_start TEXT,
      time_end TEXT,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'FILLED', 'COMPLETED'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parent_duty_signups (
      id TEXT PRIMARY KEY,
      duty_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      hours_credited REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'REGISTERED', -- 'REGISTERED', 'CONFIRMED', 'CANCELLED'
      confirmed_by TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (duty_id) REFERENCES parent_duties(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE
    );

    -- Blitz-Umfragen & Abstimmungen
    CREATE TABLE IF NOT EXISTS parent_polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      question TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'ALLGEMEIN',
      created_by_id TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      expires_at TEXT,
      is_closed INTEGER NOT NULL DEFAULT 0,
      allow_multiple INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parent_poll_options (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      option_text TEXT NOT NULL,
      vote_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES parent_polls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parent_poll_votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      voted_at TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES parent_polls(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES parent_poll_options(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE,
      UNIQUE(poll_id, parent_id, option_id)
    );

    -- Digitale Verträge & Signaturen
    CREATE TABLE IF NOT EXISTS digital_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      document_type TEXT NOT NULL, -- 'BETREUUNGSVERTRAG', 'NOTFALLVOLLMACHT', 'FOTOERLAUBNIS', 'MEDIKAMENTENPLAN'
      child_id TEXT,
      parent_id TEXT NOT NULL,
      content_html TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_SIGNATURE', -- 'PENDING_SIGNATURE', 'SIGNED'
      signature_data TEXT,
      signed_at TEXT,
      signed_by_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE
    );

    -- Dedizierte Kiosk- & Tablet-Geräte-Accounts (Nicht an Einzelpersonen gebunden!)
    CREATE TABLE IF NOT EXISTS kiosk_devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      group_id TEXT,
      pin TEXT NOT NULL DEFAULT '1234',
      device_token TEXT NOT NULL,
      last_active TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
    );

    -- Modul E: Warteliste & Voranmeldung mit Punktesystem
    CREATE TABLE IF NOT EXISTS waitlist_applications (
      id TEXT PRIMARY KEY,
      child_first_name TEXT NOT NULL,
      child_last_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'U',
      parent_name TEXT NOT NULL,
      parent_email TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      desired_start_date TEXT NOT NULL,
      desired_hours INTEGER NOT NULL DEFAULT 35,
      desired_group_type TEXT NOT NULL DEFAULT 'U3',
      points INTEGER NOT NULL DEFAULT 0,
      has_sibling INTEGER NOT NULL DEFAULT 0,
      is_single_parent INTEGER NOT NULL DEFAULT 0,
      is_employed INTEGER NOT NULL DEFAULT 1,
      in_catchment_area INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'OFFERED', 'ACCEPTED', 'REJECTED'
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Modul E: Abrechnung & SEPA-Lastschriften
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      month TEXT NOT NULL,
      care_hours INTEGER NOT NULL DEFAULT 35,
      base_care_fee REAL NOT NULL,
      meal_fee REAL NOT NULL,
      meal_days_counted INTEGER NOT NULL DEFAULT 0,
      extra_fees REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SEPA_EXPORTED', 'PAID'
      iban TEXT NOT NULL,
      bic TEXT NOT NULL,
      mandate_ref TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES parent_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    -- Modul C: Entwicklungsgespräche & Sprechtag-Slots
    CREATE TABLE IF NOT EXISTS parent_teacher_conferences (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT NOT NULL,
      room TEXT NOT NULL DEFAULT 'Besprechungsraum 1',
      status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'BOOKED', 'COMPLETED'
      booked_by_parent_id TEXT,
      booked_child_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (booked_by_parent_id) REFERENCES parent_accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (booked_child_id) REFERENCES children(id) ON DELETE SET NULL
    );

    -- Modul C & B: DSGVO-Foto-Galerie & Portfolio
    CREATE TABLE IF NOT EXISTS photo_albums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      group_id TEXT,
      event_date TEXT NOT NULL,
      created_by_staff_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_staff_id) REFERENCES staff(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT,
      requires_consent INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (album_id) REFERENCES photo_albums(id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec("ALTER TABLE parent_accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'ELTERN';");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE parent_accounts ADD COLUMN board_position TEXT DEFAULT NULL;");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE parent_accounts ADD COLUMN mandatory_hours REAL NOT NULL DEFAULT 20.0;");
  } catch (_) {}

  try {
    db.exec("ALTER TABLE shifts ADD COLUMN warning TEXT;");
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE staff ADD COLUMN critical_alerts_mode TEXT NOT NULL DEFAULT 'CRITICAL';");
  } catch (e) {
    // Column already exists
  }

  // Populate settings seed if empty
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('autopilot_enabled', 'true');
  insertSetting.run('notification_delay_minutes', '30');
  insertSetting.run('default_shift_duration_hours', '8.0');
  insertSetting.run('default_shift_start_time', '08:00');
  insertSetting.run('default_shift_break_minutes', '30');

  // Populate policy templates seed if empty
  const policyCount = db.prepare('SELECT COUNT(*) as count FROM policy_templates').get() as { count: number };
  if (policyCount.count === 0) {
    const insertPol = db.prepare(`
      INSERT INTO policy_templates (id, name, type, target_ratio, min_fachkraft_percent, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPol.run('pol_u3', 'Krippe / U3 (KiBiz Standard)', 'U3', 3.33, 0.67, '1 Betreuer auf 3.3 Kinder, mind. 67% Fachkräfte');
    insertPol.run('pol_ue3', 'Kindergarten / Ü3 (Elementar)', 'UE3', 8.33, 0.50, '1 Betreuer auf 8.3 Kinder, mind. 50% Fachkräfte');
    insertPol.run('pol_mixed', 'Altersgemischt (Hort / U3+Ü3)', 'MIXED', 6.0, 0.60, '1 Betreuer auf 6.0 Kinder, 60% Fachkraftquote');
    insertPol.run('pol_custom', 'Individuell / Eigener Schlüssel', 'CUSTOM', 5.0, 0.50, 'Frei wählbarer Schlüssel je nach Trägervorgabe');
  }

  // Populate kita closures seed if empty
  const closureCount = db.prepare('SELECT COUNT(*) as count FROM kita_closures').get() as { count: number };
  if (hasDemoData() && closureCount.count === 0) {
    const insertClosure = db.prepare(`
      INSERT INTO kita_closures (id, title, date, type, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertClosure.run('cls_1', 'Konzeptionstag: Kinderschutz & Inklusion', '2026-10-23', 'KONZEPTIONSTAG', 'Kita für Kinder geschlossen. Ganztägige Teamklausur aller Fachkräfte.');
    insertClosure.run('cls_2', 'Brückentag Allerheiligen', '2026-10-30', 'BRUECKENTAG', 'Einrichtung geschlossen. Brückentag.');
    insertClosure.run('cls_3', 'Weihnachtsschließung', '2026-12-24', 'SCHLIESSTAG', 'Heiligabend – Kita geschlossen.');
    insertClosure.run('cls_4', 'Weihnachtsschließung', '2026-12-31', 'SCHLIESSTAG', 'Silvester – Kita geschlossen.');
  }

  // Populate certifications seed if empty
  const certCount = db.prepare('SELECT COUNT(*) as count FROM staff_certifications').get() as { count: number };
  if (hasDemoData() && certCount.count === 0) {
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
  if (hasDemoData() && notesCount.count === 0) {
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

  if (hasDemoData()) db.prepare(`
    INSERT OR IGNORE INTO staff_wishes (id, staff_id, date, type, note, created_at)
    VALUES 
      ('w_1', 's_elena', ?, 'WUNSCH_FRUEH', 'Bitte Frühdienst wegen Facharzt-Termin ab 16:30 Uhr', ?),
      ('w_2', 's_markus', ?, 'WUNSCH_SPAET', 'Fahrgemeinschaft morgens, lieber Spätdienst', ?)
  `).run(thisFriday, new Date().toISOString(), thisWednesday, new Date().toISOString());

  // Migrate columns if needed
  db.transaction(() => {
    db.exec(`
      INSERT OR IGNORE INTO group_quarter_children (group_id, slot, child_count)
      SELECT group_id, hour * 60 + q.m, child_count FROM group_hourly_children
      CROSS JOIN (SELECT 0 AS m UNION ALL SELECT 15 UNION ALL SELECT 30 UNION ALL SELECT 45) q;
      DELETE FROM group_hourly_children;
    `);
  })();
  try { db.prepare("ALTER TABLE timelogs ADD COLUMN break_started_at TEXT").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN availability_rules TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE shifts ADD COLUMN source TEXT NOT NULL DEFAULT 'MANUAL'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN skills TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN secondary_roles TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN can_spring INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN standard_work_hours TEXT DEFAULT '08:00 - 16:30'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN availability_window TEXT DEFAULT 'Mo-Fr 07:30 - 17:00'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN username TEXT NOT NULL DEFAULT 'admin'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN password TEXT NOT NULL DEFAULT 'admin'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN password_changed INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE staff ADD COLUMN share_favorites TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("UPDATE staff SET username = 'admin' WHERE username IS NULL OR username = ''").run(); } catch (_) {}
  try { db.prepare("UPDATE staff SET password = 'admin' WHERE password IS NULL OR password = ''").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE groups ADD COLUMN required_skills TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE groups ADD COLUMN policy_id TEXT DEFAULT 'pol_ue3'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE shifts ADD COLUMN role_override TEXT").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE checklists ADD COLUMN share_scope TEXT NOT NULL DEFAULT 'ALL'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE checklists ADD COLUMN shared_group_id TEXT").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE checklists ADD COLUMN shared_group_name TEXT").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE checklists ADD COLUMN shared_staff_ids TEXT DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("ALTER TABLE checklists ADD COLUMN shared_staff_names TEXT DEFAULT '[]'").run(); } catch (_) {}
  try { db.prepare("UPDATE checklists SET share_scope = 'ALL' WHERE is_shared = 1 AND (share_scope IS NULL OR share_scope = '')").run(); } catch (_) {}
  try { db.prepare("UPDATE checklists SET share_scope = 'PRIVATE' WHERE is_shared = 0 AND (share_scope IS NULL OR share_scope = '')").run(); } catch (_) {}

  // Populate checklists seed if empty
  const checklistCount = db.prepare('SELECT COUNT(*) as count FROM checklists').get() as { count: number };
  if (hasDemoData() && checklistCount.count === 0) {
    const insertChk = db.prepare(`
      INSERT INTO checklists (id, title, category, created_by_id, created_by_name, is_shared, color, items, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();

    // 1. Team-Checkliste von Leitung (Geteilt)
    insertChk.run(
      'chk_1',
      'Schließdienst & Sicherheitsrundgang Kita Sonnenschein',
      'ROUTINE',
      's_sabine',
      'Sabine Weber (Leitung)',
      1,
      '#4f46e5',
      JSON.stringify([
        { id: 'i1', text: 'Fenster und Balkontüren in allen 3 Gruppen schließen', done: true, completed_by: 'Lukas Wagner' },
        { id: 'i2', text: 'Außengelände prüfen: Sandkasten abdecken & Gartentor verriegeln', done: true, completed_by: 'Sarah Klein' },
        { id: 'i3', text: 'Teeküche & Gruppenküchen kontrollieren (Herd aus, Spülmaschine gestartet)', done: false },
        { id: 'i4', text: 'Haupteingang verriegeln & Alarmanlage scharf schalten', done: false }
      ]),
      now, now
    );

    // 2. Morgenroutine & Raumklima (Geteilt)
    insertChk.run(
      'chk_2',
      'Morgenroutine & Ankommensvorbereitung',
      'ROUTINE',
      's_sabine',
      'Sabine Weber (Leitung)',
      1,
      '#059669',
      JSON.stringify([
        { id: 'i5', text: 'Stoßlüftung aller Gruppenräume & Raumtemperatur checken', done: true, completed_by: 'Anna Schmidt' },
        { id: 'i6', text: 'Anwesenheitslisten & Allergie-Notizen bereitlegen', done: true, completed_by: 'Anna Schmidt' },
        { id: 'i7', text: 'Frühstücks-Buffet & frisches Obst anrichten', done: false }
      ]),
      now, now
    );

    // 3. Ausflugs-Vorbereitung (Geteilt vom Mitarbeiter Lukas Wagner)
    insertChk.run(
      'chk_3',
      'Waldtag-Vorbereitung & Natur-Exkursion',
      'AUSFLUG',
      's_lukas',
      'Lukas Wagner (Mitarbeiter 1)',
      1,
      '#d97706',
      JSON.stringify([
        { id: 'i8', text: 'Notfallhandy aufladen & Erste-Hilfe-Set Kind einpacken', done: true, completed_by: 'Lukas Wagner' },
        { id: 'i9', text: 'Einverständniserklärungen der Eltern kontrollieren', done: true, completed_by: 'Lukas Wagner' },
        { id: 'i10', text: 'Sitzkissen, Becherlupen & Becher für 20 Kinder in Bollerwagen', done: false },
        { id: 'i11', text: 'Wetterbericht prüfen & Zeckenschutz sprayen', done: false }
      ]),
      now, now
    );

    // 4. Persönliche Checkliste von Sarah Klein (Privat - nur für sie!)
    insertChk.run(
      'chk_4',
      'Meine Entwicklungsdokumentation & Portfolios',
      'PERSÖNLICH',
      's_sarah',
      'Sarah Klein (Mitarbeiter 2)',
      0, // PRIVAT!
      '#ec4899',
      JSON.stringify([
        { id: 'i12', text: 'Fotodokumentation für Mias Eingewöhnungsmappe drucken', done: true, completed_by: 'Sarah Klein' },
        { id: 'i13', text: 'Sprachentwicklungsbogen U3 für Maximilian ausfüllen', done: false },
        { id: 'i14', text: 'Termine für Entwicklungsgespräche im November abstimmen', done: false }
      ]),
      now, now
    );
  }

  // Check if seeding or updating skills is needed
  if (hasDemoData()) updateStaffSkillsSeed();

  // Populate children, emergency contacts, health records, attendance and ratio settings
  seedChildModuleData();

  // Neuinstallation: ohne Leitung kann sich niemand anmelden (admin / admin bis zur Passwortänderung).
  // Die Oberfläche spricht die Leitung fest als s_sabine an, daher diese ID.
  if (!db.prepare('SELECT 1 FROM staff LIMIT 1').get()) {
    db.prepare(`
      INSERT INTO staff (id, name, email, role, qualification, weekly_hours, avatar)
      VALUES ('s_sabine', 'Einrichtungsleitung', '', 'LEITUNG', 'Leitung', 39, 'EL')
    `).run();
  }
}

function seedChildModuleData() {
  const now = new Date().toISOString();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // 1. Ratio Settings
  const ratioCount = db.prepare('SELECT COUNT(*) as count FROM ratio_settings').get() as { count: number };
  if (ratioCount.count === 0) {
    const insertRatio = db.prepare(`
      INSERT INTO ratio_settings (
        id, group_id, target_ratio, warning_threshold_percent, critical_threshold_percent,
        two_person_rule, core_time_start, core_time_end, min_qualification_quote, bundesland_preset
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertRatio.run('rs_default', null, 8.0, 15.0, 25.0, 1, '09:00', '13:00', 0.50, 'NRW_KIBIZ');
    if (hasDemoData()) {
      insertRatio.run('rs_u3', 'g_u3_maeuse', 3.33, 15.0, 25.0, 1, '08:30', '12:30', 0.67, 'NRW_KIBIZ');
      insertRatio.run('rs_ue3_sonne', 'g_ue3_sonne', 8.0, 15.0, 25.0, 1, '09:00', '13:00', 0.50, 'NRW_KIBIZ');
      insertRatio.run('rs_ue3_wald', 'g_ue3_wald', 8.0, 15.0, 25.0, 1, '09:00', '13:00', 0.50, 'NRW_KIBIZ');
    }
  }

  if (!hasDemoData()) return;

  // 2. Children & related records
  const childCount = db.prepare('SELECT COUNT(*) as count FROM children').get() as { count: number };
  if (childCount.count === 0) {
    const insertChild = db.prepare(`
      INSERT INTO children (id, group_id, first_name, last_name, birth_date, gender, photo_url, care_hours, contract_start, contract_end, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHealth = db.prepare(`
      INSERT INTO child_health_records (child_id, allergies, dietary_needs, medication_plan, emergency_instructions, measles_vaccinated, doctor_name, doctor_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertContact = db.prepare(`
      INSERT INTO emergency_contacts (id, child_id, name, relationship, phone_primary, phone_secondary, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPickup = db.prepare(`
      INSERT INTO pickup_authorizations (id, child_id, name, relationship, phone, id_card_number, photo_url, is_forbidden, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertAttendance = db.prepare(`
      INSERT INTO child_attendance (id, child_id, group_id, date, status, check_in_time, check_out_time, picked_up_by, absence_reason, meal_ordered, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // U3 Krabbelmäuse (10 Kinder)
    const u3Kids = [
      { id: 'c_u3_1', first: 'Leo', last: 'Bergmann', dob: '2024-04-12', gender: 'M', hours: 45 },
      { id: 'c_u3_2', first: 'Mia', last: 'Schneider', dob: '2024-06-15', gender: 'W', hours: 35 },
      { id: 'c_u3_3', first: 'Noah', last: 'Müller', dob: '2024-01-20', gender: 'M', hours: 45 },
      { id: 'c_u3_4', first: 'Emma', last: 'Fischer', dob: '2024-03-08', gender: 'W', hours: 35 },
      { id: 'c_u3_5', first: 'Ben', last: 'Wagner', dob: '2024-07-22', gender: 'M', hours: 25 },
      { id: 'c_u3_6', first: 'Sophia', last: 'Becker', dob: '2024-09-10', gender: 'W', hours: 35 },
      { id: 'c_u3_7', first: 'Elias', last: 'Weber', dob: '2024-02-14', gender: 'M', hours: 45 },
      { id: 'c_u3_8', first: 'Lina', last: 'Meyer', dob: '2024-08-05', gender: 'W', hours: 35 },
      { id: 'c_u3_9', first: 'Jonas', last: 'Hoffmann', dob: '2024-05-18', gender: 'M', hours: 45 },
      { id: 'c_u3_10', first: 'Mila', last: 'Schulz', dob: '2024-10-02', gender: 'W', hours: 35 },
    ];

    u3Kids.forEach(k => {
      insertChild.run(k.id, 'g_u3_maeuse', k.first, k.last, k.dob, k.gender, null, k.hours, '2024-08-01', null, 1, now);
      // Health default
      insertHealth.run(
        k.id,
        k.id === 'c_u3_1' ? JSON.stringify(['Laktose']) : (k.id === 'c_u3_3' ? JSON.stringify(['Erdnuss']) : '[]'),
        k.id === 'c_u3_1' ? 'Laktosefreie Kost / Hafermilch' : null,
        null,
        k.id === 'c_u3_3' ? '⚠️ Notfallset mit EpiPen im Medizinfach Krippe 1. Sofort 112 rufen!' : null,
        1,
        'Dr. med. Weber (Kinderarzt)',
        '0221-554433'
      );
    });

    // U3 Emergency & Pickup
    insertContact.run('ec_1', 'c_u3_1', 'Anna Bergmann', 'Mutter', '0171-1122334', '0221-889911', 1);
    insertContact.run('ec_2', 'c_u3_1', 'Michael Bergmann', 'Vater', '0171-5566778', null, 2);
    insertContact.run('ec_3', 'c_u3_3', 'Susanne Müller', 'Mutter', '0172-8899001', null, 1);

    insertPickup.run('pa_1', 'c_u3_1', 'Hilde Bergmann', 'Großmutter', '0175-9988776', 'T22000123', null, 0, 'Darf dienstags und donnerstags abholen');

    // U3 Attendance for today: 9 present, 1 sick
    u3Kids.forEach((k, idx) => {
      if (idx === 9) {
        insertAttendance.run(`att_${k.id}_${todayStr}`, k.id, 'g_u3_maeuse', todayStr, 'absent_sick', null, null, null, 'Erkältung & Husten', 0, now);
      } else {
        insertAttendance.run(`att_${k.id}_${todayStr}`, k.id, 'g_u3_maeuse', todayStr, 'present', '08:00', null, null, null, 1, now);
      }
    });

    // Ü3 Sonnenschein (25 Kinder)
    const sonneNames = [
      ['Felix', 'Bauer'], ['Hannah', 'Koch'], ['Paul', 'Richter'], ['Emilia', 'Wolf'], ['Luca', 'Braun'],
      ['Laura', 'Zimmermann'], ['David', 'Hartmann'], ['Clara', 'Lange'], ['Maximilian', 'Schmitt'], ['Marie', 'Krause'],
      ['Julian', 'Meier'], ['Lea', 'Frank'], ['Tim', 'Schwarz'], ['Sophie', 'Neumann'], ['Niklas', 'Krämer'],
      ['Elena', 'Vogel'], ['Fabian', 'Fuchs'], ['Amelie', 'Keller'], ['Jan', 'Peters'], ['Sarah', 'Lorenz'],
      ['Moritz', 'Beck'], ['Ida', 'Roth'], ['Mats', 'Sommer'], ['Maya', 'Engel'], ['Finn', 'Groß']
    ];

    sonneNames.forEach(([first, last], idx) => {
      const kidId = `c_ue3_s${idx + 1}`;
      const dob = `2021-${String((idx % 12) + 1).padStart(2, '0')}-15`;
      insertChild.run(kidId, 'g_ue3_sonne', first, last, dob, idx % 2 === 0 ? 'M' : 'W', null, 35, '2023-08-01', null, 1, now);
      insertHealth.run(
        kidId,
        idx === 0 ? JSON.stringify(['Hühnerei']) : '[]',
        idx === 0 ? 'Kein rohes oder gekochtes Ei' : null,
        null, null, 1, 'Dr. med. Weber', '0221-554433'
      );

      // Attendance: Exactly 8 children are reported ABSENT_SICK (creates Auto-Balancing demo!)
      // 17 children are present.
      if (idx >= 17) {
        insertAttendance.run(
          `att_${kidId}_${todayStr}`, kidId, 'g_ue3_sonne', todayStr, 'absent_sick',
          null, null, null, 'Grippaler Infekt / Fieber', 0, now
        );
      } else {
        insertAttendance.run(
          `att_${kidId}_${todayStr}`, kidId, 'g_ue3_sonne', todayStr, 'present',
          '08:15', null, null, null, 1, now
        );
      }
    });

    // Ü3 Sonnenschein Emergency & Forbidden Pickup Test
    insertContact.run('ec_4', 'c_ue3_s1', 'Sabine Bauer', 'Mutter', '0173-4455667', null, 1);
    insertPickup.run('pa_2', 'c_ue3_s1', 'Klaus Bauer', 'Großvater', '0176-3322110', 'L8899221', null, 0, 'Nach telefonischer Absprache');
    insertPickup.run('pa_3', 'c_ue3_s1', 'Thomas Meier', 'Ehemaliger Partner', null, null, null, 1, '⚠️ GERICHTLICHE VERFÜGUNG: Kein Aufenthaltsbestimmungsrecht, darf das Kind keinesfalls abholen!');

    // Ü3 Waldwichtel (24 Kinder)
    const waldNames = [
      ['Anton', 'Huber'], ['Leni', 'Kaiser'], ['Oskar', 'Kunz'], ['Mia', 'Seidel'], ['Theo', 'Voigt'],
      ['Ella', 'Schuster'], ['Jakob', 'Böhm'], ['Lotta', 'Haas'], ['Emil', 'Zander'], ['Klara', 'Dietrich'],
      ['Henry', 'Pohl'], ['Mathilda', 'Horn'], ['Leo', 'Busch'], ['Greta', 'Franke'], ['Levi', 'Wolff'],
      ['Frieda', 'Lorenz'], ['Theo', 'Kühn'], ['Mila', 'Arnold'], ['Luis', 'Beyer'], ['Luisa', 'Schubert'],
      ['Ben', 'Vogel'], ['Charlotte', 'Kraus'], ['Samuel', 'Graf'], ['Theresa', 'König']
    ];

    waldNames.forEach(([first, last], idx) => {
      const kidId = `c_ue3_w${idx + 1}`;
      const dob = `2022-${String((idx % 12) + 1).padStart(2, '0')}-10`;
      insertChild.run(kidId, 'g_ue3_wald', first, last, dob, idx % 2 === 0 ? 'M' : 'W', null, 35, '2024-08-01', null, 1, now);
      insertHealth.run(kidId, '[]', null, null, null, 1, 'Dr. med. Weber', '0221-554433');
      insertAttendance.run(
        `att_${kidId}_${todayStr}`, kidId, 'g_ue3_wald', todayStr, 'present',
        '08:30', null, null, null, 1, now
      );
    });
  }

  // Parent accounts & links
  const insertParent = db.prepare(`
    INSERT OR REPLACE INTO parent_accounts (id, email, password_hash, name, phone, preferred_language, role, board_position, mandatory_hours, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Anna Bergmann ist Eltern-Vorstandsvorsitzende (1. Vorsitzende e.V.)
  insertParent.run('p_anna_bergmann', 'eltern@kita.de', 'admin', 'Anna Bergmann', '0171-1122334', 'de', 'VORSTAND', '1_VORSITZ', 20.0, now);
  // Michael Bauer ist reguläres Elternteil
  insertParent.run('p_michael_bauer', 'bauer@eltern.de', 'admin', 'Michael Bauer', '0172-5544332', 'de', 'ELTERN', null, 20.0, now);

  const insertParentLink = db.prepare(`
    INSERT OR IGNORE INTO parent_child_links (parent_id, child_id, is_primary_contact, photo_consent)
    VALUES (?, ?, ?, ?)
  `);
  insertParentLink.run('p_anna_bergmann', 'c_u3_1', 1, 1);
  insertParentLink.run('p_michael_bauer', 'c_ue3_s1', 1, 1);

  // Seed: Elterndienste & Arbeitseinsätze
  const dutyCount = db.prepare('SELECT COUNT(*) as count FROM parent_duties').get() as { count: number };
  if (dutyCount.count === 0) {
    const insertDuty = db.prepare(`
      INSERT INTO parent_duties (id, title, description, category, hours_credit, max_helpers, date, time_start, time_end, location, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const nextSaturday = format(addDays(new Date(), 5), 'yyyy-MM-dd');
    const inTwoWeeks = format(addDays(new Date(), 14), 'yyyy-MM-dd');

    insertDuty.run(
      'duty_1',
      'Herbst-Gartenaktion: Außengelände & Sandkasten winterfest machen',
      'Laub rechen, Sonnensegel abbauen, Hecken stutzen und Hackschnitzel verteilen. Bitte Gartenhandschuhe mitbringen!',
      'GARTEN', 4.0, 8, nextSaturday, '09:30', '13:30', 'Kita-Außengelände', 'OPEN', now
    );

    insertDuty.run(
      'duty_2',
      'Notfall-Kochdienst bei Catering-Lieferausfall',
      'Kurzfristiges Zubereiten von Bio-Nudeln mit Tomatensauce & Gemüsesticks für 40 Kinder in der Kita-Küche.',
      'NOTFALL_KOCHEN', 3.0, 2, format(addDays(new Date(), 2), 'yyyy-MM-dd'), '10:00', '13:00', 'Kita-Küche', 'OPEN', now
    );

    insertDuty.run(
      'duty_3',
      'Laternenfest: Waffelstand & Kinderpunsch-Ausgabe',
      'Unterstützung beim Teig backen, Ausgabe von warmem Apfelpunsch und Weckmännern.',
      'FEST', 2.5, 4, inTwoWeeks, '16:30', '19:00', 'Kita-Garten Pavillon', 'OPEN', now
    );

    // Anna Bergmann hat bereits einen Dienst erledigt
    const insertSignup = db.prepare(`
      INSERT INTO parent_duty_signups (id, duty_id, parent_id, hours_credited, status, confirmed_by, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSignup.run('signup_1', 'duty_1', 'p_anna_bergmann', 4.0, 'CONFIRMED', 'Sabine Weber', now, now);
  }

  // Seed: Blitz-Umfragen
  const pollCount = db.prepare('SELECT COUNT(*) as count FROM parent_polls').get() as { count: number };
  if (pollCount.count === 0) {
    db.prepare(`
      INSERT INTO parent_polls (id, title, question, category, created_by_id, created_by_name, expires_at, is_closed, allow_multiple, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(
      'poll_1',
      'Terminabstimmung: Kita-Sommerfest 2027',
      'An welchem Samstag soll unser großes Sommerfest mit Eltern-Picknick im Garten stattfinden?',
      'FESTE', 's_sabine', 'Sabine Weber (Leitung)',
      format(addDays(new Date(), 20), 'yyyy-MM-dd'),
      now
    );

    const insertOpt = db.prepare(`
      INSERT INTO parent_poll_options (id, poll_id, option_text, vote_count)
      VALUES (?, ?, ?, ?)
    `);
    insertOpt.run('opt_1', 'poll_1', 'Samstag, 12. Juni (14:00 - 18:00 Uhr)', 6);
    insertOpt.run('opt_2', 'poll_1', 'Samstag, 19. Juni (14:00 - 18:00 Uhr)', 14);
    insertOpt.run('opt_3', 'poll_1', 'Samstag, 26. Juni (14:00 - 18:00 Uhr)', 4);
  }

  // Seed: Digitale Dokumente & Signaturen
  const docCount = db.prepare('SELECT COUNT(*) as count FROM digital_documents').get() as { count: number };
  if (docCount.count === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO digital_documents (id, title, document_type, child_id, parent_id, content_html, status, signature_data, signed_at, signed_by_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Bereits digital unterschriebene Fotoeinwilligung
    insertDoc.run(
      'doc_1',
      'DSGVO Foto- & Medien-Einwilligung 2026/27',
      'FOTOERLAUBNIS', 'c_u3_1', 'p_anna_bergmann',
      '<p>Ich willige ein, dass Fotos meines Kindes für interne Gruppen-Aushänge und das Portfolio verwendet werden dürfen.</p>',
      'SIGNED', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMCAxMCBMMTAwIDEwMCIvPjwvc3ZnPg==',
      now, 'Anna Bergmann', now
    );

    // 2. Zur Unterschrift ausstehender Betreuungsvertrag
    insertDoc.run(
      'doc_2',
      'Betreuungsvertrag 35-Stunden-Blocköffnung 2026/27',
      'BETREUUNGSVERTRAG', 'c_ue3_s1', 'p_michael_bauer',
      '<p>Vereinbarung über die Betreuung von Felix Bauer in der Elementargruppe Sonnenschein mit 35 Wochenstunden.</p>',
      'PENDING_SIGNATURE', null, null, null, now
    );
  }

  // Dedizierte Kiosk-Geräte-Accounts
  const kioskCount = db.prepare('SELECT COUNT(*) as count FROM kiosk_devices').get() as { count: number };
  if (kioskCount.count === 0) {
    const insertKiosk = db.prepare(`
      INSERT INTO kiosk_devices (id, name, group_id, pin, device_token, last_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertKiosk.run('kiosk_krabbelmaeuse', 'Gruppen-Tablet Krabbelmäuse U3', 'g_u3_maeuse', '1234', 'tok_krippe_u3', now);
    insertKiosk.run('kiosk_sonnenschein', 'Gruppen-Tablet Sonnenschein Ü3', 'g_ue3_sonne', '1234', 'tok_sonne_ue3', now);
    insertKiosk.run('kiosk_waldwichtel', 'Gruppen-Tablet Waldwichtel Ü3', 'g_ue3_wald', '1234', 'tok_wald_ue3', now);
    insertKiosk.run('kiosk_eingang', 'Stationäres Eingangs-Terminal', null, '1234', 'tok_terminal_main', now);
  }

  // Seed Announcements / Schwarzes Brett & Elternbriefe
  const annCount = db.prepare('SELECT COUNT(*) as count FROM announcements').get() as { count: number };
  if (annCount.count === 0) {
    const insertAnn = db.prepare(`
      INSERT INTO announcements (id, title, content, priority, author, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertAnn.run(
      'ann_1',
      '🏮 Vorbereitung Laternenfest & St. Martin',
      'Am 10. November feiern wir unser traditionelles Laternenfest ab 16:30 Uhr im Kita-Garten. Bitte bringt wetterfeste Kleidung und einen elektrischen Laternenstab mit. Für warmen Bio-Apfelpunsch und Weckmänner ist gesorgt!',
      'HIGH',
      'Sabine Weber (Leitung)',
      format(new Date(), 'yyyy-MM-dd')
    );
    insertAnn.run(
      'ann_2',
      '🚨 Schließtag: Pädagogischer Fachtag',
      'Liebe Eltern, bitte beachten Sie, dass die Kita am kommenden Freitag wegen eines ganztägigen pädagogischen Fachtags für das Gesamtteam geschlossen bleibt.',
      'NORMAL',
      'Sabine Weber (Leitung)',
      format(addDays(new Date(), -2), 'yyyy-MM-dd')
    );
    insertAnn.run(
      'ann_3',
      '🍏 Neues Bio-Catering & Speiseplan-Abstimmung',
      'Ab nächstem Monat starten wir mit unserem neuen regionalen Bio-Caterer "Grüne Küche". In der Eltern-App finden Sie eine Blitz-Umfrage zu den neuen Lieblingsgerichten!',
      'NORMAL',
      'Anna Bergmann (Vorstand e.V.)',
      format(addDays(new Date(), -5), 'yyyy-MM-dd')
    );
  }

  // Seed Child Daily Logs (U3 Schlaftagebuch, Mahlzeiten, Windel)
  const logCount = db.prepare('SELECT COUNT(*) as count FROM child_daily_logs').get() as { count: number };
  if (logCount.count === 0) {
    const insertLog = db.prepare(`
      INSERT INTO child_daily_logs (id, child_id, date, log_type, time_start, time_end, details, staff_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    insertLog.run('log_1', 'c_u3_1', todayStr, 'SLEEP', '12:30', '14:00', 'Ruhig geschlafen mit Lieblingskuscheltuch', 's_elena', now);
    insertLog.run('log_2', 'c_u3_1', todayStr, 'MEAL', '11:45', null, 'Kartoffel-Möhren-Püree komplett aufgegessen & Nachtisch genossen', 's_elena', now);
    insertLog.run('log_3', 'c_u3_1', todayStr, 'DIAPER', '14:15', null, 'Gewickelt (nass, alles i.O.)', 's_jonas', now);
    insertLog.run('log_4', 'c_u3_1', todayStr, 'NOTE', '10:15', null, 'Hat heute begeistert mit Bauklötzen einen hohen Turm gebaut!', 's_elena', now);
  }

  // Seed Warteliste (Modul E: Platzvergabe & Punktesystem)
  const waitlistCount = db.prepare('SELECT COUNT(*) as count FROM waitlist_applications').get() as { count: number };
  if (waitlistCount.count === 0) {
    const insertWait = db.prepare(`
      INSERT INTO waitlist_applications (
        id, child_first_name, child_last_name, birth_date, gender, parent_name, parent_email, parent_phone,
        desired_start_date, desired_hours, desired_group_type, points, has_sibling, is_single_parent, is_employed, in_catchment_area, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertWait.run(
      'wait_1', 'Emil', 'Fischer', '2024-08-15', 'M', 'Katharina Fischer', 'fischer@web.de', '0170-1122334',
      format(addDays(new Date(), 30), 'yyyy-MM-dd'), 45, 'U3', 11, 1, 0, 1, 1, 'WAITING', 'Geschwisterkind bereits in Sonnenschein', now
    );
    insertWait.run(
      'wait_2', 'Sophia', 'Weber', '2023-11-20', 'W', 'Markus Weber', 'weber@gmx.de', '0175-9988776',
      format(addDays(new Date(), 15), 'yyyy-MM-dd'), 35, 'U3', 8, 0, 1, 1, 1, 'OFFERED', 'Platz in Krabbelmäuse angeboten', now
    );
    insertWait.run(
      'wait_3', 'Paul', 'Hoffmann', '2022-04-10', 'M', 'Julia Hoffmann', 'hoffmann@eltern.de', '0160-5544332',
      format(addDays(new Date(), 60), 'yyyy-MM-dd'), 45, 'UE3', 6, 0, 0, 1, 1, 'WAITING', 'Wechsel von Tagesmutter', now
    );
  }

  // Seed Monatsabrechnung & SEPA-Lastschriften (Modul E)
  const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM billing_invoices').get() as { count: number };
  if (invoiceCount.count === 0) {
    const insertInv = db.prepare(`
      INSERT INTO billing_invoices (
        id, parent_id, child_id, month, care_hours, base_care_fee, meal_fee, meal_days_counted, extra_fees, total_amount, status, iban, bic, mandate_ref, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const currentMonth = format(new Date(), 'yyyy-MM');
    insertInv.run(
      'inv_1', 'p_michael_bauer', 'c_ue3_s1', currentMonth, 35, 190.00, 75.60, 18, 0.0, 265.60, 'PENDING',
      'DE89370400440532013000', 'COBADEFFXXX', 'MANDAT-BAUER-2026', now
    );
    insertInv.run(
      'inv_2', 'p_anna_bergmann', 'c_u3_1', currentMonth, 45, 280.00, 67.20, 16, 0.0, 347.20, 'PENDING',
      'DE27100777770345678901', 'DEUTDEDBFXX', 'MANDAT-BERGMANN-2026', now
    );
  }

  // Seed Entwicklungsgespräche & Sprechtag-Slots (Modul C)
  const confCount = db.prepare('SELECT COUNT(*) as count FROM parent_teacher_conferences').get() as { count: number };
  if (confCount.count === 0) {
    const insertConf = db.prepare(`
      INSERT INTO parent_teacher_conferences (
        id, staff_id, group_id, title, date, time_start, time_end, room, status, booked_by_parent_id, booked_child_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    const inTwoWeeks = format(addDays(new Date(), 10), 'yyyy-MM-dd');

    insertConf.run(
      'conf_1', 's_sarah', 'g_ue3_sonne', 'Entwicklungsgespräch 1. Halbjahr', nextWeek, '14:00', '14:30', 'Besprechungsraum 1',
      'AVAILABLE', null, null, 'Vorbereitung Portfolio & Sprachstand', now
    );
    insertConf.run(
      'conf_2', 's_sarah', 'g_ue3_sonne', 'Entwicklungsgespräch 1. Halbjahr', nextWeek, '14:35', '15:05', 'Besprechungsraum 1',
      'AVAILABLE', null, null, 'Vorbereitung Portfolio & Sprachstand', now
    );
    insertConf.run(
      'conf_3', 's_elena', 'g_u3_maeuse', 'U3 Eingewöhnungs- & Entwicklungsbilanz', inTwoWeeks, '13:30', '14:00', 'Gruppenraum Krabbelmäuse',
      'BOOKED', 'p_anna_bergmann', 'c_u3_1', 'Fokus: Motorik & Selbstständigkeit beim Essen', now
    );
  }

  // Seed Foto-Galerie (Modul C & B: DSGVO-Portfolio)
  const albumCount = db.prepare('SELECT COUNT(*) as count FROM photo_albums').get() as { count: number };
  if (albumCount.count === 0) {
    const insertAlbum = db.prepare(`
      INSERT INTO photo_albums (id, title, description, group_id, event_date, created_by_staff_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPhoto = db.prepare(`
      INSERT INTO photos (id, album_id, image_url, caption, requires_consent, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertAlbum.run(
      'album_1', 'Herbst-Waldtag & Naturforscher', 'Gemeinsamer Ausflug der Sonnenscheingruppe in den Stadtwald mit Laubhüttenbau',
      'g_ue3_sonne', format(addDays(new Date(), -3), 'yyyy-MM-dd'), 's_lukas', now
    );
    insertPhoto.run('photo_1', 'album_1', 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80', 'Bunte Eichen- und Buchenblätter gesammelt', 1, now);
    insertPhoto.run('photo_2', 'album_1', 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80', 'Gemeinsamer Bau einer Waldhütte aus Ästen', 1, now);

    insertAlbum.run(
      'album_2', 'Laternen basteln & Fingerspiele', 'Vorbereitung für das St. Martinsfest in der Krippe',
      'g_u3_maeuse', format(addDays(new Date(), -6), 'yyyy-MM-dd'), 's_elena', now
    );
    insertPhoto.run('photo_3', 'album_2', 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80', 'Kreatives Gestalten mit Fingerfarben', 1, now);
  }
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
