'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Folder,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  DownloadCloud,
  FolderUp,
  FolderInput,
  FolderCheck,
  X,
  Check,
  ExternalLink,
  FolderGit2,
  Code2,
  Cpu,
  Disc,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api-client';
import { MonitoredLocation, ExplorerFileItem } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { formatBytes, formatDate } from '@/lib/utils';

export default function FileExplorerPage() {
  const [locations, setLocations] = useState<MonitoredLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MonitoredLocation | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [pathInput, setPathInput] = useState<string>('');
  const [quickPaths, setQuickPaths] = useState<{ name: string; path: string }[]>([]);
  const [items, setItems] = useState<ExplorerFileItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Organize Modal State
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [organizeMode, setOrganizeMode] = useState<'rules' | 'manual'>('rules');
  const [manualDestination, setManualDestination] = useState('');
  const [useSubcategoryFolder, setUseSubcategoryFolder] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeProgress, setOrganizeProgress] = useState<{ current: number; total: number } | null>(null);
  const [singleFileToOrganize, setSingleFileToOrganize] = useState<ExplorerFileItem | null>(null);

  useEffect(() => {
    initExplorer();
  }, []);

  const initExplorer = async () => {
    try {
      const [locs, quick] = await Promise.all([
        apiClient.getLocations().catch(() => []),
        apiClient.getQuickPaths().catch(() => []),
      ]);

      setLocations(locs);
      setQuickPaths(quick);

      // Default start path: first location or first quick path
      const initial = locs[0]?.path || quick[0]?.path || '';
      if (initial) {
        if (locs[0]) setSelectedLocation(locs[0]);
        setCurrentPath(initial);
        setPathInput(initial);
        loadDirectory(initial);
      } else {
        // Fallback default
        loadDirectory('');
      }
    } catch (err) {
      console.error('Init explorer error:', err);
      loadDirectory('');
    }
  };

  const loadDirectory = async (dirPath: string) => {
    setLoading(true);
    setSelectedFiles([]);
    try {
      const files = await apiClient.browseDirectory(dirPath);
      setItems(files);
      if (files.length > 0) {
        // Extract parent directory of first file if available
        const sample = files[0].path;
        const lastSlash = Math.max(sample.lastIndexOf('\\'), sample.lastIndexOf('/'));
        if (lastSlash > 0) {
          const actualDir = sample.substring(0, lastSlash);
          setCurrentPath(actualDir);
          setPathInput(actualDir);
        }
      } else if (dirPath) {
        setCurrentPath(dirPath);
        setPathInput(dirPath);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (loc: MonitoredLocation) => {
    setSelectedLocation(loc);
    setCurrentPath(loc.path);
    setPathInput(loc.path);
    loadDirectory(loc.path);
  };

  const handleNavigate = (newPath: string) => {
    setCurrentPath(newPath);
    setPathInput(newPath);
    loadDirectory(newPath);
  };

  const handleNavigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split(/[\\\/]/).filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      const parent = parts.join('\\');
      handleNavigate(parent.length === 2 && parent.endsWith(':') ? parent + '\\' : parent);
    }
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      handleNavigate(pathInput.trim());
    }
  };

  const handleBrowseCustomFolder = async () => {
    const picked = await apiClient.pickFolder('Select Directory to Browse');
    if (picked) {
      handleNavigate(picked);
    }
  };

  const handlePickManualDestination = async () => {
    const picked = await apiClient.pickFolder('Select Target Destination Folder');
    if (picked) {
      setManualDestination(picked);
    }
  };

  const toggleSelectFile = (filePath: string) => {
    if (selectedFiles.includes(filePath)) {
      setSelectedFiles(selectedFiles.filter((f) => f !== filePath));
    } else {
      setSelectedFiles([...selectedFiles, filePath]);
    }
  };

  const handleSelectAll = () => {
    const filePaths = items.filter((i) => !i.isDirectory).map((i) => i.path);
    if (selectedFiles.length === filePaths.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filePaths);
    }
  };

  const openOrganizeModalForSelected = () => {
    setSingleFileToOrganize(null);
    setIsOrganizeModalOpen(true);
  };

  const openOrganizeModalForSingle = (item: ExplorerFileItem) => {
    setSingleFileToOrganize(item);
    setIsOrganizeModalOpen(true);
  };

  const executeOrganize = async () => {
    const targets = singleFileToOrganize ? [singleFileToOrganize.path] : selectedFiles;
    if (targets.length === 0) return;

    if (organizeMode === 'manual' && !manualDestination.trim()) {
      alert('Please enter or select a manual destination folder.');
      return;
    }

    setIsOrganizing(true);
    setOrganizeProgress({ current: 0, total: targets.length });

    try {
      let targetBase = undefined;
      if (organizeMode === 'manual') {
        targetBase = manualDestination.trim();
      }

      for (let i = 0; i < targets.length; i++) {
        const filePath = targets[i];
        let finalDest = targetBase;
        if (targetBase && useSubcategoryFolder) {
          const item = items.find((f) => f.path === filePath) || singleFileToOrganize;
          const cat = item?.category || 'General';
          finalDest = `${targetBase}\\${cat}`;
        }

        await apiClient.organizeFileNow(filePath, finalDest);
        setOrganizeProgress({ current: i + 1, total: targets.length });
      }

      setIsOrganizeModalOpen(false);
      setSelectedFiles([]);
      setSingleFileToOrganize(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err?.message || 'Error occurred while organizing files.');
    } finally {
      setIsOrganizing(false);
      setOrganizeProgress(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getTargetPreview = (item: ExplorerFileItem) => {
    if (organizeMode === 'rules') {
      return item.proposedDestination || `${item.category}\\${item.name}`;
    }
    if (!manualDestination.trim()) return 'Please pick destination';
    if (useSubcategoryFolder) {
      return `${manualDestination.trim()}\\${item.category}\\${item.name}`;
    }
    return `${manualDestination.trim()}\\${item.name}`;
  };

  return (
    <AppShell
      title="File Explorer & Live Organizer"
      subtitle="Inspect real directories, preview rules, and manually choose destinations for automatic or batch file organization"
      onRefresh={() => loadDirectory(currentPath)}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navigation & Path Bar Card */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-sm">
          {/* Quick Jump Shortcuts */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-3xl">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                Locations:
              </span>
              {locations.map((loc) => {
                const isSelected = currentPath.toLowerCase() === loc.path.toLowerCase();
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{loc.name}</span>
                  </button>
                );
              })}

              {quickPaths.length > 0 && (
                <>
                  <div className="w-[1px] h-4 bg-border mx-1" />
                  {quickPaths.map((qp) => {
                    const isSelected = currentPath.toLowerCase() === qp.path.toLowerCase();
                    return (
                      <button
                        key={qp.path}
                        onClick={() => handleNavigate(qp.path)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <HardDrive className="w-3 h-3" />
                        <span>{qp.name}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleBrowseCustomFolder}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-xs font-medium text-foreground flex items-center gap-1.5"
                title="Browse Any Folder on PC"
              >
                <FolderInput className="w-3.5 h-3.5 text-brand-500" />
                <span>Browse Folder...</span>
              </button>
              <button
                onClick={() => loadDirectory(currentPath)}
                disabled={loading}
                className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                title="Refresh Directory"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Interactive Path Address Bar */}
          <form onSubmit={handlePathSubmit} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNavigateUp}
              disabled={!currentPath}
              className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-40"
              title="Go Up One Directory"
            >
              <FolderUp className="w-4 h-4" />
            </button>

            <div className="relative flex-1">
              <HardDrive className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="Enter path (e.g. C:\Users\User\Downloads or D:\Torrents)..."
                className="w-full pl-9 pr-16 py-2 text-xs bg-secondary/40 border border-border rounded-lg font-mono text-foreground outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-3 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-semibold text-foreground border border-border"
              >
                Go
              </button>
            </div>
          </form>
        </div>

        {/* Filters and Batch Actions Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter files by name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-lg outline-none text-foreground"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:border-primary outline-none"
            >
              <option value="all">All Categories ({DEFAULT_CATEGORIES.length})</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Organize Selected Button */}
          <button
            onClick={openOrganizeModalForSelected}
            disabled={selectedFiles.length === 0 || isOrganizing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {selectedFiles.length === 0
                ? 'Select Files to Organize'
                : `Organize Selected (${selectedFiles.length})`}
            </span>
          </button>
        </div>

        {/* Files Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedFiles.length > 0 &&
                      selectedFiles.length === items.filter((i) => !i.isDirectory).length
                    }
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                  />
                </th>
                <th className="py-3 px-3">File / Folder Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Proposed Organization Destination</th>
                <th className="py-3 px-3">Applied Rule</th>
                <th className="py-3 px-3 text-right">Size</th>
                <th className="py-3 px-4 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {loading ? 'Reading filesystem...' : 'No files or folders in this directory.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = selectedFiles.includes(item.path);
                  const isTorrent = item.category === 'Torrents' || item.name.toLowerCase().endsWith('.torrent');
                  const isCodebase = item.category === 'Codebases';
                  const isCode = item.category === 'Codes' || item.category === 'Development';
                  const isAI = item.category === 'AI Models';
                  const isDiskImage = item.category === 'Disk Images';
                  const isSecurity = item.category === 'Security';

                  return (
                    <tr
                      key={item.path}
                      className={`hover:bg-secondary/40 transition-colors ${
                        isChecked ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        {!item.isDirectory && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectFile(item.path)}
                            className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div
                          onClick={() => item.isDirectory && handleNavigate(item.path)}
                          className={`flex items-center gap-2 font-medium truncate max-w-xs ${
                            item.isDirectory
                              ? 'cursor-pointer text-primary hover:underline'
                              : 'text-foreground'
                          }`}
                        >
                          {item.isDirectory ? (
                            isCodebase ? (
                              <FolderGit2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            ) : (
                              <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )
                          ) : isTorrent ? (
                            <DownloadCloud className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : isCodebase ? (
                            <FolderGit2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          ) : isCode ? (
                            <Code2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                          ) : isAI ? (
                            <Cpu className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          ) : isDiskImage ? (
                            <Disc className="w-4 h-4 text-rose-500 flex-shrink-0" />
                          ) : isSecurity ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="truncate">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {(!item.isDirectory || isCodebase) && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isTorrent
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : isCodebase
                                ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                : isCode
                                ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                                : isAI
                                ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                : isDiskImage
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : isSecurity
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {isTorrent ? 'Torrents' : item.category}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground truncate max-w-sm">
                        {item.proposedDestination ? (
                          <span className="text-foreground truncate flex items-center gap-1.5">
                            <ArrowRight className="w-3 h-3 text-brand-500 flex-shrink-0" />
                            <span className="truncate">{item.proposedDestination}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-xs">
                        {item.matchingRule || 'Default Template'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {item.isDirectory ? '—' : formatBytes(item.size)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {!item.isDirectory && (
                          <button
                            onClick={() => openOrganizeModalForSingle(item)}
                            className="px-2.5 py-1 rounded bg-secondary hover:bg-primary hover:text-primary-foreground text-[11px] font-medium transition-colors"
                            title="Organize this file"
                          >
                            Organize
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Organize & Choose Destination Modal */}
        {isOrganizeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-500" />
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Organize {singleFileToOrganize ? 'File' : `${selectedFiles.length} Selected Files`}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Choose destination routing and organization options
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOrganizeModalOpen(false)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Destination Strategy</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOrganizeMode('rules')}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        organizeMode === 'rules'
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-secondary/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                        <span>Rule-Based Routing</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Organizes files according to active rules or category templates (e.g. Torrents/, Documents/)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrganizeMode('manual')}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        organizeMode === 'manual'
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-secondary/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs">
                        <FolderCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Manual Destination Folder</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Explicitly specify or browse any custom target directory on your computer
                      </p>
                    </button>
                  </div>
                </div>

                {/* Manual Destination Controls */}
                {organizeMode === 'manual' && (
                  <div className="p-4 rounded-lg border border-border bg-secondary/20 space-y-3">
                    <label className="text-xs font-semibold text-foreground">
                      Target Destination Folder
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualDestination}
                        onChange={(e) => setManualDestination(e.target.value)}
                        placeholder="e.g. D:\OrganizedFiles or C:\Users\Awsaf\Torrents"
                        className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground font-mono outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handlePickManualDestination}
                        className="px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-secondary/80 flex items-center gap-1.5"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Browse...</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="subcat_check"
                        checked={useSubcategoryFolder}
                        onChange={(e) => setUseSubcategoryFolder(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="subcat_check" className="text-xs text-foreground cursor-pointer">
                        Organize into category subfolders inside this destination (e.g. {manualDestination ? `${manualDestination}\\Torrents\\` : '[Destination]\\Torrents\\'})
                      </label>
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Destination Preview</label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-secondary/10 divide-y divide-border text-xs">
                    {(singleFileToOrganize
                      ? [singleFileToOrganize]
                      : items.filter((i) => selectedFiles.includes(i.path))
                    ).map((f) => (
                      <div key={f.path} className="p-2.5 flex items-center justify-between gap-3">
                        <div className="truncate flex-1">
                          <span className="font-semibold text-foreground block truncate">{f.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate block">
                            {f.path}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                        <div className="font-mono text-[11px] text-emerald-500 truncate max-w-xs text-right">
                          {getTargetPreview(f)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress bar */}
                {isOrganizing && organizeProgress && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
                    <div className="flex justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                      <span>Organizing files...</span>
                      <span>{organizeProgress.current} / {organizeProgress.total}</span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-500 h-full transition-all duration-200"
                        style={{
                          width: `${(organizeProgress.current / organizeProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="h-16 px-6 border-t border-border bg-secondary/20 flex items-center justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOrganizeModalOpen(false)}
                  disabled={isOrganizing}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeOrganize}
                  disabled={isOrganizing || (organizeMode === 'manual' && !manualDestination.trim())}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm flex items-center gap-2 disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isOrganizing ? 'Organizing...' : 'Confirm & Organize'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
