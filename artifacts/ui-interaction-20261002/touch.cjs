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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
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
    await page.goto(base+'/products');await page.getByRole('row',{name:'Detalhes de A Cabo QA'}).tap();await page.getByRole('dialog').waitFor();assert.equal(await page.locator('#root').evaluate(n=>n.inert),true);await page.getByRole('button',{name:'Fechar detalhes'}).tap();assert.equal(await page.locator('#root').evaluate(n=>n.inert),false);
    await page.goto(base);await page.locator('.chart-trigger').last().tap();await page.getByRole('tooltip').getByText('Entradas: 2',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Abrir menu'}).tap();await page.getByRole('link',{name:'Movimentações',exact:true}).tap();await page.locator('#scan-code').waitFor();assert.equal(await page.locator('.workspace').evaluate(n=>n.inert),false);
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'touch-result.json'),JSON.stringify({scope:'HTTP fixtures, touch-enabled Chromium 390x844',checks:['Tap opens/closes drawer with inert restored','Tap chart shows tooltip','Tap mobile menu navigates and restores workspace'],browserErrors:errors},null,2));console.log('TOUCH_QA_PASS');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
