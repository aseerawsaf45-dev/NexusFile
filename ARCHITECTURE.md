# NexusFile Architecture & System Design Document
*High-Performance Automated File Management & Storage Studio for Windows Desktop*

---

## 1. System Overview

**NexusFile** is a production-quality, local-first Windows desktop application engineered to eliminate manual filesystem maintenance. It provides real-time directory monitoring, multi-signal classification, priority-driven rule execution, reversible safety mechanisms, and a calm, information-dense dark/light desktop interface.

### High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Desktop Shell
        Tray[Windows System Tray] --> Shell[Electron Desktop Runtime]
        Shell --> IPC[ContextBridge & Preload]
    end

    subgraph User Interface Next.js 14 + React + Tailwind
        Dash[Overview Dashboard]
        Loc[Monitored Locations]
        Exp[Real File Explorer]
        Rules[Visual Rule Editor]
        Review[Review Queue]
        Hist[Activity Audit Log]
        StorageUI[Storage Analyzer]
        CleanerUI[Cache & Temp Cleaner]
        Tpl[Templates Manager]
        Settings[Settings Center]
        Cmd[Command Palette Ctrl+K]
    end

    subgraph Backend Core Engine
        API[HTTP REST API Server :4545]
        Monitor[Directory Monitor & Watcher]
        Scanner[Reconciliation Scanner]
        Queue[Debounced Stability Queue]
        Classifier[Multi-Signal Classifier]
        RuleEngine[Priority Rule Engine]
        SafeOps[Safe File Operations]
        UndoMgr[Reversible Undo Manager]
        StorageSvc[Storage Analyzer Service]
        CleanerSvc[System Cleaner Service]
        DB[(Persistent SQLite DB - WAL Mode)]
    end

    subgraph Rust Native Engine
        RustCore[nexusfile-core crate]
    end

    Shell --> User Interface
    User Interface --> API
    API --> Monitor
    API --> DB
    Monitor --> Queue
    Queue --> Classifier
    Classifier --> RuleEngine
    RuleEngine --> SafeOps
    SafeOps --> DB
    SafeOps --> UndoMgr
    Scanner --> Queue
```

---

## 2. Component Breakdown

### A. Frontend Desktop Interface (`src/app/` & `src/components/`)
Built with **Next.js 14**, **React 18**, **Tailwind CSS**, and **Lucide Icons**:
- **Design System**: Strict dark/light theme tokens defined in CSS variables (`--bg-primary`, `--bg-surface`, `--accent-teal`, `--accent-emerald`). Tabular numerals (`tabular-nums`) for file sizes and counts.
- **Overview Dashboard (`src/app/page.tsx`)**: Live metric cards (Files organized today, in queue, active locations, errors), real-time Recharts area and bar charts driven directly by SQLite queries.
- **Monitored Locations (`src/app/locations/page.tsx`)**: Folder configuration, recursive toggle, destination template selector, and on-demand reconciliation scan triggers.
- **File Explorer (`src/app/explorer/page.tsx`)**: Direct inspection of monitored directories with real file system navigation, breadcrumbs, search, size formatting, and proposed destination previews.
- **Rule Builder (`src/app/rules/page.tsx` & `src/components/rules/RuleEditorModal.tsx`)**: Priority ordering, multi-condition AND/OR builders, collision policy pickers, and interactive real-time rule tester.
- **Review Queue (`src/app/review/page.tsx`)**: Flagged files, conflict review, manual approval, destination overrides, and skip controls.
- **Activity History (`src/app/history/page.tsx`)**: Audit log with category and status filters, full file metadata, SHA-256 hashes, and 1-click reversible Undo.
- **Organization Templates (`src/app/templates/page.tsx`)**: Pattern management supporting dynamic tags (`{Category}`, `{Year}`, `{Month}`, `{Day}`, `{Extension}`, `{Project}`, `{OriginalFolder}`).
- **Settings Center (`src/app/settings/page.tsx`)**: 5 sections (General, Organization, Monitoring, Safety, Diagnostics) saved directly to SQLite.
- **Global Command Palette (`src/components/layout/CommandPalette.tsx`)**: Accessible via `Ctrl+K` for instant keyboard-driven navigation and actions.

---

### B. Backend Engine (`src/server/`)
Running locally on port 4545 with complete local data sovereignty:

1. **Persistent Database (`src/server/database.ts`)**:
   - Leverages native C-level SQLite with Write-Ahead Logging (`WAL`) mode enabled.
   - Strict schemas with foreign keys, indexes on timestamps, categories, and results.
   - Automatic seeding of default 15 categories, 5 organization templates, and standard baseline rules.

2. **Real-Time Directory Monitoring (`src/server/monitor.ts`)**:
   - Native directory watchers (`fs.watch`) with recursive detection.
   - **Stability & Debounce Engine**: Files are added to a debounced tracking queue. Polled until size and modification time remain completely unchanged across consecutive ticks (configurable default: 2000ms).
   - Incomplete downloads (`.crdownload`, `.part`, `.tmp`) and hidden system metadata files are automatically held until settled.
   - **Reconciliation Scanner**: Automatically iterates directories on startup or interval to catch events missed while the computer was sleeping or offline.

3. **Multi-Signal Classifier (`src/server/classifier.ts` & `nexusfile-core/src/file_classifier.rs`)**:
   - Multi-tier classification across 15 standard categories.
   - Header magic byte inspections:
     - PDF: `%PDF`
     - PNG: `89 50 4E 47`
     - JPEG: `FF D8 FF`
     - ZIP / Office: `50 4B 03 04`
     - RAR: `52 61 72 21`
     - 7Z: `37 7A BC AF 27 1C`
     - PE Executables: `4D 5A`
     - MP3: `ID3` / frame sync
   - Comprehensive extension mapping (>80 extensions).
   - Project keyword extraction from filename prefix patterns (e.g., `FabricX_model_results.xlsx` -> `FabricX`).

4. **Deterministic Priority Rule Engine (`src/server/rule-engine.ts`)**:
   - Evaluates rules ordered strictly by ascending priority (1, 2, 3...).
   - Condition operators: `equals`, `not_equals`, `contains`, `starts_with`, `ends_with`, `matches_regex`, `greater_than`, `less_than`.
   - Dynamic path template resolution with date placeholders (`{Year}`, `{Month}`, `{Day}`) and project tokens.

5. **Safe File Operations & Integrity Guard (`src/server/file-operations.ts`)**:
   - **Zero Silent Data Loss**: Overwriting requires explicit configuration.
   - Collision policies:
     - `keep_both`: Generates collision-safe filenames preserving original extension (`file (1).pdf`, `file (2).pdf`).
     - `skip`: Records item as skipped without touching the disk.
     - `overwrite_with_confirmation`: Routes file to Review Queue for explicit user sign-off.
   - **Loop Prevention**: Destination paths residing inside monitored directories are automatically checked and prevented from triggering cyclic watcher events.
   - **System Directory Protection**: Hard blocks any operations targeting `C:\Windows`, `C:\Program Files`, `C:\ProgramData`, etc.
   - **Integrity Verification**: Computes SHA-256 before and after operations, verifying bytes remain identical.

6. **Reversible Undo Manager (`src/server/undo-manager.ts`)**:
   - Validates that the organized file still exists at the destination.
   - Validates that the original path is currently unoccupied (or generates a conflict warning).
   - Verifies SHA-256 content hash matches original operation metadata.
   - Reverses move or copy atomically, updating the SQLite audit log.

---

## 3. Database Schema

```sql
-- Monitored Locations
CREATE TABLE monitored_locations (
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

-- Organization Rules
CREATE TABLE organization_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  action_type TEXT NOT NULL,
  destination_pattern TEXT NOT NULL,
  target_directory TEXT,
  collision_policy TEXT NOT NULL DEFAULT 'keep_both',
  dry_run_only INTEGER NOT NULL DEFAULT 0,
  source_location_id TEXT,
  execution_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Rule Conditions
CREATE TABLE rule_conditions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  field TEXT NOT NULL,
  operator TEXT NOT NULL,
  value TEXT NOT NULL,
  logical_op TEXT NOT NULL DEFAULT 'AND',
  FOREIGN KEY (rule_id) REFERENCES organization_rules(id) ON DELETE CASCADE
);

-- File Operation History (Audit Log)
CREATE TABLE file_operation_history (
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

-- Pending Review Queue
CREATE TABLE pending_review_items (
  id TEXT PRIMARY KEY,
  detected_at TEXT NOT NULL,
  original_path TEXT NOT NULL UNIQUE,
  suggested_category TEXT NOT NULL,
  suggested_destination TEXT NOT NULL,
  reason TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Storage Scans (Size Tree & Drive Usage)
CREATE TABLE storage_scans (
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

-- Cleanup Sessions (Audit Log & Space Reclaimed)
CREATE TABLE cleanup_sessions (
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
```

---

## 4. Background Lifecycle & Windows Integration

1. **System Tray Integration**:
   - Minimizing or clicking the window close button (`X`) minimizes to the Windows System Tray with an informational balloon notification.
   - Right-click tray context menu includes:
     - **Open Sortwise**
     - **Pause All Monitoring**
     - **Resume All Monitoring**
     - **Quit** (Full application termination)
2. **Single Instance Lock**:
   - `app.requestSingleInstanceLock()` ensures only one instance of Sortwise runs at any time.
   - Launching a second instance brings the existing window to focus without spawning duplicate watcher threads.
3. **Local Sovereignty**:
   - Zero telemetry, zero external network calls.
   - All files remain on the local disk.
