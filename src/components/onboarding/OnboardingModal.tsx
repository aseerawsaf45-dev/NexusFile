'use client';

import React, { useState } from 'react';
import {
  FolderTree,
  FolderSync,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
} from 'lucide-react';
import { PRESET_TEMPLATES } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['Downloads']);
  const [selectedTemplate, setSelectedTemplate] = useState('template_category');
  const [isFinishing, setIsFinishing] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const finishOnboarding = async () => {
    setIsFinishing(true);
    try {
      // Add default locations based on selection
      for (const locName of selectedLocations) {
        let defaultPath = '';
        if (locName === 'Downloads') {
          defaultPath = 'C:\\Users\\Awsaf\\Downloads';
        } else if (locName === 'Desktop') {
          defaultPath = 'C:\\Users\\Awsaf\\Desktop';
        } else if (locName === 'Documents') {
          defaultPath = 'C:\\Users\\Awsaf\\Documents';
        }

        if (defaultPath) {
          await apiClient.addLocation({
            name: locName,
            path: defaultPath,
            enabled: true,
            recursive: false,
            folderMode: 'monitor_contents',
            destinationTemplate: '{Category}/',
          }).catch(() => {});
        }
      }

      // Mark onboarding as completed in settings
      await apiClient.updateSettings({
        startMonitoringAutomatically: true,
      });

      onComplete();
    } finally {
      setIsFinishing(false);
    }
  };

  const toggleLocation = (name: string) => {
    if (selectedLocations.includes(name)) {
      setSelectedLocations(selectedLocations.filter((l) => l !== name));
    } else {
      setSelectedLocations([...selectedLocations, name]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content Area */}
        <div className="p-8 space-y-6">
          {step === 1 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center mx-auto shadow-lg">
                <FolderTree className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome to NexusFile</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  High-performance automated file management & storage studio for Windows. Set your rules once, and keep your workspace effortlessly organized.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 text-left">
                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <div className="text-xs font-bold text-foreground">100% Local & Safe</div>
                  <div className="text-[11px] text-muted-foreground">Files are processed locally. Zero cloud uploads.</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1">
                  <FolderSync className="w-5 h-5 text-brand-500" />
                  <div className="text-xs font-bold text-foreground">Real-Time Engine</div>
                  <div className="text-[11px] text-muted-foreground">Detects newly downloaded or added files instantly.</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div className="text-xs font-bold text-foreground">One-Click Undo</div>
                  <div className="text-[11px] text-muted-foreground">Full operation history with instant reversible undo.</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Select Folders to Monitor</h2>
                <p className="text-xs text-muted-foreground">Choose standard Windows locations to organize automatically.</p>
              </div>

              <div className="space-y-2.5 pt-2">
                {[
                  { name: 'Downloads', desc: 'Auto-organize PDF documents, installers, images, and archives as they download.' },
                  { name: 'Desktop', desc: 'Keep your desktop clutter-free by grouping files into clean subfolders.' },
                  { name: 'Documents', desc: 'Sort work documents, spreadsheets, and project files automatically.' },
                ].map((item) => {
                  const isChecked = selectedLocations.includes(item.name);
                  return (
                    <div
                      key={item.name}
                      onClick={() => toggleLocation(item.name)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                        isChecked
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-secondary/20 hover:bg-secondary/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="text-sm font-bold text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Choose Organization Structure</h2>
                <p className="text-xs text-muted-foreground">Select how folders should be structured when files are moved.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {PRESET_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                          : 'border-border bg-secondary/20 hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{tmpl.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                      <div className="pt-2">
                        <span className="px-2 py-0.5 rounded bg-secondary font-mono text-[10px] text-foreground">
                          {tmpl.pattern}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">You Are All Set!</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  NexusFile is configured to monitor {selectedLocations.length} folder{selectedLocations.length === 1 ? '' : 's'} using the selected organization template.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/40 border border-border text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monitored Locations:</span>
                  <span className="font-semibold text-foreground">{selectedLocations.join(', ') || 'None selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Collision Policy:</span>
                  <span className="font-semibold text-foreground">Keep Both (Auto-Suffix)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Background Service:</span>
                  <span className="font-semibold text-emerald-500">System Tray Active</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-16 px-8 border-t border-border bg-secondary/20 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onComplete}
              className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1"
            >
              Skip for now
            </button>
            <button
              onClick={handleNext}
              disabled={isFinishing}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>{step === 4 ? (isFinishing ? 'Activating...' : 'Start Monitoring') : 'Continue'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
