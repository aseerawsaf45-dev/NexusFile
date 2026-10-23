'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Clock,
  FolderSync,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  FolderTree,
  RotateCcw,
  Sparkles,
  HardDrive,
  FileText,
  Zap,
  FolderOpen,
  Folder,
  ArrowRight,
  Check,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api-client';
import { formatBytes, formatRelativeTime } from '@/lib/utils';
import { FileOperationHistory } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  Documents: '#3b82f6',
  Torrents: '#059669',
  Spreadsheets: '#10b981',
  Presentations: '#f59e0b',
  Images: '#ec4899',
  Videos: '#8b5cf6',
  Audio: '#06b6d4',
  Archives: '#eab308',
  Installers: '#ef4444',
  Codebases: '#f97316',
  Codes: '#06b6d4',
  Development: '#0284c7',
  'AI Models': '#a855f7',
  Design: '#f43f5e',
  'Disk Images': '#e11d48',
  Security: '#10b981',
  Fonts: '#6366f1',
  Data: '#14b8a6',
  Ebooks: '#d97706',
  Shortcuts: '#64748b',
  Unknown: '#94a3b8',
};

export default function OverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentHistory, setRecentHistory] = useState<FileOperationHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick 1-Click Organize State
  const [quickPaths, setQuickPaths] = useState<{ name: string; path: string }[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [destMode, setDestMode] = useState<'inplace' | 'custom'>('inplace');
  const [customDestPath, setCustomDestPath] = useState<string>('');
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeNotice, setOrganizeNotice] = useState<{
    success: boolean;
    count: number;
    durationMs: number;
    message: string;
    lastUndoId?: string;
  } | null>(null);

  const loadData = async () => {
    try {
      const overview = await apiClient.getOverviewStats();
      setStats(overview);

      const hist = await apiClient.getHistory(6, 0);
      setRecentHistory(hist.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Load system quick paths (Downloads, Desktop, Documents, etc.)
    apiClient.getQuickPaths().then((paths) => {
      setQuickPaths(paths);
      if (paths.length > 0 && !selectedSource) {
        // Default to Downloads folder
        const downloads = paths.find((p) => p.name.toLowerCase() === 'downloads') || paths[0];
        setSelectedSource(downloads.path);
      }
    }).catch(() => {});

    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePickSource = async () => {
    const picked = await apiClient.pickFolder('Select Source Folder to Organize');
    if (picked) setSelectedSource(picked);
  };

  const handlePickDest = async () => {
    const picked = await apiClient.pickFolder('Select Custom Destination Folder');
    if (picked) {
      setCustomDestPath(picked);
      setDestMode('custom');
    }
  };

  const handleRunQuickOrganize = async () => {
    if (!selectedSource) return;
    setIsOrganizing(true);
    setOrganizeNotice(null);
    try {
      const targetDir = destMode === 'custom' && customDestPath ? customDestPath : undefined;
      const res = await apiClient.organizeFolderNow(selectedSource, targetDir);
      
      const hist = await apiClient.getHistory(5, 0);
      const latestUndo = hist.items.find((item) => item.canUndo && !item.isUndone);

      setOrganizeNotice({
        success: true,
        count: res.organizedCount,
        durationMs: res.durationMs,
        message: res.organizedCount > 0
          ? `Successfully organized ${res.organizedCount} file${res.organizedCount > 1 ? 's' : ''} in ${res.durationMs}ms!`
          : `Folder is already fully organized. No unorganized files found.`,
        lastUndoId: latestUndo ? latestUndo.id : undefined,
      });

      await loadData();
    } catch (err: any) {
      setOrganizeNotice({
        success: false,
        count: 0,
        durationMs: 0,
        message: err?.message || 'Organization failed. Check file permissions.',
      });
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleUndo = async (id: string) => {
    try {
      await apiClient.undoOperation(id);
      loadData();
      if (organizeNotice?.lastUndoId === id) {
        setOrganizeNotice((prev) => prev ? { ...prev, message: 'Operation successfully undone! Files restored.' } : null);
      }
    } catch (err: any) {
      alert(err?.message || 'Undo failed');
    }
  };

  return (
    <AppShell
      title="System Overview"
      subtitle="Intelligent file organization, automated routing, and storage diagnostics"
      onRefresh={loadData}
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* HERO 1-CLICK QUICK ORGANIZE HUB */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-br from-card via-card/90 to-brand-950/20 p-6 md:p-8 shadow-xl backdrop-blur-sm">
          {/* Subtle glowing ambient backdrop */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                    <Zap className="w-3.5 h-3.5 text-brand-400" />
                    Ultra-Fast Automation
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">Instant Concurrent Engine</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  1-Click Instant Folder Organizer
                </h2>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Pick any folder on your PC. NexusFile automatically sorts Torrents, Documents, Media, Archives, and Installers into designated locations in milliseconds.
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunQuickOrganize}
                disabled={isOrganizing || !selectedSource}
                className="flex-shrink-0 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-600 via-sky-500 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 shadow-lg shadow-brand-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 group"
              >
                {isOrganizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Organizing Files...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 group-hover:scale-110 transition-transform text-amber-300" />
                    <span>⚡ Clean & Organize Now</span>
                  </>
                )}
              </button>
            </div>

            {/* Config & Path Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: Source Folder Selector */}
              <div className="lg:col-span-7 space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-brand-400" />
                  <span>Target Folder to Organize</span>
                </label>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {quickPaths.map((qp) => (
                    <button
                      key={qp.name}
                      onClick={() => setSelectedSource(qp.path)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedSource.toLowerCase() === qp.path.toLowerCase()
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border'
                      }`}
                    >
                      {qp.name}
                    </button>
                  ))}
                  <button
                    onClick={handlePickSource}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/70 hover:bg-secondary text-brand-400 hover:text-brand-300 border border-border flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse...</span>
                  </button>
                </div>

                {/* Path display box */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-background/60 text-xs font-mono text-foreground truncate">
                  <span className="text-muted-foreground select-none">Path:</span>
                  <span className="truncate flex-1 font-semibold">{selectedSource || 'No folder chosen'}</span>
                </div>
              </div>

              {/* Right: Destination Routing Mode */}
              <div className="lg:col-span-5 space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Destination Routing</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDestMode('inplace')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      destMode === 'inplace'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground font-semibold'
                        : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      {destMode === 'inplace' && <Check className="w-3 h-3 text-emerald-400" />}
                      Smart Subfolders
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Documents/, Torrents/, Media/
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setDestMode('custom');
                      if (!customDestPath) handlePickDest();
                    }}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      destMode === 'custom'
                        ? 'border-brand-500/50 bg-brand-500/10 text-foreground font-semibold'
                        : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      {destMode === 'custom' && <Check className="w-3 h-3 text-brand-400" />}
                      Custom Folder
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {customDestPath ? customDestPath.split(/[\/\\]/).pop() : 'Choose target...'}
                    </div>
                  </button>
                </div>

                {destMode === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. D:\OrganizedFiles"
                      value={customDestPath}
                      onChange={(e) => setCustomDestPath(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      onClick={handlePickDest}
                      className="px-2.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground flex-shrink-0"
                    >
                      Browse
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notification Banner / Undo Action */}
            {organizeNotice && (
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
                  organizeNotice.success
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-medium">
                  {organizeNotice.success ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  )}
                  <span>{organizeNotice.message}</span>
                </div>

                {organizeNotice.lastUndoId && (
                  <button
                    onClick={() => organizeNotice.lastUndoId && handleUndo(organizeNotice.lastUndoId)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo This Move</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Files Organized Today */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Files Organized Today</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground tabular-nums">
                {stats?.filesOrganizedToday ?? 0}
              </span>
              <span className="text-xs text-emerald-500 font-medium">automated</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Processed safely via active rules</p>
          </div>

          {/* Review Queue */}
          <Link
            href="/review"
            className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3 hover:border-amber-500/50 transition-colors group"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold group-hover:text-foreground">Waiting in Review</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground tabular-nums">
                {stats?.filesWaitingInQueue ?? 0}
              </span>
              <span className="text-xs text-muted-foreground font-medium">pending approval</span>
            </div>
            <p className="text-[11px] text-muted-foreground group-hover:text-foreground flex items-center gap-1">
              <span>Unknown or conflicting files</span>
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </Link>

          {/* Monitored Locations */}
          <Link
            href="/locations"
            className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3 hover:border-brand-500/50 transition-colors group"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold group-hover:text-foreground">Monitored Folders</span>
              <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500">
                <FolderSync className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground tabular-nums">
                {stats?.activeMonitoredLocations ?? 0}
              </span>
              <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground group-hover:text-foreground flex items-center gap-1">
              <span>Downloads, Desktop, Custom</span>
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </Link>

          {/* Attention / Errors */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Errors & Safeguards</span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground tabular-nums">
                {stats?.errorsToday ?? 0}
              </span>
              <span className="text-xs text-muted-foreground font-medium">attention required</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Protected paths & permission alerts</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Over Time (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Organization Volume Over Time</h3>
                <p className="text-xs text-muted-foreground">Files classified and moved over the past 7 days</p>
              </div>
              <span className="text-xs font-semibold text-brand-500 bg-brand-500/10 px-2.5 py-1 rounded-md">
                Live Data
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              {stats?.recentActivityOverTime?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.recentActivityOverTime}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #1f293d',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#areaGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                  <Sparkles className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-xs">No activity recorded yet today.</p>
                  <p className="text-[11px]">Add a folder to start automatically organizing files.</p>
                </div>
              )}
            </div>
          </div>

          {/* Category Distribution (1 col) */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Category Breakdown</h3>
                <p className="text-xs text-muted-foreground">File distribution by type</p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              {stats?.categoryDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.categoryDistribution.slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 10, right: 10, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="file_category"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #1f293d',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stats.categoryDistribution.slice(0, 5).map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[entry.file_category] || '#38bdf8'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                  <FolderTree className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-xs">No files categorized yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monitored Locations Health & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monitored Locations Card */}
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Monitored Locations</h3>
                <p className="text-xs text-muted-foreground">Directories currently being watched</p>
              </div>
              <Link
                href="/locations"
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {stats?.monitoredLocations?.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-xl space-y-2">
                  <HardDrive className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">No folders configured yet.</p>
                  <Link
                    href="/locations"
                    className="inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    + Add a folder to monitor
                  </Link>
                </div>
              ) : (
                stats?.monitoredLocations?.slice(0, 4).map((loc: any) => (
                  <div
                    key={loc.id}
                    className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[200px]">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            loc.enabled && loc.status === 'active'
                              ? 'bg-emerald-500'
                              : 'bg-muted-foreground'
                          }`}
                        />
                        <span className="truncate">{loc.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{loc.path}</div>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                      {loc.itemCount} files
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Operations Table (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Recent File Operations</h3>
                <p className="text-xs text-muted-foreground">Latest automatic moves and organization events</p>
              </div>
              <Link
                href="/history"
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span>Full History</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">File / Rule</th>
                    <th className="py-2.5 px-3">Destination</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No operations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-foreground flex items-center gap-1.5 truncate max-w-[200px]">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{item.newPath.split(/[\/\\]/).pop()}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{item.appliedRuleName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px] truncate max-w-[220px]">
                          {item.newPath}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">
                          {formatRelativeTime(item.timestamp)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.canUndo && !item.isUndone ? (
                            <button
                              onClick={() => handleUndo(item.id)}
                              title="Undo this move operation"
                              className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-medium text-foreground transition-colors flex items-center gap-1 mx-auto"
                            >
                              <RotateCcw className="w-3 h-3 text-brand-500" />
                              <span>Undo</span>
                            </button>
                          ) : item.isUndone ? (
                            <span className="text-[10px] text-muted-foreground italic">Undone</span>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-semibold">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
