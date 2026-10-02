export type RefundPaymentBalance = {
  paymentTransactionId: string;
  refundableAmount: number;
};

export type RefundProgress = {
  paymentStatus: 'paid' | 'partially_refunded' | 'refunded';
  refundStatus: 'none' | 'processing' | 'failed' | 'partially_refunded' | 'completed';
};

export function canTransitionReturnStatus(current: string, next: string): boolean {
  if (current === 'requested') return next === 'approved' || next === 'rejected';
  if (current === 'approved') return next === 'received';
  if (current === 'received') return next === 'refunded';
  return false;
}

export function isOrderEligibleForPayout(paymentStatus: string, refundStatus: string): boolean {
  return ['paid', 'partially_refunded', 'refunded'].includes(paymentStatus)
    && ['none', 'partially_refunded', 'completed'].includes(refundStatus);
}

export function calculatePayoutAllocation(
  grossAmount: number,
  refundAmount: number,
  platformFeeRate: number,
  processingFeeRate = 0.02
): { platformFeeAmount: number; processingFeeAmount: number; netAmount: number } {
  const platformFeeAmount = Number((grossAmount * platformFeeRate).toFixed(2));
  const processingFeeAmount = Number((grossAmount * processingFeeRate).toFixed(2));
  return {
    platformFeeAmount,
    processingFeeAmount,
    netAmount: Number(Math.max(0, grossAmount - refundAmount - platformFeeAmount - processingFeeAmount).toFixed(2))
  };
}

export function allocateRefundAcrossPayments(
  requestedAmount: number,
  paymentBalances: RefundPaymentBalance[]
): Array<{ paymentTransactionId: string; amount: number }> {
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) throw new Error('REFUND_AMOUNT_INVALID');
  let remainingCents = Math.round(requestedAmount * 100);
  const allocations: Array<{ paymentTransactionId: string; amount: number }> = [];
  for (const payment of paymentBalances) {
    const availableCents = Math.max(0, Math.floor(payment.refundableAmount * 100 + 1e-8));
    const amountCents = Math.min(remainingCents, availableCents);
    if (!amountCents) continue;
    allocations.push({ paymentTransactionId: payment.paymentTransactionId, amount: amountCents / 100 });
    remainingCents -= amountCents;
    if (remainingCents === 0) break;
  }
  if (remainingCents > 0) throw new Error('RETURN_REFUND_EXCEEDS_PAID_AMOUNT');
  return allocations;
}

export function getRefundProgress(
  paidAmount: number,
  successfulRefundAmount: number,
  pendingRefundCount: number,
  failedRefundCount: number
): RefundProgress {
  const fullyRefunded = paidAmount > 0 && successfulRefundAmount >= paidAmount;
  return {
    paymentStatus: fullyRefunded ? 'refunded' : successfulRefundAmount > 0 ? 'partially_refunded' : 'paid',
    refundStatus: pendingRefundCount > 0
      ? 'processing'
      : failedRefundCount > 0
        ? 'failed'
        : fullyRefunded
          ? 'completed'
          : successfulRefundAmount > 0
            ? 'partially_refunded'
            : 'none'
  };
}
