// P08仅提取屋子标题图标和苹果，不切入参考图中的旧阶段猫，防止混用角色。
const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/Administrator.DESKTOP-0ALURMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main(){const root=path.resolve(__dirname,'../..'),dir=path.join(root,'资产/UI/pet-center-cuts-v1');fs.mkdirSync(dir,{recursive:true});const source=path.join(root,'资产/UI/child-p08-pet-center-ipad-simple-v4-official-pet.png');const cuts={'pet-center-house.png':[285,97,110,95],'pet-center-apple.png':[916,775,62,58]};for(const[name,[left,top,width,height]]of Object.entries(cuts)){const target=path.join(dir,name);await sharp(source).extract({left,top,width,height}).png().toFile(target);fs.copyFileSync(target,path.join(root,'app/src/static/ui',name));}fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({source,cuts},null,2));}
main().catch(e=>{console.error(e);process.exitCode=1});
