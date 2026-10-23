import fs from 'node:fs';
import path from 'node:path';
import { dbOperations } from './database';
import { SafeFileOperations } from './file-operations';

export interface UndoResult {
  success: boolean;
  message: string;
}

export class UndoManager {
  /**
   * Reverse an operation safely.
   */
  public static undo(historyId: string): UndoResult {
    const item = dbOperations.getHistoryItem(historyId);
    if (!item) {
      return { success: false, message: 'History record not found.' };
    }

    if (item.isUndone) {
      return { success: false, message: 'This operation has already been undone.' };
    }

    if (!item.canUndo || item.result !== 'success') {
      return { success: false, message: 'This operation cannot be reversed.' };
    }

    const currentPath = path.resolve(item.newPath);
    const originalTarget = path.resolve(item.originalPath);

    // Verify current file exists
    if (!fs.existsSync(currentPath)) {
      return {
        success: false,
        message: `Cannot undo: File has been moved or deleted from "${currentPath}".`,
      };
    }

    // Verify content hash if available to ensure file hasn't been edited
    if (item.contentHash) {
      const currentHash = SafeFileOperations.calculateHash(currentPath);
      if (currentHash && currentHash !== item.contentHash) {
        return {
          success: false,
          message: 'Cannot undo: File content has been modified since it was organized.',
        };
      }
    }

    // Verify original location does not have a conflicting new file
    if (fs.existsSync(originalTarget)) {
      return {
        success: false,
        message: `Cannot undo: Original location "${originalTarget}" is already occupied by another file.`,
      };
    }

    // Ensure original directory exists
    const origDir = path.dirname(originalTarget);
    if (!fs.existsSync(origDir)) {
      fs.mkdirSync(origDir, { recursive: true });
    }

    try {
      // Revert move
      const sourceRoot = path.parse(currentPath).root.toLowerCase();
      const destRoot = path.parse(originalTarget).root.toLowerCase();

      if (sourceRoot === destRoot) {
        fs.renameSync(currentPath, originalTarget);
      } else {
        fs.copyFileSync(currentPath, originalTarget);
        fs.unlinkSync(currentPath);
      }

      // Mark history record as undone
      dbOperations.markHistoryUndone(historyId);

      // Record undo action in history
      dbOperations.addHistory({
        timestamp: new Date().toISOString(),
        originalPath: currentPath,
        newPath: originalTarget,
        fileCategory: item.fileCategory,
        fileSize: item.fileSize,
        appliedRuleName: `Undo: ${item.appliedRuleName}`,
        operationType: 'move',
        result: 'success',
        contentHash: item.contentHash,
        isUndone: false,
        canUndo: false,
      });

      return {
        success: true,
        message: `Successfully restored "${path.basename(originalTarget)}" to original location.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Undo failed: ${err?.message || String(err)}`,
      };
    }
  }
}
