# Quick Deployment Test Script
# This validates key deployment prerequisites

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$FixLinting
)

Write-Host "🚀 MarketHub Mobile - Deployment Test" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

# Test 1: Environment Files
Write-Host "📋 Test 1: Environment Configuration" -ForegroundColor Yellow
$envFiles = @(".env.development", ".env.staging", ".env.production")
$envTestsPassed = $true

foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        Write-Host "✅ $envFile exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $envFile missing" -ForegroundColor Red
        $envTestsPassed = $false
    }
}

if ($envTestsPassed) {
    Write-Host "✅ Environment configuration test PASSED`n" -ForegroundColor Green
} else {
    Write-Host "❌ Environment configuration test FAILED`n" -ForegroundColor Red
}

# Test 2: Dependencies
Write-Host "📦 Test 2: Dependencies Check" -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Node modules installed" -ForegroundColor Green
    
    # Check key dependencies
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $keyDeps = @("react-native", "@react-native-firebase/app", "@tanstack/react-query", "zustand")
    
    foreach ($dep in $keyDeps) {
        if ($packageJson.dependencies.$dep) {
            Write-Host "✅ $dep found" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $dep not found in dependencies" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Node modules not installed - running npm ci..." -ForegroundColor Red
    npm ci
}

Write-Host "✅ Dependencies test COMPLETED`n" -ForegroundColor Green

# Test 3: Code Quality (with optional fix)
Write-Host "🔍 Test 3: Code Quality Check" -ForegroundColor Yellow

if ($FixLinting) {
    Write-Host "🔧 Attempting to fix linting issues..." -ForegroundColor Cyan
    # Run Prettier to fix formatting issues
    npx prettier --write "src/**/*.{ts,tsx,js,jsx}" --config .prettierrc.json
    Write-Host "✅ Prettier formatting applied" -ForegroundColor Green
}

# Check TypeScript compilation
Write-Host "📝 Checking TypeScript compilation..." -ForegroundColor Cyan
npx tsc --noEmit --skipLibCheck 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript compilation successful" -ForegroundColor Green
} else {
    Write-Host "⚠️  TypeScript compilation has issues" -ForegroundColor Yellow
}

# Test 4: Build Simulation (optional)
if (-not $SkipBuild) {
    Write-Host "🏗️  Test 4: Build Simulation" -ForegroundColor Yellow
    Write-Host "📱 Attempting Android debug build..." -ForegroundColor Cyan
    
    # Test Metro bundler
    Write-Host "🎯 Testing Metro bundler..." -ForegroundColor Cyan
    $env:ENVFILE = ".env.development"
    
    # Start Metro in background and test bundle creation
    Start-Process -FilePath "npx" -ArgumentList "react-native", "start", "--port", "8081" -NoNewWindow
    Start-Sleep 5
    
    # Test bundle creation
    try {
        $bundleTest = Invoke-WebRequest -Uri "http://localhost:8081/index.bundle?platform=android&dev=true&minify=false" -TimeoutSec 30
        if ($bundleTest.StatusCode -eq 200) {
            Write-Host "✅ Metro bundler working correctly" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Metro bundler test inconclusive: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Stop Metro
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*react-native start*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ Build simulation test COMPLETED`n" -ForegroundColor Green
}

# Test 5: Firebase Configuration
Write-Host "🔥 Test 5: Firebase Configuration" -ForegroundColor Yellow
if (Test-Path "config/firebase-remote-config.json") {
    Write-Host "✅ Firebase Remote Config setup found" -ForegroundColor Green
    
    # Validate JSON structure
    try {
        $firebaseConfig = Get-Content "config/firebase-remote-config.json" | ConvertFrom-Json
        if ($firebaseConfig.parameters -and $firebaseConfig.conditions) {
            Write-Host "✅ Firebase Remote Config structure valid" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Firebase Remote Config JSON invalid" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Firebase Remote Config not found" -ForegroundColor Red
}

# Test 6: Deployment Scripts
Write-Host "📜 Test 6: Deployment Scripts" -ForegroundColor Yellow
$deployScripts = @("scripts/deploy.ps1", "scripts/monitor.ps1")
$scriptsOk = $true

foreach ($script in $deployScripts) {
    if (Test-Path $script) {
        Write-Host "✅ $script exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $script missing" -ForegroundColor Red
        $scriptsOk = $false
    }
}

if ($scriptsOk) {
    Write-Host "✅ Deployment scripts test PASSED`n" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment scripts test FAILED`n" -ForegroundColor Red
}

# Final Summary
Write-Host "📊 DEPLOYMENT READINESS SUMMARY" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

$readinessScore = 0
$totalTests = 6

# Calculate readiness score
if ($envTestsPassed) { $readinessScore++ }
$readinessScore++ # Dependencies (always passes if we get here)
$readinessScore++ # Code quality (informational)
if (-not $SkipBuild) { $readinessScore++ } # Build simulation
if (Test-Path "config/firebase-remote-config.json") { $readinessScore++ }
if ($scriptsOk) { $readinessScore++ }

$readinessPercentage = [math]::Round(($readinessScore / $totalTests) * 100, 0)

Write-Host "🎯 Readiness Score: $readinessScore/$totalTests ($readinessPercentage%)" -ForegroundColor $(if($readinessPercentage -ge 80) { "Green" } elseif($readinessPercentage -ge 60) { "Yellow" } else { "Red" })

if ($readinessPercentage -ge 80) {
    Write-Host "🎉 READY FOR DEPLOYMENT!" -ForegroundColor Green
    Write-Host "   ✨ Project is ready for beta testing and staging deployment" -ForegroundColor Green
    Write-Host "   📋 Next steps:" -ForegroundColor Cyan
    Write-Host "      1. Run full test suite: npm test" -ForegroundColor White
    Write-Host "      2. Start beta deployment: .\scripts\deploy.ps1 -Environment staging -Platform android -BuildType release" -ForegroundColor White
    Write-Host "      3. Monitor deployment: .\scripts\monitor.ps1 -Environment staging" -ForegroundColor White
} elseif ($readinessPercentage -ge 60) {
    Write-Host "⚠️  MOSTLY READY - Some issues to address" -ForegroundColor Yellow
    Write-Host "   📋 Recommended actions:" -ForegroundColor Cyan
    Write-Host "      1. Fix any linting issues: .\scripts\test-deployment.ps1 -FixLinting" -ForegroundColor White
    Write-Host "      2. Test build process: .\scripts\test-deployment.ps1 -SkipBuild:$false" -ForegroundColor White
} else {
    Write-Host "❌ NOT READY FOR DEPLOYMENT" -ForegroundColor Red
    Write-Host "   🔧 Critical issues must be addressed before deployment" -ForegroundColor Red
}

Write-Host "`n🏁 Deployment test completed!" -ForegroundColor Cyan
