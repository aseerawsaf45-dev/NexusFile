import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { parse } from 'node:url';
import { dbOperations } from './database';
import { DirectoryMonitorService } from './monitor';
import { UndoManager } from './undo-manager';
import { RuleEngine } from './rule-engine';
import { SafeFileOperations } from './file-operations';
import { StorageAnalyzerService } from './storage-analyzer';
import { SystemCleanerService } from './system-cleaner';

const PORT = 4545;
let serverInstance: http.Server | null = null;

export function startApiServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    if (serverInstance) {
      resolve(serverInstance);
      return;
    }

    DirectoryMonitorService.initialize();

    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const parsedUrl = parse(req.url || '', true);
      const pathname = parsedUrl.pathname || '';
      const method = req.method || 'GET';

      // Parse JSON body helper
      const getBody = async (): Promise<any> => {
        return new Promise((resolveBody) => {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              resolveBody(body ? JSON.parse(body) : {});
            } catch {
              resolveBody({});
            }
          });
        });
      };

      const sendJson = (statusCode: number, data: any) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };

      try {
        // --- OVERVIEW ---
        if (pathname === '/api/overview' && method === 'GET') {
          const stats = dbOperations.getOverviewStats();
          return sendJson(200, stats);
        }

        // --- LOCATIONS ---
        if (pathname === '/api/locations' && method === 'GET') {
          return sendJson(200, dbOperations.getLocations());
        }

        if (pathname === '/api/locations' && method === 'POST') {
          const body = await getBody();
          const location = dbOperations.addLocation({
            name: body.name || 'Folder',
            path: body.path,
            enabled: body.enabled ?? true,
            recursive: body.recursive ?? false,
            folderMode: body.folderMode || 'monitor_contents',
            destinationTemplate: body.destinationTemplate || '{Category}/',
            targetDirectory: body.targetDirectory || null,
          });
          if (location.enabled) {
            DirectoryMonitorService.startWatching(location.id, location.path, location.recursive);
          }
          return sendJson(201, location);
        }

        const locationMatch = pathname.match(/^\/api\/locations\/([a-zA-Z0-9_\-]+)$/);
        if (locationMatch && method === 'PATCH') {
          const id = locationMatch[1];
          const body = await getBody();
          dbOperations.updateLocation(id, body);
          if (body.enabled !== undefined || body.recursive !== undefined) {
            DirectoryMonitorService.reloadWatchers();
          }
          return sendJson(200, { success: true });
        }

        if (locationMatch && method === 'DELETE') {
          const id = locationMatch[1];
          DirectoryMonitorService.stopWatching(id);
          dbOperations.deleteLocation(id);
          return sendJson(200, { success: true });
        }

        const scanMatch = pathname.match(/^\/api\/locations\/([a-zA-Z0-9_\-]+)\/scan$/);
        if (scanMatch && method === 'POST') {
          const id = scanMatch[1];
          const count = await DirectoryMonitorService.reconcileLocation(id);
          return sendJson(200, { success: true, processedFiles: count });
        }

        // --- RULES ---
        if (pathname === '/api/rules' && method === 'GET') {
          return sendJson(200, dbOperations.getRules());
        }

        if (pathname === '/api/rules' && method === 'POST') {
          const body = await getBody();
          const saved = dbOperations.saveRule(body);
          return sendJson(200, saved);
        }

        const ruleDeleteMatch = pathname.match(/^\/api\/rules\/([a-zA-Z0-9_\-]+)$/);
        if (ruleDeleteMatch && method === 'DELETE') {
          const id = ruleDeleteMatch[1];
          dbOperations.deleteRule(id);
          return sendJson(200, { success: true });
        }

        if (pathname === '/api/rules/reorder' && method === 'POST') {
          const body = await getBody();
          dbOperations.reorderRules(body.ruleIds);
          return sendJson(200, { success: true });
        }

        if (pathname === '/api/rules/test' && method === 'POST') {
          const body = await getBody();
          const result = RuleEngine.testRule(body.rule, body.samplePath);
          return sendJson(200, result);
        }

        // --- HISTORY & UNDO ---
        if (pathname === '/api/history' && method === 'GET') {
          const limit = Number(parsedUrl.query.limit) || 100;
          const offset = Number(parsedUrl.query.offset) || 0;
          const category = String(parsedUrl.query.category || 'all');
          const status = String(parsedUrl.query.status || 'all');
          const search = String(parsedUrl.query.search || '');

          const resHistory = dbOperations.getHistory(limit, offset, { category, status, search });
          return sendJson(200, resHistory);
        }

        const undoMatch = pathname.match(/^\/api\/history\/([a-zA-Z0-9_\-]+)\/undo$/);
        if (undoMatch && method === 'POST') {
          const id = undoMatch[1];
          const result = UndoManager.undo(id);
          return sendJson(200, result);
        }

        // --- REVIEW QUEUE ---
        if (pathname === '/api/review' && method === 'GET') {
          return sendJson(200, dbOperations.getReviewQueue());
        }

        const reviewResolveMatch = pathname.match(/^\/api\/review\/([a-zA-Z0-9_\-]+)\/resolve$/);
        if (reviewResolveMatch && method === 'POST') {
          const id = reviewResolveMatch[1];
          const body = await getBody(); // action: 'approve' | 'skip' | 'custom_destination'
          
          if (body.action === 'approve' && body.originalPath && body.destination) {
            await SafeFileOperations.executeMove(
              body.originalPath,
              body.destination,
              'keep_both',
              'Manual Review Approval',
              body.category || 'Unknown'
            );
          }

          dbOperations.resolveReviewItem(id, body.action === 'skip' ? 'skipped' : 'resolved');
          return sendJson(200, { success: true });
        }

        // --- SETTINGS ---
        if (pathname === '/api/settings' && method === 'GET') {
          return sendJson(200, dbOperations.getSettings());
        }

        if (pathname === '/api/settings' && method === 'POST') {
          const body = await getBody();
          dbOperations.updateSettings(body);
          DirectoryMonitorService.reloadWatchers();
          return sendJson(200, { success: true });
        }

        // --- TEMPLATES ---
        if (pathname === '/api/templates' && method === 'GET') {
          return sendJson(200, dbOperations.getTemplates());
        }

        if (pathname === '/api/templates' && method === 'POST') {
          const body = await getBody();
          dbOperations.saveTemplate(body);
          return sendJson(200, { success: true });
        }

        const templateDeleteMatch = pathname.match(/^\/api\/templates\/([a-zA-Z0-9_\-]+)$/);
        if (templateDeleteMatch && method === 'DELETE') {
          const id = templateDeleteMatch[1];
          dbOperations.deleteTemplate(id);
          return sendJson(200, { success: true });
        }

        // --- DRY SCAN ---
        if (pathname === '/api/dry-scan' && method === 'POST') {
          const body = await getBody();
          const result = DirectoryMonitorService.runDryScan(body.path);
          return sendJson(200, result);
        }

        // --- EXPLORER ---
        if (pathname === '/api/explorer' && method === 'GET') {
          const dirPath = String(parsedUrl.query.path || '');
          const items = DirectoryMonitorService.browseDirectory(dirPath);
          return sendJson(200, items);
        }

        // --- ORGANIZE SPECIFIC FILE NOW ---
        if (pathname === '/api/organize-file' && method === 'POST') {
          const body = await getBody();
          const res = await DirectoryMonitorService.processSingleFile(body.filePath, undefined, body.targetDirectory, true);
          return sendJson(200, { success: true, result: res });
        }

        // --- ORGANIZE WHOLE FOLDER AT HIGH SPEED ---
        if (pathname === '/api/organize-folder' && method === 'POST') {
          const body = await getBody();
          const folder = body.folderPath || body.path;
          const targetDir = body.targetDirectory || body.destination;
          const categories = body.categories;
          const result = await DirectoryMonitorService.organizeFolder(folder, targetDir, categories);
          return sendJson(200, result);
        }

        // --- SYSTEM FOLDER PICKER & QUICK PATHS ---
        if (pathname === '/api/system/select-folder' && (method === 'POST' || method === 'GET')) {
          try {
            const psScript = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Destination Folder'; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }`;
            exec(`powershell -Sta -NoProfile -Command "${psScript}"`, (err: any, stdout: string) => {
              const picked = stdout ? stdout.trim() : null;
              return sendJson(200, { path: picked || null });
            });
            return;
          } catch {
            return sendJson(200, { path: null });
          }
        }

        if (pathname === '/api/system/quick-paths' && method === 'GET') {
          const home = process.env.USERPROFILE || 'C:\\Users\\Default';
          const quick = [
            { name: 'Downloads', path: path.join(home, 'Downloads') },
            { name: 'Desktop', path: path.join(home, 'Desktop') },
            { name: 'Documents', path: path.join(home, 'Documents') },
            { name: 'Pictures', path: path.join(home, 'Pictures') },
            { name: 'Videos', path: path.join(home, 'Videos') },
          ].filter((p) => fs.existsSync(p.path));
          return sendJson(200, quick);
        }

        // --- MONITORING CONTROLS ---
        if (pathname === '/api/monitoring/pause' && method === 'POST') {
          DirectoryMonitorService.pauseAll();
          return sendJson(200, { paused: true });
        }

        if (pathname === '/api/monitoring/resume' && method === 'POST') {
          DirectoryMonitorService.resumeAll();
          return sendJson(200, { paused: false });
        }

        if (pathname === '/api/monitoring/status' && method === 'GET') {
          return sendJson(200, {
            paused: DirectoryMonitorService.isMonitoringPaused(),
          });
        }

        // --- STORAGE ANALYZER ---
        if (pathname === '/api/storage/drives' && method === 'GET') {
          const drives = await StorageAnalyzerService.getDrives();
          return sendJson(200, drives);
        }

        if (pathname === '/api/storage/scan' && method === 'POST') {
          const body = await getBody();
          const targetPath = body.path || process.env.USERPROFILE || process.cwd();
          const result = await StorageAnalyzerService.scanDirectory(targetPath);
          return sendJson(200, result);
        }

        if (pathname === '/api/storage/scan/latest' && method === 'GET') {
          const rootPath = parsedUrl.query.path ? String(parsedUrl.query.path) : undefined;
          const latest = dbOperations.getLatestStorageScan(rootPath);
          return sendJson(200, latest || { session: null, data: null });
        }

        if (pathname === '/api/storage/scan/cancel' && method === 'POST') {
          const body = await getBody();
          if (body.sessionId) {
            StorageAnalyzerService.cancelScan(body.sessionId);
          }
          return sendJson(200, { success: true });
        }

        // --- CACHE & TEMP CLEANER ---
        if (pathname === '/api/cleaner/overview' && method === 'GET') {
          const data = await SystemCleanerService.scanCleanupCandidates();
          return sendJson(200, data);
        }

        if (pathname === '/api/cleaner/scan' && method === 'POST') {
          const body = await getBody();
          const data = await SystemCleanerService.scanCleanupCandidates({
            minAgeDays: body.minAgeDays,
            selectedCategories: body.selectedCategories,
          });
          return sendJson(200, data);
        }

        if (pathname === '/api/cleaner/clean' && method === 'POST') {
          const body = await getBody();
          const report = await SystemCleanerService.executeCleanup(
            body.candidates || [],
            Boolean(body.useQuarantine)
          );
          return sendJson(200, report);
        }

        if (pathname === '/api/cleaner/recycle-bin' && method === 'GET') {
          const status = await SystemCleanerService.getRecycleBinStatus();
          return sendJson(200, status);
        }

        if (pathname === '/api/cleaner/recycle-bin/empty' && method === 'POST') {
          const res = await SystemCleanerService.emptyRecycleBin();
          return sendJson(200, res);
        }

        if (pathname === '/api/cleaner/history' && method === 'GET') {
          const history = dbOperations.getCleanupHistory();
          return sendJson(200, history);
        }

        // --- DIAGNOSTICS ---
        if (pathname === '/api/diagnostics' && method === 'GET') {
          const locations = dbOperations.getLocations();
          const history = dbOperations.getHistory(1, 0);
          const errors = dbOperations.getRecentErrors(10);
          return sendJson(200, {
            serviceRunning: true,
            watcherCount: locations.filter((l) => l.enabled && l.status === 'active').length,
            queueDepth: 0,
            activeMonitors: locations.length,
            totalHistoryRecords: history.total,
            databasePath: 'NexusFile/nexusfile.db',
            storageUsedBytes: 0,
            lastReconciliationTime: new Date().toISOString(),
            recentErrors: errors,
            uptimeSeconds: Math.floor(process.uptime()),
          });
        }

        // 404
        sendJson(404, { error: 'Not found' });
      } catch (err: any) {
        dbOperations.logError(err?.message || String(err), pathname, err?.stack);
        sendJson(500, { error: err?.message || 'Internal Server Error' });
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[NexusFile Backend] Engine running on http://127.0.0.1:${PORT}`);
      serverInstance = server;
      resolve(server);
    });
  });
}

// Auto-start if executed directly via node
if (require.main === module) {
  startApiServer();
}
