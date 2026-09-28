// 仅切出已确认弹窗稿中的插画和关闭图标，文字及按钮仍由真实组件渲染。
const fs=require('node:fs');const path=require('node:path');
const sharp=require('C:/Users/Administrator.DESKTOP-0ALURMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main(){
 const source=path.resolve(__dirname,'../../资产/UI/child-p24-dialog-states-ipad-simple-v2-official-pets.png');
 const dir=path.resolve(__dirname,'../../资产/UI/dialog-cuts-v1');fs.mkdirSync(dir,{recursive:true});
 const cuts={'dialog-task.png':[714,188,220,146],'dialog-gift.png':[700,639,232,137],'dialog-close.png':[949,196,20,19]};
 for(const [name,[left,top,width,height]]of Object.entries(cuts)){const target=path.join(dir,name);await sharp(source).extract({left,top,width,height}).png().toFile(target);fs.copyFileSync(target,path.resolve(__dirname,'../src/static/ui',name));}
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({source,cuts,operation:'crop-only'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
