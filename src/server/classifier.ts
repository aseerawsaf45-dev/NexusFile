import fs from 'node:fs';
import path from 'node:path';
import { FileCategory } from '../lib/types';
import { DEFAULT_CATEGORIES } from '../lib/constants';

interface ClassificationResult {
  category: FileCategory;
  confidence: 'high' | 'medium' | 'low';
  detectedExtension: string;
  matchedBy: 'magic_bytes' | 'extension' | 'keyword' | 'codebase_marker' | 'default';
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
  // GGUF (AI & Machine Learning quantized model): GGUF
  { category: 'AI Models', signature: [0x47, 0x47, 0x55, 0x46] },
  // WASM (WebAssembly): \0asm
  { category: 'Codes', signature: [0x00, 0x61, 0x73, 0x6d] },
  // SQLite format 3: SQLite format 3\0
  {
    category: 'Data',
    signature: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00],
  },
  // Linux ELF executable: \x7fELF
  { category: 'Installers', signature: [0x7f, 0x45, 0x4c, 0x46] },
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

// Well-known codebase root markers to detect software repositories & projects
const CODEBASE_MARKERS = [
  '.git',
  '.github',
  '.gitlab-ci.yml',
  '.svn',
  '.hg',
  '.gitignore',
  '.gitattributes',
  '.gitmodules',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'bun.lockb',
  'bunfig.toml',
  'Cargo.toml',
  'Cargo.lock',
  'pyproject.toml',
  'requirements.txt',
  'setup.py',
  'setup.cfg',
  'Pipfile',
  'Pipfile.lock',
  'poetry.lock',
  'tox.ini',
  'flake8',
  '.flake8',
  'manage.py',
  'environment.yml',
  'go.mod',
  'go.sum',
  'go.work',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'settings.gradle',
  'settings.gradle.kts',
  'gradlew',
  'gradlew.bat',
  'build.sbt',
  'CMakeLists.txt',
  'Makefile',
  'makefile',
  'meson.build',
  'configure.ac',
  'platformio.ini',
  'composer.json',
  'composer.lock',
  'Gemfile',
  'Gemfile.lock',
  'Rakefile',
  'mix.exs',
  'tsconfig.json',
  'jsconfig.json',
  'deno.json',
  'deno.jsonc',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'nuxt.config.ts',
  'nuxt.config.js',
  'svelte.config.js',
  'astro.config.mjs',
  'angular.json',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'postcss.config.mjs',
  'webpack.config.js',
  'rollup.config.js',
  'pubspec.yaml',
  'pubspec.lock',
  'Package.swift',
  'Podfile',
  'Podfile.lock',
  '.sln',
  '.csproj',
  '.fsproj',
  '.vbproj',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Containerfile',
  'Procfile',
  'Jenkinsfile',
  '.vscode',
  '.idea',
  'node_modules',
  'venv',
  '.venv',
  '__pycache__',
];

export class FileClassifier {
  /**
   * Check and classify any directory (Codebases, Images, Documents, Videos, etc.).
   */
  public static classifyDirectory(dirPath: string): ClassificationResult | null {
    try {
      const exists = fs.existsSync(dirPath);
      if (exists) {
        const stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) return null;
      }

      const baseName = path.basename(dirPath);
      const lowerBaseName = baseName.toLowerCase();

      // 1. Check for codebase marker files/folders inside the directory (if dir exists on disk)
      if (exists) {
        for (const marker of CODEBASE_MARKERS) {
          const markerPath = path.join(dirPath, marker);
          if (fs.existsSync(markerPath)) {
            return {
              category: 'Codebases',
              confidence: 'high',
              detectedExtension: 'project',
              matchedBy: 'codebase_marker',
              projectGuess: baseName,
            };
          }
        }

        // 2. Check for common source folder layout (src, lib, app, components, pages, routes, scripts, packages, etc.)
        const subdirs = ['src', 'lib', 'app', 'components', 'pages', 'routes', 'scripts', 'packages', 'bin', 'include'];
        for (const sub of subdirs) {
          if (fs.existsSync(path.join(dirPath, sub))) {
            return {
              category: 'Codebases',
              confidence: 'high',
              detectedExtension: 'project',
              matchedBy: 'codebase_marker',
              projectGuess: baseName,
            };
          }
        }
      }

      // 3. Check for repository naming patterns (e.g. repo-main, project-master, app-dev, name-v1)
      const isRepoName =
        /(?:-|_)(?:main|master|dev|develop|release|staging|repo|project|v\d+)$/i.test(lowerBaseName) ||
        /^(?:code|dev|repo|project|app)-/i.test(lowerBaseName);

      // 4. Inspect directory contents (shallow scan up to 60 items)
      if (exists) {
        let entries: string[] = [];
        try {
          entries = fs.readdirSync(dirPath);
        } catch {}

        if (entries.length > 0) {
          const codeExtensions = new Set([
            'py', 'pyw', 'js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'jsx', 'tsx',
            'rs', 'go', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'java',
            'kt', 'kts', 'swift', 'rb', 'php', 'lua', 'pl', 'pm', 'sh', 'bash',
            'ps1', 'bat', 'cmd', 'html', 'htm', 'css', 'scss', 'sass', 'vue',
            'svelte', 'json', 'yaml', 'yml', 'toml', 'sql', 'wasm', 'dockerfile',
            'makefile', 'cmake', 'dart', 'zig', 'proto'
          ]);

          const exactCodeFiles = new Set([
            'dockerfile', 'makefile', 'gemfile', 'jenkinsfile', 'procfile',
            'cmakelists.txt', '.gitignore', '.gitattributes', '.env', 'license',
            'readme.md', 'readme.txt', 'readme', 'index.html', 'main.py', 'app.py',
            'server.js', 'index.js', 'index.ts', 'server.ts'
          ]);

          let codeFileCount = 0;
          const categoryCounts: Record<string, number> = {};

          for (const entry of entries.slice(0, 60)) {
            const lowerEntry = entry.toLowerCase();
            const dot = lowerEntry.lastIndexOf('.');
            const ext = dot !== -1 ? lowerEntry.substring(dot + 1) : '';

            if (codeExtensions.has(ext) || exactCodeFiles.has(lowerEntry)) {
              codeFileCount++;
            }

            if (ext) {
              for (const cat of DEFAULT_CATEGORIES) {
                if (cat.extensions.includes(ext)) {
                  categoryCounts[cat.id] = (categoryCounts[cat.id] || 0) + 1;
                  break;
                }
              }
            }
          }

          // If it has code files, or matches repo naming with code files
          if (codeFileCount >= 2 || (codeFileCount >= 1 && (isRepoName || entries.length <= 5))) {
            return {
              category: 'Codebases',
              confidence: 'high',
              detectedExtension: 'project',
              matchedBy: 'codebase_marker',
              projectGuess: baseName,
            };
          }

          if (isRepoName && codeFileCount >= 1) {
            return {
              category: 'Codebases',
              confidence: 'medium',
              detectedExtension: 'project',
              matchedBy: 'codebase_marker',
              projectGuess: baseName,
            };
          }

          // Find dominant file category in directory contents
          let dominantCat: string | null = null;
          let maxCount = 0;
          for (const [cat, count] of Object.entries(categoryCounts)) {
            if (count > maxCount) {
              maxCount = count;
              dominantCat = cat;
            }
          }

          // If >= 30% of files belong to one category, categorize the folder accordingly
          if (dominantCat && maxCount >= 2 && maxCount / entries.length >= 0.3) {
            return {
              category: dominantCat as FileCategory,
              confidence: 'medium',
              detectedExtension: 'folder',
              matchedBy: 'extension',
              projectGuess: baseName,
            };
          }
        }
      }

      // 5. Keyword in directory name
      const nameKeywords: Array<{ category: FileCategory; keywords: string[] }> = [
        { category: 'Images', keywords: ['photo', 'image', 'picture', 'wallpaper', 'screenshot', 'icon', 'graphic', 'camera', 'dcim', 'album'] },
        { category: 'Documents', keywords: ['doc', 'document', 'invoice', 'receipt', 'pdf', 'paper', 'report', 'contract', 'statement', 'tax', 'resume', 'cv'] },
        { category: 'Videos', keywords: ['video', 'movie', 'film', 'series', 'recording', 'clip', 'show', 'footage'] },
        { category: 'Audio', keywords: ['audio', 'music', 'song', 'sound', 'track', 'podcast', 'voice'] },
        { category: 'Spreadsheets', keywords: ['sheet', 'spreadsheet', 'excel', 'csv', 'finance', 'accounting', 'budget'] },
        { category: 'Presentations', keywords: ['presentation', 'slide', 'pitch', 'deck', 'powerpoint'] },
        { category: 'Design', keywords: ['design', '3d', 'render', 'cad', 'model', 'mesh', 'texture', 'figma', 'psd'] },
        { category: 'Archives', keywords: ['archive', 'backup', 'unzipped', 'extracted'] },
        { category: 'Installers', keywords: ['installer', 'setup', 'portable', 'program', 'software'] },
        { category: 'Data', keywords: ['dataset', 'database', 'sqlite'] },
        { category: 'Ebooks', keywords: ['ebook', 'novel', 'manga', 'comic'] },
        { category: 'Fonts', keywords: ['font', 'typeface', 'typography'] },
        { category: 'Codebases', keywords: ['codebase', 'repository', 'github', 'gitlab', 'git', 'source'] },
      ];

      for (const { category, keywords } of nameKeywords) {
        if (keywords.some((kw) => lowerBaseName.includes(kw))) {
          return {
            category,
            confidence: 'medium',
            detectedExtension: category === 'Codebases' ? 'project' : 'folder',
            matchedBy: 'keyword',
            projectGuess: baseName,
          };
        }
      }

      // 6. If repository pattern matched
      if (isRepoName) {
        return {
          category: 'Codebases',
          confidence: 'low',
          detectedExtension: 'project',
          matchedBy: 'codebase_marker',
          projectGuess: baseName,
        };
      }

      // Fallback for any other directory: Unknown category folder
      return {
        category: 'Unknown',
        confidence: 'low',
        detectedExtension: 'folder',
        matchedBy: 'default',
        projectGuess: baseName,
      };
    } catch {
      // Fallback
    }

    return {
      category: 'Unknown',
      confidence: 'low',
      detectedExtension: 'folder',
      matchedBy: 'default',
      projectGuess: path.basename(dirPath),
    };
  }

  /**
   * Classify a file or directory using extension, magic bytes, codebase markers, and name patterns.
   */
  public static classify(filePath: string): ClassificationResult {
    const filename = path.basename(filePath);
    const lowerName = filename.toLowerCase();

    // 0. Check if path is a directory
    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          const dirResult = this.classifyDirectory(filePath);
          if (dirResult) return dirResult;
          return {
            category: 'Unknown',
            confidence: 'low',
            detectedExtension: 'folder',
            matchedBy: 'default',
            projectGuess: filename,
          };
        }
      }
    } catch {}

    const ext = this.extractExtension(filename);

    // 1. Direct codebase bundle extensions (npm packages, wheels, crates, git bundles)
    const codebaseBundleExts = ['gitbundle', 'whl', 'crate', 'gem', 'nupkg', 'vsix'];
    if (codebaseBundleExts.includes(ext)) {
      return {
        category: 'Codebases',
        confidence: 'high',
        detectedExtension: ext,
        matchedBy: 'extension',
        projectGuess: this.extractProjectKeyword(filename),
      };
    }

    // 2. Extensionless and exact developer source / config files
    const exactCodeFiles = [
      'dockerfile',
      'makefile',
      'gemfile',
      'jenkinsfile',
      'vagrantfile',
      'procfile',
      'cmakelists.txt',
      '.gitignore',
      '.gitattributes',
      '.editorconfig',
      '.env',
      'cargo.lock',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
    ];
    if (exactCodeFiles.includes(lowerName)) {
      return {
        category: 'Codes',
        confidence: 'high',
        detectedExtension: ext || 'code',
        matchedBy: 'keyword',
        projectGuess: this.extractProjectKeyword(filename),
      };
    }

    // 3. Security keys / SSH / certs filenames
    if (
      lowerName === 'id_rsa' ||
      lowerName === 'id_ed25519' ||
      lowerName === 'authorized_keys' ||
      lowerName === 'known_hosts' ||
      lowerName.endsWith('.pem') ||
      lowerName.endsWith('.key') ||
      lowerName.endsWith('.crt')
    ) {
      return {
        category: 'Security',
        confidence: 'high',
        detectedExtension: ext || 'key',
        matchedBy: 'keyword',
        projectGuess: this.extractProjectKeyword(filename),
      };
    }

    // 4. Check Magic Bytes (safe reading of first 64 bytes)
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

    // 5. Extension matching against default categories
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

    // 6. Filename heuristics
    if (
      lowerName.includes('safetensors') ||
      lowerName.includes('checkpoint') ||
      lowerName.includes('weights') ||
      lowerName.includes('gguf') ||
      lowerName.includes('pytorch_model')
    ) {
      return {
        category: 'AI Models',
        confidence: 'high',
        detectedExtension: ext,
        matchedBy: 'keyword',
        projectGuess: this.extractProjectKeyword(filename),
      };
    }

    if (
      lowerName.includes('invoice') ||
      lowerName.includes('receipt') ||
      lowerName.includes('statement') ||
      lowerName.includes('resume')
    ) {
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
        if (
          text.includes('announce') ||
          text.includes('info') ||
          text.includes('piece') ||
          text.includes('comment') ||
          ext === 'torrent'
        ) {
          return 'Torrents';
        }
      }

      // Cryptographic PEM files: text beginning with '-----BEGIN '
      if (slice.length >= 11) {
        const textStart = slice.toString('utf8');
        if (textStart.startsWith('-----BEGIN ')) {
          return 'Security';
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
