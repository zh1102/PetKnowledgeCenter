// P22 阅读打卡 Penpot 混合分层构建脚本。
// 原则：视觉区域直接从已确认母版无损切分，避免重绘造成风格漂移；
// 同时在 SVG 中补充可编辑的卡片、输入框、按钮和进度条轮廓，供 Penpot 后续原生化替换。
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = 'D:/ZH/宠物学堂';
const uiDir = path.join(root, '资产', 'UI');
const source = path.join(uiDir, 'child-p22-reading-checkin-ipad-simple-v2-official-pet.png');
const outputSvg = path.join(uiDir, 'penpot-p22-reading-hybrid-layered-v2.svg');
const preview = path.join(uiDir, 'penpot-p22-reading-hybrid-layered-v2-preview.png');
const sliceDir = path.join(uiDir, 'P22-阅读打卡-分层资产-v2');

const slices = [
  { id: '01-nav', label: '01 左侧导航', x: 0, y: 0, w: 255, h: 1086 },
  { id: '02-header', label: '02 标题与用户区', x: 255, y: 0, w: 1193, h: 263 },
  { id: '03-main-left', label: '03 目标与宠物插画', x: 255, y: 263, w: 618, h: 722 },
  { id: '04-main-right', label: '04 完成记录表单', x: 873, y: 263, w: 575, h: 722 },
  { id: '05-footer-left', label: '05 左下装饰', x: 255, y: 985, w: 596, h: 101 },
  { id: '06-footer-right', label: '06 右下装饰', x: 851, y: 985, w: 597, h: 101 },
];

function esc(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

async function main() {
  fs.mkdirSync(sliceDir, { recursive: true });
  const imageNodes = [];
  for (const item of slices) {
    const target = path.join(sliceDir, `${item.id}.png`);
    await sharp(source).extract({ left: item.x, top: item.y, width: item.w, height: item.h }).png().toFile(target);
    const data = fs.readFileSync(target).toString('base64');
    imageNodes.push(`<g id="${item.id}" data-layer-name="${esc(item.label)}"><image x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" href="data:image/png;base64,${data}"/></g>`);
  }

  // 覆盖层默认近乎透明，导入 Penpot 后可单独选中并逐步替换为原生组件。
  // 不设置 pointer-events:none，确保在设计工具中可以被选取。
  const editableOverlay = `
  <g id="07-editable-controls" data-layer-name="07 可编辑控件覆盖层" opacity="0.012">
    <rect id="card-goal" x="277" y="263" width="580" height="722" rx="30" fill="#FFFFFF" stroke="#8F72E8" stroke-width="2"/>
    <rect id="card-record" x="874" y="263" width="546" height="722" rx="30" fill="#FFFFFF" stroke="#8F72E8" stroke-width="2"/>
    <rect id="input-book" x="907" y="419" width="483" height="71" rx="18" fill="#FFFFFF" stroke="#8F72E8" stroke-width="2"/>
    <rect id="input-page" x="907" y="556" width="483" height="71" rx="18" fill="#FFFFFF" stroke="#8F72E8" stroke-width="2"/>
    <rect id="no-photo" x="907" y="649" width="483" height="91" rx="20" fill="#F4F0FF"/>
    <rect id="button-secondary" x="907" y="878" width="198" height="77" rx="26" fill="#FFFFFF" stroke="#6F55CF" stroke-width="2"/>
    <rect id="button-primary" x="1124" y="873" width="270" height="82" rx="26" fill="#7C5CE5"/>
    <rect id="progress-track" x="350" y="703" width="432" height="25" rx="13" fill="#EAE4FF"/>
    <rect id="progress-value" x="350" y="703" width="432" height="25" rx="13" fill="#7C5CE5"/>
  </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1448" height="1086" viewBox="0 0 1448 1086">
  <title>P22 阅读打卡 - Penpot 混合分层 v2</title>
  <desc>已确认母版无损分区，并附可编辑控件覆盖层。导入后请锁定 01-06 视觉层，逐步原生化 07 控件层。</desc>
  ${imageNodes.join('\n  ')}
  ${editableOverlay}
</svg>`;
  fs.writeFileSync(outputSvg, svg, 'utf8');
  await sharp(Buffer.from(svg)).png().toFile(preview);

  // 统一转为 RGB 后比较，避免 PNG 是否带 Alpha 通道导致字节错位、产生虚假的大差异。
  const original = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rendered = await sharp(preview).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let maxDiff = 0;
  let sumDiff = 0;
  for (let i = 0; i < original.data.length; i++) {
    const diff = Math.abs(original.data[i] - rendered.data[i]);
    maxDiff = Math.max(maxDiff, diff);
    sumDiff += diff;
  }
  console.log(JSON.stringify({
    outputSvg,
    preview,
    sliceDir,
    width: rendered.info.width,
    height: rendered.info.height,
    layers: slices.length + 1,
    meanAbsDiff: sumDiff / original.data.length,
    maxDiff,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
