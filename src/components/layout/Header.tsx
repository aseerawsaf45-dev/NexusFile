'use client';

import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, Sparkles, Bell } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenCommandPalette: () => void;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, onOpenCommandPalette, onRefresh }: HeaderProps) {
  const [isDark, setIsDark] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check initial dark theme
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
      } else {
        document.documentElement.classList.add('dark');
        setIsDark(true);
      }
    }
  };

  const handleOrganizeAll = async () => {
    setIsOrganizing(true);
    setStatusMessage('Scanning and organizing files...');
    try {
      const locs = await apiClient.getLocations();
      let total = 0;
      for (const loc of locs.filter((l) => l.enabled)) {
        const res = await apiClient.scanLocationNow(loc.id);
        total += res.processedFiles;
      }
      setStatusMessage(`Complete: Organized ${total} file${total === 1 ? '' : 's'}.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setStatusMessage('Organize failed: ' + (err?.message || 'Error'));
    } finally {
      setTimeout(() => {
        setIsOrganizing(false);
        setStatusMessage(null);
      }, 3500);
    }
  };

  return (
    <header className="h-16 px-8 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-3">
        {/* Global Search Input trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground text-xs transition-smooth w-64 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search files, rules, or actions...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-background border border-border rounded font-mono shadow-sm">
            Ctrl+K
          </kbd>
        </button>

        {/* Quick Organize All Action */}
        <button
          onClick={handleOrganizeAll}
          disabled={isOrganizing}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-smooth ${
            isOrganizing
              ? 'bg-brand-600/70 cursor-wait'
              : 'bg-brand-600 hover:bg-brand-500 shadow-sm active:scale-95'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isOrganizing ? 'animate-spin' : ''}`} />
          <span>{isOrganizing ? 'Organizing...' : 'Organize All Now'}</span>
        </button>

        {/* Notification indicator */}
        <button
          onClick={() => {}}
          title="Notifications"
          className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 bg-brand-500 rounded-full absolute top-1.5 right-1.5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      {/* Floating Status Toast */}
      {statusMessage && (
        <div className="absolute top-18 right-8 z-50 px-4 py-2 bg-foreground text-background text-xs rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>{statusMessage}</span>
        </div>
      )}
    </header>
  );
}
