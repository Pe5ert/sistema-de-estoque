// Temporary, loopback-only HTTP fixtures for browser interaction checks.
// No production API, database, authentication or concurrency validation.
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const user = { id: randomUUID(), name: 'Teste · dados fictícios', email: 'qa@example.test', role: 'OPERATOR' };
const categories = [{id:randomUUID(),name:'Informática',description:null,active:true},{id:randomUUID(),name:'Manutenção',description:null,active:true}];
const today = '2026-10-02';
let session = null, products = [], movements = [], scenario = 'attention';
const requests = [];
function seed() {
 scenario='attention';
 products = [
  ['Cabo USB-C 1 m','QA-CABO','80','5','12.25','24.90','UNIT','/products/cable.svg',0],
  ['Mouse óptico USB','QA-MOUSE','2','5','45','69.90','UNIT','/products/mouse.svg',0],
  ['Teclado compacto','QA-TECLADO','25','5',null,null,'UNIT','/products/keyboard.svg',0],
  ['Hub USB 4 portas','QA-HUB','0','3','60','89.90','UNIT','/products/hub.svg',0],
  ['Adaptador HDMI','QA-HDMI','15','3','8','19.90','UNIT',null,0],
  ['Álcool isopropílico','QA-ALCOOL','1.5','2','20','35','LITER',null,1]
 ].map(([name,sku,stock,minimumStock,costPrice,salePrice,unit,imageUrl,cat])=>({id:randomUUID(),name,sku,stock,minimumStock,costPrice,salePrice,unit,imageUrl,category:categories[cat],categoryId:categories[cat].id,barcode:null,description:null,active:true,createdAt:today+'T12:00:00Z',updatedAt:today+'T12:00:00Z'}));
 movements=[];
 add(products[0],{type:'ENTRY',quantity:'100',reason:'PURCHASE'},'0','100',today+'T12:00:00Z');
 add(products[0],{type:'EXIT',quantity:'20',reason:'INTERNAL_USE'},'100','80',today+'T14:30:00Z');
 add(products[5],{type:'ADJUSTMENT_OUT',quantity:'0.5',reason:'INVENTORY_ADJUSTMENT'},'2','1.5',today+'T15:00:00Z');
 add(products[1],{type:'ENTRY',quantity:'20',reason:'PURCHASE'},'0','20','2026-10-01T12:00:00Z');
 add(products[1],{type:'EXIT',quantity:'18',reason:'SALE'},'20','2','2026-10-01T16:00:00Z');
 add(products[2],{type:'ENTRY',quantity:'25',reason:'PURCHASE'},'0','25','2026-09-30T12:00:00Z');
 add(products[4],{type:'ENTRY',quantity:'15',reason:'PURCHASE'},'0','15','2026-09-29T12:00:00Z');
 movements.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
function add(product,input,previous,resulting,time=new Date().toISOString()) {
 const m={...input,id:randomUUID(),productId:product.id,product:{...product},user,userId:user.id,previousStock:previous,resultingStock:resulting,reference:null,notes:null,createdAt:time};movements.unshift(m);return m;
}
function summary() {
 const active=products.filter(p=>p.active), low=p=>+p.stock>0&&+p.stock<=+p.minimumStock,out=p=>+p.stock===0;
 return {units:String(active.reduce((s,p)=>s+ +p.stock,0)),products:active.length,normal:active.filter(p=>+p.stock>+p.minimumStock).length,low:active.filter(low).length,out:active.filter(out).length,costValue:String(active.reduce((s,p)=>s+ +p.stock*Number(p.costPrice||0),0)),productsWithoutCost:active.filter(p=>p.costPrice===null).length,priorities:active.filter(p=>+p.stock<=+p.minimumStock).sort((a,b)=>+a.stock-+b.stock),recent:movements.slice(0,5),today:{entries:movements.filter(m=>m.createdAt.startsWith(today)&&m.type==='ENTRY').length,exits:movements.filter(m=>m.createdAt.startsWith(today)&&m.type==='EXIT').length,adjustments:movements.filter(m=>m.createdAt.startsWith(today)&&m.type.startsWith('ADJUSTMENT')).length},days:Array.from({length:7},(_,i)=>{const date=new Date(Date.parse(today+'T12:00:00Z')-(6-i)*86400000).toISOString().slice(0,10);const es=movements.filter(m=>m.createdAt.startsWith(date)&&m.type==='ENTRY'),xs=movements.filter(m=>m.createdAt.startsWith(date)&&m.type==='EXIT');return {date,entries:String(es.reduce((s,m)=>s+ +m.quantity,0)),exits:String(xs.reduce((s,m)=>s+ +m.quantity,0)),entryRecords:es.length,exitRecords:xs.length};}),timezone:'America/Sao_Paulo'};
}
function page(items,q) { const page=Number(q.get('page')||1),limit=Number(q.get('limit')||20);return {items:items.slice((page-1)*limit,page*limit),total:items.length,page,limit}; }
seed();
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost:3100'),p=u.pathname.replace(/^\/api/,''),q=u.searchParams;
 res.setHeader('Access-Control-Allow-Origin','http://localhost:5173');res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 const reply=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 let body='';for await(const chunk of req)body+=chunk;let data={};try{data=body?JSON.parse(body):{};}catch{return reply({message:'Invalid JSON'},400);}
 requests.push({method:req.method,path:u.pathname,query:u.search});
 if(p==='/__qa/state')return reply({scenario,summary:summary(),requests});
 if(p==='/__qa/scenario'&&req.method==='POST') {seed();scenario=data.scenario;if(scenario==='clear')products.forEach(p=>p.stock=String(+p.minimumStock+10));if(scenario==='empty'){products=[];movements=[];}return reply({scenario});}
 if(p==='/auth/login'&&req.method==='POST') {if(data.email!=='qa@example.test'||data.password!=='teste-dashboard')return reply({message:'Unauthorized'},401);session=randomUUID();res.setHeader('Set-Cookie',`qa_session=${session}; HttpOnly; SameSite=Lax; Path=/`);return reply(user);}
 const authenticated=session&&(req.headers.cookie||'').split(';').some(c=>c.trim()===`qa_session=${session}`);
 if(p==='/auth/logout'){session=null;res.setHeader('Set-Cookie','qa_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return reply({});}
 if(!authenticated)return reply({message:'Unauthorized'},401);
 if(p==='/auth/me')return reply(user);
 if(p==='/dashboard/summary')return scenario==='error'?reply({message:'Temporary fixture error'},503):reply(summary());
 if(p==='/categories')return reply(categories);
 if(p==='/products/lookup')return reply(products.filter(p=>p.active&&(p.sku.toLowerCase()===(q.get('code')||'').toLowerCase()||p.barcode===q.get('code'))));
 if(p.startsWith('/products/'))return reply(products.find(x=>x.id===p.split('/').at(-1))||{message:'Not found'},products.some(x=>x.id===p.split('/').at(-1))?200:404);
 if(p==='/products') {const search=(q.get('search')||'').toLowerCase(),status=q.get('stockStatus');return reply(page(products.filter(p=>(!search||[p.name,p.sku].some(v=>v.toLowerCase().includes(search)))&&(!q.get('category')||q.get('category')===p.categoryId)&&(q.get('active')==='all'||p.active===(q.get('active')!=='false'))&&(!status||(status==='ATTENTION'?+p.stock<=+p.minimumStock:status==='OUT'?+p.stock===0:status==='LOW'?+p.stock>0&&+p.stock<=+p.minimumStock:+p.stock>+p.minimumStock))),q));}
 if(p==='/stock-movements'&&req.method==='POST'){const product=products.find(p=>p.id===data.productId);if(!product)return reply({message:'Not found'},404);const before=product.stock,next=+before+(data.type==='EXIT'?-1:1)*Number(data.quantity);if(next<0)return reply({message:'Quantidade indisponível em estoque.'},409);product.stock=String(next);return reply(add(product,data,before,product.stock),201);}
 if(p==='/stock-movements')return reply(page(movements.filter(m=>(!q.get('productId')||m.productId===q.get('productId'))&&(!q.get('type')||m.type===q.get('type'))&&(!q.get('reason')||m.reason===q.get('reason'))&&(!q.get('search')||[m.product.name,m.product.sku].some(v=>v.toLowerCase().includes(q.get('search').toLowerCase())))&&(!q.get('from')||m.createdAt>=q.get('from'))&&(!q.get('to')||m.createdAt<=q.get('to'))),q));
 if(p.startsWith('/stock-movements/'))return reply(movements.find(m=>m.id===p.split('/').at(-1))||{message:'Not found'});
 return reply({message:'Endpoint not implemented in fixture'},404);
}).listen(3100,'127.0.0.1',()=>console.log('Temporary UI fixture API listening on loopback port 3100. All data fictitious.'));
