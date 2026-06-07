import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  activityService,
  memberService,
  membershipService,
  notificationService,
  voucherService,
} from '@/services';
import type {
  AppNotification,
  GymActivityDay,
  GymActivityLevel,
  Member,
  Membership,
  MembershipPlan,
  MembershipStatus,
  Voucher,
} from '@/types';

const accentColor = '#B11226';
const wineColor = '#58111B';
const backgroundColor = '#FFF8F7';
const surfaceColor = '#FFFFFF';
const textColor = '#181A20';
const mutedColor = '#667085';
const freezeOptions = [1, 2, 3, 4];
const renewOptions = [1, 3, 6, 12];
const weeklyFreezePrice = 10;

type MembershipModal = 'freeze' | 'renew';
type PaymentMode = 'Pay at Counter' | 'Pay with Card';

function calculateDaysRemaining(endDate?: string) {
  if (!endDate) {
    return 42;
  }

  const endTime = new Date(endDate).getTime();
  const now = Date.now();

  if (Number.isNaN(endTime)) {
    return 42;
  }

  return Math.max(0, Math.ceil((endTime - now) / 86400000));
}

function getCountdownColor(daysRemaining: number, status?: MembershipStatus) {
  if (status === 'Frozen') {
    return '#F59E0B';
  }

  if (daysRemaining <= 7 || status === 'Expired' || status === 'Suspended') {
    return '#EF4444';
  }

  if (daysRemaining <= 21 || status === 'Pending Approval') {
    return '#F59E0B';
  }

  return '#22C55E';
}

function getStatusTone(status?: MembershipStatus) {
  if (status === 'Active') {
    return '#22C55E';
  }

  if (status === 'Frozen' || status === 'Pending Approval') {
    return '#F59E0B';
  }

  return '#EF4444';
}

function getActivityColor(intensity: GymActivityLevel['intensity']) {
  if (intensity === 'High') {
    return accentColor;
  }

  if (intensity === 'Medium') {
    return '#F59E0B';
  }

  return '#22C55E';
}

function formatDate(value?: string) {
  if (!value) {
    return 'Not available yet';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatVoucherDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function getVoucherStatusColor(status: Voucher['status']) {
  if (status === 'Paid') {
    return '#22C55E';
  }

  if (status === 'Redeemed') {
    return '#8B95A5';
  }

  return '#F59E0B';
}

export default function HomeScreen() {
  const [member, setMember] = useState<Member>();
  const [membership, setMembership] = useState<Membership>();
  const [status, setStatus] = useState<MembershipStatus>();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [notification, setNotification] = useState<AppNotification>();
  const [activitySchedule, setActivitySchedule] = useState<GymActivityDay[]>([]);
  const [selectedActivityDayId, setSelectedActivityDayId] = useState('');
  const [pendingVouchers, setPendingVouchers] = useState<Voucher[]>([]);
  const [membershipModal, setMembershipModal] = useState<MembershipModal>();
  const [selectedFreezeWeeks, setSelectedFreezeWeeks] = useState(1);
  const [selectedRenewMonths, setSelectedRenewMonths] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [feedback, setFeedback] = useState('Ready when you are.');
  const modalProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadDashboard = async () => {
      const [
        currentMember,
        currentMembership,
        membershipStatus,
        membershipPlans,
        notifications,
        activityDays,
        vouchers,
      ] = await Promise.all([
        memberService.getCurrentMember(),
        membershipService.getCurrentMembership(),
        membershipService.getMembershipStatus(),
        membershipService.getMembershipPlans(),
        notificationService.getNotifications(),
        activityService.getGymActivitySchedule(),
        voucherService.getPendingVouchers(),
      ]);

      setMember(currentMember);
      setMembership(currentMembership);
      setStatus(membershipStatus);
      setPlans(membershipPlans);
      setNotification(notifications.find((item) => !item.isRead) ?? notifications[0]);
      setActivitySchedule(activityDays);
      setSelectedActivityDayId(activityDays[0]?.id ?? '');
      setPendingVouchers(vouchers);
      setIsLoading(false);
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    if (!membershipModal) {
      return;
    }

    modalProgress.setValue(0);
    Animated.spring(modalProgress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  }, [membershipModal, modalProgress]);

  const daysRemaining = useMemo(
    () => calculateDaysRemaining(membership?.endDate),
    [membership?.endDate],
  );
  const countdownColor = getCountdownColor(daysRemaining, status);
  const statusTone = getStatusTone(status);
  const plan = plans.find((item) => item.id === membership?.planId);
  const isFrozen = status === 'Frozen';
  const canShowQr = status === 'Active';
  const expiryDate = formatDate(membership?.endDate);
  const memberInitials = `${member?.firstName?.slice(0, 1) ?? 'M'}${
    member?.lastName?.slice(0, 1) ?? 'G'
  }`;
  const selectedActivityDay =
    activitySchedule.find((item) => item.id === selectedActivityDayId) ??
    activitySchedule[0];
  const maxActivityCount = Math.max(
    ...(selectedActivityDay?.levels.map((item) => item.count) ?? [1]),
    1,
  );
  const selectedRenewPlan =
    plans.find((item) => item.durationInMonths === selectedRenewMonths) ??
    plans[0];
  const selectedRenewAmount =
    selectedRenewPlan?.price ?? selectedRenewMonths * 49;
  const selectedFreezeAmount = selectedFreezeWeeks * weeklyFreezePrice;

  const refreshPendingVouchers = async () => {
    const vouchers = await voucherService.getPendingVouchers();

    setPendingVouchers(vouchers);
  };

  const closeModal = () => {
    Animated.timing(modalProgress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setMembershipModal(undefined));
  };

  const handleShowQr = async () => {
    if (!canShowQr) {
      setFeedback('QR access unlocks when your membership is Active.');
      return;
    }

    const qrCode = await membershipService.showQRCode();

    setFeedback(
      qrCode ? `QR ready: ${qrCode}` : 'QR is available only for active memberships.',
    );
  };

  const handleCreateFreezeVoucher = async (paymentMode: PaymentMode) => {
    setIsCreatingVoucher(true);

    try {
      const voucher = await voucherService.createMembershipFreezeVoucher(
        selectedFreezeWeeks,
        selectedFreezeAmount,
        paymentMode,
      );

      if (paymentMode === 'Pay with Card') {
        const updatedMembership = await membershipService.freezeMembership();

        setMembership(updatedMembership);
        setStatus(updatedMembership.status);
      }

      await refreshPendingVouchers();
      setFeedback(
        paymentMode === 'Pay at Counter'
          ? `Pending voucher created: ${voucher.id}.`
          : `Card payment placeholder completed: ${voucher.id}.`,
      );
      closeModal();
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const handleUnfreeze = async () => {
    const updatedMembership = await membershipService.unfreezeMembership();

    setMembership(updatedMembership);
    setStatus(updatedMembership.status);
    setFeedback('Membership is marked active again.');
  };

  const handleCreateRenewVoucher = async (paymentMode: PaymentMode) => {
    setIsCreatingVoucher(true);

    try {
      const voucher = await voucherService.createMembershipRenewalVoucher(
        selectedRenewMonths,
        selectedRenewAmount,
        paymentMode,
      );

      if (paymentMode === 'Pay with Card' && selectedRenewPlan) {
        const updatedMembership = await membershipService.activateMembership(
          selectedRenewPlan.id,
        );

        setMembership(updatedMembership);
        setStatus(updatedMembership.status);
      }

      await refreshPendingVouchers();
      setFeedback(
        paymentMode === 'Pay at Counter'
          ? `Pending renewal voucher created: ${voucher.id}.`
          : `Card payment placeholder completed: ${voucher.id}.`,
      );
      closeModal();
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading member dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const modalScale = modalProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.kicker}>Welcome back</Text>
              <Text style={styles.title}>{member?.firstName ?? 'Member'}</Text>
              <Text style={styles.subtitle}>
                Premium access for today's training.
              </Text>
            </View>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>{memberInitials}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.statusBadgeOnRed}>
              <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
              <Text style={styles.statusTextOnRed}>{status ?? 'Pending'}</Text>
            </View>
            <Text style={styles.heroExpiryText}>
              {plan?.name ?? 'Current Membership'}
            </Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Membership progress</Text>
              <Text style={styles.cardTitle}>Access window</Text>
            </View>
            <View style={styles.expiryPill}>
              <Text style={styles.expiryPillLabel}>Expires</Text>
              <Text style={styles.expiryPillText}>{expiryDate}</Text>
            </View>
          </View>

          <View style={styles.progressCenter}>
            <View
              style={[
                styles.progressRing,
                {
                  borderColor: countdownColor,
                  shadowColor: countdownColor,
                },
              ]}>
              <View style={styles.progressInner}>
                <Text style={styles.daysNumber}>{daysRemaining}</Text>
                <Text style={styles.daysLabel}>Days Remaining</Text>
              </View>
            </View>
          </View>

          <View style={styles.statusWidget}>
            <Text style={styles.statusWidgetLabel}>Membership Status</Text>
            <View style={styles.statusWidgetRow}>
              {(['Active', 'Frozen', 'Expired', 'Pending Approval'] as MembershipStatus[]).map(
                (item) => {
                  const isSelected = status === item;
                  const tone = getStatusTone(item);

                  return (
                    <View
                      key={item}
                      style={[
                        styles.statusChip,
                        isSelected && {
                          borderColor: tone,
                          backgroundColor: `${tone}18`,
                        },
                      ]}>
                      <View
                        style={[
                          styles.statusChipDot,
                          { backgroundColor: isSelected ? tone : '#D0D5DD' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusChipText,
                          isSelected && { color: textColor },
                        ]}>
                        {item}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>
          </View>
        </View>

        <View style={styles.quickActionsCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Quick actions</Text>
              <Text style={styles.sectionTitle}>Member tools</Text>
            </View>
            <Text style={styles.sectionHint}>Phase 1</Text>
          </View>

          <View style={styles.actionGrid}>
            <Pressable
              disabled={!canShowQr}
              onPress={handleShowQr}
              style={({ pressed }) => [
                styles.actionCard,
                !canShowQr && styles.actionCardDisabled,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.actionIcon}>QR</Text>
              <Text style={styles.actionTitle}>Show QR</Text>
              <Text style={styles.actionSubtitle}>
                {canShowQr ? 'Counter access ready' : 'Requires active status'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (isFrozen) {
                  handleUnfreeze();
                  return;
                }

                setSelectedFreezeWeeks(1);
                setMembershipModal('freeze');
              }}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.actionIcon}>{isFrozen ? 'ON' : 'FR'}</Text>
              <Text style={styles.actionTitle}>
                {isFrozen ? 'Unfreeze' : 'Freeze'}
              </Text>
              <Text style={styles.actionSubtitle}>
                {isFrozen ? 'Resume access flow' : '$10 per week'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSelectedRenewMonths(1);
                setMembershipModal('renew');
              }}
              style={({ pressed }) => [
                styles.actionCard,
                styles.actionCardPrimary,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.actionIconPrimary}>RN</Text>
              <Text style={styles.actionTitlePrimary}>Renew</Text>
              <Text style={styles.actionSubtitlePrimary}>Extend membership</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Gym Activity</Text>
              <Text style={styles.sectionTitle}>Plan your visit</Text>
            </View>
            <Text style={styles.sectionHint}>
              {selectedActivityDay?.scheduleLabel ?? 'Today'}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daySelector}>
            {activitySchedule.map((item) => {
              const isSelected = item.id === selectedActivityDay?.id;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedActivityDayId(item.id)}
                  style={[
                    styles.dayChip,
                    isSelected && styles.dayChipSelected,
                  ]}>
                  <Text
                    style={[
                      styles.dayChipText,
                      isSelected && styles.dayChipTextSelected,
                    ]}>
                    {item.dayLabel.slice(0, 3)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.activityChart}>
            {selectedActivityDay?.levels.map((item) => {
              const barHeight = Math.max(34, (item.count / maxActivityCount) * 160);

              return (
                <View key={item.id} style={styles.activityColumn}>
                  <Text style={styles.activityCount}>{item.count}</Text>
                  <View style={styles.activityTrack}>
                    <View
                      style={[
                        styles.activityFill,
                        {
                          height: barHeight,
                          backgroundColor: getActivityColor(item.intensity),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.activityLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendText}>Low</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Medium</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
              <Text style={styles.legendText}>High</Text>
            </View>
          </View>
        </View>

        {pendingVouchers.length > 0 && (
          <View style={styles.voucherSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.cardLabel}>Pending vouchers</Text>
                <Text style={styles.sectionTitle}>Pay at counter</Text>
              </View>
              <Text style={styles.sectionHint}>{pendingVouchers.length} open</Text>
            </View>

            {pendingVouchers.slice(0, 2).map((voucher) => (
              <View key={voucher.id} style={styles.voucherCard}>
                <View style={styles.voucherTear} />
                <View style={styles.voucherContent}>
                  <Text style={styles.voucherType}>{voucher.type}</Text>
                  <Text style={styles.voucherDescription}>{voucher.description}</Text>
                  <Text style={styles.voucherMeta}>
                    {formatVoucherDate(voucher.date)} - {voucher.id}
                  </Text>
                </View>
                <View style={styles.voucherAmountBlock}>
                  <Text style={styles.voucherAmount}>
                    ${voucher.amount.toFixed(2)}
                  </Text>
                  <Text
                    style={[
                      styles.voucherStatus,
                      { color: getVoucherStatusColor(voucher.status) },
                    ]}>
                    {voucher.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.cardLabel}>Latest update</Text>
            <Text style={styles.infoTitle}>
              {notification?.title ?? 'No notifications yet'}
            </Text>
            <Text style={styles.infoBody}>
              {notification?.message ?? 'Important membership updates will appear here.'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardLabel}>Action status</Text>
            <Text style={styles.infoBody}>{feedback}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(membershipModal)} animationType="none">
        <Animated.View style={[styles.modalOverlay, { opacity: modalProgress }]}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [{ scale: modalScale }],
              },
            ]}>
            <View style={styles.modalHandle} />

            {membershipModal === 'freeze' ? (
              <>
                <Text style={styles.modalKicker}>Freeze Membership</Text>
                <Text style={styles.modalTitle}>Pause access with a voucher.</Text>
                <Text style={styles.modalBody}>
                  Select duration. Pay at counter creates a pending voucher;
                  card payment is a Phase 1 placeholder.
                </Text>

                <View style={styles.optionGrid}>
                  {freezeOptions.map((weeks) => {
                    const isSelected = selectedFreezeWeeks === weeks;

                    return (
                      <Pressable
                        key={weeks}
                        onPress={() => setSelectedFreezeWeeks(weeks)}
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                        ]}>
                        <Text
                          style={[
                            styles.optionTitle,
                            isSelected && styles.optionTitleSelected,
                          ]}>
                          {weeks} week{weeks > 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.optionPrice}>
                          ${weeks * weeklyFreezePrice}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalTotal}>
                  Total: ${selectedFreezeAmount.toFixed(2)}
                </Text>

                <View style={styles.modalActionRow}>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={() => handleCreateFreezeVoucher('Pay at Counter')}
                    style={({ pressed }) => [
                      styles.modalSecondaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalSecondaryText}>Pay at Counter</Text>
                  </Pressable>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={() => handleCreateFreezeVoucher('Pay with Card')}
                    style={({ pressed }) => [
                      styles.modalPrimaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalPrimaryText}>Pay with Card</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalKicker}>Renew Membership</Text>
                <Text style={styles.modalTitle}>Choose your next access pass.</Text>
                <Text style={styles.modalBody}>
                  Pay at counter creates a pending renewal voucher. Card payment
                  remains a frontend placeholder.
                </Text>

                <View style={styles.optionGrid}>
                  {renewOptions.map((months) => {
                    const matchingPlan = plans.find(
                      (item) => item.durationInMonths === months,
                    );
                    const amount = matchingPlan?.price ?? months * 49;
                    const isSelected = selectedRenewMonths === months;

                    return (
                      <Pressable
                        key={months}
                        onPress={() => setSelectedRenewMonths(months)}
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                        ]}>
                        <Text
                          style={[
                            styles.optionTitle,
                            isSelected && styles.optionTitleSelected,
                          ]}>
                          {months} Month{months > 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.optionPrice}>${amount}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalTotal}>
                  Total: ${selectedRenewAmount.toFixed(2)}
                </Text>

                <View style={styles.modalActionRow}>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={() => handleCreateRenewVoucher('Pay at Counter')}
                    style={({ pressed }) => [
                      styles.modalSecondaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalSecondaryText}>Pay at Counter</Text>
                  </Pressable>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={() => handleCreateRenewVoucher('Pay with Card')}
                    style={({ pressed }) => [
                      styles.modalPrimaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalPrimaryText}>Pay with Card</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 108,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: accentColor,
    padding: 20,
    marginBottom: 16,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 7,
  },
  heroGlow: {
    position: 'absolute',
    right: -72,
    top: -78,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroTextBlock: {
    flex: 1,
  },
  kicker: {
    color: '#F7D6DC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4,
  },
  subtitle: {
    color: '#FCE7EA',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  avatarBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  heroMetaRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.16)',
    marginTop: 18,
    paddingTop: 14,
  },
  statusBadgeOnRed: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTextOnRed: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  heroExpiryText: {
    flex: 1,
    color: '#FCE7EA',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  progressCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 28,
    backgroundColor: surfaceColor,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  cardLabel: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: textColor,
    fontSize: 20,
    fontWeight: '900',
  },
  expiryPill: {
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 18,
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  expiryPillLabel: {
    color: '#8E6670',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  expiryPillText: {
    color: wineColor,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  progressCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  progressRing: {
    width: 214,
    height: 214,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 12,
    borderRadius: 107,
    backgroundColor: '#FFF3F5',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 8,
  },
  progressInner: {
    width: 164,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 82,
    backgroundColor: '#FFFFFF',
  },
  daysNumber: {
    color: textColor,
    fontSize: 68,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 76,
  },
  daysLabel: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  statusWidget: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 22,
    backgroundColor: '#FFF8F7',
    padding: 14,
    marginTop: 18,
  },
  statusWidgetLabel: {
    color: '#8E6670',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  statusWidgetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
  },
  statusChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusChipText: {
    color: '#8E6670',
    fontSize: 11,
    fontWeight: '900',
  },
  quickActionsCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionHint: {
    color: '#8E6670',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    minHeight: 122,
    flex: 1,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 13,
  },
  actionCardPrimary: {
    borderColor: 'transparent',
    backgroundColor: accentColor,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 5,
  },
  actionCardDisabled: {
    opacity: 0.48,
  },
  actionIcon: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#FFF1F3',
    color: accentColor,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  actionIconPrimary: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  actionTitle: {
    color: textColor,
    fontSize: 14,
    fontWeight: '900',
  },
  actionTitlePrimary: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  actionSubtitle: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  actionSubtitlePrimary: {
    color: '#FCE7EA',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  activityCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  daySelector: {
    gap: 8,
    paddingBottom: 14,
  },
  dayChip: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 999,
    backgroundColor: '#FFF8F7',
    paddingHorizontal: 14,
  },
  dayChipSelected: {
    borderColor: accentColor,
    backgroundColor: accentColor,
  },
  dayChipText: {
    color: wineColor,
    fontSize: 12,
    fontWeight: '900',
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
  activityChart: {
    height: 220,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
  },
  activityCount: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '900',
  },
  activityTrack: {
    width: '100%',
    maxWidth: 32,
    height: 160,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#F3E2E5',
  },
  activityFill: {
    width: '100%',
    borderRadius: 999,
  },
  activityLabel: {
    color: '#8E6670',
    fontSize: 10,
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(177, 18, 38, 0.1)',
    marginTop: 16,
    paddingTop: 13,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
  },
  voucherSection: {
    marginBottom: 16,
  },
  voucherCard: {
    minHeight: 104,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  voucherTear: {
    width: 10,
    backgroundColor: accentColor,
  },
  voucherContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 15,
  },
  voucherType: {
    color: textColor,
    fontSize: 15,
    fontWeight: '900',
  },
  voucherDescription: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 5,
  },
  voucherMeta: {
    color: '#8E6670',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 7,
  },
  voucherAmountBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 14,
  },
  voucherAmount: {
    color: textColor,
    fontSize: 17,
    fontWeight: '900',
  },
  voucherStatus: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  infoGrid: {
    gap: 12,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 22,
    backgroundColor: surfaceColor,
    padding: 18,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  infoTitle: {
    color: textColor,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  infoBody: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  buttonPressed: {
    opacity: 0.76,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(24, 26, 32, 0.42)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 14,
  },
  modalHandle: {
    width: 48,
    height: 5,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: '#E8D4D8',
    marginBottom: 18,
  },
  modalKicker: {
    color: accentColor,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: textColor,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  modalBody: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  optionCard: {
    minHeight: 72,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 18,
    backgroundColor: '#FFF8F7',
    padding: 14,
  },
  optionCardSelected: {
    borderColor: accentColor,
    backgroundColor: '#FFF1F3',
  },
  optionTitle: {
    color: textColor,
    fontSize: 14,
    fontWeight: '900',
  },
  optionTitleSelected: {
    color: accentColor,
  },
  optionPrice: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  modalTotal: {
    color: wineColor,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'right',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalSecondaryButton: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.24)',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  modalSecondaryText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '900',
  },
  modalPrimaryButton: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 5,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
