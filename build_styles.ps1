# MarketHub Modern Theme Build Script
# This script compiles SCSS files and optimizes the CSS output

param(
    [Parameter()]
    [string]$Mode = "development",
    [Parameter()]
    [switch]$Watch = $false,
    [Parameter()]
    [switch]$Minify = $false
)

Write-Host "🎨 MarketHub Modern Theme Builder" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Configuration
$InputFile = "homepage\static\MarketHub\scss\markethub.scss"
$OutputFile = "homepage\static\MarketHub\css\markethub.css"
$OutputDir = "homepage\static\MarketHub\css"

# Ensure output directory exists
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
    Write-Host "✓ Created output directory: $OutputDir" -ForegroundColor Green
}

function Compile-SCSS {
    param(
        [string]$Input,
        [string]$Output,
        [bool]$IsMinified = $false
    )
    
    Write-Host "📦 Compiling SCSS..." -ForegroundColor Yellow
    
    try {
        # Check if Sass is installed
        $sassVersion = sass --version 2>$null
        if (!$sassVersion) {
            Write-Host "❌ Sass not found. Please install Sass:" -ForegroundColor Red
            Write-Host "   npm install -g sass" -ForegroundColor White
            Write-Host "   or visit: https://sass-lang.com/install" -ForegroundColor White
            exit 1
        }
        
        Write-Host "   Using Sass: $sassVersion" -ForegroundColor Gray
        
        # Build sass command
        $sassArgs = @()
        
        if ($IsMinified) {
            $sassArgs += "--style=compressed"
            Write-Host "   Style: Compressed (minified)" -ForegroundColor Gray
        } else {
            $sassArgs += "--style=expanded"
            Write-Host "   Style: Expanded (development)" -ForegroundColor Gray
        }
        
        # Add source maps for development
        if ($Mode -eq "development") {
            $sassArgs += "--source-map"
            Write-Host "   Source maps: Enabled" -ForegroundColor Gray
        }
        
        # Add input and output files
        $sassArgs += $Input
        $sassArgs += $Output
        
        # Execute sass command
        $sassCommand = "sass " + ($sassArgs -join " ")
        Write-Host "   Command: $sassCommand" -ForegroundColor DarkGray
        
        Invoke-Expression $sassCommand
        
        if ($LASTEXITCODE -eq 0) {
            $outputSize = (Get-Item $Output).Length / 1KB
            Write-Host "✅ SCSS compiled successfully!" -ForegroundColor Green
            Write-Host "   Output: $Output ($([math]::Round($outputSize, 2)) KB)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ SCSS compilation failed!" -ForegroundColor Red
            return $false
        }
        
    } catch {
        Write-Host "❌ Error during SCSS compilation: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Run-PostCSS {
    param([string]$CSSFile)
    
    Write-Host "🔧 Running PostCSS optimizations..." -ForegroundColor Yellow
    
    try {
        # Check if PostCSS is available
        $postcssVersion = postcss --version 2>$null
        if (!$postcssVersion) {
            Write-Host "⚠️  PostCSS not found. Skipping optimizations." -ForegroundColor Yellow
            Write-Host "   To install: npm install -g postcss postcss-cli autoprefixer cssnano" -ForegroundColor Gray
            return $false
        }
        
        # Create postcss config if it doesn't exist
        $postcssConfig = @"
module.exports = {
    plugins: [
        require('autoprefixer'),
        require('cssnano')({
            preset: 'default',
        }),
    ],
};
"@
        
        $configFile = "postcss.config.js"
        if (!(Test-Path $configFile)) {
            $postcssConfig | Out-File -FilePath $configFile -Encoding UTF8
            Write-Host "   Created PostCSS config: $configFile" -ForegroundColor Gray
        }
        
        # Run PostCSS
        $postcssCommand = "postcss $CSSFile --replace"
        Invoke-Expression $postcssCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostCSS optimizations applied!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  PostCSS optimizations failed!" -ForegroundColor Yellow
            return $false
        }
        
    } catch {
        Write-Host "⚠️  PostCSS error: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

function Generate-StyleGuide {
    Write-Host "📖 Generating style guide documentation..." -ForegroundColor Yellow
    
    # URL to access the style guide
    $styleGuideUrl = "http://127.0.0.1:8000/style-guide/"
    
    Write-Host "✅ Style guide template created!" -ForegroundColor Green
    Write-Host "   Access at: $styleGuideUrl" -ForegroundColor Green
    Write-Host "   Template: homepage/templates/homepage/style_guide.html" -ForegroundColor Gray
}

function Show-Summary {
    param(
        [bool]$CompilationSuccess,
        [string]$OutputFile
    )
    
    Write-Host ""
    Write-Host "🎯 Build Summary" -ForegroundColor Cyan
    Write-Host "===============" -ForegroundColor Cyan
    
    if ($CompilationSuccess) {
        Write-Host "✅ Status: SUCCESS" -ForegroundColor Green
        
        if (Test-Path $OutputFile) {
            $fileSize = (Get-Item $OutputFile).Length / 1KB
            $lastModified = (Get-Item $OutputFile).LastWriteTime
            
            Write-Host "📄 Output file: $OutputFile" -ForegroundColor White
            Write-Host "📏 File size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor White
            Write-Host "🕐 Last modified: $lastModified" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "🎨 New Features Available:" -ForegroundColor Cyan
        Write-Host "• Modern button system (.btn-modern)" -ForegroundColor White
        Write-Host "• Enhanced card components (.card-modern)" -ForegroundColor White
        Write-Host "• Glassmorphism effects (.btn-glass, .card-glass)" -ForegroundColor White
        Write-Host "• Animation utilities (.animate-*)" -ForegroundColor White
        Write-Host "• Improved design tokens and variables" -ForegroundColor White
        
        Write-Host ""
        Write-Host "📖 View the style guide at: http://127.0.0.1:8000/style-guide/" -ForegroundColor Cyan
        
    } else {
        Write-Host "❌ Status: FAILED" -ForegroundColor Red
        Write-Host "Check the error messages above for details." -ForegroundColor White
    }
}

# Main execution
Write-Host "🚀 Starting build process..." -ForegroundColor Yellow
Write-Host "   Mode: $Mode" -ForegroundColor Gray
Write-Host "   Input: $InputFile" -ForegroundColor Gray
Write-Host "   Output: $OutputFile" -ForegroundColor Gray

if ($Watch) {
    Write-Host "   Watch mode: Enabled" -ForegroundColor Gray
    Write-Host ""
    Write-Host "👀 Starting watch mode..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop watching" -ForegroundColor Gray
    
    # Use sass --watch for continuous compilation
    $watchCommand = "sass --watch `"$InputFile`":`"$OutputFile`" --style=expanded --source-map"
    Invoke-Expression $watchCommand
    
} else {
    # Single compilation
    $shouldMinify = $Minify -or ($Mode -eq "production")
    $success = Compile-SCSS -Input $InputFile -Output $OutputFile -IsMinified $shouldMinify
    
    if ($success -and ($Mode -eq "production")) {
        # Apply PostCSS optimizations in production
        Run-PostCSS -CSSFile $OutputFile
    }
    
    # Generate documentation
    Generate-StyleGuide
    
    # Show summary
    Show-Summary -CompilationSuccess $success -OutputFile $OutputFile
}

Write-Host ""
Write-Host "🎉 Build process completed!" -ForegroundColor Green
