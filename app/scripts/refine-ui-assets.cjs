// 仅处理已确认首页母版：边界连通的浅背景透明化，保留图标内部白色与抗锯齿边缘。
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Administrator.DESKTOP-0ALURMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, '资产/UI/child-today-ipad-landscape-simple-v4-official-pet.png');
const master = path.join(root, '资产/UI/app-ipad-v2');
const bundle = path.join(__dirname, '../src/static/ui');
const crops = {
  'nav-today.png': [40, 180, 49, 47], 'nav-chinese.png': [40, 270, 49, 46],
  'nav-math.png': [40, 360, 49, 50], 'nav-english.png': [40, 457, 49, 44],
  'nav-growth.png': [38, 552, 51, 50], 'nav-settings.png': [39, 762, 49, 49],
  'status-confirmed.png': [1241, 309, 39, 38], 'status-submitted.png': [1207, 498, 43, 43],
};
async function clearBackground(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(info.width * info.height);
  const queue = [];
  const background = [data[0], data[1], data[2]];
  function add(x, y) {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const pixel = y * info.width + x, i = pixel * 4;
    const nearBackground = Math.max(...background.map((channel, offset) => Math.abs(channel - data[i + offset]))) < 27;
    if (seen[pixel] || (!nearBackground && Math.min(data[i], data[i + 1], data[i + 2]) < 209)) return;
    seen[pixel] = 1; queue.push(pixel);
  }
  for (let x = 0; x < info.width; x++) { add(x, 0); add(x, info.height - 1); }
  for (let y = 0; y < info.height; y++) { add(0, y); add(info.width - 1, y); }
  for (let head = 0; head < queue.length; head++) {
    const pixel = queue[head], x = pixel % info.width, y = Math.floor(pixel / info.width);
    data[pixel * 4 + 3] = 0;
    add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
async function main() {
  fs.mkdirSync(master, { recursive: true });
  for (const [name, [left, top, width, height]] of Object.entries(crops)) {
    const crop = await sharp(source).extract({ left, top, width, height }).png().toBuffer();
    const output = await clearBackground(crop);
    fs.writeFileSync(path.join(master, name), output);
    fs.writeFileSync(path.join(bundle, name), output);
  }
  // 核心任务图标背景同卡片一致，不移除淡紫图标底座；只清除边缘白色矩形。
  for (const name of ['header-today.png', 'goal.png', 'book.png', 'english.png', 'clipboard.png', 'math.png', 'question.png', 'star.png', 'gift.png', 'brand.png']) {
    const original = path.join(root, '资产/UI/app-ipad-v1', name);
    const output = await clearBackground(original);
    fs.writeFileSync(path.join(master, name), output);
    fs.writeFileSync(path.join(bundle, name), output);
  }
  fs.writeFileSync(path.join(master, 'source-manifest.json'), JSON.stringify({ source, crops, operation: 'edge-connected-light-background-mask', threshold: 209 }, null, 2));
  console.log('母版导航、状态及页面图标已处理，v1 原文件保留。');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
