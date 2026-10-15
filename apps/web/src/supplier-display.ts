export function displayDocument(value?: string | null) {
  if (!value) return 'Não informado';
  if (/^\d{11}$/.test(value)) return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (/^\d{14}$/.test(value)) return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return value;
}
