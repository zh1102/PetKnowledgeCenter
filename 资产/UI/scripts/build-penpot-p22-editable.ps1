# 将正式宠物与导航图标内嵌到 P22 原生可编辑 SVG 中，导入 Penpot 后无需本地路径。
param(
    [string]$Template = 'D:\ZH\宠物学堂\资产\UI\penpot-p22-reading-editable-v1.template.svg',
    [string]$Output = 'D:\ZH\宠物学堂\资产\UI\penpot-p22-reading-editable-v1.svg',
    [string]$AssetDirectory = 'D:\ZH\宠物学堂\资产\UI',
    [string]$PetAsset = 'D:\ZH\宠物学堂\资产\宠物\cat-juvenile-v2.png'
)

function Get-DataUri([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { throw "缺少资产：$Path" }
    return 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($Path))
}

$svg = [IO.File]::ReadAllText($Template, [Text.Encoding]::UTF8)
$map = @{
    '{{CAT}}' = Get-DataUri $PetAsset
    '{{NAV_TODAY}}' = Get-DataUri (Join-Path $AssetDirectory 'nav-icon-today-approved-cut-v1.png')
    '{{NAV_CHINESE}}' = Get-DataUri (Join-Path $AssetDirectory 'nav-icon-chinese-approved-cut-v1.png')
    '{{NAV_MATH}}' = Get-DataUri (Join-Path $AssetDirectory 'nav-icon-math-approved-cut-v1.png')
    '{{NAV_ENGLISH}}' = Get-DataUri (Join-Path $AssetDirectory 'nav-icon-english-approved-cut-v1.png')
    '{{NAV_GROWTH}}' = Get-DataUri (Join-Path $AssetDirectory 'nav-icon-growth-approved-cut-v1.png')
    '{{NAV_PET}}' = Get-DataUri (Join-Path $AssetDirectory 'nav-icon-pet-approved-cut-v1.png')
    '{{NAV_REPORT}}' = Get-DataUri (Join-Path $AssetDirectory 'nav-icon-report-approved-cut-v1.png')
    '{{NAV_SETTINGS}}' = Get-DataUri (Join-Path $AssetDirectory 'nav-icon-settings-approved-cut-v1.png')
}
foreach ($key in $map.Keys) { $svg = $svg.Replace($key, $map[$key]) }
[IO.File]::WriteAllText($Output, $svg, (New-Object Text.UTF8Encoding($false)))
