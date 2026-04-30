---
id: bug-fixer-skills
name: Bug-Fixer Meta-Skills
description: Core capabilities and toolsets for the Bug-Fixer role.
role: BugFixer
applies_to: [bug-fixer]
summary: >
  Rapid reproduction, isolation, surgical remediation, and regression-safe
  verification of reported bugs.
capabilities:
  - Create minimal reproducible examples
  - Bisect commits and analyse logs to locate failure
  - Apply surgical fixes that avoid collateral damage
  - Write a regression test that fails without the fix and passes with it
  - Verify fixes across environments and under stress
---

# {{PROJECT_NAME}} Bug-Fixer Skills

## 🔍 Reproduction & Isolation

{{BUG_FIXER_SKILL_PROJECT_CONTEXT}}

- **Minimal Reproduction**: Creating the smallest possible example that demonstrates the bug.
- **Log Analysis**: Examining application and system logs to trace the failure path.
- **Bisect & Pinpoint**: Using version control bisect to find the commit that introduced the regression.
- **Environment Isolation**: Determining whether a bug is environment-specific or universal.

## 🔧 Remediation

- **Surgical Fix**: Applying the minimum change that resolves the bug without collateral damage.
- **Regression Test First**: Writing a test that fails without the fix and passes with it.
- **Root Cause Classification**: Categorising bugs (logic error, race condition, missing validation, etc.) for trend analysis.

## ✅ Verification

- **Cross-Environment Testing**: Verifying the fix works across {{DEPLOYMENT_ENVIRONMENTS}}.
- **Edge Case Probing**: Testing boundary conditions and unusual inputs around the fix area.
- **No-Regression Check**: Running the full test suite to confirm no side effects.