'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FolderSync,
  SlidersHorizontal,
  Clock,
  Settings,
  Sparkles,
  Pause,
  Play,
  Compass,
  X,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      label: 'Organize All Monitored Locations Now',
      category: 'Actions',
      icon: Sparkles,
      action: async () => {
        onClose();
        const locs = await apiClient.getLocations();
        for (const loc of locs.filter((l) => l.enabled)) {
          await apiClient.scanLocationNow(loc.id);
        }
      },
    },
    {
      label: 'Add New Monitored Folder',
      category: 'Locations',
      icon: FolderSync,
      action: () => {
        onClose();
        router.push('/locations');
      },
    },
    {
      label: 'File Explorer & Real-Time Preview',
      category: 'Navigation',
      icon: Compass,
      action: () => {
        onClose();
        router.push('/explorer');
      },
    },
    {
      label: 'Manage Rules & Priority',
      category: 'Rules',
      icon: SlidersHorizontal,
      action: () => {
        onClose();
        router.push('/rules');
      },
    },
    {
      label: 'Storage Analyzer & Hierarchical Size Tree',
      category: 'Storage',
      icon: HardDrive,
      action: () => {
        onClose();
        router.push('/storage');
      },
    },
    {
      label: 'Cache & Temporary Files Cleaner',
      category: 'Maintenance',
      icon: Sparkles,
      action: () => {
        onClose();
        router.push('/cleaner');
      },
    },
    {
      label: 'View Activity History & Undo',
      category: 'History',
      icon: Clock,
      action: () => {
        onClose();
        router.push('/history');
      },
    },
    {
      label: isPaused ? 'Resume Real-Time Monitoring' : 'Pause Real-Time Monitoring',
      category: 'Controls',
      icon: isPaused ? Play : Pause,
      action: async () => {
        onClose();
        if (isPaused) {
          await apiClient.resumeMonitoring();
          setIsPaused(false);
        } else {
          await apiClient.pauseMonitoring();
          setIsPaused(true);
        }
      },
    },
    {
      label: 'Open Application Settings',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        onClose();
        router.push('/settings');
      },
    },
  ];

  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4 select-none">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-border gap-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            autoFocus
            className="w-full py-3.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No matching commands or actions found.
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs hover:bg-secondary transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.category}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-secondary/50 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with mouse or keyboard</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
