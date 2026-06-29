import VoucherHistoryScreen from '@/screens/VoucherHistoryScreen';

export default function PaymentVouchersRoute() {
  return (
    <VoucherHistoryScreen
      canCancelPending
      description="Track every counter-paid request, including renewals, freezes, and shop vouchers."
      emptyBody="Create a renewal, freeze, or shop request and it will appear here."
      emptyTitle="No payment vouchers yet"
      eyebrow="Payment activity"
      title="Vouchers"
      type={['Membership Renewal', 'Membership Freeze', 'Shop Reservation']}
    />
  );
}
