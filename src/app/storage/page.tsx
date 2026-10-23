'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  FolderTree,
  FileText,
  Search,
  RefreshCw,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  PieChart as PieIcon,
  Layers,
  ArrowUpDown,
  Filter,
  Sparkles,
  ArrowLeft,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  DriveInfo,
  SizeTreeNode,
  LargestFileEntry,
  StorageCategorySummary,
  TreeMapItem,
  StorageScanResult,
  FileCategory,
} from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import Link from 'next/link';

export default function StorageAnalyzerPage() {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [isLoadingDrives, setIsLoadingDrives] = useState(true);
  const [targetPath, setTargetPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<StorageScanResult | null>(null);
  const [activeTab, setActiveTab] = useState<'tree' | 'treemap' | 'largest' | 'categories'>('tree');
  const [searchFilter, setSearchFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState<'all' | '100mb' | '1gb'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<{ [path: string]: boolean }>({});
  const [scanProgress, setScanProgress] = useState<{
    percent: number;
    phase: string;
    elapsedSeconds: number;
    estimatedFiles: number;
  }>({
    percent: 0,
    phase: '',
    elapsedSeconds: 0,
    estimatedFiles: 0,
  });

  useEffect(() => {
    loadDrivesAndLatestScan();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['tree', 'treemap', 'largest', 'categories'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const loadDrivesAndLatestScan = async () => {
    setIsLoadingDrives(true);
    try {
      const realDrives = await apiClient.getDrives();
      setDrives(realDrives);
      if (realDrives.length > 0 && !targetPath) {
        setTargetPath(realDrives[0].driveLetter + '\\');
      }

      // Check if a previous scan exists in SQLite
      const latest = await apiClient.getLatestStorageScan();
      if (latest && latest.session && latest.data) {
        setScanResult({
          session: latest.session,
          rootNode: latest.data.rootNode,
          largestFiles: latest.data.largestFiles,
          categoryDistribution: latest.data.categoryDistribution,
          treemapData: latest.data.treemapData,
        });
        if (latest.data.rootNode) {
          setExpandedNodes({ [latest.data.rootNode.path]: true });
        }
      }
    } catch (err) {
      console.error('Failed to load drives or scans:', err);
    } finally {
      setIsLoadingDrives(false);
    }
  };

  const handleScan = async (pathOverride?: string) => {
    const pathToScan = pathOverride || targetPath;
    if (!pathToScan) return;

    setIsScanning(true);
    setScanProgress({
      percent: 4,
      phase: `Locating root storage records for ${pathToScan}...`,
      elapsedSeconds: 0,
      estimatedFiles: 0,
    });

    const startTime = Date.now();
    let currentPct = 4;

    const progressTimer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      // Fluid asymptotic curve approaching 95%
      currentPct = Math.min(95, currentPct + (95 - currentPct) * 0.08 + Math.random() * 1.5);

      let phase = 'Traversing directory trees & subfolders...';
      if (currentPct > 75) {
        phase = 'Aggregating category clusters & largest files...';
      } else if (currentPct > 45) {
        phase = 'Cataloging hierarchical weights & directory sizes...';
      } else if (currentPct > 20) {
        phase = 'Indexing NTFS directory entries & file metadata...';
      }

      setScanProgress({
        percent: Math.round(currentPct),
        phase,
        elapsedSeconds: Number(elapsed.toFixed(1)),
        estimatedFiles: Math.floor(elapsed * 450 + currentPct * 35),
      });
    }, 150);

    try {
      const result = await apiClient.scanStorage(pathToScan);
      clearInterval(progressTimer);
      const totalElapsed = Number(((Date.now() - startTime) / 1000).toFixed(1));

      setScanProgress({
        percent: 100,
        phase: 'Analysis complete! Rendering size tree & visualization...',
        elapsedSeconds: totalElapsed,
        estimatedFiles: result.session.totalFiles,
      });

      // Smooth brief pause at 100% so user sees completion before rendering
      setTimeout(() => {
        setScanResult(result);
        if (result.rootNode) {
          setExpandedNodes({ [result.rootNode.path]: true });
        }
        setIsScanning(false);
      }, 400);
    } catch (err: any) {
      clearInterval(progressTimer);
      setIsScanning(false);
      alert(`Storage scan failed: ${err.message || 'Unknown error'}`);
    }
  };

  const toggleExpand = (nodePath: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodePath]: !prev[nodePath],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Filter largest files
  const filteredLargestFiles = (scanResult?.largestFiles || []).filter((f) => {
    if (searchFilter && !f.name.toLowerCase().includes(searchFilter.toLowerCase()) && !f.path.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }
    if (sizeFilter === '100mb' && f.size < 100 * 1024 * 1024) return false;
    if (sizeFilter === '1gb' && f.size < 1024 * 1024 * 1024) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Storage Analyzer</h1>
              <p className="text-sm text-muted-foreground">
                Understand disk consumption with hierarchical size trees, treemaps, and largest files discovery
              </p>
            </div>
          </div>
        </div>

        {/* Read-Only Guarantee Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Read-Only Analysis Mode (No changes made to disk)</span>
        </div>
      </div>

      {/* Drive Overview Cards */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4" /> Available Drives & Storage Capacity
        </h2>

        {isLoadingDrives ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse p-5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drives.map((d) => (
              <div
                key={d.driveLetter}
                className={`p-5 rounded-xl border bg-card transition-smooth cursor-pointer ${
                  targetPath === d.driveLetter + '\\' || targetPath.startsWith(d.driveLetter)
                    ? 'border-brand-500/50 shadow-sm ring-1 ring-brand-500/20'
                    : 'border-border hover:border-brand-500/30'
                }`}
                onClick={() => setTargetPath(d.driveLetter + '\\')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-foreground font-semibold">
                      {d.driveLetter}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        {d.volumeName || 'Local Disk'} ({d.driveLetter})
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                          {d.fileSystem}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                          {d.driveType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetPath(d.driveLetter + '\\');
                      handleScan(d.driveLetter + '\\');
                    }}
                    disabled={isScanning}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-secondary hover:bg-brand-500 hover:text-white transition-smooth"
                  >
                    Scan
                  </button>
                </div>

                {/* Storage Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs tabular-nums font-medium">
                    <span className="text-muted-foreground">
                      Used: <strong className="text-foreground">{formatBytes(d.usedBytes)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Free: <strong className="text-foreground">{formatBytes(d.freeBytes)}</strong>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        d.percentUsed > 85 ? 'bg-rose-500' : d.percentUsed > 70 ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${d.percentUsed}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{d.percentUsed}% Capacity Used</span>
                    <span>Total: {formatBytes(d.totalBytes)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target Path Selector & Scan Bar */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex-1 w-full flex items-center gap-3">
          <Folder className="w-5 h-5 text-brand-500 flex-shrink-0" />
          <input
            type="text"
            value={targetPath}
            onChange={(e) => setTargetPath(e.target.value)}
            placeholder="Enter directory or drive path to analyze (e.g. C:\Users\Username)..."
            className="w-full bg-secondary/50 border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => handleScan()}
            disabled={isScanning || !targetPath}
            className="w-full md:w-auto px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-smooth disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Analyzing Filesystem...' : 'Start Storage Scan'}</span>
          </button>
        </div>
      </div>

      {/* Live Scanning Progress HUD */}
      {isScanning && (
        <div className="p-6 rounded-xl border border-brand-500/30 bg-card shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Analyzing Disk Storage</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {targetPath}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{scanProgress.phase}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs tabular-nums text-muted-foreground">
              <div>
                Elapsed: <strong className="text-foreground">{scanProgress.elapsedSeconds}s</strong>
              </div>
              <div>
                Files: <strong className="text-foreground">{scanProgress.estimatedFiles.toLocaleString()}+</strong>
              </div>
              <div className="text-sm font-bold text-brand-400 font-mono">
                {scanProgress.percent}%
              </div>
            </div>
          </div>

          {/* Fluid Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-secondary overflow-hidden relative border border-border/50">
              <div
                className="h-full bg-gradient-to-r from-brand-600 via-cyan-500 to-brand-400 transition-all duration-200 ease-out relative"
                style={{ width: `${scanProgress.percent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Deep filesystem traversal in progress</span>
              <span>{scanProgress.percent < 100 ? 'Gathering metadata...' : 'Finalizing...'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Scan Results View */}
      {scanResult ? (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium">Scanned Scope Size</span>
              <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
                {formatBytes(scanResult.session.totalLogicalSize)}
              </p>
              <span className="text-[11px] text-muted-foreground">Logical file sum</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium">Total Files</span>
              <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
                {scanResult.session.totalFiles.toLocaleString()}
              </p>
              <span className="text-[11px] text-muted-foreground">Individual files crawled</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium">Directories</span>
              <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
                {scanResult.session.totalDirectories.toLocaleString()}
              </p>
              <span className="text-[11px] text-muted-foreground">Folder structures parsed</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium">Scan Duration</span>
              <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
                {(scanResult.session.durationMs / 1000).toFixed(2)}s
              </p>
              <span className="text-[11px] text-muted-foreground">
                {scanResult.session.inaccessibleCount > 0 ? (
                  <span className="text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {scanResult.session.inaccessibleCount} inaccessible
                  </span>
                ) : (
                  'Completed without errors'
                )}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-2">
            <button
              onClick={() => setActiveTab('tree')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-smooth ${
                activeTab === 'tree'
                  ? 'border-brand-500 text-brand-500 font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Hierarchical Size Tree</span>
            </button>
            <button
              onClick={() => setActiveTab('treemap')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-smooth ${
                activeTab === 'treemap'
                  ? 'border-brand-500 text-brand-500 font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>TreeMap Visualization</span>
            </button>
            <button
              onClick={() => setActiveTab('largest')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-smooth ${
                activeTab === 'largest'
                  ? 'border-brand-500 text-brand-500 font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Largest Files Explorer ({scanResult.largestFiles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-smooth ${
                activeTab === 'categories'
                  ? 'border-brand-500 text-brand-500 font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <PieIcon className="w-4 h-4" />
              <span>Category Breakdown</span>
            </button>
          </div>

          {/* TAB 1: SIZE TREE */}
          {activeTab === 'tree' && (
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground pb-2 border-b border-border">
                <span>Folder / File Structure</span>
                <div className="flex items-center gap-8 pr-4">
                  <span className="w-24 text-right">Size</span>
                  <span className="w-20 text-right">% of Total</span>
                  <span className="w-20 text-right">Items</span>
                </div>
              </div>

              <div className="space-y-1 overflow-x-auto">
                <TreeNodeRow
                  node={scanResult.rootNode}
                  expandedNodes={expandedNodes}
                  onToggleExpand={toggleExpand}
                  onCopy={copyToClipboard}
                  totalSize={scanResult.session.totalLogicalSize}
                />
              </div>
            </div>
          )}

          {/* TAB 2: TREEMAP VISUALIZATION */}
          {activeTab === 'treemap' && (
            <div className="p-6 rounded-xl border border-border bg-card space-y-6">
              <div>
                <h3 className="font-semibold text-foreground">Interactive TreeMap</h3>
                <p className="text-sm text-muted-foreground">
                  Rectangles are sized proportionally to disk space. Click on any block to inspect details.
                </p>
              </div>

              {scanResult.treemapData.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No child directories found in scope.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scanResult.treemapData.map((item, idx) => {
                    const pct =
                      scanResult.session.totalLogicalSize > 0
                        ? ((item.size / scanResult.session.totalLogicalSize) * 100).toFixed(1)
                        : '0';
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-border hover:border-brand-500/50 bg-secondary/40 transition-smooth space-y-2"
                        style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-foreground truncate max-w-[200px]" title={item.name}>
                            {item.name}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-card font-mono">{pct}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate" title={item.path}>
                          {item.path}
                        </p>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                          <span className="font-semibold text-foreground">{formatBytes(item.size)}</span>
                          <span className="text-[11px] text-muted-foreground">{item.category}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LARGEST FILES EXPLORER */}
          {activeTab === 'largest' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search largest files by name or path..."
                    className="w-full bg-transparent text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Min Size:</span>
                  <button
                    onClick={() => setSizeFilter('all')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium ${
                      sizeFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSizeFilter('100mb')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium ${
                      sizeFilter === '100mb' ? 'bg-brand-600 text-white' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    &gt; 100 MB
                  </button>
                  <button
                    onClick={() => setSizeFilter('100mb')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium ${
                      sizeFilter === '1gb' ? 'bg-brand-600 text-white' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    &gt; 1 GB
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Filename</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Modified</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLargestFiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No files matching the specified criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredLargestFiles.map((file, idx) => (
                        <tr key={idx} className="hover:bg-secondary/30 transition-smooth">
                          <td className="py-3 px-4 font-medium text-foreground max-w-[260px] truncate" title={file.name}>
                            {file.name}
                          </td>
                          <td className="py-3 px-4 tabular-nums font-semibold text-foreground">
                            {formatBytes(file.size)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-medium text-foreground">
                              {file.category}
                            </span>
                          </td>
                          <td
                            className="py-3 px-4 text-xs font-mono text-muted-foreground max-w-[280px] truncate"
                            title={file.path}
                          >
                            {file.parentFolder}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground tabular-nums">
                            {new Date(file.lastModified).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => copyToClipboard(file.path)}
                              title="Copy file path"
                              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                            >
                              {copiedPath === file.path ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CATEGORY BREAKDOWN */}
          {activeTab === 'categories' && (
            <div className="p-6 rounded-xl border border-border bg-card space-y-6">
              <div>
                <h3 className="font-semibold text-foreground">Category Storage Breakdown</h3>
                <p className="text-sm text-muted-foreground">
                  How your disk space is distributed across standard file types.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scanResult.categoryDistribution.map((cat) => (
                  <div key={cat.category} className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-foreground">{cat.category}</span>
                      </div>
                      <span className="text-xs font-mono font-medium">{cat.percentage}%</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{cat.fileCount} files</span>
                        <strong className="text-foreground">{formatBytes(cat.size)}</strong>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty state when no scan conducted yet */
        <div className="p-16 rounded-xl border border-dashed border-border text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-400 mx-auto flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Ready for Real-Time Storage Analysis</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Select one of your local drives above or enter a folder path to calculate exact storage hierarchies,
              largest files, and directory breakdowns.
            </p>
          </div>
          <button
            onClick={() => handleScan()}
            disabled={isScanning || !targetPath}
            className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm inline-flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Analyze {targetPath || 'Selected Drive'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Recursive Tree Node Row Component
 */
function TreeNodeRow({
  node,
  expandedNodes,
  onToggleExpand,
  onCopy,
  totalSize,
  depth = 0,
}: {
  node: SizeTreeNode;
  expandedNodes: { [path: string]: boolean };
  onToggleExpand: (path: string) => void;
  onCopy: (path: string) => void;
  totalSize: number;
  depth?: number;
}) {
  const isExpanded = Boolean(expandedNodes[node.path]);
  const pct = totalSize > 0 ? ((node.logicalSize / totalSize) * 100).toFixed(1) : '0';

  return (
    <div className="text-sm font-mono">
      <div
        className={`flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/40 transition-smooth group cursor-pointer ${
          isExpanded ? 'bg-secondary/20 font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => node.isDirectory && onToggleExpand(node.path)}
      >
        <div className="flex items-center gap-2 truncate flex-1 pr-4">
          {node.isDirectory ? (
            <span className="text-muted-foreground">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          ) : (
            <span className="w-4 h-4 inline-block" />
          )}

          {node.isDirectory ? (
            <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
          ) : (
            <File className="w-4 h-4 text-sky-500 flex-shrink-0" />
          )}

          <span className="truncate text-foreground" title={node.path}>
            {node.name}
          </span>
        </div>

        <div className="flex items-center gap-8 pr-2 flex-shrink-0">
          <span className="w-24 text-right tabular-nums text-foreground font-semibold">
            {formatBytes(node.logicalSize)}
          </span>
          <span className="w-20 text-right tabular-nums text-muted-foreground">{pct}%</span>
          <span className="w-20 text-right tabular-nums text-muted-foreground">
            {node.isDirectory ? `${node.fileCount} files` : '1 file'}
          </span>
        </div>
      </div>

      {isExpanded && node.children && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onCopy={onCopy}
              totalSize={totalSize}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
