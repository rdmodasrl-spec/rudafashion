import type { Product } from '../types/b2b';

export type ProductZone = 'new' | 'clearance' | 'private';

export function getProductZone(product: Partial<Pick<Product, 'status' | 'visibility' | 'isExclusiveProtected'>>): ProductZone {
  if (product.visibility === 'private' || product.isExclusiveProtected) return 'private';
  return product.status === 'clearance' ? 'clearance' : 'new';
}

export function getProductZoneUpdates(zone: ProductZone): Pick<Product, 'status' | 'visibility' | 'isExclusiveProtected' | 'protectionLevel'> {
  if (zone === 'private') {
    return {
      status: 'new',
      visibility: 'private',
      isExclusiveProtected: true,
      protectionLevel: 'exclusive_vault'
    };
  }
  return {
    status: zone === 'clearance' ? 'clearance' : 'new',
    visibility: 'public',
    isExclusiveProtected: false,
    protectionLevel: 'public'
  };
}
