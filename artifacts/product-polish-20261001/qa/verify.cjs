const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const out = path.resolve(__dirname, '..');
const checks = [];
const check = (name, value) => { if (!value) throw new Error(name); checks.push(name); };
async function focused(page, id) { await page.waitForFunction(id => document.activeElement.id === id, id); return true; }
async function rows(page, count) { await page.waitForFunction(n => document.querySelectorAll('.product-table tbody tr').length === n, count); }
async function visibleAboveActions(page, selector) {
  try { await page.waitForFunction(selector => {
    const e = document.querySelector(selector);
    const r = (e.closest('.form-field') || e).getBoundingClientRect();
    const footer = document.querySelector('.form-actions').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= footer.top;
  }, selector, { timeout: 3000 }); } catch (error) {
    console.log(await page.locator(selector).evaluate(e => ({ id: e.id, field: (e.closest('.form-field') || e).getBoundingClientRect().toJSON(), input: e.getBoundingClientRect().toJSON(), footer: document.querySelector('.form-actions').getBoundingClientRect().toJSON(), viewport: innerHeight, scroll: scrollY, document: document.documentElement.scrollHeight })));
    console.log(await page.evaluate(() => ['.product-form', '.product-form-surface', '.product-extra-details', '.form-actions'].map(s => { const e = document.querySelector(s); return { selector: s, bounds: e.getBoundingClientRect().toJSON(), offset: e.offsetTop, position: getComputedStyle(e).position }; })));
    throw error;
  }
  return true;
}
async function capture(page, name, fullPage = false) {
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; }))));
  if (fullPage) await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage, animations: 'disabled' });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto('http://localhost:5173/products/new');
  check('cadastro começa no barcode opcional', await focused(page, 'product-barcode'));
  for (const id of ['product-name', 'product-sku', 'product-category', 'product-unit']) {
    await page.keyboard.press('Tab'); check('Tab ' + id, await focused(page, id));
  }
  await page.locator('#product-barcode').fill('7890000000010'); await page.locator('#product-barcode').press('Enter');
  check('leitura Enter segue Nome sem submit', await focused(page, 'product-name') && await page.locator('.field-error').count() === 0);
  await page.locator('#product-name').fill('Luva de proteção'); await page.locator('#product-name').press('Enter');
  check('Nome Enter não envia', page.url().endsWith('/new') && await page.locator('.field-error').count() === 0);
  await page.locator('#product-sku').fill('EPI-001'); await page.locator('#product-sku').press('Enter');
  check('SKU Enter segue Categoria', await focused(page, 'product-category'));
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click(); await page.locator('#product-category-error').waitFor();
  check('erro inline preserva códigos e nome', await page.locator('#product-name').inputValue() === 'Luva de proteção' && await page.locator('#product-barcode').inputValue() === '7890000000010' && await focused(page, 'product-category'));
  await page.locator('#product-category').selectOption('Acessórios'); await page.locator('#product-unit').selectOption('pct');
  await page.locator('#product-cost').fill('19,90'); await page.locator('#product-sale').fill('29.90');
  await page.getByRole('radio', { name: 'Registrar entrada inicial', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click(); await page.locator('#product-initialQuantity-error').waitFor();
  check('entrada inicial exige quantidade e mostra erro acima da barra', await focused(page, 'product-initialQuantity') && await visibleAboveActions(page, '#product-initialQuantity'));
  await page.locator('#product-initialQuantity').fill('20'); await page.locator('#product-minimum').fill('5');
  await page.getByRole('button', { name: 'Salvar e criar outro', exact: true }).click(); await page.getByText('Próxima leitura pronta.', { exact: false }).waitFor();
  check('Save & New limpa item e volta à leitura', await focused(page, 'product-barcode') && await page.locator('#product-name').inputValue() === '' && await page.locator('#product-sku').inputValue() === '' && await page.locator('#product-barcode').inputValue() === '');
  check('Save & New mantém categoria/unidade e limpa operação/preços', await page.locator('#product-category').inputValue() === 'Acessórios' && await page.locator('#product-unit').inputValue() === 'pct' && await page.locator('#product-cost').inputValue() === '' && await page.locator('#product-minimum').inputValue() === '0' && await page.getByRole('radio', { name: 'Cadastrar sem saldo inicial', exact: true }).isChecked());
  await page.locator('#product-sku').fill('epi-001'); await page.locator('#product-name').fill('Duplicado'); await page.getByRole('button', { name: 'Salvar produto', exact: true }).click(); await page.locator('#product-sku-error').waitFor(); check('duplicidade continua inline', await focused(page, 'product-sku') && await page.locator('#product-name').inputValue() === 'Duplicado');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); await page.getByRole('button', { name: 'Continuar preenchendo', exact: true }).click(); check('cancelar e continuar preserva rascunho', await page.locator('#product-name').inputValue() === 'Duplicado');
  await page.locator('#product-sku').fill('EPI-002'); await page.locator('#product-name').fill('Óculos de proteção');
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).evaluate(button => { button.click(); button.click(); }); await rows(page, 9); checks.push('double submit bloqueado');
  await page.getByRole('button', { name: 'Ver detalhes de Luva de proteção', exact: true }).click(); await page.locator('dialog[open]').waitFor(); check('entrada preparada não vira atributo de saldo', (await page.locator('dialog .detail-facts').textContent()).includes('Saldo atual0'));
  await page.getByRole('link', { name: 'Editar produto', exact: true }).click(); check('edição começa no Nome', await focused(page, 'product-name')); check('edição mantém saldo em consulta e preços', await page.locator('.readonly-balance strong').textContent() === '0 pct' && await page.locator('#product-cost').inputValue() === '19,90' && await page.getByRole('radio', { name: 'Registrar entrada inicial', exact: true }).count() === 0);
  await page.locator('#product-name').fill('Luva revisada'); await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click(); await rows(page, 9);
  await page.getByRole('link', { name: 'Novo produto', exact: true }).click(); await focused(page, 'product-barcode');
  for (let i = 3; i <= 20; i++) {
    await page.locator('#product-name').fill('EPI de teste ' + i); await page.locator('#product-sku').fill('EPI-' + String(i).padStart(3, '0'));
    if (i === 3) await page.locator('#product-category').selectOption('Acessórios');
    await page.getByRole('button', { name: 'Salvar e criar outro', exact: true }).click(); await focused(page, 'product-barcode');
    await page.waitForFunction(() => document.querySelector('#product-sku').value === '');
  }
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); await rows(page, 27); checks.push('cadastro de 20 itens seguido sem perda de foco ou duplicação');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('http://localhost:5173/products/new'); await focused(page, 'product-barcode');
    await capture(page, 'novo-produto-' + viewport.width, viewport.width === 390);
    check('novo produto sem overflow ' + viewport.width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('barcode tem foco visível ' + viewport.width, await page.locator('.code-input').evaluate(e => getComputedStyle(e).outlineStyle !== 'none'));
    for (const selector of ['#product-name', '#product-sku', '#product-unit', '#product-cost', '#product-sale', '#product-minimum']) {
      await page.locator(selector).focus(); check('controle livre de actions ' + viewport.width + ' ' + selector, await visibleAboveActions(page, selector));
    }
    await page.getByRole('radio', { name: 'Registrar entrada inicial', exact: true }).check(); await page.locator('#product-initialQuantity').focus();
    check('quantidade inicial dentro da operação ' + viewport.width, await page.locator('.initial-operation #product-initialQuantity').count() === 1 && await visibleAboveActions(page, '#product-initialQuantity'));
    check('quantidade com largura para digitação decimal ' + viewport.width, await page.locator('#product-initialQuantity').evaluate(e => e.getBoundingClientRect().width >= 50 && e.getBoundingClientRect().height >= 38));
    await page.locator('#product-initialQuantity').fill('20'); await capture(page, 'entrada-inicial-' + viewport.width, viewport.width === 390);
    await page.locator('details summary').click(); await page.locator('#product-description').focus(); check('descrição livre de actions ' + viewport.width, await visibleAboveActions(page, '#product-description'));
    await page.goto('http://localhost:5173/products/CAB-001/edit'); await focused(page, 'product-name');
    await capture(page, 'editar-produto-' + viewport.width, viewport.width === 390); check('edição sem overflow ' + viewport.width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('imagem opcional compacta ' + viewport.width, await page.locator('.form-image-preview').evaluate(e => e.getBoundingClientRect().width <= 106));
    if (viewport.width === 1440) {
      await page.getByRole('button', { name: 'Remover imagem', exact: true }).click(); check('remover imagem continua funcionando', await page.locator('.form-image-preview').count() === 0);
    }
  }
  await page.goto('http://localhost:5173/products/new'); await focused(page, 'product-barcode'); await page.getByRole('button', { name: 'Salvar produto', exact: true }).click(); await page.locator('#product-name-error').waitFor(); check('foco do erro segue ordem visual Nome antes de SKU', await focused(page, 'product-name'));
  check('sem exceções de frontend', errors.length === 0);
  fs.writeFileSync(path.join(out, 'qa/results.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, errors, out })); await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
