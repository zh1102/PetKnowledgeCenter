// 将本轮已审阅的AI三格序列等格裁切成GIF，旧版本保留；无运行时新增依赖。
const fs=require('node:fs'); const path=require('node:path');
const sharp=require('C:/Users/Administrator.DESKTOP-0ALURMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const sources={cat:'exec-46f5ff11-839f-4b2e-9e80-fcefd85e2a51.png',dog:'exec-8d0cbc7c-a964-4f19-8192-0d9032f66442.png',rabbit:'exec-497cd764-650a-444b-aa24-21e6fd58bebb.png'};
async function main(){
 for(const [species,file] of Object.entries(sources)){
  const source=path.join('C:/Users/Administrator.DESKTOP-0ALURMI/.codex/generated_images/01a0ad0f-c1dc-7593-973d-28d3016e319b',file);
  const dir=path.resolve(__dirname,`../../资产/宠物/${species}-nursing-motion-v2`); fs.mkdirSync(dir,{recursive:true}); fs.copyFileSync(source,path.join(dir,'source-sheet.png'));
  const meta=await sharp(source).metadata(); if(meta.width!==2172||meta.height!==724||!meta.hasAlpha)throw Error('序列尺寸/透明异常');
  const frames=[];
  for(let i=0;i<3;i++){const frame=sharp(source).extract({left:724*i,top:0,width:724,height:724}).resize(512,512).ensureAlpha();await frame.clone().png().toFile(path.join(dir,`frame-${i}.png`));frames.push(await frame.raw().toBuffer());}
  // 猫狗眨眼间隔由2.8秒缩短至1.5秒；兔耳停留更短，摆动过渡更舒缓。
  const order=species==='rabbit'?[0,1,0,2,0]:[0,1,2,1,0]; const delay=species==='rabbit'?[1000,300,200,300,300]:[1500,80,120,80,300];
  const dest=path.join(dir,`${species}-nursing-motion-v2.gif`);
  await sharp(Buffer.concat(order.map(i=>frames[i])),{raw:{width:512,height:2560,channels:4,pageHeight:512}}).gif({loop:0,delay,effort:7}).toFile(dest);
  fs.copyFileSync(dest,path.resolve(__dirname,`../src/static/pets/${species}-nursing-motion-v2.gif`));
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({source,tool:'built-in image_gen',order,delay,version:'v2'},null,2));
  console.log(species,JSON.stringify(await sharp(dest,{animated:true}).metadata()));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
