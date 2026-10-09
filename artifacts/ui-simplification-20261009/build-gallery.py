from pathlib import Path
from PIL import Image
import html

root = Path(__file__).resolve().parent
screens = [('dashboard', 'Visão geral'), ('products', 'Produtos'), ('movements', 'Movimentações'), ('history', 'Histórico'), ('purchases', 'Compras'), ('new-order', 'Novo pedido'), ('suppliers', 'Fornecedores'), ('physical', 'Inventário físico'), ('import', 'Importação')]
sections = []
for key, title in screens:
    views = []
    for size in ['desktop', 'mobile']:
        images = []
        for stage, label in [('before', 'Antes'), ('after', 'Depois')]:
            source = root / stage / f'{key}-{size}.png'
            picture = Image.open(source).convert('RGB')
            # Originals retain the complete screenshot; mobile previews crop the harness.
            if size == 'mobile':
                picture = picture.crop((24, 107, 416, 953))
            name = f'{key}-{size}.jpg'
            picture.save(root / stage / name, quality=88, optimize=True)
            images.append(f'<figure><figcaption>{label} · {size}</figcaption><a href="{stage}/{name}" target="_blank"><img loading="lazy" src="{stage}/{name}" alt="{html.escape(title)} — {label}, {size}"></a></figure>')
        views.append(f'<div class="pair {size}">' + ''.join(images) + '</div>')
    sections.append(f'<section id="{key}"><h2>{title}</h2>' + ''.join(views) + '</section>')
page = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GAVYO — simplificação visual</title><style>body{margin:0;padding:24px;background:#191e27;color:#f0f3f8;font:15px Segoe UI,Arial}main{max-width:1500px;margin:auto}h1{font-size:28px}p{color:#a8b3c5;line-height:1.6}a{color:#a8bdff}nav{display:flex;gap:16px;flex-wrap:wrap;padding:16px 0}section{border-top:1px solid #353e4c;margin-top:32px;padding-top:16px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}figure{margin:0}figcaption{margin:16px 0 8px;color:#a8b3c5}img{display:block;width:100%;border:1px solid #353e4c;border-radius:2px}.mobile{max-width:804px;margin:16px auto 32px}@media(max-width:700px){.pair{grid-template-columns:1fr}body{padding:16px}}</style><main><h1>GAVYO — antes e depois</h1><p>Nove telas, mesma direção grafite/azul de 2 px. Capturas com API e PostgreSQL locais e dados fictícios. Desktop: 1280 px. Mobile: sistema real incorporado em 390 × 844 px; não representa um aparelho físico.</p><p>Os testes criaram um produto e um pedido: por isso algumas contagens diferem entre antes e depois. <a href="AUDIT.md">Auditoria inicial</a> · <a href="REVIEW.md">Validação e limites</a></p><nav>'''
page += ''.join(f'<a href="#{key}">{title}</a>' for key, title in screens) + '</nav>' + ''.join(sections) + '</main></html>'
(root / 'index.html').write_text(page, encoding='utf-8')
