// Read-only screenshots of the connected system. Credentials come only from process env.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path');
(async()=>{
  if(!process.env.QA_EMAIL||!process.env.QA_PASSWORD)throw Error('Set temporary QA credentials');
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.QA_BASE_URL||'http://localhost:5173';
  const shot=async n=>page.screenshot({path:path.join(__dirname,'real-'+n+'.png'),fullPage:true});
  try {
    await page.goto(base+'/login');await page.locator('#login-email').fill(process.env.QA_EMAIL);await page.locator('#login-password').fill(process.env.QA_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.getByRole('heading',{name:'Produtos ativos'}).waitFor();await shot('dashboard');
    await page.getByRole('link',{name:'Produtos',exact:true}).click();await page.locator('.product-row').first().waitFor();await page.locator('.product-row').first().hover();await shot('products');
    await page.locator('.product-row').first().press('Enter');await page.getByRole('dialog').locator('h2').waitFor();await shot('drawer');await page.keyboard.press('Escape');
    await page.getByRole('link',{name:'Movimentações',exact:true}).click();await page.locator('.history-entry').first().waitFor();await shot('movements');
    await page.getByRole('link',{name:'Histórico',exact:true}).click();await page.locator('.history-entry').first().waitFor();await shot('history');
    console.log(JSON.stringify({scope:'Neon UI read-only; no product or stock writes',screenshots:5,browserErrors:errors}));if(errors.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
