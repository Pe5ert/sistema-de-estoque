import * as React from 'react';
export type SearchOption = { value: string; label: string; detail?: string; disabled?: boolean; exact?: boolean };
export function SearchCombobox({ id, label, placeholder, options, selected, search, changeSearch, choose, busy, error, retry, clear, exactEnter, total }: {
  id: string; label: string; placeholder: string; options: SearchOption[]; selected?: SearchOption;
  search: string; changeSearch: (value: string) => void; choose: (value: string) => void;
  total?: number; busy: boolean; error?: boolean; retry: () => unknown; clear?: () => void; exactEnter?: () => unknown;
}) {
  const [open, setOpen] = React.useState(false), [highlight, setHighlight] = React.useState<string>();
  const usable = options.filter(option => !option.disabled);
  const active = usable.find(option => option.value === highlight) ?? usable.find(option => option.exact) ?? usable[0];
  const select = (value: string) => { choose(value); document.getElementById(id)?.focus(); setOpen(false); setHighlight(undefined); };
  React.useEffect(() => { if (open && active) document.getElementById(id + '-option-' + active.value)?.scrollIntoView({ block: 'nearest' }); }, [open, active?.value, id]);
  return <div className="search-combobox" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id}>{label}</label><div className="combobox-input"><input id={id} role="combobox" aria-expanded={open} aria-controls={id + '-list'} aria-autocomplete="list" aria-activedescendant={open && !busy && !error && active ? id + '-option-' + active.value : undefined} autoComplete="off" placeholder={placeholder} value={open ? search : selected?.label ?? search} onFocus={() => { setOpen(true); if (selected) changeSearch(''); }} onChange={event => { changeSearch(event.target.value); setHighlight(undefined); setOpen(true); }} onKeyDown={event => {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); }
      if (event.key === 'Escape') { setOpen(false); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { setOpen(true); const index = usable.findIndex(option => option.value === active?.value); const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + usable.length) % usable.length; setHighlight(usable[next]?.value); }
      if (event.key === 'Enter') { if (open && !busy && !error && active) select(active.value); else if (exactEnter && search.trim()) exactEnter(); else setOpen(true); }
    }} />{selected && clear && <button type="button" className="text-button" aria-label={'Limpar ' + label.toLowerCase()} onClick={() => { clear(); changeSearch(''); document.getElementById(id)?.focus(); }}>×</button>}</div>
    {open && <div className="combobox-popup"><div id={id + '-list'} role="listbox" aria-label={label} aria-busy={busy}>
      {busy ? <p role="status">Buscando…</p> : error ? <p role="status">Não foi possível buscar.</p> : !options.length ? <p role="status">Nenhum resultado encontrado.</p> : options.map(option => <button type="button" role="option" tabIndex={-1} id={id + '-option-' + option.value} key={option.value} aria-selected={selected?.value === option.value} aria-disabled={option.disabled} className={active?.value === option.value ? 'is-active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => { if (!option.disabled) select(option.value); }}><strong>{option.label}{selected?.value === option.value ? ' ✓' : ''}</strong>{option.detail && <small>{option.detail}</small>}</button>)}
    </div>{!busy && !error && total !== undefined && total > options.length && <p>Mostrando {options.length} de {total}. Refine a busca.</p>}{error && <button type="button" className="text-button" onClick={() => { retry(); }}>Tentar novamente</button>}</div>}
  </div>;
}
