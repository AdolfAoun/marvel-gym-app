import VoucherHistoryScreen from '@/screens/VoucherHistoryScreen';

export default function ClassBookingsRoute() {
  return (
    <VoucherHistoryScreen
      description="See every class request and its current approval status."
      emptyBody="Reserve a class to keep its request and status in one place."
      emptyTitle="No class bookings yet"
      eyebrow="Class activity"
      title="My bookings"
      type="Class Reservation"
    />
  );
}
