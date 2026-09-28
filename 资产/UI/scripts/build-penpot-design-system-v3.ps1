# 基于 v2 生成独立 v3：仅替换左侧导航，保留其他已确认设计令牌与组件。
# 导航图标以 Base64 内嵌，确保导入 Penpot 后不依赖本地文件路径。
param(
    [Parameter(Mandatory = $true)]
    [string]$InputSvg,
    [Parameter(Mandatory = $true)]
    [string]$OutputSvg,
    [Parameter(Mandatory = $true)]
    [string]$AssetDirectory
)

function Get-EmbeddedPng([string]$Name) {
    $path = Join-Path $AssetDirectory ("nav-icon-{0}-approved-cut-v1.png" -f $Name)
    if (-not (Test-Path -LiteralPath $path)) {
        throw "缺少导航图标：$path"
    }
    return 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
}

$svg = [IO.File]::ReadAllText($InputSvg, [Text.Encoding]::UTF8)
$svg = $svg.Replace('Design System v2', 'Design System v3')

$today = Get-EmbeddedPng 'today'
$chinese = Get-EmbeddedPng 'chinese'
$math = Get-EmbeddedPng 'math'
$english = Get-EmbeddedPng 'english'
$growth = Get-EmbeddedPng 'growth'
$pet = Get-EmbeddedPng 'pet'
$report = Get-EmbeddedPng 'report'
$settings = Get-EmbeddedPng 'settings'

$sidebar = @"
  <!-- 左侧导航组件：直接使用已确认 P23 母版像素切图，避免二次重绘造成质感漂移。 -->
  <g id="Sidebar-Navigation-v3" transform="translate(890 300)">
    <rect width="220" height="620" rx="26" fill="#F0EBFF"/>
    <text class="font h2" x="28" y="48">宠物学堂</text>
    <text class="font note" x="28" y="74" fill="#8E7DBB">让每个孩子爱上学习</text>

    <g id="Nav-Today-Selected" transform="translate(14 98)">
      <rect width="192" height="64" rx="20" fill="#FFFFFF" fill-opacity="0.64" stroke="#FFFFFF" stroke-width="2"/>
      <image x="14" y="8" width="48" height="48" href="$today"/>
      <text class="font" x="70" y="40" font-size="18" font-weight="700" fill="#7656D7">今日任务</text>
    </g>
    <g id="Nav-Chinese" transform="translate(14 170)"><image x="14" y="8" width="48" height="48" href="$chinese"/><text class="font body" x="70" y="40" fill="#55477B">语文</text></g>
    <g id="Nav-Math" transform="translate(14 226)"><image x="14" y="8" width="48" height="48" href="$math"/><text class="font body" x="70" y="40" fill="#55477B">数感</text></g>
    <g id="Nav-English" transform="translate(14 282)"><image x="14" y="8" width="48" height="48" href="$english"/><text class="font body" x="70" y="40" fill="#55477B">英语</text></g>
    <g id="Nav-Growth" transform="translate(14 338)"><image x="14" y="8" width="48" height="48" href="$growth"/><text class="font body" x="70" y="40" fill="#55477B">成长中心</text></g>
    <line x1="24" y1="406" x2="196" y2="406" stroke="#D5C9F2"/>
    <g id="Nav-Pet" transform="translate(14 418)"><image x="14" y="8" width="48" height="48" href="$pet"/><text class="font body" x="70" y="40" fill="#55477B">我的宠物</text></g>
    <g id="Nav-Report" transform="translate(14 474)"><image x="14" y="8" width="48" height="48" href="$report"/><text class="font body" x="70" y="40" fill="#55477B">学习报告</text></g>
    <g id="Nav-Settings" transform="translate(14 530)"><image x="14" y="8" width="48" height="48" href="$settings"/><text class="font body" x="70" y="40" fill="#55477B">设置</text></g>
    <text class="font note" x="28" y="606">iPad 固定宽度约 176px</text>
  </g>

"@

$pattern = '(?s)  <!-- 左侧导航组件 -->.*?(?=  <!-- 弹窗组件 -->)'
if (-not [regex]::IsMatch($svg, $pattern)) {
    throw '未找到 v2 左侧导航区块，停止生成以避免输出错误文件。'
}

$result = [regex]::Replace($svg, $pattern, $sidebar)
[IO.File]::WriteAllText($OutputSvg, $result, (New-Object Text.UTF8Encoding($false)))
