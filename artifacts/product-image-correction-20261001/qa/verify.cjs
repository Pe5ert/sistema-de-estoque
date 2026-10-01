const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Office Estagio 3/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.resolve(__dirname, '..');
const checks = [];
const check = (name, ok) => { if (!ok) throw new Error(name); checks.push(name); };
async function capture(page, name, fullPage) {
  await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }))));
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage, animations: 'disabled' });
}
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  try {
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('http://localhost:5173/products/new');
      await page.locator('#product-barcode:focus').waitFor();
      check('imagem dentro de Identificação ' + width, await page.locator('.identification-section .product-image-field').count() === 1);
      check('sem título/seção própria de imagem ' + width, await page.locator('.product-image-field h2').count() === 0);
      check('placeholder único e compacto ' + width, await page.locator('.form-image-empty').evaluate(e => { const r = e.getBoundingClientRect(); return r.width <= 132 && r.height <= 100; }));
      check('sem overflow horizontal ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await capture(page, 'novo-produto-' + width, width < 1440);
      await page.goto('http://localhost:5173/products/CAB-001/edit');
      await page.locator('#product-name:focus').waitFor();
      check('preview reconhecível/compacto ' + width, await page.locator('.form-image-preview').evaluate(e => { const r = e.getBoundingClientRect(); return e.complete && e.naturalWidth > 0 && r.width >= 70 && r.width <= 110 && r.height <= 100; }));
      if (width > 700) check('preview próximo ao Nome ' + width, await page.evaluate(() => { const a = document.querySelector('.form-image-preview').getBoundingClientRect(); const b = document.querySelector('#product-name').getBoundingClientRect(); return a.right <= b.left && Math.abs(a.top - b.top) <= 5; }));
      check('edição preserva saldo ' + width, await page.locator('.readonly-balance strong').textContent() === '124 un');
      check('edição sem overflow ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await capture(page, 'editar-produto-' + width, width < 1440);
      if (width === 390) {
        await page.getByRole('button', { name: 'Trocar imagem', exact: true }).focus();
        await page.waitForFunction(() => { const a = document.querySelector('.image-file-actions').getBoundingClientRect(); const b = document.querySelector('.form-actions').getBoundingClientRect(); return a.top >= 0 && a.bottom <= b.top; });
        check('ações da imagem acessíveis acima do rodapé mobile', true);
        await page.screenshot({ path: path.join(out, 'imagem-mobile-contexto.png'), animations: 'disabled' });
        await page.getByRole('button', { name: 'Remover imagem', exact: true }).click();
        check('remover imagem no mobile', await page.locator('.form-image-empty').count() === 1);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/products/new');
    await page.locator('#product-barcode:focus').waitFor();
    for (const id of ['product-name', 'product-sku', 'product-category', 'product-unit']) {
      await page.keyboard.press('Tab');
      check('Tab preservado ' + id, await page.locator('#' + id).evaluate(e => e === document.activeElement));
    }
    await page.keyboard.press('Tab');
    check('imagem após identificação na ordem de foco', await page.getByRole('button', { name: 'Adicionar imagem', exact: true }).evaluate(e => e === document.activeElement));
    await page.locator('#product-barcode').fill('7890012345678');
    await page.locator('#product-barcode').press('Enter');
    check('scanner Enter mantém avanço para Nome', await page.locator('#product-name').evaluate(e => e === document.activeElement) && await page.locator('.field-error').count() === 0);
    const png = Buffer.from(await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 104; canvas.height = 96; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#4162ed'; ctx.fillRect(0, 0, 104, 96); return canvas.toDataURL('image/png').split(',')[1]; }), 'base64');
    await page.locator('#product-image').setInputFiles({ name: 'invalido.txt', mimeType: 'text/plain', buffer: Buffer.from('invalido') });
    await page.getByRole('alert').filter({ hasText: 'JPG, PNG ou WEBP' }).waitFor();
    check('tipo inválido conserva placeholder', await page.locator('.form-image-empty').count() === 1);
    await page.locator('#product-image').setInputFiles({ name: 'imagem.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Trocar imagem', exact: true }).waitFor();
    check('selecionar mostra preview válido', await page.locator('.form-image-preview').evaluate(e => e.complete && e.naturalWidth > 0));
    await page.getByRole('button', { name: 'Trocar imagem', exact: true }).click();
    await page.locator('#product-image').setInputFiles({ name: 'outra.png', mimeType: 'image/png', buffer: png });
    await page.getByText('outra.png', { exact: true }).waitFor();
    check('trocar preserva dados preenchidos', await page.locator('#product-barcode').inputValue() === '7890012345678');
    await page.getByRole('button', { name: 'Remover imagem', exact: true }).click();
    check('remover restaura placeholder sem imagem quebrada', await page.locator('.form-image-preview').count() === 0 && await page.locator('.form-image-empty').count() === 1);
    await page.locator('#product-image').setInputFiles({ name: 'imagem.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Trocar imagem', exact: true }).waitFor();
    await page.locator('#product-name').fill('Luva de proteção');
    await page.locator('#product-sku').fill('QA-IMAGE-001');
    await page.locator('#product-category').selectOption('Acessórios');
    await page.getByRole('button', { name: 'Salvar e criar outro', exact: true }).click();
    await page.locator('#product-barcode:focus').waitFor();
    await page.getByText('Próxima leitura pronta.', { exact: false }).waitFor();
    check('Save & New limpa imagem e dados do item', await page.locator('.form-image-empty').count() === 1 && await page.locator('#product-name').inputValue() === '' && await page.locator('#product-barcode').inputValue() === '');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Ver detalhes de Luva de proteção', exact: true }).click();
    await page.getByRole('link', { name: 'Editar produto', exact: true }).click();
    check('imagem salva reaparece na edição da sessão', await page.locator('.form-image-preview').evaluate(e => e.complete && e.naturalWidth > 0));
    check('nenhum erro JavaScript', errors.length === 0);
    fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
    console.log('PASS: ' + checks.length + ' verificações; desktop 1440/1024 e mobile 390.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
