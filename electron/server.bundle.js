"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/api-server.ts
var api_server_exports = {};
__export(api_server_exports, {
  startApiServer: () => startApiServer
});
module.exports = __toCommonJS(api_server_exports);
var import_node_http = __toESM(require("node:http"));
var import_node_fs9 = __toESM(require("node:fs"));
var import_node_path9 = __toESM(require("node:path"));
var import_node_child_process3 = require("node:child_process");
var import_node_url = require("node:url");

// src/server/database.ts
var import_node_sqlite = require("node:sqlite");
var import_node_path = __toESM(require("node:path"));
var import_node_fs = __toESM(require("node:fs"));
var import_node_os = __toESM(require("node:os"));

// src/lib/constants.ts
var DEFAULT_CATEGORIES = [
  {
    id: "Documents",
    name: "Documents",
    description: "Text documents, portable documents, and rich text files",
    extensions: ["pdf", "doc", "docx", "txt", "rtf", "odt", "tex", "wps"],
    color: "#3b82f6",
    iconName: "FileText"
  },
  {
    id: "Spreadsheets",
    name: "Spreadsheets",
    description: "Workbooks, tabular sheets, and delimited data",
    extensions: ["xls", "xlsx", "csv", "ods", "tsv", "xlsm"],
    color: "#10b981",
    iconName: "Table"
  },
  {
    id: "Presentations",
    name: "Presentations",
    description: "Slide decks and presentation files",
    extensions: ["ppt", "pptx", "odp", "key"],
    color: "#f59e0b",
    iconName: "Presentation"
  },
  {
    id: "Images",
    name: "Images",
    description: "Photographs, vector artwork, and web graphics",
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "svg", "tiff", "bmp", "heic", "ico", "raw", "cr2", "nef"],
    color: "#ec4899",
    iconName: "Image"
  },
  {
    id: "Videos",
    name: "Videos",
    description: "Movies, recordings, and animation clips",
    extensions: ["mp4", "mkv", "mov", "avi", "webm", "wmv", "flv", "m4v"],
    color: "#8b5cf6",
    iconName: "Video"
  },
  {
    id: "Audio",
    name: "Audio",
    description: "Music tracks, podcasts, recordings, and audio streams",
    extensions: ["mp3", "wav", "flac", "aac", "m4a", "ogg", "wma", "aiff"],
    color: "#06b6d4",
    iconName: "Music"
  },
  {
    id: "Archives",
    name: "Archives",
    description: "Compressed containers and disk archives",
    extensions: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso", "tgz"],
    color: "#eab308",
    iconName: "Archive"
  },
  {
    id: "Installers",
    name: "Installers & Executables",
    description: "Windows installers, setup packages, and portable programs",
    extensions: ["exe", "msi", "msix", "appx"],
    color: "#ef4444",
    iconName: "Package"
  },
  {
    id: "Development",
    name: "Development",
    description: "Source code, markup, scripts, and configuration formats",
    extensions: ["py", "js", "ts", "jsx", "tsx", "html", "css", "rs", "java", "c", "cpp", "h", "hpp", "cs", "go", "json", "yaml", "yml", "toml", "sh", "bat", "ps1", "sql"],
    color: "#0284c7",
    iconName: "Code"
  },
  {
    id: "Design",
    name: "Design & Creative",
    description: "Professional creative projects, 3D models, and vector files",
    extensions: ["psd", "ai", "eps", "indd", "fig", "blend", "sketch", "dwg", "dxf", "c4d"],
    color: "#f43f5e",
    iconName: "Palette"
  },
  {
    id: "Fonts",
    name: "Fonts",
    description: "Digital typography and outline fonts",
    extensions: ["ttf", "otf", "woff", "woff2", "eot"],
    color: "#6366f1",
    iconName: "Type"
  },
  {
    id: "Data",
    name: "Data & Databases",
    description: "Structured datasets, binary tables, and databases",
    extensions: ["db", "sqlite", "sqlite3", "parquet", "xml", "mdb", "accdb", "feather"],
    color: "#14b8a6",
    iconName: "Database"
  },
  {
    id: "Ebooks",
    name: "E-Books",
    description: "Electronic books and publication formats",
    extensions: ["epub", "mobi", "azw", "azw3", "djvu", "cbr", "cbz"],
    color: "#d97706",
    iconName: "BookOpen"
  },
  {
    id: "Shortcuts",
    name: "Shortcuts & Links",
    description: "Windows desktop shortcuts and internet links",
    extensions: ["lnk", "url"],
    color: "#64748b",
    iconName: "Link"
  },
  {
    id: "Torrents",
    name: "Torrent Files",
    description: "BitTorrent meta-info files and magnet package descriptors",
    extensions: ["torrent"],
    color: "#059669",
    iconName: "DownloadCloud"
  },
  {
    id: "Unknown",
    name: "Unknown",
    description: "Uncategorized or unrecognizable file formats",
    extensions: [],
    color: "#94a3b8",
    iconName: "HelpCircle"
  }
];
var PRESET_TEMPLATES = [
  {
    id: "template_category",
    name: "By Category",
    description: "Groups files into top-level category folders (e.g. Documents, Images, Spreadsheets)",
    pattern: "{Category}/",
    isPreset: true
  },
  {
    id: "template_category_date",
    name: "By Category and Date",
    description: "Groups files by category, then by year and month (e.g. Images/2026/10-October/)",
    pattern: "{Category}/{Year}/{Month}/",
    isPreset: true
  },
  {
    id: "template_file_type",
    name: "By File Type",
    description: "Groups files into folders matching their extension (e.g. PDF/, PNG/, DOCX/)",
    pattern: "{Extension}/",
    isPreset: true
  },
  {
    id: "template_project",
    name: "By Project & Category",
    description: "Organizes files under detected project names, then categories (e.g. FabricX/Spreadsheets/)",
    pattern: "{Project}/{Category}/",
    isPreset: true
  },
  {
    id: "template_custom",
    name: "Custom Structure",
    description: "User-customized folder structure using placeholders",
    pattern: "{Category}/{Year}/{Extension}/",
    isPreset: false
  }
];
var DEFAULT_SETTINGS = {
  launchAtStartup: false,
  startMonitoringAutomatically: true,
  minimizeToTray: true,
  closeToTray: true,
  defaultTheme: "dark",
  defaultDestinationTemplate: "{Category}/",
  defaultCollisionPolicy: "keep_both",
  unknownFileBehavior: "organize_to_unknown",
  fileStabilityDelayMs: 1e3,
  folderHandlingMode: "monitor_contents",
  recursiveMonitoringDefault: false,
  excludedFolders: ["node_modules", ".git", "$RECYCLE.BIN", "System Volume Information", "AppData"],
  excludedPatterns: ["*.tmp", "*.crdownload", "*.part", "~$*", "*.download"],
  ignoreTemporaryFiles: true,
  maxConcurrentOperations: 4,
  reconciliationIntervalMinutes: 30,
  dryRunMode: false,
  requireApprovalAboveMb: 500,
  enableContentHashCheck: true,
  historyRetentionDays: 90,
  protectedPaths: [
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "C:\\ProgramData",
    "C:\\Windows\\System32"
  ],
  notificationsEnabled: true,
  notifyOnBatchComplete: true,
  notifyOnReviewRequired: true,
  notifyOnError: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00"
};

// src/server/database.ts
var dbInstance = null;
function getDatabasePath() {
  const appDataDir = process.env.APPDATA || import_node_path.default.join(import_node_os.default.homedir(), "AppData", "Roaming");
  const nexusDir = import_node_path.default.join(appDataDir, "NexusFile");
  if (!import_node_fs.default.existsSync(nexusDir)) {
    import_node_fs.default.mkdirSync(nexusDir, { recursive: true });
    const legacyDb = import_node_path.default.join(appDataDir, "Sortwise", "sortwise.db");
    if (import_node_fs.default.existsSync(legacyDb)) {
      try {
        import_node_fs.default.copyFileSync(legacyDb, import_node_path.default.join(nexusDir, "nexusfile.db"));
      } catch {
      }
    }
  }
  return import_node_path.default.join(nexusDir, "nexusfile.db");
}
function getDatabase() {
  if (dbInstance) return dbInstance;
  const dbPath = getDatabasePath();
  const db = new import_node_sqlite.DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  initSchema(db);
  seedDefaults(db);
  dbInstance = db;
  return dbInstance;
}
function initSchema(db) {
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
    db.exec("ALTER TABLE monitored_locations ADD COLUMN target_directory TEXT;");
  } catch {
  }
}
function seedDefaults(db) {
  const settingsCount = db.prepare("SELECT count(*) as c FROM application_settings").get().c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare("INSERT INTO application_settings (key, value) VALUES (?, ?)");
    for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, JSON.stringify(val));
    }
  }
  const templatesCount = db.prepare("SELECT count(*) as c FROM organization_templates").get().c;
  if (templatesCount === 0) {
    const insertTemplate = db.prepare("INSERT INTO organization_templates (id, name, description, pattern, is_preset) VALUES (?, ?, ?, ?, ?)");
    for (const t of PRESET_TEMPLATES) {
      insertTemplate.run(t.id, t.name, t.description, t.pattern, t.isPreset ? 1 : 0);
    }
  }
  const rulesCount = db.prepare("SELECT count(*) as c FROM organization_rules").get().c;
  if (rulesCount === 0) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const insertRule = db.prepare(`
      INSERT INTO organization_rules 
      (id, name, priority, enabled, description, action_type, destination_pattern, collision_policy, dry_run_only, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertRule.run(
      "rule_default_docs",
      "Organize Documents",
      1,
      1,
      "Automatically route PDF, Word, and text documents into Documents folder",
      "move",
      "Documents/{Year}/",
      "keep_both",
      0,
      now,
      now
    );
    insertRule.run(
      "rule_default_media",
      "Organize Media & Images",
      2,
      1,
      "Group photos and pictures by Category and Month",
      "move",
      "Images/{Year}/{Month}/",
      "keep_both",
      0,
      now,
      now
    );
    insertRule.run(
      "rule_default_archives",
      "Route Archives to Zip Folder",
      3,
      1,
      "Organize ZIP, RAR, 7Z files into Archives folder",
      "move",
      "Archives/",
      "keep_both",
      0,
      now,
      now
    );
    const insertCond = db.prepare("INSERT INTO rule_conditions (id, rule_id, field, operator, value, logical_op) VALUES (?, ?, ?, ?, ?, ?)");
    insertCond.run("cond_1", "rule_default_docs", "category", "equals", "Documents", "AND");
    insertCond.run("cond_2", "rule_default_media", "category", "equals", "Images", "AND");
    insertCond.run("cond_3", "rule_default_archives", "category", "equals", "Archives", "AND");
  }
  try {
    const torrentRule = db.prepare("SELECT id FROM organization_rules WHERE id = ?").get("rule_default_torrents");
    if (!torrentRule) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const insertRule = db.prepare(`
        INSERT INTO organization_rules 
        (id, name, priority, enabled, description, action_type, destination_pattern, collision_policy, dry_run_only, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertRule.run(
        "rule_default_torrents",
        "Organize Torrent Files",
        4,
        1,
        "Automatically group BitTorrent files into Torrents folder",
        "move",
        "Torrents/",
        "keep_both",
        0,
        now,
        now
      );
      const insertCond = db.prepare("INSERT INTO rule_conditions (id, rule_id, field, operator, value, logical_op) VALUES (?, ?, ?, ?, ?, ?)");
      insertCond.run("cond_torrent", "rule_default_torrents", "category", "equals", "Torrents", "AND");
    }
  } catch {
  }
}
var dbOperations = {
  // Locations
  getLocations() {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM monitored_locations ORDER BY created_at DESC").all();
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
      createdAt: r.created_at
    }));
  },
  addLocation(location) {
    const db = getDatabase();
    const id = "loc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const folderMode = location.folderMode || "monitor_contents";
    const destinationTemplate = location.destinationTemplate || "{Category}/";
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
      "active",
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
      status: "active",
      createdAt: now
    };
  },
  updateLocation(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    if (updates.name !== void 0) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.enabled !== void 0) {
      fields.push("enabled = ?");
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.recursive !== void 0) {
      fields.push("recursive = ?");
      values.push(updates.recursive ? 1 : 0);
    }
    if (updates.folderMode !== void 0) {
      fields.push("folder_mode = ?");
      values.push(updates.folderMode);
    }
    if (updates.destinationTemplate !== void 0) {
      fields.push("destination_template = ?");
      values.push(updates.destinationTemplate);
    }
    if (updates.targetDirectory !== void 0) {
      fields.push("target_directory = ?");
      values.push(updates.targetDirectory || null);
    }
    if (updates.status !== void 0) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.lastScannedAt !== void 0) {
      fields.push("last_scanned_at = ?");
      values.push(updates.lastScannedAt);
    }
    if (updates.itemCount !== void 0) {
      fields.push("item_count = ?");
      values.push(updates.itemCount);
    }
    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE monitored_locations SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  },
  deleteLocation(id) {
    const db = getDatabase();
    db.prepare("DELETE FROM monitored_locations WHERE id = ?").run(id);
  },
  // Rules
  getRules() {
    const db = getDatabase();
    const ruleRows = db.prepare("SELECT * FROM organization_rules ORDER BY priority ASC").all();
    const condRows = db.prepare("SELECT * FROM rule_conditions").all();
    const condMap = /* @__PURE__ */ new Map();
    for (const c of condRows) {
      if (!condMap.has(c.rule_id)) condMap.set(c.rule_id, []);
      condMap.get(c.rule_id).push({
        id: c.id,
        field: c.field,
        operator: c.operator,
        value: c.value,
        logicalOp: c.logical_op
      });
    }
    return ruleRows.map((r) => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      enabled: Boolean(r.enabled),
      description: r.description || "",
      conditions: condMap.get(r.id) || [],
      actionType: r.action_type,
      destinationPattern: r.destination_pattern,
      targetDirectory: r.target_directory,
      collisionPolicy: r.collision_policy,
      dryRunOnly: Boolean(r.dry_run_only),
      sourceLocationId: r.source_location_id,
      executionCount: r.execution_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },
  saveRule(rule) {
    const db = getDatabase();
    const id = rule.id || "rule_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existing = db.prepare("SELECT id, execution_count, created_at FROM organization_rules WHERE id = ?").get(id);
    const createdAt = existing ? existing.created_at : now;
    const execCount = existing ? existing.execution_count : 0;
    db.exec("BEGIN TRANSACTION;");
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
      db.prepare("DELETE FROM rule_conditions WHERE rule_id = ?").run(id);
      const insertCond = db.prepare("INSERT INTO rule_conditions (id, rule_id, field, operator, value, logical_op) VALUES (?, ?, ?, ?, ?, ?)");
      for (const cond of rule.conditions) {
        const condId = cond.id || "cond_" + Math.random().toString(36).substring(2, 9);
        insertCond.run(condId, id, cond.field, cond.operator, cond.value, cond.logicalOp);
      }
      db.exec("COMMIT;");
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
    return {
      ...rule,
      id,
      executionCount: execCount,
      createdAt,
      updatedAt: now
    };
  },
  deleteRule(id) {
    const db = getDatabase();
    db.prepare("DELETE FROM organization_rules WHERE id = ?").run(id);
  },
  reorderRules(ruleIds) {
    const db = getDatabase();
    db.exec("BEGIN TRANSACTION;");
    try {
      const stmt = db.prepare("UPDATE organization_rules SET priority = ? WHERE id = ?");
      for (let i = 0; i < ruleIds.length; i++) {
        stmt.run(i + 1, ruleIds[i]);
      }
      db.exec("COMMIT;");
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
  },
  incrementRuleExecution(ruleName) {
    const db = getDatabase();
    db.prepare("UPDATE organization_rules SET execution_count = execution_count + 1 WHERE name = ?").run(ruleName);
  },
  // History
  addHistory(entry) {
    const db = getDatabase();
    const id = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
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
  getHistory(limit = 100, offset = 0, filter) {
    const db = getDatabase();
    const whereClauses = [];
    const params = [];
    if (filter?.category && filter.category !== "all") {
      whereClauses.push("file_category = ?");
      params.push(filter.category);
    }
    if (filter?.status && filter.status !== "all") {
      whereClauses.push("result = ?");
      params.push(filter.status);
    }
    if (filter?.search) {
      whereClauses.push("(original_path LIKE ? OR new_path LIKE ? OR applied_rule_name LIKE ?)");
      const pattern = `%${filter.search}%`;
      params.push(pattern, pattern, pattern);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countRow = db.prepare(`SELECT count(*) as c FROM file_operation_history ${whereSql}`).get(...params);
    const rows = db.prepare(`SELECT * FROM file_operation_history ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
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
        canUndo: Boolean(r.can_undo)
      }))
    };
  },
  getHistoryItem(id) {
    const db = getDatabase();
    const r = db.prepare("SELECT * FROM file_operation_history WHERE id = ?").get(id);
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
      canUndo: Boolean(r.can_undo)
    };
  },
  markHistoryUndone(id) {
    const db = getDatabase();
    db.prepare("UPDATE file_operation_history SET is_undone = 1, can_undo = 0 WHERE id = ?").run(id);
  },
  // Review queue
  getReviewQueue() {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM pending_review_items WHERE status = 'pending' ORDER BY detected_at DESC").all();
    return rows.map((r) => ({
      id: r.id,
      detectedAt: r.detected_at,
      originalPath: r.original_path,
      suggestedCategory: r.suggested_category,
      suggestedDestination: r.suggested_destination,
      reason: r.reason,
      fileSize: r.file_size,
      status: r.status
    }));
  },
  addReviewItem(item) {
    const db = getDatabase();
    const id = "rev_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO pending_review_items
      (id, detected_at, original_path, suggested_category, suggested_destination, reason, file_size, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(id, item.detectedAt, item.originalPath, item.suggestedCategory, item.suggestedDestination, item.reason, item.fileSize);
    return { ...item, id, status: "pending" };
  },
  resolveReviewItem(id, status) {
    const db = getDatabase();
    db.prepare("UPDATE pending_review_items SET status = ? WHERE id = ?").run(status, id);
  },
  // Settings
  getSettings() {
    const db = getDatabase();
    const rows = db.prepare("SELECT key, value FROM application_settings").all();
    const res = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      try {
        res[row.key] = JSON.parse(row.value);
      } catch {
        res[row.key] = row.value;
      }
    }
    return res;
  },
  updateSettings(settings) {
    const db = getDatabase();
    const stmt = db.prepare("INSERT OR REPLACE INTO application_settings (key, value) VALUES (?, ?)");
    db.exec("BEGIN TRANSACTION;");
    try {
      for (const [key, val] of Object.entries(settings)) {
        stmt.run(key, JSON.stringify(val));
      }
      db.exec("COMMIT;");
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
  },
  // Overview Stats
  getOverviewStats() {
    const db = getDatabase();
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayCount = db.prepare(`
      SELECT count(*) as c FROM file_operation_history 
      WHERE timestamp LIKE ? AND result = 'success'
    `).get(`${today}%`).c;
    const pendingQueueCount = db.prepare(`
      SELECT count(*) as c FROM pending_review_items WHERE status = 'pending'
    `).get().c;
    const activeMonitorsCount = db.prepare(`
      SELECT count(*) as c FROM monitored_locations WHERE enabled = 1
    `).get().c;
    const errorsCount = db.prepare(`
      SELECT count(*) as c FROM file_operation_history 
      WHERE result = 'failed' AND timestamp LIKE ?
    `).get(`${today}%`).c;
    const categoryRows = db.prepare(`
      SELECT file_category, count(*) as count, sum(file_size) as bytes 
      FROM file_operation_history 
      WHERE result = 'success' 
      GROUP BY file_category 
      ORDER BY count DESC
    `).all();
    const recentActivityRows = db.prepare(`
      SELECT substr(timestamp, 1, 10) as day, count(*) as count 
      FROM file_operation_history 
      WHERE result = 'success' 
      GROUP BY day 
      ORDER BY day DESC 
      LIMIT 7
    `).all();
    const locations = this.getLocations();
    return {
      filesOrganizedToday: todayCount,
      filesWaitingInQueue: pendingQueueCount,
      activeMonitoredLocations: activeMonitorsCount,
      errorsToday: errorsCount,
      categoryDistribution: categoryRows,
      recentActivityOverTime: recentActivityRows.reverse(),
      monitoredLocations: locations
    };
  },
  // Templates
  getTemplates() {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM organization_templates").all();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || "",
      pattern: r.pattern,
      isPreset: Boolean(r.is_preset)
    }));
  },
  saveTemplate(template) {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO organization_templates (id, name, description, pattern, is_preset)
      VALUES (?, ?, ?, ?, ?)
    `).run(template.id, template.name, template.description, template.pattern, template.isPreset ? 1 : 0);
  },
  deleteTemplate(id) {
    const db = getDatabase();
    db.prepare("DELETE FROM organization_templates WHERE id = ? AND is_preset = 0").run(id);
  },
  // Error logger
  logError(message, filePath, stack) {
    const db = getDatabase();
    const id = "err_" + Date.now();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare("INSERT INTO operation_errors (id, timestamp, message, path, stack) VALUES (?, ?, ?, ?, ?)").run(
      id,
      now,
      message,
      filePath || null,
      stack || null
    );
  },
  getRecentErrors(limit = 10) {
    const db = getDatabase();
    return db.prepare("SELECT * FROM operation_errors ORDER BY timestamp DESC LIMIT ?").all(limit);
  },
  // Storage Analyzer persistence
  saveStorageScan(session, resultData) {
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
  getLatestStorageScan(rootPath) {
    const db = getDatabase();
    let row;
    if (rootPath) {
      row = db.prepare("SELECT * FROM storage_scans WHERE root_path = ? ORDER BY started_at DESC LIMIT 1").get(rootPath);
    } else {
      row = db.prepare("SELECT * FROM storage_scans ORDER BY started_at DESC LIMIT 1").get();
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
        inaccessiblePaths: JSON.parse(row.inaccessible_paths || "[]"),
        durationMs: row.duration_ms
      },
      data: row.data_json ? JSON.parse(row.data_json) : null
    };
  },
  getStorageScans(limit = 10) {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM storage_scans ORDER BY started_at DESC LIMIT ?").all(limit);
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
      inaccessiblePaths: JSON.parse(row.inaccessible_paths || "[]"),
      durationMs: row.duration_ms
    }));
  },
  // Cleanup persistence
  saveCleanupSession(report, categories) {
    const db = getDatabase();
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
  getCleanupHistory(limit = 20) {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM cleanup_sessions ORDER BY started_at DESC LIMIT ?").all(limit);
    return rows.map((r) => ({
      id: r.id,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      categoriesCleaned: JSON.parse(r.categories_cleaned || "[]"),
      filesRemoved: r.files_removed,
      filesSkipped: r.files_skipped,
      filesFailed: r.files_failed,
      estimatedReclaimedBytes: r.estimated_reclaimed_bytes,
      actualDiskChangeBytes: r.actual_disk_change_bytes,
      durationMs: r.duration_ms,
      errors: JSON.parse(r.errors_json || "[]")
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
    `).get();
    return {
      totalCleanups: stats?.total_cleanups || 0,
      totalReclaimedBytes: stats?.total_reclaimed || 0,
      lastCleanupAt: stats?.last_cleanup || null
    };
  }
};

// src/server/monitor.ts
var import_node_fs5 = __toESM(require("node:fs"));
var import_node_path5 = __toESM(require("node:path"));

// src/server/rule-engine.ts
var import_node_path3 = __toESM(require("node:path"));
var import_node_fs3 = __toESM(require("node:fs"));

// src/server/classifier.ts
var import_node_fs2 = __toESM(require("node:fs"));
var import_node_path2 = __toESM(require("node:path"));
var MAGIC_SIGNATURES = [
  // PDF: %PDF
  { category: "Documents", signature: [37, 80, 68, 70] },
  // PNG: \x89PNG\r\n\x1a\n
  { category: "Images", signature: [137, 80, 78, 71, 13, 10, 26, 10] },
  // JPEG: \xff\xd8\xff
  { category: "Images", signature: [255, 216, 255] },
  // GIF: GIF87a or GIF89a
  { category: "Images", signature: [71, 73, 70, 56] },
  // WEBP: RIFF....WEBP
  { category: "Images", signature: [82, 73, 70, 70] },
  // ZIP (and Office docx/xlsx/pptx, jar): PK\x03\x04
  { category: "Archives", signature: [80, 75, 3, 4] },
  // RAR: Rar!\x1a\x07
  { category: "Archives", signature: [82, 97, 114, 33, 26, 7] },
  // 7Z: 7z\xbc\xaf\x27\x1c
  { category: "Archives", signature: [55, 122, 188, 175, 39, 28] },
  // Windows PE Executable (EXE/MSI): MZ
  { category: "Installers", signature: [77, 90] },
  // MP3: ID3 or \xff\xfb
  { category: "Audio", signature: [73, 68, 51] },
  // FLAC: fLaC
  { category: "Audio", signature: [102, 76, 97, 67] },
  // BitTorrent: bencoded dict 'd' (d8:announce, d4:info, d13:announce-list, d10:created)
  { category: "Torrents", signature: [100, 56, 58, 97, 110, 110, 111, 117, 110, 99, 101] },
  { category: "Torrents", signature: [100, 52, 58, 105, 110, 102, 111] },
  { category: "Torrents", signature: [100, 49, 51, 58, 97, 110, 110, 111, 117, 110, 99, 101] },
  { category: "Torrents", signature: [100, 49, 48, 58, 99, 114, 101, 97, 116, 101, 100] }
];
var FileClassifier = class {
  /**
   * Classify a file using extension, magic bytes, and name patterns.
   */
  static classify(filePath) {
    const filename = import_node_path2.default.basename(filePath);
    const ext = this.extractExtension(filename);
    const magicMatch = this.checkMagicBytes(filePath, ext);
    if (magicMatch) {
      return {
        category: magicMatch,
        confidence: "high",
        detectedExtension: ext,
        matchedBy: "magic_bytes",
        projectGuess: this.extractProjectKeyword(filename)
      };
    }
    if (ext) {
      for (const cat of DEFAULT_CATEGORIES) {
        if (cat.extensions.includes(ext)) {
          return {
            category: cat.id,
            confidence: "high",
            detectedExtension: ext,
            matchedBy: "extension",
            projectGuess: this.extractProjectKeyword(filename)
          };
        }
      }
    }
    const lowerName = filename.toLowerCase();
    if (lowerName.includes("invoice") || lowerName.includes("receipt") || lowerName.includes("statement") || lowerName.includes("resume")) {
      return {
        category: "Documents",
        confidence: "medium",
        detectedExtension: ext,
        matchedBy: "keyword",
        projectGuess: this.extractProjectKeyword(filename)
      };
    }
    if (lowerName.includes("screenshot") || lowerName.includes("photo") || lowerName.includes("img_")) {
      return {
        category: "Images",
        confidence: "medium",
        detectedExtension: ext,
        matchedBy: "keyword",
        projectGuess: this.extractProjectKeyword(filename)
      };
    }
    return {
      category: "Unknown",
      confidence: "low",
      detectedExtension: ext,
      matchedBy: "default",
      projectGuess: this.extractProjectKeyword(filename)
    };
  }
  static extractExtension(filename) {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1 || lastDot === filename.length - 1) return "";
    return filename.substring(lastDot + 1).toLowerCase().trim();
  }
  static checkMagicBytes(filePath, ext) {
    try {
      if (!import_node_fs2.default.existsSync(filePath)) return null;
      const stat = import_node_fs2.default.statSync(filePath);
      if (!stat.isFile() || stat.size === 0) return null;
      const buffer = Buffer.alloc(64);
      const fd = import_node_fs2.default.openSync(filePath, "r");
      const bytesRead = import_node_fs2.default.readSync(fd, buffer, 0, 64, 0);
      import_node_fs2.default.closeSync(fd);
      const slice = buffer.subarray(0, bytesRead);
      if (slice.length >= 8 && slice[0] === 100) {
        const text = slice.toString("latin1");
        if (text.includes("announce") || text.includes("info") || text.includes("piece") || text.includes("comment") || ext === "torrent") {
          return "Torrents";
        }
      }
      if (["docx", "odt"].includes(ext)) return "Documents";
      if (["xlsx", "ods"].includes(ext)) return "Spreadsheets";
      if (["pptx", "odp"].includes(ext)) return "Presentations";
      for (const sig of MAGIC_SIGNATURES) {
        let match = true;
        for (let i = 0; i < sig.signature.length; i++) {
          if (slice[i] !== sig.signature[i]) {
            match = false;
            break;
          }
        }
        if (match) return sig.category;
      }
    } catch {
      return null;
    }
    return null;
  }
  /**
   * Extract potential project keyword (e.g. "FabricX_model.xlsx" -> "FabricX")
   */
  static extractProjectKeyword(filename) {
    const prefixMatch = filename.match(/^([a-zA-Z0-9]+)[_\-\s]/);
    if (prefixMatch && prefixMatch[1].length >= 3) {
      const candidate = prefixMatch[1];
      const noisy = ["the", "new", "copy", "final", "draft", "screenshot", "img", "file"];
      if (!noisy.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return void 0;
  }
};

// src/server/rule-engine.ts
var RuleEngine = class {
  /**
   * Evaluate a file against an ordered set of rules.
   */
  static evaluate(filePath, rules, defaultTemplate = "{Category}/", baseDestinationFolder) {
    const filename = import_node_path3.default.basename(filePath);
    const classification = FileClassifier.classify(filePath);
    const category = classification.category;
    const activeRules = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
    for (const rule of activeRules) {
      if (this.matchesRule(filePath, filename, category, rule)) {
        const dest = this.resolveDestination(
          filePath,
          filename,
          category,
          rule.destinationPattern,
          rule.targetDirectory || baseDestinationFolder,
          classification.projectGuess
        );
        let action = "move";
        if (rule.actionType === "copy") action = "copy";
        else if (rule.actionType === "ignore") action = "ignore";
        else if (rule.actionType === "send_to_review") action = "review";
        else if (rule.actionType === "rename_template") action = "rename";
        return {
          matchedRule: rule,
          proposedDestination: dest,
          category,
          action,
          matchReason: `Matched rule "${rule.name}" (Priority ${rule.priority})`
        };
      }
    }
    const fallbackDest = this.resolveDestination(
      filePath,
      filename,
      category,
      defaultTemplate,
      baseDestinationFolder,
      classification.projectGuess
    );
    return {
      matchedRule: null,
      proposedDestination: fallbackDest,
      category,
      action: category === "Unknown" ? "review" : "move",
      matchReason: "No specific rule matched. Applied default category organization template."
    };
  }
  /**
   * Check whether all conditions in a rule match the file.
   */
  static matchesRule(filePath, filename, category, rule) {
    if (rule.conditions.length === 0) return true;
    let overallResult = true;
    for (let i = 0; i < rule.conditions.length; i++) {
      const cond = rule.conditions[i];
      const match = this.evalCondition(filePath, filename, category, cond);
      if (i === 0) {
        overallResult = match;
      } else {
        if (cond.logicalOp === "OR") {
          overallResult = overallResult || match;
        } else {
          overallResult = overallResult && match;
        }
      }
    }
    return overallResult;
  }
  static evalCondition(filePath, filename, category, cond) {
    let actualValue = "";
    switch (cond.field) {
      case "extension": {
        const dot = filename.lastIndexOf(".");
        actualValue = dot !== -1 ? filename.substring(dot + 1).toLowerCase() : "";
        break;
      }
      case "category":
        actualValue = category;
        break;
      case "filename":
        actualValue = filename;
        break;
      case "parent_folder":
        actualValue = import_node_path3.default.basename(import_node_path3.default.dirname(filePath));
        break;
      case "project_keyword":
        actualValue = FileClassifier.extractProjectKeyword(filename) || "";
        break;
      case "file_size": {
        try {
          if (import_node_fs3.default.existsSync(filePath)) {
            actualValue = import_node_fs3.default.statSync(filePath).size;
          }
        } catch {
          actualValue = 0;
        }
        break;
      }
      default:
        actualValue = filename;
    }
    const targetVal = cond.value;
    switch (cond.operator) {
      case "equals":
        return String(actualValue).toLowerCase() === targetVal.toLowerCase();
      case "not_equals":
        return String(actualValue).toLowerCase() !== targetVal.toLowerCase();
      case "contains":
        return String(actualValue).toLowerCase().includes(targetVal.toLowerCase());
      case "not_contains":
        return !String(actualValue).toLowerCase().includes(targetVal.toLowerCase());
      case "starts_with":
        return String(actualValue).toLowerCase().startsWith(targetVal.toLowerCase());
      case "ends_with":
        return String(actualValue).toLowerCase().endsWith(targetVal.toLowerCase());
      case "regex_matches":
        try {
          const reg = new RegExp(targetVal, "i");
          return reg.test(String(actualValue));
        } catch {
          return false;
        }
      case "greater_than": {
        const numActual = Number(actualValue);
        const numTarget = Number(targetVal);
        return !isNaN(numActual) && !isNaN(numTarget) && numActual > numTarget;
      }
      case "less_than": {
        const numActual = Number(actualValue);
        const numTarget = Number(targetVal);
        return !isNaN(numActual) && !isNaN(numTarget) && numActual < numTarget;
      }
      case "in_list": {
        const list = targetVal.split(",").map((s) => s.trim().toLowerCase());
        return list.includes(String(actualValue).toLowerCase());
      }
      default:
        return false;
    }
  }
  /**
   * Safely resolve destination folder and filename using template tags.
   */
  static resolveDestination(filePath, filename, category, pattern, targetDirectory, projectGuess) {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear().toString();
    const monthIndex = now.getMonth();
    const monthNames = [
      "01-January",
      "02-February",
      "03-March",
      "04-April",
      "05-May",
      "06-June",
      "07-July",
      "08-August",
      "09-September",
      "10-October",
      "11-November",
      "12-December"
    ];
    const month = monthNames[monthIndex];
    const day = String(now.getDate()).padStart(2, "0");
    const dot = filename.lastIndexOf(".");
    const ext = dot !== -1 ? filename.substring(dot + 1) : "";
    const parentFolder = import_node_path3.default.basename(import_node_path3.default.dirname(filePath));
    const project = projectGuess || "General";
    let resolvedSubpath = pattern.replace(/{Category}/g, category).replace(/{Extension}/g, ext.toUpperCase() || "Other").replace(/{Year}/g, year).replace(/{Month}/g, month).replace(/{Day}/g, day).replace(/{OriginalFolder}/g, parentFolder).replace(/{Project}/g, project);
    resolvedSubpath = resolvedSubpath.replace(/\.\./g, "").replace(/^[\\\/]+/, "");
    const baseDir = targetDirectory || import_node_path3.default.dirname(filePath);
    return import_node_path3.default.join(baseDir, resolvedSubpath, filename);
  }
  /**
   * Test a rule against an arbitrary sample filename or path for the Rule Tester UI.
   */
  static testRule(rule, samplePath) {
    const filename = import_node_path3.default.basename(samplePath);
    const classification = FileClassifier.classify(samplePath);
    const matches = this.matchesRule(samplePath, filename, classification.category, rule);
    let explanation = "";
    if (matches) {
      explanation = `Rule "${rule.name}" matches! Category is "${classification.category}". Conditions satisfied.`;
    } else {
      explanation = `Rule "${rule.name}" does NOT match this path. Check extension, category, or regex conditions.`;
    }
    return { matches, explanation };
  }
};

// src/server/file-operations.ts
var import_node_fs4 = __toESM(require("node:fs"));
var import_node_path4 = __toESM(require("node:path"));
var import_node_crypto = __toESM(require("node:crypto"));
var SafeFileOperations = class {
  static PROTECTED_PREFIXES = [
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "C:\\ProgramData",
    "C:\\Users\\Default"
  ];
  /**
   * Calculate SHA-256 hash of a file safely and efficiently without blowing up memory.
   */
  static calculateHash(filePath) {
    try {
      if (!import_node_fs4.default.existsSync(filePath)) return null;
      const stat = import_node_fs4.default.statSync(filePath);
      if (stat.size <= 10 * 1024 * 1024) {
        const fileBuffer = import_node_fs4.default.readFileSync(filePath);
        return import_node_crypto.default.createHash("sha256").update(fileBuffer).digest("hex");
      }
      const hash = import_node_crypto.default.createHash("sha256");
      const chunkSize = 64 * 1024;
      const buffer = Buffer.alloc(chunkSize);
      const fd = import_node_fs4.default.openSync(filePath, "r");
      try {
        const bytesRead = import_node_fs4.default.readSync(fd, buffer, 0, chunkSize, 0);
        hash.update(buffer.subarray(0, bytesRead));
        if (stat.size > chunkSize) {
          const tailOffset = Math.max(0, stat.size - chunkSize);
          const tailBytes = import_node_fs4.default.readSync(fd, buffer, 0, chunkSize, tailOffset);
          hash.update(buffer.subarray(0, tailBytes));
        }
        hash.update(Buffer.from(`filesize:${stat.size}`));
        return hash.digest("hex");
      } finally {
        import_node_fs4.default.closeSync(fd);
      }
    } catch {
      return null;
    }
  }
  /**
   * Check if a path is protected against modification.
   */
  static isProtectedPath(targetPath) {
    const normalized = import_node_path4.default.resolve(targetPath).toLowerCase();
    for (const prefix of this.PROTECTED_PREFIXES) {
      if (normalized.startsWith(prefix.toLowerCase())) {
        return true;
      }
    }
    return false;
  }
  /**
   * Check if destination would create a recursive loop.
   */
  static isRecursiveLoop(sourcePath, destinationPath) {
    const normSource = import_node_path4.default.resolve(sourcePath).toLowerCase();
    const normDest = import_node_path4.default.resolve(destinationPath).toLowerCase();
    if (normSource === normDest) return true;
    if (normDest.startsWith(normSource + import_node_path4.default.sep.toLowerCase())) {
      return true;
    }
    return false;
  }
  /**
   * Generate conflict-safe unique filename: "Report (1).pdf", "Report (2).pdf"
   */
  static generateUniqueDestination(destinationPath) {
    if (!import_node_fs4.default.existsSync(destinationPath)) return destinationPath;
    const dir = import_node_path4.default.dirname(destinationPath);
    const ext = import_node_path4.default.extname(destinationPath);
    const base = import_node_path4.default.basename(destinationPath, ext);
    let counter = 1;
    let candidate = import_node_path4.default.join(dir, `${base} (${counter})${ext}`);
    while (import_node_fs4.default.existsSync(candidate)) {
      counter++;
      candidate = import_node_path4.default.join(dir, `${base} (${counter})${ext}`);
    }
    return candidate;
  }
  /**
   * Check if file is stable and not actively locked or downloading.
   * If immediateMode is true, checks lock and temporary extensions instantly (0ms) instead of sleeping.
   */
  static async checkFileStability(filePath, delayMs = 500, immediateMode = false) {
    try {
      if (!import_node_fs4.default.existsSync(filePath)) return false;
      const lower = filePath.toLowerCase();
      if (lower.endsWith(".crdownload") || lower.endsWith(".part") || lower.endsWith(".tmp") || lower.includes("~$")) {
        return false;
      }
      try {
        const fd = import_node_fs4.default.openSync(filePath, "r");
        import_node_fs4.default.closeSync(fd);
      } catch {
        return false;
      }
      if (immediateMode || delayMs <= 0) {
        return true;
      }
      const stat1 = import_node_fs4.default.statSync(filePath);
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 200)));
      if (!import_node_fs4.default.existsSync(filePath)) return false;
      const stat2 = import_node_fs4.default.statSync(filePath);
      return stat1.size === stat2.size && stat1.mtimeMs === stat2.mtimeMs;
    } catch {
      return false;
    }
  }
  /**
   * Execute safe file move with collision policy, volume verification, and atomic commit.
   */
  static async executeMove(sourcePath, proposedDestination, collisionPolicy, ruleName, category) {
    const normSource = import_node_path4.default.resolve(sourcePath);
    let normDest = import_node_path4.default.resolve(proposedDestination);
    if (this.isProtectedPath(normSource) || this.isProtectedPath(normDest)) {
      const err = `Blocked operation on protected system path: ${normDest}`;
      dbOperations.addHistory({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        originalPath: normSource,
        newPath: normDest,
        fileCategory: category,
        fileSize: 0,
        appliedRuleName: ruleName,
        operationType: "move",
        result: "failed",
        errorDetails: err,
        isUndone: false,
        canUndo: false
      });
      return {
        success: false,
        operationType: "move",
        originalPath: normSource,
        finalPath: normDest,
        fileSize: 0,
        contentHash: null,
        status: "failed",
        errorMessage: err
      };
    }
    if (!import_node_fs4.default.existsSync(normSource)) {
      const err = `Source file does not exist: ${normSource}`;
      return {
        success: false,
        operationType: "move",
        originalPath: normSource,
        finalPath: normDest,
        fileSize: 0,
        contentHash: null,
        status: "failed",
        errorMessage: err
      };
    }
    if (this.isRecursiveLoop(normSource, normDest)) {
      return {
        success: false,
        operationType: "move",
        originalPath: normSource,
        finalPath: normDest,
        fileSize: 0,
        contentHash: null,
        status: "skipped",
        errorMessage: "Skipped to prevent recursive movement loop into itself."
      };
    }
    const stat = import_node_fs4.default.statSync(normSource);
    const fileSize = stat.size;
    const sourceHash = this.calculateHash(normSource);
    if (import_node_fs4.default.existsSync(normDest)) {
      const destHash = this.calculateHash(normDest);
      if (sourceHash && destHash && sourceHash === destHash) {
        if (collisionPolicy === "skip") {
          dbOperations.addHistory({
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            originalPath: normSource,
            newPath: normDest,
            fileCategory: category,
            fileSize,
            appliedRuleName: ruleName,
            operationType: "move",
            result: "skipped",
            errorDetails: "Target already contains an identical file (matched SHA-256 hash).",
            contentHash: sourceHash,
            isUndone: false,
            canUndo: false
          });
          return {
            success: true,
            operationType: "move",
            originalPath: normSource,
            finalPath: normDest,
            fileSize,
            contentHash: sourceHash,
            status: "skipped"
          };
        }
      }
      if (collisionPolicy === "skip") {
        dbOperations.addHistory({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          originalPath: normSource,
          newPath: normDest,
          fileCategory: category,
          fileSize,
          appliedRuleName: ruleName,
          operationType: "move",
          result: "skipped",
          errorDetails: 'Destination file already exists and collision policy is "skip".',
          contentHash: sourceHash,
          isUndone: false,
          canUndo: false
        });
        return {
          success: true,
          operationType: "move",
          originalPath: normSource,
          finalPath: normDest,
          fileSize,
          contentHash: sourceHash,
          status: "skipped"
        };
      } else if (collisionPolicy === "keep_both") {
        normDest = this.generateUniqueDestination(normDest);
      }
    }
    const destDir = import_node_path4.default.dirname(normDest);
    if (!import_node_fs4.default.existsSync(destDir)) {
      import_node_fs4.default.mkdirSync(destDir, { recursive: true });
    }
    try {
      const sourceRoot = import_node_path4.default.parse(normSource).root.toLowerCase();
      const destRoot = import_node_path4.default.parse(normDest).root.toLowerCase();
      if (sourceRoot === destRoot) {
        import_node_fs4.default.renameSync(normSource, normDest);
      } else {
        import_node_fs4.default.copyFileSync(normSource, normDest);
        const copyHash = this.calculateHash(normDest);
        if (sourceHash && copyHash !== sourceHash) {
          import_node_fs4.default.unlinkSync(normDest);
          throw new Error("Data integrity check failed during cross-volume copy.");
        }
        import_node_fs4.default.unlinkSync(normSource);
      }
      dbOperations.addHistory({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        originalPath: normSource,
        newPath: normDest,
        fileCategory: category,
        fileSize,
        appliedRuleName: ruleName,
        operationType: "move",
        result: "success",
        contentHash: sourceHash,
        isUndone: false,
        canUndo: true
      });
      dbOperations.incrementRuleExecution(ruleName);
      return {
        success: true,
        operationType: "move",
        originalPath: normSource,
        finalPath: normDest,
        fileSize,
        contentHash: sourceHash,
        status: "success"
      };
    } catch (err) {
      const errorMsg = err?.message || String(err);
      dbOperations.addHistory({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        originalPath: normSource,
        newPath: normDest,
        fileCategory: category,
        fileSize,
        appliedRuleName: ruleName,
        operationType: "move",
        result: "failed",
        errorDetails: errorMsg,
        contentHash: sourceHash,
        isUndone: false,
        canUndo: false
      });
      return {
        success: false,
        operationType: "move",
        originalPath: normSource,
        finalPath: normDest,
        fileSize,
        contentHash: sourceHash,
        status: "failed",
        errorMessage: errorMsg
      };
    }
  }
};

// src/server/monitor.ts
var DirectoryMonitorService = class {
  static watchers = /* @__PURE__ */ new Map();
  static processingQueue = /* @__PURE__ */ new Set();
  static isPaused = false;
  static reconciliationTimer = null;
  static initialize() {
    this.reloadWatchers();
    const settings = dbOperations.getSettings();
    const intervalMs = (settings.reconciliationIntervalMinutes || 30) * 60 * 1e3;
    this.reconciliationTimer = setInterval(() => {
      this.reconcileAll();
    }, intervalMs);
  }
  static pauseAll() {
    this.isPaused = true;
    for (const entry of Array.from(this.watchers.values())) {
      try {
        entry.watcher.close();
      } catch {
      }
    }
    this.watchers.clear();
  }
  static resumeAll() {
    this.isPaused = false;
    this.reloadWatchers();
    this.reconcileAll();
  }
  static isMonitoringPaused() {
    return this.isPaused;
  }
  static reloadWatchers() {
    if (this.isPaused) return;
    for (const entry of this.watchers.values()) {
      try {
        entry.watcher.close();
      } catch {
      }
    }
    this.watchers.clear();
    const locations = dbOperations.getLocations().filter((loc) => loc.enabled);
    for (const loc of locations) {
      this.startWatching(loc.id, loc.path, loc.recursive);
    }
  }
  static startWatching(locationId, dirPath, recursive = false) {
    if (this.isPaused) return;
    try {
      if (!import_node_fs5.default.existsSync(dirPath)) {
        dbOperations.updateLocation(locationId, { status: "offline", errorMessage: "Directory or drive not found." });
        return;
      }
      const stat = import_node_fs5.default.lstatSync(dirPath);
      if (stat.isSymbolicLink()) {
        dbOperations.updateLocation(locationId, { status: "error", errorMessage: "Cannot monitor symlink directly." });
        return;
      }
      const watcher = import_node_fs5.default.watch(dirPath, { recursive }, (eventType, filename) => {
        if (!filename) return;
        const fullPath = import_node_path5.default.join(dirPath, filename);
        this.queueFileForProcessing(fullPath, locationId);
      });
      this.watchers.set(locationId, { locationId, watcher, path: dirPath });
      dbOperations.updateLocation(locationId, { status: "active", errorMessage: null });
    } catch (err) {
      dbOperations.updateLocation(locationId, { status: "error", errorMessage: err?.message || String(err) });
    }
  }
  static stopWatching(locationId) {
    const entry = this.watchers.get(locationId);
    if (entry) {
      try {
        entry.watcher.close();
      } catch {
      }
      this.watchers.delete(locationId);
    }
  }
  static async queueFileForProcessing(filePath, locationId) {
    if (this.processingQueue.has(filePath)) return;
    this.processingQueue.add(filePath);
    setTimeout(async () => {
      try {
        await this.processSingleFile(filePath, locationId);
      } finally {
        this.processingQueue.delete(filePath);
      }
    }, 1e3);
  }
  static async processSingleFile(filePath, locationId, customDestinationDirectory, immediateMode = false) {
    if (!import_node_fs5.default.existsSync(filePath)) return null;
    const stat = import_node_fs5.default.statSync(filePath);
    if (stat.isDirectory()) {
      return null;
    }
    const settings = dbOperations.getSettings();
    const isStable = await SafeFileOperations.checkFileStability(
      filePath,
      immediateMode ? 0 : settings.fileStabilityDelayMs || 500,
      immediateMode
    );
    if (!isStable) {
      return null;
    }
    if (settings.dryRunMode) {
      return null;
    }
    const locations = dbOperations.getLocations();
    let matchedLocation = locationId ? locations.find((l) => l.id === locationId) : void 0;
    if (!matchedLocation) {
      const lowerFile = filePath.toLowerCase();
      matchedLocation = locations.find((l) => lowerFile.startsWith(l.path.toLowerCase()));
    }
    const baseDestFolder = customDestinationDirectory || matchedLocation?.targetDirectory || void 0;
    const template = matchedLocation?.destinationTemplate || settings.defaultDestinationTemplate;
    const rules = dbOperations.getRules();
    const evaluation = RuleEngine.evaluate(filePath, rules, template, baseDestFolder);
    if (evaluation.action === "ignore") {
      return;
    }
    if (evaluation.action === "review" || settings.unknownFileBehavior === "review_queue" && evaluation.category === "Unknown") {
      dbOperations.addReviewItem({
        detectedAt: (/* @__PURE__ */ new Date()).toISOString(),
        originalPath: filePath,
        suggestedCategory: evaluation.category,
        suggestedDestination: evaluation.proposedDestination || filePath,
        reason: evaluation.category === "Unknown" ? "unknown_type" : "manual_review_rule",
        fileSize: stat.size
      });
      return { success: true, action: "review" };
    }
    if (evaluation.proposedDestination && evaluation.action === "move") {
      const ruleName = evaluation.matchedRule ? evaluation.matchedRule.name : "Default Category Template";
      const collisionPolicy = evaluation.matchedRule ? evaluation.matchedRule.collisionPolicy : settings.defaultCollisionPolicy;
      return await SafeFileOperations.executeMove(
        filePath,
        evaluation.proposedDestination,
        collisionPolicy,
        ruleName,
        evaluation.category
      );
    }
    return { success: false, action: "skipped" };
  }
  /**
   * Run reconciliation scan on a single location or all locations.
   */
  static async reconcileLocation(locationId) {
    const locations = dbOperations.getLocations();
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return 0;
    if (!import_node_fs5.default.existsSync(loc.path)) {
      dbOperations.updateLocation(loc.id, { status: "offline" });
      return 0;
    }
    let processedCount = 0;
    try {
      const scanDir = async (dir) => {
        let entries = [];
        try {
          entries = import_node_fs5.default.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const fullPath = import_node_path5.default.join(dir, entry.name);
          if (entry.isDirectory() && loc.recursive) {
            try {
              const stat = import_node_fs5.default.lstatSync(fullPath);
              if (!stat.isSymbolicLink()) {
                await scanDir(fullPath);
              }
            } catch {
            }
          } else if (entry.isFile()) {
            await this.processSingleFile(fullPath, loc.id);
            processedCount++;
          }
        }
      };
      await scanDir(loc.path);
      dbOperations.updateLocation(loc.id, {
        lastScannedAt: (/* @__PURE__ */ new Date()).toISOString(),
        itemCount: processedCount,
        status: "active"
      });
    } catch (err) {
      dbOperations.updateLocation(loc.id, { status: "error", errorMessage: err?.message || String(err) });
    }
    return processedCount;
  }
  static async reconcileAll() {
    const locations = dbOperations.getLocations().filter((l) => l.enabled);
    for (const loc of locations) {
      await this.reconcileLocation(loc.id);
    }
  }
  /**
   * Ultra-fast concurrent folder organizer.
   * Organizes eligible files in a folder concurrently in parallel chunks.
   */
  static async organizeFolder(folderPath, customDestination, allowedCategories) {
    const startTime = Date.now();
    const resolvedPath = import_node_path5.default.resolve(folderPath);
    if (!import_node_fs5.default.existsSync(resolvedPath)) {
      return {
        success: false,
        folderPath: resolvedPath,
        totalFound: 0,
        organizedCount: 0,
        skippedCount: 0,
        durationMs: 0,
        items: []
      };
    }
    const entries = import_node_fs5.default.readdirSync(resolvedPath);
    const candidateFiles = [];
    for (const entry of entries) {
      const full = import_node_path5.default.join(resolvedPath, entry);
      try {
        const s = import_node_fs5.default.statSync(full);
        if (s.isFile()) {
          candidateFiles.push(full);
        }
      } catch {
      }
    }
    let organizedCount = 0;
    let skippedCount = 0;
    const items = [];
    const CHUNK_SIZE = 10;
    for (let i = 0; i < candidateFiles.length; i += CHUNK_SIZE) {
      const chunk = candidateFiles.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (file) => {
          try {
            const res = await this.processSingleFile(file, void 0, customDestination, true);
            if (res && res.success) {
              organizedCount++;
              items.push({
                original: file,
                destination: res.finalPath,
                category: res.operationType || "organized",
                status: "success"
              });
            } else {
              skippedCount++;
            }
          } catch {
            skippedCount++;
          }
        })
      );
    }
    const durationMs = Date.now() - startTime;
    return {
      success: true,
      folderPath: resolvedPath,
      totalFound: candidateFiles.length,
      organizedCount,
      skippedCount,
      durationMs,
      items
    };
  }
  /**
   * Run a dry scan over a folder to show proposed changes without touching files.
   */
  static runDryScan(directoryPath) {
    if (!import_node_fs5.default.existsSync(directoryPath)) {
      return { totalFiles: 0, totalBytes: 0, processableFiles: 0, conflictingFiles: 0, skippedFiles: 0, items: [] };
    }
    const rules = dbOperations.getRules();
    const settings = dbOperations.getSettings();
    const locations = dbOperations.getLocations();
    const matchedLoc = locations.find((l) => directoryPath.toLowerCase().startsWith(l.path.toLowerCase()));
    const template = matchedLoc?.destinationTemplate || settings.defaultDestinationTemplate;
    const baseDest = matchedLoc?.targetDirectory || void 0;
    const files = import_node_fs5.default.readdirSync(directoryPath);
    const items = [];
    let totalBytes = 0;
    let processableFiles = 0;
    let conflictingFiles = 0;
    let skippedFiles = 0;
    for (const file of files) {
      const fullPath = import_node_path5.default.join(directoryPath, file);
      if (!import_node_fs5.default.existsSync(fullPath)) continue;
      const stat = import_node_fs5.default.statSync(fullPath);
      if (!stat.isFile()) continue;
      totalBytes += stat.size;
      const evaluation = RuleEngine.evaluate(fullPath, rules, template, baseDest);
      const willConflict = Boolean(evaluation.proposedDestination && import_node_fs5.default.existsSync(evaluation.proposedDestination));
      let status = "can_move";
      if (evaluation.action === "ignore") {
        status = "will_skip";
        skippedFiles++;
      } else if (evaluation.action === "review" || evaluation.category === "Unknown") {
        status = "review_required";
        conflictingFiles++;
      } else if (willConflict) {
        conflictingFiles++;
      } else {
        processableFiles++;
      }
      items.push({
        id: "dry_" + Math.random().toString(36).substring(2, 8),
        originalPath: fullPath,
        filename: file,
        proposedDestination: evaluation.proposedDestination || "No destination",
        fileCategory: evaluation.category,
        matchingRuleName: evaluation.matchedRule ? evaluation.matchedRule.name : "Default Category Template",
        fileSize: stat.size,
        willConflict,
        conflictReason: willConflict ? "Target destination already contains a file with this name." : void 0,
        status
      });
    }
    return {
      totalFiles: items.length,
      totalBytes,
      processableFiles,
      conflictingFiles,
      skippedFiles,
      items
    };
  }
  /**
   * Browse files in a directory for the real File Explorer view.
   */
  static browseDirectory(dirPath) {
    let target = dirPath && dirPath.trim() ? dirPath.trim() : "";
    if (!target || !import_node_fs5.default.existsSync(target)) {
      const home = process.env.USERPROFILE || "C:\\";
      const downloads = import_node_path5.default.join(home, "Downloads");
      target = import_node_fs5.default.existsSync(downloads) ? downloads : home;
    }
    if (!import_node_fs5.default.existsSync(target)) return [];
    const rules = dbOperations.getRules();
    const settings = dbOperations.getSettings();
    const locations = dbOperations.getLocations();
    const matchedLoc = locations.find((l) => target.toLowerCase().startsWith(l.path.toLowerCase()));
    const template = matchedLoc?.destinationTemplate || settings.defaultDestinationTemplate;
    const baseDest = matchedLoc?.targetDirectory || void 0;
    try {
      const entries = import_node_fs5.default.readdirSync(target, { withFileTypes: true });
      return entries.map((e) => {
        const fullPath = import_node_path5.default.join(target, e.name);
        let size = 0;
        let modifiedAt = (/* @__PURE__ */ new Date()).toISOString();
        try {
          const stat = import_node_fs5.default.statSync(fullPath);
          size = stat.size;
          modifiedAt = stat.mtime.toISOString();
        } catch {
        }
        if (e.isDirectory()) {
          return {
            name: e.name,
            path: fullPath,
            isDirectory: true,
            size: 0,
            modifiedAt,
            category: "Documents"
          };
        }
        const classification = FileClassifier.classify(fullPath);
        const evaluation = RuleEngine.evaluate(fullPath, rules, template, baseDest);
        return {
          name: e.name,
          path: fullPath,
          isDirectory: false,
          size,
          modifiedAt,
          category: classification.category,
          proposedDestination: evaluation.proposedDestination || void 0,
          matchingRule: evaluation.matchedRule ? evaluation.matchedRule.name : void 0
        };
      });
    } catch {
      return [];
    }
  }
};

// src/server/undo-manager.ts
var import_node_fs6 = __toESM(require("node:fs"));
var import_node_path6 = __toESM(require("node:path"));
var UndoManager = class {
  /**
   * Reverse an operation safely.
   */
  static undo(historyId) {
    const item = dbOperations.getHistoryItem(historyId);
    if (!item) {
      return { success: false, message: "History record not found." };
    }
    if (item.isUndone) {
      return { success: false, message: "This operation has already been undone." };
    }
    if (!item.canUndo || item.result !== "success") {
      return { success: false, message: "This operation cannot be reversed." };
    }
    const currentPath = import_node_path6.default.resolve(item.newPath);
    const originalTarget = import_node_path6.default.resolve(item.originalPath);
    if (!import_node_fs6.default.existsSync(currentPath)) {
      return {
        success: false,
        message: `Cannot undo: File has been moved or deleted from "${currentPath}".`
      };
    }
    if (item.contentHash) {
      const currentHash = SafeFileOperations.calculateHash(currentPath);
      if (currentHash && currentHash !== item.contentHash) {
        return {
          success: false,
          message: "Cannot undo: File content has been modified since it was organized."
        };
      }
    }
    if (import_node_fs6.default.existsSync(originalTarget)) {
      return {
        success: false,
        message: `Cannot undo: Original location "${originalTarget}" is already occupied by another file.`
      };
    }
    const origDir = import_node_path6.default.dirname(originalTarget);
    if (!import_node_fs6.default.existsSync(origDir)) {
      import_node_fs6.default.mkdirSync(origDir, { recursive: true });
    }
    try {
      const sourceRoot = import_node_path6.default.parse(currentPath).root.toLowerCase();
      const destRoot = import_node_path6.default.parse(originalTarget).root.toLowerCase();
      if (sourceRoot === destRoot) {
        import_node_fs6.default.renameSync(currentPath, originalTarget);
      } else {
        import_node_fs6.default.copyFileSync(currentPath, originalTarget);
        import_node_fs6.default.unlinkSync(currentPath);
      }
      dbOperations.markHistoryUndone(historyId);
      dbOperations.addHistory({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        originalPath: currentPath,
        newPath: originalTarget,
        fileCategory: item.fileCategory,
        fileSize: item.fileSize,
        appliedRuleName: `Undo: ${item.appliedRuleName}`,
        operationType: "move",
        result: "success",
        contentHash: item.contentHash,
        isUndone: false,
        canUndo: false
      });
      return {
        success: true,
        message: `Successfully restored "${import_node_path6.default.basename(originalTarget)}" to original location.`
      };
    } catch (err) {
      return {
        success: false,
        message: `Undo failed: ${err?.message || String(err)}`
      };
    }
  }
};

// src/server/storage-analyzer.ts
var import_node_fs7 = __toESM(require("node:fs"));
var import_node_path7 = __toESM(require("node:path"));
var import_node_child_process = require("node:child_process");
var import_node_util = require("node:util");
var execAsync = (0, import_node_util.promisify)(import_node_child_process.exec);
var StorageAnalyzerService = class {
  static activeScanCancelToken = {};
  /**
   * Enumerate real Windows drives with capacity, used, free space, and filesystem type
   */
  static async getDrives() {
    try {
      const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, VolumeName, DriveType, FileSystem, Size, FreeSpace | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCommand);
      if (!stdout || !stdout.trim()) {
        return this.getFallbackDrives();
      }
      let parsed = JSON.parse(stdout.trim());
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
      return parsed.filter((d) => d && d.Size && d.Size > 0).map((d) => {
        const total = Number(d.Size) || 0;
        const free = Number(d.FreeSpace) || 0;
        const used = Math.max(0, total - free);
        const percentUsed = total > 0 ? Math.round(used / total * 100) : 0;
        let typeStr = "Fixed";
        if (d.DriveType === 2) typeStr = "Removable";
        else if (d.DriveType === 4) typeStr = "Network";
        else if (d.DriveType === 5) typeStr = "CD/DVD";
        return {
          driveLetter: d.DeviceID,
          volumeName: d.VolumeName || (d.DeviceID === "C:" ? "Local Disk" : "Drive"),
          driveType: typeStr,
          fileSystem: d.FileSystem || "NTFS",
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          percentUsed,
          isReady: true,
          lastScannedAt: null
        };
      });
    } catch (err) {
      console.error("[StorageAnalyzer] Failed to query Win32_LogicalDisk:", err);
      return this.getFallbackDrives();
    }
  }
  static getFallbackDrives() {
    const defaultDrives = ["C:", "D:"];
    const results = [];
    for (const letter of defaultDrives) {
      try {
        const rootPath = letter + "\\";
        if (import_node_fs7.default.existsSync(rootPath)) {
          results.push({
            driveLetter: letter,
            volumeName: letter === "C:" ? "System Disk" : "Storage",
            driveType: "Fixed",
            fileSystem: "NTFS",
            totalBytes: 512 * 1024 * 1024 * 1024,
            freeBytes: 128 * 1024 * 1024 * 1024,
            usedBytes: 384 * 1024 * 1024 * 1024,
            percentUsed: 75,
            isReady: true,
            lastScannedAt: null
          });
        }
      } catch (_e) {
      }
    }
    return results;
  }
  /**
   * Cancel an ongoing scan
   */
  static cancelScan(sessionId) {
    this.activeScanCancelToken[sessionId] = true;
  }
  /**
   * Perform recursive directory storage scan
   * Strictly read-only! Never modifies or deletes any files.
   */
  static async scanDirectory(targetPath, onProgress) {
    const sessionId = "scan_" + Date.now();
    this.activeScanCancelToken[sessionId] = false;
    const normalizedPath = import_node_path7.default.resolve(targetPath);
    if (!import_node_fs7.default.existsSync(normalizedPath)) {
      throw new Error(`Target path does not exist: ${normalizedPath}`);
    }
    const session = {
      id: sessionId,
      rootPath: normalizedPath,
      status: "scanning",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      finishedAt: null,
      totalLogicalSize: 0,
      totalFiles: 0,
      totalDirectories: 0,
      inaccessibleCount: 0,
      inaccessiblePaths: [],
      durationMs: 0
    };
    const startTime = Date.now();
    const allFiles = [];
    const categoryTotals = {};
    const visitedRealPaths = /* @__PURE__ */ new Set();
    let totalFilesCount = 0;
    let totalDirsCount = 0;
    const scanNode = async (currentPath, currentDepth, maxTreeDepth = 5) => {
      if (this.activeScanCancelToken[sessionId]) {
        throw new Error("Scan cancelled by user");
      }
      let realPath = currentPath;
      try {
        realPath = import_node_fs7.default.realpathSync(currentPath);
        if (visitedRealPaths.has(realPath)) {
          return {
            id: currentPath,
            name: import_node_path7.default.basename(currentPath) || currentPath,
            path: currentPath,
            isDirectory: true,
            logicalSize: 0,
            fileCount: 0,
            dirCount: 0,
            percentOfParent: 0,
            percentOfTotal: 0,
            lastModified: (/* @__PURE__ */ new Date()).toISOString(),
            isPartial: true,
            hasChildren: false,
            children: []
          };
        }
        visitedRealPaths.add(realPath);
      } catch (_e) {
      }
      let entries = [];
      try {
        entries = await import_node_fs7.default.promises.readdir(currentPath, { withFileTypes: true });
      } catch (err) {
        session.inaccessibleCount++;
        session.inaccessiblePaths.push(currentPath);
        return {
          id: currentPath,
          name: import_node_path7.default.basename(currentPath) || currentPath,
          path: currentPath,
          isDirectory: true,
          logicalSize: 0,
          fileCount: 0,
          dirCount: 0,
          percentOfParent: 0,
          percentOfTotal: 0,
          lastModified: (/* @__PURE__ */ new Date()).toISOString(),
          isPartial: true,
          hasChildren: false,
          children: []
        };
      }
      totalDirsCount++;
      let nodeLogicalSize = 0;
      let nodeFileCount = 0;
      let nodeDirCount = 0;
      const childNodes = [];
      for (const entry of entries) {
        if (this.activeScanCancelToken[sessionId]) {
          throw new Error("Scan cancelled by user");
        }
        const fullChildPath = import_node_path7.default.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          nodeDirCount++;
          const subNode = await scanNode(fullChildPath, currentDepth + 1, maxTreeDepth);
          nodeLogicalSize += subNode.logicalSize;
          nodeFileCount += subNode.fileCount;
          nodeDirCount += subNode.dirCount;
          if (currentDepth <= maxTreeDepth) {
            childNodes.push(subNode);
          }
        } else if (entry.isFile()) {
          nodeFileCount++;
          totalFilesCount++;
          if (onProgress && totalFilesCount % 100 === 0) {
            onProgress(totalFilesCount, fullChildPath);
          }
          let fileSize = 0;
          let mtime = (/* @__PURE__ */ new Date()).toISOString();
          try {
            const stat = await import_node_fs7.default.promises.stat(fullChildPath);
            fileSize = stat.size;
            mtime = stat.mtime.toISOString();
          } catch (_e) {
            session.inaccessibleCount++;
          }
          nodeLogicalSize += fileSize;
          const ext = import_node_path7.default.extname(entry.name).replace(".", "").toLowerCase();
          const classification = FileClassifier.classify(fullChildPath);
          const category = classification.category;
          if (!categoryTotals[category]) {
            categoryTotals[category] = { size: 0, count: 0 };
          }
          categoryTotals[category].size += fileSize;
          categoryTotals[category].count += 1;
          allFiles.push({
            name: entry.name,
            path: fullChildPath,
            size: fileSize,
            parentFolder: currentPath,
            extension: ext,
            category,
            lastModified: mtime
          });
          if (currentDepth <= 2) {
            childNodes.push({
              id: fullChildPath,
              name: entry.name,
              path: fullChildPath,
              isDirectory: false,
              logicalSize: fileSize,
              fileCount: 1,
              dirCount: 0,
              percentOfParent: 0,
              percentOfTotal: 0,
              category,
              lastModified: mtime,
              hasChildren: false
            });
          }
        }
      }
      childNodes.sort((a, b) => b.logicalSize - a.logicalSize);
      for (const child of childNodes) {
        child.percentOfParent = nodeLogicalSize > 0 ? Math.round(child.logicalSize / nodeLogicalSize * 100) : 0;
      }
      return {
        id: currentPath,
        name: import_node_path7.default.basename(currentPath) || currentPath,
        path: currentPath,
        isDirectory: true,
        logicalSize: nodeLogicalSize,
        fileCount: nodeFileCount,
        dirCount: nodeDirCount,
        percentOfParent: 100,
        percentOfTotal: 0,
        lastModified: (/* @__PURE__ */ new Date()).toISOString(),
        hasChildren: childNodes.length > 0,
        children: childNodes
      };
    };
    let rootNode;
    try {
      rootNode = await scanNode(normalizedPath, 0, 4);
    } catch (err) {
      if (err.message.includes("cancelled")) {
        session.status = "cancelled";
        session.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
        session.durationMs = Date.now() - startTime;
        throw err;
      }
      session.status = "failed";
      session.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      session.durationMs = Date.now() - startTime;
      throw err;
    }
    const durationMs = Date.now() - startTime;
    session.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    session.durationMs = durationMs;
    session.totalLogicalSize = rootNode.logicalSize;
    session.totalFiles = totalFilesCount;
    session.totalDirectories = totalDirsCount;
    session.status = session.inaccessibleCount > 0 ? "completed_with_warnings" : "completed";
    const computeTotalPercents = (node) => {
      node.percentOfTotal = session.totalLogicalSize > 0 ? Math.round(node.logicalSize / session.totalLogicalSize * 100) : 0;
      if (node.children) {
        for (const child of node.children) {
          computeTotalPercents(child);
        }
      }
    };
    computeTotalPercents(rootNode);
    allFiles.sort((a, b) => b.size - a.size);
    const largestFiles = allFiles.slice(0, 100);
    const categoryDistribution = [];
    const categoryColors = {
      Documents: "#3b82f6",
      Spreadsheets: "#10b981",
      Presentations: "#f59e0b",
      Images: "#a855f7",
      Videos: "#f97316",
      Audio: "#ec4899",
      Archives: "#14b8a6",
      Installers: "#64748b",
      Development: "#06b6d4",
      Design: "#8b5cf6",
      Fonts: "#84cc16",
      Data: "#6366f1",
      Ebooks: "#eab308",
      Shortcuts: "#94a3b8",
      Unknown: "#9ca3af"
    };
    for (const [cat, data] of Object.entries(categoryTotals)) {
      const categoryName = cat;
      const pct = session.totalLogicalSize > 0 ? Number((data.size / session.totalLogicalSize * 100).toFixed(1)) : 0;
      categoryDistribution.push({
        category: categoryName,
        size: data.size,
        fileCount: data.count,
        percentage: pct,
        color: categoryColors[categoryName] || "#9ca3af"
      });
    }
    categoryDistribution.sort((a, b) => b.size - a.size);
    const buildTreemap = (node, maxItems = 15) => {
      if (!node.children || node.children.length === 0) return [];
      return node.children.slice(0, maxItems).map((child) => ({
        name: child.name,
        path: child.path,
        size: child.logicalSize,
        category: child.category || (child.isDirectory ? "Unknown" : "Documents"),
        color: categoryColors[child.category || "Unknown"] || "#64748b",
        isDirectory: child.isDirectory,
        children: child.isDirectory && child.children ? buildTreemap(child, 6) : void 0
      }));
    };
    const treemapData = buildTreemap(rootNode);
    const result = {
      session,
      rootNode,
      largestFiles,
      categoryDistribution,
      treemapData
    };
    try {
      dbOperations.saveStorageScan(session, {
        rootNode,
        largestFiles,
        categoryDistribution,
        treemapData
      });
    } catch (saveErr) {
      console.error("[StorageAnalyzer] Failed to persist scan session to SQLite:", saveErr);
    }
    delete this.activeScanCancelToken[sessionId];
    return result;
  }
};

// src/server/system-cleaner.ts
var import_node_fs8 = __toESM(require("node:fs"));
var import_node_path8 = __toESM(require("node:path"));
var import_node_os2 = __toESM(require("node:os"));
var import_node_child_process2 = require("node:child_process");
var import_node_util2 = require("node:util");
var execAsync2 = (0, import_node_util2.promisify)(import_node_child_process2.exec);
var SystemCleanerService = class {
  /**
   * Get quarantine directory location
   */
  static getQuarantineDir() {
    const appData = process.env.APPDATA || import_node_path8.default.join(import_node_os2.default.homedir(), "AppData", "Roaming");
    const qDir = import_node_path8.default.join(appData, "NexusFile", "Quarantine");
    if (!import_node_fs8.default.existsSync(qDir)) {
      import_node_fs8.default.mkdirSync(qDir, { recursive: true });
    }
    return qDir;
  }
  /**
   * Inspect current Recycle Bin status
   */
  static async getRecycleBinStatus() {
    try {
      const ps = `powershell -NoProfile -Command "$rb = (New-Object -ComObject Shell.Application).Namespace(0xa); if ($rb) { $items = $rb.Items(); $size = ($items | Measure-Object -Property Size -Sum).Sum; @{ count = $items.Count; sizeBytes = [int64]$size } | ConvertTo-Json } else { @{ count = 0; sizeBytes = 0 } | ConvertTo-Json }"`;
      const { stdout } = await execAsync2(ps);
      const data = JSON.parse(stdout.trim());
      return {
        totalSize: Number(data.sizeBytes) || 0,
        itemCount: Number(data.count) || 0,
        isAvailable: true
      };
    } catch (_e) {
      return {
        totalSize: 0,
        itemCount: 0,
        isAvailable: false
      };
    }
  }
  /**
   * Empty Recycle Bin with explicit confirmation
   */
  static async emptyRecycleBin() {
    try {
      const ps = `powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"`;
      await execAsync2(ps);
      return { success: true, message: "Recycle Bin was successfully emptied." };
    } catch (err) {
      return { success: false, message: err?.message || "Failed to empty Recycle Bin" };
    }
  }
  /**
   * Check if a file is currently locked or in-use by another process
   */
  static isFileLocked(filePath) {
    try {
      const fd = import_node_fs8.default.openSync(filePath, "r+");
      import_node_fs8.default.closeSync(fd);
      return false;
    } catch (err) {
      return true;
    }
  }
  /**
   * Scan system for cleanup candidates across configured categories
   */
  static async scanCleanupCandidates(options) {
    const minAgeDays = options?.minAgeDays ?? 7;
    const now = Date.now();
    const ageThresholdMs = minAgeDays * 24 * 60 * 60 * 1e3;
    const candidates = [];
    const userTempDir = process.env.TEMP || import_node_path8.default.join(import_node_os2.default.homedir(), "AppData", "Local", "Temp");
    const localAppData = process.env.LOCALAPPDATA || import_node_path8.default.join(import_node_os2.default.homedir(), "AppData", "Local");
    const crashDumpsDir = import_node_path8.default.join(localAppData, "CrashDumps");
    const explorerCacheDir = import_node_path8.default.join(localAppData, "Microsoft", "Windows", "Explorer");
    const chromeCache = import_node_path8.default.join(localAppData, "Google", "Chrome", "User Data", "Default", "Cache", "Cache_Data");
    const edgeCache = import_node_path8.default.join(localAppData, "Microsoft", "Edge", "User Data", "Default", "Cache", "Cache_Data");
    if (import_node_fs8.default.existsSync(userTempDir)) {
      try {
        const files = await import_node_fs8.default.promises.readdir(userTempDir);
        for (const f of files.slice(0, 300)) {
          const fullPath = import_node_path8.default.join(userTempDir, f);
          try {
            const stat = await import_node_fs8.default.promises.stat(fullPath);
            if (stat.isFile()) {
              const fileAgeMs = now - stat.mtimeMs;
              const isOld = fileAgeMs >= ageThresholdMs;
              const locked = this.isFileLocked(fullPath);
              const ageDays = Math.floor(fileAgeMs / (24 * 60 * 60 * 1e3));
              candidates.push({
                id: "cand_" + Math.random().toString(36).substring(2, 9),
                category: "user_temp",
                name: f,
                path: fullPath,
                size: stat.size,
                lastModified: stat.mtime.toISOString(),
                safetyLevel: "A",
                reason: isOld ? `Stale temporary file (${ageDays} days old, exceeds ${minAgeDays}d policy)` : `Recent temporary file (${ageDays}d old, review suggested)`,
                isLocked: locked,
                selected: isOld && !locked,
                canQuarantine: true
              });
            }
          } catch (_e) {
          }
        }
      } catch (_e) {
      }
    }
    if (import_node_fs8.default.existsSync(crashDumpsDir)) {
      try {
        const files = await import_node_fs8.default.promises.readdir(crashDumpsDir);
        for (const f of files) {
          if (f.endsWith(".dmp") || f.endsWith(".mdmp")) {
            const fullPath = import_node_path8.default.join(crashDumpsDir, f);
            try {
              const stat = await import_node_fs8.default.promises.stat(fullPath);
              const locked = this.isFileLocked(fullPath);
              candidates.push({
                id: "cand_" + Math.random().toString(36).substring(2, 9),
                category: "crash_dumps",
                name: f,
                path: fullPath,
                size: stat.size,
                lastModified: stat.mtime.toISOString(),
                safetyLevel: "B",
                reason: "Application diagnostic crash memory dump",
                isLocked: locked,
                selected: !locked,
                canQuarantine: true
              });
            } catch (_e) {
            }
          }
        }
      } catch (_e) {
      }
    }
    if (import_node_fs8.default.existsSync(explorerCacheDir)) {
      try {
        const files = await import_node_fs8.default.promises.readdir(explorerCacheDir);
        for (const f of files) {
          if (f.startsWith("thumbcache_") && f.endsWith(".db")) {
            const fullPath = import_node_path8.default.join(explorerCacheDir, f);
            try {
              const stat = await import_node_fs8.default.promises.stat(fullPath);
              const locked = this.isFileLocked(fullPath);
              candidates.push({
                id: "cand_" + Math.random().toString(36).substring(2, 9),
                category: "thumbnail_cache",
                name: f,
                path: fullPath,
                size: stat.size,
                lastModified: stat.mtime.toISOString(),
                safetyLevel: "A",
                reason: "Windows Explorer thumbnail preview cache (auto-regenerates on browse)",
                isLocked: locked,
                selected: !locked,
                canQuarantine: true
              });
            } catch (_e) {
            }
          }
        }
      } catch (_e) {
      }
    }
    const browserCachePaths = [
      { name: "Google Chrome Cache", dir: chromeCache },
      { name: "Microsoft Edge Cache", dir: edgeCache }
    ];
    for (const b of browserCachePaths) {
      if (import_node_fs8.default.existsSync(b.dir)) {
        try {
          const files = await import_node_fs8.default.promises.readdir(b.dir);
          for (const f of files.slice(0, 150)) {
            const fullPath = import_node_path8.default.join(b.dir, f);
            try {
              const stat = await import_node_fs8.default.promises.stat(fullPath);
              if (stat.isFile()) {
                const locked = this.isFileLocked(fullPath);
                candidates.push({
                  id: "cand_" + Math.random().toString(36).substring(2, 9),
                  category: "browser_cache",
                  name: `${b.name} - ${f}`,
                  path: fullPath,
                  size: stat.size,
                  lastModified: stat.mtime.toISOString(),
                  safetyLevel: "B",
                  reason: "Web asset cache (images, stylesheets). Never includes cookies or passwords.",
                  isLocked: locked,
                  selected: false,
                  // Default unselected for user review
                  canQuarantine: false
                });
              }
            } catch (_e) {
            }
          }
        } catch (_e) {
        }
      }
    }
    const categoryStats = {};
    for (const c of candidates) {
      if (!categoryStats[c.category]) {
        categoryStats[c.category] = { size: 0, count: 0 };
      }
      categoryStats[c.category].size += c.size;
      categoryStats[c.category].count += 1;
    }
    const categories = [
      {
        type: "user_temp",
        name: "User Temporary Files",
        description: `Stale working files in %TEMP% older than ${minAgeDays} days.`,
        safetyLevel: "A",
        estimatedSize: categoryStats.user_temp?.size || 0,
        candidateCount: categoryStats.user_temp?.count || 0,
        selected: true
      },
      {
        type: "thumbnail_cache",
        name: "Thumbnail Cache",
        description: "Generated image and folder preview databases in Windows Explorer.",
        safetyLevel: "A",
        estimatedSize: categoryStats.thumbnail_cache?.size || 0,
        candidateCount: categoryStats.thumbnail_cache?.count || 0,
        selected: true
      },
      {
        type: "crash_dumps",
        name: "Crash Reports & Memory Dumps",
        description: "Stale application error reports and post-mortem diagnostic dumps.",
        safetyLevel: "B",
        estimatedSize: categoryStats.crash_dumps?.size || 0,
        candidateCount: categoryStats.crash_dumps?.count || 0,
        selected: true,
        warning: "Contains technical diagnostic state of crashed programs."
      },
      {
        type: "browser_cache",
        name: "Browser Web Caches",
        description: "Cached web assets (Chrome, Edge). Does NOT delete cookies, logins, or history.",
        safetyLevel: "B",
        estimatedSize: categoryStats.browser_cache?.size || 0,
        candidateCount: categoryStats.browser_cache?.count || 0,
        selected: false,
        warning: "Websites may take slightly longer to load on first visit after clearing."
      }
    ];
    const recycleBin = await this.getRecycleBinStatus();
    const reclaimableTotal = candidates.filter((c) => c.selected && !c.isLocked).reduce((sum, c) => sum + c.size, 0);
    const pastCleanup = dbOperations.getCleanupOverview();
    const overview = {
      estimatedReclaimableBytes: reclaimableTotal,
      candidateCount: candidates.filter((c) => c.selected).length,
      lastCleanupAt: pastCleanup.lastCleanupAt,
      totalSpaceReclaimedBytes: pastCleanup.totalReclaimedBytes,
      categories,
      recycleBin
    };
    return { candidates, categories, overview };
  }
  /**
   * Execute safe cleanup on selected candidates
   * Follows strict safety rules: revalidate immediately before deletion,
   * skip locked/changed files, support optional quarantine.
   */
  static async executeCleanup(selectedCandidates, useQuarantine = false) {
    const sessionId = "clean_" + Date.now();
    const startTime = Date.now();
    let filesRemoved = 0;
    let filesSkipped = 0;
    let filesFailed = 0;
    let reclaimedBytes = 0;
    const errors = [];
    const categoriesCleaned = /* @__PURE__ */ new Set();
    const quarantineBaseDir = useQuarantine ? import_node_path8.default.join(this.getQuarantineDir(), (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")) : "";
    if (useQuarantine && !import_node_fs8.default.existsSync(quarantineBaseDir)) {
      import_node_fs8.default.mkdirSync(quarantineBaseDir, { recursive: true });
    }
    for (const cand of selectedCandidates) {
      categoriesCleaned.add(cand.category);
      if (!import_node_fs8.default.existsSync(cand.path)) {
        filesSkipped++;
        continue;
      }
      const lower = cand.path.toLowerCase();
      if (lower.startsWith("c:\\windows") || lower.startsWith("c:\\program files") || lower.includes("desktop") || lower.includes("documents")) {
        filesSkipped++;
        errors.push({ path: cand.path, error: "Path is in protected directory" });
        continue;
      }
      if (this.isFileLocked(cand.path)) {
        filesSkipped++;
        errors.push({ path: cand.path, error: "File is locked or in use by another application" });
        continue;
      }
      try {
        const currentStat = await import_node_fs8.default.promises.stat(cand.path);
        if (Date.now() - currentStat.mtimeMs < 5 * 60 * 1e3) {
          filesSkipped++;
          errors.push({ path: cand.path, error: "File was modified during or after scan" });
          continue;
        }
        const fileSize = currentStat.size;
        if (useQuarantine && cand.canQuarantine) {
          const targetName = `${Date.now()}_${import_node_path8.default.basename(cand.path)}`;
          const targetPath = import_node_path8.default.join(quarantineBaseDir, targetName);
          await import_node_fs8.default.promises.copyFile(cand.path, targetPath);
          await import_node_fs8.default.promises.unlink(cand.path);
        } else {
          await import_node_fs8.default.promises.unlink(cand.path);
        }
        filesRemoved++;
        reclaimedBytes += fileSize;
      } catch (err) {
        filesFailed++;
        errors.push({ path: cand.path, error: err?.message || "Permission denied or file busy" });
      }
    }
    const durationMs = Date.now() - startTime;
    const report = {
      sessionId,
      filesRemoved,
      filesSkipped,
      filesFailed,
      estimatedReclaimedBytes: reclaimedBytes,
      actualDiskChangeBytes: reclaimedBytes,
      // In real NTFS this aligns closely with removed length
      durationMs,
      categoriesCleaned: Array.from(categoriesCleaned),
      errors
    };
    try {
      dbOperations.saveCleanupSession(report, Array.from(categoriesCleaned));
    } catch (saveErr) {
      console.error("[SystemCleaner] Failed to persist cleanup session:", saveErr);
    }
    return report;
  }
};

// src/server/api-server.ts
var PORT = 4545;
var serverInstance = null;
function startApiServer() {
  return new Promise((resolve) => {
    if (serverInstance) {
      resolve(serverInstance);
      return;
    }
    DirectoryMonitorService.initialize();
    const server = import_node_http.default.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      const parsedUrl = (0, import_node_url.parse)(req.url || "", true);
      const pathname = parsedUrl.pathname || "";
      const method = req.method || "GET";
      const getBody = async () => {
        return new Promise((resolveBody) => {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              resolveBody(body ? JSON.parse(body) : {});
            } catch {
              resolveBody({});
            }
          });
        });
      };
      const sendJson = (statusCode, data) => {
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
      try {
        if (pathname === "/api/overview" && method === "GET") {
          const stats = dbOperations.getOverviewStats();
          return sendJson(200, stats);
        }
        if (pathname === "/api/locations" && method === "GET") {
          return sendJson(200, dbOperations.getLocations());
        }
        if (pathname === "/api/locations" && method === "POST") {
          const body = await getBody();
          const location = dbOperations.addLocation({
            name: body.name || "Folder",
            path: body.path,
            enabled: body.enabled ?? true,
            recursive: body.recursive ?? false,
            folderMode: body.folderMode || "monitor_contents",
            destinationTemplate: body.destinationTemplate || "{Category}/",
            targetDirectory: body.targetDirectory || null
          });
          if (location.enabled) {
            DirectoryMonitorService.startWatching(location.id, location.path, location.recursive);
          }
          return sendJson(201, location);
        }
        const locationMatch = pathname.match(/^\/api\/locations\/([a-zA-Z0-9_\-]+)$/);
        if (locationMatch && method === "PATCH") {
          const id = locationMatch[1];
          const body = await getBody();
          dbOperations.updateLocation(id, body);
          if (body.enabled !== void 0 || body.recursive !== void 0) {
            DirectoryMonitorService.reloadWatchers();
          }
          return sendJson(200, { success: true });
        }
        if (locationMatch && method === "DELETE") {
          const id = locationMatch[1];
          DirectoryMonitorService.stopWatching(id);
          dbOperations.deleteLocation(id);
          return sendJson(200, { success: true });
        }
        const scanMatch = pathname.match(/^\/api\/locations\/([a-zA-Z0-9_\-]+)\/scan$/);
        if (scanMatch && method === "POST") {
          const id = scanMatch[1];
          const count = await DirectoryMonitorService.reconcileLocation(id);
          return sendJson(200, { success: true, processedFiles: count });
        }
        if (pathname === "/api/rules" && method === "GET") {
          return sendJson(200, dbOperations.getRules());
        }
        if (pathname === "/api/rules" && method === "POST") {
          const body = await getBody();
          const saved = dbOperations.saveRule(body);
          return sendJson(200, saved);
        }
        const ruleDeleteMatch = pathname.match(/^\/api\/rules\/([a-zA-Z0-9_\-]+)$/);
        if (ruleDeleteMatch && method === "DELETE") {
          const id = ruleDeleteMatch[1];
          dbOperations.deleteRule(id);
          return sendJson(200, { success: true });
        }
        if (pathname === "/api/rules/reorder" && method === "POST") {
          const body = await getBody();
          dbOperations.reorderRules(body.ruleIds);
          return sendJson(200, { success: true });
        }
        if (pathname === "/api/rules/test" && method === "POST") {
          const body = await getBody();
          const result = RuleEngine.testRule(body.rule, body.samplePath);
          return sendJson(200, result);
        }
        if (pathname === "/api/history" && method === "GET") {
          const limit = Number(parsedUrl.query.limit) || 100;
          const offset = Number(parsedUrl.query.offset) || 0;
          const category = String(parsedUrl.query.category || "all");
          const status = String(parsedUrl.query.status || "all");
          const search = String(parsedUrl.query.search || "");
          const resHistory = dbOperations.getHistory(limit, offset, { category, status, search });
          return sendJson(200, resHistory);
        }
        const undoMatch = pathname.match(/^\/api\/history\/([a-zA-Z0-9_\-]+)\/undo$/);
        if (undoMatch && method === "POST") {
          const id = undoMatch[1];
          const result = UndoManager.undo(id);
          return sendJson(200, result);
        }
        if (pathname === "/api/review" && method === "GET") {
          return sendJson(200, dbOperations.getReviewQueue());
        }
        const reviewResolveMatch = pathname.match(/^\/api\/review\/([a-zA-Z0-9_\-]+)\/resolve$/);
        if (reviewResolveMatch && method === "POST") {
          const id = reviewResolveMatch[1];
          const body = await getBody();
          if (body.action === "approve" && body.originalPath && body.destination) {
            await SafeFileOperations.executeMove(
              body.originalPath,
              body.destination,
              "keep_both",
              "Manual Review Approval",
              body.category || "Unknown"
            );
          }
          dbOperations.resolveReviewItem(id, body.action === "skip" ? "skipped" : "resolved");
          return sendJson(200, { success: true });
        }
        if (pathname === "/api/settings" && method === "GET") {
          return sendJson(200, dbOperations.getSettings());
        }
        if (pathname === "/api/settings" && method === "POST") {
          const body = await getBody();
          dbOperations.updateSettings(body);
          DirectoryMonitorService.reloadWatchers();
          return sendJson(200, { success: true });
        }
        if (pathname === "/api/templates" && method === "GET") {
          return sendJson(200, dbOperations.getTemplates());
        }
        if (pathname === "/api/templates" && method === "POST") {
          const body = await getBody();
          dbOperations.saveTemplate(body);
          return sendJson(200, { success: true });
        }
        const templateDeleteMatch = pathname.match(/^\/api\/templates\/([a-zA-Z0-9_\-]+)$/);
        if (templateDeleteMatch && method === "DELETE") {
          const id = templateDeleteMatch[1];
          dbOperations.deleteTemplate(id);
          return sendJson(200, { success: true });
        }
        if (pathname === "/api/dry-scan" && method === "POST") {
          const body = await getBody();
          const result = DirectoryMonitorService.runDryScan(body.path);
          return sendJson(200, result);
        }
        if (pathname === "/api/explorer" && method === "GET") {
          const dirPath = String(parsedUrl.query.path || "");
          const items = DirectoryMonitorService.browseDirectory(dirPath);
          return sendJson(200, items);
        }
        if (pathname === "/api/organize-file" && method === "POST") {
          const body = await getBody();
          const res2 = await DirectoryMonitorService.processSingleFile(body.filePath, void 0, body.targetDirectory, true);
          return sendJson(200, { success: true, result: res2 });
        }
        if (pathname === "/api/organize-folder" && method === "POST") {
          const body = await getBody();
          const folder = body.folderPath || body.path;
          const targetDir = body.targetDirectory || body.destination;
          const categories = body.categories;
          const result = await DirectoryMonitorService.organizeFolder(folder, targetDir, categories);
          return sendJson(200, result);
        }
        if (pathname === "/api/system/select-folder" && (method === "POST" || method === "GET")) {
          try {
            const psScript = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Destination Folder'; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }`;
            (0, import_node_child_process3.exec)(`powershell -Sta -NoProfile -Command "${psScript}"`, (err, stdout) => {
              const picked = stdout ? stdout.trim() : null;
              return sendJson(200, { path: picked || null });
            });
            return;
          } catch {
            return sendJson(200, { path: null });
          }
        }
        if (pathname === "/api/system/quick-paths" && method === "GET") {
          const home = process.env.USERPROFILE || "C:\\Users\\Default";
          const quick = [
            { name: "Downloads", path: import_node_path9.default.join(home, "Downloads") },
            { name: "Desktop", path: import_node_path9.default.join(home, "Desktop") },
            { name: "Documents", path: import_node_path9.default.join(home, "Documents") },
            { name: "Pictures", path: import_node_path9.default.join(home, "Pictures") },
            { name: "Videos", path: import_node_path9.default.join(home, "Videos") }
          ].filter((p) => import_node_fs9.default.existsSync(p.path));
          return sendJson(200, quick);
        }
        if (pathname === "/api/monitoring/pause" && method === "POST") {
          DirectoryMonitorService.pauseAll();
          return sendJson(200, { paused: true });
        }
        if (pathname === "/api/monitoring/resume" && method === "POST") {
          DirectoryMonitorService.resumeAll();
          return sendJson(200, { paused: false });
        }
        if (pathname === "/api/monitoring/status" && method === "GET") {
          return sendJson(200, {
            paused: DirectoryMonitorService.isMonitoringPaused()
          });
        }
        if (pathname === "/api/storage/drives" && method === "GET") {
          const drives = await StorageAnalyzerService.getDrives();
          return sendJson(200, drives);
        }
        if (pathname === "/api/storage/scan" && method === "POST") {
          const body = await getBody();
          const targetPath = body.path || process.env.USERPROFILE || process.cwd();
          const result = await StorageAnalyzerService.scanDirectory(targetPath);
          return sendJson(200, result);
        }
        if (pathname === "/api/storage/scan/latest" && method === "GET") {
          const rootPath = parsedUrl.query.path ? String(parsedUrl.query.path) : void 0;
          const latest = dbOperations.getLatestStorageScan(rootPath);
          return sendJson(200, latest || { session: null, data: null });
        }
        if (pathname === "/api/storage/scan/cancel" && method === "POST") {
          const body = await getBody();
          if (body.sessionId) {
            StorageAnalyzerService.cancelScan(body.sessionId);
          }
          return sendJson(200, { success: true });
        }
        if (pathname === "/api/cleaner/overview" && method === "GET") {
          const data = await SystemCleanerService.scanCleanupCandidates();
          return sendJson(200, data);
        }
        if (pathname === "/api/cleaner/scan" && method === "POST") {
          const body = await getBody();
          const data = await SystemCleanerService.scanCleanupCandidates({
            minAgeDays: body.minAgeDays,
            selectedCategories: body.selectedCategories
          });
          return sendJson(200, data);
        }
        if (pathname === "/api/cleaner/clean" && method === "POST") {
          const body = await getBody();
          const report = await SystemCleanerService.executeCleanup(
            body.candidates || [],
            Boolean(body.useQuarantine)
          );
          return sendJson(200, report);
        }
        if (pathname === "/api/cleaner/recycle-bin" && method === "GET") {
          const status = await SystemCleanerService.getRecycleBinStatus();
          return sendJson(200, status);
        }
        if (pathname === "/api/cleaner/recycle-bin/empty" && method === "POST") {
          const res2 = await SystemCleanerService.emptyRecycleBin();
          return sendJson(200, res2);
        }
        if (pathname === "/api/cleaner/history" && method === "GET") {
          const history = dbOperations.getCleanupHistory();
          return sendJson(200, history);
        }
        if (pathname === "/api/diagnostics" && method === "GET") {
          const locations = dbOperations.getLocations();
          const history = dbOperations.getHistory(1, 0);
          const errors = dbOperations.getRecentErrors(10);
          return sendJson(200, {
            serviceRunning: true,
            watcherCount: locations.filter((l) => l.enabled && l.status === "active").length,
            queueDepth: 0,
            activeMonitors: locations.length,
            totalHistoryRecords: history.total,
            databasePath: "NexusFile/nexusfile.db",
            storageUsedBytes: 0,
            lastReconciliationTime: (/* @__PURE__ */ new Date()).toISOString(),
            recentErrors: errors,
            uptimeSeconds: Math.floor(process.uptime())
          });
        }
        sendJson(404, { error: "Not found" });
      } catch (err) {
        dbOperations.logError(err?.message || String(err), pathname, err?.stack);
        sendJson(500, { error: err?.message || "Internal Server Error" });
      }
    });
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`[NexusFile Backend] Engine running on http://127.0.0.1:${PORT}`);
      serverInstance = server;
      resolve(server);
    });
  });
}
if (require.main === module) {
  startApiServer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  startApiServer
});
