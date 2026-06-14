import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import {
  activityService,
  avatarService,
  classService,
  journeyService,
  memberService,
  membershipService,
  notificationService,
  voucherService,
} from '@/services';
import type {
  AppNotification,
  GymActivityDay,
  Member,
  Membership,
  MembershipPlan,
  MembershipStatus,
  Voucher,
  VoucherStatus,
} from '@/types';

const accentColor = premiumColors.red;
const wineColor = premiumColors.redBright;
const backgroundColor = premiumColors.background;
const surfaceColor = premiumColors.surface;
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;
const voucherStatuses: VoucherStatus[] = ['Confirmed', 'Pending', 'Canceled'];
const weeklyFreezePrice = 10;
const maxRenewMonths = 12;
const minRenewMonths = 1;

type MembershipModal = 'freeze' | 'renew';

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

function calculateMembershipProgress(membership?: Membership) {
  if (!membership?.startDate || !membership.endDate) {
    return 1;
  }

  const startTime = new Date(membership.startDate).getTime();
  const endTime = new Date(membership.endDate).getTime();
  const now = Date.now();

  if (
    Number.isNaN(startTime) ||
    Number.isNaN(endTime) ||
    endTime <= startTime
  ) {
    return 1;
  }

  return Math.min(1, Math.max(0, (endTime - now) / (endTime - startTime)));
}

function getCountdownColor(progress: number, status?: MembershipStatus) {
  if (status === 'Frozen') {
    return '#F59E0B';
  }

  if (status === 'Expired' || status === 'Suspended' || progress <= 0.04) {
    return '#7F1D1D';
  }

  if (progress <= 0.12) {
    return '#DC2626';
  }

  if (progress <= 0.24) {
    return '#F97316';
  }

  if (progress <= 0.42 || status === 'Pending Approval') {
    return '#F59E0B';
  }

  if (progress <= 0.62) {
    return '#A3E635';
  }

  return '#16A34A';
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

function getActivityColor(count: number) {
  if (count >= 85) {
    return '#EF233C';
  }

  if (count >= 70) {
    return '#FF7A1A';
  }

  if (count >= 55) {
    return '#FFD166';
  }

  if (count >= 35) {
    return '#8DE05F';
  }

  return '#20C997';
}

function getVoucherStatusColor(status: VoucherStatus) {
  if (status === 'Confirmed') {
    return '#22C55E';
  }

  if (status === 'Canceled') {
    return '#8B95A5';
  }

  return '#F59E0B';
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

function getRenewalAmount(months: number, plans: MembershipPlan[]) {
  const exactPlan = plans.find((plan) => plan.durationInMonths === months);

  if (exactPlan) {
    return exactPlan.price;
  }

  const monthlyPlan = plans.find((plan) => plan.durationInMonths === 1);
  const monthlyRate = monthlyPlan?.price ?? 49;

  return monthlyRate * months;
}

export default function HomeScreen() {
  const router = useRouter();
  const [member, setMember] = useState<Member>();
  const [membership, setMembership] = useState<Membership>();
  const [status, setStatus] = useState<MembershipStatus>();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [notification, setNotification] = useState<AppNotification>();
  const [activitySchedule, setActivitySchedule] = useState<GymActivityDay[]>([]);
  const [selectedActivityDayId, setSelectedActivityDayId] = useState('');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedVoucherStatus, setSelectedVoucherStatus] =
    useState<VoucherStatus>('Confirmed');
  const [membershipModal, setMembershipModal] = useState<MembershipModal>();
  const [selectedFreezeWeeks, setSelectedFreezeWeeks] = useState(1);
  const [selectedRenewMonths, setSelectedRenewMonths] = useState(1);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isVisitPromptVisible, setIsVisitPromptVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [feedback, setFeedback] = useState('Ready when you are.');
  const [toastMessage, setToastMessage] = useState('');
  const modalProgress = useRef(new Animated.Value(0)).current;
  const sheetPanY = useRef(new Animated.Value(0)).current;
  const qrPanY = useRef(new Animated.Value(0)).current;
  const toastProgress = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        sheetPanY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 64 || gestureState.vy > 0.8) {
          closeMembershipModal();
          return;
        }

        Animated.spring(sheetPanY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 90,
        }).start();
      },
    }),
  ).current;
  const qrPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        qrPanY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 64 || gestureState.vy > 0.8) {
          qrPanY.setValue(0);
          setIsQrModalVisible(false);
          setIsVisitPromptVisible(true);
          return;
        }

        Animated.spring(qrPanY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 90,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    const loadDashboard = async () => {
      const [
        currentMember,
        currentMembership,
        membershipStatus,
        membershipPlans,
        notifications,
        activityDays,
        currentVouchers,
        classUpdate,
      ] = await Promise.all([
        memberService.getCurrentMember(),
        membershipService.getCurrentMembership(),
        membershipService.getMembershipStatus(),
        membershipService.getMembershipPlans(),
        notificationService.getNotifications(),
        activityService.getGymActivitySchedule(),
        voucherService.getVouchers(),
        classService.getLatestClassUpdate(),
      ]);

      setMember(currentMember);
      setMembership(currentMembership);
      setStatus(membershipStatus);
      setPlans(membershipPlans);
      setNotification(
        classUpdate ?? notifications.find((item) => !item.isRead) ?? notifications[0],
      );
      setActivitySchedule(activityDays);
      setSelectedActivityDayId(activityDays[0]?.id ?? '');
      setVouchers(currentVouchers);
      setIsLoading(false);
    };

    loadDashboard();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshLatestClassUpdate = async () => {
        const classUpdate = await classService.getLatestClassUpdate();

        if (isActive && classUpdate) {
          setNotification(classUpdate);
        }
      };

      refreshLatestClassUpdate();

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!membershipModal) {
      return;
    }

    modalProgress.setValue(0);
    sheetPanY.setValue(0);
    Animated.spring(modalProgress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  }, [membershipModal, modalProgress]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const daysRemaining = useMemo(
    () => calculateDaysRemaining(membership?.endDate),
    [membership?.endDate],
  );
  const membershipProgress = calculateMembershipProgress(membership);
  const countdownColor = getCountdownColor(membershipProgress, status);
  const statusTone = getStatusTone(status);
  const plan = plans.find((item) => item.id === membership?.planId);
  const progressSegmentCount = 36;
  const depletedProgressSegments = Math.round(
    progressSegmentCount * (1 - membershipProgress),
  );
  const isFrozen = status === 'Frozen';
  const canShowQr = status === 'Active';
  const expiryDate = formatDate(membership?.endDate);
  const memberAvatar = avatarService.getMemberAvatarDisplay(member);
  const selectedActivityDay =
    activitySchedule.find((item) => item.id === selectedActivityDayId) ??
    activitySchedule[0];
  const selectedRenewAmount = getRenewalAmount(selectedRenewMonths, plans);
  const selectedFreezeAmount = selectedFreezeWeeks * weeklyFreezePrice;
  const visibleVouchers = vouchers.filter(
    (voucher) => voucher.status === selectedVoucherStatus,
  );

  const refreshVouchers = async () => {
    const currentVouchers = await voucherService.getVouchers();

    setVouchers(currentVouchers);
  };

  const closeMembershipModal = () => {
    Animated.timing(modalProgress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      sheetPanY.setValue(0);
      setMembershipModal(undefined);
    });
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToastMessage(message);
    toastProgress.setValue(0);
    Animated.spring(toastProgress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastProgress, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setToastMessage(''));
    }, 2200);
  };

  const handleShowQr = async () => {
    if (!canShowQr) {
      setFeedback('QR access unlocks when your membership is Active.');
      return;
    }

    const qrCode = await membershipService.showQRCode();

    if (!qrCode) {
      setFeedback('QR is available only for active memberships.');
      return;
    }

    setQrCodeValue(qrCode);
    qrPanY.setValue(0);
    setIsQrModalVisible(true);
    setFeedback('QR ready for entry scan.');
  };

  const handleCloseQr = () => {
    qrPanY.setValue(0);
    setIsQrModalVisible(false);
    setIsVisitPromptVisible(true);
  };

  const handleAddTodayVisit = async () => {
    await journeyService.markAttendanceDay(new Date().toISOString(), true);
    setIsVisitPromptVisible(false);
    setFeedback('Today was added as a gym visit.');
  };

  const handleCreateFreezeVoucher = async () => {
    setIsCreatingVoucher(true);

    try {
      const voucher = await voucherService.createMembershipFreezeVoucher(
        selectedFreezeWeeks,
        selectedFreezeAmount,
      );

      await refreshVouchers();
      setFeedback(
        `${voucher.id} created. Complete the counter confirmation at the gym.`,
      );
      showToast('Voucher created');
      closeMembershipModal();
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

  const handleCreateRenewVoucher = async () => {
    setIsCreatingVoucher(true);

    try {
      const voucher = await voucherService.createMembershipRenewalVoucher(
        selectedRenewMonths,
        selectedRenewAmount,
      );

      await refreshVouchers();
      setFeedback(
        `${voucher.id} created. Complete the counter confirmation at the gym.`,
      );
      showToast('Voucher created');
      closeMembershipModal();
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const handleCancelVoucher = async (voucherId: string) => {
    const canceledVoucher = await voucherService.cancelVoucher(voucherId);

    if (!canceledVoucher) {
      setFeedback('Voucher could not be canceled.');
      return;
    }

    await refreshVouchers();
    setSelectedVoucherStatus('Canceled');
    setFeedback(`${canceledVoucher.id} was canceled.`);
  };

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading member dashboard...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  const modalScale = modalProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const toastTranslateY = toastProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.kicker}>Welcome back</Text>
              <Text style={styles.title}>{member?.firstName ?? 'Member'}</Text>
              <Text style={styles.subtitle}>Consistency is key.</Text>
            </View>
            <View style={styles.avatarBadge}>
              {memberAvatar.imageUri ? (
                <Image
                  source={{ uri: memberAvatar.imageUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{memberAvatar.fallbackLabel}</Text>
              )}
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
              <Text style={styles.cardLabel}>Membership</Text>
              <Text style={styles.cardTitle}>Days Remaining</Text>
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
                  shadowColor: countdownColor,
                },
              ]}>
              {Array.from({ length: progressSegmentCount }).map((_, index) => {
                const isActive = index >= depletedProgressSegments;
                const angle =
                  (index / progressSegmentCount) * Math.PI * 2 - Math.PI / 2;
                const segmentRadius = 96;

                return (
                  <View
                    key={index}
                    style={[
                      styles.progressSegment,
                      {
                        backgroundColor: isActive
                          ? countdownColor
                          : 'rgba(177, 18, 38, 0.12)',
                        left: 107 + Math.cos(angle) * segmentRadius - 3,
                        opacity: isActive ? 1 : 0.34,
                        top: 107 + Math.sin(angle) * segmentRadius - 9,
                        transform: [
                          { rotate: `${(angle * 180) / Math.PI + 90}deg` },
                        ],
                      },
                    ]}
                  />
                );
              })}
              <View style={styles.progressInner}>
                <Text style={styles.daysNumber}>{daysRemaining}</Text>
                <Text style={styles.daysLabel}>Days Remaining</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Quick actions</Text>
              <Text style={styles.sectionTitle}>Membership tools</Text>
            </View>
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
              <Text style={styles.actionTitle}>Open QR</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (isFrozen) {
                  setSelectedFreezeWeeks(1);
                  setMembershipModal('freeze');
                  return;
                }

                setSelectedFreezeWeeks(1);
                setMembershipModal('freeze');
              }}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.actionTitle}>Freeze</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSelectedRenewMonths(1);
                setMembershipModal('renew');
              }}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.actionTitle}>Renew/Extend</Text>
            </Pressable>
          </View>

          {isFrozen && (
            <Pressable
              onPress={handleUnfreeze}
              style={({ pressed }) => [
                styles.unfreezeButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.unfreezeButtonText}>Unfreeze Membership</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => router.push('/machine-guide')}
          style={({ pressed }) => [
            styles.machineGuideCard,
            pressed && styles.buttonPressed,
          ]}>
          <View style={styles.machineGuideCopy}>
            <Text style={styles.cardLabel}>Machine Guide</Text>
            <Text style={styles.machineGuideTitle}>Find the right equipment</Text>
            <Text style={styles.machineGuideBody}>
              Choose a muscle group and open setup cues for each machine.
            </Text>
          </View>
          <Text style={styles.machineGuideAction}>Open</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/help')}
          style={({ pressed }) => [
            styles.machineGuideCard,
            pressed && styles.buttonPressed,
          ]}>
          <View style={styles.machineGuideCopy}>
            <Text style={styles.cardLabel}>Help</Text>
            <Text style={styles.machineGuideTitle}>How to use the app</Text>
            <Text style={styles.machineGuideBody}>
              Open instructions, support details, and the AI assistant.
            </Text>
          </View>
          <Text style={styles.machineGuideAction}>Open</Text>
        </Pressable>

        <View style={styles.activityCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Gym Activity</Text>
              <Text style={styles.sectionTitle}>Crowd level</Text>
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityChart}>
            {selectedActivityDay?.levels.map((item) => (
              <View key={item.id} style={styles.activityColumn}>
                <Text style={styles.activityValue}>{item.count}%</Text>
                <View style={styles.activityTrack}>
                  <View
                    style={[
                      styles.activityFill,
                      {
                        height: `${Math.max(18, item.count)}%`,
                        backgroundColor: getActivityColor(item.count),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.activityLabel}>{item.label}</Text>
              </View>
            ))}
          </ScrollView>

        </View>

        <View style={styles.voucherSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Vouchers</Text>
            </View>
            <Text style={styles.sectionHint}>{vouchers.length} total</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.voucherTabs}>
            {voucherStatuses.map((voucherStatus) => {
              const isSelected = selectedVoucherStatus === voucherStatus;
              const count = vouchers.filter(
                (voucher) => voucher.status === voucherStatus,
              ).length;

              return (
                <Pressable
                  key={voucherStatus}
                  onPress={() => setSelectedVoucherStatus(voucherStatus)}
                  style={[
                    styles.voucherTab,
                    isSelected && styles.voucherTabSelected,
                  ]}>
                  <View
                    style={[
                      styles.voucherTabDot,
                      { backgroundColor: getVoucherStatusColor(voucherStatus) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.voucherTabText,
                      isSelected && styles.voucherTabTextSelected,
                    ]}>
                    {voucherStatus}
                  </Text>
                  <Text
                    style={[
                      styles.voucherTabCount,
                      isSelected && styles.voucherTabCountSelected,
                    ]}>
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {visibleVouchers.length === 0 ? (
            <Text style={styles.emptyVoucherText}>
              No {selectedVoucherStatus.toLowerCase()} vouchers.
            </Text>
          ) : (
            visibleVouchers.map((voucher) => {
              const canCancelVoucher =
                voucher.status === 'Pending' &&
                (voucher.type === 'Membership Freeze' ||
                  voucher.type === 'Membership Renewal');

              return (
                <View key={voucher.id} style={styles.voucherCard}>
                  <View style={styles.voucherTear} />
                  <View style={styles.voucherContent}>
                    <Text style={styles.voucherType}>{voucher.type}</Text>
                    <Text style={styles.voucherDescription}>
                      {voucher.description}
                    </Text>
                    <Text style={styles.voucherMeta}>
                      {formatVoucherDate(voucher.date)} - {voucher.id}
                    </Text>
                    {canCancelVoucher && (
                      <Pressable
                        onPress={() => handleCancelVoucher(voucher.id)}
                        style={({ pressed }) => [
                          styles.voucherCancelButton,
                          pressed && styles.buttonPressed,
                        ]}>
                        <Text style={styles.voucherCancelText}>Cancel request</Text>
                      </Pressable>
                    )}
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
              );
            })
          )}
        </View>

        <View style={styles.updatesHeader}>
          <Text style={styles.sectionTitle}>Updates</Text>
        </View>
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.cardLabel}>Latest update</Text>
            <Text style={styles.infoTitle}>
              {notification?.title ?? 'No notifications yet'}
            </Text>
            <Text style={styles.infoBody}>
              {feedback || notification?.message || 'Important membership updates will appear here.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {toastMessage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastProgress,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}

      <Modal transparent visible={Boolean(membershipModal)} animationType="none">
        <Animated.View style={[styles.modalOverlay, { opacity: modalProgress }]}>
          <Pressable style={styles.modalBackdrop} onPress={closeMembershipModal} />
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [{ translateY: sheetPanY }, { scale: modalScale }],
              },
            ]}
            {...sheetPanResponder.panHandlers}>
            <Pressable
              onPress={closeMembershipModal}
              style={styles.modalHandle}
              accessibilityLabel="Close sheet"
              accessibilityRole="button"
              {...sheetPanResponder.panHandlers}
            />

            {membershipModal === 'freeze' ? (
              <>
                <Text style={styles.modalKicker}>
                  {isFrozen ? 'Extend Freeze' : 'Freeze Membership'}
                </Text>
                <Text style={styles.modalTitle}>
                  {isFrozen ? 'Extend the current freeze.' : 'Request a membership freeze.'}
                </Text>
                <Text style={styles.modalBody}>
                  Freeze pricing is $10/week. Requests are held for cash
                  confirmation at the counter.
                </Text>

                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() =>
                      setSelectedFreezeWeeks((value) => Math.max(1, value - 1))
                    }
                    style={styles.stepperButton}>
                    <Text style={styles.stepperButtonText}>-</Text>
                  </Pressable>
                  <View style={styles.stepperValueCard}>
                    <Text style={styles.stepperValue}>{selectedFreezeWeeks}</Text>
                    <Text style={styles.stepperLabel}>
                      week{selectedFreezeWeeks > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      setSelectedFreezeWeeks((value) => Math.min(12, value + 1))
                    }
                    style={styles.stepperButton}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>

                <Text style={styles.modalTotal}>
                  Total: ${selectedFreezeAmount.toFixed(2)}
                </Text>

                <View style={styles.modalActionRow}>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={() => closeMembershipModal()}
                    style={({ pressed }) => [
                      styles.modalSecondaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalSecondaryText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={handleCreateFreezeVoucher}
                    style={({ pressed }) => [
                      styles.modalPrimaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalPrimaryText}>Create voucher</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalKicker}>Renew / Extend Membership</Text>
                <Text style={styles.modalTitle}>Choose any duration.</Text>
                <Text style={styles.modalBody}>
                  Select 1 to 12 months. Pricing follows the available
                  membership plans.
                </Text>

                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() =>
                      setSelectedRenewMonths((value) =>
                        Math.max(minRenewMonths, value - 1),
                      )
                    }
                    style={styles.stepperButton}>
                    <Text style={styles.stepperButtonText}>-</Text>
                  </Pressable>
                  <View style={styles.stepperValueCard}>
                    <Text style={styles.stepperValue}>{selectedRenewMonths}</Text>
                    <Text style={styles.stepperLabel}>
                      month{selectedRenewMonths > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      setSelectedRenewMonths((value) =>
                        Math.min(maxRenewMonths, value + 1),
                      )
                    }
                    style={styles.stepperButton}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>

                <View style={styles.durationTrack}>
                  <View
                    style={[
                      styles.durationFill,
                      { width: `${(selectedRenewMonths / maxRenewMonths) * 100}%` },
                    ]}
                  />
                </View>

                <Text style={styles.modalTotal}>
                  Total: ${selectedRenewAmount.toFixed(2)}
                </Text>

                <View style={styles.modalActionRow}>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={() => closeMembershipModal()}
                    style={({ pressed }) => [
                      styles.modalSecondaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalSecondaryText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={handleCreateRenewVoucher}
                    style={({ pressed }) => [
                      styles.modalPrimaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalPrimaryText}>Create voucher</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      <Modal transparent visible={isQrModalVisible} animationType="fade">
        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.centerModalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseQr} />
          <Animated.View
            style={[
              styles.qrCard,
              {
                transform: [{ translateY: qrPanY }],
              },
            ]}
            {...qrPanResponder.panHandlers}>
            <Pressable
              onPress={handleCloseQr}
              style={styles.qrModalHandle}
              accessibilityLabel="Close QR"
              accessibilityRole="button"
              {...qrPanResponder.panHandlers}
            />
            <Pressable
              onPress={handleCloseQr}
              style={({ pressed }) => [
                styles.qrCloseButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityLabel="Close QR">
              <Text style={styles.qrCloseText}>X</Text>
            </Pressable>
            <Text style={styles.modalKicker}>Scan for entry</Text>
            <Text style={styles.modalTitle}>Marvel Gym QR</Text>
            <View style={styles.qrBox}>
              <Text style={styles.qrText}>QR</Text>
              <Text style={styles.qrCodeValue}>{qrCodeValue}</Text>
            </View>
            <Pressable
              onPress={handleCloseQr}
              style={({ pressed }) => [
                styles.qrPrimaryButton,
                pressed && styles.buttonPressed,
            ]}>
              <Text style={styles.modalPrimaryText}>Close</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </Modal>

      <Modal transparent visible={isVisitPromptVisible} animationType="fade">
        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.centerModalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsVisitPromptVisible(false)}
          />
          <View style={styles.qrCard}>
            <Text style={styles.modalKicker}>Journey</Text>
            <Text style={styles.modalTitle}>Add today as a gym visit?</Text>
            <Text style={styles.modalBody}>
              This updates your Journey calendar for consistency tracking.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                onPress={() => setIsVisitPromptVisible(false)}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.modalSecondaryText}>No</Text>
              </Pressable>
              <Pressable
                onPress={handleAddTodayVisit}
                style={({ pressed }) => [
                  styles.modalPrimaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.modalPrimaryText}>Yes</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 132,
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    backgroundColor: 'rgba(18, 20, 28, 0.72)',
    padding: 20,
    marginBottom: 16,
    ...premiumShadow,
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
    color: premiumColors.redBright,
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
    color: mutedColor,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 6,
  },
  avatarBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 18,
    paddingTop: 14,
  },
  statusBadgeOnRed: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  progressCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: surfaceColor,
    padding: 18,
    marginBottom: 16,
    ...premiumShadow,
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
    borderColor: premiumColors.border,
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  expiryPillLabel: {
    color: mutedColor,
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
    position: 'relative',
    overflow: 'visible',
    borderWidth: 0,
    borderRadius: 107,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 8,
  },
  progressSegment: {
    position: 'absolute',
    width: 6,
    height: 18,
    borderRadius: 999,
  },
  progressInner: {
    width: 164,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 82,
    backgroundColor: premiumColors.background,
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
  quickActionsCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 12,
    marginBottom: 16,
    ...premiumShadow,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionHint: {
    color: mutedColor,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  actionCard: {
    minHeight: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 15,
    backgroundColor: accentColor,
    paddingHorizontal: 8,
    paddingVertical: 9,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  actionCardDisabled: {
    opacity: 0.48,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
    textAlign: 'center',
  },
  unfreezeButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.24)',
    borderRadius: 18,
    backgroundColor: '#16A34A',
    marginTop: 12,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  unfreezeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  machineGuideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 24,
    backgroundColor: surfaceColor,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    ...premiumShadow,
  },
  machineGuideCopy: {
    flex: 1,
    paddingRight: 14,
  },
  machineGuideTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  machineGuideBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 5,
  },
  machineGuideAction: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: accentColor,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  activityCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    backgroundColor: '#101116',
    padding: 16,
    marginBottom: 16,
    ...premiumShadow,
  },
  daySelector: {
    gap: 8,
    paddingBottom: 14,
  },
  dayChip: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
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
    alignItems: 'flex-end',
    gap: 16,
    minHeight: 186,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(8, 10, 16, 0.64)',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    paddingRight: 16,
  },
  activityColumn: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  activityValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  activityTrack: {
    width: 30,
    height: 120,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
  },
  activityFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  activityLabel: {
    color: premiumColors.textMuted,
    fontSize: 10,
    fontWeight: '900',
  },
  voucherSection: {
    marginBottom: 16,
  },
  emptyVoucherText: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  voucherTabs: {
    gap: 8,
    paddingBottom: 12,
  },
  voucherTab: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 12,
  },
  voucherTabSelected: {
    borderColor: accentColor,
    backgroundColor: accentColor,
  },
  voucherTabDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  voucherTabText: {
    color: wineColor,
    fontSize: 12,
    fontWeight: '900',
  },
  voucherTabTextSelected: {
    color: '#FFFFFF',
  },
  voucherTabCount: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: wineColor,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  voucherTabCountSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    color: '#FFFFFF',
  },
  voucherCard: {
    minHeight: 104,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 24,
    backgroundColor: surfaceColor,
    marginBottom: 10,
    ...premiumShadow,
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
    color: premiumColors.textFaint,
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
  voucherCancelButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.2)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  voucherCancelText: {
    color: wineColor,
    fontSize: 11,
    fontWeight: '900',
  },
  updatesHeader: {
    marginBottom: 10,
  },
  infoGrid: {
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 22,
    backgroundColor: surfaceColor,
    padding: 18,
    ...premiumShadow,
  },
  infoTitle: {
    color: textColor,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  infoBody: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  buttonPressed: {
    opacity: 0.76,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    backgroundColor: 'rgba(38, 41, 50, 0.94)',
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...premiumShadow,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(24, 26, 32, 0.42)',
  },
  centerModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 26, 32, 0.42)',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    backgroundColor: premiumColors.surface,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 14,
  },
  qrCard: {
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 28,
    backgroundColor: premiumColors.surface,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
  },
  qrCloseButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: premiumColors.surfaceSoft,
  },
  qrCloseText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '900',
  },
  qrModalHandle: {
    width: 58,
    height: 6,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    marginBottom: 16,
  },
  modalHandle: {
    width: 54,
    height: 6,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 24,
    backgroundColor: premiumColors.surfaceSoft,
    marginTop: 18,
    padding: 10,
  },
  stepperButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  stepperButtonText: {
    color: accentColor,
    fontSize: 24,
    fontWeight: '900',
  },
  stepperValueCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 20,
    backgroundColor: premiumColors.background,
    paddingVertical: 12,
  },
  stepperValue: {
    color: textColor,
    fontSize: 30,
    fontWeight: '900',
  },
  stepperLabel: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  durationTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 16,
  },
  durationFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: accentColor,
  },
  modalTotal: {
    color: textColor,
    fontSize: 17,
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
    backgroundColor: premiumColors.surfaceSoft,
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
  qrPrimaryButton: {
    minHeight: 54,
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
  qrBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.16)',
    borderRadius: 24,
    backgroundColor: premiumColors.surfaceSoft,
    marginVertical: 18,
    padding: 18,
  },
  qrText: {
    color: accentColor,
    fontSize: 52,
    fontWeight: '900',
  },
  qrCodeValue: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
});
