'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  HardDrive,
  FileText,
  CheckCircle2,
  Check,
  Folder,
  Copy,
  Lock,
  Archive,
  Info,
  X,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  CleanupCandidate,
  CleanupCategoryCard,
  CleanerOverviewData,
  CleanupResultReport,
  RecycleBinStatus,
  CleanupCategoryType,
} from '@/lib/types';
import { formatBytes } from '@/lib/utils';

export default function CacheTempCleanerPage() {
  const [overview, setOverview] = useState<CleanerOverviewData | null>(null);
  const [candidates, setCandidates] = useState<CleanupCandidate[]>([]);
  const [categories, setCategories] = useState<CleanupCategoryCard[]>([]);
  const [minAgeDays, setMinAgeDays] = useState<number>(7);
  const [useQuarantine, setUseQuarantine] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [cleanupReport, setCleanupReport] = useState<CleanupResultReport | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [showRecycleBinModal, setShowRecycleBinModal] = useState<boolean>(false);
  const [recycleBinStatus, setRecycleBinStatus] = useState<RecycleBinStatus | null>(null);

  useEffect(() => {
    loadOverview();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      if (catParam) {
        setActiveCategoryFilter(catParam);
      }
      const viewParam = params.get('view');
      if (viewParam === 'recycle-bin') {
        setShowRecycleBinModal(true);
      }
    }
  }, []);

  const loadOverview = async () => {
    setIsScanning(true);
    try {
      const data = await apiClient.scanCleaner({ minAgeDays });
      setOverview(data.overview);
      setCandidates(data.candidates);
      setCategories(data.categories);
      setRecycleBinStatus(data.overview.recycleBin);
    } catch (err) {
      console.error('Failed to load cleaner data:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const data = await apiClient.scanCleaner({ minAgeDays });
      setOverview(data.overview);
      setCandidates(data.candidates);
      setCategories(data.categories);
      setRecycleBinStatus(data.overview.recycleBin);
    } catch (err: any) {
      alert(`Cleanup scan failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectCandidate = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleCategorySelection = (catType: CleanupCategoryType) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.type === catType) {
          const nextState = !cat.selected;
          // Synchronize candidates of this category
          setCandidates((cands) =>
            cands.map((c) => (c.category === catType ? { ...c, selected: nextState && !c.isLocked } : c))
          );
          return { ...cat, selected: nextState };
        }
        return cat;
      })
    );
  };

  const handleSelectAll = (select: boolean) => {
    setCandidates((prev) =>
      prev.map((c) => ({ ...c, selected: select ? !c.isLocked : false }))
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleCleanExecution = async () => {
    setShowConfirmModal(false);
    setIsCleaning(true);

    const selected = candidates.filter((c) => c.selected && !c.isLocked);
    try {
      const report = await apiClient.executeCleanup(selected, useQuarantine);
      setCleanupReport(report);
      // Reload candidates after cleanup
      await loadOverview();
    } catch (err: any) {
      alert(`Cleanup execution error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleEmptyRecycleBin = async () => {
    setShowRecycleBinModal(false);
    try {
      const res = await apiClient.emptyRecycleBin();
      alert(res.message);
      const rb = await apiClient.getRecycleBinStatus();
      setRecycleBinStatus(rb);
    } catch (err: any) {
      alert(`Failed to empty Recycle Bin: ${err.message}`);
    }
  };

  // Re-calculate live selected space
  const selectedCandidates = candidates.filter((c) => c.selected && !c.isLocked);
  const selectedBytes = selectedCandidates.reduce((sum, c) => sum + c.size, 0);

  // Filter candidates for table
  const filteredCandidates = candidates.filter((c) => {
    if (activeCategoryFilter !== 'all' && c.category !== activeCategoryFilter) return false;
    if (
      searchQuery &&
      !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.path.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
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
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Cache & Temp Cleaner</h1>
              <p className="text-sm text-muted-foreground">
                Identify, review, and safely remove unnecessary temporary files and application caches
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleScan}
            disabled={isScanning || isCleaning}
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm flex items-center gap-2 border border-border transition-smooth"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Rescan System</span>
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={selectedCandidates.length === 0 || isCleaning}
            className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-smooth disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clean Selected ({formatBytes(selectedBytes)})</span>
          </button>
        </div>
      </div>

      {/* Safety Policy Legend */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Safety Classification:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-500">Level A</span>
            <span className="text-muted-foreground">Generally Safe (Stale temp files &gt;7d, thumbnail caches)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-500">Level B</span>
            <span className="text-muted-foreground">Review Recommended (Crash dumps, browser web assets)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-500">Level C</span>
            <span className="text-muted-foreground">Strictly Protected (Personal files, logins, system root)</span>
          </div>
        </div>

        {/* Quarantine switch */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useQuarantine}
            onChange={(e) => setUseQuarantine(e.target.checked)}
            className="rounded border-border text-brand-600 focus:ring-brand-500"
          />
          <span className="text-foreground font-medium flex items-center gap-1">
            <Archive className="w-3.5 h-3.5 text-muted-foreground" /> Quarantine before deletion (Reversible)
          </span>
        </label>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground font-medium">Reclaimable Space</span>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {formatBytes(selectedBytes)}
          </p>
          <span className="text-[11px] text-muted-foreground">
            From {selectedCandidates.length} selected eligible items
          </span>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground font-medium">Eligible Candidates</span>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {candidates.length} files
          </p>
          <span className="text-[11px] text-muted-foreground">
            Total space: {formatBytes(candidates.reduce((s, c) => s + c.size, 0))}
          </span>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <span className="text-xs text-muted-foreground font-medium">Total Space Cleaned</span>
          <p className="text-2xl font-bold tabular-nums text-emerald-500 mt-1">
            {formatBytes(overview?.totalSpaceReclaimedBytes || 0)}
          </p>
          <span className="text-[11px] text-muted-foreground">Reclaimed to date</span>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Recycle Bin</span>
            <button
              onClick={() => setShowRecycleBinModal(true)}
              className="text-xs text-brand-500 hover:underline font-medium"
            >
              Empty Bin
            </button>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {formatBytes(recycleBinStatus?.totalSize || 0)}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {recycleBinStatus?.itemCount || 0} items pending recovery
          </span>
        </div>
      </div>

      {/* Cleanup Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Cleanup Target Categories
          </h2>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Minimum File Age Policy:</span>
            <select
              value={minAgeDays}
              onChange={(e) => {
                setMinAgeDays(Number(e.target.value));
                handleScan();
              }}
              className="bg-card border border-border rounded px-2.5 py-1 text-xs text-foreground focus:outline-none"
            >
              <option value={3}>Older than 3 days</option>
              <option value={7}>Older than 7 days (Recommended)</option>
              <option value={14}>Older than 14 days</option>
              <option value={30}>Older than 30 days</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.type}
              onClick={() => toggleCategorySelection(cat.type)}
              className={`p-5 rounded-xl border bg-card transition-smooth cursor-pointer space-y-3 ${
                cat.selected ? 'border-brand-500/50 shadow-sm ring-1 ring-brand-500/20' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cat.selected}
                    onChange={() => {}}
                    className="rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                  <h3 className="font-semibold text-foreground text-sm">{cat.name}</h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    cat.safetyLevel === 'A'
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-amber-500/15 text-amber-500'
                  }`}
                >
                  Level {cat.safetyLevel}
                </span>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>

              {cat.warning && (
                <div className="text-[11px] p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  {cat.warning}
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-2 border-t border-border font-mono">
                <span className="font-semibold text-foreground">{formatBytes(cat.estimatedSize)}</span>
                <span className="text-muted-foreground">{cat.candidateCount} files</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Candidates Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate files by name or path..."
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSelectAll(true)}
              className="text-xs text-brand-500 hover:underline font-medium"
            >
              Select All Eligible
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              onClick={() => handleSelectAll(false)}
              className="text-xs text-muted-foreground hover:underline font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={candidates.length > 0 && selectedCandidates.length === candidates.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Safety & Eligibility Reason</th>
                <th className="py-3 px-4">Last Modified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-medium text-foreground">No cleanup candidates found.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your temporary and cache folders are clean according to active policies.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => (
                  <tr
                    key={cand.id}
                    className={`hover:bg-secondary/30 transition-smooth ${
                      cand.selected ? 'bg-secondary/15' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={cand.selected}
                        disabled={cand.isLocked}
                        onChange={() => toggleSelectCandidate(cand.id)}
                        className="rounded border-border text-brand-600 focus:ring-brand-500 disabled:opacity-30"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground max-w-[240px] truncate" title={cand.name}>
                      <div className="flex items-center gap-2">
                        {cand.isLocked && (
                          <span title="File is locked or in active use">
                            <Lock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          </span>
                        )}
                        <span className="truncate">{cand.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-medium">
                        {cand.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-foreground">
                      {formatBytes(cand.size)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            cand.safetyLevel === 'A'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          Lvl {cand.safetyLevel}
                        </span>
                        <span className="text-muted-foreground truncate max-w-[320px]" title={cand.reason}>
                          {cand.reason}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground tabular-nums">
                      {new Date(cand.lastModified).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => copyToClipboard(cand.path)}
                        title="Copy file path"
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        {copiedPath === cand.path ? (
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

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Confirm System Cleanup</h3>
                <p className="text-sm text-muted-foreground">
                  You are about to remove <strong>{selectedCandidates.length}</strong> items to reclaim approximately{' '}
                  <strong className="text-foreground">{formatBytes(selectedBytes)}</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items selected:</span>
                <span className="font-semibold text-foreground">{selectedCandidates.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated reclaimable space:</span>
                <span className="font-semibold text-foreground">{formatBytes(selectedBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quarantine backup:</span>
                <span className="font-semibold text-emerald-500">
                  {useQuarantine ? 'Enabled (Reversible)' : 'Disabled (Direct delete)'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={handleCleanExecution}
                className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium shadow-sm transition-smooth"
              >
                Yes, Clean Selected Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECYCLE BIN CONFIRMATION MODAL */}
      {showRecycleBinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Empty Recycle Bin?</h3>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete all {recycleBinStatus?.itemCount || 0} items in your Recycle Bin (
                  {formatBytes(recycleBinStatus?.totalSize || 0)}). This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRecycleBinModal(false)}
                className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyRecycleBin}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium shadow-sm transition-smooth"
              >
                Permanently Empty Bin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-CLEANUP REPORT MODAL */}
      {cleanupReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Cleanup Completed</h3>
                  <p className="text-xs text-muted-foreground">Session: {cleanupReport.sessionId}</p>
                </div>
              </div>
              <button
                onClick={() => setCleanupReport(null)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-xs text-muted-foreground">Removed</span>
                <p className="text-xl font-bold text-emerald-500 mt-1">{cleanupReport.filesRemoved}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-xs text-muted-foreground">Skipped</span>
                <p className="text-xl font-bold text-muted-foreground mt-1">{cleanupReport.filesSkipped}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="text-xs text-muted-foreground">Failed</span>
                <p className="text-xl font-bold text-rose-500 mt-1">{cleanupReport.filesFailed}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Reclaimed Disk Space</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatBytes(cleanupReport.estimatedReclaimedBytes)}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCleanupReport(null)}
                className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
