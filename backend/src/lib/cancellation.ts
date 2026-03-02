/**
 * TripLocal 統一キャンセルポリシー
 * - 7日以上前: 100%返金
 * - 3〜6日前: 50%返金
 * - 2日前〜当日: 返金なし
 */
export function calculateRefundRate(checkInDate: Date): number {
  const now = new Date();
  const diffMs = checkInDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 7) return 1.0;
  if (diffDays >= 3) return 0.5;
  return 0;
}

export function calculateRefundAmount(totalPrice: number, checkInDate: Date): number {
  const rate = calculateRefundRate(checkInDate);
  return Math.floor(totalPrice * rate);
}

export function getRefundDates(checkInDate: Date) {
  const fullRefundDeadline = new Date(checkInDate);
  fullRefundDeadline.setDate(fullRefundDeadline.getDate() - 7);

  const halfRefundDeadline = new Date(checkInDate);
  halfRefundDeadline.setDate(halfRefundDeadline.getDate() - 3);

  const noRefundStart = new Date(checkInDate);
  noRefundStart.setDate(noRefundStart.getDate() - 2);

  return { fullRefundDeadline, halfRefundDeadline, noRefundStart };
}
