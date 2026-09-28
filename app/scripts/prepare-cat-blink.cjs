// 仅裁切已生成序列并编码GIF；保留源图，不修改旧正式资产，不引入运行时依赖。
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/Administrator.DESKTOP-0ALURMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main() {
  const dir = path.resolve(__dirname, '../../资产/宠物/cat-nursing-blink-v1');
  fs.mkdirSync(dir, { recursive: true });
  const source = 'C:/Users/Administrator.DESKTOP-0ALURMI/.codex/generated_images/01a0ad0f-c1dc-7593-973d-28d3016e319b/exec-1826fd6a-7138-452d-8581-b4e29eb7adc8.png';
  fs.copyFileSync(source, path.join(dir, 'source-sheet.png'));
  const meta = await sharp(source).metadata();
  if (meta.width !== 2172 || meta.height !== 724 || !meta.hasAlpha) throw Error('序列尺寸或透明通道异常');
  const frames = [];
  for (let i = 0; i < 3; i++) {
    const image = sharp(source).extract({left:i*724,top:0,width:724,height:724}).resize(512,512).ensureAlpha();
    await image.clone().png().toFile(path.join(dir, `frame-${i}.png`));
    frames.push(await image.raw().toBuffer());
  }
  // 先停留睁眼，再半闭/闭眼/半闭/睁眼；统一画布避免裁切造成尺寸跳动。
  const order = [0,1,2,1,0];
  const gif = path.join(dir, 'cat-nursing-blink-v1.gif');
  await sharp(Buffer.concat(order.map(i=>frames[i])), {raw:{width:512,height:512*order.length,channels:4,pageHeight:512}})
    .gif({loop:0,delay:[2800,90,130,90,500],effort:7}).toFile(gif);
  fs.copyFileSync(gif, path.resolve(__dirname, '../src/static/pets/cat-nursing-blink-v1.gif'));
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({reference:'cat-nursing-v2.png',tool:'built-in image_gen',model:'tool default (image2.5 unavailable)',order,delay:[2800,90,130,90,500],version:'v1'},null,2));
  console.log(JSON.stringify(await sharp(gif,{animated:true}).metadata()));
}
main().catch(e=>{console.error(e);process.exitCode=1});
