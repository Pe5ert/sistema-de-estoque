import type { UserRole } from './index';

const operators = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const managers = ['ADMIN', 'MANAGER'] as const;

export const permissionRoles = {
  'dashboard.read': operators,
  'product.read': operators,
  'product.create': operators,
  'product.update': managers,
  'category.read': operators,
  'category.manage': managers,
  'stock.read': operators,
  'stock.move': operators,
  'stock.adjust': managers,
  'product.import': managers,
  'backup.manage': ['ADMIN'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof permissionRoles;

// Unknown/missing roles fail closed. This policy is shared by UI and API.
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  return (permissionRoles[permission] as readonly string[]).includes(role ?? '');
}
