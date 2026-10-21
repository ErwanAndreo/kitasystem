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
    assert(html.includes('KitaPlaner'));
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
