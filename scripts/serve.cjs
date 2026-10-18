const http=require('http'),fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../web'),port=Number(process.env.PORT||8080);
http.createServer((request,response)=>{let file;try{const pathname=new URL(request.url,'http://localhost').pathname;file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname))}catch{response.writeHead(400);return response.end('Bad request')}
if(!file.startsWith(root+path.sep)){response.writeHead(403);return response.end('Forbidden')}
fs.readFile(file,(error,data)=>{if(error){response.writeHead(404);return response.end('Not found')}response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');response.end(data)})
}).listen(port,'127.0.0.1',()=>console.log(`Poker Lab: http://127.0.0.1:${port}`));
