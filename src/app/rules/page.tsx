'use client';

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FlaskConical,
  ShieldAlert,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { RuleEditorModal } from '@/components/rules/RuleEditorModal';
import { apiClient } from '@/lib/api-client';
import { OrganizationRule } from '@/lib/types';

export default function RulesPage() {
  const [rules, setRules] = useState<OrganizationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<OrganizationRule | null>(null);

  const loadRules = async () => {
    try {
      const data = await apiClient.getRules();
      setRules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleCreateRule = () => {
    setSelectedRule(null);
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: OrganizationRule) => {
    setSelectedRule(rule);
    setIsEditorOpen(true);
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      try {
        await apiClient.deleteRule(id);
        loadRules();
      } catch (err: any) {
        alert(err?.message || 'Delete failed');
      }
    }
  };

  const handleToggleEnabled = async (rule: OrganizationRule) => {
    try {
      await apiClient.saveRule({
        ...rule,
        enabled: !rule.enabled,
      });
      loadRules();
    } catch {}
  };

  const handleMovePriority = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rules.length - 1) return;

    const newRules = [...rules];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newRules[index];
    newRules[index] = newRules[targetIdx];
    newRules[targetIdx] = temp;

    setRules(newRules);
    try {
      await apiClient.reorderRules(newRules.map((r) => r.id));
      loadRules();
    } catch {}
  };

  return (
    <AppShell
      title="Rules Engine"
      subtitle="Visual rule editor with deterministic priority ordering and conflict resolution"
      onRefresh={loadRules}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {rules.length} Active Rule{rules.length === 1 ? '' : 's'} (Evaluated top-to-bottom)
            </span>
          </div>

          <button
            onClick={handleCreateRule}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Rule</span>
          </button>
        </div>

        {/* Rules Table / Cards */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                <th className="py-3 px-3 w-16 text-center">Priority</th>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-3">Conditions</th>
                <th className="py-3 px-3">Target Destination Pattern</th>
                <th className="py-3 px-3 text-center">Action</th>
                <th className="py-3 px-3 text-right">Runs</th>
                <th className="py-3 px-4 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No rules defined yet. Create a rule to start routing specific files.
                  </td>
                </tr>
              ) : (
                rules.map((rule, idx) => (
                  <tr
                    key={rule.id}
                    className={`hover:bg-secondary/40 transition-colors ${
                      !rule.enabled ? 'opacity-60 bg-secondary/10' : ''
                    }`}
                  >
                    {/* Priority & Reorder Arrows */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-5 text-center font-bold text-foreground tabular-nums">
                          #{rule.priority}
                        </span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMovePriority(idx, 'up')}
                            disabled={idx === 0}
                            className="p-0.5 rounded hover:bg-secondary disabled:opacity-20 text-muted-foreground"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMovePriority(idx, 'down')}
                            disabled={idx === rules.length - 1}
                            className="p-0.5 rounded hover:bg-secondary disabled:opacity-20 text-muted-foreground"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Rule Name & Desc */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleEnabled(rule)}
                          title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                          className="flex-shrink-0"
                        >
                          {rule.enabled ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <div>
                          <div className="font-semibold text-foreground">{rule.name}</div>
                          {rule.description && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                              {rule.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Conditions summary */}
                    <td className="py-2.5 px-3 text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-foreground">
                        {rule.conditions.length} condition{rule.conditions.length === 1 ? '' : 's'}
                      </span>
                    </td>

                    {/* Pattern */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-foreground truncate max-w-xs">
                      {rule.destinationPattern}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand-500/10 text-brand-500">
                        {rule.actionType}
                      </span>
                    </td>

                    {/* Runs */}
                    <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                      {rule.executionCount}
                    </td>

                    {/* Manage actions */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditRule(rule)}
                          title="Edit rule"
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          title="Delete rule"
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        <RuleEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={loadRules}
          initialRule={selectedRule}
        />
      </div>
    </AppShell>
  );
}
