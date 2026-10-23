import {
  MonitoredLocation,
  OrganizationRule,
  FileOperationHistory,
  PendingReviewItem,
  ApplicationSettings,
  OrganizationTemplate,
  DryRunResult,
  ExplorerFileItem,
  DiagnosticsInfo,
  DriveInfo,
  StorageScanResult,
  StorageScanSession,
  CleanerOverviewData,
  CleanupCandidate,
  CleanupCategoryCard,
  CleanupResultReport,
  RecycleBinStatus,
} from './types';

const BASE_URL = 'http://127.0.0.1:4545/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const apiClient = {
  // Overview
  getOverviewStats: () => request<any>('/overview'),

  // Locations
  getLocations: () => request<MonitoredLocation[]>('/locations'),
  addLocation: (location: {
    name: string;
    path: string;
    enabled: boolean;
    recursive: boolean;
    folderMode: string;
    destinationTemplate?: string;
    targetDirectory?: string | null;
  }) =>
    request<MonitoredLocation>('/locations', {
      method: 'POST',
      body: JSON.stringify(location),
    }),
  updateLocation: (id: string, updates: Partial<MonitoredLocation>) =>
    request<{ success: boolean }>(`/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteLocation: (id: string) =>
    request<{ success: boolean }>(`/locations/${id}`, {
      method: 'DELETE',
    }),
  scanLocationNow: (id: string) =>
    request<{ success: boolean; processedFiles: number }>(`/locations/${id}/scan`, {
      method: 'POST',
    }),

  // Rules
  getRules: () => request<OrganizationRule[]>('/rules'),
  saveRule: (rule: Partial<OrganizationRule>) =>
    request<OrganizationRule>('/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),
  deleteRule: (id: string) =>
    request<{ success: boolean }>(`/rules/${id}`, {
      method: 'DELETE',
    }),
  reorderRules: (ruleIds: string[]) =>
    request<{ success: boolean }>('/rules/reorder', {
      method: 'POST',
      body: JSON.stringify({ ruleIds }),
    }),
  testRule: (rule: OrganizationRule, samplePath: string) =>
    request<{ matches: boolean; explanation: string }>('/rules/test', {
      method: 'POST',
      body: JSON.stringify({ rule, samplePath }),
    }),

  // History & Undo
  getHistory: (limit: number = 50, offset: number = 0, filter?: { category?: string; status?: string; search?: string }) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      category: filter?.category || 'all',
      status: filter?.status || 'all',
      search: filter?.search || '',
    });
    return request<{ items: FileOperationHistory[]; total: number }>(`/history?${params.toString()}`);
  },
  undoOperation: (id: string) =>
    request<{ success: boolean; message: string }>(`/history/${id}/undo`, {
      method: 'POST',
    }),

  // Review Queue
  getReviewQueue: () => request<PendingReviewItem[]>('/review'),
  resolveReviewItem: (
    id: string,
    action: 'approve' | 'skip' | 'custom_destination',
    options?: { originalPath?: string; destination?: string; category?: string }
  ) =>
    request<{ success: boolean }>(`/review/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action, ...options }),
    }),

  // Settings
  getSettings: () => request<ApplicationSettings>('/settings'),
  updateSettings: (settings: Partial<ApplicationSettings>) =>
    request<{ success: boolean }>('/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  // Templates
  getTemplates: () => request<OrganizationTemplate[]>('/templates'),
  saveTemplate: (template: OrganizationTemplate) =>
    request<{ success: boolean }>('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    }),
  deleteTemplate: (id: string) =>
    request<{ success: boolean }>(`/templates/${id}`, {
      method: 'DELETE',
    }),

  // Dry Scan
  runDryScan: (dirPath: string) =>
    request<DryRunResult>('/dry-scan', {
      method: 'POST',
      body: JSON.stringify({ path: dirPath }),
    }),

  // Explorer
  browseDirectory: (dirPath?: string) => {
    const params = new URLSearchParams(dirPath ? { path: dirPath } : {});
    return request<ExplorerFileItem[]>(`/explorer?${params.toString()}`);
  },
  organizeFileNow: (filePath: string, targetDirectory?: string) =>
    request<{ success: boolean; result?: any }>('/organize-file', {
      method: 'POST',
      body: JSON.stringify({ filePath, targetDirectory }),
    }),
  organizeFolderNow: (folderPath: string, targetDirectory?: string, categories?: string[]) =>
    request<{
      success: boolean;
      folderPath: string;
      totalFound: number;
      organizedCount: number;
      skippedCount: number;
      durationMs: number;
      items: any[];
    }>('/organize-folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath, targetDirectory, categories }),
    }),

  // System Folder Picker & Shortcuts
  pickFolder: async (title?: string): Promise<string | null> => {
    // 1. Check Electron API if available
    if (typeof window !== 'undefined' && (window as any).electronAPI?.selectDirectory) {
      try {
        const picked = await (window as any).electronAPI.selectDirectory();
        if (picked) return picked;
      } catch (err) {
        console.warn('Electron directory picker error:', err);
      }
    }
    // 2. Fallback to API server PowerShell native dialog
    try {
      const res = await request<{ path: string | null }>('/system/select-folder', { method: 'POST' });
      if (res && res.path) return res.path;
    } catch {}
    // 3. Browser prompt fallback
    if (typeof window !== 'undefined') {
      return prompt(title || 'Enter destination folder path (e.g. D:\\Organized):') || null;
    }
    return null;
  },
  getQuickPaths: () => request<{ name: string; path: string }[]>('/system/quick-paths'),

  // Monitoring
  pauseMonitoring: () => request<{ paused: boolean }>('/monitoring/pause', { method: 'POST' }),
  resumeMonitoring: () => request<{ paused: boolean }>('/monitoring/resume', { method: 'POST' }),
  getMonitoringStatus: () => request<{ paused: boolean }>('/monitoring/status'),

  // Diagnostics
  getDiagnostics: () => request<DiagnosticsInfo>('/diagnostics'),

  // Storage Analyzer
  getDrives: () => request<DriveInfo[]>('/storage/drives'),
  scanStorage: (path: string) =>
    request<StorageScanResult>('/storage/scan', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
  getLatestStorageScan: (path?: string) => {
    const q = path ? `?path=${encodeURIComponent(path)}` : '';
    return request<{ session: StorageScanSession | null; data: any }>(`/storage/scan/latest${q}`);
  },
  cancelStorageScan: (sessionId: string) =>
    request<{ success: boolean }>('/storage/scan/cancel', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  // Cache & Temp Cleaner
  getCleanerOverview: () => request<CleanerOverviewData>('/cleaner/overview'),
  scanCleaner: (options?: { minAgeDays?: number; selectedCategories?: string[] }) =>
    request<{
      candidates: CleanupCandidate[];
      categories: CleanupCategoryCard[];
      overview: CleanerOverviewData;
    }>('/cleaner/scan', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),
  executeCleanup: (candidates: CleanupCandidate[], useQuarantine: boolean = false) =>
    request<CleanupResultReport>('/cleaner/clean', {
      method: 'POST',
      body: JSON.stringify({ candidates, useQuarantine }),
    }),
  getRecycleBinStatus: () => request<RecycleBinStatus>('/cleaner/recycle-bin'),
  emptyRecycleBin: () =>
    request<{ success: boolean; message: string }>('/cleaner/recycle-bin/empty', {
      method: 'POST',
    }),
  getCleanupHistory: () => request<any[]>('/cleaner/history'),
};
