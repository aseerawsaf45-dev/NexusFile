import fs from 'node:fs';
import path from 'node:path';
import { FileCategory } from '../lib/types';
import { DEFAULT_CATEGORIES } from '../lib/constants';

interface ClassificationResult {
  category: FileCategory;
  confidence: 'high' | 'medium' | 'low';
  detectedExtension: string;
  matchedBy: 'magic_bytes' | 'extension' | 'keyword' | 'default';
  projectGuess?: string;
}

// Magic bytes signatures for reliable content verification
const MAGIC_SIGNATURES: { category: FileCategory; signature: number[]; mask?: number[] }[] = [
  // PDF: %PDF
  { category: 'Documents', signature: [0x25, 0x50, 0x44, 0x46] },
  // PNG: \x89PNG\r\n\x1a\n
  { category: 'Images', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // JPEG: \xff\xd8\xff
  { category: 'Images', signature: [0xff, 0xd8, 0xff] },
  // GIF: GIF87a or GIF89a
  { category: 'Images', signature: [0x47, 0x49, 0x46, 0x38] },
  // WEBP: RIFF....WEBP
  { category: 'Images', signature: [0x52, 0x49, 0x46, 0x46] },
  // ZIP (and Office docx/xlsx/pptx, jar): PK\x03\x04
  { category: 'Archives', signature: [0x50, 0x4b, 0x03, 0x04] },
  // RAR: Rar!\x1a\x07
  { category: 'Archives', signature: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
  // 7Z: 7z\xbc\xaf\x27\x1c
  { category: 'Archives', signature: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  // Windows PE Executable (EXE/MSI): MZ
  { category: 'Installers', signature: [0x4d, 0x5a] },
  // MP3: ID3 or \xff\xfb
  { category: 'Audio', signature: [0x49, 0x44, 0x33] },
  // FLAC: fLaC
  { category: 'Audio', signature: [0x66, 0x4c, 0x61, 0x43] },
  // BitTorrent: bencoded dict 'd' (d8:announce, d4:info, d13:announce-list, d10:created)
  { category: 'Torrents', signature: [0x64, 0x38, 0x3a, 0x61, 0x6e, 0x6e, 0x6f, 0x75, 0x6e, 0x63, 0x65] },
  { category: 'Torrents', signature: [0x64, 0x34, 0x3a, 0x69, 0x6e, 0x66, 0x6f] },
  { category: 'Torrents', signature: [0x64, 0x31, 0x33, 0x3a, 0x61, 0x6e, 0x6e, 0x6f, 0x75, 0x6e, 0x63, 0x65] },
  { category: 'Torrents', signature: [0x64, 0x31, 0x30, 0x3a, 0x63, 0x72, 0x65, 0x61, 0x74, 0x65, 0x64] },
];

export class FileClassifier {
  /**
   * Classify a file using extension, magic bytes, and name patterns.
   */
  public static classify(filePath: string): ClassificationResult {
    const filename = path.basename(filePath);
    const ext = this.extractExtension(filename);

    // 1. Check Magic Bytes (safe reading of first 32 bytes)
    const magicMatch = this.checkMagicBytes(filePath, ext);
    if (magicMatch) {
      return {
        category: magicMatch,
        confidence: 'high',
        detectedExtension: ext,
        matchedBy: 'magic_bytes',
        projectGuess: this.extractProjectKeyword(filename),
      };
    }

    // 2. Extension matching against default categories
    if (ext) {
      for (const cat of DEFAULT_CATEGORIES) {
        if (cat.extensions.includes(ext)) {
          return {
            category: cat.id,
            confidence: 'high',
            detectedExtension: ext,
            matchedBy: 'extension',
            projectGuess: this.extractProjectKeyword(filename),
          };
        }
      }
    }

    // 3. Filename heuristics
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('invoice') || lowerName.includes('receipt') || lowerName.includes('statement') || lowerName.includes('resume')) {
      return {
        category: 'Documents',
        confidence: 'medium',
        detectedExtension: ext,
        matchedBy: 'keyword',
        projectGuess: this.extractProjectKeyword(filename),
      };
    }

    if (lowerName.includes('screenshot') || lowerName.includes('photo') || lowerName.includes('img_')) {
      return {
        category: 'Images',
        confidence: 'medium',
        detectedExtension: ext,
        matchedBy: 'keyword',
        projectGuess: this.extractProjectKeyword(filename),
      };
    }

    return {
      category: 'Unknown',
      confidence: 'low',
      detectedExtension: ext,
      matchedBy: 'default',
      projectGuess: this.extractProjectKeyword(filename),
    };
  }

  private static extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) return '';
    return filename.substring(lastDot + 1).toLowerCase().trim();
  }

  private static checkMagicBytes(filePath: string, ext: string): FileCategory | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size === 0) return null;

      // Check magic bytes (read first 64 bytes)
      const buffer = Buffer.alloc(64);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, 64, 0);
      fs.closeSync(fd);
      const slice = buffer.subarray(0, bytesRead);

      // BitTorrent: starts with bencoded dict 'd' (0x64) and contains 'announce', 'info', 'pieces', or 'comment'
      if (slice.length >= 8 && slice[0] === 0x64) {
        const text = slice.toString('latin1');
        if (text.includes('announce') || text.includes('info') || text.includes('piece') || text.includes('comment') || ext === 'torrent') {
          return 'Torrents';
        }
      }

      // Office files (docx, xlsx, pptx) are PK archives under the hood. Respect explicit extension when it's Office format:
      if (['docx', 'odt'].includes(ext)) return 'Documents';
      if (['xlsx', 'ods'].includes(ext)) return 'Spreadsheets';
      if (['pptx', 'odp'].includes(ext)) return 'Presentations';

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
      // Graceful fallback if file locked or unreadable
      return null;
    }
    return null;
  }

  /**
   * Extract potential project keyword (e.g. "FabricX_model.xlsx" -> "FabricX")
   */
  public static extractProjectKeyword(filename: string): string | undefined {
    // Look for patterns like Project_Name, [Project], PRJ-1234
    const prefixMatch = filename.match(/^([a-zA-Z0-9]+)[_\-\s]/);
    if (prefixMatch && prefixMatch[1].length >= 3) {
      const candidate = prefixMatch[1];
      // Filter common noisy words
      const noisy = ['the', 'new', 'copy', 'final', 'draft', 'screenshot', 'img', 'file'];
      if (!noisy.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return undefined;
  }
}
