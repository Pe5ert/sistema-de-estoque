const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const out = path.resolve(__dirname, '..');
const checks = [];
const check = (name, value) => { if (!value) throw new Error(name); checks.push(name); };
async function rows(page, count) { await page.waitForFunction(n => document.querySelectorAll('.product-table tbody tr').length === n, count); }
async function focused(page, id) { await page.waitForFunction(id => document.activeElement.id === id, id); return true; }
async function loadedImages(page) { await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; })))); }
async function settledLayout(page) { await page.waitForFunction(() => innerWidth > 900 || getComputedStyle(document.querySelector('.sidebar')).visibility === 'hidden'); }
async function screenshot(page, name, fullPage = false) { await settledLayout(page); await loadedImages(page); await page.screenshot({ path: path.join(out, name + '.png'), fullPage, animations: 'disabled' }); }
async function fillProduct(page, sku, name) { await page.locator('#product-sku').fill(sku); await page.locator('#product-name').fill(name); await page.locator('#product-category').selectOption('Acessórios'); }
async function selectProduct(page, name) { await page.getByRole('button', { name: 'Ver detalhes de ' + name, exact: true }).click(); await page.locator('dialog[open]').waitFor(); }
async function editProduct(page, name) { await selectProduct(page, name); await page.getByRole('link', { name: 'Editar produto', exact: true }).click(); await page.locator('#product-sku').waitFor(); }

(async () => {
  const model = await import(pathToFileURL(path.resolve('apps/web/src/product-form-model.ts')));
  for (const [value, precision, expected] of [['19,90', 2, 19.9], ['19.90', 2, 19.9], ['1.234,56', 2, 1234.56], ['1.234', 2, 1234], ['1,234', 3, 1.234], ['0', 3, 0], ['-1', 2, null], ['1,2,3', 2, null], ['3.1415', 3, null], ['1.2.34', 2, null], ['99999999999999999', 2, null]]) check('número ' + value + ' precisão ' + precision, model.parseDecimal(value, precision) === expected);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto('http://localhost:5173/products'); await rows(page, 7);
  const image = await page.locator('.product-thumbnail').first().screenshot();
  await page.getByRole('link', { name: 'Novo produto', exact: true }).click();
  check('página dedicada e foco SKU', await page.locator('#product-sku').evaluate(e => e === document.activeElement));
  await screenshot(page, 'novo-produto-desktop');
  await page.locator('#product-sku').fill('NOVO-001'); await page.locator('#product-sku').press('Enter');
  check('scanner SKU Enter avança Nome', await focused(page, 'product-name'));
  await page.locator('#product-barcode').fill('7890000000010'); await page.locator('#product-barcode').press('Enter');
  check('barcode Enter avança Nome sem salvar', await focused(page, 'product-name') && page.url().endsWith('/new'));
  await page.locator('#product-name').fill('Adaptador de teste'); await page.locator('#product-name').press('Enter');
  check('Enter Nome não submete', await page.locator('.field-error').count() === 0);
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click();
  await page.getByText('Selecione a categoria.', { exact: true }).waitFor();
  check('erro inline foco categoria e dados preservados', await page.locator('#product-category').evaluate(e => e === document.activeElement) && await page.locator('#product-name').inputValue() === 'Adaptador de teste');
  await page.locator('#product-category').selectOption('Acessórios');
  await page.locator('#product-cost').fill('-1'); await page.locator('#product-sale').fill('29,90');
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click(); await page.locator('#product-cost-error').waitFor();
  check('preço negativo rejeitado inline', await page.locator('#product-cost').getAttribute('aria-invalid') === 'true');
  await page.locator('#product-cost').fill('19.90'); await page.locator('#product-unit').selectOption('kg');
  await page.getByRole('radio', { name: 'Registrar entrada inicial', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click(); await page.locator('#product-initialQuantity-error').waitFor();
  check('entrada exige quantidade positiva e foco', await page.locator('#product-initialQuantity').evaluate(e => e === document.activeElement));
  await page.locator('#product-initialQuantity').fill('10,5');
  await page.locator('#product-image').setInputFiles({ name: 'inválido.txt', mimeType: 'text/plain', buffer: Buffer.from('text') }); await page.getByText('Use uma imagem JPG, PNG ou WEBP.', { exact: true }).waitFor(); checks.push('imagem tipo inválido rejeitada');
  await page.locator('#product-image').setInputFiles({ name: 'quebrada.png', mimeType: 'image/png', buffer: Buffer.from('not a png') }); await page.getByText('Não foi possível ler esta imagem.', { exact: false }).waitFor(); checks.push('imagem com conteúdo inválido rejeitada');
  await page.locator('#product-image').setInputFiles({ name: 'produto.png', mimeType: 'image/png', buffer: image }); await page.locator('.form-image-preview').waitFor(); await loadedImages(page);
  check('preview de arquivo local válido', await page.locator('.form-image-preview').evaluate(e => e.naturalWidth > 0));
  await screenshot(page, 'novo-produto-preenchido');
  await page.getByRole('button', { name: 'Salvar e criar outro', exact: true }).click(); await page.getByText('Categoria e unidade mantidas', { exact: false }).waitFor();
  check('cadastro repetido limpa dados e foco', await page.locator('#product-sku').inputValue() === '' && await focused(page, 'product-sku'));
  check('cadastro repetido mantém só contexto', await page.locator('#product-category').inputValue() === 'Acessórios' && await page.locator('#product-unit').inputValue() === 'kg' && await page.locator('#product-cost').inputValue() === '' && await page.locator('#product-barcode').inputValue() === '' && await page.locator('.form-image-preview').count() === 0 && await page.getByRole('radio', { name: 'Cadastrar sem saldo inicial', exact: true }).isChecked());
  await fillProduct(page, 'novo-001', 'Duplicado'); await page.getByRole('button', { name: 'Salvar produto', exact: true }).click(); await page.locator('#product-sku-error').waitFor(); check('SKU duplicado ignora caixa e preserva nome', await page.locator('#product-name').inputValue() === 'Duplicado');
  await page.locator('#product-sku').fill('NOVO-002'); await page.locator('#product-barcode').fill('7890000000010'); await page.getByRole('button', { name: 'Salvar produto', exact: true }).click(); await page.locator('#product-barcode-error').waitFor(); checks.push('barcode duplicado validado separadamente');
  await page.locator('#product-barcode').fill('MOU-002');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); await page.getByText('Descartar o preenchimento?', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Continuar preenchendo', exact: true }).click(); check('cancelamento preserva rascunho ao continuar', await page.locator('#product-sku').inputValue() === 'NOVO-002');
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).evaluate(button => { button.click(); button.click(); }); await rows(page, 9); checks.push('double submit cria somente um produto');
  await selectProduct(page, 'Adaptador de teste'); await loadedImages(page);
  check('imagem persiste após sair do formulário', await page.locator('dialog .product-thumbnail img').evaluate(e => e.naturalWidth > 0));
  check('entrada preparada não edita stock', (await page.locator('dialog .detail-facts').textContent()).includes('Saldo atual0'));
  await page.getByRole('link', { name: 'Editar produto', exact: true }).click(); await page.locator('#product-name').waitFor();
  check('edição reutiliza campos e oculta entrada inicial', await page.locator('#product-cost').inputValue() === '19,90' && await page.locator('#product-sale').inputValue() === '29,90' && await page.getByRole('radio', { name: 'Registrar entrada inicial', exact: true }).count() === 0 && await page.locator('.readonly-balance strong').textContent() === '0 kg');
  await screenshot(page, 'editar-produto-desktop');
  await page.locator('#product-sku').fill('EDIT-001'); await page.locator('#product-name').fill('Adaptador editado');
  await page.getByRole('button', { name: 'Remover imagem', exact: true }).click(); check('remoção de imagem na edição', await page.locator('.form-image-preview').count() === 0);
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click(); await rows(page, 9);
  await selectProduct(page, 'Adaptador editado'); check('remoção salva sem thumbnail quebrada', await page.locator('dialog img').count() === 0); await page.keyboard.press('Escape');
  await editProduct(page, 'Cabo USB-C 2 m');
  await page.locator('#product-minimum').fill('32'); await page.locator('#product-cost').fill('1.234,56'); await page.locator('#product-image').setInputFiles({ name: 'substituta.png', mimeType: 'image/png', buffer: image }); await page.locator('.image-file-name').filter({ hasText: 'substituta.png' }).waitFor();
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click(); await rows(page, 9); await selectProduct(page, 'Cabo USB-C 2 m'); await loadedImages(page); check('edição preserva saldo 124 e substitui imagem', (await page.locator('dialog .detail-facts').textContent()).includes('Saldo atual124') && await page.locator('dialog img').evaluate(e => e.src.startsWith('blob:') && e.naturalWidth > 0)); await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Movimentações', exact: true }).click();
  check('operação desabilitada sem produto', await page.getByRole('button', { name: 'Ver prévia', exact: true }).isDisabled());
  await page.locator('#scan-code').fill('inexistente'); await page.locator('#scan-code').press('Enter'); await page.getByText('Código não encontrado.', { exact: false }).waitFor(); checks.push('consulta código não encontrado');
  await page.locator('#scan-code').fill('7890000000010'); await page.locator('#scan-code').press('Enter'); await page.getByText('Adaptador editado', { exact: true }).waitFor();
  check('barcode busca produto criado editado e foca quantidade', await page.locator('#movement-quantity').evaluate(e => e === document.activeElement));
  await page.locator('#movement-quantity').fill('2,5'); await page.locator('#movement-reason').fill('Conferência'); await page.locator('#movement-reason').press('Enter'); check('Enter motivo não confirma operação', await page.locator('.operation-feedback').count() === 0);
  await page.getByRole('button', { name: 'Ver prévia', exact: true }).click(); await page.locator('.operation-feedback').waitFor(); check('quantidade decimal e unidade real', (await page.locator('.operation-feedback').textContent()).includes('2,5 kg'));
  await page.getByRole('button', { name: 'Próximo produto', exact: true }).click(); check('nova operação limpa e devolve foco leitor', await page.locator('#scan-code').evaluate(e => e === document.activeElement) && await page.locator('.operation-feedback').count() === 0);
  await page.locator('#scan-code').fill('MOU-002'); await page.locator('#scan-code').press('Enter'); await page.getByText('Este código identifica mais de um produto.', { exact: false }).waitFor(); check('colisão SKU/barcode exige seleção explícita', await page.getByRole('button', { name: 'Ver prévia', exact: true }).isDisabled()); await page.getByRole('button', { name: 'Mouse sem fio · MOU-002', exact: true }).click(); await page.getByRole('button', { name: 'Ver prévia', exact: true }).click(); await page.locator('#movement-reason-error').waitFor(); check('erro motivo inline com foco', await page.locator('#movement-reason').evaluate(e => e === document.activeElement));
  await page.locator('#movement-reason').fill('Conferência'); await page.getByRole('radio', { name: 'Saída', exact: true }).check(); await page.locator('#movement-quantity').fill('19'); await page.getByRole('button', { name: 'Ver prévia', exact: true }).click(); await page.getByText('Saldo insuficiente para esta saída', { exact: true }).waitFor(); checks.push('saída acima do saldo identificada');
  await page.locator('#movement-quantity').fill('4'); await page.getByRole('button', { name: 'Ver prévia', exact: true }).click(); await page.locator('.preview-balance strong').filter({ hasText: '14' }).waitFor(); await screenshot(page, 'movimentacao-desktop');
  await page.getByRole('link', { name: 'Produtos', exact: true }).click(); await selectProduct(page, 'Mouse sem fio'); check('prévia não altera estoque', (await page.locator('dialog .detail-facts').textContent()).includes('Saldo atual18')); await page.keyboard.press('Escape');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const [route, label] of [['/', 'dashboard'], ['/products', 'produtos'], ['/products/new', 'novo-produto'], ['/products/CAB-001/edit', 'editar-produto'], ['/movements', 'movimentacao'], ['/history', 'historico']]) {
      await page.goto('http://localhost:5173' + route); await page.locator('h1').waitFor(); await settledLayout(page);
      check(label + ' ' + viewport.width + ' sem overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await screenshot(page, 'qa/' + label + '-' + viewport.width, viewport.width === 390);
      if (label === 'novo-produto') {
        await page.getByRole('radio', { name: 'Registrar entrada inicial', exact: true }).check();
        await page.locator('#product-initialQuantity').focus();
        const visible = await page.locator('#product-initialQuantity').evaluate(e => { const r = e.getBoundingClientRect(); const footer = document.querySelector('.form-actions').getBoundingClientRect(); return r.top >= 0 && r.bottom <= footer.top; });
        check('quantidade focada livre do footer ' + viewport.width, visible);
        await screenshot(page, 'qa/entrada-inicial-' + viewport.width, viewport.width === 390);
      }
    }
  }
  await page.getByLabel('Movimento', { exact: true }).selectOption('Saída'); await page.waitForFunction(() => document.querySelectorAll('.history-table tbody tr').length === 4); checks.push('filtro histórico preservado');
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click(); await page.locator('.sidebar-open').waitFor(); await page.keyboard.press('Escape'); check('menu móvel teclado preservado', await page.getByRole('button', { name: 'Abrir menu', exact: true }).getAttribute('aria-expanded') === 'false');
  check('sem exceções no navegador', errors.length === 0);
  fs.writeFileSync(path.join(out, 'qa/results.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, errors, out })); await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
