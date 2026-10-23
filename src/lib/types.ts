export type FileCategory =
  | 'Documents'
  | 'Spreadsheets'
  | 'Presentations'
  | 'Images'
  | 'Videos'
  | 'Audio'
  | 'Archives'
  | 'Installers'
  | 'Development'
  | 'Design'
  | 'Fonts'
  | 'Data'
  | 'Ebooks'
  | 'Shortcuts'
  | 'Torrents'
  | 'Unknown';

export interface CategoryInfo {
  id: FileCategory;
  name: string;
  description: string;
  extensions: string[];
  color: string;
  iconName: string;
}

export type CollisionPolicy = 'skip' | 'keep_both' | 'overwrite_with_confirmation';

export type FolderHandlingMode = 'monitor_contents' | 'organize_folder' | 'smart_folder_rules';

export interface MonitoredLocation {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  recursive: boolean;
  folderMode: FolderHandlingMode;
  destinationTemplate: string;
  targetDirectory?: string | null;
  itemCount: number;
  lastScannedAt: string | null;
  status: 'active' | 'paused' | 'offline' | 'error';
  errorMessage?: string | null;
  createdAt: string;
}

export type ConditionField =
  | 'extension'
  | 'category'
  | 'filename'
  | 'file_size'
  | 'created_date'
  | 'modified_date'
  | 'parent_folder'
  | 'project_keyword';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex_matches'
  | 'greater_than'
  | 'less_than'
  | 'in_list';

export interface RuleCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  logicalOp: 'AND' | 'OR';
}

export type RuleActionType =
  | 'move'
  | 'copy'
  | 'rename_template'
  | 'route_to_directory'
  | 'organize_contents'
  | 'ignore'
  | 'send_to_review';

export interface OrganizationRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  description: string;
  conditions: RuleCondition[];
  actionType: RuleActionType;
  destinationPattern: string;
  targetDirectory?: string;
  collisionPolicy: CollisionPolicy;
  dryRunOnly: boolean;
  sourceLocationId?: string | null; // null means all locations
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileOperationHistory {
  id: string;
  timestamp: string;
  originalPath: string;
  newPath: string;
  fileCategory: FileCategory;
  fileSize: number;
  appliedRuleName: string;
  operationType: 'move' | 'copy' | 'rename' | 'ignore' | 'review';
  result: 'success' | 'failed' | 'skipped';
  errorDetails?: string | null;
  contentHash?: string | null;
  isUndone: boolean;
  canUndo: boolean;
}

export interface PendingReviewItem {
  id: string;
  detectedAt: string;
  originalPath: string;
  suggestedCategory: FileCategory;
  suggestedDestination: string;
  reason: 'unknown_type' | 'rule_conflict' | 'file_locked' | 'manual_review_rule';
  fileSize: number;
  status: 'pending' | 'approved' | 'skipped' | 'resolved';
}

export interface OrganizationTemplate {
  id: string;
  name: string;
  description: string;
  pattern: string;
  isPreset: boolean;
}

export interface ApplicationSettings {
  // General
  launchAtStartup: boolean;
  startMonitoringAutomatically: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  defaultTheme: 'system' | 'dark' | 'light';

  // Organization
  defaultDestinationTemplate: string;
  defaultCollisionPolicy: CollisionPolicy;
  unknownFileBehavior: 'review_queue' | 'organize_to_unknown' | 'ignore';
  fileStabilityDelayMs: number;
  folderHandlingMode: FolderHandlingMode;

  // Monitoring
  recursiveMonitoringDefault: boolean;
  excludedFolders: string[];
  excludedPatterns: string[];
  ignoreTemporaryFiles: boolean;
  maxConcurrentOperations: number;
  reconciliationIntervalMinutes: number;

  // Safety
  dryRunMode: boolean;
  requireApprovalAboveMb: number;
  enableContentHashCheck: boolean;
  historyRetentionDays: number;
  protectedPaths: string[];

  // Notifications
  notificationsEnabled: boolean;
  notifyOnBatchComplete: boolean;
  notifyOnReviewRequired: boolean;
  notifyOnError: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface DryRunItem {
  id: string;
  originalPath: string;
  filename: string;
  proposedDestination: string;
  fileCategory: FileCategory;
  matchingRuleName: string;
  fileSize: number;
  willConflict: boolean;
  conflictReason?: string;
  status: 'can_move' | 'will_skip' | 'review_required';
}

export interface DryRunResult {
  totalFiles: number;
  totalBytes: number;
  processableFiles: number;
  conflictingFiles: number;
  skippedFiles: number;
  items: DryRunItem[];
}

export interface ExplorerFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  category: FileCategory;
  proposedDestination?: string;
  matchingRule?: string;
}

export interface DiagnosticsInfo {
  serviceRunning: boolean;
  watcherCount: number;
  queueDepth: number;
  activeMonitors: number;
  totalHistoryRecords: number;
  databasePath: string;
  storageUsedBytes: number;
  lastReconciliationTime: string | null;
  recentErrors: { timestamp: string; message: string; path?: string }[];
  uptimeSeconds: number;
}

// ==========================================
// STORAGE ANALYZER (SIZE TREE) TYPES
// ==========================================

export interface DriveInfo {
  driveLetter: string;
  volumeName: string;
  driveType: string;
  fileSystem: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  percentUsed: number;
  isReady: boolean;
  lastScannedAt: string | null;
}

export interface SizeTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  logicalSize: number;
  allocatedSize?: number;
  fileCount: number;
  dirCount: number;
  percentOfParent: number;
  percentOfTotal: number;
  category?: FileCategory;
  lastModified: string;
  isPartial?: boolean;
  hasChildren: boolean;
  children?: SizeTreeNode[];
}

export interface LargestFileEntry {
  name: string;
  path: string;
  size: number;
  parentFolder: string;
  extension: string;
  category: FileCategory;
  lastModified: string;
}

export interface StorageCategorySummary {
  category: FileCategory;
  size: number;
  fileCount: number;
  percentage: number;
  color: string;
}

export interface StorageScanSession {
  id: string;
  rootPath: string;
  status: 'queued' | 'scanning' | 'completed' | 'completed_with_warnings' | 'cancelled' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  totalLogicalSize: number;
  totalFiles: number;
  totalDirectories: number;
  inaccessibleCount: number;
  inaccessiblePaths: string[];
  durationMs: number;
}

export interface TreeMapItem {
  name: string;
  path: string;
  size: number;
  category: FileCategory;
  color: string;
  isDirectory: boolean;
  children?: TreeMapItem[];
}

export interface StorageScanResult {
  session: StorageScanSession;
  rootNode: SizeTreeNode;
  largestFiles: LargestFileEntry[];
  categoryDistribution: StorageCategorySummary[];
  treemapData: TreeMapItem[];
}

// ==========================================
// CACHE & TEMP CLEANER TYPES
// ==========================================

export type CleanupSafetyLevel = 'A' | 'B' | 'C';

export type CleanupCategoryType =
  | 'user_temp'
  | 'app_cache'
  | 'thumbnail_cache'
  | 'crash_dumps'
  | 'recycle_bin'
  | 'browser_cache'
  | 'custom_temp';

export interface CleanupCategoryCard {
  type: CleanupCategoryType;
  name: string;
  description: string;
  safetyLevel: CleanupSafetyLevel;
  estimatedSize: number;
  candidateCount: number;
  selected: boolean;
  warning?: string;
}

export interface CleanupCandidate {
  id: string;
  category: CleanupCategoryType;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  safetyLevel: CleanupSafetyLevel;
  reason: string;
  isLocked: boolean;
  selected: boolean;
  canQuarantine: boolean;
}

export interface CleanupResultReport {
  sessionId: string;
  filesRemoved: number;
  filesSkipped: number;
  filesFailed: number;
  estimatedReclaimedBytes: number;
  actualDiskChangeBytes: number;
  durationMs: number;
  categoriesCleaned: string[];
  errors: { path: string; error: string }[];
}

export interface RecycleBinStatus {
  totalSize: number;
  itemCount: number;
  isAvailable: boolean;
}

export interface CleanerOverviewData {
  estimatedReclaimableBytes: number;
  candidateCount: number;
  lastCleanupAt: string | null;
  totalSpaceReclaimedBytes: number;
  categories: CleanupCategoryCard[];
  recycleBin: RecycleBinStatus;
}
