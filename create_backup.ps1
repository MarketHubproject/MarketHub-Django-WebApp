# Create backup excluding large/unnecessary folders
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "backups\pre-rebrand-$timestamp"

# Create backup directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $backupPath

# Copy important files and folders, excluding unnecessary ones
$excludePatterns = @("debug.log", "node_modules", "venv", "__pycache__", "*.pyc", "backups")

# Get all files and folders excluding the patterns
$itemsToBackup = Get-ChildItem -Path "." -Recurse | Where-Object { 
    $item = $_
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($item.Name -like $pattern -or $item.FullName -like "*\$pattern\*") {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
}

# Create the zip file
$zipPath = "$backupPath\markethub-source-backup.zip"
$itemsToBackup | Compress-Archive -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Backup created at: $zipPath"
Write-Host "Database backup already at: $backupPath\db_backup.sqlite3"
