'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderSync,
  Plus,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  FolderTree,
  Eye,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Folder,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { DryRunModal } from '@/components/dryrun/DryRunModal';
import { apiClient } from '@/lib/api-client';
import { MonitoredLocation, DryRunResult, FolderHandlingMode } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function MonitoredLocationsPage() {
  const [locations, setLocations] = useState<MonitoredLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Location Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [newName, setNewName] = useState('');
  const [newTargetDirectory, setNewTargetDirectory] = useState('');
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [isRecursive, setIsRecursive] = useState(false);
  const [folderMode, setFolderMode] = useState<FolderHandlingMode>('monitor_contents');
  const [template, setTemplate] = useState('{Category}/');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dry run modal state
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [dryRunPath, setDryRunPath] = useState<string>('');
  const [isDryRunOpen, setIsDryRunOpen] = useState(false);
  const [isScanningDry, setIsScanningDry] = useState(false);

  // Scan Now interactive feedback state
  const [scanningLocId, setScanningLocId] = useState<string | null>(null);
  const [completedLocId, setCompletedLocId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ locId: string; locName: string; count: number } | null>(null);

  const loadLocations = async () => {
    try {
      const data = await apiClient.getLocations();
      setLocations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    const interval = setInterval(loadLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePickDirectory = async () => {
    try {
      const picked = await apiClient.pickFolder('Select Folder to Monitor');
      if (picked) {
        setNewPath(picked);
        const parts = picked.split(/[\\\/]/);
        setNewName(parts[parts.length - 1] || 'Monitored Folder');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePickTargetDirectory = async () => {
    try {
      const picked = await apiClient.pickFolder('Select Target Destination Directory');
      if (picked) {
        setNewTargetDirectory(picked);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLocation = async () => {
    if (!newPath.trim()) {
      setErrorMsg('Please select or specify a folder path.');
      return;
    }
    setIsAdding(true);
    setErrorMsg(null);
    try {
      await apiClient.addLocation({
        name: newName || 'Custom Folder',
        path: newPath.trim(),
        enabled: true,
        recursive: isRecursive,
        folderMode,
        destinationTemplate: template || '{Category}/',
        targetDirectory: useCustomTarget && newTargetDirectory.trim() ? newTargetDirectory.trim() : null,
      });
      setIsAddModalOpen(false);
      setNewPath('');
      setNewName('');
      setNewTargetDirectory('');
      setUseCustomTarget(false);
      loadLocations();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add folder.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleEnable = async (loc: MonitoredLocation) => {
    try {
      await apiClient.updateLocation(loc.id, { enabled: !loc.enabled });
      loadLocations();
    } catch {}
  };

  const handleToggleRecursive = async (loc: MonitoredLocation) => {
    try {
      await apiClient.updateLocation(loc.id, { recursive: !loc.recursive });
      loadLocations();
    } catch {}
  };

  const handleScanNow = async (loc: MonitoredLocation) => {
    setScanningLocId(loc.id);
    setScanFeedback(null);
    try {
      const res = await apiClient.scanLocationNow(loc.id);
      await loadLocations();
      setCompletedLocId(loc.id);
      setScanFeedback({
        locId: loc.id,
        locName: loc.name || loc.path,
        count: res?.processedFiles ?? 0,
      });
      setTimeout(() => {
        setCompletedLocId((prev) => (prev === loc.id ? null : prev));
      }, 4000);
    } catch (err: any) {
      alert('Scan error: ' + (err?.message || String(err)));
    } finally {
      setScanningLocId(null);
    }
  };

  const handleRunDryRun = async (loc: MonitoredLocation) => {
    setIsScanningDry(true);
    try {
      const res = await apiClient.runDryScan(loc.path);
      setDryRunResult(res);
      setDryRunPath(loc.path);
      setIsDryRunOpen(true);
    } catch (err: any) {
      alert('Dry scan error: ' + (err?.message || String(err)));
    } finally {
      setIsScanningDry(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (confirm('Stop monitoring this folder? Its contents will NOT be deleted.')) {
      try {
        await apiClient.deleteLocation(id);
        loadLocations();
      } catch {}
    }
  };

  return (
    <AppShell
      title="Monitored Locations"
      subtitle="Configure directories, external drives, and subfolder recursion rules"
      onRefresh={loadLocations}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {locations.length} Location{locations.length === 1 ? '' : 's'} Configured
            </span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Monitored Location</span>
          </button>
        </div>

        {/* Live Feedback Banner */}
        {scanFeedback && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-emerald-300">Scan Complete: {scanFeedback.locName}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {scanFeedback.count > 0
                    ? `Processed and organized ${scanFeedback.count} file(s) into category folders.`
                    : `Folder scanned cleanly. All files are organized and up-to-date with active rules.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setScanFeedback(null)}
              className="text-muted-foreground hover:text-foreground text-xs px-2.5 py-1 rounded hover:bg-emerald-500/10 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.length === 0 ? (
            <div className="col-span-2 p-12 text-center border border-dashed border-border rounded-xl bg-card space-y-3">
              <FolderSync className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No Monitored Folders</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Add a directory such as your Downloads, Desktop, or an external USB drive to begin organizing files.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
              >
                Add Your First Location
              </button>
            </div>
          ) : (
            locations.map((loc) => (
              <div
                key={loc.id}
                className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4 hover:border-border/80 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 truncate">
                    <div className="p-2.5 rounded-lg bg-secondary text-primary mt-0.5">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">{loc.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                            !loc.enabled
                              ? 'bg-secondary text-muted-foreground'
                              : loc.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              !loc.enabled
                                ? 'bg-muted-foreground'
                                : loc.status === 'active'
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {loc.enabled ? loc.status.toUpperCase() : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">{loc.path}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleEnable(loc)}
                      title={loc.enabled ? 'Pause monitoring' : 'Resume monitoring'}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {loc.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-500" />}
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(loc.id)}
                      title="Remove location"
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/30 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px]">Folder Template:</span>
                    <div className="font-mono text-[11px] text-foreground truncate">
                      {loc.destinationTemplate}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px]">Target Destination:</span>
                    <div className="font-mono text-[11px] truncate">
                      {loc.targetDirectory ? (
                        <span className="text-emerald-500 font-semibold">{loc.targetDirectory}</span>
                      ) : (
                        <span className="text-muted-foreground">(Inside Monitored Folder)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls & Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                  {/* Recursive toggle */}
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={loc.recursive}
                      onChange={() => handleToggleRecursive(loc)}
                      className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                    />
                    <span className="text-[11px] font-medium">Recursive Subfolders</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunDryRun(loc)}
                      disabled={isScanningDry}
                      className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-medium transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Dry Run</span>
                    </button>
                    <button
                      onClick={() => handleScanNow(loc)}
                      disabled={scanningLocId === loc.id}
                      className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5 shadow-sm ${
                        completedLocId === loc.id
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : scanningLocId === loc.id
                          ? 'bg-primary/20 text-primary border border-primary/40 cursor-wait'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {scanningLocId === loc.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Scanning...</span>
                        </>
                      ) : completedLocId === loc.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Done</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Scan Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Location Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="h-16 px-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Add Monitored Location</h3>
                  <p className="text-xs text-muted-foreground">Select a directory to organize automatically</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground"
                >
                  <Trash2 className="w-0 h-0 hidden" />
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Folder Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPath}
                      onChange={(e) => setNewPath(e.target.value)}
                      placeholder="C:\Users\Username\Downloads"
                      className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg font-mono text-foreground outline-none focus:border-primary"
                    />
                    <button
                      onClick={handlePickDirectory}
                      type="button"
                      className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors border border-border"
                    >
                      Browse...
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Display Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Downloads"
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Organization Template</label>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                  >
                    <option value="{Category}/">By Category (Documents/, Images/, etc.)</option>
                    <option value="{Category}/{Year}/{Month}/">By Category and Date (Images/2026/10-October/)</option>
                    <option value="{Extension}/">By File Type (PDF/, PNG/, etc.)</option>
                    <option value="{Project}/{Category}/">By Project & Category</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Folder Handling Mode</label>
                  <select
                    value={folderMode}
                    onChange={(e) => setFolderMode(e.target.value as FolderHandlingMode)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                  >
                    <option value="monitor_contents">Monitor contents (Keep folder in place, organize its files)</option>
                    <option value="organize_folder">Organize the folder (Move entire folder into project destination)</option>
                    <option value="smart_folder_rules">Smart folder rules (Apply conditions to folder and contents)</option>
                  </select>
                </div>

                {/* Custom Destination Option */}
                <div className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Custom Target Destination</div>
                      <div className="text-[11px] text-muted-foreground">
                        Move organized files to a specific directory outside the monitored folder
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="custom_target_check"
                      checked={useCustomTarget}
                      onChange={(e) => setUseCustomTarget(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                  </div>

                  {useCustomTarget && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTargetDirectory}
                          onChange={(e) => setNewTargetDirectory(e.target.value)}
                          placeholder="e.g. D:\OrganizedFiles or C:\Users\Awsaf\Documents\Sorted"
                          className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground font-mono outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={handlePickTargetDirectory}
                          className="px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-secondary/80 flex items-center gap-1.5"
                        >
                          <Folder className="w-3.5 h-3.5" />
                          <span>Browse</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Files will be moved to: <span className="font-mono text-foreground">{newTargetDirectory ? `${newTargetDirectory}\\${template}` : `[Custom Destination]\\${template}`}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="rec_check"
                    checked={isRecursive}
                    onChange={(e) => setIsRecursive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="rec_check" className="text-xs text-foreground cursor-pointer">
                    Monitor subdirectories recursively
                  </label>
                </div>
              </div>

              <div className="h-16 px-6 border-t border-border bg-secondary/20 flex items-center justify-between">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLocation}
                  disabled={isAdding}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm"
                >
                  {isAdding ? 'Adding...' : 'Add Location'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dry Run Modal */}
        <DryRunModal
          isOpen={isDryRunOpen}
          onClose={() => setIsDryRunOpen(false)}
          result={dryRunResult}
          folderPath={dryRunPath}
          onApplyChanges={loadLocations}
        />
      </div>
    </AppShell>
  );
}
