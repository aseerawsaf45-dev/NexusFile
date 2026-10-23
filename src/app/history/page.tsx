'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api-client';
import { FileOperationHistory } from '@/lib/types';
import { formatBytes, formatRelativeTime, formatDate } from '@/lib/utils';

export default function HistoryPage() {
  const [history, setHistory] = useState<FileOperationHistory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const data = await apiClient.getHistory(100, 0, {
        category: categoryFilter,
        status: statusFilter,
        search,
      });
      setHistory(data.items);
      setTotalCount(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [categoryFilter, statusFilter, search]);

  const handleUndo = async (id: string) => {
    setUndoingId(id);
    try {
      const res = await apiClient.undoOperation(id);
      if (res.success) {
        alert(res.message);
        loadHistory();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Undo failed: ' + (err?.message || String(err)));
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <AppShell
      title="Activity History & Audit Log"
      subtitle="Complete persistent history of all organized files with one-click reversible undo"
      onRefresh={loadHistory}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Filter bar */}
        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history by filename or rule..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-secondary/40 border border-border rounded-lg outline-none text-foreground"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-secondary/40 border border-border rounded-lg text-foreground"
            >
              <option value="all">All Categories</option>
              <option value="Documents">Documents</option>
              <option value="Spreadsheets">Spreadsheets</option>
              <option value="Images">Images</option>
              <option value="Videos">Videos</option>
              <option value="Archives">Archives</option>
              <option value="Installers">Installers</option>
              <option value="Development">Development</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-secondary/40 border border-border rounded-lg text-foreground"
            >
              <option value="all">All Results</option>
              <option value="success">Success</option>
              <option value="skipped">Skipped</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="text-xs font-semibold text-muted-foreground tabular-nums">
            {totalCount} Total Event{totalCount === 1 ? '' : 's'}
          </div>
        </div>

        {/* History Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-3">Original Location</th>
                <th className="py-3 px-3">Organized Location</th>
                <th className="py-3 px-3">Rule Applied</th>
                <th className="py-3 px-3 text-right">Size</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Reversible Undo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {loading ? 'Loading history...' : 'No activity records match your filter criteria.'}
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2 truncate max-w-xs">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{item.newPath.split(/[\\\/]/).pop()}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(item.timestamp)} ({formatRelativeTime(item.timestamp)})
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                      {item.originalPath}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-foreground truncate max-w-[200px]">
                      {item.newPath}
                    </td>

                    <td className="py-3 px-3 text-muted-foreground truncate max-w-[140px]">
                      {item.appliedRuleName}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                      {formatBytes(item.fileSize)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {item.result === 'success' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                          SUCCESS
                        </span>
                      ) : item.result === 'skipped' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground">
                          SKIPPED
                        </span>
                      ) : (
                        <span
                          title={item.errorDetails || 'Failed'}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive cursor-help"
                        >
                          FAILED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {item.canUndo && !item.isUndone ? (
                        <button
                          onClick={() => handleUndo(item.id)}
                          disabled={undoingId === item.id}
                          className="px-3 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[11px] transition-colors flex items-center gap-1.5 mx-auto disabled:opacity-40"
                        >
                          <RotateCcw className={`w-3 h-3 text-brand-500 ${undoingId === item.id ? 'animate-spin' : ''}`} />
                          <span>Undo</span>
                        </button>
                      ) : item.isUndone ? (
                        <span className="text-[11px] text-muted-foreground italic">Restored</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
