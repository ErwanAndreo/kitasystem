import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDb } from './db.js';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
initDb();

// ---------------------------------------------------------------------------
// 1. STAFF ENDPOINTS
// ---------------------------------------------------------------------------
app.get('/api/staff', (req, res) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const staffList = db.prepare(`
      SELECT s.*, 
        (SELECT status FROM timelogs WHERE staff_id = s.id AND date = ? ORDER BY id DESC LIMIT 1) as clock_status,
        (SELECT type FROM absences WHERE staff_id = s.id AND ? BETWEEN start_date AND end_date AND status = 'APPROVED' LIMIT 1) as current_absence
      FROM staff s
      ORDER BY s.role = 'LEITUNG' DESC, s.name ASC
    `).all(today, today);
    res.json(staffList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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

    const actualHours = parseFloat((totalMinutes / 60).toFixed(2));
    const targetMonthlyHours = parseFloat((staff.weekly_hours * 4.33).toFixed(2));
    const overtimeHours = parseFloat((actualHours - targetMonthlyHours).toFixed(2));

    const vacationAbsences = db.prepare(`
      SELECT COUNT(*) as c FROM absences 
      WHERE staff_id = ? AND type = 'VACATION' AND status = 'APPROVED'
    `).get(staffId) as { c: number };

    const remainingVacationDays = Math.max(0, 30 - (vacationAbsences.c || 0));

    res.json({
      staff_id: staffId,
      name: staff.name,
      month: currentMonth,
      weekly_hours: staff.weekly_hours,
      target_month_hours: targetMonthlyHours,
      actual_hours: actualHours,
      overtime_hours: overtimeHours,
      remaining_vacation_days: remainingVacationDays,
      total_vacation_days: 30
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. GROUPS, ALLERGIES & BETREUUNGSSCHLÜSSEL
// ---------------------------------------------------------------------------
app.get('/api/groups', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups ORDER BY name ASC').all();
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/groups/:id/details', (req, res) => {
  try {
    const groupId = req.params.id;
    const today = format(new Date(), 'yyyy-MM-dd');
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId) as any;
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });

    const notes = db.prepare('SELECT * FROM group_notes WHERE group_id = ?').all(groupId);
    const todayStaff = db.prepare(`
      SELECT s.*, st.name as staff_name, st.role, st.is_fachkraft, st.avatar, st.color
      FROM shifts s
      JOIN staff st ON s.staff_id = st.id
      WHERE s.group_id = ? AND s.date = ? AND s.status = 'CONFIRMED'
    `).all(groupId, today);

    res.json({
      group,
      notes,
      today_staff: todayStaff
    });
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

app.get('/api/ratio-status', (req, res) => {
  try {
    const date = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');
    const groups = db.prepare('SELECT * FROM groups').all() as any[];

    const ratioStatus = groups.map(group => {
      const activeShifts = db.prepare(`
        SELECT s.*, st.name as staff_name, st.role, st.is_fachkraft, st.qualification
        FROM shifts s
        JOIN staff st ON s.staff_id = st.id
        WHERE s.group_id = ? AND s.date = ? AND s.status = 'CONFIRMED'
      `).all(group.id, date) as any[];

      const totalStaff = activeShifts.length;
      const fachkraefte = activeShifts.filter(s => s.is_fachkraft === 1).length;
      const ergaenzungskraefte = totalStaff - fachkraefte;

      const actualRatio = totalStaff > 0 ? parseFloat((group.child_count / totalStaff).toFixed(2)) : 99;
      const fachkraftPercent = totalStaff > 0 ? fachkraefte / totalStaff : 0;

      let status = 'OPTIMAL';
      let message = 'Betreuungsschlüssel erfüllt.';

      if (totalStaff === 0) {
        status = 'CRITICAL';
        message = 'AKUTER NOTSTAND: Keine Aufsichtsperson in der Gruppe!';
      } else if (actualRatio > group.target_ratio) {
        status = 'CRITICAL';
        message = `Unterbesetzung: 1:${actualRatio} (Gesetzliches Limit: 1:${group.target_ratio})`;
      } else if (fachkraftPercent < group.min_fachkraft_percent) {
        status = 'WARNING';
        message = `Fachkraftquote unterschritten: ${(fachkraftPercent * 100).toFixed(0)}% (Min: ${(group.min_fachkraft_percent * 100).toFixed(0)}%)`;
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
        total_staff: totalStaff,
        fachkraefte,
        ergaenzungskraefte,
        status,
        message,
        staff: activeShifts
      };
    });

    res.json({ date, groups: ratioStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. SHIFTS & DIENSTPLAN
// ---------------------------------------------------------------------------
app.get('/api/shifts', (req, res) => {
  try {
    const { start, end, group_id, staff_id } = req.query;
    let query = `
      SELECT s.*, st.name as staff_name, st.role as staff_role, st.is_fachkraft, st.color as staff_color,
             g.name as group_name, g.color as group_color
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
    const shifts = db.prepare(query).all(...params);
    res.json(shifts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shifts', (req, res) => {
  try {
    const { staff_id, group_id, date, start_time, end_time, break_minutes } = req.body;
    const id = 'shift_' + Date.now();

    db.prepare(`
      INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')
    `).run(id, staff_id, group_id, date, start_time, end_time, break_minutes || 30);

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shifts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. APPROVAL CENTER
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
    if (!approval) {
      return res.status(404).json({ error: 'Freigabe-Eintrag nicht gefunden' });
    }

    const now = new Date().toISOString();

    const updateTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE approvals
        SET status = ?, decision_note = ?, decision_by = ?, decided_at = ?
        WHERE id = ?
      `).run(action, decision_note || '', decision_by || 'Sabine Weber (Leitung)', now, approvalId);

      if (action === 'APPROVED') {
        const details = JSON.parse(approval.details || '{}');

        if (approval.type === 'SHIFT_SWAP' && approval.shift_id && approval.target_id) {
          db.prepare('UPDATE shifts SET staff_id = ? WHERE id = ?').run(approval.target_id, approval.shift_id);
        }

        if (approval.type === 'EMERGENCY_REPLACEMENT') {
          const today = format(new Date(), 'yyyy-MM-dd');
          const newShiftId = 'shift_emerg_' + Date.now();
          db.prepare(`
            INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status)
            VALUES (?, ?, 'g_u3_maeuse', ?, '08:30', '15:30', 30, 'CONFIRMED')
          `).run(newShiftId, approval.requester_id, today);
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

// ---------------------------------------------------------------------------
// 5. ZEITERFASSUNG (MOBILE & KIOSK)
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

// ---------------------------------------------------------------------------
// 6. NOTFALL & KRANKMELDUNG
// ---------------------------------------------------------------------------
app.post('/api/emergency/trigger-sick', (req, res) => {
  try {
    const { staff_id, days, reason } = req.body;
    const today = format(new Date(), 'yyyy-MM-dd');
    const staffMember = db.prepare('SELECT * FROM staff WHERE id = ?').get(staff_id) as any;

    const absenceId = 'abs_' + Date.now();
    db.prepare(`
      INSERT INTO absences (id, staff_id, type, start_date, end_date, status, reason, created_at)
      VALUES (?, ?, 'SICK', ?, ?, 'APPROVED', ?, ?)
    `).run(absenceId, staff_id, today, today, reason || 'Akute Krankmeldung', new Date().toISOString());

    db.prepare(`UPDATE shifts SET status = 'CANCELLED' WHERE staff_id = ? AND date = ?`).run(staff_id, today);

    const springers = db.prepare(`
      SELECT * FROM staff 
      WHERE (role = 'SPRINGER' OR target_group_id IS NULL)
        AND id != ?
        AND id NOT IN (SELECT staff_id FROM shifts WHERE date = ? AND status = 'CONFIRMED')
    `).all(staff_id, today) as any[];

    if (springers.length > 0) {
      const bestSpringer = springers[0];
      const apprId = 'appr_emerg_' + Date.now();
      const details = {
        title: `Notfall-Ersatz: ${bestSpringer.name} für ${staffMember.name}`,
        description: `Akuter Krankheitsausfall von ${staffMember.name}. Springerin ${bestSpringer.name} ist verfügbar und kann sofort übernehmen.`,
        target_group: staffMember.target_group_id || 'g_u3_maeuse',
        time: '08:00 - 15:30 Uhr',
        ratio_impact: 'Stellt den gesetzlichen Betreuungsschlüssel sofort wieder her.'
      };
      db.prepare(`
        INSERT INTO approvals (id, type, requester_id, target_id, absence_id, details, status, created_at)
        VALUES (?, 'EMERGENCY_REPLACEMENT', ?, ?, ?, ?, 'PENDING', ?)
      `).run(apprId, bestSpringer.id, staffMember.id, absenceId, JSON.stringify(details), new Date().toISOString());
    }

    res.json({ success: true, message: `Krankmeldung für ${staffMember.name} erfasst. Notfall-Vorschlag an Freigabe-Center übermittelt.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. DATEV EXPORT
// ---------------------------------------------------------------------------
app.get('/api/export/datev', (req, res) => {
  try {
    const month = (req.query.month as string) || format(new Date(), 'yyyy-MM');
    const staffList = db.prepare('SELECT * FROM staff ORDER BY name ASC').all() as any[];

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

      const actualHours = parseFloat((totalMinutes / 60).toFixed(2));
      const targetMonthlyHours = parseFloat((s.weekly_hours * 4.33).toFixed(2));
      const overtime = parseFloat((actualHours - targetMonthlyHours).toFixed(2));

      return {
        personal_nr: s.id.replace('s_', 'P-'),
        name: s.name,
        role: s.role,
        contract_hours: s.weekly_hours,
        target_month_hours: targetMonthlyHours,
        actual_hours: actualHours,
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

app.listen(PORT, () => {
  console.log(`🚀 KitaPlaner Backend running at http://localhost:${PORT}`);
});
