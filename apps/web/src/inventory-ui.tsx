import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { stockStatus, type ProductPresentation } from './demo-data';

export function ProductThumbnail({ imageUrl, name, large = false }: {
  imageUrl?: string | null; name: string; large?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasImage = Boolean(imageUrl && failedUrl !== imageUrl);
  return (
    <span className={'product-thumbnail' + (large ? ' product-thumbnail-large' : '')}>
      {hasImage
        ? <img src={imageUrl!} alt={name} loading="lazy" onError={() => setFailedUrl(imageUrl!)} />
        : <span role="img" aria-label={name + ': sem imagem'} className="thumbnail-placeholder"><ImageOff size={large ? 30 : 19} aria-hidden="true" /></span>}
    </span>
  );
}

export function ProductIdentity({ product }: { product: Pick<ProductPresentation, 'name' | 'sku' | 'imageUrl'> & { category?: string } }) {
  return <span className="product-identity"><ProductThumbnail imageUrl={product.imageUrl} name={product.name} /><span><strong>{product.name}</strong><small>{product.sku}{product.category && ' · ' + product.category}</small></span></span>;
}

export function Status({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={'status status-' + tone}>{label}</span>;
}

export function StockMeter({ stock, minimum, name }: { stock: number; minimum: number; name: string }) {
  const width = minimum > 0 ? Math.min((stock / (minimum * 2)) * 100, 100) : stock > 0 ? 100 : 0;
  return <div className={'stock-meter stock-meter-' + stockStatus(stock, minimum).tone} role="img"
    aria-label={`${name}: ${stock} unidades disponíveis, mínimo ${minimum}. A marca central indica o mínimo.`}>
    <span style={{ width: width + '%' }} />{minimum > 0 && <i aria-hidden="true" />}
  </div>;
}

export function MovementAmount({ type, quantity }: { type: string; quantity: number }) {
  return <span className={'delta delta-' + (type === 'Saída' ? 'out' : type === 'Entrada' ? 'in' : 'adjust')}>
    {type === 'Saída' ? '−' : '+'}{quantity}<small>{type}</small>
  </span>;
}
