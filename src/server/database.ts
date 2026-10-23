import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  MonitoredLocation,
  OrganizationRule,
  FileOperationHistory,
  PendingReviewItem,
  ApplicationSettings,
  OrganizationTemplate,
  FileCategory,
  StorageScanSession,
  CleanupResultReport,
} from '../lib/types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, PRESET_TEMPLATES } from '../lib/constants';

let dbInstance: DatabaseSync | null = null;

export function getDatabasePath(): string {
  const appDataDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const nexusDir = path.join(appDataDir, 'NexusFile');
  if (!fs.existsSync(nexusDir)) {
    fs.mkdirSync(nexusDir, { recursive: true });
    const legacyDb = path.join(appDataDir, 'Sortwise', 'sortwise.db');
    if (fs.existsSync(legacyDb)) {
      try {
        fs.copyFileSync(legacyDb, path.join(nexusDir, 'nexusfile.db'));
      } catch {}
    }
  }
  return path.join(nexusDir, 'nexusfile.db');
}

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = getDatabasePath();
  const db = new DatabaseSync(dbPath);

  // Enable WAL mode for high performance concurrency
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  initSchema(db);
  seedDefaults(db);

  dbInstance = db;
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitored_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      recursive INTEGER NOT NULL DEFAULT 0,
      folder_mode TEXT NOT NULL DEFAULT 'monitor_contents',
      destination_template TEXT NOT NULL DEFAULT '{Category}/',
      item_count INTEGER NOT NULL DEFAULT 0,
      last_scanned_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      priority INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      action_type TEXT NOT NULL DEFAULT 'move',
      destination_pattern TEXT NOT NULL,
      target_directory TEXT,
      collision_policy TEXT NOT NULL DEFAULT 'keep_both',
      dry_run_only INTEGER NOT NULL DEFAULT 0,
      source_location_id TEXT,
      execution_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rule_conditions (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      field TEXT NOT NULL,
      operator TEXT NOT NULL,
      value TEXT NOT NULL,
      logical_op TEXT NOT NULL DEFAULT 'AND',
      FOREIGN KEY(rule_id) REFERENCES organization_rules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS file_operation_history (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      original_path TEXT NOT NULL,
      new_path TEXT NOT NULL,
      file_category TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      applied_rule_name TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      result TEXT NOT NULL,
      error_details TEXT,
      content_hash TEXT,
      is_undone INTEGER NOT NULL DEFAULT 0,
      can_undo INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_history_timestamp ON file_operation_history(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_history_category ON file_operation_history(file_category);
    CREATE INDEX IF NOT EXISTS idx_history_result ON file_operation_history(result);

    CREATE TABLE IF NOT EXISTS pending_review_items (
      id TEXT PRIMARY KEY,
      detected_at TEXT NOT NULL,
      original_path TEXT NOT NULL UNIQUE,
      suggested_category TEXT NOT NULL,
      suggested_destination TEXT NOT NULL,
      reason TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS organization_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      pattern TEXT NOT NULL,
      is_preset INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS application_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS operation_errors (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      message TEXT NOT NULL,
      path TEXT,
      stack TEXT
    );

    CREATE TABLE IF NOT EXISTS storage_scans (
      id TEXT PRIMARY KEY,
      root_path TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      total_logical_size INTEGER NOT NULL DEFAULT 0,
      total_files INTEGER NOT NULL DEFAULT 0,
      total_directories INTEGER NOT NULL DEFAULT 0,
      inaccessible_count INTEGER NOT NULL DEFAULT 0,
      inaccessible_paths TEXT,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_storage_scans_root ON storage_scans(root_path);
    CREATE INDEX IF NOT EXISTS idx_storage_scans_date ON storage_scans(started_at DESC);

    CREATE TABLE IF NOT EXISTS cleanup_sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      categories_cleaned TEXT,
      files_removed INTEGER NOT NULL DEFAULT 0,
      files_skipped INTEGER NOT NULL DEFAULT 0,
      files_failed INTEGER NOT NULL DEFAULT 0,
      estimated_reclaimed_bytes INTEGER NOT NULL DEFAULT 0,
      actual_disk_change_bytes INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      errors_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_cleanup_sessions_date ON cleanup_sessions(started_at DESC);
  `);

  try {
    db.exec('ALTER TABLE monitored_locations ADD COLUMN target_directory TEXT;');
  } catch {}
}

function seedDefaults(db: DatabaseSync) {
  // Seed settings if empty
  const settingsCount = (db.prepare('SELECT count(*) as c FROM application_settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT INTO application_settings (key, value) VALUES (?, ?)');
    for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, JSON.stringify(val));
    }
  }

  // Seed default templates if empty
  const templatesCount = (db.prepare('SELECT count(*) as c FROM organization_templates').get() as { c: number }).c;
  if (templatesCount === 0) {
    const insertTemplate = db.prepare('INSERT INTO organization_templates (id, name, description, pattern, is_preset) VALUES (?, ?, ?, ?, ?)');
    for (const t of PRESET_TEMPLATES) {
      insertTemplate.run(t.id, t.name, t.description, t.pattern, t.isPreset ? 1 : 0);
    }
  }

  // Seed standard default rules if none exist
  const rulesCount = (db.prepare('SELECT count(*) as c FROM organization_rules').get() as { c: number }).c;
  if (rulesCount === 0) {
    const now = new Date().toISOString();
    const insertRule = db.prepare(`
      INSERT INTO organization_rules 
      (id, name, priority, enabled, description, action_type, destination_pattern, collision_policy, dry_run_only, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRule.run(
      'rule_default_docs',
      'Organize Documents',
      1,
      1,
      'Automatically route PDF, Word, and text documents into Documents folder',
      'move',
      'Documents/{Year}/',
      'keep_both',
      0,
      now,
      now
    );

    insertRule.run(
      'rule_default_media',
      'Organize Media & Images',
      2,
      1,
      'Group photos and pictures by Category and Month',
      'move',
      'Images/{Year}/{Month}/',
      'keep_both',
      0,
      now,
      now
    );

    insertRule.run(
      'rule_default_archives',
      'Route Archives to Zip Folder',
      3,
      1,
      'Organize ZIP, RAR, 7Z files into Archives folder',
      'move',
      'Archives/',
      'keep_both',
      0,
      now,
      now
    );

    const insertCond = db.prepare('INSERT INTO rule_conditions (id, rule_id, field, operator, value, logical_op) VALUES (?, ?, ?, ?, ?, ?)');
    insertCond.run('cond_1', 'rule_default_docs', 'category', 'equals', 'Documents', 'AND');
    insertCond.run('cond_2', 'rule_default_media', 'category', 'equals', 'Images', 'AND');
    insertCond.run('cond_3', 'rule_default_archives', 'category', 'equals', 'Archives', 'AND');
  }

  // Ensure default torrent rule exists
  try {
    const torrentRule = db.prepare('SELECT id FROM organization_rules WHERE id = ?').get('rule_default_torrents');
    if (!torrentRule) {
      const now = new Date().toISOString();
      const insertRule = db.prepare(`
        INSERT INTO organization_rules 
        (id, name, priority, enabled, description, action_type, destination_pattern, collision_policy, dry_run_only, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertRule.run(
        'rule_default_torrents',
        'Organize Torrent Files',
        4,
        1,
        'Automatically group BitTorrent files into Torrents folder',
        'move',
        'Torrents/',
        'keep_both',
        0,
        now,
        now
      );
      const insertCond = db.prepare('INSERT INTO rule_conditions (id, rule_id, field, operator, value, logical_op) VALUES (?, ?, ?, ?, ?, ?)');
      insertCond.run('cond_torrent', 'rule_default_torrents', 'category', 'equals', 'Torrents', 'AND');
    }
  } catch {}
}

// Data access operations
export const dbOperations = {
  // Locations
  getLocations(): MonitoredLocation[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM monitored_locations ORDER BY created_at DESC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      path: r.path,
      enabled: Boolean(r.enabled),
      recursive: Boolean(r.recursive),
      folderMode: r.folder_mode,
      destinationTemplate: r.destination_template,
      targetDirectory: r.target_directory || null,
      itemCount: r.item_count,
      lastScannedAt: r.last_scanned_at,
      status: r.status,
      errorMessage: r.error_message,
      createdAt: r.created_at,
    }));
  },

  addLocation(location: Omit<MonitoredLocation, 'id' | 'createdAt' | 'itemCount' | 'lastScannedAt' | 'status'>): MonitoredLocation {
    const db = getDatabase();
    const id = 'loc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const folderMode = location.folderMode || 'monitor_contents';
    const destinationTemplate = location.destinationTemplate || '{Category}/';
    const targetDirectory = location.targetDirectory || null;
    const enabled = location.enabled ?? true;
    const recursive = location.recursive ?? false;

    const stmt = db.prepare(`
      INSERT INTO monitored_locations 
      (id, name, path, enabled, recursive, folder_mode, destination_template, target_directory, item_count, last_scanned_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      location.name,
      location.path,
      enabled ? 1 : 0,
      recursive ? 1 : 0,
      folderMode,
      destinationTemplate,
      targetDirectory,
      0,
      null,
      'active',
      now
    );

    return {
      id,
      name: location.name,
      path: location.path,
      enabled,
      recursive,
      folderMode,
      destinationTemplate,
      targetDirectory,
      itemCount: 0,
      lastScannedAt: null,
      status: 'active',
      createdAt: now,
    };
  },

  updateLocation(id: string, updates: Partial<MonitoredLocation>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.path !== undefined) { fields.push('path = ?'); values.push(updates.path); }
    if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    if (updates.recursive !== undefined) { fields.push('recursive = ?'); values.push(updates.recursive ? 1 : 0); }
    if (updates.folderMode !== undefined) { fields.push('folder_mode = ?'); values.push(updates.folderMode); }
    if (updates.destinationTemplate !== undefined) { fields.push('destination_template = ?'); values.push(updates.destinationTemplate); }
    if (updates.targetDirectory !== undefined) { fields.push('target_directory = ?'); values.push(updates.targetDirectory || null); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.errorMessage !== undefined) { fields.push('error_message = ?'); values.push(updates.errorMessage); }
    if (updates.lastScannedAt !== undefined) { fields.push('last_scanned_at = ?'); values.push(updates.lastScannedAt); }
    if (updates.itemCount !== undefined) { fields.push('item_count = ?'); values.push(updates.itemCount); }

    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE monitored_locations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  deleteLocation(id: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM monitored_locations WHERE id = ?').run(id);
  },

  // Rules
  getRules(): OrganizationRule[] {
    const db = getDatabase();
    const ruleRows = db.prepare('SELECT * FROM organization_rules ORDER BY priority ASC').all() as any[];
    const condRows = db.prepare('SELECT * FROM rule_conditions').all() as any[];

    const condMap = new Map<string, any[]>();
    for (const c of condRows) {
      if (!condMap.has(c.rule_id)) condMap.set(c.rule_id, []);
      condMap.get(c.rule_id)!.push({
        id: c.id,
        field: c.field,
        operator: c.operator,
        value: c.value,
        logicalOp: c.logical_op,
      });
    }

    return ruleRows.map((r) => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      enabled: Boolean(r.enabled),
      description: r.description || '',
      conditions: condMap.get(r.id) || [],
      actionType: r.action_type,
      destinationPattern: r.destination_pattern,
      targetDirectory: r.target_directory,
      collisionPolicy: r.collision_policy,
      dryRunOnly: Boolean(r.dry_run_only),
      sourceLocationId: r.source_location_id,
      executionCount: r.execution_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  saveRule(rule: Omit<OrganizationRule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'> & { id?: string }): OrganizationRule {
    const db = getDatabase();
    const id = rule.id || 'rule_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id, execution_count, created_at FROM organization_rules WHERE id = ?').get(id) as any;
    const createdAt = existing ? existing.created_at : now;
    const execCount = existing ? existing.execution_count : 0;

    db.exec('BEGIN TRANSACTION;');
    try {
      if (existing) {
        db.prepare(`
          UPDATE organization_rules SET
            name = ?, priority = ?, enabled = ?, description = ?, action_type = ?,
            destination_pattern = ?, target_directory = ?, collision_policy = ?,
            dry_run_only = ?, source_location_id = ?, updated_at = ?
          WHERE id = ?
        `).run(
          rule.name,
          rule.priority,
          rule.enabled ? 1 : 0,
          rule.description,
          rule.actionType,
          rule.destinationPattern,
          rule.targetDirectory || null,
          rule.collisionPolicy,
          rule.dryRunOnly ? 1 : 0,
          rule.sourceLocationId || null,
          now,
          id
        );
      } else {
        db.prepare(`
          INSERT INTO organization_rules 
          (id, name, priority, enabled, description, action_type, destination_pattern, target_directory, collision_policy, dry_run_only, source_location_id, execution_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          rule.name,
          rule.priority,
          rule.enabled ? 1 : 0,
          rule.description,
          rule.actionType,
          rule.destinationPattern,
          rule.targetDirectory || null,
          rule.collisionPolicy,
          rule.dryRunOnly ? 1 : 0,
          rule.sourceLocationId || null,
          0,
          createdAt,
          now
        );
      }

      // Re-insert conditions
      db.prepare('DELETE FROM rule_conditions WHERE rule_id = ?').run(id);
      const insertCond = db.prepare('INSERT INTO rule_conditions (id, rule_id, field, operator, value, logical_op) VALUES (?, ?, ?, ?, ?, ?)');
      for (const cond of rule.conditions) {
        const condId = cond.id || 'cond_' + Math.random().toString(36).substring(2, 9);
        insertCond.run(condId, id, cond.field, cond.operator, cond.value, cond.logicalOp);
      }

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return {
      ...rule,
      id,
      executionCount: execCount,
      createdAt,
      updatedAt: now,
    };
  },

  deleteRule(id: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM organization_rules WHERE id = ?').run(id);
  },

  reorderRules(ruleIds: string[]) {
    const db = getDatabase();
    db.exec('BEGIN TRANSACTION;');
    try {
      const stmt = db.prepare('UPDATE organization_rules SET priority = ? WHERE id = ?');
      for (let i = 0; i < ruleIds.length; i++) {
        stmt.run(i + 1, ruleIds[i]);
      }
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  incrementRuleExecution(ruleName: string) {
    const db = getDatabase();
    db.prepare('UPDATE organization_rules SET execution_count = execution_count + 1 WHERE name = ?').run(ruleName);
  },

  // History
  addHistory(entry: Omit<FileOperationHistory, 'id'>): FileOperationHistory {
    const db = getDatabase();
    const id = 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const stmt = db.prepare(`
      INSERT INTO file_operation_history
      (id, timestamp, original_path, new_path, file_category, file_size, applied_rule_name, operation_type, result, error_details, content_hash, is_undone, can_undo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      entry.timestamp,
      entry.originalPath,
      entry.newPath,
      entry.fileCategory,
      entry.fileSize,
      entry.appliedRuleName,
      entry.operationType,
      entry.result,
      entry.errorDetails || null,
      entry.contentHash || null,
      entry.isUndone ? 1 : 0,
      entry.canUndo ? 1 : 0
    );

    return { ...entry, id };
  },

  getHistory(limit: number = 100, offset: number = 0, filter?: { category?: string; status?: string; search?: string }): { items: FileOperationHistory[]; total: number } {
    const db = getDatabase();
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filter?.category && filter.category !== 'all') {
      whereClauses.push('file_category = ?');
      params.push(filter.category);
    }
    if (filter?.status && filter.status !== 'all') {
      whereClauses.push('result = ?');
      params.push(filter.status);
    }
    if (filter?.search) {
      whereClauses.push('(original_path LIKE ? OR new_path LIKE ? OR applied_rule_name LIKE ?)');
      const pattern = `%${filter.search}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countRow = db.prepare(`SELECT count(*) as c FROM file_operation_history ${whereSql}`).get(...params) as { c: number };
    
    const rows = db.prepare(`SELECT * FROM file_operation_history ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as any[];

    return {
      total: countRow.c,
      items: rows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        originalPath: r.original_path,
        newPath: r.new_path,
        fileCategory: r.file_category,
        fileSize: r.file_size,
        appliedRuleName: r.applied_rule_name,
        operationType: r.operation_type,
        result: r.result,
        errorDetails: r.error_details,
        contentHash: r.content_hash,
        isUndone: Boolean(r.is_undone),
        canUndo: Boolean(r.can_undo),
      })),
    };
  },

  getHistoryItem(id: string): FileOperationHistory | null {
    const db = getDatabase();
    const r = db.prepare('SELECT * FROM file_operation_history WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      timestamp: r.timestamp,
      originalPath: r.original_path,
      newPath: r.new_path,
      fileCategory: r.file_category,
      fileSize: r.file_size,
      appliedRuleName: r.applied_rule_name,
      operationType: r.operation_type,
      result: r.result,
      errorDetails: r.error_details,
      contentHash: r.content_hash,
      isUndone: Boolean(r.is_undone),
      canUndo: Boolean(r.can_undo),
    };
  },

  markHistoryUndone(id: string) {
    const db = getDatabase();
    db.prepare('UPDATE file_operation_history SET is_undone = 1, can_undo = 0 WHERE id = ?').run(id);
  },

  // Review queue
  getReviewQueue(): PendingReviewItem[] {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM pending_review_items WHERE status = 'pending' ORDER BY detected_at DESC").all() as any[];
    return rows.map((r) => ({
      id: r.id,
      detectedAt: r.detected_at,
      originalPath: r.original_path,
      suggestedCategory: r.suggested_category,
      suggestedDestination: r.suggested_destination,
      reason: r.reason,
      fileSize: r.file_size,
      status: r.status,
    }));
  },

  addReviewItem(item: Omit<PendingReviewItem, 'id' | 'status'>): PendingReviewItem {
    const db = getDatabase();
    const id = 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO pending_review_items
      (id, detected_at, original_path, suggested_category, suggested_destination, reason, file_size, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(id, item.detectedAt, item.originalPath, item.suggestedCategory, item.suggestedDestination, item.reason, item.fileSize);
    return { ...item, id, status: 'pending' };
  },

  resolveReviewItem(id: string, status: 'approved' | 'skipped' | 'resolved') {
    const db = getDatabase();
    db.prepare('UPDATE pending_review_items SET status = ? WHERE id = ?').run(status, id);
  },

  // Settings
  getSettings(): ApplicationSettings {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM application_settings').all() as any[];
    const res = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        (res as any)[row.key] = JSON.parse(row.value);
      } catch {
        (res as any)[row.key] = row.value;
      }
    }
    return res;
  },

  updateSettings(settings: Partial<ApplicationSettings>) {
    const db = getDatabase();
    const stmt = db.prepare('INSERT OR REPLACE INTO application_settings (key, value) VALUES (?, ?)');
    db.exec('BEGIN TRANSACTION;');
    try {
      for (const [key, val] of Object.entries(settings)) {
        stmt.run(key, JSON.stringify(val));
      }
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  },

  // Overview Stats
  getOverviewStats() {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const todayCount = (db.prepare(`
      SELECT count(*) as c FROM file_operation_history 
      WHERE timestamp LIKE ? AND result = 'success'
    `).get(`${today}%`) as { c: number }).c;

    const pendingQueueCount = (db.prepare(`
      SELECT count(*) as c FROM pending_review_items WHERE status = 'pending'
    `).get() as { c: number }).c;

    const activeMonitorsCount = (db.prepare(`
      SELECT count(*) as c FROM monitored_locations WHERE enabled = 1
    `).get() as { c: number }).c;

    const errorsCount = (db.prepare(`
      SELECT count(*) as c FROM file_operation_history 
      WHERE result = 'failed' AND timestamp LIKE ?
    `).get(`${today}%`) as { c: number }).c;

    // Categories breakdown
    const categoryRows = db.prepare(`
      SELECT file_category, count(*) as count, sum(file_size) as bytes 
      FROM file_operation_history 
      WHERE result = 'success' 
      GROUP BY file_category 
      ORDER BY count DESC
    `).all() as { file_category: string; count: number; bytes: number }[];

    // Activity over last 7 days
    const recentActivityRows = db.prepare(`
      SELECT substr(timestamp, 1, 10) as day, count(*) as count 
      FROM file_operation_history 
      WHERE result = 'success' 
      GROUP BY day 
      ORDER BY day DESC 
      LIMIT 7
    `).all() as { day: string; count: number }[];

    // Monitored locations health
    const locations = this.getLocations();

    return {
      filesOrganizedToday: todayCount,
      filesWaitingInQueue: pendingQueueCount,
      activeMonitoredLocations: activeMonitorsCount,
      errorsToday: errorsCount,
      categoryDistribution: categoryRows,
      recentActivityOverTime: recentActivityRows.reverse(),
      monitoredLocations: locations,
    };
  },

  // Templates
  getTemplates(): OrganizationTemplate[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM organization_templates').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      pattern: r.pattern,
      isPreset: Boolean(r.is_preset),
    }));
  },

  saveTemplate(template: OrganizationTemplate) {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO organization_templates (id, name, description, pattern, is_preset)
      VALUES (?, ?, ?, ?, ?)
    `).run(template.id, template.name, template.description, template.pattern, template.isPreset ? 1 : 0);
  },

  deleteTemplate(id: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM organization_templates WHERE id = ? AND is_preset = 0').run(id);
  },

  // Error logger
  logError(message: string, filePath?: string, stack?: string) {
    const db = getDatabase();
    const id = 'err_' + Date.now();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO operation_errors (id, timestamp, message, path, stack) VALUES (?, ?, ?, ?, ?)').run(
      id,
      now,
      message,
      filePath || null,
      stack || null
    );
  },

  getRecentErrors(limit: number = 10) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM operation_errors ORDER BY timestamp DESC LIMIT ?').all(limit) as any[];
  },

  // Storage Analyzer persistence
  saveStorageScan(session: StorageScanSession, resultData: any) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO storage_scans 
      (id, root_path, status, started_at, finished_at, total_logical_size, total_files, total_directories, inaccessible_count, inaccessible_paths, duration_ms, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      session.id,
      session.rootPath,
      session.status,
      session.startedAt,
      session.finishedAt || null,
      session.totalLogicalSize,
      session.totalFiles,
      session.totalDirectories,
      session.inaccessibleCount,
      JSON.stringify(session.inaccessiblePaths || []),
      session.durationMs,
      resultData ? JSON.stringify(resultData) : null
    );
  },

  getLatestStorageScan(rootPath?: string): any | null {
    const db = getDatabase();
    let row: any;
    if (rootPath) {
      const normalized = path.resolve(rootPath);
      row = db.prepare('SELECT * FROM storage_scans WHERE (root_path = ? COLLATE NOCASE OR root_path = ? COLLATE NOCASE) ORDER BY started_at DESC LIMIT 1').get(rootPath, normalized);
    } else {
      row = db.prepare('SELECT * FROM storage_scans ORDER BY started_at DESC LIMIT 1').get();
    }
    if (!row) return null;
    return {
      session: {
        id: row.id,
        rootPath: row.root_path,
        status: row.status,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        totalLogicalSize: row.total_logical_size,
        totalFiles: row.total_files,
        totalDirectories: row.total_directories,
        inaccessibleCount: row.inaccessible_count,
        inaccessiblePaths: JSON.parse(row.inaccessible_paths || '[]'),
        durationMs: row.duration_ms,
      },
      data: row.data_json ? JSON.parse(row.data_json) : null,
    };
  },

  getStorageScans(limit: number = 10): StorageScanSession[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM storage_scans ORDER BY started_at DESC LIMIT ?').all(limit) as any[];
    return rows.map((row) => ({
      id: row.id,
      rootPath: row.root_path,
      status: row.status,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      totalLogicalSize: row.total_logical_size,
      totalFiles: row.total_files,
      totalDirectories: row.total_directories,
      inaccessibleCount: row.inaccessible_count,
      inaccessiblePaths: JSON.parse(row.inaccessible_paths || '[]'),
      durationMs: row.duration_ms,
    }));
  },

  // Cleanup persistence
  saveCleanupSession(report: CleanupResultReport, categories: string[]) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO cleanup_sessions 
      (id, started_at, finished_at, categories_cleaned, files_removed, files_skipped, files_failed, estimated_reclaimed_bytes, actual_disk_change_bytes, duration_ms, errors_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      report.sessionId,
      now,
      now,
      JSON.stringify(categories),
      report.filesRemoved,
      report.filesSkipped,
      report.filesFailed,
      report.estimatedReclaimedBytes,
      report.actualDiskChangeBytes,
      report.durationMs,
      JSON.stringify(report.errors || [])
    );
  },

  getCleanupHistory(limit: number = 20): any[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM cleanup_sessions ORDER BY started_at DESC LIMIT ?').all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      categoriesCleaned: JSON.parse(r.categories_cleaned || '[]'),
      filesRemoved: r.files_removed,
      filesSkipped: r.files_skipped,
      filesFailed: r.files_failed,
      estimatedReclaimedBytes: r.estimated_reclaimed_bytes,
      actualDiskChangeBytes: r.actual_disk_change_bytes,
      durationMs: r.duration_ms,
      errors: JSON.parse(r.errors_json || '[]'),
    }));
  },

  getCleanupOverview() {
    const db = getDatabase();
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_cleanups,
        SUM(estimated_reclaimed_bytes) as total_reclaimed,
        MAX(started_at) as last_cleanup
      FROM cleanup_sessions
    `).get() as any;

    return {
      totalCleanups: stats?.total_cleanups || 0,
      totalReclaimedBytes: stats?.total_reclaimed || 0,
      lastCleanupAt: stats?.last_cleanup || null,
    };
  },
};

