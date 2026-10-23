'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FlaskConical,
} from 'lucide-react';
import { OrganizationRule, RuleCondition, CollisionPolicy, RuleActionType } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { apiClient } from '@/lib/api-client';

interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialRule?: OrganizationRule | null;
}

export function RuleEditorModal({ isOpen, onClose, onSave, initialRule }: RuleEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'tester'>('editor');
  const [name, setName] = useState(initialRule?.name || '');
  const [description, setDescription] = useState(initialRule?.description || '');
  const [priority, setPriority] = useState(initialRule?.priority || 1);
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  const [actionType, setActionType] = useState<RuleActionType>(initialRule?.actionType || 'move');
  const [destinationPattern, setDestinationPattern] = useState(initialRule?.destinationPattern || '{Category}/{Year}/');
  const [targetDirectory, setTargetDirectory] = useState(initialRule?.targetDirectory || '');
  const [collisionPolicy, setCollisionPolicy] = useState<CollisionPolicy>(initialRule?.collisionPolicy || 'keep_both');
  const [dryRunOnly, setDryRunOnly] = useState(initialRule?.dryRunOnly || false);
  const [conditions, setConditions] = useState<RuleCondition[]>(
    initialRule?.conditions?.length
      ? initialRule.conditions
      : [
          {
            id: 'c_' + Math.random().toString(36).substring(2, 7),
            field: 'category',
            operator: 'equals',
            value: 'Documents',
            logicalOp: 'AND',
          },
        ]
  );

  // Tester state
  const [testSamplePath, setTestSamplePath] = useState('C:\\Users\\User\\Downloads\\Report_2026.pdf');
  const [testResult, setTestResult] = useState<{ matches: boolean; explanation: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        id: 'c_' + Math.random().toString(36).substring(2, 7),
        field: 'extension',
        operator: 'equals',
        value: 'pdf',
        logicalOp: 'AND',
      },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, key: keyof RuleCondition, val: any) => {
    const next = [...conditions];
    (next[index] as any)[key] = val;
    setConditions(next);
  };

  const insertVariable = (tag: string) => {
    setDestinationPattern((prev) => prev + tag);
  };

  const handleTestRule = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const mockRule: any = {
        name,
        priority,
        enabled,
        conditions,
        actionType,
        destinationPattern,
        targetDirectory: targetDirectory.trim() || undefined,
        collisionPolicy,
      };
      const res = await apiClient.testRule(mockRule, testSamplePath);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ matches: false, explanation: err?.message || 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a rule name.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await apiClient.saveRule({
        id: initialRule?.id,
        name,
        description,
        priority: Number(priority) || 1,
        enabled,
        actionType,
        destinationPattern,
        targetDirectory: targetDirectory.trim() || undefined,
        collisionPolicy,
        dryRunOnly,
        conditions,
      });
      onSave();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save rule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {initialRule ? 'Edit Organization Rule' : 'Create New Organization Rule'}
            </h2>
            <p className="text-xs text-muted-foreground">Define conditions and target folder routing</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-secondary p-1 rounded-lg border border-border text-xs font-medium">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'editor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Rule Builder
              </button>
              <button
                onClick={() => setActiveTab('tester')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'tester' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-brand-500" />
                <span>Test Rule</span>
              </button>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'editor' ? (
            <>
              {/* General Rule Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-foreground">Rule Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Invoices & Receipts"
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Priority (1 = Highest)</label>
                  <input
                    type="number"
                    min="1"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the purpose of this rule"
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
                />
              </div>

              {/* Conditions Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Conditions ({conditions.length})
                  </label>
                  <button
                    onClick={handleAddCondition}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Condition</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {conditions.map((cond, idx) => (
                    <div
                      key={cond.id}
                      className="p-3 rounded-lg border border-border bg-secondary/30 flex items-center gap-2 text-xs"
                    >
                      {idx > 0 && (
                        <select
                          value={cond.logicalOp}
                          onChange={(e) => updateCondition(idx, 'logicalOp', e.target.value)}
                          className="px-2 py-1.5 bg-background border border-border rounded text-xs font-semibold text-foreground"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )}

                      <select
                        value={cond.field}
                        onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                        className="px-2.5 py-1.5 bg-background border border-border rounded text-xs text-foreground"
                      >
                        <option value="category">Category</option>
                        <option value="extension">Extension</option>
                        <option value="filename">Filename</option>
                        <option value="project_keyword">Project Keyword</option>
                        <option value="parent_folder">Parent Folder</option>
                        <option value="file_size">File Size (Bytes)</option>
                      </select>

                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                        className="px-2.5 py-1.5 bg-background border border-border rounded text-xs text-foreground"
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">does not equal</option>
                        <option value="contains">contains</option>
                        <option value="starts_with">starts with</option>
                        <option value="ends_with">ends with</option>
                        <option value="regex_matches">regex matches</option>
                        <option value="greater_than">greater than</option>
                        <option value="less_than">less than</option>
                        <option value="in_list">in comma list</option>
                      </select>

                      {cond.field === 'category' ? (
                        <select
                          value={cond.value}
                          onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded text-xs text-foreground"
                        >
                          {DEFAULT_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={cond.value}
                          onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                          placeholder="Value..."
                          className="flex-1 px-3 py-1.5 bg-background border border-border rounded text-xs text-foreground outline-none"
                        />
                      )}

                      <button
                        onClick={() => handleRemoveCondition(idx)}
                        disabled={conditions.length === 1}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action & Routing */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Action</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as RuleActionType)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                  >
                    <option value="move">Move to destination</option>
                    <option value="copy">Copy to destination</option>
                    <option value="send_to_review">Send to Review Queue</option>
                    <option value="ignore">Ignore (Do nothing)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Collision Policy</label>
                  <select
                    value={collisionPolicy}
                    onChange={(e) => setCollisionPolicy(e.target.value as CollisionPolicy)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground"
                  >
                    <option value="keep_both">Keep both (auto-suffix unique name)</option>
                    <option value="skip">Skip (leave file in place)</option>
                    <option value="overwrite_with_confirmation">Overwrite</option>
                  </select>
                </div>
              </div>

              {/* Destination Pattern */}
              {actionType !== 'ignore' && actionType !== 'send_to_review' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Destination Folder Structure</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {['{Category}', '{Year}', '{Month}', '{Extension}', '{Project}'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertVariable(tag + '/')}
                          className="px-2 py-0.5 rounded bg-secondary text-[10px] font-mono hover:bg-secondary/80 border border-border text-foreground transition-colors"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={destinationPattern}
                    onChange={(e) => setDestinationPattern(e.target.value)}
                    placeholder="e.g. {Category}/{Year}/{Month}/"
                    className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg font-mono text-foreground outline-none focus:border-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Example result: <span className="font-mono text-foreground">Documents/2026/10-October/Resume.pdf</span>
                  </p>

                  {/* Manual Target Directory */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Custom Destination Directory (Optional)
                      </label>
                      <span className="text-[10px] text-muted-foreground">Default: inside monitored folder</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={targetDirectory}
                        onChange={(e) => setTargetDirectory(e.target.value)}
                        placeholder="e.g. D:\Organized or C:\Users\Awsaf\Torrents"
                        className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg font-mono text-foreground outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const picked = await apiClient.pickFolder('Select Custom Destination Directory');
                          if (picked) setTargetDirectory(picked);
                        }}
                        className="px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        Browse...
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      If set, files matching this rule are sent to this explicit directory on any drive.
                    </p>
                  </div>
                </div>
              )}

              {/* Dry run switch */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20">
                <div>
                  <div className="text-xs font-semibold text-foreground">Dry-Run Only</div>
                  <div className="text-[11px] text-muted-foreground">Test this rule safely without actually moving files</div>
                </div>
                <input
                  type="checkbox"
                  checked={dryRunOnly}
                  onChange={(e) => setDryRunOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </div>
            </>
          ) : (
            /* Tester Tab */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <FlaskConical className="w-4 h-4 text-brand-500" />
                  <span>Rule Simulation Tester</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Test your rule against a sample file path to confirm conditions and verify destination before activating.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Sample File Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testSamplePath}
                    onChange={(e) => setTestSamplePath(e.target.value)}
                    placeholder="Enter file path to test..."
                    className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg font-mono text-foreground outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleTestRule}
                    disabled={isTesting}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Test</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    testResult.matches
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.matches ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Match Confirmed</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>No Match</span>
                      </>
                    )}
                  </div>
                  <p>{testResult.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-16 px-6 border-t border-border bg-secondary/20 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
