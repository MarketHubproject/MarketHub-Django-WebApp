@echo off
REM Store Lite Styles Development Build Script
echo Building Store Lite styles for development...

REM Clean previous builds
if exist homepage\static\MarketHub\css\*.css (
    echo Removing old CSS files...
    del homepage\static\MarketHub\css\*.css*
)

REM Compile SCSS to CSS (expanded for debugging)
echo Compiling SCSS with expanded output...
call npm run build-dev

REM Copy compiled CSS to main style location
echo Updating main style.css...
copy homepage\static\MarketHub\css\store-lite.css homepage\static\MarketHub\style.css

echo Development build complete! Store Lite styles have been compiled with expanded formatting.
echo.
echo Files generated:
echo - homepage/static/MarketHub/css/store-lite.css (expanded + source map)
echo - homepage/static/MarketHub/style.css (main file)
echo.
echo Note: Use build-styles.bat for production builds.
echo.
pause
