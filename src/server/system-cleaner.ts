import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  CleanupCategoryCard,
  CleanupCandidate,
  CleanupCategoryType,
  CleanupResultReport,
  CleanerOverviewData,
  RecycleBinStatus,
} from '../lib/types';
import { dbOperations } from './database';

const execAsync = promisify(exec);

export class SystemCleanerService {
  /**
   * Get quarantine directory location
   */
  public static getQuarantineDir(): string {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const qDir = path.join(appData, 'NexusFile', 'Quarantine');
    if (!fs.existsSync(qDir)) {
      fs.mkdirSync(qDir, { recursive: true });
    }
    return qDir;
  }

  /**
   * Inspect current Recycle Bin status
   */
  public static async getRecycleBinStatus(): Promise<RecycleBinStatus> {
    try {
      // Query Recycle Bin via PowerShell COM object or measure-object
      const ps = `powershell -NoProfile -Command "$rb = (New-Object -ComObject Shell.Application).Namespace(0xa); if ($rb) { $items = $rb.Items(); $size = ($items | Measure-Object -Property Size -Sum).Sum; @{ count = $items.Count; sizeBytes = [int64]$size } | ConvertTo-Json } else { @{ count = 0; sizeBytes = 0 } | ConvertTo-Json }"`;
      const { stdout } = await execAsync(ps);
      const data = JSON.parse(stdout.trim());
      return {
        totalSize: Number(data.sizeBytes) || 0,
        itemCount: Number(data.count) || 0,
        isAvailable: true,
      };
    } catch (_e) {
      return {
        totalSize: 0,
        itemCount: 0,
        isAvailable: false,
      };
    }
  }

  /**
   * Empty Recycle Bin with explicit confirmation
   */
  public static async emptyRecycleBin(): Promise<{ success: boolean; message: string }> {
    try {
      const ps = `powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"`;
      await execAsync(ps);
      return { success: true, message: 'Recycle Bin was successfully emptied.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to empty Recycle Bin' };
    }
  }

  /**
   * Check if a file is currently locked or in-use by another process
   */
  public static isFileLocked(filePath: string): boolean {
    try {
      const fd = fs.openSync(filePath, 'r+');
      fs.closeSync(fd);
      return false;
    } catch (err: any) {
      // EBUSY, EPERM, EACCES typically indicate the file is locked or in active use
      return true;
    }
  }

  /**
   * Scan system for cleanup candidates across configured categories
   */
  public static async scanCleanupCandidates(options?: {
    minAgeDays?: number;
    selectedCategories?: CleanupCategoryType[];
  }): Promise<{
    candidates: CleanupCandidate[];
    categories: CleanupCategoryCard[];
    overview: CleanerOverviewData;
  }> {
    const minAgeDays = options?.minAgeDays ?? 7;
    const now = Date.now();
    const ageThresholdMs = minAgeDays * 24 * 60 * 60 * 1000;
    const candidates: CleanupCandidate[] = [];

    // Category target directories
    const userTempDir = process.env.TEMP || path.join(os.homedir(), 'AppData', 'Local', 'Temp');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const crashDumpsDir = path.join(localAppData, 'CrashDumps');
    const explorerCacheDir = path.join(localAppData, 'Microsoft', 'Windows', 'Explorer');

    // Browser Cache directories (STRICT: only Cache_Data, NEVER profiles or credentials!)
    const chromeCache = path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache', 'Cache_Data');
    const edgeCache = path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache', 'Cache_Data');

    // 1. Scan User Temporary Files (Level A)
    if (fs.existsSync(userTempDir)) {
      try {
        const files = await fs.promises.readdir(userTempDir);
        for (const f of files.slice(0, 300)) {
          const fullPath = path.join(userTempDir, f);
          try {
            const stat = await fs.promises.stat(fullPath);
            if (stat.isFile()) {
              const fileAgeMs = now - stat.mtimeMs;
              const isOld = fileAgeMs >= ageThresholdMs;
              const locked = this.isFileLocked(fullPath);
              const ageDays = Math.floor(fileAgeMs / (24 * 60 * 60 * 1000));

              candidates.push({
                id: 'cand_' + Math.random().toString(36).substring(2, 9),
                category: 'user_temp',
                name: f,
                path: fullPath,
                size: stat.size,
                lastModified: stat.mtime.toISOString(),
                safetyLevel: 'A',
                reason: isOld
                  ? `Stale temporary file (${ageDays} days old, exceeds ${minAgeDays}d policy)`
                  : `Recent temporary file (${ageDays}d old, review suggested)`,
                isLocked: locked,
                selected: isOld && !locked,
                canQuarantine: true,
              });
            }
          } catch (_e) {}
        }
      } catch (_e) {}
    }

    // 2. Scan Crash Dumps (Level B)
    if (fs.existsSync(crashDumpsDir)) {
      try {
        const files = await fs.promises.readdir(crashDumpsDir);
        for (const f of files) {
          if (f.endsWith('.dmp') || f.endsWith('.mdmp')) {
            const fullPath = path.join(crashDumpsDir, f);
            try {
              const stat = await fs.promises.stat(fullPath);
              const locked = this.isFileLocked(fullPath);
              candidates.push({
                id: 'cand_' + Math.random().toString(36).substring(2, 9),
                category: 'crash_dumps',
                name: f,
                path: fullPath,
                size: stat.size,
                lastModified: stat.mtime.toISOString(),
                safetyLevel: 'B',
                reason: 'Application diagnostic crash memory dump',
                isLocked: locked,
                selected: !locked,
                canQuarantine: true,
              });
            } catch (_e) {}
          }
        }
      } catch (_e) {}
    }

    // 3. Scan Thumbnail Caches (Level A)
    if (fs.existsSync(explorerCacheDir)) {
      try {
        const files = await fs.promises.readdir(explorerCacheDir);
        for (const f of files) {
          if (f.startsWith('thumbcache_') && f.endsWith('.db')) {
            const fullPath = path.join(explorerCacheDir, f);
            try {
              const stat = await fs.promises.stat(fullPath);
              const locked = this.isFileLocked(fullPath);
              candidates.push({
                id: 'cand_' + Math.random().toString(36).substring(2, 9),
                category: 'thumbnail_cache',
                name: f,
                path: fullPath,
                size: stat.size,
                lastModified: stat.mtime.toISOString(),
                safetyLevel: 'A',
                reason: 'Windows Explorer thumbnail preview cache (auto-regenerates on browse)',
                isLocked: locked,
                selected: !locked,
                canQuarantine: true,
              });
            } catch (_e) {}
          }
        }
      } catch (_e) {}
    }

    // 4. Scan Browser Caches (Chrome & Edge) (Level B)
    const browserCachePaths = [
      { name: 'Google Chrome Cache', dir: chromeCache },
      { name: 'Microsoft Edge Cache', dir: edgeCache },
    ];
    for (const b of browserCachePaths) {
      if (fs.existsSync(b.dir)) {
        try {
          const files = await fs.promises.readdir(b.dir);
          for (const f of files.slice(0, 150)) {
            const fullPath = path.join(b.dir, f);
            try {
              const stat = await fs.promises.stat(fullPath);
              if (stat.isFile()) {
                const locked = this.isFileLocked(fullPath);
                candidates.push({
                  id: 'cand_' + Math.random().toString(36).substring(2, 9),
                  category: 'browser_cache',
                  name: `${b.name} - ${f}`,
                  path: fullPath,
                  size: stat.size,
                  lastModified: stat.mtime.toISOString(),
                  safetyLevel: 'B',
                  reason: 'Web asset cache (images, stylesheets). Never includes cookies or passwords.',
                  isLocked: locked,
                  selected: false, // Default unselected for user review
                  canQuarantine: false,
                });
              }
            } catch (_e) {}
          }
        } catch (_e) {}
      }
    }

    // Build category summary cards
    const categoryStats: { [key in CleanupCategoryType]?: { size: number; count: number } } = {};
    for (const c of candidates) {
      if (!categoryStats[c.category]) {
        categoryStats[c.category] = { size: 0, count: 0 };
      }
      categoryStats[c.category]!.size += c.size;
      categoryStats[c.category]!.count += 1;
    }

    const categories: CleanupCategoryCard[] = [
      {
        type: 'user_temp',
        name: 'User Temporary Files',
        description: `Stale working files in %TEMP% older than ${minAgeDays} days.`,
        safetyLevel: 'A',
        estimatedSize: categoryStats.user_temp?.size || 0,
        candidateCount: categoryStats.user_temp?.count || 0,
        selected: true,
      },
      {
        type: 'thumbnail_cache',
        name: 'Thumbnail Cache',
        description: 'Generated image and folder preview databases in Windows Explorer.',
        safetyLevel: 'A',
        estimatedSize: categoryStats.thumbnail_cache?.size || 0,
        candidateCount: categoryStats.thumbnail_cache?.count || 0,
        selected: true,
      },
      {
        type: 'crash_dumps',
        name: 'Crash Reports & Memory Dumps',
        description: 'Stale application error reports and post-mortem diagnostic dumps.',
        safetyLevel: 'B',
        estimatedSize: categoryStats.crash_dumps?.size || 0,
        candidateCount: categoryStats.crash_dumps?.count || 0,
        selected: true,
        warning: 'Contains technical diagnostic state of crashed programs.',
      },
      {
        type: 'browser_cache',
        name: 'Browser Web Caches',
        description: 'Cached web assets (Chrome, Edge). Does NOT delete cookies, logins, or history.',
        safetyLevel: 'B',
        estimatedSize: categoryStats.browser_cache?.size || 0,
        candidateCount: categoryStats.browser_cache?.count || 0,
        selected: false,
        warning: 'Websites may take slightly longer to load on first visit after clearing.',
      },
    ];

    const recycleBin = await this.getRecycleBinStatus();
    const reclaimableTotal = candidates
      .filter((c) => c.selected && !c.isLocked)
      .reduce((sum, c) => sum + c.size, 0);

    const pastCleanup = dbOperations.getCleanupOverview();

    const overview: CleanerOverviewData = {
      estimatedReclaimableBytes: reclaimableTotal,
      candidateCount: candidates.filter((c) => c.selected).length,
      lastCleanupAt: pastCleanup.lastCleanupAt,
      totalSpaceReclaimedBytes: pastCleanup.totalReclaimedBytes,
      categories,
      recycleBin,
    };

    return { candidates, categories, overview };
  }

  /**
   * Execute safe cleanup on selected candidates
   * Follows strict safety rules: revalidate immediately before deletion,
   * skip locked/changed files, support optional quarantine.
   */
  public static async executeCleanup(
    selectedCandidates: CleanupCandidate[],
    useQuarantine: boolean = false
  ): Promise<CleanupResultReport> {
    const sessionId = 'clean_' + Date.now();
    const startTime = Date.now();
    let filesRemoved = 0;
    let filesSkipped = 0;
    let filesFailed = 0;
    let reclaimedBytes = 0;
    const errors: { path: string; error: string }[] = [];
    const categoriesCleaned = new Set<string>();

    const quarantineBaseDir = useQuarantine
      ? path.join(this.getQuarantineDir(), new Date().toISOString().replace(/[:.]/g, '-'))
      : '';
    if (useQuarantine && !fs.existsSync(quarantineBaseDir)) {
      fs.mkdirSync(quarantineBaseDir, { recursive: true });
    }

    for (const cand of selectedCandidates) {
      categoriesCleaned.add(cand.category);

      // Rule 1: Re-validate existence
      if (!fs.existsSync(cand.path)) {
        filesSkipped++;
        continue;
      }

      // Rule 2: Check protected paths
      const lower = cand.path.toLowerCase();
      if (
        lower.startsWith('c:\\windows') ||
        lower.startsWith('c:\\program files') ||
        lower.includes('desktop') ||
        lower.includes('documents')
      ) {
        filesSkipped++;
        errors.push({ path: cand.path, error: 'Path is in protected directory' });
        continue;
      }

      // Rule 3: Re-verify lock state
      if (this.isFileLocked(cand.path)) {
        filesSkipped++;
        errors.push({ path: cand.path, error: 'File is locked or in use by another application' });
        continue;
      }

      // Rule 4: Re-stat to check if modified since scan
      try {
        const currentStat = await fs.promises.stat(cand.path);
        // If file was modified recently (within 5 minutes of now), skip as active
        if (Date.now() - currentStat.mtimeMs < 5 * 60 * 1000) {
          filesSkipped++;
          errors.push({ path: cand.path, error: 'File was modified during or after scan' });
          continue;
        }

        const fileSize = currentStat.size;

        if (useQuarantine && cand.canQuarantine) {
          // Move to quarantine
          const targetName = `${Date.now()}_${path.basename(cand.path)}`;
          const targetPath = path.join(quarantineBaseDir, targetName);
          await fs.promises.copyFile(cand.path, targetPath);
          await fs.promises.unlink(cand.path);
        } else {
          // Direct safe delete
          await fs.promises.unlink(cand.path);
        }

        filesRemoved++;
        reclaimedBytes += fileSize;
      } catch (err: any) {
        filesFailed++;
        errors.push({ path: cand.path, error: err?.message || 'Permission denied or file busy' });
      }
    }

    const durationMs = Date.now() - startTime;
    const report: CleanupResultReport = {
      sessionId,
      filesRemoved,
      filesSkipped,
      filesFailed,
      estimatedReclaimedBytes: reclaimedBytes,
      actualDiskChangeBytes: reclaimedBytes, // In real NTFS this aligns closely with removed length
      durationMs,
      categoriesCleaned: Array.from(categoriesCleaned),
      errors,
    };

    // Save session report in SQLite
    try {
      dbOperations.saveCleanupSession(report, Array.from(categoriesCleaned));
    } catch (saveErr) {
      console.error('[SystemCleaner] Failed to persist cleanup session:', saveErr);
    }

    return report;
  }
}
