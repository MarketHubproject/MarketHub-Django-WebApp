@echo off
REM MarketHub Styles Build Script
echo Building MarketHub styles...

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
copy homepage\static\MarketHub\css\MarketHub.css homepage\static\MarketHub\style.css

echo Build complete! MarketHub styles have been compiled and deployed.
echo.
echo Files generated:
echo - homepage/static/MarketHub/css/MarketHub.css (compressed)
echo - homepage/static/MarketHub/style.css (main file)
echo.
pause
