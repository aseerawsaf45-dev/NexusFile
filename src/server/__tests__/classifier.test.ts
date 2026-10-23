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
