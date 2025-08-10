"""
Health check views for monitoring and load balancer health checks
"""
import json
import logging
import os
import time
from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.db import connections
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
@never_cache
def health_check(request):
    """
    Basic health check endpoint for load balancers
    Returns 200 if the application is healthy
    """
    return JsonResponse({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': getattr(settings, 'VERSION', '1.0.0')
    })


@csrf_exempt
@require_http_methods(["GET"])
@never_cache
def health_detailed(request):
    """
    Detailed health check with dependency checks
    """
    start_time = time.time()
    health_data = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': getattr(settings, 'VERSION', '1.0.0'),
        'environment': getattr(settings, 'ENVIRONMENT_NAME', 'unknown'),
        'checks': {}
    }
    
    overall_status = True
    
    # Database check
    try:
        db_start = time.time()
        db_conn = connections['default']
        with db_conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        health_data['checks']['database'] = {
            'status': 'healthy',
            'response_time': round((time.time() - db_start) * 1000, 2)
        }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        health_data['checks']['database'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
        overall_status = False
    
    # Cache check (Redis)
    try:
        cache_start = time.time()
        cache_key = 'health_check_test'
        cache.set(cache_key, 'test_value', timeout=60)
        cached_value = cache.get(cache_key)
        
        if cached_value == 'test_value':
            health_data['checks']['cache'] = {
                'status': 'healthy',
                'response_time': round((time.time() - cache_start) * 1000, 2)
            }
        else:
            health_data['checks']['cache'] = {
                'status': 'unhealthy',
                'error': 'Cache test failed'
            }
            overall_status = False
            
    except Exception as e:
        logger.error(f"Cache health check failed: {str(e)}")
        health_data['checks']['cache'] = {
            'status': 'degraded',
            'error': str(e)
        }
        # Cache failure is not critical, don't mark overall as unhealthy
    
    # Disk space check (if configured)
    try:
        import shutil
        disk_usage = shutil.disk_usage('/')
        disk_free_percent = (disk_usage.free / disk_usage.total) * 100
        
        disk_threshold = getattr(settings, 'HEALTH_CHECK', {}).get('DISK_USAGE_MAX', 90)
        
        if disk_free_percent > (100 - disk_threshold):
            health_data['checks']['disk'] = {
                'status': 'healthy',
                'free_percent': round(disk_free_percent, 2)
            }
        else:
            health_data['checks']['disk'] = {
                'status': 'warning',
                'free_percent': round(disk_free_percent, 2),
                'message': f'Disk usage above {disk_threshold}%'
            }
            
    except Exception as e:
        logger.warning(f"Disk check failed: {str(e)}")
        health_data['checks']['disk'] = {
            'status': 'unknown',
            'error': str(e)
        }
    
    # Overall status
    health_data['status'] = 'healthy' if overall_status else 'unhealthy'
    health_data['response_time'] = round((time.time() - start_time) * 1000, 2)
    
    status_code = 200 if overall_status else 503
    return JsonResponse(health_data, status=status_code)


@csrf_exempt
@require_http_methods(["GET"])
@never_cache
def readiness_check(request):
    """
    Kubernetes/container readiness probe
    Checks if the application is ready to receive traffic
    """
    try:
        # Check critical dependencies
        db_conn = connections['default']
        with db_conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        return JsonResponse({
            'status': 'ready',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return JsonResponse({
            'status': 'not_ready',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }, status=503)


@csrf_exempt
@require_http_methods(["GET"])
@never_cache
def liveness_check(request):
    """
    Kubernetes/container liveness probe
    Checks if the application is alive and should not be restarted
    """
    return JsonResponse({
        'status': 'alive',
        'timestamp': datetime.now().isoformat(),
        'pid': os.getpid()
    })
