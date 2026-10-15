import * as React from 'react';
export function SortHeading({ field, label, sortBy, direction, change }: { field: string; label: string; sortBy: string; direction: string; change: (field: string, direction: string) => void }) {
  const active = field === sortBy;
  return <th scope="col" aria-sort={active ? direction === 'asc' ? 'ascending' : 'descending' : undefined}><button type="button" className="sort-heading" onClick={() => change(field, active && direction === 'asc' ? 'desc' : 'asc')}>{label}<span aria-hidden="true">{active ? direction === 'asc' ? '↑' : '↓' : '↕'}</span></button></th>;
}
export function TableSort({ label, fields, sortBy, direction, change }: { label: string; fields: { value: string; label: string }[]; sortBy: string; direction: string; change: (field: string, direction: string) => void }) {
  return <div className="table-sort"><label className="select-control"><span>{label}</span><select value={sortBy} onChange={event => change(event.target.value, direction)}>{fields.map(field => <option key={field.value} value={field.value}>{field.label}</option>)}</select></label><button type="button" className="text-button" aria-label={direction === 'asc' ? 'Ordem crescente. Usar decrescente' : 'Ordem decrescente. Usar crescente'} onClick={() => change(sortBy, direction === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? '↑ Crescente' : '↓ Decrescente'}</button></div>;
}
