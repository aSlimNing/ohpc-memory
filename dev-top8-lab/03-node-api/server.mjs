import http from 'node:http';
http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,path:req.url}))}).listen(8932,()=>console.log('up'));
