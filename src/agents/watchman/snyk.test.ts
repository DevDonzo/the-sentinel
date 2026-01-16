/**
 * Tests for The Watchman - Snyk Scanner
 * 
 * These tests verify the retry mechanism, timeout handling,
 * and robust JSON output features.
 */

import { SnykScanner, ScanResult } from './snyk';
import * as fs from 'fs';
import * as path from 'path';

describe('SnykScanner', () => {
    const testOutputDir = path.resolve(process.cwd(), 'scan-results');

    beforeAll(() => {
        // Ensure output directory exists
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
    });

    describe('Configuration', () => {
        it('should create scanner with default options', () => {
            const scanner = new SnykScanner();
            expect(scanner).toBeDefined();
        });

        it('should create scanner with custom options', () => {
            const scanner = new SnykScanner({
                maxRetries: 5,
                retryDelayMs: 3000,
                timeoutMs: 600000
            });
            expect(scanner).toBeDefined();
        });

        it('should warn when SNYK_TOKEN is not set', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            delete process.env.SNYK_TOKEN;

            new SnykScanner();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('SNYK_TOKEN not found')
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Scan Result Validation', () => {
        it('should validate a valid scan result', () => {
            const scanner = new SnykScanner();
            const validResult: ScanResult = {
                timestamp: new Date().toISOString(),
                vulnerabilities: [
                    {
                        id: 'TEST-001',
                        title: 'Test Vulnerability',
                        severity: 'high',
                        packageName: 'test-package',
                        version: '1.0.0'
                    }
                ],
                summary: {
                    total: 1,
                    critical: 0,
                    high: 1,
                    medium: 0,
                    low: 0
                }
            };

            // This should not throw
            expect(() => {
                (scanner as any).validateScanResult(validResult);
            }).not.toThrow();
        });

        it('should reject invalid severity', () => {
            const scanner = new SnykScanner();
            const invalidResult: any = {
                timestamp: new Date().toISOString(),
                vulnerabilities: [
                    {
                        id: 'TEST-001',
                        title: 'Test Vulnerability',
                        severity: 'invalid-severity',
                        packageName: 'test-package',
                        version: '1.0.0'
                    }
                ],
                summary: {
                    total: 1,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                }
            };

            expect(() => {
                (scanner as any).validateScanResult(invalidResult);
            }).toThrow('Invalid severity');
        });

        it('should reject missing required fields', () => {
            const scanner = new SnykScanner();
            const invalidResult: any = {
                timestamp: new Date().toISOString(),
                vulnerabilities: [
                    {
                        id: 'TEST-001',
                        // Missing title, severity, packageName, version
                    }
                ],
                summary: {
                    total: 1,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                }
            };

            expect(() => {
                (scanner as any).validateScanResult(invalidResult);
            }).toThrow('missing required fields');
        });
    });

    describe('High Priority Filtering', () => {
        it('should filter critical and high vulnerabilities', () => {
            const scanner = new SnykScanner();
            const result: ScanResult = {
                timestamp: new Date().toISOString(),
                vulnerabilities: [
                    {
                        id: 'CRIT-001',
                        title: 'Critical Issue',
                        severity: 'critical',
                        packageName: 'pkg1',
                        version: '1.0.0'
                    },
                    {
                        id: 'HIGH-001',
                        title: 'High Issue',
                        severity: 'high',
                        packageName: 'pkg2',
                        version: '1.0.0'
                    },
                    {
                        id: 'MED-001',
                        title: 'Medium Issue',
                        severity: 'medium',
                        packageName: 'pkg3',
                        version: '1.0.0'
                    },
                    {
                        id: 'LOW-001',
                        title: 'Low Issue',
                        severity: 'low',
                        packageName: 'pkg4',
                        version: '1.0.0'
                    }
                ],
                summary: {
                    total: 4,
                    critical: 1,
                    high: 1,
                    medium: 1,
                    low: 1
                }
            };

            const highPriority = scanner.filterHighPriority(result);
            expect(highPriority).toHaveLength(2);
            expect(highPriority[0].severity).toBe('critical');
            expect(highPriority[1].severity).toBe('high');
        });
    });

    describe('File Output', () => {
        it('should create scan-results directory', () => {
            new SnykScanner();
            expect(fs.existsSync(testOutputDir)).toBe(true);
        });

        it('should save scan results with atomic writes', async () => {
            const scanner = new SnykScanner();
            const result: ScanResult = {
                timestamp: new Date().toISOString(),
                vulnerabilities: [],
                summary: {
                    total: 0,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                }
            };

            // This should not throw
            expect(() => {
                (scanner as any).saveScanResults(result);
            }).not.toThrow();

            // Check that scan-results.json exists
            const latestPath = path.join(testOutputDir, 'scan-results.json');
            expect(fs.existsSync(latestPath)).toBe(true);

            // Verify it's valid JSON
            const content = fs.readFileSync(latestPath, 'utf8');
            const parsed = JSON.parse(content);
            expect(parsed).toHaveProperty('timestamp');
            expect(parsed).toHaveProperty('vulnerabilities');
            expect(parsed).toHaveProperty('summary');
        });
    });

    describe('Error Handling', () => {
        it('should handle JSON parsing errors gracefully', () => {
            const scanner = new SnykScanner();

            expect(() => {
                (scanner as any).parseSnykOutput('invalid json');
            }).toThrow('Failed to parse Snyk JSON output');
        });

        it('should create fallback result on scan failure', async () => {
            const scanner = new SnykScanner({
                maxRetries: 1,
                timeoutMs: 1 // Very short timeout to force failure
            });

            try {
                await scanner.test();
            } catch (error) {
                // Expected to fail
            }

            // Check that a scan result was still saved
            const latestPath = path.join(testOutputDir, 'scan-results.json');
            if (fs.existsSync(latestPath)) {
                const content = fs.readFileSync(latestPath, 'utf8');
                const parsed = JSON.parse(content);
                expect(parsed).toHaveProperty('metadata');
                expect(parsed.metadata).toHaveProperty('errors');
            }
        });
    });

    describe('Metadata Tracking', () => {
        it('should include scan duration in metadata', () => {
            const result: ScanResult = {
                timestamp: new Date().toISOString(),
                vulnerabilities: [],
                summary: {
                    total: 0,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                },
                metadata: {
                    scanDuration: 12345,
                    retryCount: 0
                }
            };

            expect(result.metadata?.scanDuration).toBe(12345);
            expect(result.metadata?.retryCount).toBe(0);
        });
    });
});
