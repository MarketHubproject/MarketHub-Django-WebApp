# MarketHub Mobile Deployment Script
# Usage: .\scripts\deploy.ps1 -Environment "staging" -Platform "android" -BuildType "release"

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("android", "ios", "both")]
    [string]$Platform,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("debug", "release")]
    [string]$BuildType,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipLinting,

    [Parameter(Mandatory=$false)]
    [switch]$UploadToStore
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput($ForegroundColor, $Message) {
    Write-Host $Message -ForegroundColor $ForegroundColor
}

function Write-StepHeader($Message) {
    Write-Host ""
    Write-ColorOutput Cyan "🚀 $Message"
    Write-Host "=" * 60 -ForegroundColor Cyan
}

function Write-Success($Message) {
    Write-ColorOutput Green "✅ $Message"
}

function Write-Error($Message) {
    Write-ColorOutput Red "❌ $Message"
}

function Write-Warning($Message) {
    Write-ColorOutput Yellow "⚠️  $Message"
}

function Write-Info($Message) {
    Write-ColorOutput Blue "ℹ️  $Message"
}

# Start deployment
Write-StepHeader "Starting MarketHub Mobile Deployment"
Write-Info "Environment: $Environment"
Write-Info "Platform: $Platform"
Write-Info "Build Type: $BuildType"
Write-Host ""

try {
    # Step 1: Validate Environment
    Write-StepHeader "Step 1: Environment Validation"
    
    if (!(Test-Path ".env.$Environment")) {
        Write-Error "Environment file .env.$Environment not found!"
        exit 1
    }
    Write-Success "Environment file validated"
    
    # Check Node version
    $nodeVersion = node --version
    Write-Info "Node.js version: $nodeVersion"
    
    if (![version]$nodeVersion.Substring(1) -ge [version]"18.0.0") {
        Write-Error "Node.js version 18+ required"
        exit 1
    }
    Write-Success "Node.js version check passed"

    # Step 2: Install Dependencies
    Write-StepHeader "Step 2: Installing Dependencies"
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    Write-Success "Dependencies installed"

    # Step 3: Code Quality Checks
    if (!$SkipLinting) {
        Write-StepHeader "Step 3: Code Quality Checks"
        
        Write-Info "Running ESLint..."
        npm run lint
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Linting failed"
            exit 1
        }
        Write-Success "ESLint passed"
        
        Write-Info "Checking for Chinese Unicode..."
        npm run lint:chinese
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Chinese Unicode check failed"
            exit 1
        }
        Write-Success "Chinese Unicode check passed"
        
        Write-Info "Checking i18n keys..."
        npm run lint:i18n
        if ($LASTEXITCODE -ne 0) {
            Write-Error "i18n keys validation failed"
            exit 1
        }
        Write-Success "i18n validation passed"
    }

    # Step 4: Run Tests
    if (!$SkipTests) {
        Write-StepHeader "Step 4: Running Tests"
        
        Write-Info "Running unit tests..."
        npm run test:ci
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Unit tests failed"
            exit 1
        }
        Write-Success "Unit tests passed"
        
        if ($Environment -eq "staging" -or $Environment -eq "production") {
            Write-Info "Running E2E tests..."
            npm run test:e2e:build:android
            npm run test:e2e:test:android
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "E2E tests failed - continuing with deployment"
            } else {
                Write-Success "E2E tests passed"
            }
        }
    }

    # Step 5: Build Applications
    Write-StepHeader "Step 5: Building Applications"
    
    $Env:ENVFILE = ".env.$Environment"
    Write-Info "Using environment file: $Env:ENVFILE"
    
    if ($Platform -eq "android" -or $Platform -eq "both") {
        Write-Info "Building Android..."
        if ($BuildType -eq "release") {
            npm run build:android:release
        } else {
            npm run build:android:debug
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Android build failed"
            exit 1
        }
        Write-Success "Android build completed"
    }
    
    if ($Platform -eq "ios" -or $Platform -eq "both") {
        Write-Info "Building iOS..."
        if ($BuildType -eq "release") {
            npm run build:ios:release
        } else {
            npm run build:ios:debug
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Error "iOS build failed"
            exit 1
        }
        Write-Success "iOS build completed"
    }

    # Step 6: Generate Build Artifacts
    Write-StepHeader "Step 6: Generating Build Artifacts"
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $buildDir = "builds/$Environment-$BuildType-$timestamp"
    New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
    
    # Copy APK/AAB files
    if ($Platform -eq "android" -or $Platform -eq "both") {
        $androidBuildPath = "android/app/build/outputs/apk/$BuildType"
        $aabBuildPath = "android/app/build/outputs/bundle/$($BuildType)Release"
        
        if (Test-Path $androidBuildPath) {
            Copy-Item "$androidBuildPath/*" "$buildDir/" -Recurse
            Write-Success "Android artifacts copied to $buildDir"
        }
        
        if (Test-Path $aabBuildPath) {
            Copy-Item "$aabBuildPath/*" "$buildDir/" -Recurse
            Write-Success "Android bundle artifacts copied to $buildDir"
        }
    }
    
    # Generate build info
    $buildInfo = @{
        environment = $Environment
        platform = $Platform
        buildType = $BuildType
        timestamp = $timestamp
        gitCommit = (git rev-parse HEAD)
        gitBranch = (git rev-parse --abbrev-ref HEAD)
        nodeVersion = $nodeVersion
        reactNativeVersion = (npm list react-native --depth=0 | Select-String "react-native@")
    } | ConvertTo-Json -Depth 3
    
    $buildInfo | Out-File "$buildDir/build-info.json" -Encoding UTF8
    Write-Success "Build info generated"

    # Step 7: Upload to App Stores (if requested)
    if ($UploadToStore -and $BuildType -eq "release") {
        Write-StepHeader "Step 7: Uploading to App Stores"
        
        if ($Environment -eq "production") {
            Write-Info "Uploading to production app stores..."
            # Add App Store Connect and Google Play Console upload commands here
            Write-Warning "Store upload functionality not implemented in this script"
        } else {
            Write-Info "Store upload skipped for $Environment environment"
        }
    }

    # Step 8: Deployment Summary
    Write-StepHeader "Deployment Summary"
    Write-Success "✨ Deployment completed successfully!"
    Write-Info "Environment: $Environment"
    Write-Info "Platform: $Platform"
    Write-Info "Build Type: $BuildType"
    Write-Info "Build Artifacts: $buildDir"
    Write-Info "Git Commit: $(git rev-parse --short HEAD)"
    Write-Info "Timestamp: $timestamp"
    
    if ($Environment -eq "production") {
        Write-Warning "🚨 This is a PRODUCTION deployment!"
        Write-Warning "Please monitor application metrics closely."
    }

} catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
}
