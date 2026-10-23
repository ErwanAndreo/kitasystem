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
    `).all(today, today).map((s: any) => {
      const certs = db.prepare('SELECT * FROM staff_certifications WHERE staff_id = ? ORDER BY expires_at ASC').all(s.id).map((c: any) => {
        const expDate = new Date(c.expires_at);
        const nowDate = new Date(today);
        const diffDays = Math.ceil((expDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...c,
          days_until_expiry: diffDays,
          is_expired: diffDays < 0,
          expires_soon: diffDays >= 0 && diffDays <= 60
        };
      });

      return {
        ...s,
        skills: JSON.parse(s.skills || '[]'),
        secondary_roles: JSON.parse(s.secondary_roles || '[]'),
        certifications: certs
      };
    });

    res.json(staffList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1.1 QUALIFICATIONS & CERTIFICATIONS EXPIRY TRACKING
app.get('/api/certifications', (req, res) => {
  try {
    const { staff_id } = req.query;
    let query = `
      SELECT c.*, s.name as staff_name, s.role as staff_role
      FROM staff_certifications c
      JOIN staff s ON c.staff_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (staff_id) {
      query += ` AND c.staff_id = ?`;
      params.push(staff_id);
    }
    query += ` ORDER BY c.expires_at ASC`;
    const today = format(new Date(), 'yyyy-MM-dd');
    const certs = db.prepare(query).all(...params).map((c: any) => {
      const expDate = new Date(c.expires_at);
      const nowDate = new Date(today);
      const diffDays = Math.ceil((expDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...c,
        days_until_expiry: diffDays,
        is_expired: diffDays < 0,
        expires_soon: diffDays >= 0 && diffDays <= 60
      };
    });
    res.json(certs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/certifications/alerts', (req, res) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const certs = db.prepare(`
      SELECT c.*, s.name as staff_name, s.role as staff_role
      FROM staff_certifications c
      JOIN staff s ON c.staff_id = s.id
      WHERE c.expires_at <= date(?, '+60 days')
      ORDER BY c.expires_at ASC
    `).all(today).map((c: any) => {
      const expDate = new Date(c.expires_at);
      const nowDate = new Date(today);
      const diffDays = Math.ceil((expDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...c,
        days_until_expiry: diffDays,
        is_expired: diffDays < 0,
        expires_soon: diffDays >= 0 && diffDays <= 60
      };
    });
    res.json(certs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/certifications', (req, res) => {
  try {
    const { staff_id, type, title, issue_date, expires_at, institution, notes } = req.body;
    const id = 'cert_' + Date.now();
    db.prepare(`
      INSERT INTO staff_certifications (id, staff_id, type, title, issue_date, expires_at, institution, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, staff_id, type, title, issue_date || null, expires_at, institution || '', notes || '');
    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/certifications/:id', (req, res) => {
  try {
    const { type, title, issue_date, expires_at, institution, notes } = req.body;
    db.prepare(`
      UPDATE staff_certifications SET 
        type = ?, title = ?, issue_date = ?, expires_at = ?, institution = ?, notes = ?
      WHERE id = ?
    `).run(type, title, issue_date || null, expires_at, institution || '', notes || '', req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/certifications/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM staff_certifications WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1.2 ONENOTE-STYLE DIRECTOR NOTEBOOK
app.get('/api/director-notes', (req, res) => {
  try {
    const { category, search } = req.query;
    let query = `SELECT * FROM director_notes WHERE 1=1`;
    const params: any[] = [];
    if (category && category !== 'ALL') {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (search) {
      query += ` AND (title LIKE ? OR content LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY is_pinned DESC, updated_at DESC`;
    const notes = db.prepare(query).all(...params).map((n: any) => ({
      ...n,
      checklist: JSON.parse(n.checklist || '[]')
    }));
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/director-notes', (req, res) => {
  try {
    const { category, title, content, color, is_pinned, checklist } = req.body;
    const id = 'note_' + Date.now();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO director_notes (id, category, title, content, color, is_pinned, checklist, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, category || 'ALLGEMEIN', title || 'Neue Notiz', content || '',
      color || '#fef08a', is_pinned ? 1 : 0, JSON.stringify(checklist || []),
      now, now
    );
    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/director-notes/:id', (req, res) => {
  try {
    const { category, title, content, color, is_pinned, checklist } = req.body;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE director_notes SET
        category = ?, title = ?, content = ?, color = ?, is_pinned = ?, checklist = ?, updated_at = ?
      WHERE id = ?
    `).run(
      category || 'ALLGEMEIN', title, content || '',
      color || '#fef08a', is_pinned ? 1 : 0, JSON.stringify(checklist || []),
      now, req.params.id
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/director-notes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM director_notes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 1.3 CHECKLISTS (TEAM-WEIT DURCH LEITUNG ODER PERSÖNLICH MIT TEILEN-OPTION)
// ---------------------------------------------------------------------------
const DEFAULT_SHARE_FAVORITES = [
  { id: 'fav_gesamt', type: 'GESAMT', label: 'Gesamt (Alle)', icon: 'users', targetId: null, targetName: null },
  { id: 'fav_today_group', type: 'TODAY_GROUP', label: 'Heutige Gruppe', icon: 'clock-group', targetId: null, targetName: null },
  { id: 'fav_leitung', type: 'LEITUNG', label: 'Leitung', icon: 'shield-check', targetId: null, targetName: null }
];

function getStaffFavorites(staffId: string) {
  const row = db.prepare('SELECT share_favorites FROM staff WHERE id = ?').get(staffId) as any;
  if (!row || !row.share_favorites) return [...DEFAULT_SHARE_FAVORITES];
  try {
    const parsed = JSON.parse(row.share_favorites);
    if (Array.isArray(parsed) && parsed.length === 3) {
      return parsed;
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      const res = [...parsed];
      while (res.length < 3) {
        res.push(DEFAULT_SHARE_FAVORITES[res.length]);
      }
      return res.slice(0, 3);
    }
    return [...DEFAULT_SHARE_FAVORITES];
  } catch (_) {
    return [...DEFAULT_SHARE_FAVORITES];
  }
}

// Share favorites endpoints
app.get('/api/staff/:id/share-favorites', (req, res) => {
  try {
    const { id } = req.params;
    const favorites = getStaffFavorites(id);
    res.json(favorites);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/staff/:id/share-favorites', (req, res) => {
  try {
    const { id } = req.params;
    const { favorite, replaceIndex } = req.body;
    if (!favorite) return res.status(400).json({ error: 'Favorite data is required' });

    const currentFavs = getStaffFavorites(id);
    const newFav = {
      id: favorite.id || 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: favorite.type, // 'GROUP' | 'PERSON' | 'LEITUNG' | 'GESAMT' | 'TODAY_GROUP'
      label: favorite.label,
      icon: favorite.icon || (favorite.type === 'GROUP' ? 'users-group' : favorite.type === 'PERSON' ? 'user' : 'star'),
      targetId: favorite.targetId || null,
      targetName: favorite.targetName || favorite.label,
      updatedAt: Date.now()
    };

    let targetSlot = 2; // Default replacement starts at bottom (slot 3, index 2: Leitung)
    if (typeof replaceIndex === 'number' && replaceIndex >= 0 && replaceIndex < 3) {
      targetSlot = replaceIndex;
    } else {
      // Bottom-up replacement rule:
      // Index 2 (Leitung) -> Index 1 (Heutige Gruppe) -> Index 0 (Gesamt)
      if (currentFavs[2].id === 'fav_leitung' || currentFavs[2].type === 'LEITUNG') {
        targetSlot = 2;
      } else if (currentFavs[1].id === 'fav_today_group' || currentFavs[1].type === 'TODAY_GROUP') {
        targetSlot = 1;
      } else if (currentFavs[0].id === 'fav_gesamt' || currentFavs[0].type === 'GESAMT') {
        targetSlot = 0;
      } else {
        // All 3 custom: replace the one with oldest updatedAt or cycle 2 -> 1 -> 0
        const sortedByTime = [
          { idx: 2, time: (currentFavs[2] as any).updatedAt || 0 },
          { idx: 1, time: (currentFavs[1] as any).updatedAt || 0 },
          { idx: 0, time: (currentFavs[0] as any).updatedAt || 0 }
        ].sort((a, b) => a.time - b.time);
        targetSlot = sortedByTime[0].idx;
      }
    }

    currentFavs[targetSlot] = newFav;
    db.prepare('UPDATE staff SET share_favorites = ? WHERE id = ?').run(JSON.stringify(currentFavs), id);

    res.json({
      success: true,
      replacedIndex: targetSlot,
      favorites: currentFavs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/staff/:id/share-favorites', (req, res) => {
  try {
    const { id } = req.params;
    const { favorites } = req.body;
    if (!Array.isArray(favorites) || favorites.length !== 3) {
      return res.status(400).json({ error: 'Genau 3 Favoriten erforderlich' });
    }
    db.prepare('UPDATE staff SET share_favorites = ? WHERE id = ?').run(JSON.stringify(favorites), id);
    res.json({ success: true, favorites });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/staff/:id/share-favorites/reset', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE staff SET share_favorites = ? WHERE id = ?').run(JSON.stringify(DEFAULT_SHARE_FAVORITES), id);
    res.json({ success: true, favorites: DEFAULT_SHARE_FAVORITES });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/checklists', (req, res) => {
  try {
    const { staff_id } = req.query as { staff_id?: string };
    
    // Fetch all checklists
    const allLists = db.prepare('SELECT * FROM checklists ORDER BY is_shared DESC, created_at DESC').all() as any[];

    let currentStaff: any = null;
    let todayGroupId: string | null = null;

    if (staff_id) {
      currentStaff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staff_id);
      const today = new Date().toISOString().split('T')[0];
      const todayShift = db.prepare(`
        SELECT group_id FROM shifts 
        WHERE staff_id = ? AND date = ? AND status != 'CANCELLED'
        LIMIT 1
      `).get(staff_id, today) as any;
      todayGroupId = todayShift?.group_id || currentStaff?.target_group_id || null;
    }

    const filtered = allLists.filter((c: any) => {
      // If no staff_id specified (e.g. general overview), return all
      if (!staff_id) return true;

      // 1. Creator ALWAYS sees their checklist! ("dem ersteller aber immer")
      if (c.created_by_id === staff_id) return true;

      // 2. If private, only creator can see it
      if (!c.is_shared) return false;

      const scope = c.share_scope || 'ALL';

      // 3. Overall sharing ("Gesamt" / "ALL") -> everyone sees it
      if (scope === 'ALL') return true;

      // 4. "LEITUNG" -> only management / admin sees it
      if (scope === 'LEITUNG') {
        return currentStaff?.role === 'LEITUNG' || currentStaff?.role === 'ADMIN' || staff_id === 's_sabine';
      }

      // 5. "TODAY_GROUP" or "GROUP" -> visible if the staff is working in that group today or assigned to it
      if (scope === 'TODAY_GROUP' || scope === 'GROUP') {
        if (!c.shared_group_id) return true;
        // Check if current staff is scheduled in that group today
        if (todayGroupId && c.shared_group_id === todayGroupId) return true;
        if (currentStaff?.target_group_id && c.shared_group_id === currentStaff.target_group_id) return true;
        // Leitung always has access to group checklists
        if (currentStaff?.role === 'LEITUNG' || currentStaff?.role === 'ADMIN' || staff_id === 's_sabine') return true;
        return false;
      }

      // 6. "PERSONS" -> visible if staff_id is in shared_staff_ids
      if (scope === 'PERSONS') {
        try {
          const ids: string[] = JSON.parse(c.shared_staff_ids || '[]');
          if (ids.includes(staff_id)) return true;
        } catch (_) {}
        if (currentStaff?.role === 'LEITUNG' || currentStaff?.role === 'ADMIN' || staff_id === 's_sabine') return true;
        return false;
      }

      return false;
    });

    const lists = filtered.map((c: any) => {
      const items = JSON.parse(c.items || '[]');
      const completed = items.filter((i: any) => i.done).length;
      return {
        ...c,
        is_shared: Boolean(c.is_shared),
        shared_staff_ids: JSON.parse(c.shared_staff_ids || '[]'),
        shared_staff_names: JSON.parse(c.shared_staff_names || '[]'),
        items,
        total_items: items.length,
        completed_items: completed,
        progress_percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0
      };
    });
    res.json(lists);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checklists', (req, res) => {
  try {
    let { 
      title, category, created_by_id, created_by_name, 
      is_shared, share_scope, shared_group_id, shared_group_name, 
      shared_staff_ids, shared_staff_names,
      color, items 
    } = req.body;
    if (!title) return res.status(400).json({ error: 'Titel ist erforderlich' });

    const id = 'chk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const now = new Date().toISOString();
    const parsedItems = items || [];
    const creatorId = created_by_id || 's_sabine';
    const creatorName = created_by_name || 'Sabine Weber (Leitung)';

    // Scope defaults
    let finalScope = share_scope || (is_shared ? 'ALL' : 'PRIVATE');
    let finalShared = is_shared !== undefined ? (is_shared ? 1 : 0) : (finalScope !== 'PRIVATE' ? 1 : 0);
    if (finalScope === 'PRIVATE') {
      finalShared = 0;
    }

    // Auto-resolve "TODAY_GROUP" if not provided
    if ((finalScope === 'TODAY_GROUP' || finalScope === 'GROUP') && !shared_group_id) {
      const today = new Date().toISOString().split('T')[0];
      const shift = db.prepare(`
        SELECT s.group_id, g.name as group_name 
        FROM shifts s 
        LEFT JOIN groups g ON s.group_id = g.id 
        WHERE s.staff_id = ? AND s.date = ? AND s.status != 'CANCELLED' 
        LIMIT 1
      `).get(creatorId, today) as any;
      if (shift && shift.group_id) {
        shared_group_id = shift.group_id;
        shared_group_name = shift.group_name || 'Heutige Gruppe';
      } else {
        const staffObj = db.prepare(`
          SELECT s.target_group_id, g.name as group_name 
          FROM staff s 
          LEFT JOIN groups g ON s.target_group_id = g.id 
          WHERE s.id = ?
        `).get(creatorId) as any;
        shared_group_id = staffObj?.target_group_id || 'g_u3_maeuse';
        shared_group_name = staffObj?.group_name || 'Mäusegruppe (U3)';
      }
    }

    const staffIdsJson = Array.isArray(shared_staff_ids) ? JSON.stringify(shared_staff_ids) : (shared_staff_ids || '[]');
    const staffNamesJson = Array.isArray(shared_staff_names) ? JSON.stringify(shared_staff_names) : (shared_staff_names || '[]');

    db.prepare(`
      INSERT INTO checklists (
        id, title, category, created_by_id, created_by_name, 
        is_shared, share_scope, shared_group_id, shared_group_name, 
        shared_staff_ids, shared_staff_names, 
        color, items, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      category || 'ROUTINE',
      creatorId,
      creatorName,
      finalShared,
      finalScope,
      shared_group_id || null,
      shared_group_name || null,
      staffIdsJson,
      staffNamesJson,
      color || '#3b82f6',
      JSON.stringify(parsedItems),
      now,
      now
    );

    const created = db.prepare('SELECT * FROM checklists WHERE id = ?').get(id) as any;
    res.status(201).json({
      ...created,
      is_shared: Boolean(created.is_shared),
      shared_staff_ids: JSON.parse(created.shared_staff_ids || '[]'),
      shared_staff_names: JSON.parse(created.shared_staff_names || '[]'),
      items: JSON.parse(created.items || '[]'),
      total_items: parsedItems.length,
      completed_items: parsedItems.filter((i: any) => i.done).length,
      progress_percent: parsedItems.length > 0 ? Math.round((parsedItems.filter((i: any) => i.done).length / parsedItems.length) * 100) : 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/checklists/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, category, is_shared, share_scope, 
      shared_group_id, shared_group_name, 
      shared_staff_ids, shared_staff_names, 
      color, items 
    } = req.body;
    const existing = db.prepare('SELECT * FROM checklists WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Checkliste nicht gefunden' });

    const newTitle = title !== undefined ? title : existing.title;
    const newCategory = category !== undefined ? category : existing.category;
    let newShared = is_shared !== undefined ? (is_shared ? 1 : 0) : existing.is_shared;
    let newScope = share_scope !== undefined ? share_scope : existing.share_scope;
    if (is_shared === true && (!share_scope || newScope === 'PRIVATE')) {
      newScope = 'ALL';
      newShared = 1;
    } else if (is_shared === false || newScope === 'PRIVATE') {
      newScope = 'PRIVATE';
      newShared = 0;
    }

    const newGroupId = shared_group_id !== undefined ? shared_group_id : existing.shared_group_id;
    const newGroupName = shared_group_name !== undefined ? shared_group_name : existing.shared_group_name;
    const newStaffIds = shared_staff_ids !== undefined 
      ? (Array.isArray(shared_staff_ids) ? JSON.stringify(shared_staff_ids) : shared_staff_ids)
      : existing.shared_staff_ids;
    const newStaffNames = shared_staff_names !== undefined 
      ? (Array.isArray(shared_staff_names) ? JSON.stringify(shared_staff_names) : shared_staff_names)
      : existing.shared_staff_names;
    const newColor = color !== undefined ? color : existing.color;
    const newItems = items !== undefined ? JSON.stringify(items) : existing.items;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE checklists 
      SET title = ?, category = ?, is_shared = ?, share_scope = ?, 
          shared_group_id = ?, shared_group_name = ?, 
          shared_staff_ids = ?, shared_staff_names = ?, 
          color = ?, items = ?, updated_at = ?
      WHERE id = ?
    `).run(
      newTitle, newCategory, newShared, newScope, 
      newGroupId, newGroupName, 
      newStaffIds, newStaffNames, 
      newColor, newItems, now, id
    );

    const updated = db.prepare('SELECT * FROM checklists WHERE id = ?').get(id) as any;
    const parsedItems = JSON.parse(updated.items || '[]');
    const completed = parsedItems.filter((i: any) => i.done).length;

    res.json({
      ...updated,
      is_shared: Boolean(updated.is_shared),
      shared_staff_ids: JSON.parse(updated.shared_staff_ids || '[]'),
      shared_staff_names: JSON.parse(updated.shared_staff_names || '[]'),
      items: parsedItems,
      total_items: parsedItems.length,
      completed_items: completed,
      progress_percent: parsedItems.length > 0 ? Math.round((completed / parsedItems.length) * 100) : 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/checklists/:id/toggle-item', (req, res) => {
  try {
    const { id } = req.params;
    const { item_id, completed_by } = req.body;
    const existing = db.prepare('SELECT * FROM checklists WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Checkliste nicht gefunden' });

    const items = JSON.parse(existing.items || '[]');
    const targetItem = items.find((i: any) => i.id === item_id);
    if (!targetItem) return res.status(404).json({ error: 'Item nicht gefunden' });

    targetItem.done = !targetItem.done;
    if (targetItem.done) {
      targetItem.completed_by = completed_by || 'Mitarbeiter';
      targetItem.completed_at = new Date().toISOString();
    } else {
      delete targetItem.completed_by;
      delete targetItem.completed_at;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE checklists SET items = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(items), now, id);

    const completed = items.filter((i: any) => i.done).length;
    res.json({
      success: true,
      items,
      total_items: items.length,
      completed_items: completed,
      progress_percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checklists/:id/items', (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text ist erforderlich' });

    const existing = db.prepare('SELECT * FROM checklists WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Checkliste nicht gefunden' });

    const items = JSON.parse(existing.items || '[]');
    const newItem = {
      id: 'i_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      text,
      done: false
    };
    items.push(newItem);

    const now = new Date().toISOString();
    db.prepare('UPDATE checklists SET items = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(items), now, id);

    res.status(201).json({ success: true, item: newItem, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/checklists/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM checklists WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/staff', (req, res) => {
  try {
    const { 
      name, email, phone, role, qualification, is_fachkraft, 
      weekly_hours, work_days, annual_vacation_days, target_group_id, pin, color,
      skills, secondary_roles, can_spring,
      standard_work_hours, availability_window,
      username, password
    } = req.body;

    const id = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const avatar = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const finalUsername = (username && username.trim().length > 0) ? username.trim() : 'admin';
    const finalPassword = (password && password.trim().length > 0) ? password.trim() : 'admin';

    db.prepare(`
      INSERT INTO staff (
        id, name, email, phone, role, qualification, is_fachkraft, 
        weekly_hours, work_days, annual_vacation_days, target_group_id, pin, avatar, color, is_active,
        skills, secondary_roles, can_spring, standard_work_hours, availability_window,
        username, password, password_changed
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id, name, email || '', phone || '', role || 'ERZIEHER', qualification || 'Erzieher', is_fachkraft ? 1 : 0, 
      weekly_hours || 39.0, work_days || 5, annual_vacation_days || 30, target_group_id || null, 
      pin || '1234', avatar, color || '#16a34a',
      JSON.stringify(skills || ['FACHKRAFT', 'ERSTE_HILFE_KIND']),
      JSON.stringify(secondary_roles || []),
      can_spring ? 1 : 0,
      standard_work_hours || '08:00 - 16:30',
      availability_window || 'Mo-Fr 07:30 - 17:00',
      finalUsername,
      finalPassword
    );

    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    db.prepare(`
      INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
      VALUES (?, ?, 'HOURS_CHANGE', 'Mitarbeiter-Konto eingerichtet (Standard-Login: admin / admin)', ?, 'Sabine Weber (Leitung)', ?, 0)
    `).run(
      logId, id, 
      `Konto angelegt mit ${weekly_hours || 39.0} Std./Woche (${work_days || 5} Tage), ${annual_vacation_days || 30} Urlaubstage. Standard-Zugang: ${finalUsername} / ${finalPassword}.`, 
      new Date().toISOString()
    );

    const created = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any;
    res.status(201).json({
      ...created,
      skills: JSON.parse(created.skills || '[]'),
      secondary_roles: JSON.parse(created.secondary_roles || '[]')
    });
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
      skills, secondary_roles, can_spring,
      standard_work_hours, availability_window,
      username, password
    } = req.body;

    const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
    if (!existing) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    const newName = name !== undefined ? name : existing.name;
    const newEmail = email !== undefined ? email : existing.email;
    const newPhone = phone !== undefined ? phone : existing.phone;
    const newRole = role !== undefined ? role : existing.role;
    const newQual = qualification !== undefined ? qualification : existing.qualification;
    const newFachkraft = is_fachkraft !== undefined ? (is_fachkraft ? 1 : 0) : existing.is_fachkraft;
    const newWeekly = weekly_hours !== undefined ? weekly_hours : existing.weekly_hours;
    const newWorkDays = work_days !== undefined ? work_days : existing.work_days;
    const newVacation = annual_vacation_days !== undefined ? annual_vacation_days : existing.annual_vacation_days;
    const newGroup = target_group_id !== undefined ? target_group_id : existing.target_group_id;
    const newPin = pin !== undefined ? pin : existing.pin;
    const newColor = color !== undefined ? color : existing.color;
    const newSkills = skills !== undefined ? JSON.stringify(skills) : existing.skills;
    const newRoles = secondary_roles !== undefined ? JSON.stringify(secondary_roles) : existing.secondary_roles;
    const newSpring = can_spring !== undefined ? (can_spring ? 1 : 0) : existing.can_spring;
    const newStd = standard_work_hours !== undefined ? standard_work_hours : (existing.standard_work_hours || '08:00 - 16:30');
    const newAvail = availability_window !== undefined ? availability_window : (existing.availability_window || 'Mo-Fr 07:30 - 17:00');
    const newUsername = username !== undefined ? username : existing.username;
    const newPassword = password !== undefined ? password : existing.password;
    const newPasswordChanged = password !== undefined && password !== 'admin' ? 1 : existing.password_changed;
    const newCriticalAlerts = req.body.critical_alerts_mode !== undefined ? req.body.critical_alerts_mode : (existing.critical_alerts_mode || 'CRITICAL');

    db.prepare(`
      UPDATE staff SET 
        name = ?, email = ?, phone = ?, role = ?, qualification = ?, is_fachkraft = ?,
        weekly_hours = ?, work_days = ?, annual_vacation_days = ?, target_group_id = ?, pin = ?, color = ?,
        skills = ?, secondary_roles = ?, can_spring = ?,
        standard_work_hours = ?, availability_window = ?,
        username = ?, password = ?, password_changed = ?, critical_alerts_mode = ?
      WHERE id = ?
    `).run(
      newName, newEmail, newPhone, newRole, newQual, newFachkraft,
      newWeekly, newWorkDays, newVacation, newGroup, newPin, newColor,
      newSkills, newRoles, newSpring,
      newStd, newAvail,
      newUsername, newPassword, newPasswordChanged, newCriticalAlerts,
      staffId
    );

    if (weekly_hours !== undefined && existing.weekly_hours !== weekly_hours) {
      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      db.prepare(`
        INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
        VALUES (?, ?, 'HOURS_CHANGE', 'Vertragliche Wochenstunden angepasst', ?, 'Sabine Weber (Leitung)', ?, 0)
      `).run(
        logId, staffId,
        `Deine Wochenstunden wurden von ${existing.weekly_hours}h auf ${weekly_hours}h angepasst.`,
        new Date().toISOString()
      );
    }

    const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
    res.json({
      ...updated,
      skills: JSON.parse(updated.skills || '[]'),
      secondary_roles: JSON.parse(updated.secondary_roles || '[]')
    });
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
// 1.4 NOTIFICATION SETTINGS & CRITICAL ALERTS (KRITISCH vs. EINFACH)
// ---------------------------------------------------------------------------
app.get('/api/staff/:id/notification-settings', (req, res) => {
  try {
    const staff = db.prepare('SELECT id, name, role, critical_alerts_mode FROM staff WHERE id = ?').get(req.params.id) as any;
    if (!staff) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });
    res.json({
      staff_id: staff.id,
      name: staff.name,
      role: staff.role,
      critical_alerts_mode: staff.critical_alerts_mode || 'CRITICAL'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/staff/:id/notification-settings', (req, res) => {
  try {
    const { critical_alerts_mode } = req.body;
    const mode = critical_alerts_mode === 'SIMPLE' ? 'SIMPLE' : 'CRITICAL';
    const staff = db.prepare('SELECT id, name, role, critical_alerts_mode FROM staff WHERE id = ?').get(req.params.id) as any;
    if (!staff) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    db.prepare('UPDATE staff SET critical_alerts_mode = ? WHERE id = ?').run(mode, req.params.id);

    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    db.prepare(`
      INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
      VALUES (?, ?, 'SETTINGS', 'Benachrichtigungs-Modus angepasst', ?, ?, ?, 1)
    `).run(
      logId, 
      staff.id, 
      `Kritische Benachrichtigungen werden ab sofort '${mode === 'CRITICAL' ? 'KRITISCH (Notfall-Alarm)' : 'EINFACH (Standard)'}' gehandhabt.`,
      staff.name,
      new Date().toISOString()
    );

    res.json({
      success: true,
      staff_id: staff.id,
      critical_alerts_mode: mode,
      message: mode === 'CRITICAL' 
        ? 'Kritische Benachrichtigungen aktiviert: Bei Krankmeldungen & Notfall-Einspringen wird ein Notfall-Alarm ausgelöst.' 
        : 'Einfache Benachrichtigungen aktiviert: Meldungen werden als Standard-Nachrichten ohne Alarm gehandhabt.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/staff/:id/critical-alerts', (req, res) => {
  try {
    const staffId = req.params.id;
    const staffMember = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
    if (!staffMember) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    const alerts = db.prepare(`
      SELECT * FROM staff_audit_log
      WHERE staff_id = ? AND category = 'CRITICAL_ALERT' AND is_read = 0
      ORDER BY created_at DESC
    `).all(staffId);

    res.json({
      staff_id: staffId,
      critical_alerts_mode: staffMember.critical_alerts_mode || 'CRITICAL',
      alerts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/staff/:id/critical-alerts/:alert_id/dismiss', (req, res) => {
  try {
    db.prepare('UPDATE staff_audit_log SET is_read = 1 WHERE id = ? AND staff_id = ?').run(req.params.alert_id, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AUTHENTICATION & LOGIN (Default: admin / admin)
// ---------------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    // 1. Direct match on username/email/id and password in staff
    const staff = db.prepare(`
      SELECT * FROM staff 
      WHERE (username = ? OR email = ? OR id = ?) AND password = ?
    `).get(username, username, username, password) as any;

    if (staff) {
      const isLeitung = staff.role === 'LEITUNG';
      return res.json({
        success: true,
        message: 'Erfolgreich angemeldet',
        user_type: 'STAFF',
        user: {
          ...staff,
          skills: JSON.parse(staff.skills || '[]'),
          secondary_roles: JSON.parse(staff.secondary_roles || '[]'),
          portal_access: {
            web_leitung: isLeitung,
            web_mitarbeiter: true,
            web_eltern: false,
            app_mitarbeiter: true,
            app_eltern: false,
            kiosk_tablet: true
          }
        },
        is_default_password: staff.password === 'admin'
      });
    }

    // 2. Direct match on email/id and password in parent_accounts (Eltern & Vorstand)
    const parent = db.prepare(`
      SELECT * FROM parent_accounts 
      WHERE (email = ? OR id = ?) AND password_hash = ?
    `).get(username, username, password) as any;

    if (parent) {
      const isVorstand = parent.role === 'VORSTAND';
      return res.json({
        success: true,
        message: `Erfolgreich als ${isVorstand ? 'Vorstand' : 'Elternteil'} angemeldet`,
        user_type: 'PARENT',
        user: {
          id: parent.id,
          name: parent.name,
          email: parent.email,
          phone: parent.phone,
          role: parent.role,
          board_position: parent.board_position,
          mandatory_hours: parent.mandatory_hours,
          portal_access: {
            web_leitung: isVorstand, // Vorstand darf in die Leitungs-Webapp
            web_mitarbeiter: false,
            web_eltern: true,
            app_mitarbeiter: false,
            app_eltern: true,
            kiosk_tablet: false
          }
        },
        is_default_password: parent.password_hash === 'admin'
      });
    }

    // 3. Match on dedicated Kiosk tablet device (id or name + pin)
    const kiosk = db.prepare(`
      SELECT * FROM kiosk_devices
      WHERE (id = ? OR name = ?) AND pin = ?
    `).get(username, username, password) as any;

    if (kiosk) {
      return res.json({
        success: true,
        message: `Kiosk-Gerät erfolgreich autorisiert (${kiosk.name})`,
        user_type: 'KIOSK_DEVICE',
        user: {
          id: kiosk.id,
          name: kiosk.name,
          group_id: kiosk.group_id,
          role: 'KIOSK',
          portal_access: {
            web_leitung: false,
            web_mitarbeiter: false,
            web_eltern: false,
            app_mitarbeiter: false,
            app_eltern: false,
            kiosk_tablet: true
          }
        }
      });
    }

    // 4. Global fallback for standard initial admin / admin
    if (username === 'admin' && password === 'admin') {
      const leitung = db.prepare('SELECT * FROM staff WHERE role = ? LIMIT 1').get('LEITUNG') as any;
      if (leitung) {
        return res.json({
          success: true,
          message: 'Erfolgreich als Einrichtungsleitung mit Standard-Login (admin / admin) angemeldet',
          user_type: 'STAFF',
          user: {
            ...leitung,
            skills: JSON.parse(leitung.skills || '[]'),
            secondary_roles: JSON.parse(leitung.secondary_roles || '[]'),
            portal_access: {
              web_leitung: true,
              web_mitarbeiter: true,
              web_eltern: false,
              app_mitarbeiter: true,
              app_eltern: false,
              kiosk_tablet: true
            }
          },
          is_default_password: true
        });
      }
    }

    return res.status(401).json({ error: 'Ungültige Zugangsdaten. Standardmäßig lautet der Login: admin / admin' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { staff_id } = req.body;
    if (!staff_id) return res.status(400).json({ error: 'staff_id ist erforderlich' });

    db.prepare("UPDATE staff SET password = 'admin', password_changed = 0 WHERE id = ?").run(staff_id);
    res.json({ 
      success: true, 
      message: "Passwort erfolgreich auf Standard 'admin' zurückgesetzt (Login: admin / admin)" 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', (req, res) => {
  try {
    const { staff_id, old_password, new_password } = req.body;
    if (!staff_id || !new_password) {
      return res.status(400).json({ error: 'staff_id und new_password sind erforderlich' });
    }

    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staff_id) as any;
    if (!staff) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    if (old_password && staff.password !== old_password) {
      return res.status(400).json({ error: 'Das bisherige Passwort ist nicht korrekt' });
    }

    db.prepare('UPDATE staff SET password = ?, password_changed = 1 WHERE id = ?').run(new_password, staff_id);
    res.json({ success: true, message: 'Passwort erfolgreich geändert' });
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

    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
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
// 3. AUDIT LOG, 30-MIN NOTIFICATION QUEUE & AUTO-PILOT
// ---------------------------------------------------------------------------

export function queueStaffNotification(staffId: string, changeType: string, summary: string, details: any = {}) {
  try {
    const now = new Date();

    // 1. Check if the shift concerns the next 24 hours
    // Requirement: "wenn aber die schicht in den nächsten 24 std betrifft soll die benachrichtigung sofort raus"
    const shiftDateStr = details.date || (summary.match(/\d{4}-\d{2}-\d{2}/) ? summary.match(/\d{4}-\d{2}-\d{2}/)![0] : null);
    let isUrgentUnder24h = false;
    let hoursUntilShift: number | null = null;

    if (details.force_immediate === true) {
      isUrgentUnder24h = true;
    } else if (shiftDateStr) {
      const shiftTimeStr = details.start_time || '08:00';
      const shiftDateTime = new Date(`${shiftDateStr}T${shiftTimeStr}:00`);
      const diffMs = shiftDateTime.getTime() - now.getTime();
      hoursUntilShift = diffMs / (1000 * 60 * 60);

      // If the shift is within the next 24 hours (or today/currently ongoing)
      if (hoursUntilShift <= 24) {
        isUrgentUnder24h = true;
      }
    }

    if (isUrgentUnder24h) {
      // SOFORT-BENACHRICHTIGUNG: Direct delivery to staff_audit_log without waiting 30 minutes
      const logId = 'log_urgent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const isCancellation = changeType === 'SHIFT_CANCELLED';
      const urgentTitle = `🚨 SOFORT (<24h): ${isCancellation ? 'Schicht abgesagt' : 'Kurzfristige Schichtänderung'}`;
      const urgentDesc = `Sofortige Benachrichtigung (Dienst betrifft die nächsten 24 Stunden):\n${summary}`;

      db.prepare(`
        INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
        VALUES (?, ?, 'SHIFT_CHANGE', ?, ?, 'Sabine Weber (Leitung - Sofortbenachrichtigung)', ?, 0)
      `).run(logId, staffId, urgentTitle, urgentDesc, now.toISOString());

      // Save into notification_queue as SENT immediately for full history and auditability
      const nqId = 'nq_urgent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const urgentDetails = [{ changeType, summary, details, added_at: now.toISOString(), is_urgent: true, hours_until_shift: hoursUntilShift }];
      db.prepare(`
        INSERT INTO notification_queue (id, staff_id, change_type, summary, details, created_at, scheduled_for, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'SENT', ?)
      `).run(
        nqId,
        staffId,
        changeType,
        `[SOFORT <24h] ${summary}`,
        JSON.stringify(urgentDetails),
        now.toISOString(),
        now.toISOString(),
        now.toISOString()
      );

      return { id: nqId, immediate: true, is_urgent: true, hours_until_shift: hoursUntilShift };
    }

    // 2. Standard debounce for future shifts (> 24h away): queue with 30-minute delay
    const delayRow = db.prepare("SELECT value FROM settings WHERE key = 'notification_delay_minutes'").get() as { value: string } | undefined;
    const delayMinutes = delayRow ? parseInt(delayRow.value, 10) : 30;

    const existing = db.prepare("SELECT * FROM notification_queue WHERE staff_id = ? AND status = 'PENDING'").get(staffId) as any;
    const scheduledFor = new Date(now.getTime() + delayMinutes * 60 * 1000).toISOString();

    if (existing) {
      const existingDetails = JSON.parse(existing.details || '[]');
      existingDetails.push({ changeType, summary, details, added_at: now.toISOString() });
      const newSummary = `${existingDetails.length} Schichtänderungen für dich geplant`;
      db.prepare(`
        UPDATE notification_queue 
        SET details = ?, summary = ?, scheduled_for = ?
        WHERE id = ?
      `).run(JSON.stringify(existingDetails), newSummary, scheduledFor, existing.id);
      return { id: existing.id, immediate: false, is_urgent: false, queued: true };
    } else {
      const id = 'nq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const initialDetails = [{ changeType, summary, details, added_at: now.toISOString() }];
      db.prepare(`
        INSERT INTO notification_queue (id, staff_id, change_type, summary, details, created_at, scheduled_for, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(id, staffId, changeType, summary, JSON.stringify(initialDetails), now.toISOString(), scheduledFor);
      return { id, immediate: false, is_urgent: false, queued: true };
    }
  } catch (err) {
    console.error('Error queuing notification:', err);
  }
}

export function flushNotificationQueue(forceAll: boolean = false) {
  try {
    const now = new Date().toISOString();
    const query = forceAll
      ? "SELECT nq.*, s.name as staff_name FROM notification_queue nq JOIN staff s ON nq.staff_id = s.id WHERE nq.status = 'PENDING'"
      : "SELECT nq.*, s.name as staff_name FROM notification_queue nq JOIN staff s ON nq.staff_id = s.id WHERE nq.status = 'PENDING' AND nq.scheduled_for <= ?";

    const pending = forceAll 
      ? db.prepare(query).all() as any[]
      : db.prepare(query).all(now) as any[];

    if (pending.length === 0) return { flushed_count: 0 };

    let flushedCount = 0;
    for (const item of pending) {
      const detailsList = JSON.parse(item.details || '[]');
      const count = detailsList.length;

      let logTitle = '';
      let logDesc = '';

      if (count === 1) {
        logTitle = 'Dienstplan-Anpassung';
        logDesc = detailsList[0].summary;
      } else {
        logTitle = `Dienstplan-Update (${count} Änderungen gebündelt)`;
        logDesc = `Deine Schichten wurden gebündelt angepasst:\n` + 
          detailsList.map((d: any, idx: number) => `• ${d.summary}`).join('\n');
      }

      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      db.prepare(`
        INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
        VALUES (?, ?, 'SHIFT_CHANGE', ?, ?, 'Sabine Weber (Leitung - Gebündelt)', ?, 0)
      `).run(logId, item.staff_id, logTitle, logDesc, new Date().toISOString());

      db.prepare("UPDATE notification_queue SET status = 'SENT', sent_at = ? WHERE id = ?").run(new Date().toISOString(), item.id);
      flushedCount++;
    }

    return { flushed_count: flushedCount };
  } catch (err) {
    console.error('Error flushing notification queue:', err);
    return { flushed_count: 0, error: (err as any).message };
  }
}

export function runAutopilotAnalysis() {
  try {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'autopilot_enabled'").get() as { value: string } | undefined;
    if (setting?.value !== 'true') {
      return { proposals_generated: 0, reason: 'Autopilot ist deaktiviert' };
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const groups = db.prepare('SELECT * FROM groups').all() as any[];
    const proposals: any[] = [];

    for (const group of groups) {
      const shifts = db.prepare("SELECT * FROM shifts WHERE group_id = ? AND date = ? AND status = 'CONFIRMED'").all(group.id, today) as any[];
      const staffCount = shifts.length;
      const targetRatio = group.target_ratio || 8.0;
      const childCount = group.child_count || 20;
      const requiredStaff = Math.max(1, Math.ceil(childCount / targetRatio));

      const cancelledShifts = db.prepare(`
        SELECT s.*, st.name as staff_name 
        FROM shifts s 
        JOIN staff st ON s.staff_id = st.id 
        WHERE s.group_id = ? AND s.date = ? AND s.status = 'CANCELLED'
      `).all(group.id, today) as any[];

      const isShort = staffCount < requiredStaff || cancelledShifts.length > 0;

      if (isShort) {
        const existingProp = db.prepare("SELECT id FROM autopilot_proposals WHERE target_group_id = ? AND date = ? AND status = 'PENDING'").get(group.id, today);
        if (existingProp) continue;

        const requiredSkills: string[] = JSON.parse(group.required_skills || '[]');
        const busyStaffIds = new Set(
          db.prepare("SELECT staff_id FROM shifts WHERE date = ? AND status = 'CONFIRMED'").all(today).map((s: any) => s.staff_id)
        );
        const absentStaffIds = new Set(
          db.prepare("SELECT staff_id FROM absences WHERE ? BETWEEN start_date AND end_date AND status = 'APPROVED'").all(today).map((a: any) => a.staff_id)
        );

        const candidates = (db.prepare("SELECT * FROM staff WHERE is_active = 1").all() as any[])
          .filter(s => !busyStaffIds.has(s.id) && !absentStaffIds.has(s.id))
          .map(s => {
            const skills: string[] = JSON.parse(s.skills || '[]');
            const matchesSkills = requiredSkills.every(req => skills.includes(req));
            let score = 0;
            if (matchesSkills) score += 50;
            if (s.can_spring === 1) score += 25;
            if (s.role === 'SPRINGER') score += 25;
            if (s.role === 'LEITUNG') score += 10;
            return { staff: s, score, matchesSkills, skills };
          })
          .sort((a, b) => b.score - a.score);

        if (candidates.length === 0) {
          // If all educators are busy in other groups, check if Einrichtungsleitung can step in from office
          const leitungCandidate = (db.prepare("SELECT * FROM staff WHERE role = 'LEITUNG' AND is_active = 1").all() as any[])
            .filter(s => !absentStaffIds.has(s.id));
          if (leitungCandidate.length > 0) {
            candidates.push({
              staff: leitungCandidate[0],
              score: 50,
              matchesSkills: true,
              skills: JSON.parse(leitungCandidate[0].skills || '[]')
            });
          }
        }

        if (candidates.length > 0) {
          const best = candidates[0];
          const propId = 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
          const reasonText = cancelledShifts.length > 0
            ? `Krankheitsausfall (${cancelledShifts.map((c: any) => c.staff_name).join(', ')}) in ${group.name}`
            : `Betreuungsschlüssel-Unterdeckung (${staffCount} von ${requiredStaff} Kräften für ${childCount} Kinder) in ${group.name}`;

          const title = `Auto-Pilot Vertretung: ${best.staff.name} für ${group.name}`;
          const description = `${reasonText}. Auto-Pilot schlägt vor: ${best.staff.name} (${best.staff.role}) von 08:00 bis 16:30 Uhr einteilen. Profil: ${best.matchesSkills ? '100% Qualifikations-Match' : 'Basis-Aufsicht'}.`;

          db.prepare(`
            INSERT INTO autopilot_proposals (
              id, title, description, situation, action_type, target_group_id, target_staff_id,
              date, start_time, end_time, break_minutes, status, confidence_score, matched_reason, created_at
            )
            VALUES (?, ?, ?, ?, 'ADD_SHIFT', ?, ?, ?, '08:00', '16:30', 30, 'PENDING', ?, ?, ?)
          `).run(
            propId, title, description, cancelledShifts.length > 0 ? 'SICKNESS' : 'CRITICAL_RATIO',
            group.id, best.staff.id, today, best.score / 100, reasonText, new Date().toISOString()
          );

          proposals.push({ id: propId, title, description });
        }
      }
    }

    return { proposals_generated: proposals.length, proposals };
  } catch (err) {
    console.error('Error running autopilot analysis:', err);
    return { proposals_generated: 0, error: (err as any).message };
  }
}

// Settings Endpoints
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all() as any[];
    const settings: Record<string, any> = {
      autopilot_enabled: true,
      notification_delay_minutes: 30
    };
    for (const r of rows) {
      settings[r.key] = r.value === 'true' ? true : r.value === 'false' ? false : !isNaN(Number(r.value)) ? Number(r.value) : r.value;
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const updates = req.body;
    for (const [k, v] of Object.entries(updates)) {
      const valStr = String(v);
      db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?
      `).run(k, valStr, valStr);
    }
    if (updates.autopilot_enabled === true) {
      runAutopilotAnalysis();
    }
    res.json({ success: true, updated: updates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notification Queue Endpoints (30-Minute Debounce)
app.get('/api/notifications/queue', (req, res) => {
  try {
    const queue = db.prepare(`
      SELECT nq.*, s.name as staff_name, s.avatar as staff_avatar, s.color as staff_color
      FROM notification_queue nq
      JOIN staff s ON nq.staff_id = s.id
      WHERE nq.status = 'PENDING'
      ORDER BY nq.scheduled_for ASC
    `).all().map((item: any) => ({
      ...item,
      details: JSON.parse(item.details || '[]'),
      minutes_remaining: Math.max(0, Math.ceil((new Date(item.scheduled_for).getTime() - Date.now()) / (1000 * 60)))
    }));
    res.json(queue);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/queue/flush', (req, res) => {
  try {
    const result = flushNotificationQueue(true);
    res.json({ success: true, ...result, message: `Gebündelte Benachrichtigungen wurden jetzt an ${result.flushed_count} Mitarbeiter versendet.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-Pilot Proposals Endpoints
app.get('/api/autopilot/proposals', (req, res) => {
  try {
    const proposals = db.prepare(`
      SELECT ap.*, 
        g.name as target_group_name, g.color as target_group_color,
        s.name as target_staff_name, s.avatar as target_staff_avatar, s.color as target_staff_color, s.role as target_staff_role
      FROM autopilot_proposals ap
      JOIN groups g ON ap.target_group_id = g.id
      JOIN staff s ON ap.target_staff_id = s.id
      ORDER BY ap.status = 'PENDING' DESC, ap.created_at DESC
    `).all();
    res.json(proposals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/analyze', (req, res) => {
  try {
    const result = runAutopilotAnalysis();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/proposals/:id/accept', (req, res) => {
  try {
    const { id } = req.params;
    const proposal = db.prepare('SELECT * FROM autopilot_proposals WHERE id = ?').get(id) as any;
    if (!proposal) return res.status(404).json({ error: 'Vorschlag nicht gefunden' });
    if (proposal.status !== 'PENDING') return res.status(400).json({ error: 'Vorschlag bereits bearbeitet' });

    const shiftId = 'shift_auto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    db.prepare(`
      INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status, role_override)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'Auto-Pilot Vertretung')
    `).run(
      shiftId, proposal.target_staff_id, proposal.target_group_id, proposal.date,
      proposal.start_time, proposal.end_time, proposal.break_minutes
    );

    const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(proposal.target_group_id) as any;
    const staff = db.prepare('SELECT name FROM staff WHERE id = ?').get(proposal.target_staff_id) as any;

    const notifResult = queueStaffNotification(
      proposal.target_staff_id,
      'AUTOPILOT_ADJUSTMENT',
      `Auto-Pilot Dienst am ${proposal.date} (${proposal.start_time} - ${proposal.end_time} Uhr) in ${group?.name || 'Gruppe'} eingeteilt.`,
      { shift_id: shiftId, date: proposal.date, start_time: proposal.start_time, end_time: proposal.end_time, group: group?.name }
    );

    db.prepare("UPDATE autopilot_proposals SET status = 'ACCEPTED', decided_at = ? WHERE id = ?").run(new Date().toISOString(), id);

    const message = notifResult?.immediate
      ? `✓ Auto-Pilot Vorschlag akzeptiert! Schicht für ${staff?.name} in ${group?.name} gebucht. EILIG (<24h): Sofort-Benachrichtigung direkt an ${staff?.name} zugestellt!`
      : `✓ Auto-Pilot Vorschlag akzeptiert! Schicht für ${staff?.name} in ${group?.name} gebucht. Mitarbeiter-Benachrichtigung in 30-Minuten-Puffer eingereiht.`;

    res.json({
      success: true,
      message,
      shift_id: shiftId,
      notification_immediate: !!notifResult?.immediate
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/proposals/:id/dismiss', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("UPDATE autopilot_proposals SET status = 'DISMISSED', decided_at = ? WHERE id = ?").run(new Date().toISOString(), id);
    res.json({ success: true, message: 'Vorschlag verworfen.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
app.get('/api/policies', (req, res) => {
  try {
    const policies = db.prepare('SELECT * FROM policy_templates').all();
    res.json(policies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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

app.post('/api/groups', (req, res) => {
  try {
    const { name, type, child_count, target_ratio, min_fachkraft_percent, color, required_skills, policy_id } = req.body;
    if (!name || child_count === undefined) {
      return res.status(400).json({ error: 'Name und Kinderanzahl sind erforderlich' });
    }
    const id = 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const grpType = type || 'UE3';
    const ratio = target_ratio ?? (grpType === 'U3' ? 3.33 : grpType === 'MIXED' ? 6.0 : 8.33);
    const minFachkraft = min_fachkraft_percent ?? (grpType === 'U3' ? 0.67 : grpType === 'MIXED' ? 0.60 : 0.50);
    const grpColor = color || (grpType === 'U3' ? '#f43f5e' : grpType === 'MIXED' ? '#10b981' : '#3b82f6');
    const skills = JSON.stringify(required_skills || (grpType === 'U3' ? ['FACHKRAFT', 'U3_QUALIFIKATION'] : ['FACHKRAFT']));
    const polId = policy_id || (grpType === 'U3' ? 'pol_u3' : grpType === 'MIXED' ? 'pol_mixed' : 'pol_ue3');

    db.prepare(`
      INSERT INTO groups (id, name, type, child_count, target_ratio, min_fachkraft_percent, required_skills, color, policy_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, grpType, parseInt(child_count, 10), parseFloat(ratio), parseFloat(minFachkraft), skills, grpColor, polId);

    res.status(201).json({
      id,
      name,
      type: grpType,
      child_count: parseInt(child_count, 10),
      target_ratio: parseFloat(ratio),
      min_fachkraft_percent: parseFloat(minFachkraft),
      required_skills: JSON.parse(skills),
      color: grpColor,
      policy_id: polId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, child_count, target_ratio, min_fachkraft_percent, color, required_skills, policy_id } = req.body;

    const existing = db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    }

    const grpName = name ?? existing.name;
    const grpType = type ?? existing.type;
    const count = child_count !== undefined ? parseInt(child_count, 10) : existing.child_count;
    const ratio = target_ratio !== undefined ? parseFloat(target_ratio) : existing.target_ratio;
    const minFachkraft = min_fachkraft_percent !== undefined ? parseFloat(min_fachkraft_percent) : existing.min_fachkraft_percent;
    const grpColor = color ?? existing.color;
    const skills = required_skills ? JSON.stringify(required_skills) : existing.required_skills;
    const polId = policy_id ?? existing.policy_id ?? 'pol_ue3';

    db.prepare(`
      UPDATE groups
      SET name = ?, type = ?, child_count = ?, target_ratio = ?, min_fachkraft_percent = ?, color = ?, required_skills = ?, policy_id = ?
      WHERE id = ?
    `).run(grpName, grpType, count, ratio, minFachkraft, grpColor, skills, polId, id);

    res.json({
      id,
      name: grpName,
      type: grpType,
      child_count: count,
      target_ratio: ratio,
      min_fachkraft_percent: minFachkraft,
      color: grpColor,
      required_skills: JSON.parse(skills || '[]'),
      policy_id: polId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/groups/:id/details', (req, res) => {
  try {
    const { id } = req.params;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as any;
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });
    const notes = db.prepare('SELECT * FROM group_notes WHERE group_id = ?').all(id) as any[];
    res.json({
      group: {
        ...group,
        required_skills: JSON.parse(group.required_skills || '[]')
      },
      notes
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MODULE A: KINDER- & STAMMDATENVERWALTUNG
// ==========================================

app.get('/api/children', (req, res) => {
  try {
    const { group_id, active, search, date } = req.query;
    const checkDate = (date as string) || format(new Date(), 'yyyy-MM-dd');
    const activeFilter = active !== undefined ? (active === '1' || active === 'true' ? 1 : 0) : 1;

    let query = `
      SELECT c.*, g.name as group_name, g.type as group_type,
             hr.allergies, hr.dietary_needs, hr.emergency_instructions, hr.measles_vaccinated, hr.doctor_name, hr.doctor_phone,
             ca.status as today_status, ca.check_in_time, ca.check_out_time, ca.absence_reason, ca.meal_ordered, ca.picked_up_by
      FROM children c
      JOIN groups g ON c.group_id = g.id
      LEFT JOIN child_health_records hr ON c.id = hr.child_id
      LEFT JOIN child_attendance ca ON c.id = ca.child_id AND ca.date = ?
      WHERE c.active = ?
    `;
    const params: any[] = [checkDate, activeFilter];

    if (group_id) {
      query += ` AND c.group_id = ?`;
      params.push(group_id);
    }

    if (search) {
      query += ` AND (c.first_name LIKE ? OR c.last_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY g.name ASC, c.last_name ASC, c.first_name ASC`;

    const rows = db.prepare(query).all(...params) as any[];
    const children = rows.map(r => ({
      ...r,
      allergies: JSON.parse(r.allergies || '[]'),
      has_allergy: (JSON.parse(r.allergies || '[]')).length > 0,
      has_emergency_note: !!r.emergency_instructions,
      today_status: r.today_status || 'not_recorded'
    }));

    res.json(children);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/children/:id', (req, res) => {
  try {
    const { id } = req.params;
    const child = db.prepare(`
      SELECT c.*, g.name as group_name, g.type as group_type
      FROM children c
      JOIN groups g ON c.group_id = g.id
      WHERE c.id = ?
    `).get(id) as any;

    if (!child) return res.status(404).json({ error: 'Kind nicht gefunden' });

    const health = db.prepare('SELECT * FROM child_health_records WHERE child_id = ?').get(id) as any;
    const emergencyContacts = db.prepare('SELECT * FROM emergency_contacts WHERE child_id = ? ORDER BY priority ASC').all(id);
    const pickupAuthorizations = db.prepare('SELECT * FROM pickup_authorizations WHERE child_id = ? ORDER BY is_forbidden DESC, name ASC').all(id);
    const recentAttendance = db.prepare('SELECT * FROM child_attendance WHERE child_id = ? ORDER BY date DESC LIMIT 14').all(id);
    const dailyLogs = db.prepare('SELECT * FROM child_daily_logs WHERE child_id = ? ORDER BY date DESC, time_start DESC LIMIT 10').all(id);
    const parents = db.prepare(`
      SELECT pa.id, pa.name, pa.email, pa.phone, pcl.is_primary_contact, pcl.photo_consent
      FROM parent_accounts pa
      JOIN parent_child_links pcl ON pa.id = pcl.parent_id
      WHERE pcl.child_id = ?
    `).all(id);

    res.json({
      child,
      health: health ? { ...health, allergies: JSON.parse(health.allergies || '[]') } : null,
      emergency_contacts: emergencyContacts,
      pickup_authorizations: pickupAuthorizations,
      recent_attendance: recentAttendance,
      daily_logs: dailyLogs,
      parents
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/children', (req, res) => {
  try {
    const {
      group_id, first_name, last_name, birth_date, gender, photo_url,
      care_hours = 35, contract_start = format(new Date(), 'yyyy-MM-dd'), contract_end = null,
      allergies = [], dietary_needs = null, emergency_instructions = null, measles_vaccinated = 1,
      doctor_name = null, doctor_phone = null
    } = req.body;

    if (!group_id || !first_name || !last_name || !birth_date) {
      return res.status(400).json({ error: 'Pflichtfelder fehlen (group_id, first_name, last_name, birth_date)' });
    }

    const id = `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO children (id, group_id, first_name, last_name, birth_date, gender, photo_url, care_hours, contract_start, contract_end, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, group_id, first_name, last_name, birth_date, gender || null, photo_url || null, care_hours, contract_start, contract_end, now);

    db.prepare(`
      INSERT INTO child_health_records (child_id, allergies, dietary_needs, medication_plan, emergency_instructions, measles_vaccinated, doctor_name, doctor_phone)
      VALUES (?, ?, ?, null, ?, ?, ?, ?)
    `).run(id, JSON.stringify(allergies), dietary_needs, emergency_instructions, measles_vaccinated ? 1 : 0, doctor_name, doctor_phone);

    // Update group child count
    const totalCount = db.prepare('SELECT COUNT(*) as c FROM children WHERE group_id = ? AND active = 1').get(group_id) as { c: number };
    db.prepare('UPDATE groups SET child_count = ? WHERE id = ?').run(totalCount.c, group_id);

    res.status(201).json({ success: true, id, message: 'Kind erfolgreich angelegt' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/children/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { group_id, first_name, last_name, birth_date, gender, care_hours, contract_start, contract_end, active } = req.body;

    const existing = db.prepare('SELECT * FROM children WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Kind nicht gefunden' });

    db.prepare(`
      UPDATE children SET
        group_id = COALESCE(?, group_id),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        birth_date = COALESCE(?, birth_date),
        gender = COALESCE(?, gender),
        care_hours = COALESCE(?, care_hours),
        contract_start = COALESCE(?, contract_start),
        contract_end = COALESCE(?, contract_end),
        active = COALESCE(?, active)
      WHERE id = ?
    `).run(
      group_id, first_name, last_name, birth_date, gender, care_hours, contract_start, contract_end, active, id
    );

    res.json({ success: true, message: 'Kinderdaten erfolgreich aktualisiert' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/children/:id', (req, res) => {
  try {
    const { id } = req.params;
    const child = db.prepare('SELECT group_id FROM children WHERE id = ?').get(id) as any;
    if (!child) return res.status(404).json({ error: 'Kind nicht gefunden' });

    db.prepare('DELETE FROM children WHERE id = ?').run(id);

    // Update group child count
    const totalCount = db.prepare('SELECT COUNT(*) as c FROM children WHERE group_id = ? AND active = 1').get(child.group_id) as { c: number };
    db.prepare('UPDATE groups SET child_count = ? WHERE id = ?').run(totalCount.c, child.group_id);

    res.json({ success: true, message: 'Kind gelöscht' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/children/:id/emergency-contacts', (req, res) => {
  try {
    const { id } = req.params;
    const { name, relationship, phone_primary, phone_secondary, priority = 1 } = req.body;
    if (!name || !relationship || !phone_primary) {
      return res.status(400).json({ error: 'Name, Beziehung und Telefonnummer erforderlich' });
    }

    const contactId = `ec_${Date.now()}`;
    db.prepare(`
      INSERT INTO emergency_contacts (id, child_id, name, relationship, phone_primary, phone_secondary, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(contactId, id, name, relationship, phone_primary, phone_secondary || null, priority);

    res.status(201).json({ success: true, id: contactId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/emergency-contacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM emergency_contacts WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/children/:id/pickup-authorizations', (req, res) => {
  try {
    const { id } = req.params;
    const { name, relationship, phone, id_card_number, photo_url, is_forbidden = 0, notes } = req.body;
    if (!name || !relationship) {
      return res.status(400).json({ error: 'Name und Beziehung erforderlich' });
    }

    const authId = `pa_${Date.now()}`;
    db.prepare(`
      INSERT INTO pickup_authorizations (id, child_id, name, relationship, phone, id_card_number, photo_url, is_forbidden, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(authId, id, name, relationship, phone || null, id_card_number || null, photo_url || null, is_forbidden ? 1 : 0, notes || null);

    res.status(201).json({ success: true, id: authId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pickup-authorizations/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM pickup_authorizations WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/children/:id/health', (req, res) => {
  try {
    const { id } = req.params;
    const { allergies = [], dietary_needs, medication_plan, emergency_instructions, measles_vaccinated = 1, doctor_name, doctor_phone } = req.body;

    db.prepare(`
      INSERT OR REPLACE INTO child_health_records (child_id, allergies, dietary_needs, medication_plan, emergency_instructions, measles_vaccinated, doctor_name, doctor_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, JSON.stringify(allergies), dietary_needs || null, medication_plan || null,
      emergency_instructions || null, measles_vaccinated ? 1 : 0, doctor_name || null, doctor_phone || null
    );

    res.json({ success: true, message: 'Gesundheitsakte gespeichert' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MODULE B: TÄGLICHER KITA-BETRIEB & TABLET
// ==========================================

app.get('/api/attendance', (req, res) => {
  try {
    const { date, group_id } = req.query;
    const targetDate = (date as string) || format(new Date(), 'yyyy-MM-dd');

    let query = `
      SELECT c.id as child_id, c.first_name, c.last_name, c.group_id, c.photo_url, c.care_hours,
             g.name as group_name,
             ca.id as attendance_id, ca.status, ca.check_in_time, ca.check_out_time, ca.picked_up_by,
             ca.absence_reason, ca.meal_ordered,
             hr.allergies, hr.dietary_needs, hr.emergency_instructions
      FROM children c
      JOIN groups g ON c.group_id = g.id
      LEFT JOIN child_health_records hr ON c.id = hr.child_id
      LEFT JOIN child_attendance ca ON c.id = ca.child_id AND ca.date = ?
      WHERE c.active = 1
    `;
    const params: any[] = [targetDate];

    if (group_id) {
      query += ` AND c.group_id = ?`;
      params.push(group_id);
    }

    query += ` ORDER BY c.last_name ASC, c.first_name ASC`;

    const rows = db.prepare(query).all(...params) as any[];
    const list = rows.map(r => ({
      ...r,
      status: r.status || 'not_recorded',
      allergies: JSON.parse(r.allergies || '[]'),
      meal_ordered: r.meal_ordered === null ? 1 : r.meal_ordered
    }));

    res.json({ date: targetDate, group_id, list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/check-in', (req, res) => {
  try {
    const { child_id, check_in_time, date } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id erforderlich' });

    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const time = check_in_time || format(new Date(), 'HH:mm');
    const child = db.prepare('SELECT group_id FROM children WHERE id = ?').get(child_id) as any;
    if (!child) return res.status(404).json({ error: 'Kind nicht gefunden' });

    const attendanceId = `att_${child_id}_${targetDate}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO child_attendance (id, child_id, group_id, date, status, check_in_time, check_out_time, meal_ordered, created_at)
      VALUES (?, ?, ?, ?, 'present', ?, null, 1, ?)
      ON CONFLICT(child_id, date) DO UPDATE SET
        status = 'present',
        check_in_time = ?,
        check_out_time = null
    `).run(attendanceId, child_id, child.group_id, targetDate, time, now, time);

    res.json({ success: true, message: 'Check-In erfolgreich', check_in_time: time });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/check-out', (req, res) => {
  try {
    const { child_id, check_out_time, picked_up_by, date } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id erforderlich' });

    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const time = check_out_time || format(new Date(), 'HH:mm');

    const updated = db.prepare(`
      UPDATE child_attendance SET
        check_out_time = ?,
        picked_up_by = ?
      WHERE child_id = ? AND date = ?
    `).run(time, picked_up_by || 'Eltern', child_id, targetDate);

    if (updated.changes === 0) {
      // Child had no check-in, insert attendance record as checked out
      const child = db.prepare('SELECT group_id FROM children WHERE id = ?').get(child_id) as any;
      const attendanceId = `att_${child_id}_${targetDate}`;
      db.prepare(`
        INSERT INTO child_attendance (id, child_id, group_id, date, status, check_in_time, check_out_time, picked_up_by, meal_ordered, created_at)
        VALUES (?, ?, ?, ?, 'present', '08:00', ?, ?, 1, ?)
      `).run(attendanceId, child_id, child.group_id, targetDate, time, picked_up_by || 'Eltern', new Date().toISOString());
    }

    res.json({ success: true, message: 'Check-Out erfolgreich', check_out_time: time, picked_up_by });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/mark-absent', (req, res) => {
  try {
    const { child_id, date, status = 'absent_sick', reason, cancel_meal = true } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id erforderlich' });

    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const child = db.prepare('SELECT group_id FROM children WHERE id = ?').get(child_id) as any;
    if (!child) return res.status(404).json({ error: 'Kind nicht gefunden' });

    const attendanceId = `att_${child_id}_${targetDate}`;
    const mealOrdered = cancel_meal ? 0 : 1;

    db.prepare(`
      INSERT INTO child_attendance (id, child_id, group_id, date, status, check_in_time, check_out_time, absence_reason, meal_ordered, created_at)
      VALUES (?, ?, ?, ?, ?, null, null, ?, ?, ?)
      ON CONFLICT(child_id, date) DO UPDATE SET
        status = ?,
        absence_reason = ?,
        meal_ordered = ?,
        check_in_time = null,
        check_out_time = null
    `).run(
      attendanceId, child_id, child.group_id, targetDate, status, reason || null, mealOrdered, new Date().toISOString(),
      status, reason || null, mealOrdered
    );

    res.json({
      success: true,
      message: `Abwesenheit vermerkt (${status === 'absent_sick' ? 'Krank' : 'Urlaub'})`,
      meal_cancelled: cancel_meal
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meals/summary', (req, res) => {
  try {
    const targetDate = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');

    // Count present & ordered
    const rows = db.prepare(`
      SELECT c.id, c.first_name, c.last_name, c.group_id, g.name as group_name,
             ca.status, ca.meal_ordered,
             hr.allergies, hr.dietary_needs
      FROM children c
      JOIN groups g ON c.group_id = g.id
      LEFT JOIN child_health_records hr ON c.id = hr.child_id
      LEFT JOIN child_attendance ca ON c.id = ca.child_id AND ca.date = ?
      WHERE c.active = 1
    `).all(targetDate) as any[];

    let totalOrdered = 0;
    let totalCancelled = 0;
    const byGroup: Record<string, { group_name: string; ordered: number; cancelled: number }> = {};
    const specialDiets: any[] = [];

    rows.forEach(r => {
      const isOrdered = r.meal_ordered !== 0 && r.status !== 'absent_sick' && r.status !== 'absent_vacation';
      if (!byGroup[r.group_id]) {
        byGroup[r.group_id] = { group_name: r.group_name, ordered: 0, cancelled: 0 };
      }

      if (isOrdered) {
        totalOrdered++;
        byGroup[r.group_id].ordered++;
        const allergies = JSON.parse(r.allergies || '[]');
        if (allergies.length > 0 || r.dietary_needs) {
          specialDiets.push({
            child_name: `${r.first_name} ${r.last_name}`,
            group: r.group_name,
            dietary_needs: r.dietary_needs,
            allergies
          });
        }
      } else {
        totalCancelled++;
        byGroup[r.group_id].cancelled++;
      }
    });

    res.json({
      date: targetDate,
      deadline: '08:30',
      total_ordered: totalOrdered,
      total_cancelled: totalCancelled,
      by_group: byGroup,
      special_diets: specialDiets
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/daily-logs', (req, res) => {
  try {
    const { child_id, date } = req.query;
    const targetDate = (date as string) || format(new Date(), 'yyyy-MM-dd');

    let query = `
      SELECT l.*, s.name as staff_name
      FROM child_daily_logs l
      LEFT JOIN staff s ON l.staff_id = s.id
      WHERE l.date = ?
    `;
    const params: any[] = [targetDate];

    if (child_id) {
      query += ` AND l.child_id = ?`;
      params.push(child_id);
    }

    query += ` ORDER BY l.time_start ASC`;
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/daily-logs', (req, res) => {
  try {
    const { child_id, date, log_type, time_start, time_end, details, staff_id } = req.body;
    if (!child_id || !log_type || !details) {
      return res.status(400).json({ error: 'child_id, log_type und details erforderlich' });
    }

    const id = `log_${Date.now()}`;
    const logDate = date || format(new Date(), 'yyyy-MM-dd');
    const startTime = time_start || format(new Date(), 'HH:mm');

    db.prepare(`
      INSERT INTO child_daily_logs (id, child_id, date, log_type, time_start, time_end, details, staff_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, child_id, logDate, log_type, startTime, time_end || null, details, staff_id || null, new Date().toISOString());

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// LAGE.APP PARITY: ELTERNINITIATIVE & VEREIN
// ==========================================

// 1. Vorstands-Verwaltung & 1-Klick-Amtsübergabe (e.V.)
app.get('/api/board/members', (req, res) => {
  try {
    const boardMembers = db.prepare(`
      SELECT pa.id, pa.name, pa.email, pa.phone, pa.role, pa.board_position, pa.mandatory_hours
      FROM parent_accounts pa
      WHERE pa.role = 'VORSTAND'
      ORDER BY pa.board_position ASC, pa.name ASC
    `).all();

    const list = boardMembers.map((m: any) => {
      const children = db.prepare(`
        SELECT c.id, c.first_name, c.last_name, g.name as group_name
        FROM children c
        JOIN parent_child_links pcl ON c.id = pcl.child_id
        JOIN groups g ON c.group_id = g.id
        WHERE pcl.parent_id = ?
      `).all(m.id);
      return { ...m, children };
    });

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/board/handover', (req, res) => {
  try {
    const { current_parent_id, new_parent_id, position = '1_VORSITZ', notes } = req.body;
    if (!new_parent_id) {
      return res.status(400).json({ error: 'new_parent_id ist erforderlich' });
    }

    const newParent = db.prepare('SELECT * FROM parent_accounts WHERE id = ?').get(new_parent_id) as any;
    if (!newParent) return res.status(404).json({ error: 'Neues Vorstandsmitglied nicht gefunden' });

    // 1. Vorgänger auf reguläre Elternrolle zurückstufen
    let oldParent: any = null;
    if (current_parent_id) {
      oldParent = db.prepare('SELECT * FROM parent_accounts WHERE id = ?').get(current_parent_id) as any;
      if (oldParent) {
        db.prepare("UPDATE parent_accounts SET role = 'ELTERN', board_position = NULL WHERE id = ?").run(current_parent_id);
      }
    }

    // 2. Neues Mitglied zum Vorstand ernennen
    db.prepare("UPDATE parent_accounts SET role = 'VORSTAND', board_position = ? WHERE id = ?").run(position, new_parent_id);

    // 3. Revisionssicheres Audit-Log für den Trägerverein
    const now = new Date().toISOString();
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const leitung = db.prepare("SELECT id FROM staff WHERE role = 'LEITUNG' LIMIT 1").get() as any;
    const leitungId = leitung?.id || 's_sabine';

    db.prepare(`
      INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
      VALUES (?, ?, 'BOARD_HANDOVER', 'Vorstandswechsel (Amtsübergabe)', ?, 'System (Vereinsverwaltung)', ?, 0)
    `).run(
      logId, leitungId,
      `Amtsübergabe für Position '${position}': Neuer Vorstand ist ${newParent.name}.${oldParent ? ` Vorgänger ${oldParent.name} wurde als reguläres Elternteil eingestuft.` : ''}${notes ? ` Notiz: ${notes}` : ''}`,
      now
    );

    res.json({
      success: true,
      message: `✓ 1-Klick-Amtsübergabe erfolgreich! ${newParent.name} ist nun Vorstand (${position}).`,
      new_board_member: { id: newParent.id, name: newParent.name, role: 'VORSTAND', position }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Elterndienste, Arbeitseinsätze & Pflichtstunden-Börse
app.get('/api/parent-duties', (req, res) => {
  try {
    const duties = db.prepare(`
      SELECT d.*,
             (SELECT COUNT(*) FROM parent_duty_signups s WHERE s.duty_id = d.id AND s.status != 'CANCELLED') as signup_count
      FROM parent_duties d
      ORDER BY d.date ASC
    `).all() as any[];

    const list = duties.map(d => {
      const signups = db.prepare(`
        SELECT s.*, p.name as parent_name, p.phone as parent_phone
        FROM parent_duty_signups s
        JOIN parent_accounts p ON s.parent_id = p.id
        WHERE s.duty_id = ? AND s.status != 'CANCELLED'
      `).all(d.id);
      return { ...d, signups };
    });

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parent-duties', (req, res) => {
  try {
    const { title, description, category = 'SONSTIGES', hours_credit = 2.0, max_helpers = 4, date, time_start, time_end, location } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Titel und Datum erforderlich' });

    const id = `duty_${Date.now()}`;
    db.prepare(`
      INSERT INTO parent_duties (id, title, description, category, hours_credit, max_helpers, date, time_start, time_end, location, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
    `).run(id, title, description || '', category, hours_credit, max_helpers, date, time_start || null, time_end || null, location || null, new Date().toISOString());

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parent-duties/:id/signup', (req, res) => {
  try {
    const dutyId = req.params.id;
    const { parent_id } = req.body;
    if (!parent_id) return res.status(400).json({ error: 'parent_id erforderlich' });

    const duty = db.prepare('SELECT * FROM parent_duties WHERE id = ?').get(dutyId) as any;
    if (!duty) return res.status(404).json({ error: 'Dienst nicht gefunden' });

    const currentCount = db.prepare("SELECT COUNT(*) as c FROM parent_duty_signups WHERE duty_id = ? AND status != 'CANCELLED'").get(dutyId) as { c: number };
    if (currentCount.c >= duty.max_helpers) {
      return res.status(400).json({ error: 'Dieser Elterndienst ist bereits voll belegt' });
    }

    const signupId = `signup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    db.prepare(`
      INSERT INTO parent_duty_signups (id, duty_id, parent_id, hours_credited, status, created_at)
      VALUES (?, ?, ?, 0, 'REGISTERED', ?)
    `).run(signupId, dutyId, parent_id, new Date().toISOString());

    // Update duty status if full
    if (currentCount.c + 1 >= duty.max_helpers) {
      db.prepare("UPDATE parent_duties SET status = 'FILLED' WHERE id = ?").run(dutyId);
    }

    res.status(201).json({ success: true, signupId, message: 'Erfolgreich für Elterndienst eingetragen!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parent-duties/:id/confirm', (req, res) => {
  try {
    const { signup_id, hours_credited, confirmed_by } = req.body;
    if (!signup_id) return res.status(400).json({ error: 'signup_id erforderlich' });

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE parent_duty_signups SET
        status = 'CONFIRMED',
        hours_credited = ?,
        confirmed_by = ?,
        completed_at = ?
      WHERE id = ?
    `).run(hours_credited || 2.0, confirmed_by || 'Leitung / Vorstand', now, signup_id);

    res.json({ success: true, message: `Stunden (${hours_credited || 2.0}h) erfolgreich auf dem Elternkonto gutgeschrieben!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/parent-duties/family-stats', (req, res) => {
  try {
    const { parent_id } = req.query;
    let parents = db.prepare('SELECT id, name, email, mandatory_hours FROM parent_accounts').all() as any[];
    if (parent_id) {
      parents = parents.filter(p => p.id === parent_id);
    }

    const stats = parents.map(p => {
      const confirmedSignups = db.prepare(`
        SELECT s.*, d.title as duty_title, d.date as duty_date
        FROM parent_duty_signups s
        JOIN parent_duties d ON s.duty_id = d.id
        WHERE s.parent_id = ? AND s.status = 'CONFIRMED'
      `).all(p.id) as any[];

      const totalCompleted = confirmedSignups.reduce((sum, s) => sum + (s.hours_credited || 0), 0);
      const openHours = Math.max(0, p.mandatory_hours - totalCompleted);

      return {
        parent_id: p.id,
        parent_name: p.name,
        mandatory_hours: p.mandatory_hours,
        completed_hours: totalCompleted,
        open_hours: openHours,
        is_fulfilled: openHours === 0,
        signups: confirmedSignups
      };
    });

    res.json(parent_id ? stats[0] : stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Blitz-Umfragen für Eltern
app.get('/api/polls', (req, res) => {
  try {
    const { parent_id } = req.query;
    const polls = db.prepare('SELECT * FROM parent_polls ORDER BY created_at DESC').all() as any[];

    const result = polls.map(poll => {
      const options = db.prepare('SELECT * FROM parent_poll_options WHERE poll_id = ?').all(poll.id) as any[];
      const totalVotes = options.reduce((sum, o) => sum + (o.vote_count || 0), 0);

      let userHasVoted = false;
      let userVotedOptionId: string | null = null;
      if (parent_id) {
        const vote = db.prepare('SELECT option_id FROM parent_poll_votes WHERE poll_id = ? AND parent_id = ?').get(poll.id, parent_id) as any;
        if (vote) {
          userHasVoted = true;
          userVotedOptionId = vote.option_id;
        }
      }

      return {
        ...poll,
        total_votes: totalVotes,
        user_has_voted: userHasVoted,
        user_voted_option_id: userVotedOptionId,
        options: options.map(o => ({
          ...o,
          percent: totalVotes > 0 ? Math.round((o.vote_count / totalVotes) * 100) : 0
        }))
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/polls', (req, res) => {
  try {
    const { title, question, category = 'ALLGEMEIN', created_by_id = 's_sabine', created_by_name = 'Leitung', options = [], expires_at } = req.body;
    if (!title || !question || options.length < 2) {
      return res.status(400).json({ error: 'Titel, Frage und mindestens 2 Antwortoptionen erforderlich' });
    }

    const pollId = `poll_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO parent_polls (id, title, question, category, created_by_id, created_by_name, expires_at, is_closed, allow_multiple, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(pollId, title, question, category, created_by_id, created_by_name, expires_at || null, now);

    const insertOpt = db.prepare('INSERT INTO parent_poll_options (id, poll_id, option_text, vote_count) VALUES (?, ?, ?, 0)');
    options.forEach((optText: string, idx: number) => {
      insertOpt.run(`opt_${pollId}_${idx}`, pollId, optText);
    });

    res.status(201).json({ success: true, pollId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/polls/:id/vote', (req, res) => {
  try {
    const pollId = req.params.id;
    const { parent_id, option_id } = req.body;
    if (!parent_id || !option_id) {
      return res.status(400).json({ error: 'parent_id und option_id erforderlich' });
    }

    const existing = db.prepare('SELECT id FROM parent_poll_votes WHERE poll_id = ? AND parent_id = ?').get(pollId, parent_id);
    if (existing) {
      return res.status(400).json({ error: 'Sie haben an dieser Umfrage bereits teilgenommen' });
    }

    const voteId = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    db.prepare(`
      INSERT INTO parent_poll_votes (id, poll_id, option_id, parent_id, voted_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(voteId, pollId, option_id, parent_id, new Date().toISOString());

    db.prepare('UPDATE parent_poll_options SET vote_count = vote_count + 1 WHERE id = ?').run(option_id);

    res.json({ success: true, message: 'Stimme erfolgreich abgegeben!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Digitale Dokumente & Signaturen
app.get('/api/documents', (req, res) => {
  try {
    const { parent_id, child_id } = req.query;
    let query = 'SELECT * FROM digital_documents WHERE 1=1';
    const params: any[] = [];
    if (parent_id) {
      query += ' AND parent_id = ?';
      params.push(parent_id);
    }
    if (child_id) {
      query += ' AND child_id = ?';
      params.push(child_id);
    }
    query += ' ORDER BY created_at DESC';
    const docs = db.prepare(query).all(...params);
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/:id/sign', (req, res) => {
  try {
    const docId = req.params.id;
    const { signature_data, signed_by_name } = req.body;
    if (!signature_data || !signed_by_name) {
      return res.status(400).json({ error: 'Signaturdaten und Name der unterzeichnenden Person erforderlich' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE digital_documents SET
        status = 'SIGNED',
        signature_data = ?,
        signed_at = ?,
        signed_by_name = ?
      WHERE id = ?
    `).run(signature_data, now, signed_by_name, docId);

    res.json({ success: true, message: 'Dokument erfolgreich digital unterzeichnet!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Dedizierte Kiosk-Geräte
app.get('/api/kiosk-devices', (req, res) => {
  try {
    const devices = db.prepare(`
      SELECT kd.*, g.name as group_name
      FROM kiosk_devices kd
      LEFT JOIN groups g ON kd.group_id = g.id
    `).all();
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Elternportal & Eltern-App API
const safeParseArray = (val: string | null | undefined): string[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return [val];
  }
};

app.get('/api/parents/:id/overview', (req, res) => {
  try {
    const parentId = req.params.id;
    const parent = db.prepare('SELECT * FROM parent_accounts WHERE id = ?').get(parentId) as any;
    if (!parent) return res.status(404).json({ error: 'Eltern-Account nicht gefunden' });

    const todayStr = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');

    // 1. Linked children
    const children = db.prepare(`
      SELECT c.*, g.name as group_name, g.type as group_type, pcl.photo_consent, pcl.is_primary_contact
      FROM children c
      JOIN parent_child_links pcl ON c.id = pcl.child_id
      JOIN groups g ON c.group_id = g.id
      WHERE pcl.parent_id = ?
    `).all(parentId) as any[];

    const enrichedChildren = children.map(child => {
      const attendance = db.prepare('SELECT * FROM child_attendance WHERE child_id = ? AND date = ?').get(child.id, todayStr) as any;
      const health = db.prepare('SELECT * FROM child_health_records WHERE child_id = ?').get(child.id) as any;
      const emergencyContacts = db.prepare('SELECT * FROM emergency_contacts WHERE child_id = ? ORDER BY priority ASC').all(child.id);
      const pickupAuths = db.prepare('SELECT * FROM pickup_authorizations WHERE child_id = ?').all(child.id);
      const dailyLogs = db.prepare('SELECT * FROM child_daily_logs WHERE child_id = ? ORDER BY date DESC, time_start DESC LIMIT 10').all(child.id);

      return {
        ...child,
        attendance_today: attendance || { status: 'UNKNOWN', meal_ordered: 1 },
        health: health ? {
          ...health,
          allergies: safeParseArray(health.allergies),
          dietary_needs: safeParseArray(health.dietary_needs)
        } : null,
        emergency_contacts: emergencyContacts,
        pickup_authorizations: pickupAuths,
        daily_logs: dailyLogs
      };
    });

    // 2. Parent duties stats
    const signups = db.prepare(`
      SELECT pds.*, pd.title, pd.date, pd.time_start, pd.time_end, pd.category, pd.hours_credit, pd.location
      FROM parent_duty_signups pds
      JOIN parent_duties pd ON pds.duty_id = pd.id
      WHERE pds.parent_id = ?
      ORDER BY pd.date ASC
    `).all(parentId) as any[];

    const confirmedHours = signups.filter(s => s.status === 'CONFIRMED').reduce((acc, s) => acc + (s.hours_credited || 0), 0);
    const registeredHours = signups.filter(s => s.status === 'REGISTERED').reduce((acc, s) => acc + (s.hours_credit || 0), 0);

    // 3. Open duties available
    const openDuties = db.prepare(`
      SELECT pd.*,
        (SELECT COUNT(*) FROM parent_duty_signups WHERE duty_id = pd.id AND status != 'CANCELLED') as current_helpers,
        (SELECT COUNT(*) FROM parent_duty_signups WHERE duty_id = pd.id AND parent_id = ? AND status != 'CANCELLED') as is_signed_up
      FROM parent_duties pd
      WHERE pd.status = 'OPEN'
      ORDER BY pd.date ASC
    `).all(parentId);

    // 4. Polls with user vote status
    const allPolls = db.prepare(`
      SELECT pp.*,
        (SELECT COUNT(*) FROM parent_poll_votes WHERE poll_id = pp.id) as total_votes,
        (SELECT option_id FROM parent_poll_votes WHERE poll_id = pp.id AND parent_id = ?) as my_voted_option_id
      FROM parent_polls pp
      WHERE pp.is_closed = 0
      ORDER BY pp.created_at DESC
    `).all(parentId) as any[];

    const enrichedPolls = allPolls.map(p => {
      const options = db.prepare(`
        SELECT ppo.*,
          (SELECT COUNT(*) FROM parent_poll_votes WHERE option_id = ppo.id) as vote_count
        FROM parent_poll_options ppo
        WHERE ppo.poll_id = ?
        ORDER BY ppo.id ASC
      `).all(p.id) as any[];
      const totalV = options.reduce((sum, o) => sum + (o.vote_count || 0), 0);
      return {
        ...p,
        total_votes: totalV,
        user_has_voted: Boolean(p.my_voted_option_id),
        user_voted_option_id: p.my_voted_option_id,
        options: options.map(o => ({
          ...o,
          percent: totalV > 0 ? Math.round((o.vote_count / totalV) * 100) : 0
        }))
      };
    });

    // 5. Digital Documents
    const documents = db.prepare(`
      SELECT dd.*, c.first_name as child_first_name, c.last_name as child_last_name
      FROM digital_documents dd
      LEFT JOIN children c ON dd.child_id = c.id
      WHERE dd.parent_id = ? OR dd.parent_id IS NULL
      ORDER BY dd.created_at DESC
    `).all(parentId);

    // 6. Announcements / Schwarzes Brett
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY date DESC LIMIT 6').all();

    res.json({
      parent: {
        id: parent.id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        role: parent.role,
        board_position: parent.board_position,
        mandatory_hours: parent.mandatory_hours,
        hours_confirmed: confirmedHours,
        hours_registered: registeredHours,
        hours_remaining: Math.max(0, parent.mandatory_hours - confirmedHours)
      },
      children: enrichedChildren,
      duties: {
        signups,
        open_duties: openDuties,
        mandatory_target: parent.mandatory_hours,
        hours_confirmed: confirmedHours
      },
      polls: enrichedPolls,
      documents,
      announcements
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parents/:parentId/children/:childId/mark-absent', (req, res) => {
  try {
    const { parentId, childId } = req.params;
    const { date, status = 'ABSENT_SICK', reason, cancel_meal = true } = req.body;

    const link = db.prepare('SELECT * FROM parent_child_links WHERE parent_id = ? AND child_id = ?').get(parentId, childId);
    if (!link) {
      return res.status(403).json({ error: 'Keine Berechtigung für dieses Kind' });
    }

    const child = db.prepare('SELECT * FROM children WHERE id = ?').get(childId) as any;
    if (!child) return res.status(404).json({ error: 'Kind nicht gefunden' });

    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const attendanceId = `att_${childId}_${targetDate}`;
    const mealOrdered = cancel_meal ? 0 : 1;

    db.prepare(`
      INSERT INTO child_attendance (id, child_id, group_id, date, status, absence_reason, meal_ordered, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(child_id, date) DO UPDATE SET
        status = excluded.status,
        absence_reason = excluded.absence_reason,
        meal_ordered = excluded.meal_ordered
    `).run(attendanceId, childId, child.group_id, targetDate, status, reason || 'Abmeldung durch Eltern in Eltern-App', mealOrdered, new Date().toISOString());

    const reasonText = status === 'ABSENT_SICK' ? 'Krankmeldung' : 'Abmeldung';
    res.json({
      success: true,
      message: `${reasonText} für ${child.first_name} am ${targetDate} erfasst. Mittagessen ist ${mealOrdered ? 'bestellt' : 'abbestellt'}.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parents/:parentId/pickup-authorizations', (req, res) => {
  try {
    const { parentId } = req.params;
    const { child_id, name, relationship, phone, photo_url, notes } = req.body;
    if (!child_id || !name || !relationship) {
      return res.status(400).json({ error: 'child_id, name und relationship sind erforderlich' });
    }

    const link = db.prepare('SELECT * FROM parent_child_links WHERE parent_id = ? AND child_id = ?').get(parentId, child_id);
    if (!link) {
      return res.status(403).json({ error: 'Keine Berechtigung für dieses Kind' });
    }

    const authId = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO pickup_authorizations (id, child_id, name, relationship, phone, is_forbidden, photo_url, notes)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(authId, child_id, name, relationship, phone || null, photo_url || null, notes || null);

    res.status(201).json({ success: true, message: `Abholberechtigung für ${name} erfolgreich hinterlegt.`, id: authId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RATIO SETTINGS & DYNAMIC CONFIGURATION
// ==========================================

app.get('/api/ratio-settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM ratio_settings').all();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ratio-settings', (req, res) => {
  try {
    const {
      id = 'rs_default', group_id = null, target_ratio = 8.0,
      warning_threshold_percent = 15.0, critical_threshold_percent = 25.0,
      two_person_rule = 1, core_time_start = '09:00', core_time_end = '13:00',
      min_qualification_quote = 0.50, bundesland_preset = 'CUSTOM'
    } = req.body;

    db.prepare(`
      INSERT INTO ratio_settings (
        id, group_id, target_ratio, warning_threshold_percent, critical_threshold_percent,
        two_person_rule, core_time_start, core_time_end, min_qualification_quote, bundesland_preset
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        target_ratio = excluded.target_ratio,
        warning_threshold_percent = excluded.warning_threshold_percent,
        critical_threshold_percent = excluded.critical_threshold_percent,
        two_person_rule = excluded.two_person_rule,
        core_time_start = excluded.core_time_start,
        core_time_end = excluded.core_time_end,
        min_qualification_quote = excluded.min_qualification_quote,
        bundesland_preset = excluded.bundesland_preset
    `).run(
      id, group_id, target_ratio, warning_threshold_percent, critical_threshold_percent,
      two_person_rule ? 1 : 0, core_time_start, core_time_end, min_qualification_quote, bundesland_preset
    );

    res.json({ success: true, message: 'Betreuungsschlüssel-Einstellungen gespeichert' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ratio-settings/apply-preset', (req, res) => {
  try {
    const { preset } = req.body; // 'NRW_KIBIZ', 'BAYERN_BAYKIBIG', 'BAWUE_KITAG', 'BERLIN_KITAFOEG'
    let u3Ratio = 3.33;
    let ue3Ratio = 8.0;
    let u3Fachkraft = 0.67;
    let ue3Fachkraft = 0.50;

    if (preset === 'BAYERN_BAYKIBIG') {
      u3Ratio = 3.0;
      ue3Ratio = 7.5;
    } else if (preset === 'BAWUE_KITAG') {
      u3Ratio = 3.0;
      ue3Ratio = 7.0;
      u3Fachkraft = 0.70;
    } else if (preset === 'BERLIN_KITAFOEG') {
      u3Ratio = 3.5;
      ue3Ratio = 8.0;
      u3Fachkraft = 0.60;
    }

    db.prepare(`
      UPDATE ratio_settings SET
        target_ratio = ?, min_qualification_quote = ?, bundesland_preset = ?
      WHERE group_id = 'g_u3_maeuse'
    `).run(u3Ratio, u3Fachkraft, preset);

    db.prepare(`
      UPDATE ratio_settings SET
        target_ratio = ?, min_qualification_quote = ?, bundesland_preset = ?
      WHERE group_id IN ('g_ue3_sonne', 'g_ue3_wald') OR group_id IS NULL
    `).run(ue3Ratio, ue3Fachkraft, preset);

    res.json({ success: true, preset, u3Ratio, ue3Ratio, message: `Bundesland-Vorlage ${preset} erfolgreich angewendet.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DYNAMIC RATIO RADAR & AUTO-BALANCING
// ==========================================

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

    // Load ratio settings
    const allRatioSettings = db.prepare('SELECT * FROM ratio_settings').all() as any[];
    const defaultSetting = allRatioSettings.find(s => !s.group_id) || {
      target_ratio: 8.0,
      warning_threshold_percent: 15.0,
      critical_threshold_percent: 25.0,
      two_person_rule: 1,
      min_qualification_quote: 0.50
    };

    const ratioStatus = groups.map(group => {
      const requiredSkills: string[] = JSON.parse(group.required_skills || '[]');
      const groupSetting = allRatioSettings.find(s => s.group_id === group.id) || defaultSetting;

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

      // Children numbers (Enrolled vs. Absent vs. Present)
      const enrolledChildRow = db.prepare('SELECT COUNT(*) as c FROM children WHERE group_id = ? AND active = 1').get(group.id) as { c: number };
      const enrolledCount = enrolledChildRow?.c > 0 ? enrolledChildRow.c : group.child_count;

      const attendanceRows = db.prepare('SELECT status FROM child_attendance WHERE group_id = ? AND date = ?').all(group.id, date) as { status: string }[];
      let presentCount = 0;
      let absentSickCount = 0;
      let absentOtherCount = 0;

      if (attendanceRows.length > 0) {
        attendanceRows.forEach(a => {
          if (a.status === 'present') presentCount++;
          else if (a.status === 'absent_sick') absentSickCount++;
          else absentOtherCount++;
        });
      }

      const totalAbsent = absentSickCount + absentOtherCount;
      // Real effective children in group today
      const effectiveChildren = attendanceRows.length > 0 
        ? (presentCount > 0 ? presentCount : Math.max(0, enrolledCount - totalAbsent))
        : enrolledCount;

      const targetRatio = groupSetting.target_ratio || group.target_ratio;
      const warningThreshold = groupSetting.warning_threshold_percent || 15.0;
      const criticalThreshold = groupSetting.critical_threshold_percent || 25.0;
      const minFachkraft = groupSetting.min_qualification_quote || group.min_fachkraft_percent;
      const twoPersonRule = groupSetting.two_person_rule !== 0;

      // Actual ratio using real present children
      const actualRatio = totalStaff > 0 ? parseFloat((effectiveChildren / totalStaff).toFixed(2)) : 99;
      // Static ratio if all enrolled were present
      const staticRatio = totalStaff > 0 ? parseFloat((enrolledCount / totalStaff).toFixed(2)) : 99;
      const fachkraftPercent = totalStaff > 0 ? fachkraefte / totalStaff : 0;

      // Skill validation
      const presentSkills = new Set<string>();
      activeShifts.forEach((s: any) => s.skills.forEach((sk: string) => presentSkills.add(sk)));
      const missingSkills = requiredSkills.filter(reqSkill => !presentSkills.has(reqSkill));

      let status = 'OPTIMAL';
      let message = 'Betreuungsschlüssel & personelle Skills erfüllt.';
      const autoBalancing = {
        active: false,
        absent_children: totalAbsent,
        absent_sick_children: absentSickCount,
        enrolled_children: enrolledCount,
        effective_children: effectiveChildren,
        static_ratio: staticRatio,
        dynamic_ratio: actualRatio,
        saved_emergency: false
      };

      // Check Auto-Balancing condition:
      // If static ratio exceeds target (would normally trigger alarm!), BUT dynamic ratio with absent kids is <= target + warning threshold
      const wouldBeCriticalStatically = staticRatio > targetRatio;
      const isDynamicCompliant = actualRatio <= targetRatio * (1 + warningThreshold / 100);

      if (totalStaff === 0 && effectiveChildren > 0) {
        status = 'CRITICAL';
        message = 'AKUTER NOTSTAND: Keine Aufsichtsperson in der Gruppe!';
      } else if (effectiveChildren === 0) {
        status = 'OPTIMAL';
        message = 'Keine Kinder in dieser Gruppe anwesend.';
      } else if (wouldBeCriticalStatically && isDynamicCompliant && totalAbsent > 0) {
        // AUTO-BALANCING SAVES THE DAY!
        status = 'BALANCED_OK';
        autoBalancing.active = true;
        autoBalancing.saved_emergency = true;
        message = `Auto-Balancing aktiv: ${totalAbsent} Kinder abgemeldet. Real-Schlüssel 1:${actualRatio} (Soll 1:${targetRatio}) ist gesetzeskonform! Keine Schicht-Neubesetzung nötig.`;
      } else if (actualRatio > targetRatio * (1 + criticalThreshold / 100)) {
        status = 'CRITICAL';
        message = `Unterbesetzung: 1:${actualRatio} (Gesetzliches Limit: 1:${targetRatio})`;
      } else if (actualRatio > targetRatio) {
        status = 'WARNING';
        message = `Leichte Überschreitung: 1:${actualRatio} (Toleranzbereich, Soll: 1:${targetRatio})`;
      } else if (twoPersonRule && totalStaff < 2 && effectiveChildren > 3) {
        // Two-person supervision rule warning
        status = 'WARNING';
        message = 'Aufsichtspflicht-Hinweis: Nur 1 Fachkraft in der Gruppe (Zwei-Kräfte-Regel beachten).';
      } else if (missingSkills.length > 0) {
        status = 'CRITICAL';
        message = `Skill-Verstoß: Fehlende Qualifikation (${missingSkills.join(', ')})!`;
      } else if (fachkraftPercent < minFachkraft) {
        status = 'WARNING';
        message = `Fachkraftquote unterschritten: ${(fachkraftPercent * 100).toFixed(0)}% (Min: ${(minFachkraft * 100).toFixed(0)}%)`;
      } else if (!hasFacilityFirstAid) {
        status = 'WARNING';
        message = 'Achtung: Kein zertifizierter Ersthelfer am Kind im Haus anwesend!';
      } else if (actualRatio > targetRatio * 0.9) {
        status = 'WARNING';
        message = `Puffer sehr gering: 1:${actualRatio}. Pausenzeiten versetzen!`;
      }

      return {
        group_id: group.id,
        group_name: group.name,
        group_type: group.type,
        child_count: group.child_count,
        enrolled_children: enrolledCount,
        effective_children: effectiveChildren,
        absent_children: totalAbsent,
        target_ratio: targetRatio,
        actual_ratio: actualRatio,
        static_ratio: staticRatio,
        min_fachkraft_percent: minFachkraft,
        actual_fachkraft_percent: fachkraftPercent,
        required_skills: requiredSkills,
        missing_skills: missingSkills,
        total_staff: totalStaff,
        fachkraefte,
        ergaenzungskraefte,
        status,
        message,
        auto_balancing: autoBalancing,
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
// 5. SHIFTS & DIENSTPLAN & TEMPLATES & WISHES
// ---------------------------------------------------------------------------
app.get('/api/shift-templates', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM shift_templates ORDER BY start_time ASC').all();
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/staff-wishes', (req, res) => {
  try {
    const { start, end, staff_id } = req.query;
    let query = `
      SELECT w.*, s.name as staff_name, s.role as staff_role
      FROM staff_wishes w
      JOIN staff s ON w.staff_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (start && end) {
      query += ` AND w.date BETWEEN ? AND ?`;
      params.push(start, end);
    }
    if (staff_id) {
      query += ` AND w.staff_id = ?`;
      params.push(staff_id);
    }
    query += ` ORDER BY w.date ASC`;
    const wishes = db.prepare(query).all(...params);
    res.json(wishes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/staff-wishes', (req, res) => {
  try {
    const { staff_id, date, type, note } = req.body;
    const id = 'wish_' + Date.now();
    db.prepare(`
      INSERT INTO staff_wishes (id, staff_id, date, type, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, staff_id, date, type, note || '', new Date().toISOString());

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/staff-wishes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM staff_wishes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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

app.post('/api/shifts/copy-week', (req, res) => {
  try {
    const { target_week_start } = req.body;
    if (!target_week_start) {
      return res.status(400).json({ error: 'target_week_start ist erforderlich (JJJJ-MM-TT)' });
    }

    const targetDate = new Date(target_week_start);
    const sourceDate = new Date(targetDate);
    sourceDate.setDate(sourceDate.getDate() - 7);

    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    const formatDt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const sourceStart = formatDt(sourceDate);
    const sourceEndDate = new Date(sourceDate);
    sourceEndDate.setDate(sourceEndDate.getDate() + 4);
    const sourceEnd = formatDt(sourceEndDate);

    const sourceShifts = db.prepare(`
      SELECT * FROM shifts WHERE date >= ? AND date <= ? AND status = 'CONFIRMED'
    `).all(sourceStart, sourceEnd) as any[];

    if (sourceShifts.length === 0) {
      return res.status(400).json({ error: `In der Vorwoche (${sourceStart} bis ${sourceEnd}) wurden keine Schichten gefunden.` });
    }

    let copied = 0;
    let skippedVacation = 0;
    let skippedExisting = 0;

    const insertStmt = db.prepare(`
      INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status, role_override)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const logStmt = db.prepare(`
      INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    db.transaction(() => {
      for (const s of sourceShifts) {
        const origD = new Date(s.date);
        origD.setDate(origD.getDate() + 7);
        const newDateStr = formatDt(origD);

        const vac = db.prepare(`
          SELECT * FROM absences
          WHERE staff_id = ? AND start_date <= ? AND end_date >= ?
        `).get(s.staff_id, newDateStr, newDateStr);

        if (vac) {
          skippedVacation++;
          continue;
        }

        const existing = db.prepare(`
          SELECT id FROM shifts WHERE staff_id = ? AND date = ?
        `).get(s.staff_id, newDateStr);

        if (existing) {
          skippedExisting++;
          continue;
        }

        const newId = 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        insertStmt.run(newId, s.staff_id, s.group_id, newDateStr, s.start_time, s.end_time, s.break_minutes, 'CONFIRMED', s.role_override);
        copied++;

        queueStaffNotification(
          s.staff_id,
          'SHIFT_ASSIGNED',
          `Schicht für ${newDateStr} (${s.start_time} - ${s.end_time} Uhr) übernommen.`,
          { date: newDateStr, start_time: s.start_time, end_time: s.end_time }
        );
      }
    })();

    res.json({
      success: true,
      copied_count: copied,
      skipped_vacation_count: skippedVacation,
      skipped_existing_count: skippedExisting,
      total_source_shifts: sourceShifts.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/closures', (req, res) => {
  try {
    const closures = db.prepare('SELECT * FROM kita_closures ORDER BY date ASC').all();
    res.json(closures);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/closures', (req, res) => {
  try {
    const { title, date, type, notes } = req.body;
    const id = 'cls_' + Date.now();
    db.prepare(`
      INSERT INTO kita_closures (id, title, date, type, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, title, date, type || 'SCHLIESSTAG', notes || null);
    res.status(201).json({ id, title, date, type, notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/closures/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM kita_closures WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ARBZG & LEGAL COMPLIANCE VALIDATOR (ArbZG § 3, § 4, § 5, Abwesenheiten)
// ---------------------------------------------------------------------------
export function validateShiftArbZG(params: {
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  exclude_shift_id?: string;
}): { warnings: string[]; warning: string | null } {
  const warnings: string[] = [];
  const { staff_id, date, start_time, end_time, break_minutes = 30, exclude_shift_id } = params;

  const [currStartH, currStartM] = (start_time || '08:00').split(':').map(Number);
  const [currEndH, currEndM] = (end_time || '16:30').split(':').map(Number);
  const currStartDecimal = currStartH + currStartM / 60;
  const currEndDecimal = currEndH + currEndM / 60;
  const grossHours = currEndDecimal - currStartDecimal;
  const netHours = Math.max(0, grossHours - (break_minutes || 0) / 60);

  // 1. ArbZG § 5: Ruhezeit (mind. 11 Std.) nach Schichtende am Vortag
  const prevDayShift = db.prepare(`
    SELECT end_time FROM shifts
    WHERE staff_id = ? AND date = date(?, '-1 day') AND status = 'CONFIRMED'
    ORDER BY end_time DESC LIMIT 1
  `).get(staff_id, date) as { end_time: string } | undefined;

  if (prevDayShift) {
    const [prevH, prevM] = prevDayShift.end_time.split(':').map(Number);
    const restHours = (24 - prevH - prevM / 60) + currStartDecimal;
    if (restHours < 11) {
      warnings.push(`ArbZG § 5 (Ruhezeit): Ruhezeit nach Schichtende am Vortag (${prevDayShift.end_time} Uhr) beträgt nur ${restHours.toFixed(1)} Std. (gesetzlich mind. 11 Std. vorgeschrieben)!`);
    }
  }

  // 2. ArbZG § 5: Ruhezeit (mind. 11 Std.) vor Schichtbeginn am Folgetag
  const nextDayShift = db.prepare(`
    SELECT start_time FROM shifts
    WHERE staff_id = ? AND date = date(?, '+1 day') AND status = 'CONFIRMED'
    ORDER BY start_time ASC LIMIT 1
  `).get(staff_id, date) as { start_time: string } | undefined;

  if (nextDayShift) {
    const [nextH, nextM] = nextDayShift.start_time.split(':').map(Number);
    const restHours = (24 - currEndDecimal) + (nextH + nextM / 60);
    if (restHours < 11) {
      warnings.push(`ArbZG § 5 (Ruhezeit): Ruhezeit bis zur Folgeschicht am nächsten Tag (${nextDayShift.start_time} Uhr) beträgt nur ${restHours.toFixed(1)} Std. (gesetzlich mind. 11 Std. vorgeschrieben)!`);
    }
  }

  // 3. ArbZG § 3: Höchstarbeitszeit (max. 10 Stunden täglich) & Schichtüberschneidungen
  let sameDayQuery = `
    SELECT id, start_time, end_time, break_minutes FROM shifts
    WHERE staff_id = ? AND date = ? AND status = 'CONFIRMED'
  `;
  const sameDayParams: any[] = [staff_id, date];
  if (exclude_shift_id) {
    sameDayQuery += ` AND id != ?`;
    sameDayParams.push(exclude_shift_id);
  }
  const sameDayShifts = db.prepare(sameDayQuery).all(...sameDayParams) as any[];

  let totalSameDayNetHours = netHours;
  for (const s of sameDayShifts) {
    const [sH, sM] = s.start_time.split(':').map(Number);
    const [eH, eM] = s.end_time.split(':').map(Number);
    const sGross = (eH + eM / 60) - (sH + sM / 60);
    const sNet = Math.max(0, sGross - (s.break_minutes || 0) / 60);
    totalSameDayNetHours += sNet;

    // Check for overlap
    const sStartDec = sH + sM / 60;
    const sEndDec = eH + eM / 60;
    if (currStartDecimal < sEndDec && currEndDecimal > sStartDec) {
      warnings.push(`Zeitüberschneidung: Mitarbeiter ist am selben Tag bereits von ${s.start_time} bis ${s.end_time} Uhr eingeteilt!`);
    }
  }

  if (totalSameDayNetHours > 10.0) {
    warnings.push(`ArbZG § 3 (Höchstarbeitszeit): Gesamte Tagesarbeitszeit von ${totalSameDayNetHours.toFixed(1)} Std. überschreitet die gesetzliche Höchstgrenze von 10 Stunden!`);
  }

  // 4. ArbZG § 4: Gesetzliche Mindestpausen (30m ab 6h, 45m ab 9h)
  if (netHours > 6.0 && (break_minutes || 0) < 30) {
    warnings.push(`ArbZG § 4 (Ruhepause): Bei mehr als 6 Std. Arbeitszeit ist eine Ruhepause von mind. 30 Minuten vorgeschrieben (aktuell: ${break_minutes || 0} Min.)!`);
  } else if (netHours > 9.0 && (break_minutes || 0) < 45) {
    warnings.push(`ArbZG § 4 (Ruhepause): Bei mehr als 9 Std. Arbeitszeit ist eine Ruhepause von mind. 45 Minuten vorgeschrieben (aktuell: ${break_minutes || 0} Min.)!`);
  }

  // 5. Abwesenheitskonflikte (Krankmeldung / Urlaub / Fortbildung)
  const absence = db.prepare(`
    SELECT type, reason FROM absences
    WHERE staff_id = ? AND ? BETWEEN start_date AND end_date AND status IN ('PENDING', 'APPROVED')
    LIMIT 1
  `).get(staff_id, date) as { type: string; reason: string } | undefined;

  if (absence) {
    const absLabel = absence.type === 'SICK' ? 'Krankmeldung' : absence.type === 'VACATION' ? 'Urlaub' : absence.type === 'TRAINING' ? 'Fortbildung' : 'Abwesenheit';
    warnings.push(`Abwesenheitskonflikt: Mitarbeiter hat an diesem Tag eine ${absLabel}${absence.reason ? ` ('${absence.reason}')` : ''}!`);
  }

  return {
    warnings,
    warning: warnings.length > 0 ? warnings.join(' | ') : null
  };
}

app.post('/api/shifts', (req, res) => {
  try {
    const { staff_id, group_id, date, start_time, end_time, break_minutes, role_override } = req.body;
    const id = 'shift_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    const arbzgCheck = validateShiftArbZG({
      staff_id,
      date,
      start_time,
      end_time,
      break_minutes: Number(break_minutes) || 30
    });

    db.prepare(`
      INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status, role_override, warning)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
    `).run(id, staff_id, group_id, date, start_time, end_time, Number(break_minutes) || 30, role_override || null, arbzgCheck.warning);

    const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(group_id) as any;
    const notifResult = queueStaffNotification(
      staff_id,
      'SHIFT_ASSIGNED',
      `Schicht am ${date} eingeteilt: ${start_time} - ${end_time} Uhr (${group?.name || 'Gruppe'}).`,
      { date, start_time, end_time, group_id, group_name: group?.name }
    );

    // 201 Created: Meldet Fehler/Warnungen wenn ja, aber verhindert die Eintragung NICHT!
    res.status(201).json({ 
      success: true, 
      id, 
      warning: arbzgCheck.warning,
      warnings: arbzgCheck.warnings,
      notification_immediate: !!notifResult?.immediate 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/shifts/:id', (req, res) => {
  try {
    const shiftId = req.params.id;
    const existing = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shiftId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Schicht nicht gefunden' });
    }

    const staff_id = req.body.staff_id || existing.staff_id;
    const group_id = req.body.group_id || existing.group_id;
    const date = req.body.date || existing.date;
    const start_time = req.body.start_time || existing.start_time;
    const end_time = req.body.end_time || existing.end_time;
    const break_minutes = req.body.break_minutes !== undefined ? Number(req.body.break_minutes) : existing.break_minutes;
    const role_override = req.body.role_override !== undefined ? req.body.role_override : existing.role_override;

    const arbzgCheck = validateShiftArbZG({
      staff_id,
      date,
      start_time,
      end_time,
      break_minutes,
      exclude_shift_id: shiftId
    });

    db.prepare(`
      UPDATE shifts
      SET staff_id = ?, group_id = ?, date = ?, start_time = ?, end_time = ?, break_minutes = ?, role_override = ?, warning = ?
      WHERE id = ?
    `).run(staff_id, group_id, date, start_time, end_time, break_minutes, role_override || null, arbzgCheck.warning, shiftId);

    res.json({
      success: true,
      id: shiftId,
      warning: arbzgCheck.warning,
      warnings: arbzgCheck.warnings
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shifts/:id', (req, res) => {
  try {
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id) as any;
    let notifResult = null;
    if (shift) {
      notifResult = queueStaffNotification(
        shift.staff_id,
        'SHIFT_CANCELLED',
        `Deine Schicht am ${shift.date} (${shift.start_time} - ${shift.end_time} Uhr) wurde von der Leitung gelöscht.`,
        { date: shift.date, start_time: shift.start_time, end_time: shift.end_time }
      );
    }
    db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
    res.json({ success: true, notification_immediate: !!notifResult?.immediate });
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

      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
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
    if (!requesterStaff) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    // Team Vacation Conflict Check (Urlaubs-Kollisionsprüfung)
    let conflictWarning = null;
    if (requesterStaff.target_group_id) {
      const conflicts = db.prepare(`
        SELECT a.*, s.name as staff_name, s.role, s.is_fachkraft
        FROM absences a
        JOIN staff s ON a.staff_id = s.id
        WHERE s.target_group_id = ? AND s.id != ? AND a.status = 'APPROVED'
          AND (
            (a.start_date BETWEEN ? AND ?) OR
            (a.end_date BETWEEN ? AND ?) OR
            (? BETWEEN a.start_date AND a.end_date)
          )
      `).all(requesterStaff.target_group_id, requester_id, start_date, end_date, start_date, end_date, start_date) as any[];

      if (conflicts.length > 0) {
        const names = conflicts.map((c: any) => c.staff_name).join(', ');
        conflictWarning = `⚠️ Urlaubs-Kollision: ${names} aus der Gruppe '${requesterStaff.target_group_id}' hat im selben Zeitraum bereits genehmigten Urlaub!`;
      }
    }

    const id = 'appr_vac_' + Date.now();
    const details = {
      title: `Urlaubsantrag: ${requesterStaff.name}`,
      description: `${requesterStaff.name} beantragt Urlaub vom ${start_date} bis ${end_date}.`,
      start_date,
      end_date,
      reason: reason || 'Erholungsurlaub',
      remaining_vacation: `${requesterStaff.annual_vacation_days - 6} Tage`,
      team_conflict_warning: conflictWarning
    };

    db.prepare(`
      INSERT INTO approvals (id, type, requester_id, details, status, created_at)
      VALUES (?, 'VACATION_REQUEST', ?, ?, 'PENDING', ?)
    `).run(id, requester_id, JSON.stringify(details), new Date().toISOString());

    res.status(201).json({ success: true, id, conflictWarning });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Emergency Trigger with Skill-Aware Replacement Proposal
function handleTriggerSick(req: any, res: any) {
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

    // Benachrichtigung an Leitung: Löst kritische Warnung oder einfache Benachrichtigung je nach Einstellung der Leitung aus
    const directors = db.prepare("SELECT * FROM staff WHERE role = 'LEITUNG' AND is_active = 1").all() as any[];
    let criticalCount = 0;
    const nowIso = new Date().toISOString();

    for (const d of directors) {
      const isCritical = (d.critical_alerts_mode || 'CRITICAL') === 'CRITICAL';
      const notifId = 'log_sick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

      if (isCritical) {
        criticalCount++;
        db.prepare(`
          INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
          VALUES (?, ?, 'CRITICAL_ALERT', ?, ?, ?, ?, 0)
        `).run(
          notifId,
          d.id,
          `🚨 KRITISCHE WARNUNG: Krankmeldung von ${staffMember.name}`,
          `Dringender Handlungsbedarf für Leitung: ${staffMember.name} hat sich krankgemeldet (${reason || 'Akute Krankmeldung'}). Betreuungsschlüssel & Vertretung müssen sofort gesichert werden!`,
          staffMember.name,
          nowIso
        );

        queueStaffNotification(
          d.id,
          'CRITICAL_SICK_ALERT',
          `🚨 KRITISCHE WARNUNG: Akute Krankmeldung von ${staffMember.name} (${reason || 'Krankheit'})`,
          { staff_id, staff_name: staffMember.name, reason, force_immediate: true, is_critical: true }
        );
      } else {
        db.prepare(`
          INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
          VALUES (?, ?, 'INFO', ?, ?, ?, ?, 0)
        `).run(
          notifId,
          d.id,
          `ℹ️ Krankmeldung eingegangen: ${staffMember.name}`,
          `${staffMember.name} hat sich krankgemeldet (${reason || 'Krankheit'}).`,
          staffMember.name,
          nowIso
        );

        queueStaffNotification(
          d.id,
          'SICK_ALERT_SIMPLE',
          `Krankmeldung: ${staffMember.name} (${reason || 'Krankheit'})`,
          { staff_id, staff_name: staffMember.name, reason, force_immediate: true, is_critical: false }
        );
      }
    }

    res.json({ 
      success: true, 
      message: `Krankmeldung für ${staffMember.name} erfasst. Skill-basierter Vertretungsvorschlag (${chosenStaff ? chosenStaff.name : 'Kein Springer verfügbar'}) liegt vor!`,
      critical_warning_triggered: criticalCount > 0,
      absence_id: absenceId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

app.post('/api/emergency/trigger-sick', handleTriggerSick);
app.post('/api/requests/sick', handleTriggerSick);

// ---------------------------------------------------------------------------
// 6b. RECHTLICHER RAHMEN (ArbZG § 3 & § 5, Abwesenheiten) & EINSPRING-KASKADE
// ---------------------------------------------------------------------------

export function checkLegalFramework(staff: any, targetDate: string, startTime: string, endTime: string) {
  const issues: string[] = [];
  const checks: { rule: string; passed: boolean; message: string }[] = [];

  // 1. Absences check (Urlaub, Krankheit, Fortbildung, Mutterschutz)
  const absence = db.prepare(`
    SELECT * FROM absences 
    WHERE staff_id = ? AND ? BETWEEN start_date AND end_date AND status = 'APPROVED'
  `).get(staff.id, targetDate) as any;

  if (absence) {
    const msg = `Mitarbeiter ist am ${targetDate} abwesend (${absence.type === 'SICK' ? 'Krank gemeldet' : absence.type === 'VACATION' ? 'Genehmigter Urlaub' : absence.reason || 'Abwesend'})`;
    issues.push(msg);
    checks.push({ rule: 'Abwesenheit / Freistellung', passed: false, message: msg });
  } else {
    checks.push({ rule: 'Abwesenheit / Freistellung', passed: true, message: 'Keine Abwesenheit oder Urlaub an diesem Tag' });
  }

  // 2. ArbZG § 3: Daily Working Hours limit (max. 10 hours daily)
  const [newStartH, newStartM] = startTime.split(':').map(Number);
  const [newEndH, newEndM] = endTime.split(':').map(Number);
  const newShiftHours = Math.max(0, (newEndH * 60 + newEndM - (newStartH * 60 + newStartM)) / 60);

  const todayShifts = db.prepare(`
    SELECT * FROM shifts WHERE staff_id = ? AND date = ? AND status = 'CONFIRMED'
  `).all(staff.id, targetDate) as any[];

  let existingDailyHours = 0;
  for (const s of todayShifts) {
    const [shStartH, shStartM] = s.start_time.split(':').map(Number);
    const [shEndH, shEndM] = s.end_time.split(':').map(Number);
    existingDailyHours += Math.max(0, (shEndH * 60 + shEndM - (shStartH * 60 + shStartM) - (s.break_minutes || 0)) / 60);
  }

  const totalDailyHours = existingDailyHours + newShiftHours;
  if (totalDailyHours > 10.0) {
    const msg = `ArbZG § 3 überschritten: Gesamtarbeitszeit am ${targetDate} würde ${totalDailyHours.toFixed(1)} Std. betragen (gesetzliches Maximum: 10 Std.)`;
    issues.push(msg);
    checks.push({ rule: 'ArbZG § 3 (Höchstarbeitszeit max. 10h)', passed: false, message: msg });
  } else {
    checks.push({ rule: 'ArbZG § 3 (Höchstarbeitszeit max. 10h)', passed: true, message: `Gesamtarbeitszeit ${totalDailyHours.toFixed(1)}h/10h zulässig` });
  }

  // 3. ArbZG § 5: 11-hour uninterrupted rest period between shifts
  const prevDate = format(new Date(new Date(targetDate).getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const prevShift = db.prepare(`
    SELECT * FROM shifts 
    WHERE staff_id = ? AND date IN (?, ?) AND status = 'CONFIRMED'
    ORDER BY date DESC, end_time DESC LIMIT 1
  `).get(staff.id, prevDate, targetDate) as any;

  let restHoursBefore = 24;
  if (prevShift && prevShift.date === prevDate) {
    const prevEndDateTime = new Date(`${prevDate}T${prevShift.end_time}:00`);
    const newStartDateTime = new Date(`${targetDate}T${startTime}:00`);
    restHoursBefore = (newStartDateTime.getTime() - prevEndDateTime.getTime()) / (1000 * 60 * 60);
  }

  if (restHoursBefore < 11.0) {
    const msg = `ArbZG § 5 verletzt: Ruhezeit zur vorherigen Schicht beträgt nur ${restHoursBefore.toFixed(1)} Std. (gesetzlich mind. 11 Std. ununterbrochen)`;
    issues.push(msg);
    checks.push({ rule: 'ArbZG § 5 (Mindestruhezeit 11h)', passed: false, message: msg });
  } else {
    checks.push({ rule: 'ArbZG § 5 (Mindestruhezeit 11h)', passed: true, message: `Ruhezeit zur Vorschicht beträgt ${restHoursBefore.toFixed(1)}h (mind. 11h erfüllt)` });
  }

  // 4. Availability window check
  let availabilityCompliant = true;
  if (staff.availability_window && staff.availability_window.includes('-')) {
    const match = staff.availability_window.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match) {
      const [, availStart, availEnd] = match;
      if (startTime < availStart || endTime > availEnd) {
        availabilityCompliant = false;
        const msg = `Außerhalb des vereinbarten Verfügbarkeitsrahmens (${staff.availability_window})`;
        checks.push({ rule: 'Verfügbarkeitsrahmen', passed: false, message: msg });
      } else {
        checks.push({ rule: 'Verfügbarkeitsrahmen', passed: true, message: `Im Zeitfenster (${staff.availability_window})` });
      }
    }
  }

  const isCompliant = issues.length === 0;

  return {
    is_compliant: isCompliant,
    total_daily_hours: totalDailyHours,
    rest_hours_before: restHoursBefore,
    issues,
    checks,
    summary: isCompliant 
      ? '✓ Gesetzlicher Rahmen (ArbZG § 3 & § 5) voll erfüllt' 
      : `✗ Rechtlicher Hinderungsgrund: ${issues.join('; ')}`
  };
}

// 1. Einspring-Kaskade starten: Filtert nach gesetzlichem Rahmen und fragt Kandidat 1
app.post('/api/emergency/start-cycle', (req, res) => {
  try {
    const { group_id, date, start_time, end_time, absent_staff_id, reason } = req.body;
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const targetStartTime = start_time || '08:00';
    const targetEndTime = end_time || '16:30';

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(group_id || 'g_u3_maeuse') as any;
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' });

    const requiredSkills: string[] = JSON.parse(group.required_skills || '[]');
    const allStaff = db.prepare('SELECT * FROM staff WHERE is_active = 1').all() as any[];

    // Candidates evaluated strictly within legal framework (ArbZG, absences)
    const candidates = allStaff
      .filter((s: any) => s.id !== absent_staff_id)
      .map((s: any) => {
        const legal = checkLegalFramework(s, targetDate, targetStartTime, targetEndTime);
        const skills: string[] = JSON.parse(s.skills || '[]');
        const matchCount = requiredSkills.filter(req => skills.includes(req)).length;

        // Intelligent priority score
        let score = 50;
        if (s.role === 'SPRINGER') score += 50;
        if (s.is_fachkraft === 1) score += 30;
        score += matchCount * 15;
        if (s.can_spring === 1) score += 20;
        if (s.role === 'LEITUNG') score -= 30; // Leitung is fallback before all-declined

        return {
          staff_id: s.id,
          name: s.name,
          role: s.role,
          email: s.email,
          qualification: s.qualification,
          is_fachkraft: s.is_fachkraft === 1,
          score,
          legal_check: legal,
          status: 'WAITING',
          asked_at: null as string | null,
          responded_at: null as string | null
        };
      })
      .filter((c: any) => c.legal_check.is_compliant)
      .sort((a: any, b: any) => b.score - a.score);

    const cycleId = 'cyc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const now = new Date().toISOString();

    if (candidates.length === 0) {
      // Keiner im rechtlichen Rahmen verfügbar -> Sofortige Benachrichtigung an Leitung
      const leitung = db.prepare("SELECT id FROM staff WHERE role = 'LEITUNG' LIMIT 1").get() as any;
      const leitungId = leitung?.id || 's_sabine';

      db.prepare(`
        INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
        VALUES (?, ?, 'EMERGENCY', ?, ?, 'System (ArbZG- & Rechtsprüfung)', ?, 0)
      `).run(
        'log_no_candidates_' + Date.now(),
        leitungId,
        '🚨 Keine Mitarbeiter im rechtlichen Rahmen verfügbar!',
        `Für den Ausfall am ${targetDate} (${targetStartTime} - ${targetEndTime} Uhr) in ${group.name} erfüllt kein Mitarbeiter die gesetzlichen Vorgaben (ArbZG § 3 max. 10h, ArbZG § 5 Mindestruhezeit 11h oder Abwesenheiten). Die Einrichtungsleitung muss jetzt entscheiden!`,
        now
      );

      db.prepare(`
        INSERT INTO substitute_cycles (id, date, start_time, end_time, group_id, absent_staff_id, reason, candidates, current_candidate_index, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, '[]', 0, 'ALL_DECLINED', ?, ?)
      `).run(cycleId, targetDate, targetStartTime, targetEndTime, group.id, absent_staff_id || null, reason || 'Akuter Personalausfall', now, now);

      return res.status(201).json({
        success: true,
        cycle_id: cycleId,
        status: 'ALL_DECLINED',
        message: 'Keine Mitarbeiter im rechtlichen Rahmen verfügbar. Leitung muss persönlich entscheiden.',
        total_candidates: 0,
        candidates: []
      });
    }

    // Set Candidate 0 to PENDING and notify them immediately (< 24h)
    candidates[0].status = 'PENDING';
    candidates[0].asked_at = now;

    db.prepare(`
      INSERT INTO substitute_cycles (id, date, start_time, end_time, group_id, absent_staff_id, reason, candidates, current_candidate_index, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'IN_PROGRESS', ?, ?)
    `).run(cycleId, targetDate, targetStartTime, targetEndTime, group.id, absent_staff_id || null, reason || 'Akuter Personalausfall', JSON.stringify(candidates), now, now);

    // Send immediate urgent notification to Candidate 0 (berücksichtigt persönliche Einstellung: kritisch vs. einfach)
    const firstStaff = db.prepare('SELECT critical_alerts_mode FROM staff WHERE id = ?').get(candidates[0].staff_id) as any;
    const isFirstCritical = (firstStaff?.critical_alerts_mode || 'CRITICAL') === 'CRITICAL';

    queueStaffNotification(
      candidates[0].staff_id,
      isFirstCritical ? 'CRITICAL_STANDBY_ALERT' : 'SUBSTITUTE_REQUEST',
      isFirstCritical
        ? `🚨 DRINGENDE NOTFALL-ANFRAGE: Kannst du am ${targetDate} (${targetStartTime} - ${targetEndTime} Uhr) in ${group.name} spontan aushelfen?`
        : `Kannst du am ${targetDate} (${targetStartTime} - ${targetEndTime} Uhr) in ${group.name} einspringen? Bitte bestätigen oder ablehnen.`,
      { date: targetDate, start_time: targetStartTime, end_time: targetEndTime, group_id: group.id, cycle_id: cycleId, force_immediate: true, is_critical: isFirstCritical }
    );

    res.status(201).json({
      success: true,
      cycle_id: cycleId,
      status: 'IN_PROGRESS',
      message: `Einspring-Kaskade gestartet! Kandidat 1 von ${candidates.length} (${candidates[0].name}) wird angefragt.`,
      current_candidate_index: 0,
      current_candidate: candidates[0],
      total_candidates: candidates.length,
      candidates
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Antwort eines Kandidaten (Zusage oder Absage)
app.post('/api/emergency/cycles/:id/respond', (req, res) => {
  try {
    const cycle = db.prepare('SELECT * FROM substitute_cycles WHERE id = ?').get(req.params.id) as any;
    if (!cycle) return res.status(404).json({ error: 'Einspring-Kaskade nicht gefunden' });

    if (cycle.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: `Kaskade ist bereits im Status ${cycle.status}` });
    }

    const { staff_id, decision } = req.body;
    const candidates = JSON.parse(cycle.candidates || '[]');
    const currentIndex = cycle.current_candidate_index;
    const currentCandidate = candidates[currentIndex];

    if (!currentCandidate || (staff_id && currentCandidate.staff_id !== staff_id)) {
      return res.status(400).json({ error: 'Aktuell ist ein anderer Mitarbeiter an der Reihe oder ungültige ID' });
    }

    const now = new Date().toISOString();
    const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(cycle.group_id) as any;

    if (decision === 'ACCEPT') {
      // Zusage! Schicht wird zugeteilt und Kaskade beendet
      currentCandidate.status = 'ACCEPTED';
      currentCandidate.responded_at = now;

      const newShiftId = 'shift_sub_' + Date.now();
      db.prepare(`
        INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status, role_override)
        VALUES (?, ?, ?, ?, ?, ?, 30, 'CONFIRMED', 'Eingesprungen (Vertretung)')
      `).run(newShiftId, currentCandidate.staff_id, cycle.group_id, cycle.date, cycle.start_time, cycle.end_time);

      db.prepare(`
        UPDATE substitute_cycles
        SET candidates = ?, status = 'ACCEPTED', accepted_staff_id = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(candidates), currentCandidate.staff_id, now, cycle.id);

      queueStaffNotification(
        currentCandidate.staff_id,
        'SHIFT_ASSIGNED',
        `✓ Danke für deinen Einsatz! Du bist am ${cycle.date} (${cycle.start_time} - ${cycle.end_time} Uhr) in ${group?.name || 'Gruppe'} eingeteilt.`,
        { date: cycle.date, start_time: cycle.start_time, end_time: cycle.end_time, force_immediate: true }
      );

      const leitung = db.prepare("SELECT id FROM staff WHERE role = 'LEITUNG' LIMIT 1").get() as any;
      const leitungId = leitung?.id || 's_sabine';
      db.prepare(`
        INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
        VALUES (?, ?, 'EMERGENCY', ?, ?, 'System (Einspring-Kaskade)', ?, 0)
      `).run(
        'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        leitungId,
        `✓ Einspring-Zusage: ${currentCandidate.name} springt ein!`,
        `${currentCandidate.name} hat die Einspring-Anfrage für ${group?.name || 'Gruppe'} am ${cycle.date} (${cycle.start_time} - ${cycle.end_time} Uhr) angenommen. Schicht wurde verbindlich eingebucht.`,
        now
      );

      return res.json({
        success: true,
        status: 'ACCEPTED',
        message: `✓ ${currentCandidate.name} hat zugesagt und übernimmt die Schicht!`,
        accepted_staff: currentCandidate,
        shift_id: newShiftId
      });
    }

    if (decision === 'DECLINE') {
      // Absage: Durchcyceln zum nächsten Kandidaten!
      currentCandidate.status = 'DECLINED';
      currentCandidate.responded_at = now;

      const nextIndex = currentIndex + 1;
      if (nextIndex < candidates.length) {
        // Nächster Kandidat wird aktiv
        candidates[nextIndex].status = 'PENDING';
        candidates[nextIndex].asked_at = now;

        db.prepare(`
          UPDATE substitute_cycles
          SET candidates = ?, current_candidate_index = ?, updated_at = ?
          WHERE id = ?
        `).run(JSON.stringify(candidates), nextIndex, now, cycle.id);

        const nextStaff = db.prepare('SELECT critical_alerts_mode FROM staff WHERE id = ?').get(candidates[nextIndex].staff_id) as any;
        const isNextCritical = (nextStaff?.critical_alerts_mode || 'CRITICAL') === 'CRITICAL';

        queueStaffNotification(
          candidates[nextIndex].staff_id,
          isNextCritical ? 'CRITICAL_STANDBY_ALERT' : 'SUBSTITUTE_REQUEST',
          isNextCritical
            ? `🚨 DRINGENDE NOTFALL-ANFRAGE: Kannst du am ${cycle.date} (${cycle.start_time} - ${cycle.end_time} Uhr) in ${group?.name || 'Gruppe'} spontan aushelfen?`
            : `Kannst du am ${cycle.date} (${cycle.start_time} - ${cycle.end_time} Uhr) in ${group?.name || 'Gruppe'} einspringen? Bitte in der App bestätigen oder ablehnen.`,
          { date: cycle.date, start_time: cycle.start_time, end_time: cycle.end_time, group_id: cycle.group_id, cycle_id: cycle.id, force_immediate: true, is_critical: isNextCritical }
        );

        return res.json({
          success: true,
          status: 'IN_PROGRESS',
          message: `${currentCandidate.name} hat abgelehnt. Nächster Kandidat (${candidates[nextIndex].name}) wird angefragt.`,
          next_candidate: candidates[nextIndex],
          current_index: nextIndex,
          total_candidates: candidates.length
        });
      } else {
        // JEDER HAT NEIN GESAGT! System meldet der Leitung, dass alle abgelehnt haben
        db.prepare(`
          UPDATE substitute_cycles
          SET candidates = ?, status = 'ALL_DECLINED', updated_at = ?
          WHERE id = ?
        `).run(JSON.stringify(candidates), now, cycle.id);

        const leitung = db.prepare("SELECT id FROM staff WHERE role = 'LEITUNG' LIMIT 1").get() as any;
        const leitungId = leitung?.id || 's_sabine';

        const alertTitle = '🚨 Jeder hat nein gesagt! Leitung muss entscheiden';
        const alertDesc = `Alle ${candidates.length} im rechtlichen Rahmen verfügbaren Mitarbeiter haben das Einspringen für ${group?.name || 'Gruppe'} am ${cycle.date} (${cycle.start_time} - ${cycle.end_time} Uhr) abgelehnt. Die Einrichtungsleitung muss jetzt entscheiden, wer einspringt!`;

        db.prepare(`
          INSERT INTO staff_audit_log (id, staff_id, category, title, description, changed_by, created_at, is_read)
          VALUES (?, ?, 'EMERGENCY', ?, ?, 'System (Einspring-Kaskade)', ?, 0)
        `).run('log_all_declined_' + Date.now(), leitungId, alertTitle, alertDesc, now);

        return res.json({
          success: true,
          status: 'ALL_DECLINED',
          message: `Alle ${candidates.length} Mitarbeiter haben nein gesagt. Die Einrichtungsleitung muss jetzt entscheiden, wer einspringt.`,
          candidates
        });
      }
    }

    return res.status(400).json({ error: "decision must be 'ACCEPT' or 'DECLINE'" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Leitung entscheidet verbindlich, wer einspringt (jederzeit während der laufenden Abfrage oder nachdem alle abgelehnt haben)
app.post('/api/emergency/cycles/:id/director-decide', (req, res) => {
  try {
    const { staff_id, director_note } = req.body;
    if (!staff_id) return res.status(400).json({ error: 'staff_id ist erforderlich' });

    const cycle = db.prepare('SELECT * FROM substitute_cycles WHERE id = ?').get(req.params.id) as any;
    if (!cycle) return res.status(404).json({ error: 'Einspring-Kaskade nicht gefunden' });

    const chosenStaff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staff_id) as any;
    if (!chosenStaff) return res.status(404).json({ error: 'Gewählter Mitarbeiter nicht gefunden' });

    const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(cycle.group_id) as any;
    const now = new Date().toISOString();
    const wasDuringInquiry = cycle.status === 'IN_PROGRESS';

    const newShiftId = 'shift_dir_' + Date.now();
    db.prepare(`
      INSERT INTO shifts (id, staff_id, group_id, date, start_time, end_time, break_minutes, status, role_override)
      VALUES (?, ?, ?, ?, ?, ?, 30, 'CONFIRMED', 'Anweisung Einrichtungsleitung')
    `).run(newShiftId, staff_id, cycle.group_id, cycle.date, cycle.start_time, cycle.end_time);

    // Update candidates pipeline status
    let candidates: any[] = [];
    try {
      candidates = JSON.parse(cycle.candidates || '[]');
      candidates = candidates.map((c: any) => {
        if (c.staff_id === staff_id) {
          return { ...c, status: 'DIRECTOR_ASSIGNED' };
        } else if (c.status === 'WAITING' || c.status === 'PENDING') {
          return { ...c, status: 'CANCELLED_BY_DIRECTOR' };
        }
        return c;
      });
    } catch (_) {}

    const note = director_note || (wasDuringInquiry 
      ? 'Sofortige Weisung der Leitung während der laufenden Abfrage: Die Person macht das jetzt!'
      : 'Verbindliche Entscheidung der Einrichtungsleitung nach Ablehnung aller Verfügbaren');

    db.prepare(`
      UPDATE substitute_cycles
      SET status = 'DIRECTOR_RESOLVED', 
          director_decision_staff_id = ?, 
          director_note = ?, 
          candidates = ?,
          updated_at = ?
      WHERE id = ?
    `).run(staff_id, note, JSON.stringify(candidates), now, cycle.id);

    queueStaffNotification(
      staff_id,
      'SHIFT_ASSIGNED',
      `Weisung der Leitung: Du wurdest für den Dienst in ${group?.name || 'Gruppe'} am ${cycle.date} (${cycle.start_time} - ${cycle.end_time} Uhr) eingeteilt. Notiz: ${note}`,
      { date: cycle.date, start_time: cycle.start_time, end_time: cycle.end_time, force_immediate: true }
    );

    res.json({
      success: true,
      status: 'DIRECTOR_RESOLVED',
      intervened_during_inquiry: wasDuringInquiry,
      message: `✓ Schicht verbindlich an ${chosenStaff.name} zugewiesen (${wasDuringInquiry ? 'Sofort-Entscheidung während laufender Abfrage' : 'Entscheidung nach Kaskade'}). Vorgang abgeschlossen.`,
      shift_id: newShiftId,
      chosen_staff: chosenStaff
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Kaskaden-Status abfragen
app.get('/api/emergency/cycles', (req, res) => {
  try {
    const cycles = db.prepare(`
      SELECT sc.*, g.name as group_name, s.name as absent_staff_name, acc.name as accepted_staff_name, dec.name as director_decision_staff_name
      FROM substitute_cycles sc
      JOIN groups g ON sc.group_id = g.id
      LEFT JOIN staff s ON sc.absent_staff_id = s.id
      LEFT JOIN staff acc ON sc.accepted_staff_id = acc.id
      LEFT JOIN staff dec ON sc.director_decision_staff_id = dec.id
      ORDER BY sc.created_at DESC
      LIMIT 20
    `).all().map((c: any) => ({
      ...c,
      candidates: JSON.parse(c.candidates || '[]')
    }));
    res.json(cycles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/emergency/cycles/:id', (req, res) => {
  try {
    const cycle = db.prepare(`
      SELECT sc.*, g.name as group_name, s.name as absent_staff_name, acc.name as accepted_staff_name, dec.name as director_decision_staff_name
      FROM substitute_cycles sc
      JOIN groups g ON sc.group_id = g.id
      LEFT JOIN staff s ON sc.absent_staff_id = s.id
      LEFT JOIN staff acc ON sc.accepted_staff_id = acc.id
      LEFT JOIN staff dec ON sc.director_decision_staff_id = dec.id
      WHERE sc.id = ?
    `).get(req.params.id) as any;
    if (!cycle) return res.status(404).json({ error: 'Kaskade nicht gefunden' });

    res.json({
      ...cycle,
      candidates: JSON.parse(cycle.candidates || '[]')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Abfrage für Mitarbeiter: Gibt es eine offene Einspring-Anfrage an mich?
app.get('/api/emergency/pending-request/:staff_id', (req, res) => {
  try {
    const staffId = req.params.staff_id;
    const staffMember = db.prepare('SELECT critical_alerts_mode FROM staff WHERE id = ?').get(staffId) as any;
    const criticalMode = staffMember?.critical_alerts_mode || 'CRITICAL';

    const activeCycles = db.prepare(`
      SELECT sc.*, g.name as group_name
      FROM substitute_cycles sc
      JOIN groups g ON sc.group_id = g.id
      WHERE sc.status = 'IN_PROGRESS'
      ORDER BY sc.created_at DESC
    `).all() as any[];

    for (const cycle of activeCycles) {
      const candidates = JSON.parse(cycle.candidates || '[]');
      const currentCandidate = candidates[cycle.current_candidate_index];
      if (currentCandidate && currentCandidate.staff_id === staffId && currentCandidate.status === 'PENDING') {
        return res.json({
          has_pending_request: true,
          cycle_id: cycle.id,
          group_name: cycle.group_name,
          date: cycle.date,
          start_time: cycle.start_time,
          end_time: cycle.end_time,
          reason: cycle.reason,
          candidate: currentCandidate,
          critical_alerts_mode: criticalMode,
          is_critical: criticalMode === 'CRITICAL'
        });
      }
    }

    res.json({
      has_pending_request: false,
      critical_alerts_mode: criticalMode,
      is_critical: criticalMode === 'CRITICAL'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Rechtlicher Schnelltest für jeden Mitarbeiter
app.get('/api/emergency/legal-check', (req, res) => {
  try {
    const { staff_id, date, start_time, end_time } = req.query;
    if (!staff_id) return res.status(400).json({ error: 'staff_id ist erforderlich' });

    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staff_id) as any;
    if (!staff) return res.status(404).json({ error: 'Mitarbeiter nicht gefunden' });

    const targetDate = (date as string) || format(new Date(), 'yyyy-MM-dd');
    const targetStartTime = (start_time as string) || '08:00';
    const targetEndTime = (end_time as string) || '16:30';

    const result = checkLegalFramework(staff, targetDate, targetStartTime, targetEndTime);
    res.json({
      staff_id: staff.id,
      name: staff.name,
      targetDate,
      targetStartTime,
      targetEndTime,
      ...result
    });
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
      const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
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

// Background timer (runs every 15s) to flush debounced notifications past their 30-minute delay
// and evaluate current situations for the Auto-Pilot
const bgInterval = setInterval(() => {
  try {
    flushNotificationQueue(false);
    runAutopilotAnalysis();
  } catch (e) {
    // quiet
  }
}, 15000);

const server = app.listen(PORT, () => {
  console.log(`🚀 KitaPlaner Backend running at http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck: http://localhost:${PORT}/api/health`);
});

// Graceful Shutdown on SIGTERM and SIGINT
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Signal ${signal} empfangen. Beende KitaPlaner Server ordnungsgemäß...`);
  clearInterval(bgInterval);
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
