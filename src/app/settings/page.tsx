'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  FolderSync,
  Bell,
  Lock,
  HardDrive,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api-client';
import { ApplicationSettings, DiagnosticsInfo } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApplicationSettings>(DEFAULT_SETTINGS);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'organization' | 'monitoring' | 'safety' | 'diagnostics'>('general');

  const loadSettings = async () => {
    try {
      const data = await apiClient.getSettings();
      setSettings(data);
      const diag = await apiClient.getDiagnostics();
      setDiagnostics(diag);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert('Save failed: ' + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof ApplicationSettings>(key: K, value: ApplicationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppShell
      title="Application Settings"
      subtitle="Configure lifecycle behavior, automation rules, safety safeguards, and diagnostics"
      onRefresh={loadSettings}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation tabs & Save button */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex gap-2">
            {[
              { id: 'general', label: 'General' },
              { id: 'organization', label: 'Organization' },
              { id: 'monitoring', label: 'Monitoring' },
              { id: 'safety', label: 'Safety & Limits' },
              { id: 'diagnostics', label: 'Diagnostics' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSection === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </>
            )}
          </button>
        </div>

        {/* Section: General */}
        {activeSection === 'general' && (
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            <h3 className="text-sm font-bold text-foreground">Desktop & Background Lifecycle</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-foreground">Launch at Windows Startup</div>
                  <div className="text-[11px] text-muted-foreground">Start NexusFile automatically when logging into Windows</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.launchAtStartup}
                  onChange={(e) => updateSetting('launchAtStartup', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-foreground">Start Monitoring Automatically</div>
                  <div className="text-[11px] text-muted-foreground">Begin real-time directory watching immediately on startup</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.startMonitoringAutomatically}
                  onChange={(e) => updateSetting('startMonitoringAutomatically', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-foreground">Close to System Tray</div>
                  <div className="text-[11px] text-muted-foreground">Keep monitoring active in the background when closing the window</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.closeToTray}
                  onChange={(e) => updateSetting('closeToTray', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>
        )}

        {/* Section: Organization */}
        {activeSection === 'organization' && (
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            <h3 className="text-sm font-bold text-foreground">Organization & Collision Policies</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Default Collision Policy</label>
                <select
                  value={settings.defaultCollisionPolicy}
                  onChange={(e) => updateSetting('defaultCollisionPolicy', e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                >
                  <option value="keep_both">Keep Both (Auto-suffix name e.g. "Report (1).pdf")</option>
                  <option value="skip">Skip (Leave original file untouched)</option>
                  <option value="overwrite_with_confirmation">Overwrite</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Unknown Files Behavior</label>
                <select
                  value={settings.unknownFileBehavior}
                  onChange={(e) => updateSetting('unknownFileBehavior', e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                >
                  <option value="organize_to_unknown">Move to Unknown/ folder</option>
                  <option value="review_queue">Send to Review Queue for manual approval</option>
                  <option value="ignore">Ignore (Leave in place)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">File Stability Delay (ms)</label>
              <input
                type="number"
                min="200"
                step="100"
                value={settings.fileStabilityDelayMs}
                onChange={(e) => updateSetting('fileStabilityDelayMs', Number(e.target.value))}
                className="w-full max-w-xs px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                Wait interval to confirm files (like active downloads) have finished writing before moving.
              </p>
            </div>
          </div>
        )}

        {/* Section: Monitoring */}
        {activeSection === 'monitoring' && (
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            <h3 className="text-sm font-bold text-foreground">Filesystem Monitoring & Exclusions</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-foreground">Ignore Incomplete & Temporary Files</div>
                  <div className="text-[11px] text-muted-foreground">Skip `.crdownload`, `.part`, `.tmp`, and Office lock files (`~$*`)</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ignoreTemporaryFiles}
                  onChange={(e) => updateSetting('ignoreTemporaryFiles', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </label>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Periodic Reconciliation Interval (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  value={settings.reconciliationIntervalMinutes}
                  onChange={(e) => updateSetting('reconciliationIntervalMinutes', Number(e.target.value))}
                  className="w-full max-w-xs px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground tabular-nums"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section: Safety */}
        {activeSection === 'safety' && (
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            <h3 className="text-sm font-bold text-foreground">Safety Safeguards & Integrity</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-foreground">Global Dry-Run Mode</div>
                  <div className="text-[11px] text-muted-foreground">Simulate all rules and log events without modifying real files</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dryRunMode}
                  onChange={(e) => updateSetting('dryRunMode', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-foreground">SHA-256 Content-Hash Verification</div>
                  <div className="text-[11px] text-muted-foreground">Verify file integrity before and after cross-volume moves</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableContentHashCheck}
                  onChange={(e) => updateSetting('enableContentHashCheck', e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </label>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Protected System Paths (Read-Only)</label>
                <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1 text-[11px] font-mono text-muted-foreground">
                  <div>C:\Windows</div>
                  <div>C:\Program Files</div>
                  <div>C:\Program Files (x86)</div>
                  <div>C:\ProgramData</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: Diagnostics */}
        {activeSection === 'diagnostics' && (
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            <h3 className="text-sm font-bold text-foreground">System Health & Diagnostics</h3>

            {diagnostics && (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <span className="text-muted-foreground">Database Engine</span>
                  <div className="font-semibold text-foreground">SQLite (WAL Mode)</div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <span className="text-muted-foreground">Database File Location</span>
                  <div className="font-mono text-[11px] text-foreground truncate">
                    {diagnostics.databasePath}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <span className="text-muted-foreground">Active Directory Watchers</span>
                  <div className="font-semibold text-emerald-500 tabular-nums">
                    {diagnostics.watcherCount} active
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <span className="text-muted-foreground">Total History Audits Recorded</span>
                  <div className="font-semibold text-foreground tabular-nums">
                    {diagnostics.totalHistoryRecords} operations
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
