const fs=require('fs');
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const out=require('path').resolve(__dirname, '..');
const checks=[];
async function countRows(page,n){try{await page.waitForFunction(n=>document.querySelectorAll('tbody tr').length===n,n);}catch(e){console.log('Filter diagnostic',page.url(),await page.locator('tbody tr').count());throw e;}return true;}
const check=(name,value)=>{if(!value)throw new Error(name);checks.push(name);};
(async()=>{
fs.mkdirSync(out+'/qa',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const [route,name] of [['/','04-dashboard'],['/products','05-produtos'],['/movements','06-movimentacoes'],['/history','07-historico']]){
 await page.goto('http://localhost:5173'+route);await page.locator('h1').waitFor();await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}))));
 if(route==='/movements'){await page.getByLabel('SKU DO PRODUTO',{exact:true}).fill('CAB-001');await page.getByRole('button',{name:'Localizar',exact:true}).click();await page.getByLabel('QUANTIDADE',{exact:true}).fill('10');await page.getByLabel('MOTIVO',{exact:true}).fill('Conferência de entrada');await page.getByRole('button',{name:'Ver prévia'}).click();}
 await page.screenshot({path:out+'/'+name+'.png',fullPage:false});
 check('desktop '+route+' sem overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
await page.goto('http://localhost:5173/products');
check('sete produtos iniciais',await countRows(page,7));
await page.getByRole('searchbox').fill('MOU-002');check('busca por SKU',await countRows(page,1));
await page.getByRole('button',{name:'Ver detalhes de Mouse sem fio',exact:true}).click();check('detalhe abre',await page.locator('dialog').evaluate(d=>d.open));
await page.keyboard.press('Escape');check('Escape fecha detalhe',await page.locator('dialog').evaluate(d=>!d.open));
await page.getByRole('searchbox').fill('zzzzzz');check('estado vazio',await page.getByText('Nenhum produto encontrado para estes filtros.').waitFor().then(()=>true));await page.getByRole('button',{name:'Limpar filtros',exact:true}).last().click();await countRows(page,7);
await page.getByLabel('Categoria',{exact:true}).selectOption('Periféricos');check('filtro categoria',await countRows(page,2));await page.getByLabel('Categoria',{exact:true}).selectOption('');await countRows(page,7);
await page.getByLabel('Estoque',{exact:true}).selectOption('attention');check('filtro atenção',await countRows(page,3));
await page.goto('http://localhost:5173/products');
await page.locator('img').first().evaluate(img=>{img.src='/missing-product-image.png';});await page.getByRole('img',{name:'Cabo USB-C 2 m: sem imagem',exact:true}).waitFor();checks.push('placeholder de imagem quebrada');
await page.goto('http://localhost:5173/movements');check('fluxo aguarda identificação',await page.getByRole('button',{name:'Ver prévia'}).isDisabled());
await page.getByLabel('SKU DO PRODUTO',{exact:true}).fill('inexistente');await page.getByRole('button',{name:'Localizar',exact:true}).click();check('SKU desconhecido',await page.getByText('SKU não encontrado.',{exact:false}).waitFor().then(()=>true));
await page.getByLabel('SKU DO PRODUTO',{exact:true}).fill('mou-002');await page.getByLabel('SKU DO PRODUTO',{exact:true}).press('Enter');check('busca por teclado',await page.getByText('Produto encontrado no catálogo de demonstração.').waitFor().then(()=>true));
await page.getByRole('button',{name:'Ver prévia'}).click();check('motivo obrigatório',await page.getByText('Informe o motivo.',{exact:true}).waitFor().then(()=>true));
await page.getByLabel('MOTIVO',{exact:true}).fill('Conferência');await page.getByRole('radio',{name:'Saída',exact:true}).check();await page.getByLabel('QUANTIDADE',{exact:true}).fill('4');await page.getByRole('button',{name:'Ver prévia'}).click();await page.locator('.preview-balance strong').filter({hasText:'14'}).waitFor();check('saldo 18 para 14',await page.locator('.preview-balance strong').textContent()==='14');
await page.getByLabel('QUANTIDADE',{exact:true}).fill('19');await page.getByRole('button',{name:'Ver prévia'}).click();check('saída acima do saldo',await page.getByText('Saldo insuficiente para esta saída', {exact:true}).waitFor().then(()=>true));
await page.getByLabel('SKU DO PRODUTO',{exact:true}).fill('CAB-001');check('troca de código limpa produto e feedback',await page.locator('.operation-feedback').count()===0&&await page.getByRole('button',{name:'Ver prévia'}).isDisabled());
await page.goto('http://localhost:5173/history');await page.getByLabel('Movimento',{exact:true}).selectOption('Saída');check('filtro histórico',await countRows(page,4));
await page.setViewportSize({width:390,height:844});
for(const [route,name] of [['/','dashboard'],['/products','produtos'],['/movements','movimentacoes'],['/history','historico']]){
 await page.goto('http://localhost:5173'+route);await page.screenshot({path:out+'/qa/mobile-'+name+'.png',fullPage:true});check('mobile '+route+' sem overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
await page.getByRole('button',{name:'Abrir menu',exact:true}).click();check('menu móvel abre',await page.locator('aside').getByRole('link',{name:'Produtos',exact:true}).waitFor().then(()=>true));await page.keyboard.press('Escape');check('Escape fecha menu móvel',await page.getByRole('button',{name:'Abrir menu',exact:true}).getAttribute('aria-expanded')==='false');
check('sem exceções no navegador',errors.length===0);fs.writeFileSync(out+'/qa/results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,errors,out}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
