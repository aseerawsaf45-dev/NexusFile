'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Play,
} from 'lucide-react';
import { DryRunResult } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface DryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DryRunResult | null;
  folderPath: string;
  onApplyChanges: () => void;
}

export function DryRunModal({ isOpen, onClose, result, folderPath, onApplyChanges }: DryRunModalProps) {
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen || !result) return null;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      for (const item of result.items) {
        if (item.status === 'can_move') {
          await apiClient.organizeFileNow(item.originalPath);
        }
      }
      onApplyChanges();
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Dry-Run Organization Preview</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                Safe Simulation
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-lg">{folderPath}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-secondary/30 border-b border-border">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Total Files</span>
            <div className="text-xl font-bold text-foreground tabular-nums">{result.totalFiles}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Total Data Volume</span>
            <div className="text-xl font-bold text-foreground tabular-nums">{formatBytes(result.totalBytes)}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Ready to Move</span>
            <div className="text-xl font-bold text-emerald-500 tabular-nums">{result.processableFiles}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Conflicts & Skipped</span>
            <div className="text-xl font-bold text-amber-500 tabular-nums">
              {result.conflictingFiles + result.skippedFiles}
            </div>
          </div>
        </div>

        {/* File Changes Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Proposed Destination</th>
                  <th className="py-2.5 px-3">Matching Rule</th>
                  <th className="py-2.5 px-3 text-right">Size</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No files found in this folder.
                    </td>
                  </tr>
                ) : (
                  result.items.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-foreground flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{item.filename}</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{item.fileCategory}</td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                        <span className="text-foreground truncate block max-w-[220px]">
                          {item.proposedDestination}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[140px]">
                        {item.matchingRuleName}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {formatBytes(item.fileSize)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.status === 'can_move' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        ) : item.status === 'will_skip' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-semibold">
                            Skipped
                          </span>
                        ) : (
                          <span
                            title={item.conflictReason}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-semibold cursor-help"
                          >
                            <AlertTriangle className="w-3 h-3" /> Conflict
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-border bg-secondary/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
            <span>Dry-run preview did not modify any files.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying || result.processableFiles === 0}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isApplying ? 'Applying...' : `Execute Organization (${result.processableFiles})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
