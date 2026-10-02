import assert from 'node:assert/strict';
import test from 'node:test';
import { allocateRefundAcrossPayments, calculatePayoutAllocation, canTransitionReturnStatus, getRefundProgress, isOrderEligibleForPayout } from '../src/server/merchantRefunds';

test('refund requests allocate only against remaining paid transaction amounts', () => {
  assert.deepEqual(
    allocateRefundAcrossPayments(40, [
      { paymentTransactionId: 'payment-a', refundableAmount: 25 },
      { paymentTransactionId: 'payment-b', refundableAmount: 20 }
    ]),
    [
      { paymentTransactionId: 'payment-a', amount: 25 },
      { paymentTransactionId: 'payment-b', amount: 15 }
    ]
  );
  assert.throws(
    () => allocateRefundAcrossPayments(46, [
      { paymentTransactionId: 'payment-a', refundableAmount: 25 },
      { paymentTransactionId: 'payment-b', refundableAmount: 20 }
    ]),
    /RETURN_REFUND_EXCEEDS_PAID_AMOUNT/
  );
  assert.throws(() => allocateRefundAcrossPayments(0, []), /REFUND_AMOUNT_INVALID/);
});

test('refund progress distinguishes pending, failed, partial and full refunds', () => {
  assert.deepEqual(getRefundProgress(100, 0, 1, 0), { paymentStatus: 'paid', refundStatus: 'processing' });
  assert.deepEqual(getRefundProgress(100, 25, 0, 0), { paymentStatus: 'partially_refunded', refundStatus: 'partially_refunded' });
  assert.deepEqual(getRefundProgress(100, 25, 1, 0), { paymentStatus: 'partially_refunded', refundStatus: 'processing' });
  assert.deepEqual(getRefundProgress(100, 100, 0, 0), { paymentStatus: 'refunded', refundStatus: 'completed' });
});

test('settlement only includes final refund states and reduces the order allocation', () => {
  assert.equal(isOrderEligibleForPayout('paid', 'none'), true);
  assert.equal(isOrderEligibleForPayout('partially_refunded', 'partially_refunded'), true);
  assert.equal(isOrderEligibleForPayout('pending_refund', 'approved'), false);
  assert.equal(isOrderEligibleForPayout('paid', 'failed'), false);
  assert.deepEqual(calculatePayoutAllocation(100, 25, 0.08), {
    platformFeeAmount: 8,
    processingFeeAmount: 2,
    netAmount: 65
  });
});

test('returns require approval and physical receipt before entering refund processing', () => {
  assert.equal(canTransitionReturnStatus('requested', 'approved'), true);
  assert.equal(canTransitionReturnStatus('requested', 'rejected'), true);
  assert.equal(canTransitionReturnStatus('approved', 'received'), true);
  assert.equal(canTransitionReturnStatus('requested', 'received'), false);
  assert.equal(canTransitionReturnStatus('received', 'refunded'), true);
  assert.equal(canTransitionReturnStatus('refunded', 'received'), false);
});
