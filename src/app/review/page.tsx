'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  FileQuestion,
  ArrowRight,
  Sparkles,
  Edit2,
  Check,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api-client';
import { PendingReviewItem } from '@/lib/types';
import { formatBytes, formatRelativeTime } from '@/lib/utils';

export default function ReviewQueuePage() {
  const [items, setItems] = useState<PendingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customDest, setCustomDest] = useState('');

  const loadQueue = async () => {
    try {
      const data = await apiClient.getReviewQueue();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (item: PendingReviewItem) => {
    try {
      await apiClient.resolveReviewItem(item.id, 'approve', {
        originalPath: item.originalPath,
        destination: editingId === item.id && customDest ? customDest : item.suggestedDestination,
        category: item.suggestedCategory,
      });
      loadQueue();
    } catch (err: any) {
      alert(err?.message || 'Approve failed');
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await apiClient.resolveReviewItem(id, 'skip');
      loadQueue();
    } catch (err: any) {
      alert(err?.message || 'Skip failed');
    }
  };

  return (
    <AppShell
      title="Review Queue"
      subtitle="Safely inspect unknown file types, ambiguous rules, and operations requiring user approval"
      onRefresh={loadQueue}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {items.length} Item{items.length === 1 ? '' : 's'} Pending Approval
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-border rounded-xl bg-card space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Review Queue is Clear!</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              All detected files have been organized according to your active rules.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 truncate">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5">
                      <FileQuestion className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {item.originalPath.split(/[\\\/]/).pop()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 uppercase">
                          {item.reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                        {item.originalPath}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-foreground tabular-nums">
                      {formatBytes(item.fileSize)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(item.detectedAt)}
                    </div>
                  </div>
                </div>

                {/* Proposed destination & custom edit */}
                <div className="p-3 rounded-lg bg-secondary/40 border border-border flex items-center justify-between text-xs gap-3">
                  <div className="flex-1 truncate">
                    <span className="text-muted-foreground text-[11px] block">Proposed Destination:</span>
                    {editingId === item.id ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={customDest}
                          onChange={(e) => setCustomDest(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs bg-background border border-border rounded font-mono text-foreground"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const picked = await apiClient.pickFolder('Select Destination Directory');
                            if (picked) {
                              const filename = item.originalPath.split(/[\\\/]/).pop();
                              setCustomDest(`${picked}\\${filename}`);
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-medium border border-border text-foreground transition-colors"
                        >
                          Browse
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] text-foreground truncate block mt-0.5">
                        {item.suggestedDestination}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (editingId === item.id) {
                        setEditingId(null);
                      } else {
                        setEditingId(item.id);
                        setCustomDest(item.suggestedDestination);
                      }
                    }}
                    className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                    title="Edit destination"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-1 border-t border-border/60">
                  <button
                    onClick={() => handleSkip(item.id)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    Skip File
                  </button>
                  <button
                    onClick={() => handleApprove(item)}
                    className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Move</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
