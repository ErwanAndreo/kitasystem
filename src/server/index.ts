import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, initDb } from './db.js';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Initialize SQLite database
initDb();

// ---------------------------------------------------------------------------
// 0. HEALTH CHECK & SYSTEM DIAGNOSTICS
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as ok').get() as { ok: number };
    const staffCount = db.prepare('SELECT COUNT(*) as count FROM staff WHERE is_active = 1').get() as { count: number };
    const shiftsCount = db.prepare('SELECT COUNT(*) as count FROM shifts WHERE date = ?').get(format(new Date(), 'yyyy-MM-dd')) as { count: number };
    
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      database: {
        engine: 'SQLite3 (WAL mode)',
        connected: dbCheck?.ok === 1,
        active_staff: staffCount.count,
        shifts_today: shiftsCount.count
      },
      system: {
        node_version: process.version,
        memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        platform: process.platform
      }
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'DOWN',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Hot live backup of SQLite database without locking
app.post('/api/admin/backup', async (req, res) => {
  try {
    const backupDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `kita_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.sqlite`);
    await db.backup(backupPath);
    res.json({ success: true, backupPath, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 1. STAFF MANAGEMENT (ACCOUNTS, CONTRACTS, SKILLS & SECONDARY ROLES)
// ---------------------------------------------------------------------------
app.get('/api/staff', (req, res) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const staffList = db.prepare(`
      SELECT s.*, 
        (SELECT status FROM timelogs WHERE staff_id = s.id AND date = ? ORDER BY id DESC LIMIT 1) as clock_status,
        (SELECT type FROM absences WHERE staff_id = s.id AND ? BETWEEN start_date AND end_date AND status = 'APPROVED' LIMIT 1) as current_absence,
        (SELECT COUNT(*) FROM staff_audit_log WHERE staff_id = s.id AND is_read = 0) as unread_notifications_count
      FROM staff s
      WHERE s.is_active = 1
      ORDER BY s.role = 'LEITUNG' DESC, s.name ASC
    `).all(today, today).map((s: any) => ({
      ...s,
      skills: JSON.parse(s.skills || '[]'),
      secondary_roles: JSON.parse(s.secondary_roles || '[]')
    }));

    res.json(staffList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/staff', (req, res) => {
  try {
    const { 
      name, email, phone, role, qualification, is_fachkraft, 
      weekly_hours, work_days, annual_vacation_days, target_group_id, pin, color,
      skills, secondary_roles, can_spring
    } = req.body;

    const id = 's_' + Date.now();
    const avatar = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

    db.prepare(`
      INSERT INTO staff (
        id, name, email, phone, role, qualification, is_fachkraft, 
        weekly_hours, work_days, annual_vacation_days, target_group_id, pin, avatar, color, is_active,
        skills, secondary_roles, can_spring
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      id, name, email, phone || '', role, qualification, is_fachkraft ? 1 : 0, 
      weekly_hours || 39.0, work_days || 5, annual_vacation_days || 30, target_group_id || null, 
      pin || '1234', avatar, color || '#16a34a',
      JSON.stringify(skills || ['FACHKRAFT', 'ERSTE_HILFE_KIND']),
      JSON.stringify(secondary_roles || []),
      can_spring ? 1 : 0
    );

    const logId = 'log_' + Date.now();
    db.prepare(`
      INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
      VALUES (?, ?, 'HOURS_CHANGE', 'Mitarbeiter-Konto eingerichtet', ?, 'Sabine Weber (Leitung)', ?, 0)
    `).run(
      logId, id, 
      `Konto angelegt mit ${weekly_hours || 39.0} Std./Woche (${work_days || 5} Tage), ${annual_vacation_days || 30} Urlaubstage.`, 
      new Date().toISOString()
    );

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/staff/:id', (req, res) => {
  try {
    const staffId = req.params.id;
    const { 
      name, email, phone, role, qualification, is_fachkraft, 
      weekly_hours, work_days, annual_vacation_days, target_group_id, pin, color,
      skills, secondary_roles, can_spring
    } = req.body;

    const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
    if (!existing) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    db.prepare(`
      UPDATE staff SET 
        name = ?, email = ?, phone = ?, role = ?, qualification = ?, is_fachkraft = ?,
        weekly_hours = ?, work_days = ?, annual_vacation_days = ?, target_group_id = ?, pin = ?, color = ?,
        skills = ?, secondary_roles = ?, can_spring = ?
      WHERE id = ?
    `).run(
      name, email, phone, role, qualification, is_fachkraft ? 1 : 0,
      weekly_hours, work_days || 5, annual_vacation_days || 30, target_group_id || null, pin || '1234', color || '#16a34a',
      JSON.stringify(skills || []), JSON.stringify(secondary_roles || []), can_spring ? 1 : 0,
      staffId
    );

    if (existing.weekly_hours !== weekly_hours || existing.annual_vacation_days !== annual_vacation_days) {
      const logId = 'log_' + Date.now();
      db.prepare(`
        INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
        VALUES (?, ?, 'HOURS_CHANGE', 'Vertragliche Wochenstunden angepasst', ?, 'Sabine Weber (Leitung)', ?, 0)
      `).run(
        logId, staffId,
        `Deine Wochenstunden wurden von ${existing.weekly_hours}h auf ${weekly_hours}h angepasst.`,
        new Date().toISOString()
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/staff/:id', (req, res) => {
  try {
    db.prepare('UPDATE staff SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. ÜBERSTUNDEN & ZEITKONTEN TRACKING
// ---------------------------------------------------------------------------
app.get('/api/staff/:id/stats', (req, res) => {
  try {
    const staffId = req.params.id;
    const currentMonth = format(new Date(), 'yyyy-MM');
    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
    if (!staff) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    const logs = db.prepare(`
      SELECT * FROM timelogs 
      WHERE staff_id = ? AND date LIKE ? AND clock_out IS NOT NULL
    `).all(staffId, `${currentMonth}%`) as any[];

    let totalMinutes = 0;
    logs.forEach(l => {
      const [inH, inM] = l.clock_in.split(':').map(Number);
      const [outH, outM] = l.clock_out.split(':').map(Number);
      const worked = (outH * 60 + outM) - (inH * 60 + inM) - (l.break_minutes || 0);
      if (worked > 0) totalMinutes += worked;
    });

    const adjustments = db.prepare(`
      SELECT COALESCE(SUM(hours), 0) as total_adj FROM overtime_adjustments
      WHERE staff_id = ? AND date LIKE ?
    `).get(staffId, `${currentMonth}%`) as { total_adj: number };

    const actualHours = parseFloat((totalMinutes / 60).toFixed(2));
    const targetMonthlyHours = parseFloat((staff.weekly_hours * 4.33).toFixed(2));
    const overtimeHours = parseFloat((actualHours + adjustments.total_adj - targetMonthlyHours).toFixed(2));

    const vacationAbsences = db.prepare(`
      SELECT COUNT(*) as c FROM absences 
      WHERE staff_id = ? AND type = 'VACATION' AND status = 'APPROVED'
    `).get(staffId) as { c: number };

    const remainingVacationDays = Math.max(0, (staff.annual_vacation_days || 30) - (vacationAbsences.c || 0));

    res.json({
      staff_id: staffId,
      name: staff.name,
      month: currentMonth,
      weekly_hours: staff.weekly_hours,
      work_days: staff.work_days || 5,
      target_month_hours: targetMonthlyHours,
      actual_hours: actualHours,
      adjustments_hours: adjustments.total_adj,
      overtime_hours: overtimeHours,
      remaining_vacation_days: remainingVacationDays,
      total_vacation_days: staff.annual_vacation_days || 30,
      skills: JSON.parse(staff.skills || '[]'),
      secondary_roles: JSON.parse(staff.secondary_roles || '[]')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/time-overview', (req, res) => {
  try {
    const month = (req.query.month as string) || format(new Date(), 'yyyy-MM');
    const staffList = db.prepare('SELECT * FROM staff WHERE is_active = 1 ORDER BY name ASC').all() as any[];

    const overview = staffList.map(s => {
      const logs = db.prepare(`
        SELECT * FROM timelogs 
        WHERE staff_id = ? AND date LIKE ? AND clock_out IS NOT NULL
      `).all(s.id, `${month}%`) as any[];

      let totalMinutes = 0;
      logs.forEach(l => {
        const [inH, inM] = l.clock_in.split(':').map(Number);
        const [outH, outM] = l.clock_out.split(':').map(Number);
        const worked = (outH * 60 + outM) - (inH * 60 + inM) - (l.break_minutes || 0);
        if (worked > 0) totalMinutes += worked;
      });

      const adjustments = db.prepare(`
        SELECT COALESCE(SUM(hours), 0) as total_adj FROM overtime_adjustments
        WHERE staff_id = ? AND date LIKE ?
      `).get(s.id, `${month}%`) as { total_adj: number };

      const actualHours = parseFloat((totalMinutes / 60).toFixed(2));
      const targetMonthlyHours = parseFloat((s.weekly_hours * 4.33).toFixed(2));
      const overtime = parseFloat((actualHours + adjustments.total_adj - targetMonthlyHours).toFixed(2));

      return {
        staff_id: s.id,
        name: s.name,
        role: s.role,
        avatar: s.avatar,
        color: s.color,
        weekly_hours: s.weekly_hours,
        target_month_hours: targetMonthlyHours,
        actual_hours: actualHours,
        adjustments_hours: adjustments.total_adj,
        overtime_hours: overtime,
        remaining_vacation: s.annual_vacation_days || 30
      };
    });

    res.json({ month, overview });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/staff/:id/overtime-adjustment', (req, res) => {
  try {
    const staffId = req.params.id;
    const { hours, reason, date } = req.body;
    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
    if (!staff) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    const adjId = 'adj_' + Date.now();
    const effectiveDate = date || format(new Date(), 'yyyy-MM-dd');
    const createdBy = 'Sabine Weber (Leitung)';

    db.prepare(`
      INSERT INTO overtime_adjustments (id, staff_id, hours, reason, date, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(adjId, staffId, Number(hours), reason, effectiveDate, createdBy, new Date().toISOString());

    const logId = 'log_' + Date.now();
    const sign = Number(hours) >= 0 ? '+' : '';
    db.prepare(`
      INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
      VALUES (?, ?, 'OVERTIME_ADJUSTMENT', ?, ?, ?, ?, 0)
    `).run(
      logId, staffId,
      `Überstunden-Anpassung: ${sign}${hours} Std.`,
      `Gutschrift/Ausgleich gebucht für ${effectiveDate}: "${reason}" durch ${createdBy}.`,
      createdBy,
      new Date().toISOString()
    );

    res.status(201).json({ success: true, id: adjId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/staff/:id/overtime-adjustments', (req, res) => {
  try {
    const adjustments = db.prepare(`
      SELECT * FROM overtime_adjustments 
      WHERE staff_id = ? 
      ORDER BY date DESC, created_at DESC
    `).all(req.params.id);
    res.json(adjustments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. AUDIT LOG & TRANSPARENZ
// ---------------------------------------------------------------------------
app.get('/api/staff/:id/audit-log', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM staff_audit_log 
      WHERE staff_id = ? 
      ORDER BY created_at DESC
    `).all(req.params.id);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-log/:id/read', (req, res) => {
  try {
    db.prepare('UPDATE staff_audit_log SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. SMART RATIO & SKILLS ENGINE (BERÜCKSICHTIGT FACHKRÄFTE, U3-SKILLS & ERSTHELFER)
// ---------------------------------------------------------------------------
app.get('/api/groups', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups ORDER BY name ASC').all().map((g: any) => ({
      ...g,
      required_skills: JSON.parse(g.required_skills || '[]')
    }));
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ratio-status', (req, res) => {
  try {
    const date = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');
    const groups = db.prepare('SELECT * FROM groups').all() as any[];

    // Check facility-wide First-Aid requirement
    const allFacilityActiveShifts = db.prepare(`
      SELECT s.*, st.name as staff_name, st.skills
      FROM shifts s
      JOIN staff st ON s.staff_id = st.id
      WHERE s.date = ? AND s.status = 'CONFIRMED'
    `).all(date) as any[];

    const hasFacilityFirstAid = allFacilityActiveShifts.some(s => {
      const skills = JSON.parse(s.skills || '[]');
      return skills.includes('ERSTE_HILFE_KIND');
    });

    const ratioStatus = groups.map(group => {
      const requiredSkills: string[] = JSON.parse(group.required_skills || '[]');

      const activeShifts = db.prepare(`
        SELECT s.*, st.name as staff_name, st.role, st.is_fachkraft, st.qualification,
               st.skills, st.secondary_roles, st.can_spring
        FROM shifts s
        JOIN staff st ON s.staff_id = st.id
        WHERE s.group_id = ? AND s.date = ? AND s.status = 'CONFIRMED'
      `).all(group.id, date).map((s: any) => ({
        ...s,
        skills: JSON.parse(s.skills || '[]'),
        secondary_roles: JSON.parse(s.secondary_roles || '[]')
      }));

      const totalStaff = activeShifts.length;
      const fachkraefte = activeShifts.filter((s: any) => s.is_fachkraft === 1).length;
      const ergaenzungskraefte = totalStaff - fachkraefte;

      const actualRatio = totalStaff > 0 ? parseFloat((group.child_count / totalStaff).toFixed(2)) : 99;
      const fachkraftPercent = totalStaff > 0 ? fachkraefte / totalStaff : 0;

      // Skill validation
      const presentSkills = new Set<string>();
      activeShifts.forEach((s: any) => s.skills.forEach((sk: string) => presentSkills.add(sk)));

      const missingSkills = requiredSkills.filter(reqSkill => !presentSkills.has(reqSkill));

      let status = 'OPTIMAL';
      let message = 'Betreuungsschlüssel & personelle Skills erfüllt.';

      if (totalStaff === 0) {
        status = 'CRITICAL';
        message = 'AKUTER NOTSTAND: Keine Aufsichtsperson in der Gruppe!';
      } else if (actualRatio > group.target_ratio) {
        status = 'CRITICAL';
        message = `Unterbesetzung: 1:${actualRatio} (Gesetzliches Limit: 1:${group.target_ratio})`;
      } else if (missingSkills.length > 0) {
        status = 'CRITICAL';
        message = `Skill-Verstoß: Fehlende Qualifikation (${missingSkills.join(', ')})!`;
      } else if (fachkraftPercent < group.min_fachkraft_percent) {
        status = 'WARNING';
        message = `Fachkraftquote unterschritten: ${(fachkraftPercent * 100).toFixed(0)}% (Min: ${(group.min_fachkraft_percent * 100).toFixed(0)}%)`;
      } else if (!hasFacilityFirstAid) {
        status = 'WARNING';
        message = 'Achtung: Kein zertifizierter Ersthelfer am Kind im Haus anwesend!';
      } else if (actualRatio > group.target_ratio * 0.9) {
        status = 'WARNING';
        message = `Puffer sehr gering: 1:${actualRatio}. Pausenzeiten versetzen!`;
      }

      return {
        group_id: group.id,
        group_name: group.name,
        group_type: group.type,
        child_count: group.child_count,
        target_ratio: group.target_ratio,
        actual_ratio: actualRatio,
        min_fachkraft_percent: group.min_fachkraft_percent,
        actual_fachkraft_percent: fachkraftPercent,
        required_skills: requiredSkills,
        missing_skills: missingSkills,
        total_staff: totalStaff,
        fachkraefte,
        ergaenzungskraefte,
        status,
        message,
        staff: activeShifts
      };
    });

    res.json({ date, has_first_aid: hasFacilityFirstAid, groups: ratioStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Intelligent substitute / springer finder with skill matching
app.get('/api/emergency/suggestions', (req, res) => {
  try {
    const { group_id, date } = req.query;
    const targetDate = (date as string) || format(new Date(), 'yyyy-MM-dd');
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(group_id) as any;
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });

    const requiredSkills: string[] = JSON.parse(group.required_skills || '[]');

    // Get all active staff
    const allStaff = db.prepare('SELECT * FROM staff WHERE is_active = 1').all() as any[];

    // Check who is already working today
    const busyStaffIds = new Set(
      db.prepare("SELECT staff_id FROM shifts WHERE date = ? AND status = 'CONFIRMED'")
        .all(targetDate)
        .map((s: any) => s.staff_id)
    );

    const suggestions = allStaff.map((staff: any) => {
      const skills: string[] = JSON.parse(staff.skills || '[]');
      const secondaryRoles: string[] = JSON.parse(staff.secondary_roles || '[]');
      const isAlreadyWorking = busyStaffIds.has(staff.id);

      // Calculate skill match score
      let score = 50;
      const matchingSkills = requiredSkills.filter(r => skills.includes(r));
      const hasAllRequired = requiredSkills.every(r => skills.includes(r));

      if (hasAllRequired) score += 40;
      if (staff.is_fachkraft === 1) score += 20;
      if (staff.can_spring === 1) score += 25;
      if (staff.role === 'SPRINGER') score += 30;
      if (staff.role === 'LEITUNG') score += 15; // Leitung can spring in emergency
      if (isAlreadyWorking) score -= 50; // Already scheduled somewhere

      let note = '';
      if (staff.role === 'LEITUNG') {
        note = 'Primär Leitung (Büro) – kann bei akutem Notstand als voll anerkannte Fachkraft in die Gruppe springen!';
      } else if (staff.role === 'SPRINGER') {
        note = 'Einsatzbereite Springerin mit vollem Skill-Match.';
      } else if (staff.is_fachkraft === 1) {
        note = `Anerkannte Fachkraft (${skills.join(', ')}).`;
      } else {
        note = 'Ergänzungskraft zur reinen Kopfzahl-Unterstützung (keine Gruppenleitung).';
      }

      return {
        staff_id: staff.id,
        name: staff.name,
        role: staff.role,
        qualification: staff.qualification,
        is_fachkraft: staff.is_fachkraft === 1,
        can_spring: staff.can_spring === 1,
        skills,
        secondary_roles: secondaryRoles,
        matching_skills: matchingSkills,
        has_all_required: hasAllRequired,
        is_already_working: isAlreadyWorking,
        score,
        note
      };
    }).sort((a, b) => b.score - a.score);

    res.json({
      group: group.name,
      required_skills: requiredSkills,
      suggestions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. SHIFTS & DIENSTPLAN
// ---------------------------------------------------------------------------
app.get('/api/shifts', (req, res) => {
  try {
    const { start, end, group_id, staff_id } = req.query;
    let query = `
      SELECT s.*, st.name as staff_name, st.role as staff_role, st.is_fachkraft, st.color as staff_color,
             st.skills as staff_skills, g.name as group_name, g.color as group_color
      FROM shifts s
      JOIN staff st ON s.staff_id = st.id
      JOIN groups g ON s.group_id = g.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (start && end) {
      query += ` AND s.date BETWEEN ? AND ?`;
      params.push(start, end);
    }
    if (group_id) {
      query += ` AND s.group_id = ?`;
      params.push(group_id);
    }
    if (staff_id) {
      query += ` AND s.staff_id = ?`;
      params.push(staff_id);
    }

    query += ` ORDER BY s.date ASC, s.start_time ASC`;
    const shifts = db.prepare(query).all(...params).map((sh: any) => ({
      ...sh,
      staff_skills: JSON.parse(sh.staff_skills || '[]')
    }));

    res.json(shifts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shifts', (req, res) => {
  try {
    const { staff_id, group_id, date, start_time, end_time, break_minutes, role_override } = req.body;
    const id = 'shift_' + Date.now();

    const prevDayShifts = db.prepare(`
      SELECT end_time FROM shifts
      WHERE staff_id = ? AND date = date(?, '-1 day') AND status = 'CONFIRMED'
      ORDER BY end_time DESC LIMIT 1
    `).get(staff_id, date) as { end_time: string } | undefined;

    let warning = null;
    if (prevDayShifts) {
      const [prevH, prevM] = prevDayShifts.end_time.split(':').map(Number);
      const [currH, currM] = start_time.split(':').map(Number);
      const restHours = (24 - prevH - prevM / 60) + (currH + currM / 60);
      if (restHours < 11) {
        warning = `Achtung (ArbZG § 5): Ruhezeit beträgt nur ${restHours.toFixed(1)} Std. (Gesetzlich: mind. 11 Std.)!`;
      }
    }

    db.prepare(`
      INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status, role_override)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)
    `).run(id, staff_id, group_id, date, start_time, end_time, break_minutes || 30, role_override || null);

    const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(group_id) as any;
    const logId = 'log_' + Date.now();
    db.prepare(`
      INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
      VALUES (?, ?, 'SHIFT_CHANGE', 'Dienstplan aktualisiert', ?, 'Sabine Weber (Leitung)', ?, 0)
    `).run(
      logId, staff_id,
      `Schicht am ${date} eingeteilt: ${start_time} - ${end_time} Uhr (${group?.name || 'Gruppe'}).`,
      new Date().toISOString()
    );

    res.status(201).json({ success: true, id, warning });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shifts/:id', (req, res) => {
  try {
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id) as any;
    if (shift) {
      const logId = 'log_' + Date.now();
      db.prepare(`
        INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
        VALUES (?, ?, 'SHIFT_CHANGE', 'Schicht storniert / gelöscht', ?, 'Sabine Weber (Leitung)', ?, 0)
      `).run(
        logId, shift.staff_id,
        `Deine Schicht am ${shift.date} (${shift.start_time} - ${shift.end_time} Uhr) wurde von der Leitung gelöscht.`,
        new Date().toISOString()
      );
    }
    db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. APPROVALS & NOTFALL-TRIGGER
// ---------------------------------------------------------------------------
app.get('/api/approvals', (req, res) => {
  try {
    const status = req.query.status as string;
    let query = `
      SELECT a.*, 
        r.name as requester_name, r.role as requester_role, r.avatar as requester_avatar,
        t.name as target_name, t.role as target_role
      FROM approvals a
      JOIN staff r ON a.requester_id = r.id
      LEFT JOIN staff t ON a.target_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY a.status = 'PENDING' DESC, a.created_at DESC`;

    const approvals = db.prepare(query).all(...params).map((item: any) => ({
      ...item,
      details: JSON.parse(item.details || '{}')
    }));

    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/approvals/:id/decide', (req, res) => {
  try {
    const { action, decision_note, decision_by } = req.body;
    const approvalId = req.params.id;

    const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(approvalId) as any;
    if (!approval) return res.status(404).json({ error: 'Freigabe-Eintrag nicht gefunden' });

    const now = new Date().toISOString();

    const updateTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE approvals
        SET status = ?, decision_note = ?, decision_by = ?, decided_at = ?
        WHERE id = ?
      `).run(action, decision_note || '', decision_by || 'Sabine Weber (Leitung)', now, approvalId);

      const details = JSON.parse(approval.details || '{}');

      const logId = 'log_' + Date.now();
      db.prepare(`
        INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
        VALUES (?, ?, 'APPROVAL', ?, ?, ?, ?, 0)
      `).run(
        logId, approval.requester_id,
        `Antrag ${action === 'APPROVED' ? 'freigegeben' : 'abgelehnt'}: ${details.title || ''}`,
        `Entscheidung durch ${decision_by || 'Sabine Weber (Leitung)'}${decision_note ? ': "' + decision_note + '"' : '.'}`,
        decision_by || 'Sabine Weber (Leitung)',
        now
      );

      if (action === 'APPROVED') {
        if (approval.type === 'SHIFT_SWAP' && approval.shift_id && approval.target_id) {
          db.prepare('UPDATE shifts SET staff_id = ? WHERE id = ?').run(approval.target_id, approval.shift_id);
        }

        if (approval.type === 'EMERGENCY_REPLACEMENT') {
          const today = format(new Date(), 'yyyy-MM-dd');
          const newShiftId = 'shift_emerg_' + Date.now();
          const targetGrpId = details.target_group_id || 'g_u3_maeuse';
          db.prepare(`
            INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status)
            VALUES (?, ?, ?, ?, '08:00', '15:30', 30, 'CONFIRMED')
          `).run(newShiftId, approval.requester_id, targetGrpId, today);
        }

        if (approval.type === 'VACATION_REQUEST') {
          const absenceId = 'abs_' + Date.now();
          db.prepare(`
            INSERT INTO absences (id, staff_id, type, start_date, end_date, status, reason, created_at)
            VALUES (?, ?, 'VACATION', ?, ?, 'APPROVED', ?, ?)
          `).run(absenceId, approval.requester_id, details.start_date, details.end_date, details.title, now);
        }
      }
    });

    updateTransaction();
    res.json({ success: true, status: action });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/approvals/request-swap', (req, res) => {
  try {
    const { requester_id, target_id, shift_id, note } = req.body;
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift_id) as any;
    if (!shift) return res.status(404).json({ error: 'Schicht nicht gefunden' });

    const targetStaff = db.prepare('SELECT * FROM staff WHERE id = ?').get(target_id) as any;
    const requesterStaff = db.prepare('SELECT * FROM staff WHERE id = ?').get(requester_id) as any;

    const id = 'appr_swap_' + Date.now();
    const details = {
      title: `Schichttausch: ${requesterStaff.name} ➔ ${targetStaff.name}`,
      description: `${requesterStaff.name} bittet ${targetStaff.name} um Übernahme der Schicht am ${shift.date} (${shift.start_time} - ${shift.end_time} Uhr).`,
      date: shift.date,
      shift: `${shift.start_time} - ${shift.end_time} Uhr`,
      note: note || '',
      ratio_impact: 'Wird nach Freigabe durch die Einrichtungsleitung wirksam.'
    };

    db.prepare(`
      INSERT INTO approvals (id, type, requester_id, target_id, shift_id, details, status, created_at)
      VALUES (?, 'SHIFT_SWAP', ?, ?, ?, ?, 'PENDING', ?)
    `).run(id, requester_id, target_id, shift_id, JSON.stringify(details), new Date().toISOString());

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/approvals/request-vacation', (req, res) => {
  try {
    const { requester_id, start_date, end_date, reason } = req.body;
    const requesterStaff = db.prepare('SELECT * FROM staff WHERE id = ?').get(requester_id) as any;

    const id = 'appr_vac_' + Date.now();
    const details = {
      title: `Urlaubsantrag: ${requesterStaff.name}`,
      description: `${requesterStaff.name} beantragt Urlaub vom ${start_date} bis ${end_date}.`,
      start_date,
      end_date,
      reason: reason || 'Erholungsurlaub',
      remaining_vacation: '24 Tage'
    };

    db.prepare(`
      INSERT INTO approvals (id, type, requester_id, details, status, created_at)
      VALUES (?, 'VACATION_REQUEST', ?, ?, 'PENDING', ?)
    `).run(id, requester_id, JSON.stringify(details), new Date().toISOString());

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Emergency Trigger with Skill-Aware Replacement Proposal
app.post('/api/emergency/trigger-sick', (req, res) => {
  try {
    const { staff_id, days, reason, substitute_id } = req.body;
    const today = format(new Date(), 'yyyy-MM-dd');
    const staffMember = db.prepare('SELECT * FROM staff WHERE id = ?').get(staff_id) as any;
    if (!staffMember) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    const absenceId = 'abs_' + Date.now();
    db.prepare(`
      INSERT INTO absences (id, staff_id, type, start_date, end_date, status, reason, created_at)
      VALUES (?, ?, 'SICK', ?, ?, 'APPROVED', ?, ?)
    `).run(absenceId, staff_id, today, today, reason || 'Akute Krankmeldung', new Date().toISOString());

    // Find if the person had a confirmed shift today to find group
    const todayShift = db.prepare("SELECT * FROM shifts WHERE staff_id = ? AND date = ? AND status = 'CONFIRMED'").get(staff_id, today) as any;
    db.prepare(`UPDATE shifts SET status = 'CANCELLED' WHERE staff_id = ? AND date = ?`).run(staff_id, today);

    // Target group is either from today's shift or their default group
    const targetGroupId = todayShift?.group_id || staffMember.target_group_id || 'g_u3_maeuse';
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(targetGroupId) as any;
    const requiredSkills: string[] = JSON.parse(group?.required_skills || '[]');

    const allStaff = db.prepare('SELECT * FROM staff WHERE is_active = 1 AND id != ?').all(staff_id) as any[];
    const busyStaffIds = new Set(
      db.prepare("SELECT staff_id FROM shifts WHERE date = ? AND status = 'CONFIRMED'")
        .all(today)
        .map((s: any) => s.staff_id)
    );

    let chosenStaff: any = null;
    let chosenSkills: string[] = [];

    if (substitute_id) {
      chosenStaff = db.prepare('SELECT * FROM staff WHERE id = ?').get(substitute_id);
      if (chosenStaff) {
        chosenSkills = JSON.parse(chosenStaff.skills || '[]');
      }
    }

    if (!chosenStaff) {
      // Rank candidates by skill-match and role
      const candidates = allStaff.map((s: any) => {
        const skills = JSON.parse(s.skills || '[]');
        const hasAllSkills = requiredSkills.every(req => skills.includes(req));
        const isFree = !busyStaffIds.has(s.id);
        let score = 0;
        if (isFree) score += 50;
        if (hasAllSkills) score += 40;
        if (s.can_spring === 1) score += 20;
        if (s.role === 'SPRINGER') score += 20;
        if (s.role === 'LEITUNG') score += 15;
        return { staff: s, score, hasAllSkills, skills };
      }).sort((a, b) => b.score - a.score);

      if (candidates.length > 0) {
        chosenStaff = candidates[0].staff;
        chosenSkills = candidates[0].skills;
      }
    }

    if (chosenStaff) {
      const apprId = 'appr_emerg_' + Date.now();
      const roleNote = chosenStaff.role === 'LEITUNG' 
        ? 'Primär Leitung (Büro) – springt bei Notstand dank voller Fachkraft/U3-Qualifikation ein' 
        : chosenStaff.role === 'SPRINGER' 
        ? 'Dedizierte Springerin' 
        : `${chosenStaff.role} (${chosenStaff.qualification})`;

      const details = {
        title: `Skill-Ersatz: ${chosenStaff.name} (${chosenStaff.role}) für ${staffMember.name}`,
        description: `Ausfall von ${staffMember.name}. ${chosenStaff.name} [${roleNote}] erfüllt das Profil (${chosenSkills.join(', ')}) und kann als Vertretung einspringen.`,
        target_group: group?.name || 'Krippe',
        target_group_id: targetGroupId,
        time: '08:00 - 15:30 Uhr',
        skills_matched: chosenSkills,
        ratio_impact: 'Stellt den gesetzlichen Betreuungsschlüssel & Fachkraftquote sofort wieder her.'
      };

      db.prepare(`
        INSERT INTO approvals (id, type, requester_id, target_id, absence_id, details, status, created_at)
        VALUES (?, 'EMERGENCY_REPLACEMENT', ?, ?, ?, ?, 'PENDING', ?)
      `).run(apprId, chosenStaff.id, staffMember.id, absenceId, JSON.stringify(details), new Date().toISOString());
    }

    res.json({ success: true, message: `Krankmeldung für ${staffMember.name} erfasst. Skill-basierter Vertretungsvorschlag (${chosenStaff ? chosenStaff.name : 'Kein Springer verfügbar'}) liegt vor!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. STEMPELUHR & PINNWAND & EXPORT
// ---------------------------------------------------------------------------
app.get('/api/timelogs', (req, res) => {
  try {
    const date = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');
    const logs = db.prepare(`
      SELECT t.*, s.name as staff_name, s.role, s.color
      FROM timelogs t
      JOIN staff s ON t.staff_id = s.id
      WHERE t.date = ?
      ORDER BY t.clock_in DESC
    `).all(date);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timelogs/stamp', (req, res) => {
  try {
    const { staff_id, pin, action } = req.body;
    const today = format(new Date(), 'yyyy-MM-dd');
    const nowTime = format(new Date(), 'HH:mm');

    const staffMember = db.prepare('SELECT * FROM staff WHERE id = ?').get(staff_id) as any;
    if (!staffMember) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    if (pin && staffMember.pin !== pin) {
      return res.status(401).json({ error: 'Ungültige PIN' });
    }

    const currentLog = db.prepare(`
      SELECT * FROM timelogs WHERE staff_id = ? AND date = ? ORDER BY id DESC LIMIT 1
    `).get(staff_id, today) as any;

    if (action === 'CLOCK_IN') {
      const id = 'log_' + Date.now();
      db.prepare(`
        INSERT INTO timelogs (id, staff_id, date, clock_in, break_minutes, status)
        VALUES (?, ?, ?, ?, 0, 'CLOCKED_IN')
      `).run(id, staff_id, today, nowTime);
      return res.json({ success: true, action, time: nowTime, message: `Guten Morgen, ${staffMember.name}! Eingestempelt um ${nowTime} Uhr.` });
    }

    if (action === 'BREAK') {
      if (!currentLog) return res.status(400).json({ error: 'Noch nicht eingestempelt' });
      const newStatus = currentLog.status === 'IN_BREAK' ? 'CLOCKED_IN' : 'IN_BREAK';
      const addedBreak = currentLog.status === 'IN_BREAK' ? 30 : 0;
      db.prepare(`
        UPDATE timelogs SET status = ?, break_minutes = break_minutes + ? WHERE id = ?
      `).run(newStatus, addedBreak, currentLog.id);
      return res.json({ 
        success: true, 
        action, 
        status: newStatus,
        message: newStatus === 'IN_BREAK' ? 'Pause gestartet. Gute Erholung!' : 'Pause beendet. Willkommen zurück!' 
      });
    }

    if (action === 'CLOCK_OUT') {
      if (!currentLog) return res.status(400).json({ error: 'Noch nicht eingestempelt' });
      db.prepare(`
        UPDATE timelogs SET clock_out = ?, status = 'COMPLETED' WHERE id = ?
      `).run(nowTime, currentLog.id);
      return res.json({ success: true, action, time: nowTime, message: `Schönen Feierabend, ${staffMember.name}! Ausgestempelt um ${nowTime} Uhr.` });
    }

    res.status(400).json({ error: 'Unbekannte Aktion' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/announcements', (req, res) => {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY priority = "HIGH" DESC, date DESC').all();
    res.json(announcements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/datev', (req, res) => {
  try {
    const month = (req.query.month as string) || format(new Date(), 'yyyy-MM');
    const staffList = db.prepare('SELECT * FROM staff WHERE is_active = 1 ORDER BY name ASC').all() as any[];

    const exportRows = staffList.map(s => {
      const logs = db.prepare(`
        SELECT * FROM timelogs 
        WHERE staff_id = ? AND date LIKE ? AND clock_out IS NOT NULL
      `).all(s.id, `${month}%`) as any[];

      let totalMinutes = 0;
      logs.forEach(l => {
        const [inH, inM] = l.clock_in.split(':').map(Number);
        const [outH, outM] = l.clock_out.split(':').map(Number);
        const worked = (outH * 60 + outM) - (inH * 60 + inM) - (l.break_minutes || 0);
        if (worked > 0) totalMinutes += worked;
      });

      const adjustments = db.prepare(`
        SELECT COALESCE(SUM(hours), 0) as total_adj FROM overtime_adjustments
        WHERE staff_id = ? AND date LIKE ?
      `).get(s.id, `${month}%`) as { total_adj: number };

      const actualHours = parseFloat((totalMinutes / 60).toFixed(2));
      const targetMonthlyHours = parseFloat((s.weekly_hours * 4.33).toFixed(2));
      const overtime = parseFloat((actualHours + adjustments.total_adj - targetMonthlyHours).toFixed(2));

      return {
        personal_nr: s.id.replace('s_', 'P-'),
        name: s.name,
        role: s.role,
        contract_hours: s.weekly_hours,
        target_month_hours: targetMonthlyHours,
        actual_hours: actualHours,
        adjustments_hours: adjustments.total_adj,
        overtime_hours: overtime,
        status: overtime >= 0 ? 'Normal / Überstunden' : 'Minderstunden'
      };
    });

    res.json({ month, exportRows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend in production
const clientDist = path.resolve(__dirname, '../../dist/client');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send('KitaPlaner API is running on port ' + PORT);
    }
  });
});

// Global Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[ERROR] Unhandled error on ${req.method} ${req.path}:`, err);
  res.status(500).json({
    error: 'Interner Serverfehler',
    message: err?.message || 'Unerwarteter Fehler'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 KitaPlaner Backend running at http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck: http://localhost:${PORT}/api/health`);
});

// Graceful Shutdown on SIGTERM and SIGINT
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Signal ${signal} empfangen. Beende KitaPlaner Server ordnungsgemäß...`);
  server.close(() => {
    console.log('HTTP Server geschlossen.');
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log('SQLite Datenbank sauber geschlossen (WAL getruncated).');
    } catch (e) {
      console.error('Fehler beim Schließen der Datenbank:', e);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Erzwungener Abbruch nach 10 Sekunden Timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
