# The Watchman - Quick Reference Guide

## 🚀 Quick Start

```bash
# Run a security scan
npm run watchman

# Run with custom options
npm run watchman -- --timeout 600 --max-retries 5
```

## 📋 Common Commands

### Basic Scan
```bash
npm run watchman
```

### Scan with Longer Timeout (10 minutes)
```bash
npm run watchman -- --timeout 600
```

### Scan with More Retries
```bash
npm run watchman -- --max-retries 5
```

### Scan with Custom Token
```bash
npm run watchman -- --token YOUR_SNYK_TOKEN
```

### Show Help
```bash
npm run watchman -- --help
```

## 🔧 Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `--max-retries` | 3 | Maximum retry attempts |
| `--timeout` | 300 | Scan timeout in seconds |
| `--retry-delay` | 2000 | Initial retry delay in ms |
| `--token` | env var | Snyk API token |

## 📊 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | ✅ Success, no high priority vulnerabilities |
| 1 | ⚠️ Success, but high priority vulnerabilities found |
| 2 | ❌ Scan failed |

## 📁 Output Files

| File | Purpose |
|------|---------|
| `scan-results/scan-results.json` | Latest scan results (always current) |
| `scan-results/scan-<timestamp>.json` | Historical scan record |
| `scan-results/scan-error.json` | Error report (only on failure) |

## 🔍 Reading Scan Results

### Using jq (JSON processor)
```bash
# View summary
cat scan-results/scan-results.json | jq '.summary'

# View critical vulnerabilities
cat scan-results/scan-results.json | jq '.vulnerabilities[] | select(.severity=="critical")'

# Count high priority issues
cat scan-results/scan-results.json | jq '[.vulnerabilities[] | select(.severity=="critical" or .severity=="high")] | length'

# View scan metadata
cat scan-results/scan-results.json | jq '.metadata'
```

### Using Node.js
```javascript
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('scan-results/scan-results.json', 'utf8'));

console.log('Total vulnerabilities:', results.summary.total);
console.log('Critical:', results.summary.critical);
console.log('High:', results.summary.high);
console.log('Scan duration:', results.metadata.scanDuration, 'ms');
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Watchman Tests Only
```bash
npm test -- snyk.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

## 🐛 Troubleshooting

### "Snyk CLI not found"
```bash
npm install -g snyk
snyk --version
```

### "Scan timed out"
Increase the timeout:
```bash
npm run watchman -- --timeout 600  # 10 minutes
```

### "SNYK_TOKEN not found"
Set the environment variable:
```bash
export SNYK_TOKEN=your-token-here
# OR
npm run watchman -- --token your-token-here
```

### "Failed to save scan results"
Check directory permissions:
```bash
ls -la scan-results/
chmod 755 scan-results/
```

### Scan keeps retrying
This is normal for slow networks. To reduce retries:
```bash
npm run watchman -- --max-retries 1
```

## 💡 Tips & Best Practices

### 1. CI/CD Integration
```yaml
# GitHub Actions example
- name: Security Scan
  run: npm run watchman
  continue-on-error: true  # Don't fail build on vulnerabilities

- name: Check for Critical Issues
  run: |
    CRITICAL=$(cat scan-results/scan-results.json | jq '.summary.critical')
    if [ "$CRITICAL" -gt 0 ]; then
      echo "❌ Found $CRITICAL critical vulnerabilities!"
      exit 1
    fi
```

### 2. Scheduled Scans
```bash
# Add to crontab for daily scans at 2 AM
0 2 * * * cd /path/to/the-sentinel && npm run watchman
```

### 3. Monitoring Scan Performance
```bash
# Extract scan duration
cat scan-results/scan-results.json | jq '.metadata.scanDuration'

# Check if retries occurred
cat scan-results/scan-results.json | jq '.metadata.retryCount'
```

### 4. Filtering Results
```bash
# Only show fixable vulnerabilities
cat scan-results/scan-results.json | jq '.vulnerabilities[] | select(.fixedIn | length > 0)'

# Group by package
cat scan-results/scan-results.json | jq 'group_by(.packageName)'
```

## 📚 Programmatic Usage

### Basic Usage
```typescript
import { SnykScanner } from './src/agents/watchman/snyk';

const scanner = new SnykScanner();
const results = await scanner.test();
scanner.printSummary(results);
```

### Advanced Configuration
```typescript
import { SnykScanner } from './src/agents/watchman/snyk';

const scanner = new SnykScanner({
    token: 'your-snyk-token',
    maxRetries: 5,
    retryDelayMs: 3000,
    timeoutMs: 600000  // 10 minutes
});

try {
    const results = await scanner.test();
    
    // Filter high priority
    const critical = scanner.filterHighPriority(results);
    
    if (critical.length > 0) {
        console.log(`Found ${critical.length} critical/high issues`);
        critical.forEach(v => {
            console.log(`- ${v.title} in ${v.packageName}@${v.version}`);
        });
    }
} catch (error) {
    console.error('Scan failed:', error.message);
}
```

### Custom Error Handling
```typescript
import { SnykScanner } from './src/agents/watchman/snyk';

const scanner = new SnykScanner();

try {
    const results = await scanner.test();
    
    // Check metadata for issues
    if (results.metadata?.retryCount > 0) {
        console.warn(`Scan required ${results.metadata.retryCount} retries`);
    }
    
    if (results.metadata?.errors && results.metadata.errors.length > 0) {
        console.warn('Scan encountered errors:', results.metadata.errors);
    }
    
} catch (error) {
    // Scan completely failed
    console.error('Fatal scan error:', error);
    
    // Check if error report was saved
    const errorReport = fs.readFileSync('scan-results/scan-error.json', 'utf8');
    console.log('Error details:', errorReport);
}
```

## 🔗 Related Documentation

- [Full README](./src/agents/watchman/README.md) - Comprehensive documentation
- [Architecture](./WATCHMAN_ARCHITECTURE.md) - Visual flow diagrams
- [Improvements](./WATCHMAN_IMPROVEMENTS.md) - Detailed changelog
- [Multi-Agent Architecture](./MULTI_AGENT_ARCHITECTURE.md) - Overall system design

## 🆘 Getting Help

1. Check the [README](./src/agents/watchman/README.md) for detailed documentation
2. Review the [Troubleshooting](#-troubleshooting) section above
3. Check Snyk documentation: https://docs.snyk.io/
4. Review scan-error.json for detailed error information

## 📝 Quick Checklist

Before running a scan:
- [ ] Snyk CLI installed (`npm install -g snyk`)
- [ ] Snyk authenticated (`snyk auth` or set `SNYK_TOKEN`)
- [ ] scan-results directory exists (created automatically)
- [ ] Sufficient disk space for scan results

For CI/CD integration:
- [ ] Set `SNYK_TOKEN` as environment variable
- [ ] Configure appropriate timeout for your project size
- [ ] Set up artifact storage for scan results
- [ ] Configure exit code handling based on severity

---

**The Watchman** - *Always vigilant, always watching.* 🛡️
