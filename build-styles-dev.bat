@echo off
REM MarketHub Styles Development Build Script
echo Building MarketHub styles for development...

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
copy homepage\static\MarketHub\css\markethub.css homepage\static\MarketHub\style.css

echo Development build complete! MarketHub styles have been compiled with expanded formatting.
echo.
echo Files generated:
echo - homepage/static/MarketHub/css/markethub.css (expanded + source map)
echo - homepage/static/MarketHub/style.css (main file)
echo.
echo Note: Use build-styles.bat for production builds.
echo.
pause
