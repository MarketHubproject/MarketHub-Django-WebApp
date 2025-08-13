# MarketHub Mobile Monitoring Script
# Usage: .\scripts\monitor.ps1 -Environment "production" -CheckType "all"

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("api", "analytics", "performance", "errors", "all")]
    [string]$CheckType = "all",
    
    [Parameter(Mandatory=$false)]
    [int]$IntervalMinutes = 5,
    
    [Parameter(Mandatory=$false)]
    [switch]$ContinuousMonitoring
)

# Load environment configuration
if (Test-Path ".env.$Environment") {
    Get-Content ".env.$Environment" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2])
        }
    }
}

$apiBaseUrl = [Environment]::GetEnvironmentVariable("API_BASE_URL")
$analyticsId = [Environment]::GetEnvironmentVariable("ANALYTICS_TRACKING_ID")

function Write-MonitorOutput($Level, $Message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "INFO" { "Cyan" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-ApiHealth {
    Write-MonitorOutput "INFO" "Checking API health..."
    
    try {
        $healthEndpoint = "$apiBaseUrl/health"
        $response = Invoke-RestMethod -Uri $healthEndpoint -Method GET -TimeoutSec 10
        
        if ($response.status -eq "healthy") {
            Write-MonitorOutput "SUCCESS" "✅ API health check passed"
            return $true
        } else {
            Write-MonitorOutput "WARNING" "⚠️  API health check returned: $($response.status)"
            return $false
        }
    } catch {
        Write-MonitorOutput "ERROR" "❌ API health check failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-ApiPerformance {
    Write-MonitorOutput "INFO" "Testing API performance..."
    
    $endpoints = @(
        "/api/v1/products?limit=10",
        "/api/v1/categories",
        "/api/v1/user/profile"
    )
    
    $results = @()
    
    foreach ($endpoint in $endpoints) {
        try {
            $fullUrl = "$apiBaseUrl$endpoint"
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            
            $response = Invoke-RestMethod -Uri $fullUrl -Method GET -TimeoutSec 30
            $stopwatch.Stop()
            
            $responseTime = $stopwatch.ElapsedMilliseconds
            $results += @{
                endpoint = $endpoint
                responseTime = $responseTime
                status = "success"
            }
            
            $statusIcon = if ($responseTime -lt 1000) { "✅" } elseif ($responseTime -lt 3000) { "⚠️" } else { "❌" }
            Write-MonitorOutput "INFO" "$statusIcon $endpoint - ${responseTime}ms"
            
        } catch {
            $results += @{
                endpoint = $endpoint
                responseTime = -1
                status = "failed"
                error = $_.Exception.Message
            }
            Write-MonitorOutput "ERROR" "❌ $endpoint - Failed: $($_.Exception.Message)"
        }
    }
    
    return $results
}

function Get-ErrorMetrics {
    Write-MonitorOutput "INFO" "Collecting error metrics..."
    
    try {
        # This would typically connect to your error tracking service (Sentry, etc.)
        $errorEndpoint = "$apiBaseUrl/api/v1/metrics/errors"
        $response = Invoke-RestMethod -Uri $errorEndpoint -Method GET -TimeoutSec 10
        
        $criticalErrors = $response.critical_errors_24h
        $totalErrors = $response.total_errors_24h
        $errorRate = $response.error_rate_percentage
        
        Write-MonitorOutput "INFO" "📊 Error Metrics (24h):"
        Write-MonitorOutput "INFO" "   - Critical Errors: $criticalErrors"
        Write-MonitorOutput "INFO" "   - Total Errors: $totalErrors"
        Write-MonitorOutput "INFO" "   - Error Rate: $errorRate%"
        
        if ($errorRate -gt 5) {
            Write-MonitorOutput "ERROR" "🚨 High error rate detected: $errorRate%"
            return $false
        } elseif ($errorRate -gt 2) {
            Write-MonitorOutput "WARNING" "⚠️  Elevated error rate: $errorRate%"
        } else {
            Write-MonitorOutput "SUCCESS" "✅ Error rate within acceptable limits"
        }
        
        return $true
        
    } catch {
        Write-MonitorOutput "ERROR" "❌ Failed to collect error metrics: $($_.Exception.Message)"
        return $false
    }
}

function Get-UserMetrics {
    Write-MonitorOutput "INFO" "Collecting user engagement metrics..."
    
    try {
        $metricsEndpoint = "$apiBaseUrl/api/v1/metrics/users"
        $response = Invoke-RestMethod -Uri $metricsEndpoint -Method GET -TimeoutSec 10
        
        $dailyActiveUsers = $response.daily_active_users
        $sessionDuration = $response.avg_session_duration_minutes
        $retentionRate = $response.retention_rate_7day
        
        Write-MonitorOutput "INFO" "👥 User Metrics:"
        Write-MonitorOutput "INFO" "   - Daily Active Users: $dailyActiveUsers"
        Write-MonitorOutput "INFO" "   - Avg Session Duration: ${sessionDuration} min"
        Write-MonitorOutput "INFO" "   - 7-Day Retention: $retentionRate%"
        
        if ($retentionRate -lt 50) {
            Write-MonitorOutput "WARNING" "⚠️  Low retention rate: $retentionRate%"
        } else {
            Write-MonitorOutput "SUCCESS" "✅ User engagement metrics healthy"
        }
        
        return $true
        
    } catch {
        Write-MonitorOutput "ERROR" "❌ Failed to collect user metrics: $($_.Exception.Message)"
        return $false
    }
}

function Get-BusinessMetrics {
    Write-MonitorOutput "INFO" "Collecting business metrics..."
    
    try {
        $businessEndpoint = "$apiBaseUrl/api/v1/metrics/business"
        $response = Invoke-RestMethod -Uri $businessEndpoint -Method GET -TimeoutSec 10
        
        $conversionRate = $response.conversion_rate_24h
        $averageOrderValue = $response.avg_order_value_24h
        $totalRevenue = $response.total_revenue_24h
        
        Write-MonitorOutput "INFO" "💰 Business Metrics (24h):"
        Write-MonitorOutput "INFO" "   - Conversion Rate: $conversionRate%"
        Write-MonitorOutput "INFO" "   - Avg Order Value: $averageOrderValue"
        Write-MonitorOutput "INFO" "   - Total Revenue: $totalRevenue"
        
        if ($conversionRate -lt 2) {
            Write-MonitorOutput "WARNING" "⚠️  Low conversion rate: $conversionRate%"
        } else {
            Write-MonitorOutput "SUCCESS" "✅ Business metrics within target range"
        }
        
        return $true
        
    } catch {
        Write-MonitorOutput "ERROR" "❌ Failed to collect business metrics: $($_.Exception.Message)"
        return $false
    }
}

function Send-AlertNotification($AlertType, $Message) {
    Write-MonitorOutput "INFO" "Sending alert notification..."
    
    # This would integrate with your alerting system (Slack, PagerDuty, etc.)
    $alertData = @{
        environment = $Environment
        alert_type = $AlertType
        message = $Message
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }
    
    try {
        # Example: Send to Slack webhook
        # $slackWebhook = "https://hooks.slack.com/your-webhook"
        # Invoke-RestMethod -Uri $slackWebhook -Method POST -Body ($alertData | ConvertTo-Json)
        
        Write-MonitorOutput "INFO" "Alert would be sent: $AlertType - $Message"
        return $true
    } catch {
        Write-MonitorOutput "ERROR" "❌ Failed to send alert: $($_.Exception.Message)"
        return $false
    }
}

function Start-MonitoringCheck {
    Write-MonitorOutput "INFO" "🔍 Starting monitoring check for $Environment environment"
    Write-MonitorOutput "INFO" "Check types: $CheckType"
    Write-Host ""
    
    $overallHealthy = $true
    $alerts = @()
    
    # API Health Check
    if ($CheckType -eq "all" -or $CheckType -eq "api") {
        $apiHealthy = Test-ApiHealth
        if (-not $apiHealthy) {
            $overallHealthy = $false
            $alerts += "API health check failed"
        }
        
        $apiPerf = Test-ApiPerformance
        $slowEndpoints = $apiPerf | Where-Object { $_.responseTime -gt 3000 -or $_.status -eq "failed" }
        if ($slowEndpoints.Count -gt 0) {
            $alerts += "Slow or failed API endpoints detected"
        }
    }
    
    # Analytics and Performance
    if ($CheckType -eq "all" -or $CheckType -eq "analytics" -or $CheckType -eq "performance") {
        $userMetricsHealthy = Get-UserMetrics
        if (-not $userMetricsHealthy) {
            $alerts += "User engagement metrics collection failed"
        }
        
        $businessMetricsHealthy = Get-BusinessMetrics
        if (-not $businessMetricsHealthy) {
            $alerts += "Business metrics collection failed"
        }
    }
    
    # Error Monitoring
    if ($CheckType -eq "all" -or $CheckType -eq "errors") {
        $errorMetricsHealthy = Get-ErrorMetrics
        if (-not $errorMetricsHealthy) {
            $overallHealthy = $false
            $alerts += "High error rate detected"
        }
    }
    
    # Send alerts if needed
    foreach ($alert in $alerts) {
        Send-AlertNotification -AlertType "WARNING" -Message $alert
    }
    
    # Summary
    Write-Host ""
    Write-MonitorOutput "INFO" "📊 Monitoring Summary:"
    if ($overallHealthy) {
        Write-MonitorOutput "SUCCESS" "✅ All systems healthy"
    } else {
        Write-MonitorOutput "ERROR" "❌ Issues detected - check alerts above"
    }
    
    return $overallHealthy
}

# Main execution
if ($ContinuousMonitoring) {
    Write-MonitorOutput "INFO" "Starting continuous monitoring (every $IntervalMinutes minutes)..."
    Write-MonitorOutput "INFO" "Press Ctrl+C to stop monitoring"
    
    while ($true) {
        Start-MonitoringCheck
        Write-MonitorOutput "INFO" "Waiting $IntervalMinutes minutes until next check..."
        Start-Sleep -Seconds ($IntervalMinutes * 60)
        Write-Host ""
    }
} else {
    Start-MonitoringCheck
}
