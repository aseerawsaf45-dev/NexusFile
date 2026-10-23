'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api-client';
import { OrganizationTemplate } from '@/lib/types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<OrganizationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // New template state
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pattern, setPattern] = useState('{Category}/{Year}/');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('template_category');

  const loadTemplates = async () => {
    try {
      const data = await apiClient.getTemplates();
      setTemplates(data);

      const settings = await apiClient.getSettings();
      if (settings.defaultDestinationTemplate) {
        const found = data.find((t) => t.pattern === settings.defaultDestinationTemplate);
        if (found) setActiveTemplateId(found.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSetActive = async (t: OrganizationTemplate) => {
    setActiveTemplateId(t.id);
    try {
      await apiClient.updateSettings({
        defaultDestinationTemplate: t.pattern,
      });
    } catch (err: any) {
      alert(err?.message || 'Update failed');
    }
  };

  const handleSaveCustom = async () => {
    if (!name.trim()) return;
    try {
      await apiClient.saveTemplate({
        id: 'tmpl_' + Date.now(),
        name,
        description,
        pattern,
        isPreset: false,
      });
      setIsCreating(false);
      setName('');
      setDescription('');
      loadTemplates();
    } catch (err: any) {
      alert(err?.message || 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this template?')) {
      try {
        await apiClient.deleteTemplate(id);
        loadTemplates();
      } catch (err: any) {
        alert(err?.message || 'Delete failed');
      }
    }
  };

  const getPreviewResult = (p: string) => {
    return p
      .replace(/{Category}/g, 'Documents')
      .replace(/{Year}/g, '2026')
      .replace(/{Month}/g, '10-October')
      .replace(/{Day}/g, '23')
      .replace(/{Extension}/g, 'PDF')
      .replace(/{OriginalFolder}/g, 'Downloads')
      .replace(/{Project}/g, 'FabricX') + 'Resume.pdf';
  };

  return (
    <AppShell
      title="Organization Templates"
      subtitle="Configure folder structures and variable placeholders for automated file destinations"
      onRefresh={loadTemplates}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Action */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground">
              Select the active default template or create custom directory structures
            </h3>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Template</span>
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => {
            const isActive = activeTemplateId === t.id;
            return (
              <div
                key={t.id}
                className={`p-5 rounded-xl border bg-card shadow-sm space-y-3 transition-all relative ${
                  isActive ? 'border-primary ring-1 ring-primary' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{t.name}</span>
                      {t.isPreset && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary text-muted-foreground">
                          PRESET
                        </span>
                      )}
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Default Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>

                  {!t.isPreset && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Pattern Template
                  </div>
                  <div className="font-mono text-xs text-foreground font-semibold">{t.pattern}</div>
                  <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                    <span className="truncate">Sample: {getPreviewResult(t.pattern)}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  {!isActive && (
                    <button
                      onClick={() => handleSetActive(t)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Custom Template Modal */}
        {isCreating && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="h-16 px-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Create Custom Template</h3>
                  <p className="text-xs text-muted-foreground">Construct a directory path using safe variable tags</p>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground"
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Template Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. By Project and Extension"
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg outline-none text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain the structure"
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg outline-none text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Structure Pattern</label>
                    <div className="flex gap-1 flex-wrap">
                      {['{Category}', '{Year}', '{Month}', '{Day}', '{Extension}', '{Project}'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setPattern((p) => p + tag + '/')}
                          className="px-1.5 py-0.5 rounded bg-secondary font-mono text-[10px] border border-border hover:bg-secondary/80 text-foreground"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg font-mono text-foreground outline-none"
                  />
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border border-border text-xs space-y-1">
                  <div className="text-[11px] font-semibold text-muted-foreground">Live Simulation Preview:</div>
                  <div className="font-mono text-[11px] text-foreground">{getPreviewResult(pattern)}</div>
                </div>
              </div>

              <div className="h-16 px-6 border-t border-border bg-secondary/20 flex items-center justify-between">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustom}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
