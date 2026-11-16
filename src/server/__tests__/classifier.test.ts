import { describe, it, expect } from 'vitest';
import { FileClassifier } from '../classifier';
import { RuleEngine } from '../rule-engine';
import { OrganizationRule } from '../../lib/types';

describe('FileClassifier', () => {
  it('correctly classifies torrent files by extension', () => {
    const result = FileClassifier.classify('C:\\Users\\User\\Downloads\\ubuntu-24.04-desktop-amd64.iso.torrent');
    expect(result.category).toBe('Torrents');
    expect(result.detectedExtension).toBe('torrent');
  });

  it('correctly classifies documents and code', () => {
    expect(FileClassifier.classify('report.pdf').category).toBe('Documents');
    expect(FileClassifier.classify('table.xlsx').category).toBe('Spreadsheets');
    expect(FileClassifier.classify('archive.zip').category).toBe('Archives');
  });

  it('correctly classifies Codebases and project packages', () => {
    expect(FileClassifier.classify('react-lib.whl').category).toBe('Codebases');
    expect(FileClassifier.classify('serde.crate').category).toBe('Codebases');
    expect(FileClassifier.classify('backup.gitbundle').category).toBe('Codebases');
    expect(FileClassifier.classify('plugin.vsix').category).toBe('Codebases');
    // Workspace repository root containing package.json / .git / Cargo.toml
    expect(FileClassifier.classify(process.cwd()).category).toBe('Codebases');
  });

  it('correctly classifies Source Code & Scripts (Codes)', () => {
    expect(FileClassifier.classify('main.rs').category).toBe('Codes');
    expect(FileClassifier.classify('index.tsx').category).toBe('Codes');
    expect(FileClassifier.classify('agent.py').category).toBe('Codes');
    expect(FileClassifier.classify('Dockerfile').category).toBe('Codes');
    expect(FileClassifier.classify('Makefile').category).toBe('Codes');
    expect(FileClassifier.classify('schema.sql').category).toBe('Codes');
  });

  it('correctly classifies AI & Machine Learning models', () => {
    expect(FileClassifier.classify('flux1-dev.safetensors').category).toBe('AI Models');
    expect(FileClassifier.classify('qwen2.5-7b.gguf').category).toBe('AI Models');
    expect(FileClassifier.classify('resnet50.onnx').category).toBe('AI Models');
  });

  it('correctly classifies Disk Images and Security files', () => {
    expect(FileClassifier.classify('archlinux-2026.iso').category).toBe('Disk Images');
    expect(FileClassifier.classify('windows11.vmdk').category).toBe('Disk Images');
    expect(FileClassifier.classify('id_rsa').category).toBe('Security');
    expect(FileClassifier.classify('certificate.pem').category).toBe('Security');
  });
});

describe('RuleEngine with Custom Destination and Torrents', () => {
  const torrentRule: OrganizationRule = {
    id: 'rule_default_torrents',
    name: 'Organize Torrent Files',
    priority: 1,
    enabled: true,
    description: 'Group torrents',
    conditions: [
      {
        id: 'c1',
        field: 'category',
        operator: 'equals',
        value: 'Torrents',
        logicalOp: 'AND',
      },
    ],
    actionType: 'move',
    destinationPattern: 'Torrents/',
    collisionPolicy: 'keep_both',
    dryRunOnly: false,
    executionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('routes torrent file to Torrents folder within source directory', () => {
    const evaluation = RuleEngine.evaluate(
      'C:\\Users\\User\\Downloads\\sample.torrent',
      [torrentRule]
    );

    expect(evaluation.category).toBe('Torrents');
    expect(evaluation.matchedRule?.id).toBe('rule_default_torrents');
    expect(evaluation.proposedDestination).toContain('Torrents\\sample.torrent');
  });

  it('routes to custom targetDirectory when specified', () => {
    const evaluation = RuleEngine.evaluate(
      'C:\\Users\\User\\Downloads\\sample.torrent',
      [torrentRule],
      '{Category}/',
      'D:\\MyCustomLibrary'
    );

    expect(evaluation.proposedDestination).toBe('D:\\MyCustomLibrary\\Torrents\\sample.torrent');
  });

  it('allows rule-specific targetDirectory override', () => {
    const customRule: OrganizationRule = {
      ...torrentRule,
      targetDirectory: 'E:\\TorrentStore',
    };

    const evaluation = RuleEngine.evaluate(
      'C:\\Users\\User\\Downloads\\sample.torrent',
      [customRule]
    );

    expect(evaluation.proposedDestination).toBe('E:\\TorrentStore\\Torrents\\sample.torrent');
  });
});

describe('Directory Scanning and Codebase Categorization', () => {
  it('identifies directories containing package.json or pyproject.toml as Codebases', () => {
    // Current working directory has package.json and Cargo.toml
    const result = FileClassifier.classifyDirectory(process.cwd());
    expect(result).not.toBeNull();
    expect(result?.category).toBe('Codebases');
    expect(result?.confidence).toBe('high');
  });

  it('correctly classifies modern images (avif, heic, webp)', () => {
    expect(FileClassifier.classify('photo.avif').category).toBe('Images');
    expect(FileClassifier.classify('graphic.webp').category).toBe('Images');
    expect(FileClassifier.classify('wallpaper.png').category).toBe('Images');
  });

  it('correctly classifies languages in Codes category', () => {
    expect(FileClassifier.classify('contract.sol').category).toBe('Codes');
    expect(FileClassifier.classify('app.dart').category).toBe('Codes');
    expect(FileClassifier.classify('server.zig').category).toBe('Codes');
  });

  it('classifies directories by keyword and content', () => {
    // Testing directory classification
    expect(FileClassifier.classifyDirectory('C:\\FakePath\\Vacation Photos')?.category).toBe('Images');
    expect(FileClassifier.classifyDirectory('C:\\FakePath\\Company Documents')?.category).toBe('Documents');
    expect(FileClassifier.classifyDirectory('C:\\FakePath\\NexusFile-main')?.category).toBe('Codebases');
    expect(FileClassifier.classifyDirectory('C:\\FakePath\\Misc_Random_Folder')?.category).toBe('Unknown');
  });

  it('evaluates Unknown files with organize_to_unknown action move', () => {
    const evalResult = RuleEngine.evaluate(
      'C:\\FakePath\\unknown_format.xyz',
      [],
      '{Category}/',
      undefined,
      'organize_to_unknown'
    );
    expect(evalResult.category).toBe('Unknown');
    expect(evalResult.action).toBe('move');
    expect(evalResult.proposedDestination).toContain('Unknown');
  });
});
