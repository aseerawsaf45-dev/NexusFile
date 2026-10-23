import fs from 'node:fs';
import path from 'node:path';
import { dbOperations } from './database';
import { RuleEngine } from './rule-engine';
import { SafeFileOperations } from './file-operations';
import { FileClassifier } from './classifier';
import { DryRunResult, DryRunItem, ExplorerFileItem } from '../lib/types';

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
    if (stat.isDirectory()) {
      // Directories are handled according to location folderMode
      return null;
    }

    const settings = dbOperations.getSettings();

    // Check stability (instant lock check if immediateMode, else stability delay)
    const isStable = await SafeFileOperations.checkFileStability(
      filePath,
      immediateMode ? 0 : (settings.fileStabilityDelayMs || 500),
      immediateMode
    );
    if (!isStable) {
      return null; // Still downloading or locked
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

    const baseDestFolder = customDestinationDirectory || matchedLocation?.targetDirectory || undefined;
    const template = matchedLocation?.destinationTemplate || settings.defaultDestinationTemplate;

    const rules = dbOperations.getRules();
    const evaluation = RuleEngine.evaluate(filePath, rules, template, baseDestFolder);

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
      const scanDir = async (dir: string) => {
        let entries: fs.Dirent[] = [];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && loc.recursive) {
            try {
              const stat = fs.lstatSync(fullPath);
              if (!stat.isSymbolicLink()) {
                await scanDir(fullPath);
              }
            } catch {}
          } else if (entry.isFile()) {
            await this.processSingleFile(fullPath, loc.id);
            processedCount++;
          }
        }
      };

      await scanDir(loc.path);

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
    const candidateFiles: string[] = [];

    for (const entry of entries) {
      const full = path.join(resolvedPath, entry);
      try {
        const s = fs.statSync(full);
        if (s.isFile()) {
          candidateFiles.push(full);
        }
      } catch {}
    }

    // Filter candidate files by allowedCategories if specified
    const hasCategoryFilter = allowedCategories && allowedCategories.length > 0 && !allowedCategories.includes('all');
    const filteredFiles = hasCategoryFilter
      ? candidateFiles.filter((file) => {
          const classification = FileClassifier.classify(file);
          return allowedCategories.includes(classification.category);
        })
      : candidateFiles;

    let organizedCount = 0;
    let skippedCount = candidateFiles.length - filteredFiles.length;
    const items: Array<{ original: string; destination: string; category: string; status: string }> = [];

    // Process concurrently in chunks of 10 for peak I/O performance
    const CHUNK_SIZE = 10;
    for (let i = 0; i < filteredFiles.length; i += CHUNK_SIZE) {
      const chunk = filteredFiles.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (file) => {
          try {
            const res = await this.processSingleFile(file, undefined, customDestination, true);
            if (res && res.success) {
              organizedCount++;
              items.push({
                original: file,
                destination: res.finalPath,
                category: res.operationType || 'organized',
                status: 'success',
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
      items,
    };
  }

  /**
   * Run a dry scan over a folder to show proposed changes without touching files.
   */
  public static runDryScan(directoryPath: string): DryRunResult {
    if (!fs.existsSync(directoryPath)) {
      return { totalFiles: 0, totalBytes: 0, processableFiles: 0, conflictingFiles: 0, skippedFiles: 0, items: [] };
    }

    const rules = dbOperations.getRules();
    const settings = dbOperations.getSettings();
    const locations = dbOperations.getLocations();
    const matchedLoc = locations.find((l) => directoryPath.toLowerCase().startsWith(l.path.toLowerCase()));
    const template = matchedLoc?.destinationTemplate || settings.defaultDestinationTemplate;
    const baseDest = matchedLoc?.targetDirectory || undefined;

    const files = fs.readdirSync(directoryPath);
    const items: DryRunItem[] = [];

    let totalBytes = 0;
    let processableFiles = 0;
    let conflictingFiles = 0;
    let skippedFiles = 0;

    for (const file of files) {
      const fullPath = path.join(directoryPath, file);
      if (!fs.existsSync(fullPath)) continue;

      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      totalBytes += stat.size;
      const evaluation = RuleEngine.evaluate(fullPath, rules, template, baseDest);

      const willConflict = Boolean(evaluation.proposedDestination && fs.existsSync(evaluation.proposedDestination));
      let status: DryRunItem['status'] = 'can_move';

      if (evaluation.action === 'ignore') {
        status = 'will_skip';
        skippedFiles++;
      } else if (evaluation.action === 'review' || evaluation.category === 'Unknown') {
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
        matchingRuleName: evaluation.matchedRule ? evaluation.matchedRule.name : 'Default Category Template',
        fileSize: stat.size,
        willConflict,
        conflictReason: willConflict ? 'Target destination already contains a file with this name.' : undefined,
        status,
      });
    }

    return {
      totalFiles: items.length,
      totalBytes,
      processableFiles,
      conflictingFiles,
      skippedFiles,
      items,
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
          const dirClass = FileClassifier.classifyDirectory(fullPath);
          return {
            name: e.name,
            path: fullPath,
            isDirectory: true,
            size: 0,
            modifiedAt,
            category: dirClass ? dirClass.category : 'Documents',
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
          proposedDestination: evaluation.proposedDestination || undefined,
          matchingRule: evaluation.matchedRule ? evaluation.matchedRule.name : undefined,
        };
      });
    } catch {
      return [];
    }
  }
}
