# SPEC 002: Autonomous Remediation (Auto-Fix)

## Objective
Automatically diagnose high-severity vulnerabilities identified by the scanner and apply Code/Dependency fixes.

## Tasks
1. **Input Analysis**: Read `scan-results/scan-results.json`.
2. **Prioritization**: Sort vulnerabilities by Severity (Critical > High) and CVSS score.
3. **Branching**:
    - Format: `sentinel/fix-<package>-<id>`.
    - Check if branch already exists (idempotency).
4. **Patching**:
    - For Dependency Updates: Modify `package.json` / `package-lock.json`.
    - For Code Fixes: Apply patch to specific files (future).
5. **Verification**:
    - Run `npm install`.
    - Run `npm test`.
    - Re-run `snyk test` (if possible) to confirm vulnerability is gone.
6. **Output**: passing git branch ready for PR.
