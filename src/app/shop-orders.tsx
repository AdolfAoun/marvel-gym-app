import VoucherHistoryScreen from '@/screens/VoucherHistoryScreen';

export default function ShopOrdersRoute() {
  return (
    <VoucherHistoryScreen
      canCancelPending
      description="Track each shop voucher from payment request to completion."
      emptyBody="Create a voucher from the shop to reserve an item, then it will appear here."
      emptyTitle="No shop requests yet"
      eyebrow="Shop activity"
      title="Orders & vouchers"
      type="Shop Reservation"
    />
  );
}
