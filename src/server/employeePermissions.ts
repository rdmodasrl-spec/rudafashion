export const defaultEmployeePermissions: Record<string, string[]> = {
  sales: ['sales.order.create', 'product.catalog.read', 'pricing.request'],
  warehouse: ['warehouse.pick', 'warehouse.review', 'warehouse.pack', 'warehouse.ship'],
  production: ['production.report'],
  pos_cashier: ['sales.order.create'],
  store_manager: [
    'sales.order.create', 'sales.quote.manage', 'business.analytics.read', 'product.catalog.read', 'product.import.draft', 'product.publish', 'product.publish.approve', 'pricing.request', 'pricing.approve',
    'warehouse.pick', 'warehouse.review', 'warehouse.pack', 'warehouse.ship',
    'production.report', 'purchase.manage', 'return.manage', 'employees.manage'
  ]
};

export function hasEmployeePermission(role: string, configuredPermissions: unknown, permission: string): boolean {
  if (!Array.isArray(configuredPermissions)) return Boolean(defaultEmployeePermissions[role]?.includes(permission));
  const permissions = configuredPermissions.filter((value): value is string => typeof value === 'string');
  return permissions.includes('*') || permissions.includes(permission);
}
