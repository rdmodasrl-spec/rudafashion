export interface TenantOrderItem {
  id: string;
  merchantId: string | null;
}

export interface TenantOrder {
  merchantId: string | null;
  items: TenantOrderItem[];
}

export function merchantOwnsOrderItem(order: TenantOrder, merchantId: string, item: TenantOrderItem): boolean {
  return item.merchantId === merchantId || (order.merchantId === merchantId && !item.merchantId);
}

export function merchantOwnsOrder(order: TenantOrder, merchantId: string): boolean {
  return order.merchantId === merchantId || order.items.some(item => merchantOwnsOrderItem(order, merchantId, item));
}

export function merchantOrderItemIds(order: TenantOrder, merchantId: string): Set<string> {
  return new Set(order.items.filter(item => merchantOwnsOrderItem(order, merchantId, item)).map(item => item.id));
}
