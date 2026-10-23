$wscript = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktop "Sortwise.lnk"
$shortcut = $wscript.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "C:\Users\Awsaf\Downloads\New folder\Sortwise-Portable.exe"
$shortcut.WorkingDirectory = "C:\Users\Awsaf\Downloads\New folder"
$shortcut.IconLocation = "C:\Users\Awsaf\Downloads\New folder\build\icon.ico"
$shortcut.Description = "Sortwise - Intelligent Desktop Organizer"
$shortcut.Save()
Write-Host "Desktop shortcut created successfully at: $shortcutPath"
