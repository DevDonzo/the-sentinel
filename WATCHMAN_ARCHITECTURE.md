# The Watchman - Improved Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     THE WATCHMAN AGENT                          │
│                  Security Scanner (Enhanced)                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  INPUT: Source Code + Snyk CLI                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: CLI Version Check (with timeout: 10s)                  │
│  ├─ Retry on timeout/network errors                             │
│  ├─ Exponential backoff: 2s → 4s → 8s                          │
│  └─ Max retries: 3 (configurable)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Execute Snyk Scan (with timeout: 5min)                 │
│  ├─ Command: snyk test --json                                   │
│  ├─ Buffer: 10MB for large outputs                              │
│  ├─ Retry on timeout/network errors                             │
│  └─ Track scan duration                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Parse JSON Output                                      │
│  ├─ Validate JSON is parseable                                  │
│  ├─ Extract vulnerabilities                                     │
│  ├─ Calculate summary statistics                                │
│  └─ Add metadata (duration, retries, errors)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Validate Scan Result                                   │
│  ├─ Check required fields exist                                 │
│  ├─ Validate data types                                         │
│  ├─ Verify severity values                                      │
│  └─ Ensure vulnerability completeness                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Atomic File Write                                      │
│  ├─ Write to temporary file (.tmp)                              │
│  ├─ Double-check JSON is parseable                              │
│  ├─ Atomically rename to final file                             │
│  └─ Clean up on error                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTPUT: scan-results/scan-results.json (Source of Truth)       │
│  ├─ scan-results.json (latest)                                  │
│  ├─ scan-<timestamp>.json (history)                             │
│  └─ scan-error.json (on failure)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  INTERFACE A: JSON → The Engineer (Fixer Agent)                 │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                        ERROR HANDLING FLOW
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  Error Detected                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Is Retryable?  │
                    │  (timeout/net)  │
                    └─────────────────┘
                       │           │
                  YES  │           │  NO
                       ▼           ▼
            ┌──────────────┐  ┌──────────────┐
            │ Retry with   │  │ Create       │
            │ Backoff      │  │ Fallback     │
            │ (2s→4s→8s)   │  │ Result       │
            └──────────────┘  └──────────────┘
                       │           │
                       ▼           ▼
            ┌──────────────────────────┐
            │ Save Error Metadata      │
            │ - scanDuration           │
            │ - retryCount             │
            │ - errors[]               │
            └──────────────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │ Write scan-error.json    │
            └──────────────────────────┘


═══════════════════════════════════════════════════════════════════
                    CONFIGURATION OPTIONS
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  ScannerOptions {                                                │
│    token?: string           // Snyk API token                    │
│    maxRetries?: number      // Default: 3                        │
│    retryDelayMs?: number    // Default: 2000 (2s)                │
│    timeoutMs?: number       // Default: 300000 (5min)            │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                        OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  {                                                               │
│    "timestamp": "2026-01-16T15:53:23.000Z",                      │
│    "vulnerabilities": [                                          │
│      {                                                           │
│        "id": "SNYK-JS-...",                                      │
│        "title": "...",                                           │
│        "severity": "high|critical|medium|low",                   │
│        "packageName": "...",                                     │
│        "version": "...",                                         │
│        "fixedIn": [...],                                         │
│        "description": "...",                                     │
│        "cvssScore": 7.4                                          │
│      }                                                           │
│    ],                                                            │
│    "summary": {                                                  │
│      "total": 10,                                                │
│      "critical": 2,                                              │
│      "high": 3,                                                  │
│      "medium": 3,                                                │
│      "low": 2                                                    │
│    },                                                            │
│    "metadata": {                                                 │
│      "scanDuration": 12345,                                      │
│      "retryCount": 1,                                            │
│      "errors": ["..."]                                           │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                    KEY IMPROVEMENTS SUMMARY
═══════════════════════════════════════════════════════════════════

✅ Retry Mechanism
   - Exponential backoff (2s → 4s → 8s)
   - Configurable max retries (default: 3)
   - Smart retry logic (timeout/network only)

✅ Timeout Handling
   - Configurable timeout (default: 5min)
   - Separate CLI check timeout (10s)
   - Clear timeout error messages

✅ Robust JSON Output
   - Pre-save validation
   - Schema validation
   - Type checking
   - Severity validation
   - Double-check parsing

✅ Atomic File Operations
   - Write to .tmp first
   - Validate before rename
   - Atomic rename operation
   - Cleanup on error

✅ Enhanced Error Handling
   - Fallback results
   - Error metadata
   - Error reports
   - Graceful degradation

✅ Metadata Tracking
   - Scan duration
   - Retry count
   - Error history
