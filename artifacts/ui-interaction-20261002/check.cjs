// Browser-only presentation/interaction checks with HTTP fixtures.
// This is not a PostgreSQL persistence/concurrency test and is never imported by the app.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_BASE_URL || 'http://localhost:5173';
const origin = new URL(base).origin;
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Usuário QA', email: 'qa@example.test', role: 'OPERATOR' };
const category = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Acessórios QA', active: true, description: null };
const categories = [category];
let serial = 1, authenticated = true, failSave = false;
const uuid = () => 'cccccccc-cccc-4ccc-8ccc-' + String(serial++).padStart(12, '0');
const makeProduct = (name, sku, stock) => ({ id: uuid(), name, sku, stock: String(stock), minimumStock: '5', categoryId: category.id, category, unit: 'UNIT', barcode: null, costPrice: '12.25', salePrice: null, imageUrl: null, description: null, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
const products = [makeProduct('A Cabo QA', 'QA-A', 100), makeProduct('B Mouse QA', 'QA-B', 2)];
const movements = [];
const movement = (product, input, previous) => {
  const item = { ...input, id: uuid(), productId: product.id, product, user, userId: user.id, previousStock: String(previous), resultingStock: product.stock, reference: input.reference || null, notes: input.notes || null, createdAt: new Date().toISOString() };
  movements.unshift(item); return item;
};
const pageData = (items, search) => ({ items: items.slice((Number(search.get('page') || 1) - 1) * 20, Number(search.get('page') || 1) * 20), total: items.length, page: Number(search.get('page') || 1), limit: 20 });
(async () => {
  const executablePath = process.env.CHROME_PATH || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const shots = [], checks = [];
  const shot = async name => { await page.screenshot({ path: path.join(__dirname, name + '.png'), fullPage: true, animations: 'disabled' }); shots.push(name + '.png'); };
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname.replace('/api', ''), method = request.method();
    const data = request.postDataJSON();
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: JSON.stringify(body) });
    if (method === 'OPTIONS') return reply({});
    if (p === '/auth/me') return reply(authenticated ? user : { message: 'Unauthorized' }, authenticated ? 200 : 401);
    if (p === '/auth/login') { authenticated = true; return reply(user); }
    if (p === '/auth/logout') { authenticated = false; return reply({}); }
    if (!authenticated) return reply({ message: 'Unauthorized' }, 401);
    if (p === '/categories') {
      if (method === 'POST') { const item = { ...data, id: uuid() }; categories.push(item); return reply(item, 201); }
      return reply(categories);
    }
    if (p.startsWith('/categories/')) { const item = categories.find(x => x.id === p.split('/').at(-1)); Object.assign(item, data); return reply(item); }
    if (p === '/products/lookup') return reply(products.filter(x => x.active && (x.sku === url.searchParams.get('code') || x.barcode === url.searchParams.get('code'))));
    if (p === '/products' && method === 'POST') {
      if (failSave) { failSave = false; return reply({ message: 'Internal error' }, 500); }
      if (products.some(x => x.sku.toLowerCase() === data.sku.toLowerCase())) return reply({ message: 'Este SKU já está em uso.' }, 409);
      const item = { ...makeProduct(data.name, data.sku, data.initialEntry?.quantity || 0), ...data, category: categories.find(x => x.id === data.categoryId) };
      products.push(item);
      if (data.initialEntry) movement(item, { type: 'ENTRY', reason: 'INITIAL_STOCK', quantity: data.initialEntry.quantity }, 0);
      return reply(item, 201);
    }
    if (p.startsWith('/products/')) {
      const item = products.find(x => x.id === p.split('/').at(-1));
      if (method === 'PATCH') { assert.equal(data.stock, undefined); Object.assign(item, data); }
      return reply(item);
    }
    if (p === '/products') {
      const q = (url.searchParams.get('search') || '').toLowerCase(), active = url.searchParams.get('active') || 'true';
      const items = products.filter(x => (!q || [x.name, x.sku, x.barcode || ''].some(v => v.toLowerCase().includes(q))) && (active === 'all' || x.active === (active === 'true')) && (!url.searchParams.get('category') || x.categoryId === url.searchParams.get('category')));
      return reply(pageData(items, url.searchParams));
    }
    if (p === '/stock-movements' && method === 'POST') {
      assert.equal(data.userId, undefined);
      const item = products.find(x => x.id === data.productId), previous = Number(item.stock), next = previous + (data.type === 'EXIT' ? -1 : 1) * Number(data.quantity);
      if (next < 0) return reply({ message: 'Quantidade indisponível em estoque.' }, 409);
      item.stock = String(next); return reply(movement(item, data, previous), 201);
    }
    if (p.startsWith('/stock-movements/')) return reply(movements.find(x => x.id === p.split('/').at(-1)));
    if (p === '/stock-movements') return reply(pageData(movements.filter(x => (!url.searchParams.get('productId') || x.productId === url.searchParams.get('productId')) && (!url.searchParams.get('type') || x.type === url.searchParams.get('type'))), url.searchParams));
    if (p === '/dashboard/summary') {
      const active = products.filter(x => x.active);
      const days = Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10), entries: i === 6 ? '100' : '0', exits: i === 6 ? '20' : '0', entryRecords: i === 6 ? 2 : 0, exitRecords: i === 6 ? 1 : 0 }));
      return reply({ units: String(active.reduce((sum, x) => sum + Number(x.stock), 0)), products: active.length, normal: active.filter(x => Number(x.stock) > Number(x.minimumStock)).length, low: active.filter(x => Number(x.stock) > 0 && Number(x.stock) <= Number(x.minimumStock)).length, out: active.filter(x => Number(x.stock) === 0).length, costValue: String(active.reduce((sum, x) => sum + Number(x.stock) * Number(x.costPrice || 0), 0)), productsWithoutCost: active.filter(x => x.costPrice == null).length, priorities: active.filter(x => Number(x.stock) <= Number(x.minimumStock)), recent: movements.slice(0, 5), today: { entries: movements.filter(x => x.type === 'ENTRY').length, exits: movements.filter(x => x.type === 'EXIT').length, adjustments: 0 }, days, timezone: 'America/Sao_Paulo' });
    }
    throw new Error('Unhandled fixture endpoint ' + p);
  });

  try {
    products[1].unit='KG';
    movement(products[0],{type:'ENTRY',reason:'PURCHASE',quantity:'100'},0);
    await page.setViewportSize({width:1440,height:900});
    await page.goto(base+'/products');
    const row=page.getByRole('row',{name:'Detalhes de A Cabo QA'});
    await row.waitFor();
    const resting=await row.evaluate(n=>getComputedStyle(n).backgroundColor);
    await row.hover();
    await page.waitForTimeout(180);
    assert.notEqual(await row.evaluate(n=>getComputedStyle(n).backgroundColor),resting);
    const primary=page.getByRole('link',{name:'Novo produto',exact:true});
    const normalPrimary=await primary.evaluate(n=>getComputedStyle(n).backgroundColor);
    await primary.hover();await page.waitForTimeout(180);
    assert.notEqual(await primary.evaluate(n=>getComputedStyle(n).backgroundColor),normalPrimary);
    await page.keyboard.press('Tab');await primary.focus();await page.waitForTimeout(180);assert.equal(await primary.evaluate(n=>getComputedStyle(n).outlineColor),'rgb(145, 169, 255)');
    await shot('after-products');checks.push('Whole-row hover, primary navigation hover and blue keyboard focus');
    await row.press('Space');await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('#root').evaluate(n=>n.inert),true);
    assert.equal(await page.locator('.row-selected').count(),1);
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Fechar detalhes');
    await page.keyboard.press('Shift+Tab');assert.ok(await page.getByRole('dialog').evaluate(n=>n.contains(document.activeElement)));
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Fechar detalhes');
    await shot('after-product-drawer');await page.keyboard.press('Escape');
    assert.equal(await page.locator('#root').evaluate(n=>n.inert),false);
    assert.equal(await row.evaluate(n=>n===document.activeElement),true);
    checks.push('Desktop modal drawer, selected row, Shift+Tab/Tab wrap, Escape, focus restoration');
    await page.getByLabel('Situação do cadastro').selectOption('false');
    await page.getByRole('button',{name:'Limpar filtros',exact:true}).first().click();
    await page.waitForFunction(()=>document.querySelector('[aria-label="Situação do cadastro"]').value==='true');
    const select=page.getByLabel('Estoque',{exact:true});await select.focus();await select.press('ArrowDown');await select.press('Escape');
    assert.equal(await select.evaluate(n=>getComputedStyle(n).appearance),'none');
    assert.notEqual(await select.evaluate(n=>getComputedStyle(n).backgroundImage),'none');
    checks.push('Native select keyboard, integrated chevron, clear inactive filter');
    await primary.click();await page.locator('#product-name').fill('Rascunho preservado QA');
    assert.notEqual(await page.locator('#product-unit').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
    await page.getByRole('link',{name:'Histórico',exact:true}).click();
    await page.getByText('Descartar o preenchimento?',{exact:true}).waitFor();
    assert.ok(page.url().endsWith('/products/new'));
    assert.equal(await page.locator('#product-name').inputValue(),'Rascunho preservado QA');
    await page.getByRole('button',{name:'Continuar preenchendo'}).click();
    assert.ok(page.url().endsWith('/products/new'));
    await page.goBack();await page.getByText('Descartar o preenchimento?',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Continuar preenchendo'}).click();
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByText('Descartar o preenchimento?',{exact:true}).waitFor();
    await shot('after-dirty-form');await page.getByRole('button',{name:'Continuar preenchendo'}).click();
    await page.getByRole('link',{name:'Histórico',exact:true}).click();await page.getByRole('button',{name:'Descartar e sair'}).click();
    await page.getByRole('heading',{name:'Histórico',exact:true}).waitFor();checks.push('Dirty sidebar/internal links, browser Back and Cancel all reuse confirmation; stay preserves values and discard follows intended route');
    let historyRequests=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/stock-movements')historyRequests++;});
    const from=page.getByLabel('De',{exact:true}),to=page.getByLabel('Até',{exact:true});
    await from.fill('2026-10-03');await page.waitForTimeout(250);const beforeInvalid=historyRequests;
    await to.fill('2026-10-02');await page.getByText('A data final deve ser igual ou posterior à inicial.').waitFor();await page.waitForTimeout(250);
    assert.equal(historyRequests,beforeInvalid);assert.equal(await to.inputValue(),'2026-10-02');
    assert.equal(await to.getAttribute('aria-invalid'),'true');
    await shot('after-history-invalid-period');await to.fill('2026-10-03');await page.getByRole('row',{name:'Detalhes do movimento de A Cabo QA'}).waitFor();
    assert.ok(historyRequests>beforeInvalid);
    assert.ok(!(await page.locator('.history-table').innerText()).includes(movements[0].id));
    await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
    await page.getByRole('row',{name:'Detalhes do movimento de A Cabo QA'}).press('Enter');await page.getByRole('dialog').waitFor();
    await page.getByRole('dialog').getByText(movements[0].id,{exact:true}).waitFor();await page.getByRole('button',{name:'Copiar ID'}).click();await page.getByRole('dialog').getByRole('status').waitFor();
    await shot('after-history-drawer');await page.keyboard.press('Escape');checks.push('Inverted date range makes no API request, fields retained; corrected range queries; UUID only in drawer with copy feedback');
    await page.goto(base+'/products/new');await page.locator('#product-name').fill('C Produto UI QA');await page.locator('#product-sku').fill('QA-UI');await page.locator('#product-category').selectOption(category.id);
    failSave=true;await page.getByRole('button',{name:'Salvar produto',exact:true}).click();await page.locator('.form-submit-error').waitFor();
    assert.equal(await page.locator('#product-name').inputValue(),'C Produto UI QA');
    await page.getByRole('button',{name:'Salvar produto',exact:true}).click();await page.getByText('Produto cadastrado.',{exact:true}).waitFor();assert.equal(await page.getByText('Descartar o preenchimento?',{exact:true}).count(),0);
    await page.getByRole('row',{name:'Detalhes de C Produto UI QA'}).click();await page.getByRole('link',{name:'Editar produto'}).click();await page.locator('#product-name').fill('C Produto UI editado');await shot('after-edit-form');await page.getByRole('button',{name:'Salvar alterações'}).click();await page.getByText('Produto atualizado.',{exact:true}).waitFor();checks.push('Failed save preserves draft, successful save and edit navigate without discard prompt');
    await page.goto(base+'/movements');const initialHeight=await page.locator('.scan-stage').evaluate(n=>n.getBoundingClientRect().height);
    assert.equal(await page.getByRole('button',{name:'Confirmar entrada'}).isDisabled(),true);assert.equal(await page.getByRole('radio',{name:'Entrada',exact:true}).evaluate(n=>getComputedStyle(n).opacity),'0');
    await page.locator('#scan-code').fill('QA-A');await page.locator('#scan-code').press('Enter');await page.getByText('Produto encontrado.',{exact:true}).waitFor();
    await page.locator('#movement-quantity').fill('20');await page.getByRole('radio',{name:'Saída',exact:true}).check();await page.locator('#movement-reason').selectOption('SALE');
    await page.locator('.preview-balance').getByText('80',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Ver prévia'}).count(),0);
    assert.ok(await page.locator('.scan-stage').evaluate(n=>n.getBoundingClientRect().height)<initialHeight);
    await page.getByRole('radio',{name:'Saída',exact:true}).focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.getByRole('radio',{name:'Entrada',exact:true}).isChecked(),true);await page.keyboard.press('ArrowRight');
    await page.locator('#movement-quantity').fill('101');assert.equal(await page.getByRole('button',{name:'Confirmar saída'}).isDisabled(),true);
    await page.getByText('Saldo insuficiente para esta saída',{exact:true}).waitFor();
    await page.locator('#movement-quantity').fill('20');await shot('after-movement-ready');
    await page.getByRole('button',{name:'Confirmar saída'}).click();await page.getByText(/Movimentação registrada · A Cabo QA/).waitFor();assert.equal(products[0].stock,'80');assert.equal(await page.getByRole('button',{name:'Confirmar saída'}).isDisabled(),true);
    await page.getByRole('button',{name:'Próximo produto'}).click();assert.equal(await page.locator('#scan-code').inputValue(),'');checks.push('Compact scanner after lookup; editable quantity, native radio arrows, live balance 100 → 80, insufficient stock, single confirmed POST, duplicate prevention');
    await page.goto(base);await page.getByRole('heading',{name:'Produtos ativos'}).waitFor();assert.equal(await page.getByText('Unidades em estoque',{exact:true}).count(),0);
    await page.locator('.chart-trigger').last().hover();await page.getByRole('tooltip').getByText('Entradas: 2',{exact:true}).waitFor();await page.locator('.chart-trigger').last().focus();await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').count(),0);
    await shot('after-dashboard-attention');products.forEach(p=>{p.stock=String(Number(p.minimumStock)+10);});await page.reload();await page.locator('.risk-clear').waitFor();await page.getByText('ESTOQUE SOB CONTROLE',{exact:true}).waitFor();await shot('after-dashboard-clear');checks.push('Mixed UNIT/KG dashboard counts products; chart tooltips use record counts, hover/focus/Escape; zero-alert card positive');
    await page.setViewportSize({width:1024,height:768});await page.goto(base+'/products');await page.getByRole('row',{name:'Detalhes de A Cabo QA'}).waitFor();await shot('after-products-tablet');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.setViewportSize({width:390,height:844});await page.goto(base+'/products');await page.getByRole('row',{name:'Detalhes de A Cabo QA'}).press('Enter');await page.getByRole('dialog').waitFor();assert.equal(await page.getByRole('dialog').evaluate(n=>Math.round(n.getBoundingClientRect().width)),390);await page.keyboard.press('Shift+Tab');assert.ok(await page.getByRole('dialog').evaluate(n=>n.contains(document.activeElement)));await shot('after-drawer-mobile');await page.keyboard.press('Escape');assert.equal(await page.locator('#root').evaluate(n=>n.inert),false);
    await page.goto(base+'/products/new');await page.locator('#product-name').fill('Rascunho mobile');await page.getByRole('button',{name:'Abrir menu'}).click();await page.getByRole('link',{name:'Histórico',exact:true}).click();await page.getByText('Descartar o preenchimento?',{exact:true}).waitFor();assert.equal(await page.locator('.workspace').evaluate(n=>n.inert),false);await page.getByRole('button',{name:'Continuar preenchendo'}).click();await shot('after-form-mobile');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('button',{name:'Descartar e sair'}).click();
    await page.goto(base+'/history');await page.getByRole('heading',{name:'Histórico',exact:true}).waitFor();await shot('after-history-mobile');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.goto(base+'/movements');await page.locator('#scan-code').waitFor();await shot('after-movement-mobile');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('1440/1024/390 widths, fullscreen mobile drawer, mobile dirty sidebar, no horizontal overflow');
    authenticated=false;await page.goto(base+'/login');await page.locator('#login-email').waitFor();await page.getByRole('button',{name:'Mostrar senha'}).click();assert.equal(await page.locator('#login-password').getAttribute('type'),'text');await page.getByRole('button',{name:'Ocultar senha'}).click();await shot('after-login-mobile');await page.setViewportSize({width:1440,height:900});await shot('after-login-desktop');checks.push('Login uses shared primary/secondary/icon focus and password visibility');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify({scope:'HTTP fixture UI checks; no real database writes',checks,screenshots:shots,browserErrors:errors},null,2));
    console.log(JSON.stringify({checks,screenshots:shots,browserErrors:errors}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



