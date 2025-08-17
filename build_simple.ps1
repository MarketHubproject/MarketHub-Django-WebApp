# Simple SCSS Build Script for MarketHub
param(
    [string]$Mode = "development"
)

Write-Host "MarketHub SCSS Builder" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Configuration
$InputFile = "homepage\static\MarketHub\scss\markethub.scss"
$OutputFile = "homepage\static\MarketHub\css\markethub.css"
$OutputDir = "homepage\static\MarketHub\css"

# Ensure output directory exists
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Green
}

Write-Host "Compiling SCSS..." -ForegroundColor Yellow
Write-Host "Input: $InputFile" -ForegroundColor Gray
Write-Host "Output: $OutputFile" -ForegroundColor Gray

try {
    # Check if we have Node.js and can use sass
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
        
        # Try to compile with sass if available
        $sassResult = sass --version 2>$null
        if ($sassResult) {
            Write-Host "Sass found: $sassResult" -ForegroundColor Green
            
            if ($Mode -eq "production") {
                sass $InputFile $OutputFile --style=compressed
            } else {
                sass $InputFile $OutputFile --style=expanded --source-map
            }
            
            if ($LASTEXITCODE -eq 0) {
                $outputSize = (Get-Item $OutputFile).Length / 1KB
                Write-Host "SCSS compiled successfully!" -ForegroundColor Green
                Write-Host "Output size: $([math]::Round($outputSize, 2)) KB" -ForegroundColor Green
                
                Write-Host ""
                Write-Host "New modern components available:" -ForegroundColor Cyan
                Write-Host "- .btn-modern (modern buttons)" -ForegroundColor White
                Write-Host "- .card-modern (modern cards)" -ForegroundColor White
                Write-Host "- .btn-glass (glassmorphism)" -ForegroundColor White
                Write-Host "- Animation utilities" -ForegroundColor White
                
                Write-Host ""
                Write-Host "View style guide at: http://127.0.0.1:8000/style-guide/" -ForegroundColor Cyan
            } else {
                Write-Host "SCSS compilation failed!" -ForegroundColor Red
            }
        } else {
            Write-Host "Sass not found. Install with: npm install -g sass" -ForegroundColor Red
        }
    } else {
        Write-Host "Node.js not found. Please install Node.js first." -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Build process completed!" -ForegroundColor Green
