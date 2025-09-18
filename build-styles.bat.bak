@echo off
REM Store Lite Styles Build Script
echo Building Store Lite styles...

REM Clean previous builds
if exist homepage\static\MarketHub\css\*.css (
    echo Removing old CSS files...
    del homepage\static\MarketHub\css\*.css*
)

REM Compile SCSS to CSS
echo Compiling SCSS...
call npm run build

REM Copy compiled CSS to main style location
echo Updating main style.css...
copy homepage\static\MarketHub\css\store-lite.css homepage\static\MarketHub\style.css

echo Build complete! Store Lite styles have been compiled and deployed.
echo.
echo Files generated:
echo - homepage/static/MarketHub/css/store-lite.css (compressed)
echo - homepage/static/MarketHub/style.css (main file)
echo.
pause
