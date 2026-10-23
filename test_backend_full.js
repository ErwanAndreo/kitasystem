// Comprehensive E2E backend test suite for KitaPlaner Pro
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function testAll() {
  console.log('🧪 Starting KitaPlaner Pro Backend E2E Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  // 1. Healthcheck
  await check('GET /api/health returns UP with DB connected', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'UP');
    assert.strictEqual(json.database.connected, true);
    assert(json.database.active_staff >= 10);
  });

  // 2. Groups
  await check('GET /api/groups returns 3 groups with target ratios', async () => {
    const res = await fetch(`${BASE_URL}/api/groups`);
    assert.strictEqual(res.status, 200);
    const groups = await res.json();
    assert(groups.length >= 3);
    const u3 = groups.find(g => g.type === 'U3');
    assert(u3, 'U3 group missing');
    assert(u3.target_ratio > 3.0 && u3.target_ratio <= 3.5);
    assert.strictEqual(u3.min_fachkraft_percent, 0.67);
  });

  // 3. Staff & Contracts
  let testStaffId = null;
  await check('GET /api/staff returns staff with skills and certifications', async () => {
    const res = await fetch(`${BASE_URL}/api/staff`);
    assert.strictEqual(res.status, 200);
    const staff = await res.json();
    assert(staff.length >= 10);
    const sabine = staff.find(s => s.role === 'LEITUNG');
    assert(sabine, 'Leitung Sabine missing');
    assert(Array.isArray(sabine.skills), 'skills should be array');
    assert(Array.isArray(sabine.certifications), 'certifications should be array');
  });

  await check('POST /api/staff creates a new staff account', async () => {
    const res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Erzieher',
        email: 'test@kita.de',
        role: 'FACHKRAFT',
        qualification: 'Staatl. anerkannte Erzieherin',
        is_fachkraft: 1,
        weekly_hours: 35.0,
        work_days: 5,
        annual_vacation_days: 30,
        pin: '9999'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert(json.id);
    testStaffId = json.id;
  });

  await check('PUT /api/staff updates hours and logs to staff_audit_log', async () => {
    assert(testStaffId);
    const res = await fetch(`${BASE_URL}/api/staff/${testStaffId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Erzieher Angepasst',
        email: 'test@kita.de',
        role: 'FACHKRAFT',
        qualification: 'Staatl. anerkannte Erzieherin',
        is_fachkraft: 1,
        weekly_hours: 39.0, // changed from 35.0
        work_days: 5,
        annual_vacation_days: 30,
        pin: '9999'
      })
    });
    assert.strictEqual(res.status, 200);

    // Verify audit log
    const auditRes = await fetch(`${BASE_URL}/api/staff/${testStaffId}/audit-log`);
    const logs = await auditRes.json();
    assert(logs.some(l => l.category === 'HOURS_CHANGE'), 'Audit log should record hours change');
  });

  // 4. Certifications & Expiry Tracking
  let testCertId = null;
  await check('GET /api/certifications/alerts returns expired and expiring certs', async () => {
    const res = await fetch(`${BASE_URL}/api/certifications/alerts`);
    assert.strictEqual(res.status, 200);
    const alerts = await res.json();
    assert(alerts.length >= 1);
    assert(alerts.some(c => c.is_expired || c.expires_soon));
  });

  await check('POST /api/certifications creates a new certification', async () => {
    assert(testStaffId);
    const res = await fetch(`${BASE_URL}/api/certifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: testStaffId,
        type: 'ERSTE_HILFE_KIND',
        title: 'Erste-Hilfe am Kind (DGUV)',
        issue_date: '2026-10-01',
        expires_at: '2028-10-01',
        institution: 'DRK',
        notes: 'Testkurs'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert(json.id);
    testCertId = json.id;
  });

  await check('DELETE /api/certifications deletes certification', async () => {
    assert(testCertId);
    const res = await fetch(`${BASE_URL}/api/certifications/${testCertId}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
  });

  // Clean up test staff
  await fetch(`${BASE_URL}/api/staff/${testStaffId}`, { method: 'DELETE' });

  // 5. Director Notebook (OneNote style)
  let testNoteId = null;
  await check('GET /api/director-notes returns categorized notes with checklists', async () => {
    const res = await fetch(`${BASE_URL}/api/director-notes`);
    assert.strictEqual(res.status, 200);
    const notes = await res.json();
    assert(notes.length >= 1);
    assert(Array.isArray(notes[0].checklist));
  });

  await check('POST /api/director-notes creates a note with pastel color & checklist', async () => {
    const res = await fetch(`${BASE_URL}/api/director-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'TEAM',
        title: 'E2E Test Note',
        content: 'Test content for director',
        color: '#bfdbfe',
        is_pinned: 1,
        checklist: [{ id: 'item1', text: 'Aufgabe A', done: false }]
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    testNoteId = json.id;
  });

  await check('PUT /api/director-notes updates checklist and title', async () => {
    assert(testNoteId);
    const res = await fetch(`${BASE_URL}/api/director-notes/${testNoteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'TEAM',
        title: 'E2E Test Note Updated',
        content: 'Updated content',
        color: '#bfdbfe',
        is_pinned: 1,
        checklist: [{ id: 'item1', text: 'Aufgabe A', done: true }]
      })
    });
    assert.strictEqual(res.status, 200);
  });

  await check('DELETE /api/director-notes removes the note', async () => {
    assert(testNoteId);
    const res = await fetch(`${BASE_URL}/api/director-notes/${testNoteId}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
  });

  // 6. Shift Templates
  await check('GET /api/shift-templates returns FD, MD, SD, VZ', async () => {
    const res = await fetch(`${BASE_URL}/api/shift-templates`);
    assert.strictEqual(res.status, 200);
    const tpls = await res.json();
    assert(tpls.length >= 4);
    assert(tpls.some(t => t.name.includes('Frühdienst')));
  });

  // 7. Staff Wishes
  let testWishId = null;
  await check('POST & GET /api/staff-wishes', async () => {
    const postRes = await fetch(`${BASE_URL}/api/staff-wishes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 's_sabine',
        date: '2026-10-24',
        type: 'WUNSCH_FRUEH',
        note: 'E2E Wish Test'
      })
    });
    assert.strictEqual(postRes.status, 201);
    const json = await postRes.json();
    testWishId = json.id;

    const getRes = await fetch(`${BASE_URL}/api/staff-wishes?staff_id=s_sabine`);
    const wishes = await getRes.json();
    assert(wishes.some(w => w.id === testWishId));
  });

  await check('DELETE /api/staff-wishes deletes wish', async () => {
    assert(testWishId);
    const res = await fetch(`${BASE_URL}/api/staff-wishes/${testWishId}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
  });

  // 8. Shift Planning & ArbZG Check
  let testShiftId = null;
  await check('POST /api/shifts creates a shift with ArbZG warning if rest < 11h', async () => {
    const res = await fetch(`${BASE_URL}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 's_julia',
        group_id: 'g_u3_maeuse',
        date: '2026-10-30',
        start_time: '08:00',
        end_time: '16:30',
        break_minutes: 30,
        role_override: 'Springer U3'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    testShiftId = json.id;
  });

  await check('DELETE /api/shifts deletes shift and logs to audit log', async () => {
    assert(testShiftId);
    const res = await fetch(`${BASE_URL}/api/shifts/${testShiftId}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
  });

  // 9. Live Ratio Status & Skill Radar
  await check('GET /api/ratio-status calculates ratios & skills', async () => {
    const res = await fetch(`${BASE_URL}/api/ratio-status`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(Array.isArray(json.groups));
    assert(typeof json.has_first_aid === 'boolean');
    const u3 = json.groups.find(g => g.group_type === 'U3');
    assert(u3);
    assert(u3.actual_ratio >= 0);
  });

  // 10. Intelligent Emergency Substitute Suggestions
  await check('GET /api/emergency/suggestions ranks candidates by skills', async () => {
    const res = await fetch(`${BASE_URL}/api/emergency/suggestions?group_id=g_u3_maeuse`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(Array.isArray(json.suggestions));
    // Julia Fischer (Springer) and Sabine Weber (Leitung) should be top suggestions
    const julia = json.suggestions.find(s => s.staff_id === 's_julia');
    assert(julia, 'Julia Fischer should be proposed');
    assert.strictEqual(julia.has_all_required, true);
  });

  // 11. Approvals & Director Decision Authority
  await check('GET /api/approvals returns list', async () => {
    const res = await fetch(`${BASE_URL}/api/approvals`);
    assert.strictEqual(res.status, 200);
    const approvals = await res.json();
    assert(Array.isArray(approvals));
  });

  // 12. Time Stamping (Kommen, Pause, Gehen)
  await check('POST /api/timelogs/stamp performs clock in, break, clock out', async () => {
    // Clock in
    const inRes = await fetch(`${BASE_URL}/api/timelogs/stamp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: 's_sabine', action: 'CLOCK_IN', pin: '1111' })
    });
    assert.strictEqual(inRes.status, 200);

    // Break
    const breakRes = await fetch(`${BASE_URL}/api/timelogs/stamp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: 's_sabine', action: 'BREAK', pin: '1111' })
    });
    assert.strictEqual(breakRes.status, 200);

    // End break
    const endBreakRes = await fetch(`${BASE_URL}/api/timelogs/stamp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: 's_sabine', action: 'BREAK', pin: '1111' })
    });
    assert.strictEqual(endBreakRes.status, 200);

    // Clock out
    const outRes = await fetch(`${BASE_URL}/api/timelogs/stamp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: 's_sabine', action: 'CLOCK_OUT', pin: '1111' })
    });
    assert.strictEqual(outRes.status, 200);
  });

  // 13. Overtime Tracking & Adjustments
  await check('GET /api/time-overview returns all staff hours and balances', async () => {
    const res = await fetch(`${BASE_URL}/api/time-overview`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(json.overview.length >= 10);
    assert('target_month_hours' in json.overview[0]);
    assert('overtime_hours' in json.overview[0]);
  });

  await check('POST /api/staff/:id/overtime-adjustment books manual adjustment', async () => {
    const res = await fetch(`${BASE_URL}/api/staff/s_sabine/overtime-adjustment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hours: 2.5,
        reason: 'E2E Test Elternabend',
        date: '2026-10-21'
      })
    });
    assert.strictEqual(res.status, 201);
  });

  // 14. DATEV Export
  await check('GET /api/export/datev exports payroll data', async () => {
    const res = await fetch(`${BASE_URL}/api/export/datev`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(Array.isArray(json.exportRows));
    assert(json.exportRows[0].personal_nr);
  });

  // 15. Admin Live Hot-Backup
  await check('POST /api/admin/backup creates SQLite backup without locking', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/backup`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(json.success);
    assert(json.backupPath);
  });

  // 16. Web Frontend Delivery & SPA fallback
  await check('GET / delivers React SPA HTML bundle', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('id="root"'));
    assert(html.includes('Kitasystem') || html.includes('KitaPlaner'));
  });

  // 17. Kita Closures (Schließtage & Konzeptionstage)
  let testClosureId = null;
  await check('GET /api/closures returns upcoming closures & Konzeptionstage', async () => {
    const res = await fetch(`${BASE_URL}/api/closures`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(Array.isArray(json) && json.length >= 1);
  });

  await check('POST /api/closures creates a new closure day', async () => {
    const res = await fetch(`${BASE_URL}/api/closures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Team-Fortbildungstag DGUV',
        date: '2026-11-20',
        type: 'KONZEPTIONSTAG',
        notes: 'In-House Erste Hilfe Auffrischung'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    testClosureId = json.id;
    assert(testClosureId);
  });

  await check('DELETE /api/closures deletes closure', async () => {
    if (testClosureId) {
      const res = await fetch(`${BASE_URL}/api/closures/${testClosureId}`, { method: 'DELETE' });
      assert.strictEqual(res.status, 200);
    }
  });

  // 18. Copy Week (Wochendienstplan duplizieren)
  await check('POST /api/shifts/copy-week duplicates previous week roster with vacation check', async () => {
    const res = await fetch(`${BASE_URL}/api/shifts/copy-week`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_week_start: '2026-10-26'
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(typeof json.copied_count === 'number');
    assert(typeof json.skipped_vacation_count === 'number');
  });

  // 19. Policy Templates & Modular Groups
  await check('GET /api/policies returns policy templates', async () => {
    const res = await fetch(`${BASE_URL}/api/policies`);
    assert.strictEqual(res.status, 200);
    const policies = await res.json();
    assert(Array.isArray(policies) && policies.length >= 4);
    assert(policies.some(p => p.id === 'pol_u3'));
    assert(policies.some(p => p.id === 'pol_ue3'));
  });

  let createdGroupId = null;
  await check('POST /api/groups creates a new children group with policy', async () => {
    const res = await fetch(`${BASE_URL}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Krippengruppe 1',
        type: 'U3',
        child_count: 10,
        policy_id: 'pol_u3',
        target_ratio: 3.33,
        min_fachkraft_percent: 0.67,
        color: '#f43f5e',
        required_skills: ['FACHKRAFT', 'U3_QUALIFIKATION']
      })
    });
    assert.strictEqual(res.status, 201);
    const group = await res.json();
    createdGroupId = group.id;
    assert.strictEqual(group.name, 'Krippengruppe 1');
    assert.strictEqual(group.child_count, 10);
    assert.strictEqual(group.policy_id, 'pol_u3');
  });

  await check('PUT /api/groups/:id updates group child count and ratio', async () => {
    assert(createdGroupId);
    const res = await fetch(`${BASE_URL}/api/groups/${createdGroupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Krippengruppe 1 (Erweitert)',
        child_count: 12,
        policy_id: 'pol_u3',
        target_ratio: 3.5,
        min_fachkraft_percent: 0.67
      })
    });
    assert.strictEqual(res.status, 200);
    const group = await res.json();
    assert.strictEqual(group.name, 'Krippengruppe 1 (Erweitert)');
    assert.strictEqual(group.child_count, 12);
  });

  await check('GET /api/groups/:id/details returns group details', async () => {
    assert(createdGroupId);
    const res = await fetch(`${BASE_URL}/api/groups/${createdGroupId}/details`);
    assert.strictEqual(res.status, 200);
    const details = await res.json();
    assert(details.group);
    assert.strictEqual(details.group.id, createdGroupId);
    assert(Array.isArray(details.notes));
  });

  await check('DELETE /api/groups/:id removes group', async () => {
    assert(createdGroupId);
    const res = await fetch(`${BASE_URL}/api/groups/${createdGroupId}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
  });

  // 20. Staff standard work hours and availability window
  let testStaffAvailId = null;
  await check('POST /api/staff saves standard_work_hours and availability_window', async () => {
    const res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Julia Prüfer',
        email: 'julia.pruefer@kita-sonnenschein.de',
        phone: '0151-99887766',
        role: 'ERZIEHER',
        qualification: 'Staatlich anerkannte Erzieherin',
        is_fachkraft: 1,
        weekly_hours: 30.0,
        standard_work_hours: '08:00 - 14:30',
        availability_window: 'Mo-Fr 07:30 - 15:00',
        skills: ['FACHKRAFT', 'ERSTE_HILFE']
      })
    });
    assert.strictEqual(res.status, 201);
    const staff = await res.json();
    testStaffAvailId = staff.id;
    assert.strictEqual(staff.standard_work_hours, '08:00 - 14:30');
    assert.strictEqual(staff.availability_window, 'Mo-Fr 07:30 - 15:00');
  });

  await check('PUT /api/staff/:id updates availability_window', async () => {
    assert(testStaffAvailId);
    const res = await fetch(`${BASE_URL}/api/staff/${testStaffAvailId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Julia Prüfer',
        weekly_hours: 32.0,
        standard_work_hours: '08:30 - 15:00',
        availability_window: 'Mo, Di, Do, Fr voll; Mi ab 12h'
      })
    });
    assert.strictEqual(res.status, 200);
    const staff = await res.json();
    assert.strictEqual(staff.standard_work_hours, '08:30 - 15:00');
    assert.strictEqual(staff.availability_window, 'Mo, Di, Do, Fr voll; Mi ab 12h');
  });

  // Cleanup staff
  await check('DELETE /api/staff/:id cleans up test staff', async () => {
    if (testStaffAvailId) {
      const res = await fetch(`${BASE_URL}/api/staff/${testStaffAvailId}`, { method: 'DELETE' });
      assert.strictEqual(res.status, 200);
    }
  });

  // 21. System Settings & Auto-Pilot Mode
  await check('GET & PUT /api/settings manages Auto-Pilot and Notification Delay', async () => {
    const getRes = await fetch(`${BASE_URL}/api/settings`);
    assert.strictEqual(getRes.status, 200);
    const settings = await getRes.json();
    assert.strictEqual(typeof settings.autopilot_enabled, 'boolean');
    assert.strictEqual(settings.notification_delay_minutes, 30);

    const putRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autopilot_enabled: true })
    });
    assert.strictEqual(putRes.status, 200);
  });

  // 22. Auto-Pilot Analysis & 1-Click Acceptance
  let acceptedPropId = null;
  await check('POST /api/autopilot/analyze creates proposals for undercovered groups', async () => {
    const res = await fetch(`${BASE_URL}/api/autopilot/analyze`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);

    const propRes = await fetch(`${BASE_URL}/api/autopilot/proposals`);
    assert.strictEqual(propRes.status, 200);
    const proposals = await propRes.json();
    assert(Array.isArray(proposals));
    if (proposals.length > 0) {
      acceptedPropId = proposals[0].id;
    }
  });

  await check('POST /api/autopilot/proposals/:id/accept executes 1-click roster adaptation', async () => {
    if (acceptedPropId) {
      const res = await fetch(`${BASE_URL}/api/autopilot/proposals/${acceptedPropId}/accept`, { method: 'POST' });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert(json.shift_id);
      await fetch(`${BASE_URL}/api/shifts/${json.shift_id}`, { method: 'DELETE' });
    }
  });

  // 23. 30-Minute Debounce & Notification Batching
  await check('Notification queue collects multiple changes and flushes as 1 bundled message', async () => {
    // 1. Create 2 quick shifts for Sarah Klein (s_sarah)
    await fetch(`${BASE_URL}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 's_sarah',
        group_id: 'g_ue3_sonne',
        date: '2026-11-02',
        start_time: '08:00',
        end_time: '16:30',
        break_minutes: 30
      })
    });

    await fetch(`${BASE_URL}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 's_sarah',
        group_id: 'g_ue3_sonne',
        date: '2026-11-03',
        start_time: '08:30',
        end_time: '17:00',
        break_minutes: 30
      })
    });

    // 2. Verify queue has 1 bundled entry for s_sarah with 2 changes
    const queueRes = await fetch(`${BASE_URL}/api/notifications/queue`);
    assert.strictEqual(queueRes.status, 200);
    const queue = await queueRes.json();
    const sarahQueue = queue.find(q => q.staff_id === 's_sarah');
    assert(sarahQueue, 'Queue item for s_sarah missing');
    assert(sarahQueue.details.length >= 2, 'Should contain at least 2 batched changes');
    assert(sarahQueue.minutes_remaining <= 30 && sarahQueue.minutes_remaining >= 0);

    // 3. Flush the queue immediately
    const flushRes = await fetch(`${BASE_URL}/api/notifications/queue/flush`, { method: 'POST' });
    assert.strictEqual(flushRes.status, 200);
    const flushJson = await flushRes.json();
    assert.strictEqual(flushJson.success, true);
    assert(flushJson.flushed_count >= 1);

    // 4. Verify audit log contains the bundled message
    const auditRes = await fetch(`${BASE_URL}/api/staff/s_sarah/audit-log`);
    assert.strictEqual(auditRes.status, 200);
    const auditLogs = await auditRes.json();
    const bundledLog = auditLogs.find(l => l.title.includes('gebündelt') || l.title.includes('Dienstplan'));
    assert(bundledLog, 'Bundled audit log missing');
  });

  // -------------------------------------------------------------------------
  // 23b. URGENT NOTIFICATIONS FOR SHIFTS WITHIN 24 HOURS (<24h SOFORT-REGEL)
  // -------------------------------------------------------------------------
  await check('Shifts within 24 hours trigger IMMEDIATE notification (bypass 30-min buffer)', async () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    
    // 1. Create a shift for today (< 24 hours away)
    const res = await fetch(`${BASE_URL}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 's_lukas',
        group_id: 'g_ue3_sonne',
        date: todayStr,
        start_time: '11:00',
        end_time: '19:30',
        break_minutes: 30
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.notification_immediate, true, 'Must be sent immediately for shifts < 24h');

    // 2. Verify that Lukas received the SOFORT notification in audit log right away
    const auditRes = await fetch(`${BASE_URL}/api/staff/s_lukas/audit-log`);
    assert.strictEqual(auditRes.status, 200);
    const auditLogs = await auditRes.json();
    const urgentLog = auditLogs.find(l => l.title.includes('SOFORT') || l.title.includes('EILIG'));
    assert(urgentLog, 'Lukas must immediately have an urgent audit log entry');
    assert(urgentLog.title.includes('<24h') || urgentLog.title.includes('SOFORT'));

    // 3. Verify it is NOT waiting in the PENDING queue
    const queueRes = await fetch(`${BASE_URL}/api/notifications/queue`);
    const queue = await queueRes.json();
    const lukasPending = queue.find(q => q.staff_id === 's_lukas' && q.details.some(d => d.details?.date === todayStr));
    assert(!lukasPending, 'Urgent < 24h notification should not be pending in the 30-min queue');

    // 4. Clean up created shift: deletion of <24h shift must also notify immediately
    const delRes = await fetch(`${BASE_URL}/api/shifts/${json.id}`, { method: 'DELETE' });
    assert.strictEqual(delRes.status, 200);
    const delJson = await delRes.json();
    assert.strictEqual(delJson.notification_immediate, true, 'Cancellation of <24h shift must also notify immediately');
  });

  // 24. Collaborative & Personal Checklists with Sharing Toggle
  let testSharedChkId = null;
  let testPrivateChkId = null;

  await check('GET /api/checklists returns seeded team checklists', async () => {
    const res = await fetch(`${BASE_URL}/api/checklists`);
    assert.strictEqual(res.status, 200);
    const lists = await res.json();
    assert(Array.isArray(lists));
    assert(lists.length >= 3, 'Should have at least 3 seeded checklists');
    const schliessdienst = lists.find(l => l.title.includes('Schließdienst'));
    assert(schliessdienst, 'Schließdienst checklist missing');
    assert.strictEqual(schliessdienst.is_shared, true);
    assert(Array.isArray(schliessdienst.items));
  });

  await check('POST /api/checklists creates official team checklist by Leitung', async () => {
    const res = await fetch(`${BASE_URL}/api/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Brandschutz-Monatskontrolle',
        category: 'SICHERHEIT',
        created_by_id: 's_sabine',
        created_by_name: 'Sabine Weber (Leitung)',
        is_shared: true,
        color: '#ef4444',
        items: [
          { id: 'item_f1', text: 'Feuerlöscher-Plomben und Prüfsiegel kontrollieren', done: false },
          { id: 'item_f2', text: 'Fluchtwege frei von Garderoben und Kinderwagen halten', done: false }
        ]
      })
    });
    assert.strictEqual(res.status, 201);
    const created = await res.json();
    testSharedChkId = created.id;
    assert.strictEqual(created.title, 'Brandschutz-Monatskontrolle');
    assert.strictEqual(created.is_shared, true);
    assert.strictEqual(created.items.length, 2);
    assert.strictEqual(created.progress_percent, 0);
  });

  await check('POST /api/checklists creates personal private checklist by Mitarbeiter', async () => {
    const res = await fetch(`${BASE_URL}/api/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Sarahs persönliche Portfolio-Notizen',
        category: 'PAEDAGOGIK',
        created_by_id: 's_sarah',
        created_by_name: 'Sarah Klein (Mitarbeiter 2)',
        is_shared: false,
        color: '#ec4899',
        items: [
          { id: 'item_p1', text: 'Beobachtung Mia (U3) dokumentieren', done: false }
        ]
      })
    });
    assert.strictEqual(res.status, 201);
    const created = await res.json();
    testPrivateChkId = created.id;
    assert.strictEqual(created.title, 'Sarahs persönliche Portfolio-Notizen');
    assert.strictEqual(created.is_shared, false);
  });

  await check('GET /api/checklists?staff_id=... filters private lists by creator', async () => {
    // Sarah sees shared lists + her own private list
    const sarahRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_sarah`);
    assert.strictEqual(sarahRes.status, 200);
    const sarahLists = await sarahRes.json();
    const hasSarahList = sarahLists.some(l => l.id === testPrivateChkId);
    assert(hasSarahList, 'Sarah must see her own private list');

    // Lukas should NOT see Sarahs private list
    const lukasRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_lukas`);
    assert.strictEqual(lukasRes.status, 200);
    const lukasLists = await lukasRes.json();
    const lukasHasSarahList = lukasLists.some(l => l.id === testPrivateChkId);
    assert(!lukasHasSarahList, 'Lukas must NOT see Sarahs private list');
  });

  await check('PATCH /api/checklists/:id/toggle-item checks item and sets author', async () => {
    assert(testSharedChkId);
    const res = await fetch(`${BASE_URL}/api/checklists/${testSharedChkId}/toggle-item`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: 'item_f1',
        completed_by: 'Lukas Wagner (Mitarbeiter 1)'
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.completed_items, 1);
    assert.strictEqual(json.progress_percent, 50);
    const target = json.items.find(i => i.id === 'item_f1');
    assert(target.done);
    assert.strictEqual(target.completed_by, 'Lukas Wagner (Mitarbeiter 1)');
    assert(target.completed_at);
  });

  await check('POST /api/checklists/:id/items adds a new task inline', async () => {
    assert(testSharedChkId);
    const res = await fetch(`${BASE_URL}/api/checklists/${testSharedChkId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Notbeleuchtung Funktionstest durchführen' })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.items.length, 3);
  });

  await check('PUT /api/checklists/:id toggles sharing from private to shared with team', async () => {
    assert(testPrivateChkId);
    const res = await fetch(`${BASE_URL}/api/checklists/${testPrivateChkId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_shared: true })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.is_shared, true);

    // Now Lukas also sees it because it has been shared with team!
    const lukasRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_lukas`);
    const lukasLists = await lukasRes.json();
    assert(lukasLists.some(l => l.id === testPrivateChkId), 'Lukas should now see the shared checklist');
  });

  await check('DELETE /api/checklists/:id removes test checklists', async () => {
    if (testSharedChkId) {
      const res = await fetch(`${BASE_URL}/api/checklists/${testSharedChkId}`, { method: 'DELETE' });
      assert.strictEqual(res.status, 200);
    }
    if (testPrivateChkId) {
      const res = await fetch(`${BASE_URL}/api/checklists/${testPrivateChkId}`, { method: 'DELETE' });
      assert.strictEqual(res.status, 200);
    }
  });

  // -------------------------------------------------------------------------
  // 25. DEFAULT ACCOUNT CREATION & CREDENTIALS (admin / admin)
  // -------------------------------------------------------------------------
  let newStaffId = null;
  const testStaffEmail = `t.sommer_${Date.now()}@kita.de`;

  await check('POST /api/staff creates account with default admin / admin login credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tobias Sommer',
        email: testStaffEmail,
        role: 'FACHKRAFT',
        qualification: 'Erzieher B.A.',
        is_fachkraft: 1,
        weekly_hours: 39
      })
    });
    assert.strictEqual(res.status, 201);
    const created = await res.json();
    newStaffId = created.id;
    assert(newStaffId);
    assert.strictEqual(created.username, 'admin');
    assert.strictEqual(created.password, 'admin');
    assert.strictEqual(created.password_changed, 0);
  });

  await check('POST /api/auth/login authenticates global admin / admin credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.user);
    assert.strictEqual(json.is_default_password, true);
  });

  await check('POST /api/auth/login authenticates new account by ID or Email with default password', async () => {
    assert(newStaffId);
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testStaffEmail, password: 'admin' })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.user.id, newStaffId);
    assert.strictEqual(json.is_default_password, true);
  });

  await check('POST /api/auth/change-password updates password and sets password_changed = 1', async () => {
    assert(newStaffId);
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: newStaffId,
        old_password: 'admin',
        new_password: 'superSecret123!'
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);

    // Verify old password fails
    const failRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testStaffEmail, password: 'admin' })
    });
    assert.strictEqual(failRes.status, 401);

    // Verify new password succeeds
    const okRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testStaffEmail, password: 'superSecret123!' })
    });
    assert.strictEqual(okRes.status, 200);
    const okJson = await okRes.json();
    assert.strictEqual(okJson.success, true);
    assert.strictEqual(okJson.is_default_password, false);
  });

  await check('POST /api/auth/reset-password resets employee password back to default admin', async () => {
    assert(newStaffId);
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: newStaffId })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);

    // Verify admin / admin works again
    const okRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testStaffEmail, password: 'admin' })
    });
    assert.strictEqual(okRes.status, 200);
    const okJson = await okRes.json();
    assert.strictEqual(okJson.success, true);
    assert.strictEqual(okJson.is_default_password, true);

    // Clean up created staff
    await fetch(`${BASE_URL}/api/staff/${newStaffId}`, { method: 'DELETE' });
  });

  // -------------------------------------------------------------------------
  // 26. EINSPRING-KASKADE & RECHTLICHER RAHMEN (ArbZG § 3 & § 5, Abwesenheiten)
  // -------------------------------------------------------------------------
  await check('GET /api/emergency/legal-check validates ArbZG § 3, § 5 and absences', async () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const res = await fetch(`${BASE_URL}/api/emergency/legal-check?staff_id=s_lukas&date=${todayStr}&start_time=08:00&end_time=16:30`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.staff_id, 's_lukas');
    assert.strictEqual(typeof json.is_compliant, 'boolean');
    assert(json.checks && json.checks.length >= 3);
    assert(json.checks.some(c => c.rule.includes('ArbZG § 3')));
    assert(json.checks.some(c => c.rule.includes('ArbZG § 5')));
    assert(json.checks.some(c => c.rule.includes('Abwesenheit')));
  });

  let testCycleId = null;
  let testCandidates = [];

  await check('POST /api/emergency/start-cycle filters by legal compliance and starts cascade', async () => {
    const cycleDate = '2026-10-24';
    const res = await fetch(`${BASE_URL}/api/emergency/start-cycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: 'g_u3_maeuse',
        date: cycleDate,
        start_time: '08:00',
        end_time: '16:30',
        absent_staff_id: 's_sarah',
        reason: 'Akute Krankmeldung / Testfall Kaskade'
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.cycle_id);
    testCycleId = json.cycle_id;
    testCandidates = json.candidates;

    assert.strictEqual(json.status, 'IN_PROGRESS');
    assert(testCandidates.length > 0, 'Must have legally compliant candidates');
    // Verify all candidates have passed the legal check
    for (const c of testCandidates) {
      assert.strictEqual(c.legal_check.is_compliant, true, `${c.name} must be legally compliant`);
    }

    // Candidate 0 must be PENDING
    assert.strictEqual(testCandidates[0].status, 'PENDING');

    // Candidate 0 must see pending request
    const pendingRes = await fetch(`${BASE_URL}/api/emergency/pending-request/${testCandidates[0].staff_id}`);
    const pendingJson = await pendingRes.json();
    assert.strictEqual(pendingJson.has_pending_request, true);
    assert.strictEqual(pendingJson.cycle_id, testCycleId);
  });

  await check('POST /api/emergency/cycles/:id/respond cycles through candidates on DECLINE and notifies director when all decline', async () => {
    assert(testCycleId);
    assert(testCandidates.length > 0);

    // Each candidate in sequence declines the request
    for (let i = 0; i < testCandidates.length; i++) {
      const candidate = testCandidates[i];
      const res = await fetch(`${BASE_URL}/api/emergency/cycles/${testCycleId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: candidate.staff_id,
          decision: 'DECLINE'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();

      if (i < testCandidates.length - 1) {
        // Cycled to next candidate!
        assert.strictEqual(json.status, 'IN_PROGRESS');
        assert.strictEqual(json.current_index, i + 1);
        assert.strictEqual(json.next_candidate.staff_id, testCandidates[i + 1].staff_id);
      } else {
        // EVERYONE HAS DECLINED!
        assert.strictEqual(json.status, 'ALL_DECLINED');
        assert(json.message.includes('Alle'));
      }
    }

    // Verify Director (s_sabine) received the emergency alert that everyone declined
    const auditRes = await fetch(`${BASE_URL}/api/staff/s_sabine/audit-log`);
    const auditLogs = await auditRes.json();
    const allDeclinedLog = auditLogs.find(l => l.title.includes('nein gesagt') || l.title.includes('Alle'));
    assert(allDeclinedLog, 'Director must have received notification that all candidates declined');
  });

  await check('POST /api/emergency/cycles/:id/director-decide allows director to override and assign shift', async () => {
    assert(testCycleId);
    const res = await fetch(`${BASE_URL}/api/emergency/cycles/${testCycleId}/director-decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 's_sabine',
        director_note: 'Leitung übernimmt Gruppendienst persönlich zur Aufrechterhaltung des Personalschlüssels.'
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.status, 'DIRECTOR_RESOLVED');
    assert(json.shift_id);

    // Clean up created shift
    await fetch(`${BASE_URL}/api/shifts/${json.shift_id}`, { method: 'DELETE' });
  });

  await check('Einspring-Kaskade immediately books shift and finishes cycle if candidate ACCEPTS', async () => {
    const cycleDate = '2026-10-24';
    const startRes = await fetch(`${BASE_URL}/api/emergency/start-cycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: 'g_ue3_sonne',
        date: cycleDate,
        start_time: '08:00',
        end_time: '16:30',
        reason: 'Test Zusage-Fall'
      })
    });
    assert.strictEqual(startRes.status, 201);
    const startJson = await startRes.json();
    const cycleId = startJson.cycle_id;
    const firstCandidate = startJson.current_candidate;
    assert(firstCandidate);

    // First candidate ACCEPTS
    const acceptRes = await fetch(`${BASE_URL}/api/emergency/cycles/${cycleId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: firstCandidate.staff_id,
        decision: 'ACCEPT'
      })
    });
    assert.strictEqual(acceptRes.status, 200);
    const acceptJson = await acceptRes.json();
    assert.strictEqual(acceptJson.status, 'ACCEPTED');
    assert(acceptJson.shift_id);
    assert.strictEqual(acceptJson.accepted_staff.staff_id, firstCandidate.staff_id);

    // Clean up created shift
    await fetch(`${BASE_URL}/api/shifts/${acceptJson.shift_id}`, { method: 'DELETE' });
  });

  // -------------------------------------------------------------------------
  // TEST 27: Granulare Checklisten-Freigabe (Gruppe, Kindergruppe, Personen, Leitung, Gesamt)
  //          und 3 Favoriten oben mit Ersetzung von unten nach oben
  // -------------------------------------------------------------------------
  await check('27. Granulare Checklisten-Freigabe & Top-3-Favoriten (von unten nach oben)', async () => {
    const testStaffId = 's_lukas';

    // 1. Reset & Abrufen der Standard-Favoriten (Gesamt, Heutige Gruppe, Leitung)
    await fetch(`${BASE_URL}/api/staff/${testStaffId}/share-favorites/reset`, { method: 'DELETE' });
    const favRes = await fetch(`${BASE_URL}/api/staff/${testStaffId}/share-favorites`);
    assert.strictEqual(favRes.status, 200);
    const initialFavs = await favRes.json();
    assert.strictEqual(initialFavs.length, 3);
    assert.strictEqual(initialFavs[0].type, 'GESAMT');
    assert.strictEqual(initialFavs[1].type, 'TODAY_GROUP');
    assert.strictEqual(initialFavs[2].type, 'LEITUNG');

    // 2. Erster Favorit hinzugefügt: Ersetzt Slot 3 (Leitung - von unten nach oben!)
    const addFav1 = await fetch(`${BASE_URL}/api/staff/${testStaffId}/share-favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        favorite: {
          type: 'PERSON',
          label: 'Sarah Klein',
          targetId: 's_sarah'
        }
      })
    });
    assert.strictEqual(addFav1.status, 200);
    const fav1Data = await addFav1.json();
    assert.strictEqual(fav1Data.replacedIndex, 2); // Slot 3 (Index 2) ersetzt!
    assert.strictEqual(fav1Data.favorites[0].type, 'GESAMT');
    assert.strictEqual(fav1Data.favorites[1].type, 'TODAY_GROUP');
    assert.strictEqual(fav1Data.favorites[2].targetId, 's_sarah');

    // 3. Zweiter Favorit hinzugefügt: Ersetzt Slot 2 (Heutige Gruppe - nächster von unten!)
    const addFav2 = await fetch(`${BASE_URL}/api/staff/${testStaffId}/share-favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        favorite: {
          type: 'GROUP',
          label: 'Mäusegruppe (U3)',
          targetId: 'g_u3_maeuse'
        }
      })
    });
    assert.strictEqual(addFav2.status, 200);
    const fav2Data = await addFav2.json();
    assert.strictEqual(fav2Data.replacedIndex, 1); // Slot 2 (Index 1) ersetzt!
    assert.strictEqual(fav2Data.favorites[0].type, 'GESAMT');
    assert.strictEqual(fav2Data.favorites[1].targetId, 'g_u3_maeuse');
    assert.strictEqual(fav2Data.favorites[2].targetId, 's_sarah');

    // 4. Dritter Favorit hinzugefügt: Ersetzt Slot 1 (Gesamt - oberster!)
    const addFav3 = await fetch(`${BASE_URL}/api/staff/${testStaffId}/share-favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        favorite: {
          type: 'PERSON',
          label: 'Elena Rossi',
          targetId: 's_elena'
        }
      })
    });
    assert.strictEqual(addFav3.status, 200);
    const fav3Data = await addFav3.json();
    assert.strictEqual(fav3Data.replacedIndex, 0); // Slot 1 (Index 0) ersetzt!
    assert.strictEqual(fav3Data.favorites[0].targetId, 's_elena');
    assert.strictEqual(fav3Data.favorites[1].targetId, 'g_u3_maeuse');
    assert.strictEqual(fav3Data.favorites[2].targetId, 's_sarah');

    // 5. Checkliste für 'Heutige Gruppe' erstellen
    // Lukas Wagner erstellt Checkliste für 'g_u3_maeuse'
    const today = new Date().toISOString().split('T')[0];
    const chkRes = await fetch(`${BASE_URL}/api/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Mäusegruppe Morgen-Hygiene Check',
        category: 'HYGIENE',
        created_by_id: 's_lukas',
        created_by_name: 'Lukas Wagner',
        is_shared: true,
        share_scope: 'TODAY_GROUP',
        shared_group_id: 'g_u3_maeuse',
        shared_group_name: 'Mäusegruppe (U3)',
        items: [{ id: 'it_1', text: 'Desinfektion Wickeltisch', done: false }]
      })
    });
    assert.strictEqual(chkRes.status, 201);
    const chkData = await chkRes.json();
    const checklistId = chkData.id;

    // 6. Sichtbarkeitsprüfung:
    // a) Ersteller (Lukas Wagner) sieht die Liste IMMER ("dem ersteller aber immer")
    const lukasListRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_lukas`);
    const lukasLists = await lukasListRes.json();
    assert(lukasLists.some((c) => c.id === checklistId), 'Ersteller Lukas muss Checkliste immer sehen');

    // b) Kollege in der Mäusegruppe (Sarah Klein target_group_id = g_u3_maeuse) sieht sie
    const sarahListRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_sarah`);
    const sarahLists = await sarahListRes.json();
    assert(sarahLists.some((c) => c.id === checklistId), 'Sarah in Mäusegruppe muss Checkliste sehen');

    // c) Kollege in Sonnengruppe (z.B. Jonas Meyer target_group_id = g_ue3_sonne) ohne Schicht in Mäusegruppe sieht sie NICHT
    const jonasListRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_jonas`);
    const jonasLists = await jonasListRes.json();
    assert(!jonasLists.some((c) => c.id === checklistId), 'Jonas aus anderer Gruppe darf Mäusegruppen-Liste nicht sehen');

    // d) Leitung (Sabine Weber) sieht sie (als Leitung)
    const sabineListRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_sabine`);
    const sabineLists = await sabineListRes.json();
    assert(sabineLists.some((c) => c.id === checklistId), 'Leitung Sabine sieht Checkliste');

    // Clean up created checklist
    await fetch(`${BASE_URL}/api/checklists/${checklistId}`, { method: 'DELETE' });
    // Reset favorites back to defaults
    await fetch(`${BASE_URL}/api/staff/${testStaffId}/share-favorites/reset`, { method: 'DELETE' });
  });

  // -------------------------------------------------------------------------
  // TEST 28: Personen-spezifische Freigabe & Direkte Leitung-Freigabe
  // -------------------------------------------------------------------------
  await check('28. Personen-spezifische und Leitung-Checklisten-Freigabe', async () => {
    // Checkliste nur mit Sarah Klein geteilt
    const chkPerson = await fetch(`${BASE_URL}/api/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Geheime Übergabe-Notiz für Sarah',
        category: 'ROUTINE',
        created_by_id: 's_lukas',
        created_by_name: 'Lukas Wagner',
        is_shared: true,
        share_scope: 'PERSONS',
        shared_staff_ids: ['s_sarah'],
        shared_staff_names: ['Sarah Klein'],
        items: [{ id: 'p_1', text: 'Elterngespräch Mia vorbereiten', done: false }]
      })
    });
    assert.strictEqual(chkPerson.status, 201);
    const personChk = await chkPerson.json();

    // Sarah sieht sie
    const sRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_sarah`);
    const sLists = await sRes.json();
    assert(sLists.some((c) => c.id === personChk.id));

    // Markus Becker ist NICHT in shared_staff_ids und sieht sie NICHT
    const mRes = await fetch(`${BASE_URL}/api/checklists?staff_id=s_markus`);
    const mLists = await mRes.json();
    assert(!mLists.some((c) => c.id === personChk.id));

    // Clean up
    await fetch(`${BASE_URL}/api/checklists/${personChk.id}`, { method: 'DELETE' });
  });

  // -------------------------------------------------------------------------
  // TEST 29: Leitungseingriff WÄHREND der laufenden Abfrage ("Die Person macht das jetzt!")
  // -------------------------------------------------------------------------
  await check('29. Leitungseingriff während laufender Abfrage ("Die Person macht das jetzt!")', async () => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Notfall-Kaskade starten
    const startRes = await fetch(`${BASE_URL}/api/emergency/start-cycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: 'g_u3_maeuse',
        date: today,
        start_time: '13:00',
        end_time: '17:00',
        absent_staff_id: 's_lisa',
        reason: 'Plötzlicher Ausfall am Nachmittag'
      })
    });
    assert.strictEqual(startRes.status, 201);
    const startData = await startRes.json();
    const cycleId = startData.cycle_id;
    assert.strictEqual(startData.status, 'IN_PROGRESS');
    assert(startData.candidates.length >= 2, 'Mindestens 2 Kandidaten für den Test benötigt');

    // Kandidat 1 und 2 ermitteln
    const candidate1 = startData.candidates[0];
    const candidate2 = startData.candidates[1];

    // Kandidat 1 hat noch NICHT geantwortet (Kaskade läuft aktiv auf Index 0)
    assert.strictEqual(startData.current_candidate_index, 0);

    // 2. Leitung greift WÄHREND der laufenden Abfrage ein und bestimmt: Kandidat 2 macht das jetzt!
    const decideRes = await fetch(`${BASE_URL}/api/emergency/cycles/${cycleId}/director-decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: candidate2.staff_id,
        director_note: 'Dringender Leitungseingriff: Du übernimmst den Dienst sofort!'
      })
    });
    assert.strictEqual(decideRes.status, 200);
    const decideData = await decideRes.json();
    assert.strictEqual(decideData.status, 'DIRECTOR_RESOLVED');
    assert.strictEqual(decideData.intervened_during_inquiry, true);
    assert.strictEqual(decideData.chosen_staff.id, candidate2.staff_id);
    assert(decideData.shift_id);

    // 3. Verifizieren, dass der Kaskaden-Status auf DIRECTOR_RESOLVED steht
    const cyclesRes = await fetch(`${BASE_URL}/api/emergency/cycles`);
    const cycles = await cyclesRes.json();
    const updatedCycle = cycles.find((c) => c.id === cycleId);
    assert(updatedCycle);
    assert.strictEqual(updatedCycle.status, 'DIRECTOR_RESOLVED');
    assert.strictEqual(updatedCycle.director_decision_staff_id, candidate2.staff_id);

    // 4. Verifizieren, dass der Zyklus für Kandidat 1 nicht mehr angefragt wird
    const cand1Pending = await fetch(`${BASE_URL}/api/emergency/pending-request/${candidate1.staff_id}`);
    const cand1Json = await cand1Pending.json();
    if (cand1Json.has_pending_request) {
      assert.notStrictEqual(cand1Json.cycle_id, cycleId, 'Darf keine Anfrage für den durch Leitungseingriff beendeten Zyklus mehr haben');
    }

    // 5. Clean up erstellte Schicht
    await fetch(`${BASE_URL}/api/shifts/${decideData.shift_id}`, { method: 'DELETE' });
  });

  // ---------------------------------------------------------------------------
  // 30. DRAG & DROP EINSTELLUNGEN: STANDARDSCHICHTDAUER (z.B. 8 STUNDEN)
  // ---------------------------------------------------------------------------
  await check('30. Standardarbeitszeit-Einstellungen in /api/settings (Standard 8.0 Std., anpassbar)', async () => {
    // 1. Abrufen der aktuellen Einstellungen
    const getRes = await fetch(`${BASE_URL}/api/settings`);
    assert.strictEqual(getRes.status, 200);
    const settings = await getRes.json();
    assert.strictEqual(typeof settings.default_shift_duration_hours, 'number');
    assert.strictEqual(typeof settings.default_shift_start_time, 'string');

    // 2. Anpassen der Standard-Schichtdauer auf 8.0 Stunden und Start 08:00
    const updateRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_shift_duration_hours: 8.0,
        default_shift_start_time: '08:00',
        default_shift_break_minutes: 30
      })
    });
    assert.strictEqual(updateRes.status, 200);

    const recheckRes = await fetch(`${BASE_URL}/api/settings`);
    const recheck = await recheckRes.json();
    assert.strictEqual(recheck.default_shift_duration_hours, 8.0);
    assert.strictEqual(recheck.default_shift_start_time, '08:00');
    assert.strictEqual(recheck.default_shift_break_minutes, 30);
  });

  // ---------------------------------------------------------------------------
  // 31. ARBZG-PRÜFUNG: MELDET FEHLER/WARNUNG, ABER VERHINDERT EINTRAGUNG NICHT
  // ---------------------------------------------------------------------------
  await check('31. ArbZG § 5 (Ruhezeit < 11h): Meldet Fehler, verhindert das Eintragen aber NICHT (Status 201)', async () => {
    const testDate1 = '2026-11-16';
    const testDate2 = '2026-11-17';
    const staffId = 's_lukas';
    const groupId = 'g_u3_maeuse';

    // Schicht 1: Spätdienst bis 22:00 Uhr
    const s1Res = await fetch(`${BASE_URL}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        group_id: groupId,
        date: testDate1,
        start_time: '13:30',
        end_time: '22:00',
        break_minutes: 30
      })
    });
    assert.strictEqual(s1Res.status, 201);
    const s1 = await s1Res.json();

    // Schicht 2: Frühdienst am Folgetag ab 06:00 Uhr (Ruhezeit nur 8 Std. < 11 Std. gesetzlich!)
    const s2Res = await fetch(`${BASE_URL}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        group_id: groupId,
        date: testDate2,
        start_time: '06:00',
        end_time: '14:30',
        break_minutes: 30
      })
    });
    // System MUSS Schicht eintragen (Status 201), darf NICHT blockieren (kein 400 oder Fehlerabbruch!)
    assert.strictEqual(s2Res.status, 201);
    const s2 = await s2Res.json();
    assert.strictEqual(s2.success, true);
    assert(s2.id);
    // Aber MUSS den Fehler / die ArbZG-Warnung melden!
    assert(s2.warning, 'Muss Warnung enthalten');
    assert(s2.warning.includes('ArbZG § 5 (Ruhezeit)'));
    assert(s2.warning.includes('8.0 Std'));

    // Verifizieren, dass die Schicht in der Datenbank mit warning gespeichert ist
    const getShiftsRes = await fetch(`${BASE_URL}/api/shifts?start=${testDate2}&end=${testDate2}&staff_id=${staffId}`);
    const shiftsList = await getShiftsRes.json();
    const createdShift = shiftsList.find((s) => s.id === s2.id);
    assert(createdShift);
    assert(createdShift.warning && createdShift.warning.includes('ArbZG § 5'));

    // Cleanup
    await fetch(`${BASE_URL}/api/shifts/${s1.id}`, { method: 'DELETE' });
    await fetch(`${BASE_URL}/api/shifts/${s2.id}`, { method: 'DELETE' });
  });

  // ---------------------------------------------------------------------------
  // 32. ARBZG § 3 (HÖCHSTARBEITSZEIT > 10H) & SCHICHTÜBERSCHNEIDUNG
  // ---------------------------------------------------------------------------
  await check('32. ArbZG § 3 (Höchstarbeitszeit > 10h): Meldet Fehler, verhindert Eintragen aber NICHT', async () => {
    const testDate = '2026-11-18';
    const staffId = 's_julia';
    const groupId = 'g_ue3_sonne';

    // 12 Stunden Schicht (Netto 11.5 Std. > 10.0 Std. gesetzliches Maximum)
    const res = await fetch(`${BASE_URL}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        group_id: groupId,
        date: testDate,
        start_time: '07:00',
        end_time: '19:00',
        break_minutes: 30
      })
    });
    // Meldet Fehler, aber verhindert es nicht!
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.warning);
    assert(json.warning.includes('ArbZG § 3 (Höchstarbeitszeit)'));
    assert(json.warning.includes('11.5 Std'));

    // Cleanup
    await fetch(`${BASE_URL}/api/shifts/${json.id}`, { method: 'DELETE' });
  });

  // ---------------------------------------------------------------------------
  // 33. SCHICHTZEIT IM KALENDER ANPASSEN (PUT /api/shifts/:id)
  // ---------------------------------------------------------------------------
  await check('33. PUT /api/shifts/:id erlaubt Schichtzeit im Kalender anzupassen inkl. ArbZG-Prüfung', async () => {
    const testDate = '2026-11-19';
    const staffId = 's_markus';
    const groupId = 'g_u3_maeuse';

    // 1. Schicht anlegen (z.B. per Drag & Drop mit 8h)
    const createRes = await fetch(`${BASE_URL}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        group_id: groupId,
        date: testDate,
        start_time: '08:00',
        end_time: '16:30',
        break_minutes: 30
      })
    });
    const created = await createRes.json();
    assert.strictEqual(createRes.status, 201);

    // 2. Zeit im Kalender anpassen auf Frühdienst 07:00 - 15:30
    const updateRes = await fetch(`${BASE_URL}/api/shifts/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: '07:00',
        end_time: '15:30',
        break_minutes: 30,
        role_override: 'Frühdienst angepasst'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.strictEqual(updated.success, true);

    // 3. Verifizieren
    const getRes = await fetch(`${BASE_URL}/api/shifts?start=${testDate}&end=${testDate}&staff_id=${staffId}`);
    const list = await getRes.json();
    const shift = list.find((s) => s.id === created.id);
    assert(shift);
    assert.strictEqual(shift.start_time, '07:00');
    assert.strictEqual(shift.end_time, '15:30');
    assert.strictEqual(shift.role_override, 'Frühdienst angepasst');

    // Cleanup
    await fetch(`${BASE_URL}/api/shifts/${created.id}`, { method: 'DELETE' });
  });

  // ---------------------------------------------------------------------------
  // 34. KRANKMELDUNG LÖST KRITISCHE WARNUNG BEI LEITUNG AUS (WENN MODE = CRITICAL)
  // ---------------------------------------------------------------------------
  await check('34. Krankmeldung löst kritische Notfall-Warnung bei Leitung aus (CRITICAL Mode)', async () => {
    // 1. Leitung (s_sabine) auf CRITICAL setzen
    const setModeRes = await fetch(`${BASE_URL}/api/staff/s_sabine/notification-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ critical_alerts_mode: 'CRITICAL' })
    });
    assert.strictEqual(setModeRes.status, 200);

    // 2. Mitarbeiter (s_markus) meldet sich krank
    const sickRes = await fetch(`${BASE_URL}/api/requests/sick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 's_markus',
        reason: 'Grippe mit hohem Fieber'
      })
    });
    assert.strictEqual(sickRes.status, 200);
    const sickData = await sickRes.json();
    assert.strictEqual(sickData.success, true);
    assert.strictEqual(sickData.critical_warning_triggered, true);

    // 3. Leitung prüft kritische Alarme
    const alertsRes = await fetch(`${BASE_URL}/api/staff/s_sabine/critical-alerts`);
    assert.strictEqual(alertsRes.status, 200);
    const alertData = await alertsRes.json();
    assert(Array.isArray(alertData.alerts));
    const markusAlert = alertData.alerts.find((a) => a.title.includes('Markus Becker'));
    assert(markusAlert, 'Kritischer Notfall-Alarm für Leitung muss existieren');
    assert.strictEqual(markusAlert.category, 'CRITICAL_ALERT');

    // 4. Alarm quittieren (dismiss)
    const dismissRes = await fetch(`${BASE_URL}/api/staff/s_sabine/critical-alerts/${markusAlert.id}/dismiss`, {
      method: 'POST'
    });
    assert.strictEqual(dismissRes.status, 200);
  });

  // ---------------------------------------------------------------------------
  // 35. LEITUNG KANN ENTSCHEIDEN: KRITISCH VS. EINFACH (PERSONALISIERUNG)
  // ---------------------------------------------------------------------------
  await check('35. Leitung stellt auf SIMPLE: Krankmeldungen erzeugen normale Info statt kritischen Notfall-Alarm', async () => {
    // 1. Leitung (s_sabine) auf SIMPLE schalten
    const setSimpleRes = await fetch(`${BASE_URL}/api/staff/s_sabine/notification-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ critical_alerts_mode: 'SIMPLE' })
    });
    assert.strictEqual(setSimpleRes.status, 200);

    // Verifizieren
    const getSettingsRes = await fetch(`${BASE_URL}/api/staff/s_sabine/notification-settings`);
    const settings = await getSettingsRes.json();
    assert.strictEqual(settings.critical_alerts_mode, 'SIMPLE');

    // 2. Lukas meldet sich krank
    const sickRes = await fetch(`${BASE_URL}/api/requests/sick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: 's_lukas',
        reason: 'Magen-Darm'
      })
    });
    assert.strictEqual(sickRes.status, 200);
    const sickData = await sickRes.json();
    assert.strictEqual(sickData.success, true);
    // Wurde NICHT als kritische Warnung ausgelöst
    assert.strictEqual(sickData.critical_warning_triggered, false);

    // 3. Audit Log enthält INFO statt CRITICAL_ALERT
    const logRes = await fetch(`${BASE_URL}/api/staff/s_sabine/audit-log`);
    const logs = await logRes.json();
    const lukasLog = logs.find((l) => l.description.includes('Lukas Wagner') && l.description.includes('krankgemeldet'));
    assert(lukasLog, 'Muss im Log als normale Info stehen');
    assert.strictEqual(lukasLog.category, 'INFO');

    // 4. Zurück auf Standard (CRITICAL) setzen
    await fetch(`${BASE_URL}/api/staff/s_sabine/notification-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ critical_alerts_mode: 'CRITICAL' })
    });
  });

  // ---------------------------------------------------------------------------
  // 36. MITARBEITER KANN FÜR SICH ENTSCHEIDEN: SPONTAN-AUSHELFEN KRITISCH ODER EINFACH
  // ---------------------------------------------------------------------------
  await check('36. Spontan-Aushelfen: Mitarbeiter kann Alarm-Modus (Kritisch / Einfach) individuell wählen', async () => {
    // 1. Sarah stellt ihren Modus auf SIMPLE
    const setSimpleRes = await fetch(`${BASE_URL}/api/staff/s_sarah/notification-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ critical_alerts_mode: 'SIMPLE' })
    });
    assert.strictEqual(setSimpleRes.status, 200);

    // 2. Prüfen des Endpoints pending-request
    const checkSarahRes = await fetch(`${BASE_URL}/api/emergency/pending-request/s_sarah`);
    assert.strictEqual(checkSarahRes.status, 200);
    const sarahData = await checkSarahRes.json();
    assert.strictEqual(sarahData.critical_alerts_mode, 'SIMPLE');

    // 3. Lukas stellt seinen Modus auf CRITICAL
    const setCritRes = await fetch(`${BASE_URL}/api/staff/s_lukas/notification-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ critical_alerts_mode: 'CRITICAL' })
    });
    assert.strictEqual(setCritRes.status, 200);

    const checkLukasRes = await fetch(`${BASE_URL}/api/emergency/pending-request/s_lukas`);
    const lukasData = await checkLukasRes.json();
    assert.strictEqual(lukasData.critical_alerts_mode, 'CRITICAL');
  });

  // ---------------------------------------------------------------------------
  // 37. PHASE 1: DIGITALE KINDERAKTE, NOTFALLKONTAKTE, ALLERGIEN & ABHOLVERBOTE
  // ---------------------------------------------------------------------------
  await check('37. Digitale Kinderakte, Notfallkontakte, Allergien & Abholverbote', async () => {
    // 1. Liste aller Kinder abrufen
    const childrenRes = await fetch(`${BASE_URL}/api/children`);
    assert.strictEqual(childrenRes.status, 200);
    const children = await childrenRes.json();
    assert(children.length >= 50, 'Muss vorinstallierte Kinder enthalten');

    // 2. Allergie-Erkennung testen
    const leo = children.find((c) => c.id === 'c_u3_1');
    assert(leo, 'Leo Bergmann muss existieren');
    assert.strictEqual(leo.has_allergy, true);
    assert(leo.allergies.includes('Laktose'));

    const noah = children.find((c) => c.id === 'c_u3_3');
    assert(noah, 'Noah Müller muss existieren');
    assert(noah.allergies.includes('Erdnuss'));
    assert.strictEqual(noah.has_emergency_note, true);

    // 3. Detail-Akte mit Notfallkontakten und Abholberechtigungen abrufen
    const leoDetailRes = await fetch(`${BASE_URL}/api/children/c_u3_1`);
    assert.strictEqual(leoDetailRes.status, 200);
    const leoDetail = await leoDetailRes.json();
    assert(leoDetail.emergency_contacts.length >= 2, 'Muss Mutter und Vater als Notfallkontakt haben');
    assert.strictEqual(leoDetail.emergency_contacts[0].priority, 1);
    const hildeAuth = leoDetail.pickup_authorizations.find(p => p.name === 'Hilde Bergmann');
    assert(hildeAuth, 'Hilde Bergmann muss unter den Abholberechtigten sein');

    // 4. Kind anlegen
    const createChildRes = await fetch(`${BASE_URL}/api/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: 'g_u3_maeuse',
        first_name: 'Testkind',
        last_name: 'Mustermann',
        birth_date: '2024-05-01',
        gender: 'M',
        care_hours: 45,
        allergies: ['Gluten'],
        dietary_needs: 'Glutenfreie Kost'
      })
    });
    assert.strictEqual(createChildRes.status, 201);
    const createChildData = await createChildRes.json();
    const testChildId = createChildData.id;

    // 5. Notfallkontakt und Abholverbot hinzufügen
    const addContactRes = await fetch(`${BASE_URL}/api/children/${testChildId}/emergency-contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tante Helga',
        relationship: 'Tante',
        phone_primary: '0179-9988776',
        priority: 1
      })
    });
    assert.strictEqual(addContactRes.status, 201);

    // Abholverbot (is_forbidden: 1)
    const addForbiddenRes = await fetch(`${BASE_URL}/api/children/${testChildId}/pickup-authorizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unberechtigte Person',
        relationship: 'Bekannter',
        is_forbidden: 1,
        notes: 'Darf Kind unter keinen Umständen abholen!'
      })
    });
    assert.strictEqual(addForbiddenRes.status, 201);

    // 6. Testkind bereinigen
    const delRes = await fetch(`${BASE_URL}/api/children/${testChildId}`, { method: 'DELETE' });
    assert.strictEqual(delRes.status, 200);
  });

  // ---------------------------------------------------------------------------
  // 38. PHASE 1: TABLET SCHNELL-CHECK-IN, CHECK-OUT, U3-TAGEBUCH & MAHLZEITEN
  // ---------------------------------------------------------------------------
  await check('38. Tablet Schnell-Check-In, Check-Out, U3-Tagebuch & Mahlzeiten', async () => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Check-In via 1-Tap am Tablet
    const checkInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: 'c_u3_1',
        check_in_time: '08:05',
        date: today
      })
    });
    assert.strictEqual(checkInRes.status, 200);
    const checkInData = await checkInRes.json();
    assert.strictEqual(checkInData.success, true);

    // 2. Check-Out mit Abholer
    const checkOutRes = await fetch(`${BASE_URL}/api/attendance/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: 'c_u3_1',
        check_out_time: '15:30',
        picked_up_by: 'Oma Hilde Bergmann',
        date: today
      })
    });
    assert.strictEqual(checkOutRes.status, 200);

    // 3. Eltern melden Kind krank -> Mahlzeit automatisch storniert
    const markAbsentRes = await fetch(`${BASE_URL}/api/attendance/mark-absent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: 'c_u3_2',
        status: 'absent_sick',
        reason: 'Fieber 39.2 Grad',
        cancel_meal: true,
        date: today
      })
    });
    assert.strictEqual(markAbsentRes.status, 200);
    const markAbsentData = await markAbsentRes.json();
    assert.strictEqual(markAbsentData.meal_cancelled, true);

    // 4. Mahlzeiten-Zusammenfassung für den Caterer
    const mealRes = await fetch(`${BASE_URL}/api/meals/summary?date=${today}`);
    assert.strictEqual(mealRes.status, 200);
    const mealData = await mealRes.json();
    assert(mealData.total_ordered > 0);
    assert(mealData.total_cancelled > 0);
    assert(Array.isArray(mealData.special_diets), 'Allergiker-Liste muss vorhanden sein');

    // 5. U3-Tagebucheintrag (Wickeln & Schlafen)
    const logRes = await fetch(`${BASE_URL}/api/daily-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: 'c_u3_1',
        date: today,
        log_type: 'DIAPER',
        time_start: '10:30',
        details: 'Windel gewechselt, normaler Stuhlgang',
        staff_id: 's_sarah'
      })
    });
    assert.strictEqual(logRes.status, 201);

    const getLogsRes = await fetch(`${BASE_URL}/api/daily-logs?child_id=c_u3_1&date=${today}`);
    assert.strictEqual(getLogsRes.status, 200);
    const logs = await getLogsRes.json();
    assert(logs.some((l) => l.details.includes('Windel gewechselt')));
  });

  // ---------------------------------------------------------------------------
  // 39. PHASE 1: BETREUUNGSSCHLÜSSEL-EINSTELLUNGEN & BUNDESLAND-PRESETS
  // ---------------------------------------------------------------------------
  await check('39. Betreuungsschlüssel-Einstellungen & Bundesland-Presets', async () => {
    // 1. Aktuelle Ratio-Settings abrufen
    const settingsRes = await fetch(`${BASE_URL}/api/ratio-settings`);
    assert.strictEqual(settingsRes.status, 200);
    const settings = await settingsRes.json();
    assert(settings.length > 0);

    // 2. Custom Settings speichern (Leitungs-Konfiguration)
    const updateRes = await fetch(`${BASE_URL}/api/ratio-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'rs_default',
        target_ratio: 8.0,
        warning_threshold_percent: 15.0,
        critical_threshold_percent: 25.0,
        two_person_rule: 1,
        core_time_start: '09:00',
        core_time_end: '13:00',
        min_qualification_quote: 0.50,
        bundesland_preset: 'NRW_KIBIZ'
      })
    });
    assert.strictEqual(updateRes.status, 200);

    // 3. Preset Bayern (BayKiBiG: U3 = 3.0, Ü3 = 7.5) testen
    const presetRes = await fetch(`${BASE_URL}/api/ratio-settings/apply-preset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: 'BAYERN_BAYKIBIG' })
    });
    assert.strictEqual(presetRes.status, 200);
    const presetData = await presetRes.json();
    assert.strictEqual(presetData.u3Ratio, 3.0);
    assert.strictEqual(presetData.ue3Ratio, 7.5);

    // 4. Zurück auf NRW KiBiz
    await fetch(`${BASE_URL}/api/ratio-settings/apply-preset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: 'NRW_KIBIZ' })
    });
  });

  // ---------------------------------------------------------------------------
  // 40. PHASE 1: DYNAMIC RATIO ENGINE & AUTO-BALANCING
  // ---------------------------------------------------------------------------
  await check('40. Dynamic Ratio Engine & Auto-Balancing (Erzieher krank + Kinder abgemeldet)', async () => {
    const today = new Date().toISOString().split('T')[0];

    // Status abfragen
    const statusRes = await fetch(`${BASE_URL}/api/ratio-status?date=${today}`);
    assert.strictEqual(statusRes.status, 200);
    const data = await statusRes.json();

    const sonneGroup = data.groups.find((g) => g.group_id === 'g_ue3_sonne');
    assert(sonneGroup, 'Gruppe Sonnenschein muss im Radar existieren');

    // Sonnenschein hat 25 angemeldete Kinder, aber 8 Kinder sind krankgemeldet (17 anwesend)
    assert.strictEqual(sonneGroup.enrolled_children, 25);
    assert.strictEqual(sonneGroup.absent_children, 8);
    assert.strictEqual(sonneGroup.effective_children, 17);

    // Auto-Balancing muss aktiv sein!
    assert(sonneGroup.auto_balancing, 'auto_balancing Objekt muss existieren');
    assert.strictEqual(sonneGroup.auto_balancing.active, true);
    assert.strictEqual(sonneGroup.auto_balancing.saved_emergency, true);
    assert.strictEqual(sonneGroup.status, 'BALANCED_OK');
    assert(sonneGroup.message.includes('Auto-Balancing aktiv'), 'Meldung muss Auto-Balancing erwähnen');
    assert(sonneGroup.message.includes('Keine Schicht-Neubesetzung nötig') || sonneGroup.message.includes('gesetzeskonform'));
  });

  // ---------------------------------------------------------------------------
  // 41. UNIFIED LOGIN & ROLE-BASED ACCESS CONTROL (STAFF, PARENT, BOARD, KIOSK)
  // ---------------------------------------------------------------------------
  await check('41. Unified Multi-Role Login at POST /api/auth/login', async () => {
    // 1. Leitung Login (Sabine)
    const resLeitung = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    assert.strictEqual(resLeitung.status, 200);
    const dataLeitung = await resLeitung.json();
    assert.strictEqual(dataLeitung.success, true);
    assert.strictEqual(dataLeitung.user_type, 'STAFF');
    assert.strictEqual(dataLeitung.user.portal_access.web_leitung, true);
    assert.strictEqual(dataLeitung.user.portal_access.app_mitarbeiter, true);

    // 2. Erzieher Login (Lukas)
    const resStaff = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 's_lukas', password: 'admin' })
    });
    assert.strictEqual(resStaff.status, 200);
    const dataStaff = await resStaff.json();
    assert.strictEqual(dataStaff.user_type, 'STAFF');
    assert.strictEqual(dataStaff.user.portal_access.web_leitung, false);
    assert.strictEqual(dataStaff.user.portal_access.app_mitarbeiter, true);

    // 3. Eltern / Vorstand Login (Anna Bergmann)
    const resParent = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'eltern@kita.de', password: 'admin' })
    });
    assert.strictEqual(resParent.status, 200);
    const dataParent = await resParent.json();
    assert.strictEqual(dataParent.user_type, 'PARENT');
    assert.strictEqual(dataParent.user.role, 'VORSTAND');
    assert.strictEqual(dataParent.user.portal_access.web_leitung, true); // Vorstand darf Leitungscockpit einsehen
    assert.strictEqual(dataParent.user.portal_access.app_eltern, true);

    // 4. Kiosk-Tablet Device Login (PIN 1234)
    const resKiosk = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'kiosk_krabbelmaeuse', password: '1234' })
    });
    assert.strictEqual(resKiosk.status, 200);
    const dataKiosk = await resKiosk.json();
    assert.strictEqual(dataKiosk.user_type, 'KIOSK_DEVICE');
    assert.strictEqual(dataKiosk.user.portal_access.kiosk_tablet, true);
  });

  // ---------------------------------------------------------------------------
  // 42. LAGE.APP PARITY: BOARD MEMBERS & 1-CLICK VORSTANDSWECHSEL
  // ---------------------------------------------------------------------------
  await check('42. LAGE.app Parity: Board Members & 1-Click Handover', async () => {
    // 1. Vorstandsmitglieder abrufen
    const membersRes = await fetch(`${BASE_URL}/api/board/members`);
    assert.strictEqual(membersRes.status, 200);
    const members = await membersRes.json();
    assert(members.length >= 1);
    const anna = members.find(m => m.id === 'p_anna_bergmann');
    assert(anna, 'Anna Bergmann muss im Vorstand sein');
    assert.strictEqual(anna.board_position, '1_VORSITZ');

    // 2. Vorstandswechsel an Michael Bauer übergeben
    const handoverRes = await fetch(`${BASE_URL}/api/board/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_parent_id: 'p_anna_bergmann',
        new_parent_id: 'p_michael_bauer',
        position: '1_VORSITZ',
        notes: 'Ordentliche Übergabe auf der Mitgliederversammlung 2026'
      })
    });
    assert.strictEqual(handoverRes.status, 200);
    const handoverJson = await handoverRes.json();
    assert.strictEqual(handoverJson.success, true);

    // 3. Prüfen: Michael Bauer ist jetzt 1. Vorsitzender
    const verifyRes = await fetch(`${BASE_URL}/api/board/members`);
    const updatedMembers = await verifyRes.json();
    const michael = updatedMembers.find(m => m.id === 'p_michael_bauer');
    assert(michael, 'Michael Bauer muss jetzt im Vorstand sein');
    assert.strictEqual(michael.board_position, '1_VORSITZ');

    // 4. Zurückübergeben an Anna Bergmann für konsistente Demo-Daten
    await fetch(`${BASE_URL}/api/board/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_parent_id: 'p_michael_bauer',
        new_parent_id: 'p_anna_bergmann',
        position: '1_VORSITZ',
        notes: 'Rückübergabe'
      })
    });
  });

  // ---------------------------------------------------------------------------
  // 43. LAGE.APP PARITY: ELTERNDIENST-BÖRSE & PFLICHTSTUNDEN
  // ---------------------------------------------------------------------------
  let testDutyId = null;
  let testSignupId = null;
  await check('43. LAGE.app Parity: Elterndienst-Börse & Pflichtstunden-Tracking', async () => {
    // 1. Neuen Dienst anlegen
    const createRes = await fetch(`${BASE_URL}/api/parent-duties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Frühlings-Pflanzaktion & Hochbeete',
        description: 'Neue Kräuter und Tomaten mit den Kindern anpflanzen',
        category: 'GARTEN',
        hours_credit: 3.5,
        max_helpers: 5,
        date: '2026-11-20',
        time_start: '10:00',
        time_end: '13:30',
        location: 'Kita-Garten'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert(createData.id);
    testDutyId = createData.id;

    // 2. Als Michael Bauer für den Dienst anmelden
    const signupRes = await fetch(`${BASE_URL}/api/parent-duties/${testDutyId}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: 'p_michael_bauer' })
    });
    assert.strictEqual(signupRes.status, 201);
    const signupData = await signupRes.json();
    assert(signupData.signupId);
    testSignupId = signupData.signupId;

    // 3. Stunden durch Leitung bestätigen & gutschreiben
    const confirmRes = await fetch(`${BASE_URL}/api/parent-duties/${testDutyId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signup_id: testSignupId,
        hours_credited: 3.5,
        confirmed_by: 'Sabine Weber (Leitung)'
      })
    });
    assert.strictEqual(confirmRes.status, 200);
    const confirmData = await confirmRes.json();
    assert.strictEqual(confirmData.success, true);

    // 4. Familien-Pflichtstunden abfragen
    const statsRes = await fetch(`${BASE_URL}/api/parent-duties/family-stats?parent_id=p_michael_bauer`);
    assert.strictEqual(statsRes.status, 200);
    const stats = await statsRes.json();
    assert.strictEqual(stats.parent_id, 'p_michael_bauer');
    assert(stats.completed_hours >= 3.5);
  });

  // ---------------------------------------------------------------------------
  // 44. LAGE.APP PARITY: BLITZ-UMFRAGEN & ABSTIMMUNGEN
  // ---------------------------------------------------------------------------
  let testPollId = null;
  await check('44. LAGE.app Parity: Blitz-Umfragen & Abstimmungen', async () => {
    // 1. Neue Umfrage anlegen
    const createRes = await fetch(`${BASE_URL}/api/polls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Lieblingsgericht für das Bio-Catering',
        question: 'Welches Gericht soll öfter auf den Speiseplan?',
        category: 'VERPFLEGUNG',
        options: ['Vollkorn-Pasta mit Gemüsebolognese', 'Kartoffel-Kürbis-Suppe mit Croutons', 'Bio-Reispfanne mit Erbsen & Tofu']
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert(createData.pollId);
    testPollId = createData.pollId;

    // 2. Umfragen abrufen
    const pollsRes = await fetch(`${BASE_URL}/api/polls?parent_id=p_michael_bauer`);
    assert.strictEqual(pollsRes.status, 200);
    const polls = await pollsRes.json();
    const myPoll = polls.find(p => p.id === testPollId);
    assert(myPoll, 'Neue Umfrage muss in der Liste sein');
    assert.strictEqual(myPoll.options.length, 3);
    assert.strictEqual(myPoll.user_has_voted, false);

    // 3. Stimme abgeben
    const firstOptionId = myPoll.options[0].id;
    const voteRes = await fetch(`${BASE_URL}/api/polls/${testPollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_id: 'p_michael_bauer',
        option_id: firstOptionId
      })
    });
    assert.strictEqual(voteRes.status, 200);
    const voteJson = await voteRes.json();
    assert.strictEqual(voteJson.success, true);

    // 4. Doppel-Abstimmung muss abgewiesen werden
    const doubleVoteRes = await fetch(`${BASE_URL}/api/polls/${testPollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_id: 'p_michael_bauer',
        option_id: firstOptionId
      })
    });
    assert.strictEqual(doubleVoteRes.status, 400);
  });

  // ---------------------------------------------------------------------------
  // 45. LAGE.APP PARITY: DIGITALE VERTRÄGE & UNTERSCHRIFTEN
  // ---------------------------------------------------------------------------
  await check('45. LAGE.app Parity: Digitale Dokumente & Signaturen', async () => {
    // 1. Dokumente für Michael Bauer abrufen
    const docsRes = await fetch(`${BASE_URL}/api/documents?parent_id=p_michael_bauer`);
    assert.strictEqual(docsRes.status, 200);
    const docs = await docsRes.json();
    assert(docs.length >= 1);
    const testDoc = docs.find(d => d.id === 'doc_2');
    assert(testDoc, 'doc_2 muss existieren');

    // 2. Dokument digital signieren
    const signRes = await fetch(`${BASE_URL}/api/documents/doc_2/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signature_data: 'data:image/svg+xml;base64,PHN2Zz48cGF0aCBkPSJNMTAgMTBMMTAwIDEwMCIvPjwvc3ZnPg==',
        signed_by_name: 'Michael Bauer'
      })
    });
    assert.strictEqual(signRes.status, 200);
    const signJson = await signRes.json();
    assert.strictEqual(signJson.success, true);

    // 3. Prüfen: Status ist jetzt SIGNED
    const verifyDocsRes = await fetch(`${BASE_URL}/api/documents?parent_id=p_michael_bauer`);
    const updatedDocs = await verifyDocsRes.json();
    const signedDoc = updatedDocs.find(d => d.id === 'doc_2');
    assert.strictEqual(signedDoc.status, 'SIGNED');
    assert.strictEqual(signedDoc.signed_by_name, 'Michael Bauer');
    assert(signedDoc.signed_at);
  });

  // ---------------------------------------------------------------------------
  // 46. DEDIZIERTE KIOSK-GERÄTE (TABLET-APP)
  // ---------------------------------------------------------------------------
  await check('46. Dedicated Kiosk Devices Listing', async () => {
    const res = await fetch(`${BASE_URL}/api/kiosk-devices`);
    assert.strictEqual(res.status, 200);
    const devices = await res.json();
    assert(devices.length >= 4);
    const u3Tablet = devices.find(d => d.group_id === 'g_u3_maeuse');
    assert(u3Tablet, 'U3 Gruppen-Tablet muss vorhanden sein');
    assert.strictEqual(u3Tablet.pin, '1234');
  });

  // ---------------------------------------------------------------------------
  // 47. ELTERNPORTAL & ELTERN-APP: OVERVIEW API
  // ---------------------------------------------------------------------------
  await check('47. Parent Portal Overview API for Anna Bergmann', async () => {
    const res = await fetch(`${BASE_URL}/api/parents/p_anna_bergmann/overview`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    // Parent details
    assert.strictEqual(data.parent.name, 'Anna Bergmann');
    assert.strictEqual(data.parent.role, 'VORSTAND');
    assert.strictEqual(data.parent.mandatory_hours, 20);

    // Linked child Leo Bergmann
    assert(data.children.length >= 1);
    const child = data.children.find(c => c.id === 'c_u3_1');
    assert(child, 'Kind von Anna Bergmann muss vorhanden sein');
    assert.strictEqual(child.group_name, 'Krabbelmäuse (Krippe U3)');
    assert(child.health, 'Gesundheitsakte muss existieren');
    assert(Array.isArray(child.emergency_contacts), 'Notfallkontakte müssen Array sein');
    assert(Array.isArray(child.pickup_authorizations), 'Abholberechtigungen müssen Array sein');
    assert(Array.isArray(child.daily_logs), 'Tagesberichte müssen Array sein');

    // Duties, Polls, Documents
    assert(data.duties);
    assert(Array.isArray(data.polls));
    assert(Array.isArray(data.documents));
    assert(Array.isArray(data.announcements));
  });

  // ---------------------------------------------------------------------------
  // 48. ELTERNPORTAL: 1-KLICK KRANKMELDUNG & ABHOLBERECHTIGUNG
  // ---------------------------------------------------------------------------
  await check('48. Parent Portal: 1-Click Sick Report & Pickup Authorization', async () => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Mia Bergmann heute krankmelden und Essen abbestellen
    const absentRes = await fetch(`${BASE_URL}/api/parents/p_anna_bergmann/children/c_u3_1/mark-absent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        status: 'ABSENT_SICK',
        reason: 'Grippaler Infekt & Fieber',
        cancel_meal: true
      })
    });
    assert.strictEqual(absentRes.status, 200);
    const absentData = await absentRes.json();
    assert.strictEqual(absentData.success, true);
    assert(absentData.message.includes('Mittagessen ist abbestellt'));

    // 2. Abholberechtigung für Großmutter hinzufügen
    const authRes = await fetch(`${BASE_URL}/api/parents/p_anna_bergmann/pickup-authorizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: 'c_u3_1',
        name: 'Helga Bergmann',
        relationship: 'Großmutter',
        phone: '0171-8877665',
        notes: 'Darf Mia jeden Donnerstag nach dem Mittagsschlaf abholen'
      })
    });
    assert.strictEqual(authRes.status, 201);
    const authData = await authRes.json();
    assert.strictEqual(authData.success, true);
    assert(authData.id);

    // 3. Unbefugter Elternteil darf kein fremdes Kind abmelden (Security check)
    const unauthorizedRes = await fetch(`${BASE_URL}/api/parents/p_michael_bauer/children/c_u3_1/mark-absent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        status: 'ABSENT_SICK'
      })
    });
    assert.strictEqual(unauthorizedRes.status, 403);
  });

  console.log(`\n========================================`);
  console.log(`🎯 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

testAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
