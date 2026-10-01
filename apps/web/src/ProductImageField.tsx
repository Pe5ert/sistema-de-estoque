import { useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';

export function ProductImageField({ imageUrl, file, onSelect, onRemove, disabled }: {
  imageUrl?: string | null; file: File | null; onSelect: (file: File) => void; onRemove: () => void; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const selection = useRef(0);
  const select = async (files: FileList | null) => {
    if (disabled) return;
    if (!files?.length) return;
    if (files.length !== 1) { setError('Selecione somente uma imagem principal.'); return; }
    const selected = files[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) { setError('Use uma imagem JPG, PNG ou WEBP.'); return; }
    if (selected.size > 5 * 1024 * 1024) { setError('Escolha uma imagem de até 5 MB para esta prévia.'); return; }
    const version = ++selection.current;
    try {
      const bitmap = await createImageBitmap(selected);
      bitmap.close();
      if (version !== selection.current) return;
      setError(''); onSelect(selected);
    } catch { if (version === selection.current) setError('Não foi possível ler esta imagem. Selecione outro arquivo.'); }
  };
  return <div className="product-image-field" role="group" aria-label="Imagem principal opcional">
    <div className={'image-dropzone' + (dragging ? ' image-dropzone-active' : '')}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void select(event.dataTransfer.files); }}>
      {imageUrl ? <>
        <img className="form-image-preview" src={imageUrl} alt="Prévia da imagem principal" />
        <div className="image-file-actions"><button className="secondary-button" type="button" aria-label="Trocar imagem" disabled={disabled} onClick={() => input.current?.click()}><Upload size={15} aria-hidden="true" />Trocar</button><button type="button" className="row-action" aria-label="Remover imagem" disabled={disabled} onClick={() => { selection.current++; setError(''); onRemove(); }}><X size={17} /></button></div>
      </> : <button className="form-image-empty" type="button" disabled={disabled} onClick={() => input.current?.click()}><ImagePlus size={20} aria-hidden="true" /><span>Adicionar imagem</span></button>}
      <label className="sr-only" htmlFor="product-image">Imagem principal</label><input id="product-image" ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} tabIndex={-1} onChange={(event) => { void select(event.target.files); event.target.value = ''; }} />
    </div>
    <span className="field-hint image-file-name">{file ? file.name : 'JPG, PNG, WEBP · até 5 MB'}</span>
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
