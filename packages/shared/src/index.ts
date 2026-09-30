// Contratos de domínio independentes de Nest, Prisma e da interface.
export const userRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
export type UserRole = (typeof userRoles)[number];

export const productUnits = [
  'UNIT',
  'BOX',
  'PACK',
  'KG',
  'G',
  'LITER',
  'ML',
  'METER',
] as const;
export type ProductUnit = (typeof productUnits)[number];

export const movementTypes = [
  'ENTRY',
  'EXIT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
] as const;
export type MovementType = (typeof movementTypes)[number];

export const movementReasons = [
  'PURCHASE',
  'SALE',
  'INTERNAL_USE',
  'RETURN',
  'LOSS',
  'INVENTORY_ADJUSTMENT',
  'OTHER',
] as const;
export type MovementReason = (typeof movementReasons)[number];
