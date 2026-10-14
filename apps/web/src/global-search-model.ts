import { hasPermission, type Permission, type UserRole } from '@stock/shared';

const actions: { label: string; path: string; keywords: string; permission?: Permission }[] = [
  { label: 'Visão geral', path: '/', keywords: 'dashboard painel indicadores estoque' },
  { label: 'Produtos', path: '/products', keywords: 'catalogo lista buscar sku codigo barras' },
  { label: 'Novo produto', path: '/products/new', keywords: 'cadastrar adicionar criar produto', permission: 'product.create' },
  { label: 'Movimentações', path: '/movements', keywords: 'entrada saida bipador scanner movimentar saldo' },
  { label: 'Histórico', path: '/history', keywords: 'movimentos registro auditoria' },
  { label: 'Inventário físico', path: '/physical-inventories', keywords: 'contagem conferir estoque inventario' },
  { label: 'Categorias', path: '/products?categories=1', keywords: 'categoria organizar grupo cadastro', permission: 'category.manage' },
  { label: 'Importar planilha', path: '/products/import', keywords: 'importacao excel csv xlsx produtos', permission: 'product.import' },
  { label: 'Fornecedores', path: '/suppliers', keywords: 'contato cnpj fornecedor', permission: 'supplier.read' },
  { label: 'Novo fornecedor', path: '/suppliers/new', keywords: 'cadastrar adicionar fornecedor', permission: 'supplier.manage' },
  { label: 'Compras', path: '/purchases', keywords: 'pedidos recebimentos compra', permission: 'purchase.read' },
  { label: 'Novo pedido', path: '/purchases/new', keywords: 'criar compra comprar reposicao', permission: 'purchase.manage' },
  { label: 'Backups', path: '/backups', keywords: 'copia seguranca agendamento backup', permission: 'backup.manage' },
];
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function searchActions(query: string, role?: UserRole) {
  if (!role) return [];
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return actions.filter(action => (!action.permission || hasPermission(role, action.permission)) && words.every(word => normalizeSearch(action.label + ' ' + action.keywords).includes(word))).slice(0, query.trim() ? 8 : 6);
}
export function productSearchLink(id: string, sku: string) {
  return '/products?' + new URLSearchParams({ active: 'all', q: sku, detail: id });
}
