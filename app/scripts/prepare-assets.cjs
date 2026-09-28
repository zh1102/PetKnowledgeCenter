// 从用户已确认的页面按精确坐标提取真实视觉资产，不重绘角色；保留源图和裁切元数据。
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Administrator.DESKTOP-0ALURMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, '资产/UI/child-today-ipad-landscape-simple-v4-official-pet.png');
const official = path.join(root, '资产/UI/app-ipad-v1');
const bundled = path.join(__dirname, '../src/static/ui');
const crops = {
  'brand.png': [22, 38, 207, 80],
  'avatar.png': [1260, 18, 62, 61],
  'header-today.png': [285, 85, 100, 111],
  'goal.png': [310, 304, 67, 66],
  'companion.png': [290, 438, 520, 317],
  'gift.png': [884, 810, 105, 114],
  'note.png': [1137, 97, 282, 158],
  'nav-footer.png': [0, 880, 255, 206],
  'book.png': [881, 297, 70, 61],
  'english.png': [881, 392, 69, 60],
  'clipboard.png': [881, 489, 68, 61],
  'math.png': [881, 584, 68, 65],
  'question.png': [881, 681, 68, 61],
  'star.png': [38, 690, 46, 47],
};
async function main() {
  fs.mkdirSync(official, { recursive: true });
  fs.mkdirSync(bundled, { recursive: true });
  for (const [name, [left, top, width, height]] of Object.entries(crops)) {
    const dest = path.join(official, name);
    await sharp(source).extract({ left, top, width, height }).png().toFile(dest);
    fs.copyFileSync(dest, path.join(bundled, name));
  }
  // 导航直接复用已批准 P23 切图；宠物兜底也是已有正式角色资产。
  for (const key of ['today', 'chinese', 'math', 'english', 'growth', 'pet', 'report', 'settings']) {
    fs.copyFileSync(path.join(root, `资产/UI/nav-icon-${key}-approved-cut-v1.png`), path.join(bundled, `nav-${key}.png`));
  }
  fs.copyFileSync(path.join(root, '资产/宠物/cat-juvenile-v2.png'), path.join(bundled, 'cat-official.png'));
  fs.writeFileSync(path.join(official, 'source-manifest.json'), JSON.stringify({ source, crops, version: 'app-ipad-v1', operation: 'lossless-extract' }, null, 2));
  console.log('14 exact crops + 8 approved navigation icons + 1 official pet bundled');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
