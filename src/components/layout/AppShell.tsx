'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { OnboardingModal } from '../onboarding/OnboardingModal';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
}

export function AppShell({ title, subtitle, children, onRefresh }: AppShellProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    // Check if user completed onboarding
    if (typeof window !== 'undefined') {
      const onboarded = localStorage.getItem('sortwise_onboarded_v1');
      if (!onboarded) {
        setIsOnboardingOpen(true);
      }
    }
  }, []);

  const handleCompleteOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sortwise_onboarded_v1', 'true');
    }
    setIsOnboardingOpen(false);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased select-none font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Persistent Header */}
        <Header
          title={title}
          subtitle={subtitle}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onRefresh={onRefresh}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* First-Run Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={handleCompleteOnboarding}
      />
    </div>
  );
}
