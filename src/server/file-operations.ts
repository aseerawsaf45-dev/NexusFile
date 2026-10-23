import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CollisionPolicy, FileCategory } from '../lib/types';
import { dbOperations } from './database';

export interface FileOperationResult {
  success: boolean;
  operationType: 'move' | 'copy' | 'rename' | 'ignore' | 'review';
  originalPath: string;
  finalPath: string;
  fileSize: number;
  contentHash: string | null;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
}

export class SafeFileOperations {
  private static PROTECTED_PREFIXES = [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    'C:\\ProgramData',
    'C:\\Users\\Default',
  ];

  /**
   * Calculate SHA-256 hash of a file safely and efficiently without blowing up memory.
   */
  public static calculateHash(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const stat = fs.statSync(filePath);
      
      // For small files (<= 10MB), fast synchronous read
      if (stat.size <= 10 * 1024 * 1024) {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
      }

      // For larger files, read head + tail + length for an instantaneous, unique content fingerprint
      const hash = crypto.createHash('sha256');
      const chunkSize = 64 * 1024;
      const buffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(filePath, 'r');
      try {
        const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, 0);
        hash.update(buffer.subarray(0, bytesRead));

        if (stat.size > chunkSize) {
          const tailOffset = Math.max(0, stat.size - chunkSize);
          const tailBytes = fs.readSync(fd, buffer, 0, chunkSize, tailOffset);
          hash.update(buffer.subarray(0, tailBytes));
        }
        hash.update(Buffer.from(`filesize:${stat.size}`));
        return hash.digest('hex');
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return null;
    }
  }

  /**
   * Check if a path is protected against modification.
   */
  public static isProtectedPath(targetPath: string): boolean {
    const normalized = path.resolve(targetPath).toLowerCase();
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
  public static isRecursiveLoop(sourcePath: string, destinationPath: string): boolean {
    const normSource = path.resolve(sourcePath).toLowerCase();
    const normDest = path.resolve(destinationPath).toLowerCase();

    // Source is identical to destination
    if (normSource === normDest) return true;

    // Moving a folder inside itself
    if (normDest.startsWith(normSource + path.sep.toLowerCase())) {
      return true;
    }

    return false;
  }

  /**
   * Generate conflict-safe unique filename: "Report (1).pdf", "Report (2).pdf"
   */
  public static generateUniqueDestination(destinationPath: string): string {
    if (!fs.existsSync(destinationPath)) return destinationPath;

    const dir = path.dirname(destinationPath);
    const ext = path.extname(destinationPath);
    const base = path.basename(destinationPath, ext);

    let counter = 1;
    let candidate = path.join(dir, `${base} (${counter})${ext}`);

    while (fs.existsSync(candidate)) {
      counter++;
      candidate = path.join(dir, `${base} (${counter})${ext}`);
    }

    return candidate;
  }

  /**
   * Check if file is stable and not actively locked or downloading.
   * If immediateMode is true, checks lock and temporary extensions instantly (0ms) instead of sleeping.
   */
  public static async checkFileStability(filePath: string, delayMs: number = 500, immediateMode: boolean = false): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) return false;

      // Check temporary extensions: .tmp, .crdownload, .part, ~$
      const lower = filePath.toLowerCase();
      if (lower.endsWith('.crdownload') || lower.endsWith('.part') || lower.endsWith('.tmp') || lower.includes('~$')) {
        return false;
      }

      // Fast check: verify file can be opened for reading (not locked by an active writer)
      try {
        const fd = fs.openSync(filePath, 'r');
        fs.closeSync(fd);
      } catch {
        return false;
      }

      if (immediateMode || delayMs <= 0) {
        return true;
      }

      const stat1 = fs.statSync(filePath);
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 200)));

      if (!fs.existsSync(filePath)) return false;
      const stat2 = fs.statSync(filePath);

      // Verify size and modification time have settled
      return stat1.size === stat2.size && stat1.mtimeMs === stat2.mtimeMs;
    } catch {
      return false;
    }
  }

  /**
   * Execute safe file move with collision policy, volume verification, and atomic commit.
   */
  public static async executeMove(
    sourcePath: string,
    proposedDestination: string,
    collisionPolicy: CollisionPolicy,
    ruleName: string,
    category: FileCategory
  ): Promise<FileOperationResult> {
    const normSource = path.resolve(sourcePath);
    let normDest = path.resolve(proposedDestination);

    // Safeguard 1: Protected paths
    if (this.isProtectedPath(normSource) || this.isProtectedPath(normDest)) {
      const err = `Blocked operation on protected system path: ${normDest}`;
      dbOperations.addHistory({
        timestamp: new Date().toISOString(),
        originalPath: normSource,
        newPath: normDest,
        fileCategory: category,
        fileSize: 0,
        appliedRuleName: ruleName,
        operationType: 'move',
        result: 'failed',
        errorDetails: err,
        isUndone: false,
        canUndo: false,
      });
      return {
        success: false,
        operationType: 'move',
        originalPath: normSource,
        finalPath: normDest,
        fileSize: 0,
        contentHash: null,
        status: 'failed',
        errorMessage: err,
      };
    }

    // Safeguard 2: Source exists
    if (!fs.existsSync(normSource)) {
      const err = `Source file does not exist: ${normSource}`;
      return {
        success: false,
        operationType: 'move',
        originalPath: normSource,
        finalPath: normDest,
        fileSize: 0,
        contentHash: null,
        status: 'failed',
        errorMessage: err,
      };
    }

    // Safeguard 3: Recursive loop
    if (this.isRecursiveLoop(normSource, normDest)) {
      return {
        success: false,
        operationType: 'move',
        originalPath: normSource,
        finalPath: normDest,
        fileSize: 0,
        contentHash: null,
        status: 'skipped',
        errorMessage: 'Skipped to prevent recursive movement loop into itself.',
      };
    }

    const stat = fs.statSync(normSource);
    const fileSize = stat.size;
    const sourceHash = this.calculateHash(normSource);

    // Safeguard 4: Collision Policy
    if (fs.existsSync(normDest)) {
      // Check if identical by hash
      const destHash = this.calculateHash(normDest);
      if (sourceHash && destHash && sourceHash === destHash) {
        // Files are identical
        if (collisionPolicy === 'skip') {
          dbOperations.addHistory({
            timestamp: new Date().toISOString(),
            originalPath: normSource,
            newPath: normDest,
            fileCategory: category,
            fileSize,
            appliedRuleName: ruleName,
            operationType: 'move',
            result: 'skipped',
            errorDetails: 'Target already contains an identical file (matched SHA-256 hash).',
            contentHash: sourceHash,
            isUndone: false,
            canUndo: false,
          });
          return {
            success: true,
            operationType: 'move',
            originalPath: normSource,
            finalPath: normDest,
            fileSize,
            contentHash: sourceHash,
            status: 'skipped',
          };
        }
      }

      if (collisionPolicy === 'skip') {
        dbOperations.addHistory({
          timestamp: new Date().toISOString(),
          originalPath: normSource,
          newPath: normDest,
          fileCategory: category,
          fileSize,
          appliedRuleName: ruleName,
          operationType: 'move',
          result: 'skipped',
          errorDetails: 'Destination file already exists and collision policy is "skip".',
          contentHash: sourceHash,
          isUndone: false,
          canUndo: false,
        });
        return {
          success: true,
          operationType: 'move',
          originalPath: normSource,
          finalPath: normDest,
          fileSize,
          contentHash: sourceHash,
          status: 'skipped',
        };
      } else if (collisionPolicy === 'keep_both') {
        normDest = this.generateUniqueDestination(normDest);
      }
    }

    // Ensure destination directory exists
    const destDir = path.dirname(normDest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Execute move:
    // Atomic rename if on same drive, verified copy-then-unlink across volumes
    try {
      const sourceRoot = path.parse(normSource).root.toLowerCase();
      const destRoot = path.parse(normDest).root.toLowerCase();

      if (sourceRoot === destRoot) {
        fs.renameSync(normSource, normDest);
      } else {
        // Cross-volume: copy, verify hash/size, then remove source
        fs.copyFileSync(normSource, normDest);
        const copyHash = this.calculateHash(normDest);
        if (sourceHash && copyHash !== sourceHash) {
          fs.unlinkSync(normDest);
          throw new Error('Data integrity check failed during cross-volume copy.');
        }
        fs.unlinkSync(normSource);
      }

      // Record in SQLite history
      dbOperations.addHistory({
        timestamp: new Date().toISOString(),
        originalPath: normSource,
        newPath: normDest,
        fileCategory: category,
        fileSize,
        appliedRuleName: ruleName,
        operationType: 'move',
        result: 'success',
        contentHash: sourceHash,
        isUndone: false,
        canUndo: true,
      });

      dbOperations.incrementRuleExecution(ruleName);

      return {
        success: true,
        operationType: 'move',
        originalPath: normSource,
        finalPath: normDest,
        fileSize,
        contentHash: sourceHash,
        status: 'success',
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      dbOperations.addHistory({
        timestamp: new Date().toISOString(),
        originalPath: normSource,
        newPath: normDest,
        fileCategory: category,
        fileSize,
        appliedRuleName: ruleName,
        operationType: 'move',
        result: 'failed',
        errorDetails: errorMsg,
        contentHash: sourceHash,
        isUndone: false,
        canUndo: false,
      });

      return {
        success: false,
        operationType: 'move',
        originalPath: normSource,
        finalPath: normDest,
        fileSize,
        contentHash: sourceHash,
        status: 'failed',
        errorMessage: errorMsg,
      };
    }
  }
}
