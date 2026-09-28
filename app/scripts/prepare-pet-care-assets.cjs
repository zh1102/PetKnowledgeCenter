// 从已确认参考切取状态与物品图标，不切换角色；保存可追溯切图记录。
const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/Administrator.DESKTOP-0ALURMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main(){const root=path.resolve(__dirname,'../..'),dir=path.join(root,'资产/UI/pet-care-cuts-v1');fs.mkdirSync(dir,{recursive:true});
 const cuts={fullness:[865,248,52,52],clean:[865,309,52,52],happy:[865,370,52,52],energy:[865,430,52,52],knowledge:[865,490,52,52]};
 const source=path.join(root,'资产/UI/child-p16-pet-detail-ipad-simple-v1-official-pet.png');
 for(const [name,[left,top,width,height]]of Object.entries(cuts)){const dest=path.join(dir,`pet-${name}.png`);await sharp(source).extract({left,top,width,height}).png().toFile(dest);fs.copyFileSync(dest,path.join(root,'app/src/static/ui',`pet-${name}.png`));}
 const bubble=path.join(root,'资产/宠物/pet-cleaning-sprite-v1.png');await sharp(bubble).extract({left:125,top:10,width:130,height:140}).resize(90,90,{fit:'contain'}).png().toFile(path.join(dir,'pet-bubble.png'));fs.copyFileSync(path.join(dir,'pet-bubble.png'),path.join(root,'app/src/static/ui/pet-bubble.png'));
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({source,cuts,bubble:{source:bubble,crop:[125,10,130,140]}},null,2));}
main().catch(e=>{console.error(e);process.exitCode=1});
