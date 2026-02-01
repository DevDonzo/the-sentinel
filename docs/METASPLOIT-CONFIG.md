# Metasploit Configuration Guide

Complete reference for configuring Metasploit Framework scans in Warden DAST mode.

## Table of Contents

- [Overview](#overview)
- [Configuration Options](#configuration-options)
- [Scan Modes](#scan-modes)
- [Safety Settings](#safety-settings)
- [Module Selection](#module-selection)
- [Examples](#examples)
- [Safety & Legal](#safety--legal)

## Overview

Metasploit Framework provides vulnerability validation and penetration testing capabilities. In Warden, it's used to confirm and validate findings from Nmap scans.

**⚠️ WARNING**: Metasploit is a penetration testing tool. Use with extreme caution and only on authorized systems.

## Configuration Options

### Basic Structure

```json
{
  "dast": {
    "metasploit": {
      "enabled": false,
      "mode": "scan-only",
      "modules": [],
      "timeout": 60000
    },
    "safety": {
      "requireConfirmation": true,
      "authorizedTargetsOnly": true,
      "disableExploits": true,
      "maxScanDuration": 1800000
    }
  }
}
```

### `enabled`

**Type**: `boolean`
**Default**: `false`
**Description**: Enable/disable Metasploit scanning

```json
"enabled": false  // Recommended to start with Nmap only
```

**Best Practice**: Only enable after:
1. Successfully running Nmap scans
2. Understanding legal implications
3. Obtaining proper authorization

### `mode`

**Type**: `string`
**Options**: `"scan-only"`, `"safe-exploits"`, `"full"`
**Default**: `"scan-only"`
**Description**: Metasploit operation mode

| Mode | Risk Level | Exploits | Use Case |
|------|-----------|----------|----------|
| `scan-only` | Low | None | Discovery only (recommended) |
| `safe-exploits` | Medium | Non-destructive | Vulnerability validation |
| `full` | **HIGH** | All | Penetration testing |

### `modules`

**Type**: `string[]`
**Default**: `[]`
**Description**: Specific Metasploit modules to run

If empty, modules are automatically selected based on Nmap results.

```json
// Auto-select based on Nmap
"modules": []

// Specific modules
"modules": [
  "auxiliary/scanner/http/http_version",
  "auxiliary/scanner/ssh/ssh_version"
]
```

### `timeout`

**Type**: `number` (milliseconds)
**Default**: `60000` (1 minute)
**Description**: Maximum time for Metasploit execution

```json
"timeout": 60000   // 1 minute
"timeout": 300000  // 5 minutes
"timeout": 600000  // 10 minutes
```

## Scan Modes

### 1. Scan-Only Mode (Recommended)

**Risk Level**: Low
**Exploits**: Disabled
**Use Case**: Service discovery and version detection

```json
{
  "mode": "scan-only",
  "modules": []
}
```

**What it does**:
- Uses only auxiliary scanner modules
- No exploit modules
- Safe for production environments
- Validates Nmap findings

**Example modules used**:
- `auxiliary/scanner/http/http_version`
- `auxiliary/scanner/ssh/ssh_version`
- `auxiliary/scanner/ftp/ftp_version`
- `auxiliary/scanner/smtp/smtp_version`

### 2. Safe-Exploits Mode

**Risk Level**: Medium
**Exploits**: Non-destructive only
**Use Case**: Vulnerability validation

```json
{
  "mode": "safe-exploits",
  "modules": []
}
```

**What it does**:
- Includes auxiliary scanners
- Adds safe verification modules
- No destructive actions
- Confirms vulnerability presence

**Example modules used**:
- All scan-only modules
- `auxiliary/scanner/http/ssl_version`
- `auxiliary/scanner/http/http_login` (authentication testing)

**Note**: Still requires explicit authorization.

### 3. Full Mode

**Risk Level**: HIGH
**Exploits**: All modules available
**Use Case**: Professional penetration testing only

```json
{
  "mode": "full",
  "modules": []
}
```

**⚠️ EXTREME CAUTION REQUIRED**

**What it does**:
- All Metasploit modules available
- May modify target system
- Can cause service disruption
- Requires professional expertise

**Requirements**:
- Written authorization from system owner
- Professional pentesting experience
- Documented scope and limits
- Incident response plan

## Safety Settings

Safety configuration applies to all Metasploit operations.

### `requireConfirmation`

**Type**: `boolean`
**Default**: `true`
**Description**: Prompt before starting scan

```json
"requireConfirmation": true  // Always recommended
```

When `true`, displays comprehensive warning before proceeding.

### `authorizedTargetsOnly`

**Type**: `boolean`
**Default**: `true`
**Description**: Only scan targets with `"authorized": true`

```json
"authorizedTargetsOnly": true  // Mandatory
```

**Never** set to `false` - this is a critical safety check.

### `disableExploits`

**Type**: `boolean`
**Default**: `true`
**Description**: Disable all exploit modules

```json
"disableExploits": true  // Recommended
```

When `true`, only auxiliary/scanner modules are used, regardless of `mode`.

### `maxScanDuration`

**Type**: `number` (milliseconds)
**Default**: `1800000` (30 minutes)
**Description**: Maximum total scan duration

```json
"maxScanDuration": 1800000  // 30 minutes
```

Scan is automatically terminated if this limit is exceeded.

## Module Selection

### Auto-Selection (Recommended)

Leave `modules` empty to auto-select based on Nmap results:

```json
{
  "modules": []
}
```

Warden selects appropriate modules based on detected services:

| Service (Nmap) | Metasploit Modules |
|----------------|-------------------|
| HTTP/HTTPS | `auxiliary/scanner/http/http_version`<br>`auxiliary/scanner/http/http_header`<br>`auxiliary/scanner/http/robots_txt` |
| SSH | `auxiliary/scanner/ssh/ssh_version` |
| FTP | `auxiliary/scanner/ftp/ftp_version` |
| SMTP | `auxiliary/scanner/smtp/smtp_version` |
| MySQL | `auxiliary/scanner/mysql/mysql_version` |
| PostgreSQL | `auxiliary/scanner/postgres/postgres_version` |

### Manual Selection

Specify exact modules to run:

```json
{
  "modules": [
    "auxiliary/scanner/http/http_version",
    "auxiliary/scanner/http/ssl_version",
    "auxiliary/scanner/ssh/ssh_version"
  ]
}
```

**Use cases**:
- Targeting specific services
- Running custom modules
- Limiting scan scope

### Finding Modules

```bash
# Search Metasploit modules
msfconsole
msf6 > search http scanner
msf6 > search type:auxiliary ssh
```

## Examples

### Basic Configuration (Recommended Start)

```json
{
  "metasploit": {
    "enabled": true,
    "mode": "scan-only",
    "modules": [],
    "timeout": 60000
  },
  "safety": {
    "requireConfirmation": true,
    "authorizedTargetsOnly": true,
    "disableExploits": true,
    "maxScanDuration": 1800000
  }
}
```

### Web Application Scanning

```json
{
  "metasploit": {
    "enabled": true,
    "mode": "scan-only",
    "modules": [
      "auxiliary/scanner/http/http_version",
      "auxiliary/scanner/http/http_header",
      "auxiliary/scanner/http/ssl_version",
      "auxiliary/scanner/http/robots_txt"
    ],
    "timeout": 120000
  }
}
```

### SSH Service Validation

```json
{
  "metasploit": {
    "enabled": true,
    "mode": "scan-only",
    "modules": [
      "auxiliary/scanner/ssh/ssh_version",
      "auxiliary/scanner/ssh/ssh_enumusers"
    ],
    "timeout": 60000
  }
}
```

### Database Security Check

```json
{
  "metasploit": {
    "enabled": true,
    "mode": "scan-only",
    "modules": [
      "auxiliary/scanner/mysql/mysql_version",
      "auxiliary/scanner/postgres/postgres_version",
      "auxiliary/scanner/mongodb/mongodb_login"
    ],
    "timeout": 120000
  }
}
```

### Local Development (Disabled)

```json
{
  "metasploit": {
    "enabled": false,
    "mode": "scan-only",
    "modules": [],
    "timeout": 60000
  }
}
```

**Best Practice**: Disable Metasploit for local development scans.

## Safety & Legal

### Legal Requirements

**Before enabling Metasploit, ensure you have**:

1. ✅ Written authorization from system owner
2. ✅ Clearly defined scope (IP ranges, domains, timeframes)
3. ✅ Incident response contact information
4. ✅ Understanding of local laws and regulations
5. ✅ Professional liability insurance (for commercial pentesting)

### Compliance Considerations

Different industries have specific requirements:

**PCI DSS**: Regular penetration testing required, but must be authorized
**HIPAA**: Security testing allowed, but requires BAA and authorization
**SOC 2**: Penetration testing common, needs documented authorization
**ISO 27001**: Security testing recommended, must be controlled

### Notification

**Always notify**:
- System administrators
- Network operations team
- Security operations center (SOC)
- Incident response team

**Provide**:
- Scan schedule
- Source IP addresses
- Expected behavior
- Contact information

### Documentation

Keep records of:
- Authorization letters
- Scan configurations
- Results and findings
- Remediation actions
- Verification scans

## Workflow Integration

### Phase 1: Nmap First

```json
{
  "nmap": {
    "enabled": true
  },
  "metasploit": {
    "enabled": false  // Disabled initially
  }
}
```

1. Run Nmap scan
2. Review results
3. Verify findings manually

### Phase 2: Add Metasploit Validation

```json
{
  "nmap": {
    "enabled": true
  },
  "metasploit": {
    "enabled": true,
    "mode": "scan-only"
  }
}
```

1. Nmap discovers services
2. Metasploit validates findings
3. Merged results in advisory PR

### Phase 3: Advanced (Authorized Pentesting Only)

```json
{
  "nmap": {
    "enabled": true,
    "scanType": "comprehensive"
  },
  "metasploit": {
    "enabled": true,
    "mode": "safe-exploits"
  }
}
```

**Requirements**: Professional pentester with written authorization.

## Troubleshooting

### "Metasploit Framework not found"

**Solution**: Install Metasploit

```bash
# macOS
brew install metasploit

# Verify
msfconsole --version
```

### Scan timeout

**Solution**: Increase timeout

```json
{
  "timeout": 300000  // 5 minutes
}
```

### No results

**Solution**: Check module selection and logs

```bash
# View Metasploit output
cat scan-results/dast/msf-output-*.txt
```

### Permission issues

**Solution**: Check Metasploit installation permissions

```bash
# macOS/Linux
ls -la $(which msfconsole)
```

## Best Practices

1. **Start Disabled**: Begin with Metasploit disabled, use Nmap only
2. **Scan-Only Mode**: Use `"mode": "scan-only"` for regular scans
3. **Authorization First**: Never scan without explicit written authorization
4. **Test Locally**: Always test on localhost first
5. **Schedule Carefully**: Run during maintenance windows
6. **Monitor Impact**: Watch for service disruption
7. **Document Everything**: Keep detailed logs and authorization records
8. **Professional Help**: Consider hiring professional pentesters for `full` mode

## Risk Assessment

| Mode | Risk | Authorization | Use Case |
|------|------|--------------|----------|
| Disabled | None | Not required | Development, initial setup |
| Scan-Only | Low | Written | Regular security audits |
| Safe-Exploits | Medium | Written + Scope | Vulnerability validation |
| Full | **HIGH** | Written + Detailed Scope + Insurance | Professional pentesting |

## Additional Resources

- [Metasploit Unleashed](https://www.offensive-security.com/metasploit-unleashed/)
- [Metasploit Framework Documentation](https://docs.rapid7.com/metasploit/)
- [Offensive Security](https://www.offensive-security.com/)
- [SANS Penetration Testing](https://www.sans.org/cyber-security-courses/penetration-testing/)

## Legal Disclaimer

This documentation is for educational and authorized security testing purposes only. Unauthorized use of penetration testing tools is illegal. Always obtain written authorization before scanning any system you do not own.
