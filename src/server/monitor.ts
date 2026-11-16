import fs from 'node:fs';
import path from 'node:path';
import { dbOperations } from './database';
import { RuleEngine } from './rule-engine';
import { SafeFileOperations } from './file-operations';
import { FileClassifier } from './classifier';
import { DryRunResult, DryRunItem, ExplorerFileItem, CategoryBreakdownItem, FileCategory } from '../lib/types';
import { KNOWN_CATEGORY_FOLDERS, DEFAULT_CATEGORIES } from '../lib/constants';

interface WatcherEntry {
  locationId: string;
  watcher: fs.FSWatcher;
  path: string;
}

export class DirectoryMonitorService {
  private static watchers: Map<string, WatcherEntry> = new Map();
  private static processingQueue: Set<string> = new Set();
  private static isPaused: boolean = false;
  private static reconciliationTimer: NodeJS.Timeout | null = null;

  public static initialize() {
    this.reloadWatchers();

    // Start periodic reconciliation scanner (every 30 mins by default)
    const settings = dbOperations.getSettings();
    const intervalMs = (settings.reconciliationIntervalMinutes || 30) * 60 * 1000;
    this.reconciliationTimer = setInterval(() => {
      this.reconcileAll();
    }, intervalMs);
  }

  public static pauseAll() {
    this.isPaused = true;
    for (const entry of Array.from(this.watchers.values())) {
      try {
        entry.watcher.close();
      } catch {}
    }
    this.watchers.clear();
  }

  public static resumeAll() {
    this.isPaused = false;
    this.reloadWatchers();
    this.reconcileAll();
  }

  public static isMonitoringPaused(): boolean {
    return this.isPaused;
  }

  public static reloadWatchers() {
    if (this.isPaused) return;

    // Close existing
    for (const entry of this.watchers.values()) {
      try {
        entry.watcher.close();
      } catch {}
    }
    this.watchers.clear();

    const locations = dbOperations.getLocations().filter((loc) => loc.enabled);

    for (const loc of locations) {
      this.startWatching(loc.id, loc.path, loc.recursive);
    }
  }

  public static startWatching(locationId: string, dirPath: string, recursive: boolean = false) {
    if (this.isPaused) return;

    try {
      if (!fs.existsSync(dirPath)) {
        dbOperations.updateLocation(locationId, { status: 'offline', errorMessage: 'Directory or drive not found.' });
        return;
      }

      // Detect symlinks / junctions to avoid loops
      const stat = fs.lstatSync(dirPath);
      if (stat.isSymbolicLink()) {
        dbOperations.updateLocation(locationId, { status: 'error', errorMessage: 'Cannot monitor symlink directly.' });
        return;
      }

      const watcher = fs.watch(dirPath, { recursive }, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(dirPath, filename);
        this.queueFileForProcessing(fullPath, locationId);
      });

      this.watchers.set(locationId, { locationId, watcher, path: dirPath });
      dbOperations.updateLocation(locationId, { status: 'active', errorMessage: null });
    } catch (err: any) {
      dbOperations.updateLocation(locationId, { status: 'error', errorMessage: err?.message || String(err) });
    }
  }

  public static stopWatching(locationId: string) {
    const entry = this.watchers.get(locationId);
    if (entry) {
      try {
        entry.watcher.close();
      } catch {}
      this.watchers.delete(locationId);
    }
  }

  private static async queueFileForProcessing(filePath: string, locationId: string) {
    if (this.processingQueue.has(filePath)) return;
    this.processingQueue.add(filePath);

    // Run stability check in background
    setTimeout(async () => {
      try {
        await this.processSingleFile(filePath, locationId);
      } finally {
        this.processingQueue.delete(filePath);
      }
    }, 1000);
  }

  public static async processSingleFile(
    filePath: string,
    locationId?: string,
    customDestinationDirectory?: string,
    immediateMode: boolean = false
  ): Promise<any> {
    if (!fs.existsSync(filePath)) return null;

    const stat = fs.statSync(filePath);
    const isDir = stat.isDirectory();
    const baseName = path.basename(filePath);
    const lowerKnown = new Set(KNOWN_CATEGORY_FOLDERS.map((k) => k.toLowerCase()));

    if (isDir) {
      // Main category folders must stay at the root of the monitored directory
      if (lowerKnown.has(baseName.toLowerCase())) {
        return null;
      }
    }

    const settings = dbOperations.getSettings();

    // Check stability (instant lock check if immediateMode, else stability delay)
    if (!isDir) {
      const isStable = await SafeFileOperations.checkFileStability(
        filePath,
        immediateMode ? 0 : (settings.fileStabilityDelayMs || 500),
        immediateMode
      );
      if (!isStable) {
        return null; // Still downloading or locked
      }
    }

    // Check global dry-run mode
    if (settings.dryRunMode) {
      return null;
    }

    const locations = dbOperations.getLocations();
    let matchedLocation = locationId ? locations.find((l) => l.id === locationId) : undefined;
    if (!matchedLocation) {
      const lowerFile = filePath.toLowerCase();
      matchedLocation = locations.find((l) => lowerFile.startsWith(l.path.toLowerCase()));
    }

    const baseDestFolder = customDestinationDirectory || matchedLocation?.targetDirectory || matchedLocation?.path || undefined;
    const template = matchedLocation?.destinationTemplate || settings.defaultDestinationTemplate;

    const rules = dbOperations.getRules();
    const evaluation = RuleEngine.evaluate(filePath, rules, template, baseDestFolder, settings.unknownFileBehavior);

    if (evaluation.action === 'ignore') {
      return;
    }

    if (evaluation.action === 'review' || (settings.unknownFileBehavior === 'review_queue' && evaluation.category === 'Unknown')) {
      // Add to review queue
      dbOperations.addReviewItem({
        detectedAt: new Date().toISOString(),
        originalPath: filePath,
        suggestedCategory: evaluation.category,
        suggestedDestination: evaluation.proposedDestination || filePath,
        reason: evaluation.category === 'Unknown' ? 'unknown_type' : 'manual_review_rule',
        fileSize: stat.size,
      });
      return { success: true, action: 'review' };
    }

    if (evaluation.proposedDestination && evaluation.action === 'move') {
      const ruleName = evaluation.matchedRule ? evaluation.matchedRule.name : 'Default Category Template';
      const collisionPolicy = evaluation.matchedRule ? evaluation.matchedRule.collisionPolicy : settings.defaultCollisionPolicy;

      return await SafeFileOperations.executeMove(
        filePath,
        evaluation.proposedDestination,
        collisionPolicy,
        ruleName,
        evaluation.category
      );
    }
    return { success: false, action: 'skipped' };
  }

  /**
   * Run reconciliation scan on a single location or all locations.
   */
  public static async reconcileLocation(locationId: string): Promise<number> {
    const locations = dbOperations.getLocations();
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return 0;

    if (!fs.existsSync(loc.path)) {
      dbOperations.updateLocation(loc.id, { status: 'offline' });
      return 0;
    }

    let processedCount = 0;
    try {
      const lowerKnown = new Set(KNOWN_CATEGORY_FOLDERS.map((k) => k.toLowerCase()));
      const rootPath = path.resolve(loc.path);

      const scanDir = async (dir: string, isRoot: boolean) => {
        let entries: fs.Dirent[] = [];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const isCategoryFolder = lowerKnown.has(entry.name.toLowerCase());

          if (entry.isDirectory()) {
            if (isRoot) {
              if (isCategoryFolder) {
                // Main category folder at root: stays at root!
                if (loc.recursive) {
                  await scanDir(fullPath, false);
                }
              } else {
                // Non-category folder at root: ORGANIZE IT!
                const res = await this.processSingleFile(fullPath, loc.id, undefined, true);
                if (res && res.success && res.status !== 'skipped') {
                  processedCount++;
                }
              }
            } else if (loc.recursive) {
              try {
                const stat = fs.lstatSync(fullPath);
                if (!stat.isSymbolicLink()) {
                  await scanDir(fullPath, false);
                }
              } catch {}
            }
          } else if (entry.isFile()) {
            const res = await this.processSingleFile(fullPath, loc.id, undefined, true);
            if (res && res.success && res.status !== 'skipped') {
              processedCount++;
            }
          }
        }
      };

      await scanDir(rootPath, true);

      dbOperations.updateLocation(loc.id, {
        lastScannedAt: new Date().toISOString(),
        itemCount: processedCount,
        status: 'active',
      });
    } catch (err: any) {
      dbOperations.updateLocation(loc.id, { status: 'error', errorMessage: err?.message || String(err) });
    }

    return processedCount;
  }

  public static async reconcileAll() {
    const locations = dbOperations.getLocations().filter((l) => l.enabled);
    for (const loc of locations) {
      await this.reconcileLocation(loc.id);
    }
  }

  /**
   * Ultra-fast concurrent folder organizer.
   * Organizes eligible files in a folder concurrently in parallel chunks.
   */
  public static async organizeFolder(
    folderPath: string,
    customDestination?: string,
    allowedCategories?: string[]
  ): Promise<{
    success: boolean;
    folderPath: string;
    totalFound: number;
    organizedCount: number;
    skippedCount: number;
    durationMs: number;
    items: Array<{ original: string; destination: string; category: string; status: string }>;
  }> {
    const startTime = Date.now();
    const resolvedPath = path.resolve(folderPath);

    if (!fs.existsSync(resolvedPath)) {
      return {
        success: false,
        folderPath: resolvedPath,
        totalFound: 0,
        organizedCount: 0,
        skippedCount: 0,
        durationMs: 0,
        items: [],
      };
    }

    const entries = fs.readdirSync(resolvedPath);
    const candidateItems: Array<{ path: string; isDirectory: boolean; category: string }> = [];
    const lowerKnown = new Set(KNOWN_CATEGORY_FOLDERS.map((k) => k.toLowerCase()));

    for (const entry of entries) {
      // Skip known destination category folders so we never organize target folders into themselves
      if (lowerKnown.has(entry.toLowerCase())) {
        continue;
      }
      const full = path.join(resolvedPath, entry);
      try {
        const s = fs.statSync(full);
        if (s.isFile()) {
          const classification = FileClassifier.classify(full);
          candidateItems.push({ path: full, isDirectory: false, category: classification.category });
        } else if (s.isDirectory()) {
          const dirClass = FileClassifier.classifyDirectory(full);
          candidateItems.push({ path: full, isDirectory: true, category: dirClass?.category || 'Unknown' });
        }
      } catch {}
    }

    // Filter candidate items by allowedCategories if specified
    const hasCategoryFilter = allowedCategories && allowedCategories.length > 0 && !allowedCategories.includes('all');
    const filteredItems = hasCategoryFilter
      ? candidateItems.filter((item) => allowedCategories.includes(item.category))
      : candidateItems;

    let organizedCount = 0;
    let skippedCount = candidateItems.length - filteredItems.length;
    const items: Array<{ original: string; destination: string; category: string; status: string; isDirectory?: boolean }> = [];

    // Process concurrently in chunks of 10 for peak I/O performance
    const CHUNK_SIZE = 10;
    for (let i = 0; i < filteredItems.length; i += CHUNK_SIZE) {
      const chunk = filteredItems.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (item) => {
          try {
            const res = await this.processSingleFile(item.path, undefined, customDestination, true);
            if (res && res.success) {
              organizedCount++;
              items.push({
                original: item.path,
                destination: res.finalPath,
                category: res.operationType || item.category,
                status: 'success',
                isDirectory: item.isDirectory,
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
      totalFound: candidateItems.length,
      organizedCount,
      skippedCount,
      durationMs,
      items,
    };
  }

  /**
   * Run a dry scan over a folder to show proposed changes and category breakdown without touching files.
   */
  public static runDryScan(directoryPath: string, customDestination?: string): DryRunResult {
    if (!fs.existsSync(directoryPath)) {
      return { totalFiles: 0, totalBytes: 0, processableFiles: 0, conflictingFiles: 0, skippedFiles: 0, items: [], categoryBreakdown: {} };
    }

    const rules = dbOperations.getRules();
    const settings = dbOperations.getSettings();
    const locations = dbOperations.getLocations();
    const matchedLoc = locations.find((l) => directoryPath.toLowerCase().startsWith(l.path.toLowerCase()));
    const template = matchedLoc?.destinationTemplate || settings.defaultDestinationTemplate;
    const baseDest = customDestination || matchedLoc?.targetDirectory || undefined;

    const files = fs.readdirSync(directoryPath);
    const items: DryRunItem[] = [];
    const lowerKnown = new Set(KNOWN_CATEGORY_FOLDERS.map((k) => k.toLowerCase()));

    let totalBytes = 0;
    let processableFiles = 0;
    let conflictingFiles = 0;
    let skippedFiles = 0;

    for (const file of files) {
      if (lowerKnown.has(file.toLowerCase())) continue;
      const fullPath = path.join(directoryPath, file);
      if (!fs.existsSync(fullPath)) continue;

      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      const isDir = stat.isDirectory();
      const itemSize = isDir ? 0 : stat.size;
      totalBytes += itemSize;
      const evaluation = RuleEngine.evaluate(fullPath, rules, template, baseDest, settings.unknownFileBehavior);

      const willConflict = Boolean(evaluation.proposedDestination && fs.existsSync(evaluation.proposedDestination));
      let status: DryRunItem['status'] = 'can_move';

      if (evaluation.action === 'ignore') {
        status = 'will_skip';
        skippedFiles++;
      } else if (evaluation.action === 'review') {
        status = 'review_required';
        conflictingFiles++;
      } else if (willConflict) {
        conflictingFiles++;
      } else {
        processableFiles++;
      }

      items.push({
        id: 'dry_' + Math.random().toString(36).substring(2, 8),
        originalPath: fullPath,
        filename: file,
        proposedDestination: evaluation.proposedDestination || 'No destination',
        fileCategory: evaluation.category,
        matchingRuleName: evaluation.matchedRule
          ? evaluation.matchedRule.name
          : (isDir ? (evaluation.category === 'Codebases' ? 'Codebase Repository' : `${evaluation.category} Folder`) : 'Default Category Template'),
        fileSize: itemSize,
        willConflict,
        conflictReason: willConflict ? `Target destination already contains ${isDir ? 'a folder' : 'a file'} with this name.` : undefined,
        status,
        isDirectory: isDir,
      });
    }

    // Build category breakdown
    const categoryBreakdown: Record<string, CategoryBreakdownItem> = {};
    for (const item of items) {
      const cat = item.fileCategory;
      if (!categoryBreakdown[cat]) {
        const catInfo = DEFAULT_CATEGORIES.find((c) => c.id === cat);
        categoryBreakdown[cat] = {
          category: cat,
          count: 0,
          totalBytes: 0,
          color: catInfo?.color || '#94a3b8',
          iconName: catInfo?.iconName || 'File',
          sampleNames: [],
        };
      }
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].totalBytes += item.fileSize;
      if (categoryBreakdown[cat].sampleNames.length < 5) {
        categoryBreakdown[cat].sampleNames.push(item.filename);
      }
    }

    return {
      totalFiles: items.length,
      totalBytes,
      processableFiles,
      conflictingFiles,
      skippedFiles,
      items,
      categoryBreakdown,
    };
  }

  /**
   * Browse files in a directory for the real File Explorer view.
   */
  public static browseDirectory(dirPath?: string): ExplorerFileItem[] {
    let target = dirPath && dirPath.trim() ? dirPath.trim() : '';
    if (!target || !fs.existsSync(target)) {
      const home = process.env.USERPROFILE || 'C:\\';
      const downloads = path.join(home, 'Downloads');
      target = fs.existsSync(downloads) ? downloads : home;
    }
    if (!fs.existsSync(target)) return [];

    const rules = dbOperations.getRules();
    const settings = dbOperations.getSettings();
    const locations = dbOperations.getLocations();
    const matchedLoc = locations.find((l) => target.toLowerCase().startsWith(l.path.toLowerCase()));
    const template = matchedLoc?.destinationTemplate || settings.defaultDestinationTemplate;
    const baseDest = matchedLoc?.targetDirectory || undefined;
    const lowerKnown = new Set(KNOWN_CATEGORY_FOLDERS.map((k) => k.toLowerCase()));

    try {
      const entries = fs.readdirSync(target, { withFileTypes: true });

      return entries.map((e) => {
        const fullPath = path.join(target, e.name);
        let size = 0;
        let modifiedAt = new Date().toISOString();

        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          modifiedAt = stat.mtime.toISOString();
        } catch {}

        if (e.isDirectory()) {
          const isCategoryFolder = lowerKnown.has(e.name.toLowerCase());
          const dirClass = isCategoryFolder ? null : FileClassifier.classifyDirectory(fullPath);
          const evaluation = !isCategoryFolder
            ? RuleEngine.evaluate(fullPath, rules, template, baseDest, settings.unknownFileBehavior)
            : null;
          return {
            name: e.name,
            path: fullPath,
            isDirectory: true,
            size: 0,
            modifiedAt,
            category: isCategoryFolder ? (e.name as FileCategory) : (dirClass ? dirClass.category : 'Unknown'),
            proposedDestination: evaluation?.proposedDestination || undefined,
            matchingRule: isCategoryFolder ? 'Main Category Folder' : (evaluation?.matchedRule ? evaluation.matchedRule.name : undefined),
          };
        }

        const classification = FileClassifier.classify(fullPath);
        const evaluation = RuleEngine.evaluate(fullPath, rules, template, baseDest, settings.unknownFileBehavior);

        return {
          name: e.name,
          path: fullPath,
          isDirectory: false,
          size,
          modifiedAt,
          category: classification.category,
          proposedDestination: evaluation.proposedDestination || undefined,
          matchingRule: evaluation.matchedRule ? evaluation.matchedRule.name : undefined,
        };
      });
    } catch {
      return [];
    }
  }
}
