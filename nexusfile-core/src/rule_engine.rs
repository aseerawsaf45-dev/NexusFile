use crate::file_classifier::{FileCategory, FileClassifier};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConditionOperator {
    Equals,
    NotEquals,
    Contains,
    StartsWith,
    EndsWith,
    RegexMatches,
    GreaterThan,
    LessThan,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleCondition {
    pub field: String, // "extension", "category", "filename", "size", "project"
    pub operator: ConditionOperator,
    pub value: String,
    pub is_or: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuleAction {
    Move,
    Copy,
    Ignore,
    SendToReview,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationRule {
    pub name: String,
    pub priority: u32,
    pub enabled: bool,
    pub conditions: Vec<RuleCondition>,
    pub action: RuleAction,
    pub destination_pattern: String,
}

pub struct RuleEngine;

impl RuleEngine {
    pub fn evaluate<P: AsRef<Path>>(
        path: P,
        rules: &[OrganizationRule],
        default_pattern: &str,
    ) -> (Option<OrganizationRule>, String, FileCategory) {
        let p = path.as_ref();
        let category = FileClassifier::classify_path(p);
        let filename = p.file_name().and_then(|s| s.to_str()).unwrap_or("");

        // Sort rules by priority (ascending)
        let mut sorted_rules: Vec<&OrganizationRule> = rules.iter().filter(|r| r.enabled).collect();
        sorted_rules.sort_by_key(|r| r.priority);

        for rule in sorted_rules {
            if Self::matches_rule(p, filename, category, rule) {
                let resolved = Self::resolve_pattern(&rule.destination_pattern, filename, category, p);
                return (Some(rule.clone()), resolved, category);
            }
        }

        let fallback = Self::resolve_pattern(default_pattern, filename, category, p);
        (None, fallback, category)
    }

    pub fn matches_rule(
        path: &Path,
        filename: &str,
        category: FileCategory,
        rule: &OrganizationRule,
    ) -> bool {
        if rule.conditions.is_empty() {
            return true;
        }

        let mut matches = true;

        for (i, cond) in rule.conditions.iter().enumerate() {
            let cond_match = Self::eval_condition(path, filename, category, cond);
            if i == 0 {
                matches = cond_match;
            } else if cond.is_or {
                matches = matches || cond_match;
            } else {
                matches = matches && cond_match;
            }
        }

        matches
    }

    fn eval_condition(
        path: &Path,
        filename: &str,
        category: FileCategory,
        cond: &RuleCondition,
    ) -> bool {
        let actual = match cond.field.as_str() {
            "extension" => path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase(),
            "category" => category.as_str().to_lowercase(),
            "filename" => filename.to_lowercase(),
            _ => filename.to_lowercase(),
        };

        let target = cond.value.to_lowercase();

        match cond.operator {
            ConditionOperator::Equals => actual == target,
            ConditionOperator::NotEquals => actual != target,
            ConditionOperator::Contains => actual.contains(&target),
            ConditionOperator::StartsWith => actual.starts_with(&target),
            ConditionOperator::EndsWith => actual.ends_with(&target),
            ConditionOperator::RegexMatches => {
                if let Ok(reg) = Regex::new(&cond.value) {
                    reg.is_match(&actual)
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    pub fn resolve_pattern(
        pattern: &str,
        filename: &str,
        category: FileCategory,
        path: &Path,
    ) -> String {
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_uppercase();

        let project = FileClassifier::extract_project_keyword(path).unwrap_or_else(|| "General".to_string());

        let mut out = pattern.to_string();
        out = out.replace("{Category}", category.as_str());
        out = out.replace("{Extension}", &ext);
        out = out.replace("{Project}", &project);
        out = out.replace("{Year}", "2026");
        out = out.replace("{Month}", "10-October");

        // Clean any double slashes or directory traversal
        let cleaned = out.replace("..", "").replace("//", "/");
        format!("{}/{}", cleaned.trim_end_matches('/'), filename)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rule_priority_matching() {
        let rules = vec![
            OrganizationRule {
                name: "Rule Priority 2".to_string(),
                priority: 2,
                enabled: true,
                conditions: vec![RuleCondition {
                    field: "category".to_string(),
                    operator: ConditionOperator::Equals,
                    value: "Documents".to_string(),
                    is_or: false,
                }],
                action: RuleAction::Move,
                destination_pattern: "GeneralDocs/".to_string(),
            },
            OrganizationRule {
                name: "Rule Priority 1 (Specific PDF)".to_string(),
                priority: 1,
                enabled: true,
                conditions: vec![RuleCondition {
                    field: "extension".to_string(),
                    operator: ConditionOperator::Equals,
                    value: "pdf".to_string(),
                    is_or: false,
                }],
                action: RuleAction::Move,
                destination_pattern: "PDFs/{Year}/".to_string(),
            },
        ];

        let (matched, dest, cat) = RuleEngine::evaluate("invoice.pdf", &rules, "{Category}/");
        assert!(matched.is_some());
        assert_eq!(matched.unwrap().name, "Rule Priority 1 (Specific PDF)");
        assert_eq!(cat, FileCategory::Documents);
        assert_eq!(dest, "PDFs/2026/invoice.pdf");
    }
}
