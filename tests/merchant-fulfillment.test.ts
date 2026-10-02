import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionShipmentStatus, getOrderFulfillmentStatus, getShipmentQuantities } from '../src/server/merchantFulfillment';

test('shipment status transitions prevent cancelling shipped packages', () => {
  assert.equal(canTransitionShipmentStatus('pending', 'packed'), true);
  assert.equal(canTransitionShipmentStatus('packed', 'cancelled'), true);
  assert.equal(canTransitionShipmentStatus('shipped', 'delivered'), true);
  assert.equal(canTransitionShipmentStatus('exception', 'shipped'), true);
  assert.equal(canTransitionShipmentStatus('shipped', 'cancelled'), false);
  assert.equal(canTransitionShipmentStatus('delivered', 'shipped'), false);
});

test('packed packages do not consume ordered quantities; shipped partial packages do', () => {
  const shipments = [
    { status: 'packed' as const, items: [{ orderItemId: 'item-a', quantity: 4 }] },
    { status: 'shipped' as const, items: [{ orderItemId: 'item-a', quantity: 3 }] }
  ];
  assert.deepEqual(getShipmentQuantities(shipments), new Map([['item-a', 3]]));
  assert.equal(getOrderFulfillmentStatus('picking', [{ id: 'item-a', quantity: 5 }], shipments), 'picking');
});

test('cancelling an unshipped last parcel restores an actionable order state', () => {
  assert.equal(
    getOrderFulfillmentStatus('shipped', [{ id: 'item-a', quantity: 5 }], [
      { status: 'cancelled', items: [{ orderItemId: 'item-a', quantity: 5 }] }
    ]),
    'confirmed'
  );
  assert.equal(
    getOrderFulfillmentStatus('picking', [{ id: 'item-a', quantity: 5 }], [
      { status: 'shipped', items: [{ orderItemId: 'item-a', quantity: 2 }] },
      { status: 'packed', items: [{ orderItemId: 'item-a', quantity: 3 }] }
    ]),
    'picking'
  );
  assert.equal(
    getOrderFulfillmentStatus('shipped', [{ id: 'item-a', quantity: 5 }], [
      { status: 'delivered', items: [{ orderItemId: 'item-a', quantity: 5 }] }
    ]),
    'delivered'
  );
});
