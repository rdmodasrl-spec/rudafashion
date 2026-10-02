import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultEmployeePermissions, hasEmployeePermission } from '../src/server/employeePermissions';

test('defaults permissions only when no custom permission list is configured', () => {
  assert.equal(hasEmployeePermission('sales', undefined, 'sales.order.create'), true);
  assert.equal(hasEmployeePermission('sales', null, 'pricing.request'), true);
  assert.equal(hasEmployeePermission('sales', [], 'sales.order.create'), false);
});

test('custom permission sets use canonical action keys and can revoke defaults', () => {
  assert.equal(hasEmployeePermission('sales', ['pricing.request'], 'pricing.request'), true);
  assert.equal(hasEmployeePermission('sales', ['pricing.request'], 'sales.order.create'), false);
  assert.equal(hasEmployeePermission('sales', ['sales.orders'], 'sales.order.create'), false);
  assert.equal(hasEmployeePermission('sales', ['*'], 'sales.order.create'), true);
});

test('role defaults match service-checked operations', () => {
  assert.deepEqual(defaultEmployeePermissions.warehouse, [
    'warehouse.pick', 'warehouse.review', 'warehouse.pack', 'warehouse.ship'
  ]);
  assert.equal(defaultEmployeePermissions.store_manager.includes('return.manage'), true);
  assert.equal(hasEmployeePermission('sales', undefined, 'return.manage'), false);
  assert.equal(hasEmployeePermission('sales', ['return.manage'], 'return.manage'), true);
});

test('POS cashier defaults to sales access without employee administration', () => {
  assert.deepEqual(defaultEmployeePermissions.pos_cashier, ['sales.order.create']);
  assert.equal(hasEmployeePermission('pos_cashier', undefined, 'sales.order.create'), true);
  assert.equal(hasEmployeePermission('pos_cashier', undefined, 'employees.manage'), false);
});
