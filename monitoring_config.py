#!/usr/bin/env python3
"""
MarketHub Production Monitoring and Alerting Configuration

This script sets up comprehensive monitoring, logging, and alerting for the
MarketHub production environment.

Usage:
    python monitoring_config.py [--setup] [--test-alerts] [--status]
"""

import os
import sys
import json
import logging
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse
import time
import psutil
import requests

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MarketHubMonitoring:
    """Production monitoring and alerting manager for MarketHub."""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.monitoring_config = self.load_monitoring_config()
        self.alerts_sent = []
        
    def load_monitoring_config(self) -> Dict[str, Any]:
        """Load monitoring configuration."""
        config = {
            'health_checks': {
                'enabled': True,
                'check_interval': 60,  # seconds
                'endpoints': [
                    {'url': 'http://localhost:8000/api/health/', 'name': 'API Health'},
                    {'url': 'http://localhost:8000/', 'name': 'Homepage'},
                    {'url': 'http://localhost:8000/api/products/', 'name': 'Products API'}
                ]
            },
            'performance_monitoring': {
                'enabled': True,
                'cpu_threshold': 80,  # percentage
                'memory_threshold': 85,  # percentage
                'disk_threshold': 90,  # percentage
                'response_time_threshold': 2.0,  # seconds
                'error_rate_threshold': 5.0  # percentage
            },
            'database_monitoring': {
                'enabled': True,
                'connection_pool_threshold': 80,  # percentage
                'slow_query_threshold': 1.0,  # seconds
                'deadlock_monitoring': True
            },
            'security_monitoring': {
                'enabled': True,
                'failed_login_threshold': 10,  # per minute
                'suspicious_ip_monitoring': True,
                'csrf_failure_monitoring': True
            },
            'business_metrics': {
                'enabled': True,
                'order_monitoring': True,
                'payment_failure_monitoring': True,
                'inventory_alerts': True
            },
            'alerting': {
                'email_enabled': False,
                'slack_enabled': False,
                'webhook_enabled': True,
                'webhook_url': 'http://localhost:8000/monitoring/webhook/',
                'alert_cooldown': 300  # 5 minutes
            },
            'logging': {
                'log_level': 'INFO',
                'log_rotation': True,
                'max_log_size': '100MB',
                'backup_count': 10
            }
        }
        
        # Load custom config if exists
        config_file = self.base_dir / 'monitoring_config.json'
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    custom_config = json.load(f)
                self.merge_config(config, custom_config)
            except Exception as e:
                logger.warning(f"Failed to load monitoring config: {e}")
        
        return config
    
    def merge_config(self, base_config: Dict, custom_config: Dict):
        """Recursively merge custom config into base config."""
        for key, value in custom_config.items():
            if key in base_config and isinstance(base_config[key], dict) and isinstance(value, dict):
                self.merge_config(base_config[key], value)
            else:
                base_config[key] = value
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system metrics."""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_usage': cpu_percent,
                'memory_usage': memory.percent,
                'memory_available': memory.available,
                'disk_usage': disk.percent,
                'disk_free': disk.free,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return {}
    
    def check_endpoint_health(self, endpoint: Dict[str, str]) -> Dict[str, Any]:
        """Check health of a specific endpoint."""
        try:
            start_time = time.time()
            response = requests.get(endpoint['url'], timeout=10)
            response_time = time.time() - start_time
            
            return {
                'name': endpoint['name'],
                'url': endpoint['url'],
                'status_code': response.status_code,
                'response_time': response_time,
                'healthy': 200 <= response.status_code < 400,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'name': endpoint['name'],
                'url': endpoint['url'],
                'status_code': 0,
                'response_time': 0,
                'healthy': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def check_database_health(self) -> Dict[str, Any]:
        """Check database health and performance."""
        try:
            # This would typically use Django's database connection
            # For now, we'll simulate database health checks
            return {
                'connection_count': 5,  # Placeholder
                'active_connections': 3,  # Placeholder
                'slow_queries': 0,  # Placeholder
                'deadlocks': 0,  # Placeholder
                'healthy': True,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'healthy': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def check_business_metrics(self) -> Dict[str, Any]:
        """Check business-critical metrics."""
        try:
            # These would typically query the Django database
            # For now, we'll return placeholder metrics
            return {
                'orders_last_hour': 15,  # Placeholder
                'payment_failures_last_hour': 2,  # Placeholder
                'low_inventory_items': 3,  # Placeholder
                'active_users': 150,  # Placeholder
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Business metrics check failed: {e}")
            return {}
    
    def evaluate_alert_conditions(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate metrics against alert thresholds."""
        alerts = []
        
        # System alerts
        if 'system_metrics' in metrics:
            system = metrics['system_metrics']
            
            if system.get('cpu_usage', 0) > self.monitoring_config['performance_monitoring']['cpu_threshold']:
                alerts.append({
                    'type': 'system',
                    'severity': 'warning',
                    'message': f"High CPU usage: {system['cpu_usage']:.1f}%",
                    'metric': 'cpu_usage',
                    'value': system['cpu_usage'],
                    'threshold': self.monitoring_config['performance_monitoring']['cpu_threshold']
                })
            
            if system.get('memory_usage', 0) > self.monitoring_config['performance_monitoring']['memory_threshold']:
                alerts.append({
                    'type': 'system',
                    'severity': 'warning',
                    'message': f"High memory usage: {system['memory_usage']:.1f}%",
                    'metric': 'memory_usage',
                    'value': system['memory_usage'],
                    'threshold': self.monitoring_config['performance_monitoring']['memory_threshold']
                })
            
            if system.get('disk_usage', 0) > self.monitoring_config['performance_monitoring']['disk_threshold']:
                alerts.append({
                    'type': 'system',
                    'severity': 'critical',
                    'message': f"High disk usage: {system['disk_usage']:.1f}%",
                    'metric': 'disk_usage',
                    'value': system['disk_usage'],
                    'threshold': self.monitoring_config['performance_monitoring']['disk_threshold']
                })
        
        # Endpoint health alerts
        if 'health_checks' in metrics:
            for check in metrics['health_checks']:
                if not check.get('healthy', False):
                    alerts.append({
                        'type': 'endpoint',
                        'severity': 'critical',
                        'message': f"Endpoint {check['name']} is unhealthy",
                        'endpoint': check['url'],
                        'status_code': check.get('status_code', 0),
                        'error': check.get('error', 'Unknown error')
                    })
                
                response_time = check.get('response_time', 0)
                if response_time > self.monitoring_config['performance_monitoring']['response_time_threshold']:
                    alerts.append({
                        'type': 'performance',
                        'severity': 'warning',
                        'message': f"Slow response from {check['name']}: {response_time:.2f}s",
                        'endpoint': check['url'],
                        'response_time': response_time,
                        'threshold': self.monitoring_config['performance_monitoring']['response_time_threshold']
                    })
        
        # Database alerts
        if 'database_health' in metrics:
            db = metrics['database_health']
            if not db.get('healthy', False):
                alerts.append({
                    'type': 'database',
                    'severity': 'critical',
                    'message': f"Database health check failed: {db.get('error', 'Unknown error')}",
                    'error': db.get('error')
                })
        
        # Business metric alerts
        if 'business_metrics' in metrics:
            business = metrics['business_metrics']
            
            if business.get('payment_failures_last_hour', 0) > 10:
                alerts.append({
                    'type': 'business',
                    'severity': 'warning',
                    'message': f"High payment failure rate: {business['payment_failures_last_hour']} failures in last hour",
                    'metric': 'payment_failures',
                    'value': business['payment_failures_last_hour']
                })
            
            if business.get('low_inventory_items', 0) > 5:
                alerts.append({
                    'type': 'business',
                    'severity': 'warning',
                    'message': f"Low inventory alert: {business['low_inventory_items']} items running low",
                    'metric': 'low_inventory',
                    'value': business['low_inventory_items']
                })
        
        return alerts
    
    def send_alert(self, alert: Dict[str, Any]):
        """Send alert through configured channels."""
        alert_key = f"{alert.get('type')}_{alert.get('metric', 'unknown')}"
        
        # Check cooldown period
        cooldown = self.monitoring_config['alerting']['alert_cooldown']
        now = datetime.now()
        
        for sent_alert in self.alerts_sent:
            if sent_alert['key'] == alert_key:
                if (now - sent_alert['timestamp']).total_seconds() < cooldown:
                    logger.debug(f"Alert {alert_key} in cooldown period")
                    return
        
        # Add timestamp and unique ID to alert
        alert['timestamp'] = now.isoformat()
        alert['alert_id'] = f"{alert_key}_{int(now.timestamp())}"
        
        # Send alert
        success = False
        
        if self.monitoring_config['alerting']['webhook_enabled']:
            success = self.send_webhook_alert(alert)
        
        if self.monitoring_config['alerting']['email_enabled']:
            # Email sending would be implemented here
            logger.info(f"Email alert would be sent: {alert['message']}")
        
        if self.monitoring_config['alerting']['slack_enabled']:
            # Slack notification would be implemented here
            logger.info(f"Slack alert would be sent: {alert['message']}")
        
        # Log alert
        severity = alert.get('severity', 'info').upper()
        logger.warning(f"ALERT [{severity}]: {alert['message']}")
        
        # Track sent alert
        if success:
            self.alerts_sent.append({
                'key': alert_key,
                'timestamp': now,
                'alert': alert
            })
    
    def send_webhook_alert(self, alert: Dict[str, Any]) -> bool:
        """Send alert via webhook."""
        try:
            webhook_url = self.monitoring_config['alerting']['webhook_url']
            if not webhook_url:
                return False
            
            payload = {
                'alert': alert,
                'source': 'markethub_monitoring',
                'timestamp': datetime.now().isoformat()
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            
            logger.info(f"Alert sent via webhook: {alert['alert_id']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
            return False
    
    def collect_all_metrics(self) -> Dict[str, Any]:
        """Collect all monitoring metrics."""
        metrics = {
            'timestamp': datetime.now().isoformat()
        }
        
        # System metrics
        if self.monitoring_config['performance_monitoring']['enabled']:
            metrics['system_metrics'] = self.get_system_metrics()
        
        # Health checks
        if self.monitoring_config['health_checks']['enabled']:
            health_checks = []
            for endpoint in self.monitoring_config['health_checks']['endpoints']:
                health_checks.append(self.check_endpoint_health(endpoint))
            metrics['health_checks'] = health_checks
        
        # Database health
        if self.monitoring_config['database_monitoring']['enabled']:
            metrics['database_health'] = self.check_database_health()
        
        # Business metrics
        if self.monitoring_config['business_metrics']['enabled']:
            metrics['business_metrics'] = self.check_business_metrics()
        
        return metrics
    
    def run_monitoring_cycle(self):
        """Run one complete monitoring cycle."""
        logger.info("Starting monitoring cycle...")
        
        try:
            # Collect metrics
            metrics = self.collect_all_metrics()
            
            # Save metrics to file for historical tracking
            metrics_file = self.base_dir / 'monitoring_metrics.jsonl'
            with open(metrics_file, 'a') as f:
                f.write(json.dumps(metrics) + '\n')
            
            # Evaluate alerts
            alerts = self.evaluate_alert_conditions(metrics)
            
            # Send alerts
            for alert in alerts:
                self.send_alert(alert)
            
            # Log summary
            logger.info(f"Monitoring cycle completed: {len(alerts)} alerts generated")
            
            return metrics, alerts
            
        except Exception as e:
            logger.error(f"Monitoring cycle failed: {e}")
            return {}, []
    
    def continuous_monitoring(self, duration_minutes: Optional[int] = None):
        """Run continuous monitoring."""
        logger.info("Starting continuous monitoring...")
        
        if duration_minutes:
            end_time = datetime.now() + timedelta(minutes=duration_minutes)
            logger.info(f"Monitoring will run for {duration_minutes} minutes")
        else:
            end_time = None
            logger.info("Monitoring will run continuously (Ctrl+C to stop)")
        
        try:
            while True:
                # Run monitoring cycle
                metrics, alerts = self.run_monitoring_cycle()
                
                # Check if we should stop
                if end_time and datetime.now() >= end_time:
                    logger.info("Monitoring duration completed")
                    break
                
                # Wait for next cycle
                interval = self.monitoring_config['health_checks']['check_interval']
                logger.debug(f"Waiting {interval} seconds until next check...")
                time.sleep(interval)
                
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
        except Exception as e:
            logger.error(f"Continuous monitoring failed: {e}")
    
    def test_alerts(self):
        """Test alert system by generating test alerts."""
        logger.info("Testing alert system...")
        
        test_alerts = [
            {
                'type': 'test',
                'severity': 'info',
                'message': 'Test alert - monitoring system is working',
                'metric': 'test_metric',
                'value': 100
            },
            {
                'type': 'test',
                'severity': 'warning',
                'message': 'Test warning alert',
                'metric': 'test_warning',
                'value': 85
            }
        ]
        
        for alert in test_alerts:
            self.send_alert(alert)
            time.sleep(2)  # Brief delay between test alerts
        
        logger.info("Alert testing completed")
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring system status."""
        return {
            'monitoring_enabled': True,
            'config': self.monitoring_config,
            'alerts_sent_today': len([a for a in self.alerts_sent 
                                    if (datetime.now() - a['timestamp']).days == 0]),
            'system_status': self.get_system_metrics(),
            'timestamp': datetime.now().isoformat()
        }

def main():
    """Main function for monitoring configuration."""
    parser = argparse.ArgumentParser(description='MarketHub Monitoring System')
    parser.add_argument('--setup', action='store_true',
                       help='Setup monitoring configuration')
    parser.add_argument('--test-alerts', action='store_true',
                       help='Test alert system')
    parser.add_argument('--status', action='store_true',
                       help='Show monitoring status')
    parser.add_argument('--monitor', type=int, metavar='MINUTES',
                       help='Run continuous monitoring for specified minutes (0 for infinite)')
    
    args = parser.parse_args()
    
    monitoring = MarketHubMonitoring()
    
    if args.setup:
        logger.info("Setting up monitoring system...")
        # Save default configuration
        config_file = monitoring.base_dir / 'monitoring_config.json'
        with open(config_file, 'w') as f:
            json.dump(monitoring.monitoring_config, f, indent=2)
        logger.info(f"Monitoring configuration saved to {config_file}")
    
    elif args.test_alerts:
        monitoring.test_alerts()
    
    elif args.status:
        status = monitoring.get_monitoring_status()
        print(json.dumps(status, indent=2))
    
    elif args.monitor is not None:
        duration = args.monitor if args.monitor > 0 else None
        monitoring.continuous_monitoring(duration)
    
    else:
        # Default: run one monitoring cycle
        metrics, alerts = monitoring.run_monitoring_cycle()
        print(f"Monitoring cycle completed: {len(alerts)} alerts")

if __name__ == '__main__':
    main()
