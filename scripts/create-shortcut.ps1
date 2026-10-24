$wscript = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)

# Remove legacy shortcut if present
$legacyShortcut = Join-Path $desktop "Sortwise.lnk"
if (Test-Path $legacyShortcut) {
    Remove-Item $legacyShortcut -Force -ErrorAction SilentlyContinue
}

$shortcutPath = Join-Path $desktop "NexusFile.lnk"
$shortcut = $wscript.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "C:\Users\Awsaf\Downloads\New folder\NexusFile-Portable.exe"
$shortcut.WorkingDirectory = "C:\Users\Awsaf\Downloads\New folder"
$shortcut.IconLocation = "C:\Users\Awsaf\Downloads\New folder\build\icon.ico"
$shortcut.Description = "NexusFile - High-Performance Automated File Management & Storage Studio"
$shortcut.Save()
Write-Host "Desktop shortcut created successfully at: $shortcutPath"

