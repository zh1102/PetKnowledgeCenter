# 将已确认的 P22 母版嵌入分层测试 SVG，避免任何外部路径依赖。
param(
    [string]$Template = 'D:\ZH\宠物学堂\资产\UI\penpot-p22-layer-import-test-v1.template.svg',
    [string]$Reference = 'D:\ZH\宠物学堂\资产\UI\child-p22-reading-checkin-ipad-simple-v2-official-pet.png',
    [string]$Output = 'D:\ZH\宠物学堂\资产\UI\penpot-p22-layer-import-test-v1.svg'
)

if (-not (Test-Path -LiteralPath $Template)) { throw "缺少模板：$Template" }
if (-not (Test-Path -LiteralPath $Reference)) { throw "缺少参考图：$Reference" }
$svg = [IO.File]::ReadAllText($Template, [Text.Encoding]::UTF8)
$dataUri = 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($Reference))
$svg = $svg.Replace('{{REFERENCE_PNG}}', $dataUri)
[IO.File]::WriteAllText($Output, $svg, (New-Object Text.UTF8Encoding($false)))
