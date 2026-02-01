# Nmap Configuration Guide

Complete reference for configuring Nmap scans in Warden DAST mode.

## Table of Contents

- [Overview](#overview)
- [Configuration Options](#configuration-options)
- [Scan Types](#scan-types)
- [Timing Templates](#timing-templates)
- [Advanced Options](#advanced-options)
- [Examples](#examples)

## Overview

Nmap is the primary network discovery and service detection tool in Warden's DAST mode. It identifies open ports, running services, and their versions.

## Configuration Options

### Basic Structure

```json
{
  "dast": {
    "nmap": {
      "enabled": true,
      "scanType": "standard",
      "portRange": "1-1000",
      "timing": 3,
      "options": ["-sV"],
      "outputFormat": "xml"
    }
  }
}
```

### `enabled`

**Type**: `boolean`
**Default**: `true`
**Description**: Enable/disable Nmap scanning

```json
"enabled": true
```

### `scanType`

**Type**: `string`
**Options**: `"quick"`, `"standard"`, `"comprehensive"`, `"stealth"`
**Default**: `"standard"`
**Description**: Predefined scan profile

#### Scan Type Details

| Type | Ports Scanned | Speed | Flags | Use Case |
|------|--------------|-------|-------|----------|
| `quick` | Top 100 | Fast | `-T4 -F` | Quick checks, CI/CD |
| `standard` | 1-1000 | Medium | `-T3 -sV` | Regular scans, balanced |
| `comprehensive` | All specified | Slow | `-T3 -sV -sC -A` | Deep analysis, thorough |
| `stealth` | All specified | Very Slow | `-T2 -sS -Pn` | Avoid detection, careful |

### `portRange`

**Type**: `string`
**Default**: `"1-1000"`
**Description**: Ports to scan

#### Format Options

```json
// Single port
"portRange": "80"

// Multiple ports
"portRange": "22,80,443"

// Port range
"portRange": "1-1000"

// Combined
"portRange": "22,80,443,8000-9000"

// Common ports only
"portRange": "1-1024"

// All ports (slow!)
"portRange": "1-65535"
```

#### Common Port Ranges

```json
// Web servers
"portRange": "80,443,8080,8443"

// Databases
"portRange": "3306,5432,27017,6379"

// Development
"portRange": "3000,5000,8000,9000"

// Standard services
"portRange": "1-1024"
```

### `timing`

**Type**: `number`
**Range**: `0-5`
**Default**: `3`
**Description**: Nmap timing template

| Value | Name | Speed | Use Case |
|-------|------|-------|----------|
| `0` | Paranoid | Extremely slow | IDS evasion |
| `1` | Sneaky | Very slow | IDS evasion |
| `2` | Polite | Slow | Avoid load |
| `3` | Normal | Medium | Default |
| `4` | Aggressive | Fast | Trusted networks |
| `5` | Insane | Very fast | Local scans only |

### `options`

**Type**: `string[]`
**Default**: `["-sV"]`
**Description**: Additional Nmap command-line flags

#### Common Options

```json
// Version detection
"options": ["-sV"]

// OS detection
"options": ["-O"]

// Script scanning
"options": ["-sC"]

// Aggressive (version + OS + scripts)
"options": ["-A"]

// TCP SYN scan (requires root)
"options": ["-sS"]

// TCP connect scan (no root)
"options": ["-sT"]

// UDP scan
"options": ["-sU"]

// Skip ping (assume host is up)
"options": ["-Pn"]

// Combined
"options": ["-sV", "-sC", "-Pn"]
```

### `outputFormat`

**Type**: `string`
**Options**: `"xml"`, `"normal"`
**Default**: `"xml"`
**Description**: Output format

**Note**: Warden parses XML output. Keep this as `"xml"`.

## Scan Types

### Quick Scan

Fast scan for CI/CD pipelines or frequent checks.

```json
{
  "scanType": "quick",
  "portRange": "1-1000",
  "timing": 4,
  "options": ["-sV"]
}
```

**Estimated Duration**: 30-60 seconds
**Use Case**: Continuous monitoring, quick checks

### Standard Scan

Balanced scan for regular security audits.

```json
{
  "scanType": "standard",
  "portRange": "1-1000",
  "timing": 3,
  "options": ["-sV"]
}
```

**Estimated Duration**: 2-5 minutes
**Use Case**: Weekly/monthly scans, most common

### Comprehensive Scan

Deep scan with service detection, scripts, and OS detection.

```json
{
  "scanType": "comprehensive",
  "portRange": "1-1000",
  "timing": 3,
  "options": ["-sV", "-sC", "-A"]
}
```

**Estimated Duration**: 10-20 minutes
**Use Case**: Quarterly audits, detailed analysis

### Stealth Scan

Slow, careful scan to avoid detection.

```json
{
  "scanType": "stealth",
  "portRange": "1-1000",
  "timing": 2,
  "options": ["-sS", "-Pn"]
}
```

**Estimated Duration**: 30+ minutes
**Use Case**: Security assessments, IDS testing

**Note**: Requires root/administrator privileges.

## Timing Templates

### Performance vs Stealth Trade-off

```json
// Production environments (avoid load)
"timing": 2  // Polite

// Staging environments (balanced)
"timing": 3  // Normal

// Development/local (fast)
"timing": 4  // Aggressive
```

### Impact on Scan Duration

| Timing | 100 Ports | 1000 Ports | All Ports |
|--------|-----------|------------|-----------|
| T2 (Polite) | 30s | 5min | 60min |
| T3 (Normal) | 15s | 2min | 30min |
| T4 (Aggressive) | 5s | 1min | 15min |

## Advanced Options

### NSE Script Scanning

Nmap Scripting Engine (NSE) for vulnerability detection:

```json
{
  "options": [
    "-sV",
    "--script=vuln"  // Vulnerability detection scripts
  ]
}
```

**Available Script Categories**:
- `vuln`: Vulnerability detection
- `safe`: Safe scripts (won't crash services)
- `default`: Default scripts
- `discovery`: Network discovery
- `auth`: Authentication testing

### OS Detection

```json
{
  "options": [
    "-sV",
    "-O"  // OS detection
  ]
}
```

**Note**: Requires root privileges for accurate OS detection.

### Service Version Intensity

```json
{
  "options": [
    "-sV",
    "--version-intensity=9"  // 0-9, higher = more probes
  ]
}
```

### Firewall Evasion

```json
{
  "options": [
    "-sV",
    "-f",              // Fragment packets
    "--mtu=24",        // Custom MTU
    "-D RND:10"        // Decoy scanning
  ]
}
```

## Examples

### Web Application Scan

```json
{
  "nmap": {
    "enabled": true,
    "scanType": "standard",
    "portRange": "80,443,8080,8443",
    "timing": 3,
    "options": ["-sV", "--script=http-*"]
  }
}
```

### Database Security Scan

```json
{
  "nmap": {
    "enabled": true,
    "scanType": "comprehensive",
    "portRange": "3306,5432,27017,6379,9200",
    "timing": 3,
    "options": ["-sV", "-sC"]
  }
}
```

### Local Development Scan

```json
{
  "nmap": {
    "enabled": true,
    "scanType": "quick",
    "portRange": "3000,5000,8000,9000",
    "timing": 5,
    "options": ["-sV", "-Pn"]
  }
}
```

### Production Infrastructure Scan

```json
{
  "nmap": {
    "enabled": true,
    "scanType": "standard",
    "portRange": "1-1024",
    "timing": 2,
    "options": ["-sV"]
  }
}
```

### Full Network Audit

```json
{
  "nmap": {
    "enabled": true,
    "scanType": "comprehensive",
    "portRange": "1-65535",
    "timing": 3,
    "options": ["-sV", "-sC", "-O", "--script=vuln"]
  }
}
```

**Warning**: This scan can take 30-60 minutes or more.

## Best Practices

1. **Start Small**: Begin with `scanType: "quick"` and limited ports
2. **Respect Network**: Use `timing: 2` or `3` for production systems
3. **Test Locally**: Always test configuration on localhost first
4. **Schedule Wisely**: Run comprehensive scans during maintenance windows
5. **Monitor Impact**: Watch network and system load during scans
6. **Document Scans**: Keep logs of when and why scans were performed
7. **Incremental Expansion**: Gradually increase port range and options

## Performance Tuning

### Fast Scans (CI/CD)

```json
{
  "scanType": "quick",
  "portRange": "80,443",
  "timing": 4,
  "options": ["-Pn"]
}
```

**Duration**: ~30 seconds

### Balanced Scans (Regular Audits)

```json
{
  "scanType": "standard",
  "portRange": "1-1000",
  "timing": 3,
  "options": ["-sV"]
}
```

**Duration**: ~2-5 minutes

### Thorough Scans (Security Audits)

```json
{
  "scanType": "comprehensive",
  "portRange": "1-10000",
  "timing": 3,
  "options": ["-sV", "-sC", "--script=vuln"]
}
```

**Duration**: ~20-30 minutes

## Troubleshooting

### "Permission denied" errors

**Solution**: Use `-sT` (TCP connect) instead of `-sS` (SYN scan)

```json
{
  "options": ["-sT", "-sV"]
}
```

### Scans taking too long

**Solution**: Reduce port range or increase timing

```json
{
  "portRange": "1-1000",  // Instead of "1-65535"
  "timing": 4              // Faster
}
```

### No results / timeout

**Solution**: Add `-Pn` to skip ping

```json
{
  "options": ["-sV", "-Pn"]
}
```

## Additional Resources

- [Official Nmap Documentation](https://nmap.org/book/man.html)
- [Nmap NSE Scripts](https://nmap.org/nsedoc/)
- [Nmap Port Scanning Techniques](https://nmap.org/book/man-port-scanning-techniques.html)
