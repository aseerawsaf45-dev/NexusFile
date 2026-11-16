'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Play,
  FolderGit2,
  Image as ImageIcon,
  Code2,
  Archive,
  Package,
  Layers,
  Search,
} from 'lucide-react';
import { DryRunResult, FileCategory } from '@/lib/types';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !result) return null;

  const categories = useMemo(() => {
    if (!result.categoryBreakdown) return [];
    return Object.values(result.categoryBreakdown).sort((a, b) => b.count - a.count);
  }, [result]);

  const filteredItems = useMemo(() => {
    return result.items.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.fileCategory === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.proposedDestination.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [result.items, selectedCategory, searchQuery]);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const itemsToMove = result.items.filter((item) => item.status === 'can_move');
      for (const item of itemsToMove) {
        await apiClient.organizeFileNow(item.originalPath);
      }
      onApplyChanges();
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const getItemIcon = (category: string, isDirectory?: boolean) => {
    if (isDirectory || category === 'Codebases') {
      return <FolderGit2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />;
    }
    if (category === 'Images') {
      return <ImageIcon className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />;
    }
    if (category === 'Codes') {
      return <Code2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
    }
    if (category === 'Archives') {
      return <Archive className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
    }
    if (category === 'Installers') {
      return <Package className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Dry-Run Organization Preview</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
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
        <div className="grid grid-cols-4 gap-4 p-5 bg-secondary/30 border-b border-border">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Total Items</span>
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

        {/* Category Breakdown Filter Pills */}
        <div className="px-6 py-3 border-b border-border bg-secondary/10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
            }`}
          >
            All ({result.totalFiles})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.category
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span>{cat.category}</span>
              <span className="text-[10px] opacity-75">({cat.count})</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-lg">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none w-36"
            />
          </div>
        </div>

        {/* File Changes Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Proposed Destination</th>
                  <th className="py-2.5 px-3">Matching Rule</th>
                  <th className="py-2.5 px-3 text-right">Size</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No matching items in this filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-foreground flex items-center gap-2">
                        {getItemIcon(item.fileCategory, item.isDirectory)}
                        <span className="truncate max-w-[180px]">{item.filename}</span>
                        {item.isDirectory && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            REPO
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {item.fileCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                        <span className="text-foreground truncate block max-w-[220px]">
                          {item.proposedDestination}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[140px]">
                        {item.matchingRuleName}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {item.isDirectory ? 'Project' : formatBytes(item.fileSize)}
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
            <span>Simulation mode: no files or repositories have been moved yet.</span>
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
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isApplying ? 'Organizing...' : `Execute Organization (${result.processableFiles})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
