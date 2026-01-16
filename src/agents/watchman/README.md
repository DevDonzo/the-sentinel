# 🛡️ The Watchman - Security Scanner Agent

## Overview

The Watchman is The Sentinel's surveillance and detection agent. It scans the codebase for security vulnerabilities using industry-standard tools like Snyk, normalizes the data, and outputs a standardized JSON format that serves as the **Source of Truth** for downstream agents.

## Architecture Role

According to the Multi-Agent Architecture:
- **Role**: Surveillance & Detection
- **Inputs**: Source Code, Snyk CLI
- **Outputs**: `scan-results/scan-results.json` (The Source of Truth)
- **Work Mode**: Read-Only
- **Trigger**: Schedule (Cron) or Commit (Push)

## Features

### ✅ Production-Grade Reliability

1. **Retry Mechanism with Exponential Backoff**
   - Configurable retry attempts (default: 3)
   - Exponential backoff strategy (2s, 4s, 8s)
   - Intelligent retry logic for timeout and network errors
   - Detailed logging of retry attempts

2. **Timeout Handling**
   - Configurable timeout (default: 5 minutes)
   - Graceful timeout detection and reporting
   - Separate timeout for CLI version check (10 seconds)
   - Clear error messages for timeout scenarios

3. **Robust JSON Output**
   - Pre-save validation of scan results
   - Atomic file writes using temporary files
   - Double-check JSON parseability
   - Fallback error reporting mechanism
   - Timestamped scan history

4. **Comprehensive Error Handling**
   - Network error detection and retry
   - Timeout error detection and retry
   - JSON parsing validation
   - Fallback scan results on failure
   - Error metadata tracking

## Usage

### Basic Usage

```typescript
import { SnykScanner } from './agents/watchman/snyk';

// Create scanner with default options
const scanner = new SnykScanner();

// Run scan
try {
    const results = await scanner.test();
    scanner.printSummary(results);
} catch (error) {
    console.error('Scan failed:', error);
}
```

### Advanced Configuration

```typescript
import { SnykScanner } from './agents/watchman/snyk';

// Create scanner with custom options
const scanner = new SnykScanner({
    token: 'your-snyk-token',      // Optional: Snyk API token
    maxRetries: 5,                  // Optional: Max retry attempts (default: 3)
    retryDelayMs: 3000,             // Optional: Initial retry delay (default: 2000ms)
    timeoutMs: 600000               // Optional: Scan timeout (default: 300000ms = 5min)
});

const results = await scanner.test();

// Filter high-priority vulnerabilities
const critical = scanner.filterHighPriority(results);
console.log(`Found ${critical.length} critical/high vulnerabilities`);
```

## Output Format

### Standard Scan Result

```json
{
  "timestamp": "2026-01-16T15:53:23.000Z",
  "vulnerabilities": [
    {
      "id": "SNYK-JS-LODASH-590103",
      "title": "Prototype Pollution",
      "severity": "high",
      "packageName": "lodash",
      "version": "4.17.15",
      "fixedIn": ["4.17.21"],
      "description": "...",
      "cvssScore": 7.4
    }
  ],
  "summary": {
    "total": 1,
    "critical": 0,
    "high": 1,
    "medium": 0,
    "low": 0
  },
  "metadata": {
    "scanDuration": 12345,
    "retryCount": 0,
    "errors": []
  }
}
```

### Error Scan Result

When a scan fails, a fallback result is saved:

```json
{
  "timestamp": "2026-01-16T15:53:23.000Z",
  "vulnerabilities": [],
  "summary": {
    "total": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "metadata": {
    "scanDuration": 5000,
    "retryCount": 3,
    "errors": [
      "Snyk scan timed out after 300s"
    ]
  }
}
```

## File Outputs

The scanner creates the following files in `scan-results/`:

1. **`scan-results.json`** - Latest scan results (always up-to-date)
2. **`scan-<timestamp>.json`** - Timestamped scan history
3. **`scan-error.json`** - Error report (only created on failure)

## Error Handling

### Retry Logic

The scanner automatically retries on:
- **Timeout errors**: When Snyk takes too long to respond
- **Network errors**: Connection failures (ENOTFOUND, ECONNREFUSED)

The scanner does NOT retry on:
- JSON parsing errors
- Validation errors
- CLI not found errors

### Exponential Backoff

Retry delays follow exponential backoff:
- Attempt 1: Initial delay (default: 2s)
- Attempt 2: 2x delay (default: 4s)
- Attempt 3: 4x delay (default: 8s)

### Atomic File Writes

To prevent corrupted JSON files:
1. Write to temporary file (`.tmp` extension)
2. Validate JSON is parseable
3. Atomically rename to final filename
4. Clean up temporary files on error

## Integration with The Sentinel

### Interface Contract

The Watchman outputs to `scan-results/scan-results.json`, which serves as **Interface A** in the Multi-Agent Architecture:

```
Scanner (Watchman) → scan-results.json → Engineer (Fixer)
```

The Engineer agent reads this file to determine which vulnerabilities to fix.

### Validation Guarantees

The scanner guarantees that `scan-results.json` will:
- Always be valid JSON
- Always have required fields (`timestamp`, `vulnerabilities`, `summary`)
- Always have valid severity values (`low`, `medium`, `high`, `critical`)
- Always have complete vulnerability objects

## Prerequisites

1. **Snyk CLI**: Install globally
   ```bash
   npm install -g snyk
   ```

2. **Snyk Authentication**: Set token or login
   ```bash
   export SNYK_TOKEN=your-token
   # OR
   snyk auth
   ```

## Environment Variables

- `SNYK_TOKEN`: Optional Snyk API token for authentication

## Logging

The scanner provides detailed logging:
- 🔍 Scan start
- 🔄 Retry attempts with reasons
- ⚠️ Warnings and errors
- 📊 Parsing progress
- 💾 File save operations
- ✅ Scan completion with duration

## Future Enhancements

Potential improvements for The Watchman:
- [ ] Support for additional scanners (npm audit, Semgrep, CodeQL)
- [ ] Parallel scanning with multiple tools
- [ ] Scan result deduplication
- [ ] Historical trend analysis
- [ ] Configurable severity thresholds
- [ ] Webhook notifications on critical findings
- [ ] Integration with CI/CD pipelines

## Testing

To test the scanner:

```bash
# Run a test scan
npm run watchman:scan

# Or use ts-node directly
npx ts-node src/agents/watchman/index.ts
```

## Troubleshooting

### "Snyk CLI not found"
```bash
npm install -g snyk
snyk --version
```

### "Scan timed out"
Increase the timeout:
```typescript
const scanner = new SnykScanner({ timeoutMs: 600000 }); // 10 minutes
```

### "Failed to save scan results"
Check directory permissions:
```bash
ls -la scan-results/
chmod 755 scan-results/
```

## Contributing

When modifying The Watchman:
1. Maintain the output format contract
2. Add tests for new features
3. Update this README
4. Ensure backward compatibility with The Engineer

---

**The Watchman** - *Always vigilant, always watching.* 🛡️
