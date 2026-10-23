import path from 'node:path';
import fs from 'node:fs';
import { OrganizationRule, RuleCondition, FileCategory } from '../lib/types';
import { FileClassifier } from './classifier';

export interface RuleEvaluationResult {
  matchedRule: OrganizationRule | null;
  proposedDestination: string | null;
  category: FileCategory;
  action: 'move' | 'copy' | 'rename' | 'ignore' | 'review' | 'none';
  matchReason: string;
}

export class RuleEngine {
  /**
   * Evaluate a file against an ordered set of rules.
   */
  public static evaluate(
    filePath: string,
    rules: OrganizationRule[],
    defaultTemplate: string = '{Category}/',
    baseDestinationFolder?: string
  ): RuleEvaluationResult {
    const filename = path.basename(filePath);
    const classification = FileClassifier.classify(filePath);
    const category = classification.category;

    // Filter active rules, sorted by priority (1 is highest)
    const activeRules = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      if (this.matchesRule(filePath, filename, category, rule)) {
        const dest = this.resolveDestination(
          filePath,
          filename,
          category,
          rule.destinationPattern,
          rule.targetDirectory || baseDestinationFolder,
          classification.projectGuess
        );

        let action: RuleEvaluationResult['action'] = 'move';
        if (rule.actionType === 'copy') action = 'copy';
        else if (rule.actionType === 'ignore') action = 'ignore';
        else if (rule.actionType === 'send_to_review') action = 'review';
        else if (rule.actionType === 'rename_template') action = 'rename';

        return {
          matchedRule: rule,
          proposedDestination: dest,
          category,
          action,
          matchReason: `Matched rule "${rule.name}" (Priority ${rule.priority})`,
        };
      }
    }

    // Default fallback: apply default template
    const fallbackDest = this.resolveDestination(
      filePath,
      filename,
      category,
      defaultTemplate,
      baseDestinationFolder,
      classification.projectGuess
    );

    return {
      matchedRule: null,
      proposedDestination: fallbackDest,
      category,
      action: category === 'Unknown' ? 'review' : 'move',
      matchReason: 'No specific rule matched. Applied default category organization template.',
    };
  }

  /**
   * Check whether all conditions in a rule match the file.
   */
  public static matchesRule(
    filePath: string,
    filename: string,
    category: FileCategory,
    rule: OrganizationRule
  ): boolean {
    if (rule.conditions.length === 0) return true;

    let overallResult = true;

    for (let i = 0; i < rule.conditions.length; i++) {
      const cond = rule.conditions[i];
      const match = this.evalCondition(filePath, filename, category, cond);

      if (i === 0) {
        overallResult = match;
      } else {
        if (cond.logicalOp === 'OR') {
          overallResult = overallResult || match;
        } else {
          overallResult = overallResult && match;
        }
      }
    }

    return overallResult;
  }

  private static evalCondition(
    filePath: string,
    filename: string,
    category: FileCategory,
    cond: RuleCondition
  ): boolean {
    let actualValue: string | number = '';

    switch (cond.field) {
      case 'extension': {
        const dot = filename.lastIndexOf('.');
        actualValue = dot !== -1 ? filename.substring(dot + 1).toLowerCase() : '';
        break;
      }
      case 'category':
        actualValue = category;
        break;
      case 'filename':
        actualValue = filename;
        break;
      case 'parent_folder':
        actualValue = path.basename(path.dirname(filePath));
        break;
      case 'project_keyword':
        actualValue = FileClassifier.extractProjectKeyword(filename) || '';
        break;
      case 'file_size': {
        try {
          if (fs.existsSync(filePath)) {
            actualValue = fs.statSync(filePath).size;
          }
        } catch {
          actualValue = 0;
        }
        break;
      }
      default:
        actualValue = filename;
    }

    const targetVal = cond.value;

    switch (cond.operator) {
      case 'equals':
        return String(actualValue).toLowerCase() === targetVal.toLowerCase();
      case 'not_equals':
        return String(actualValue).toLowerCase() !== targetVal.toLowerCase();
      case 'contains':
        return String(actualValue).toLowerCase().includes(targetVal.toLowerCase());
      case 'not_contains':
        return !String(actualValue).toLowerCase().includes(targetVal.toLowerCase());
      case 'starts_with':
        return String(actualValue).toLowerCase().startsWith(targetVal.toLowerCase());
      case 'ends_with':
        return String(actualValue).toLowerCase().endsWith(targetVal.toLowerCase());
      case 'regex_matches':
        try {
          const reg = new RegExp(targetVal, 'i');
          return reg.test(String(actualValue));
        } catch {
          return false;
        }
      case 'greater_than': {
        const numActual = Number(actualValue);
        const numTarget = Number(targetVal);
        return !isNaN(numActual) && !isNaN(numTarget) && numActual > numTarget;
      }
      case 'less_than': {
        const numActual = Number(actualValue);
        const numTarget = Number(targetVal);
        return !isNaN(numActual) && !isNaN(numTarget) && numActual < numTarget;
      }
      case 'in_list': {
        const list = targetVal.split(',').map((s) => s.trim().toLowerCase());
        return list.includes(String(actualValue).toLowerCase());
      }
      default:
        return false;
    }
  }

  /**
   * Safely resolve destination folder and filename using template tags.
   */
  public static resolveDestination(
    filePath: string,
    filename: string,
    category: FileCategory,
    pattern: string,
    targetDirectory?: string,
    projectGuess?: string
  ): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const monthIndex = now.getMonth();
    const monthNames = [
      '01-January', '02-February', '03-March', '04-April', '05-May', '06-June',
      '07-July', '08-August', '09-September', '10-October', '11-November', '12-December'
    ];
    const month = monthNames[monthIndex];
    const day = String(now.getDate()).padStart(2, '0');

    const dot = filename.lastIndexOf('.');
    const ext = dot !== -1 ? filename.substring(dot + 1) : '';
    const parentFolder = path.basename(path.dirname(filePath));
    const project = projectGuess || 'General';

    // Replace placeholders safely
    let resolvedSubpath = pattern
      .replace(/{Category}/g, category)
      .replace(/{Extension}/g, ext.toUpperCase() || 'Other')
      .replace(/{Year}/g, year)
      .replace(/{Month}/g, month)
      .replace(/{Day}/g, day)
      .replace(/{OriginalFolder}/g, parentFolder)
      .replace(/{Project}/g, project);

    // Prevent directory traversal: strip out ".."
    resolvedSubpath = resolvedSubpath.replace(/\.\./g, '').replace(/^[\\\/]+/, '');

    const baseDir = targetDirectory || path.dirname(filePath);
    return path.join(baseDir, resolvedSubpath, filename);
  }

  /**
   * Test a rule against an arbitrary sample filename or path for the Rule Tester UI.
   */
  public static testRule(rule: OrganizationRule, samplePath: string): { matches: boolean; explanation: string } {
    const filename = path.basename(samplePath);
    const classification = FileClassifier.classify(samplePath);
    const matches = this.matchesRule(samplePath, filename, classification.category, rule);

    let explanation = '';
    if (matches) {
      explanation = `Rule "${rule.name}" matches! Category is "${classification.category}". Conditions satisfied.`;
    } else {
      explanation = `Rule "${rule.name}" does NOT match this path. Check extension, category, or regex conditions.`;
    }

    return { matches, explanation };
  }
}
