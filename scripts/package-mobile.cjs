const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../web');let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(path.join(root,'style.css'),'utf8').replace(/^\s*@import[^\r\n]*(?:\r?\n|$)/,'')+'</style>');
html=html.replace('<link rel="stylesheet" href="lounge.css">',()=>'<style>'+fs.readFileSync(path.join(root,'lounge.css'),'utf8')+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,name)=>'<script>\n'+(name==='mobile.js'?"$('#amount').setAttribute('inputmode','numeric');":fs.readFileSync(path.join(root,name),'utf8')).replace(/<\/script/gi,'<\\/script')+'\n</script>');
html=html.replace(/<link rel="manifest"[^>]*>/,'').replace(/<link rel="icon"[^>]*>/,'');
// Bundle a local worker, so the AI does not block the animations or music.
// The synchronous fallback remains available if the device blocks workers.
const workerSource=fs.readFileSync(path.join(root,'engine.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'strategy.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'ai-worker.js'),'utf8').replace(/^importScripts[^\n]*\n/,'');
const workerFactory=`(()=>{const url=URL.createObjectURL(new Blob([${JSON.stringify(workerSource)}],{type:'text/javascript'}));const worker=new Worker(url);worker.addEventListener('message',()=>URL.revokeObjectURL(url),{once:true});worker.addEventListener('error',()=>URL.revokeObjectURL(url),{once:true});return worker})()`;
html=html.replace("new Worker('ai-worker.js')",()=>workerFactory.replace(/<\/script/gi,'<\\/script'));
html=html.replace('<a class="brand" href="./">','<a class="brand" href="#">');
fs.mkdirSync(path.resolve(__dirname,'../dist'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../dist/Poker-Lab-Android.html'),html);fs.mkdirSync(path.resolve(__dirname,'../android/assets'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../android/assets/index.html'),html);

