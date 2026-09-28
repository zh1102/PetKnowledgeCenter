# 从已确认的“三米打卡”母版中按原始像素裁切导航图标。
# 保留图标周围的小范围原生浅薰衣草底色，避免自动抠图破坏细线抗锯齿。
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceImage,
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $SourceImage)) {
    throw "找不到参考图：$SourceImage"
}

if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}

$source = [System.Drawing.Bitmap]::FromFile($SourceImage)

# 坐标来自 1017×792 的已确认参考图；统一裁成 48×48，保证放回侧栏时对齐一致。
$icons = @(
    @{ Name = 'today';    X = 40; Y = 153 },
    @{ Name = 'chinese';  X = 40; Y = 216 },
    @{ Name = 'math';     X = 40; Y = 279 },
    @{ Name = 'english';  X = 40; Y = 342 },
    @{ Name = 'growth';   X = 40; Y = 403 },
    @{ Name = 'pet';      X = 40; Y = 486 },
    @{ Name = 'report';   X = 40; Y = 530 },
    @{ Name = 'settings'; X = 40; Y = 572 }
)

try {
    foreach ($icon in $icons) {
        $rectangle = New-Object System.Drawing.Rectangle($icon.X, $icon.Y, 48, 48)
        $crop = $source.Clone($rectangle, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        try {
            $outputPath = Join-Path $OutputDirectory ("nav-icon-{0}-approved-cut-v1.png" -f $icon.Name)
            $crop.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $crop.Dispose()
        }
    }
}
finally {
    $source.Dispose()
}
