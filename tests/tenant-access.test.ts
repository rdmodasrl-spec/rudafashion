import test from 'node:test';
import assert from 'node:assert/strict';
import {
  merchantOrderItemIds,
  merchantOwnsOrder,
  merchantOwnsOrderItem
} from '../src/server/tenantAccess';

test('merchant ownership is limited to its own order items', () => {
  const order = {
    merchantId: null,
    items: [
      { id: 'item-a', merchantId: 'merchant-a' },
      { id: 'item-b', merchantId: 'merchant-b' }
    ]
  };

  assert.equal(merchantOwnsOrder(order, 'merchant-a'), true);
  assert.equal(merchantOwnsOrderItem(order, 'merchant-a', order.items[0]), true);
  assert.equal(merchantOwnsOrderItem(order, 'merchant-a', order.items[1]), false);
  assert.deepEqual([...merchantOrderItemIds(order, 'merchant-a')], ['item-a']);
});

test('merchant parent ownership includes legacy unassigned items only for that merchant', () => {
  const order = {
    merchantId: 'merchant-a',
    items: [
      { id: 'item-a', merchantId: null },
      { id: 'item-b', merchantId: 'merchant-b' }
    ]
  };

  assert.deepEqual([...merchantOrderItemIds(order, 'merchant-a')], ['item-a']);
  assert.equal(merchantOwnsOrder(order, 'merchant-b'), true);
  assert.equal(merchantOwnsOrderItem(order, 'merchant-b', order.items[0]), false);
});
