// Dados locais usados somente para a prévia visual da interface.
export interface ProductPresentation {
  id?: string;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minimum: number;
  imageUrl?: string | null;
  price?: number | null;
  costPrice?: number | null;
  description?: string | null;
  initialEntry?: { quantity: number; reason: string } | null;
}

export const products: readonly ProductPresentation[] = [
  { sku: 'CAB-001', name: 'Cabo USB-C 2 m', category: 'Acessórios', unit: 'un', stock: 124, minimum: 30, imageUrl: '/products/cable.svg' },
  { sku: 'MOU-002', name: 'Mouse sem fio', category: 'Periféricos', unit: 'un', stock: 18, minimum: 20, imageUrl: '/products/mouse.svg' },
  { sku: 'TEC-003', name: 'Teclado mecânico', category: 'Periféricos', unit: 'un', stock: 0, minimum: 8, imageUrl: '/products/keyboard.svg' },
  { sku: 'SUP-004', name: 'Suporte para notebook', category: 'Acessórios', unit: 'un', stock: 72, minimum: 15 },
  { sku: 'FON-005', name: 'Fonte USB-C 65 W', category: 'Energia', unit: 'un', stock: 9, minimum: 12 },
  { sku: 'HUB-006', name: 'Hub USB 4 portas', category: 'Acessórios', unit: 'un', stock: 45, minimum: 10, imageUrl: '/products/hub.svg' },
  { sku: 'ORG-007', name: 'Organizador de cabos', category: 'Acessórios', unit: 'un', stock: 210, minimum: 40 },
] as const;

export const movements = [
  { id: 'MOV-1027', date: '28/09/2026 · 14:32', sku: 'CAB-001', product: 'Cabo USB-C 2 m', type: 'Entrada', quantity: 30, reason: 'Compra', before: 94, after: 124, author: 'Ana Lima' },
  { id: 'MOV-1026', date: '28/09/2026 · 10:18', sku: 'MOU-002', product: 'Mouse sem fio', type: 'Saída', quantity: 4, reason: 'Venda', before: 22, after: 18, author: 'Pedro Alves' },
  { id: 'MOV-1025', date: '27/09/2026 · 16:45', sku: 'TEC-003', product: 'Teclado mecânico', type: 'Saída', quantity: 3, reason: 'Venda', before: 3, after: 0, author: 'Ana Lima' },
  { id: 'MOV-1024', date: '27/09/2026 · 09:20', sku: 'SUP-004', product: 'Suporte para notebook', type: 'Ajuste', quantity: 2, reason: 'Inventário', before: 70, after: 72, author: 'Marcos Silva' },
  { id: 'MOV-1023', date: '26/09/2026 · 15:06', sku: 'FON-005', product: 'Fonte USB-C 65 W', type: 'Saída', quantity: 6, reason: 'Venda', before: 15, after: 9, author: 'Pedro Alves' },
  { id: 'MOV-1022', date: '26/09/2026 · 11:51', sku: 'HUB-006', product: 'Hub USB 4 portas', type: 'Entrada', quantity: 20, reason: 'Compra', before: 25, after: 45, author: 'Ana Lima' },
  { id: 'MOV-1021', date: '25/09/2026 · 17:14', sku: 'ORG-007', product: 'Organizador de cabos', type: 'Saída', quantity: 15, reason: 'Venda', before: 225, after: 210, author: 'Marcos Silva' },
] as const;

export function stockStatus(stock: number, minimum: number) {
  if (stock === 0) return { label: 'Sem estoque', tone: 'danger' } as const;
  if (stock <= minimum) return { label: 'Estoque baixo', tone: 'warning' } as const;
  return { label: 'Em estoque', tone: 'success' } as const;
}
