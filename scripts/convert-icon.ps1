Add-Type -AssemblyName System.Drawing

$src = 'C:\Users\Awsaf\.gemini\antigravity-ide\brain\51ea4b67-d063-4e80-b7af-beadf5ac5aae\sortwise_app_icon_1792744069921.jpg'
$img = [System.Drawing.Image]::FromFile($src)
$resized = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($resized)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 256, 256)
$g.Dispose()

$ms = New-Object System.IO.MemoryStream
$resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()

# Save PNG
if (-not (Test-Path 'electron')) { New-Item -ItemType Directory -Path 'electron' | Out-Null }
if (-not (Test-Path 'build')) { New-Item -ItemType Directory -Path 'build' | Out-Null }

[System.IO.File]::WriteAllBytes('electron\icon.png', $pngBytes)
[System.IO.File]::WriteAllBytes('build\icon.png', $pngBytes)

# Create 256x256 ICO container with PNG payload
$header = New-Object byte[] 22
$header[0] = 0
$header[1] = 0
$header[2] = 1 # ICON type
$header[3] = 0
$header[4] = 1 # Count 1
$header[5] = 0

$header[6] = 0  # 256 width (0 = 256)
$header[7] = 0  # 256 height (0 = 256)
$header[8] = 0  # color count
$header[9] = 0  # reserved
$header[10] = 1 # planes
$header[11] = 0
$header[12] = 32 # bpp
$header[13] = 0

[BitConverter]::GetBytes([uint32]$pngBytes.Length).CopyTo($header, 14)
[BitConverter]::GetBytes([uint32]22).CopyTo($header, 18)

$icoBytes = New-Object byte[] ($header.Length + $pngBytes.Length)
[Buffer]::BlockCopy($header, 0, $icoBytes, 0, $header.Length)
[Buffer]::BlockCopy($pngBytes, 0, $icoBytes, $header.Length, $pngBytes.Length)

[System.IO.File]::WriteAllBytes('build\icon.ico', $icoBytes)
[System.IO.File]::WriteAllBytes('electron\icon.ico', $icoBytes)

Write-Host "Generated icon.png and icon.ico successfully! ICO size: $($icoBytes.Length) bytes"
