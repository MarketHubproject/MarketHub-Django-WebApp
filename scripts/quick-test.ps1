# Simple Deployment Readiness Test
Write-Host "🚀 MarketHub Mobile - Quick Deployment Test" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Environment Files Check
Write-Host "`n📋 Environment Files:" -ForegroundColor Yellow
$envFiles = @(".env.development", ".env.staging", ".env.production")
$envCount = 0
foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
        $envCount++
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
    }
}

# Dependencies Check
Write-Host "`n📦 Dependencies:" -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Node modules installed" -ForegroundColor Green
    $depsOk = $true
} else {
    Write-Host "❌ Node modules missing" -ForegroundColor Red
    $depsOk = $false
}

# Configuration Files Check
Write-Host "`n🔧 Configuration:" -ForegroundColor Yellow
$configFiles = @("config/firebase-remote-config.json", "scripts/deploy.ps1", "scripts/monitor.ps1")
$configCount = 0
foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
        $configCount++
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
    }
}

# Key Source Files Check
Write-Host "`n📁 Key Source Files:" -ForegroundColor Yellow
$sourceFiles = @("src/App.tsx", "src/shared/stores", "src/services", "src/features")
$sourceCount = 0
foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
        $sourceCount++
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
    }
}

# TypeScript Check
Write-Host "`n📝 TypeScript:" -ForegroundColor Yellow
try {
    $null = npx tsc --version 2>$null
    Write-Host "✅ TypeScript available" -ForegroundColor Green
    $tsOk = $true
} catch {
    Write-Host "❌ TypeScript not available" -ForegroundColor Red
    $tsOk = $false
}

# Summary
Write-Host "`n📊 SUMMARY:" -ForegroundColor Cyan
Write-Host "Environment Files: $envCount/3" -ForegroundColor $(if($envCount -eq 3) {"Green"} else {"Yellow"})
Write-Host "Dependencies: $(if($depsOk) {'OK'} else {'MISSING'})" -ForegroundColor $(if($depsOk) {"Green"} else {"Red"})
Write-Host "Config Files: $configCount/3" -ForegroundColor $(if($configCount -eq 3) {"Green"} else {"Yellow"})
Write-Host "Source Files: $sourceCount/4" -ForegroundColor $(if($sourceCount -eq 4) {"Green"} else {"Yellow"})
Write-Host "TypeScript: $(if($tsOk) {'OK'} else {'MISSING'})" -ForegroundColor $(if($tsOk) {"Green"} else {"Red"})

$totalScore = $envCount + $(if($depsOk) {1} else {0}) + $configCount + $sourceCount + $(if($tsOk) {1} else {0})
$maxScore = 11
$percentage = [math]::Round(($totalScore / $maxScore) * 100, 0)

Write-Host "`n🎯 Overall Score: $totalScore/$maxScore ($percentage%)" -ForegroundColor $(if($percentage -ge 80) {"Green"} elseif($percentage -ge 60) {"Yellow"} else {"Red"})

if ($percentage -ge 80) {
    Write-Host "🎉 READY FOR DEPLOYMENT!" -ForegroundColor Green
} elseif ($percentage -ge 60) {
    Write-Host "⚠️  MOSTLY READY - Minor issues" -ForegroundColor Yellow
} else {
    Write-Host "❌ NOT READY - Fix issues first" -ForegroundColor Red
}

Write-Host "`n🏁 Test completed!" -ForegroundColor Cyan
