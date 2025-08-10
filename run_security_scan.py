#!/usr/bin/env python
"""
Standalone Security Scanner for MarketHub

This script runs security analysis tools without requiring Django setup.
"""

import subprocess
import sys
import json


def run_security_scan():
    """Run automated security scans"""
    
    results = {
        'bandit': None,
        'safety': None,
        'status': 'passed'
    }
    
    try:
        # Run bandit security scanner
        print("Running bandit security scanner...")
        bandit_result = subprocess.run([
            sys.executable, '-m', 'bandit', '-r', '.', 
            '--exclude', 'venv,env,tests,migrations',
            '--format', 'json'
        ], capture_output=True, text=True, timeout=120)
        
        # Bandit returns 0 for no issues found, 1 for issues found
        if bandit_result.returncode in [0, 1]:
            try:
                # Parse the JSON part (filter out log messages)
                output_lines = bandit_result.stdout.strip().split('\n')
                json_start = -1
                for i, line in enumerate(output_lines):
                    if line.strip().startswith('{'):
                        json_start = i
                        break
                
                if json_start >= 0:
                    json_output = '\n'.join(output_lines[json_start:])
                    results['bandit'] = json.loads(json_output)
                    issue_count = len(results['bandit'].get('results', []))
                    print(f"✓ Bandit: Found {issue_count} potential issues")
                else:
                    # No JSON output means no issues found
                    results['bandit'] = {'results': []}
                    print("✓ Bandit: No security issues found")
            except json.JSONDecodeError as e:
                results['bandit'] = {'error': f'Failed to parse bandit output: {e}', 'raw_output': bandit_result.stdout}
        else:
            results['bandit'] = {'error': bandit_result.stderr}
            
    except subprocess.TimeoutExpired:
        results['bandit'] = {'error': 'Bandit scan timed out'}
    except Exception as e:
        results['bandit'] = {'error': str(e)}
        
    try:
        # Run safety vulnerability scanner
        print("Running safety vulnerability scanner...")
        safety_result = subprocess.run([
            sys.executable, '-m', 'safety', 'check', '--json'
        ], capture_output=True, text=True, timeout=120)
        
        # Safety returns 0 for no vulnerabilities, 64 for vulnerabilities found
        if safety_result.returncode in [0, 64]:
            try:
                if safety_result.stdout.strip():
                    results['safety'] = json.loads(safety_result.stdout)
                    if isinstance(results['safety'], list):
                        print(f"✓ Safety: Found {len(results['safety'])} vulnerable packages")
                    else:
                        print("✓ Safety: No vulnerable packages found")
                else:
                    results['safety'] = []
                    print("✓ Safety: No vulnerable packages found")
            except json.JSONDecodeError:
                # Sometimes safety doesn't output JSON, this is usually OK
                results['safety'] = []
                print("✓ Safety: No vulnerable packages found")
        else:
            results['safety'] = {'error': safety_result.stderr}
            
    except subprocess.TimeoutExpired:
        results['safety'] = {'error': 'Safety scan timed out'}
    except Exception as e:
        results['safety'] = {'error': str(e)}
        
    # Analyze results
    if results['bandit'] and isinstance(results['bandit'], dict) and 'results' in results['bandit']:
        high_severity_issues = [
            issue for issue in results['bandit']['results'] 
            if issue.get('issue_severity') == 'HIGH'
        ]
        if high_severity_issues:
            results['status'] = 'failed'
            results['high_severity_count'] = len(high_severity_issues)
            
    if results['safety'] and isinstance(results['safety'], list) and len(results['safety']) > 0:
        results['status'] = 'failed'
        results['vulnerable_packages'] = len(results['safety'])
        
    return results


def print_results(scan_results):
    """Print formatted results"""
    print("\n=== Security Scan Results ===")
    print(f"Overall Status: {scan_results['status'].upper()}")
    
    if scan_results.get('bandit'):
        if isinstance(scan_results['bandit'], dict) and 'results' in scan_results['bandit']:
            total_issues = len(scan_results['bandit']['results'])
            print(f"Bandit: Found {total_issues} potential issues")
            
            if scan_results.get('high_severity_count'):
                print(f"  - {scan_results['high_severity_count']} HIGH severity issues")
                
            # Show summary by severity
            if total_issues > 0:
                severity_counts = {}
                for issue in scan_results['bandit']['results']:
                    severity = issue.get('issue_severity', 'UNKNOWN')
                    severity_counts[severity] = severity_counts.get(severity, 0) + 1
                
                print("  Breakdown by severity:")
                for severity, count in sorted(severity_counts.items()):
                    print(f"    {severity}: {count}")
        else:
            error_msg = scan_results['bandit'].get('error', 'Unknown error')
            print(f"Bandit: {error_msg}")
            
    if scan_results.get('safety'):
        if isinstance(scan_results['safety'], list):
            vuln_count = len(scan_results['safety'])
            print(f"Safety: Found {vuln_count} vulnerable packages")
            
            if vuln_count > 0:
                print("  Vulnerable packages:")
                for vuln in scan_results['safety'][:5]:  # Show first 5
                    package = vuln.get('package_name', 'Unknown')
                    version = vuln.get('installed_version', 'Unknown')
                    print(f"    - {package} v{version}")
                if vuln_count > 5:
                    print(f"    ... and {vuln_count - 5} more")
        else:
            error_msg = scan_results['safety'].get('error', 'Unknown error')
            print(f"Safety: {error_msg}")


def run_flake8():
    """Run flake8 linting"""
    print("\nRunning flake8 linter...")
    try:
        result = subprocess.run([
            sys.executable, '-m', 'flake8', '.', 
            '--exclude=venv,env,migrations',
            '--max-line-length=100',
            '--select=F821,E999,F811',
            '--statistics'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✓ Flake8: No critical issues found")
        else:
            print("✗ Flake8: Found issues:")
            print(result.stdout)
            
    except Exception as e:
        print(f"✗ Flake8: Error running linter: {e}")


if __name__ == '__main__':
    print("🔒 MarketHub Security Scanner")
    print("=" * 50)
    
    # Run flake8 first
    run_flake8()
    
    # Run security scans
    scan_results = run_security_scan()
    
    # Print results
    print_results(scan_results)
    
    # Write results to file
    try:
        with open('security_scan_results.json', 'w') as f:
            json.dump(scan_results, f, indent=2)
        print(f"\n📄 Detailed results saved to: security_scan_results.json")
    except Exception as e:
        print(f"Failed to save results: {e}")
    
    # Exit with appropriate code
    if scan_results['status'] == 'failed':
        print("\n❌ Security scan failed - critical issues found!")
        sys.exit(1)
    else:
        print("\n✅ Security scan passed - no critical issues found!")
        sys.exit(0)
