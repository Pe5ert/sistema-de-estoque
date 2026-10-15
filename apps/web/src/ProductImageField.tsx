import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Link as LinkIcon, X } from 'lucide-react';
import { FieldError } from './feedback';
import { imageFileError } from './product-image-model';

export function ProductImageField({ imageUrl, onChange, disabled, file, onFileChange }: { imageUrl: string; onChange: (url: string) => void; disabled?: boolean; file: File | null; onFileChange: (file: File | null) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const select = (next?: File) => {
    if (!next || disabled) return;
    const problem = imageFileError(next); setError(problem);
    if (!problem) { onFileChange(next); setEditing(false); }
  };
  const displayedUrl = preview || imageUrl;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(imageUrl);
  const [failedUrl, setFailedUrl] = useState('');
  const [error, setError] = useState('');
  const [loadedUrl, setLoadedUrl] = useState('');
  const restoreFocus = () => requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.image-file-actions button, .form-image-empty')?.focus({ preventScroll: true }));
  const apply = () => {
    try {
      const url = new URL(draft.trim());
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.href.length > 2048) throw new Error();
      onFileChange(null); onChange(url.href); setEditing(false); setError(''); restoreFocus();
    } catch { setError('Informe uma URL http ou https válida.'); }
  };
  const start = () => { setDraft(imageUrl); setError(''); setEditing(true); };
  return <div className="product-image-field" role="group" aria-label="Imagem principal opcional">
    <input ref={picker} type="file" className="sr-only" tabIndex={-1} aria-label="Selecionar foto do produto" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} />
    <div className={'image-dropzone' + (dragging ? ' image-dragging' : '') + (displayedUrl && loadedUrl !== displayedUrl && failedUrl !== displayedUrl ? ' image-loading' : '')} onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length > 1) { setError('Selecione uma imagem por produto.'); return; } select(event.dataTransfer.files[0]); }}>
      {displayedUrl && failedUrl !== displayedUrl ? <img className={'form-image-preview ' + (loadedUrl === displayedUrl ? 'image-ready' : 'image-pending')} onLoad={() => setLoadedUrl(displayedUrl)} src={displayedUrl} onError={() => { setFailedUrl(displayedUrl); if (file) setError('Não foi possível visualizar este arquivo. Escolha outra imagem.'); }} alt="Imagem principal do produto" /> : <button className="form-image-empty" type="button" disabled={disabled} onClick={() => picker.current?.click()}><ImagePlus size={20} aria-hidden="true" /><span>{displayedUrl ? 'Imagem indisponível' : 'Adicionar imagem'}</span></button>}
      {displayedUrl && <div className="image-file-actions"><button className="secondary-button" aria-label="Trocar imagem" type="button" disabled={disabled} onClick={() => picker.current?.click()}><ImagePlus size={15} />Trocar</button><button className="row-action" type="button" disabled={disabled} aria-label="Remover imagem" onClick={() => { onFileChange(null); onChange(''); setError(''); setEditing(false); restoreFocus(); }}><X size={17} /></button></div>}
    </div>
    {editing && <div className="image-url-field"><label htmlFor="product-image-url">URL da imagem</label><input id="product-image-url" type="url" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } }} aria-invalid={Boolean(error)} aria-describedby={error ? 'image-url-error' : undefined} autoFocus disabled={disabled} /><button className="text-button" type="button" disabled={disabled} onClick={apply}>Aplicar URL</button><button className="text-button" type="button" onClick={() => { setEditing(false); restoreFocus(); }}>Cancelar</button></div>}
    <span className="field-hint">JPG, PNG ou WebP · até 5 MB</span>
    {file && <span className="field-hint" role="status">{file.name} · será enviada ao salvar</span>}
    <button type="button" className="text-button image-link-option" disabled={disabled} onClick={start}><LinkIcon size={12} aria-hidden="true" />Usar link</button>
    {error && <FieldError id="image-url-error">{error}</FieldError>}
  </div>;
}
