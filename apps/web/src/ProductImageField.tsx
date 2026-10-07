import { useState } from 'react';
import { ImagePlus, Link as LinkIcon, X } from 'lucide-react';
import { FieldError } from './feedback';

export function ProductImageField({ imageUrl, onChange, disabled }: { imageUrl: string; onChange: (url: string) => void; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(imageUrl);
  const [failedUrl, setFailedUrl] = useState('');
  const [error, setError] = useState('');
  const apply = () => {
    try {
      const url = new URL(draft.trim());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.href.length > 2048) throw new Error();
      onChange(url.href); setEditing(false); setError('');
    } catch { setError('Informe uma URL http ou https válida.'); }
  };
  const start = () => { setDraft(imageUrl); setError(''); setEditing(true); };
  return <div className="product-image-field" role="group" aria-label="Imagem principal opcional">
    <div className="image-dropzone">
      {imageUrl && failedUrl !== imageUrl ? <img className="form-image-preview" src={imageUrl} onError={() => setFailedUrl(imageUrl)} alt="Imagem principal do produto" /> : <button className="form-image-empty" type="button" disabled={disabled} onClick={start}><ImagePlus size={20} aria-hidden="true" /><span>{imageUrl ? 'Imagem indisponível' : 'Adicionar imagem'}</span></button>}
      {imageUrl && <div className="image-file-actions"><button className="secondary-button" aria-label="Trocar imagem" type="button" disabled={disabled} onClick={start}><LinkIcon size={15} />Trocar</button><button className="row-action" type="button" disabled={disabled} aria-label="Remover imagem" onClick={() => { onChange(''); setEditing(false); }}><X size={17} /></button></div>}
    </div>
    {editing && <div className="image-url-field"><label htmlFor="product-image-url">URL da imagem</label><input id="product-image-url" type="url" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } }} aria-invalid={Boolean(error)} aria-describedby={error ? 'image-url-error' : undefined} autoFocus disabled={disabled} /><button className="text-button" type="button" disabled={disabled} onClick={apply}>Aplicar URL</button><button className="text-button" type="button" onClick={() => setEditing(false)}>Cancelar</button></div>}
    <span className="field-hint">Imagem por URL · opcional</span>
    {error && <FieldError id="image-url-error">{error}</FieldError>}
  </div>;
}
