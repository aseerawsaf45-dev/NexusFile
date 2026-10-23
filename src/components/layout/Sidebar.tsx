'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderSync,
  Compass,
  SlidersHorizontal,
  Clock,
  Settings,
  FolderTree,
  AlertTriangle,
  Play,
  Pause,
  HardDrive,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Trash2,
  Archive,
  PieChart as PieIcon,
  FileText,
  Layers,
  ArrowUpDown,
  Film,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface NavSubItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: string;
  matchPrefix?: string;
}

interface NavSection {
  id: 'sorting' | 'cleaner' | 'storage';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeText?: string;
  items: NavSubItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const [isPaused, setIsPaused] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [activeLocationsCount, setActiveLocationsCount] = useState(0);

  // Collapsed state for the 3 main sections
  const [collapsed, setCollapsed] = useState<{
    sorting: boolean;
    cleaner: boolean;
    storage: boolean;
  }>({
    sorting: false,
    cleaner: false,
    storage: false,
  });

  useEffect(() => {
    // Auto-expand section if current route belongs to it
    if (pathname) {
      if (
        pathname === '/' ||
        pathname.startsWith('/locations') ||
        pathname.startsWith('/rules') ||
        pathname.startsWith('/explorer') ||
        pathname.startsWith('/review') ||
        pathname.startsWith('/templates') ||
        pathname.startsWith('/history') ||
        pathname.startsWith('/video')
      ) {
        setCollapsed((prev) => ({ ...prev, sorting: false }));
      } else if (pathname.startsWith('/cleaner')) {
        setCollapsed((prev) => ({ ...prev, cleaner: false }));
      } else if (pathname.startsWith('/storage')) {
        setCollapsed((prev) => ({ ...prev, storage: false }));
      }
    }
  }, [pathname]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const status = await apiClient.getMonitoringStatus();
      setIsPaused(status.paused);

      const review = await apiClient.getReviewQueue();
      setReviewCount(review.length);

      const locs = await apiClient.getLocations();
      setActiveLocationsCount(locs.filter((l) => l.enabled).length);
    } catch {}
  };

  const togglePause = async () => {
    try {
      if (isPaused) {
        await apiClient.resumeMonitoring();
        setIsPaused(false);
      } else {
        await apiClient.pauseMonitoring();
        setIsPaused(true);
      }
    } catch {}
  };

  const toggleSection = (sectionId: 'sorting' | 'cleaner' | 'storage') => {
    setCollapsed((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const sections: NavSection[] = [
    {
      id: 'sorting',
      title: 'File Sorting',
      subtitle: 'Automation & Rules',
      icon: ArrowUpDown,
      accentColor: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
      badgeText: `${activeLocationsCount} active`,
      items: [
        { href: '/', label: 'Overview', icon: LayoutDashboard },
        { href: '/locations', label: 'Monitored Locations', icon: FolderSync, badge: activeLocationsCount },
        { href: '/rules', label: 'Rules Engine', icon: SlidersHorizontal },
        { href: '/explorer', label: 'File Explorer', icon: Compass },
        { href: '/review', label: 'Review Queue', icon: AlertTriangle, badge: reviewCount, badgeColor: 'bg-amber-500' },
        { href: '/templates', label: 'Templates', icon: FolderTree },
        { href: '/history', label: 'Activity History', icon: Clock },
        { href: '/video', label: 'SaaS Video Reel', icon: Film },
      ],
    },
    {
      id: 'cleaner',
      title: 'Cache Cleaning',
      subtitle: 'System & Caches',
      icon: Sparkles,
      accentColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      items: [
        { href: '/cleaner', label: 'Cleaner Dashboard', icon: Sparkles },
        { href: '/cleaner?category=windows_temp', label: 'System Temp Files', icon: Trash2 },
        { href: '/cleaner?category=browser_cache', label: 'App & Browser Caches', icon: Archive },
        { href: '/cleaner?view=recycle-bin', label: 'Recycle Bin', icon: Trash2 },
      ],
    },
    {
      id: 'storage',
      title: 'Storage Analyzer',
      subtitle: 'Disk Space & Sizes',
      icon: HardDrive,
      accentColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      items: [
        { href: '/storage', label: 'Drive Capacity', icon: HardDrive },
        { href: '/storage?tab=tree', label: 'Size Tree', icon: FolderTree },
        { href: '/storage?tab=treemap', label: 'Treemap Chart', icon: PieIcon },
        { href: '/storage?tab=largest', label: 'Largest Files', icon: FileText },
      ],
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col justify-between h-screen select-none">
      {/* Brand & Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-sm flex-shrink-0">
          <FolderTree className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-foreground">NexusFile</span>
            <span className="text-[10px] font-medium bg-brand-500/10 text-brand-500 dark:text-brand-400 px-1.5 py-0.5 rounded">
              v1.0
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">Automated Storage Studio</p>
        </div>
      </div>

      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const isCollapsed = collapsed[section.id];
          const hasActiveChild = section.items.some(
            (item) => pathname === item.href || (item.href !== '/' && !item.href.includes('?') && pathname?.startsWith(item.href))
          );

          return (
            <div key={section.id} className="rounded-xl border border-border/40 bg-secondary/15 overflow-hidden transition-all duration-200">
              {/* Section Header with Collapse Trigger */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors hover:bg-secondary/50 ${
                  hasActiveChild ? 'bg-secondary/30' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className={`p-1.5 rounded-lg border flex-shrink-0 ${section.accentColor}`}>
                    <SectionIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold tracking-tight text-foreground block truncate">
                      {section.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {section.subtitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {section.badgeText && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {section.badgeText}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                      isCollapsed ? '-rotate-90' : 'rotate-0'
                    }`}
                  />
                </div>
              </button>

              {/* Sub-items List with Collapse Animation */}
              {!isCollapsed && (
                <div className="px-1.5 pb-2 pt-1 space-y-0.5 animate-in fade-in-50 duration-150">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    // Check exact or base path match
                    const isExact = pathname === item.href;
                    const isBaseActive = item.href !== '/' && !item.href.includes('?') && pathname?.startsWith(item.href);
                    const isActive = isExact || isBaseActive;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <ItemIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold tabular-nums ml-1 flex-shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.badgeColor
                                ? `${item.badgeColor} text-white`
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Global Settings Link */}
        <div className="pt-1">
          <Link
            href="/settings"
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-smooth ${
              pathname === '/settings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 opacity-80" />
              <span>System Settings</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Status Card */}
      <div className="p-3 border-t border-border space-y-2 flex-shrink-0 bg-card">
        <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPaused ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span className="text-[11px] font-semibold text-foreground">
                {isPaused ? 'Monitoring Paused' : 'Monitoring Active'}
              </span>
            </div>
            <button
              onClick={togglePause}
              title={isPaused ? 'Resume Monitoring' : 'Pause Monitoring'}
              className="p-1 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Tracked Folders</span>
            <span className="font-medium text-foreground tabular-nums">{activeLocationsCount} active</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>Safety Mode</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" /> Enabled
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> SQLite Engine
          </span>
          <span className="text-emerald-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-2.5 h-2.5" /> Ready
          </span>
        </div>
      </div>
    </aside>
  );
}
