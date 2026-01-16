# SPEC 001: Initial Security Baseline

## Objective
Run a baseline security scan using Snyk to identify high-priority vulnerabilities.

## Tasks
1. Run `snyk test --json`.
2. Parse output for "High" or "Critical" severity issues.
3. Log findings to `scan-results.json`.
