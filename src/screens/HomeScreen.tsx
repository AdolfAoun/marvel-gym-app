import { LinearGradient } from 'expo-linear-gradient';
import type { Href } from 'expo-router';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlowingChips } from '@/components/GlowingChips';
import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import {
  premiumColors,
  premiumShadow,
} from '@/constants/premiumTheme';
import {
  activityService,
  classService,
  FREEZE_WEEKLY_PRICE,
  journeyService,
  memberService,
  membershipService,
  MONTHLY_MEMBERSHIP_PRICE,
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
  StudentVerificationStatus,
  Voucher,
} from '@/types';

const accentColor = premiumColors.red;
const wineColor = premiumColors.redBright;
const backgroundColor = premiumColors.background;
const surfaceColor = premiumColors.surface;
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;
const weeklyFreezePrice = FREEZE_WEEKLY_PRICE;
const maxRenewMonths = 12;
const minRenewMonths = 1;

const machineGuideSign = require('@/assets/images/marvel-logo-startup-sign-x.png');
const aiHelpSign = require('@/assets/images/marvel-logo-startup-sign-divide.png');
const obliqueSign = require('@/assets/images/marvel-logo-startup-sign-slash.png');
const homeHeroBackground = require('@/assets/images/headerhomeback.png');

// "What's New" carousel — latest gym updates (display only, no booking).
const whatsNewUpdates = [
  {
    id: 'pilates',
    tag: 'NEW CLASS',
    title: 'PILATES',
    desc: 'Reformer & mat flows are now on the timetable.',
    image:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80',
  },
  {
    id: 'spa',
    tag: 'NOW OPEN',
    title: 'SPA & RECOVERY',
    desc: 'Sauna, steam room and a new recovery lounge.',
    image:
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=80',
  },
];

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

// Remaining fraction (1 = just renewed, 0 = expired) based on the ORIGINAL
// plan duration and the membership start date. Plan duration comes from the
// plan data so the ring is correct even after the end date is extended.
function calculateMembershipProgress(
  membership?: Membership,
  planDurationDays?: number,
) {
  if (!membership?.startDate) {
    return 1;
  }

  const startTime = new Date(membership.startDate).getTime();

  if (Number.isNaN(startTime)) {
    return 1;
  }

  let durationMs: number;

  if (planDurationDays && planDurationDays > 0) {
    durationMs = planDurationDays * 86400000;
  } else if (membership.endDate) {
    const endTime = new Date(membership.endDate).getTime();

    if (Number.isNaN(endTime) || endTime <= startTime) {
      return 1;
    }

    durationMs = endTime - startTime;
  } else {
    return 1;
  }

  const remainingMs = durationMs - (Date.now() - startTime);

  return Math.min(1, Math.max(0, remainingMs / durationMs));
}

// Smooth green -> amber -> red gradient as the membership depletes. Hue runs
// from 140 (green, full) down to 0 (red, almost expired) for a clean blend.
function getCountdownColor(progress: number, status?: MembershipStatus) {
  if (status === 'Frozen' || status === 'Pending Approval') {
    return '#F59E0B';
  }

  if (status === 'Expired' || status === 'Suspended') {
    return '#7F1D1D';
  }

  const clamped = Math.min(1, Math.max(0, progress));
  const hue = Math.round(clamped * 140);

  return `hsl(${hue}, 72%, 45%)`;
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
    return '#FF1744';
  }

  if (count >= 70) {
    return '#FF3D00';
  }

  if (count >= 55) {
    return '#FFD60A';
  }

  if (count >= 35) {
    return '#76FF03';
  }

  return '#00E5FF';
}

function getCrowdLevelLabel(count: number) {
  if (count <= 40) {
    return 'Low';
  }

  if (count <= 60) {
    return 'Mid';
  }

  if (count <= 80) {
    return 'High';
  }

  return 'Peak';
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

export default function HomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  // Big swipeable feature cards (Machine Guide / AI Gym Help) snap one-per-view
  // like the "Most Popular" rail on the Classes tab.
  const featureCardWidth = Math.round(Math.min(windowWidth, 460) * 0.62);
  const featurePageW = featureCardWidth + 12;
  const featureScrollX = useRef(new Animated.Value(0)).current;

  // "What's New" looping autoplay carousel — mirrors the Classes "Most Popular"
  // widget (seamless loop + scaling pages + 3s autoplay), but display-only.
  const whatsNewPageW = windowWidth - 40; // matches the hero/days cards (content has 20px padding)
  const whatsNewScrollX = useRef(new Animated.Value(whatsNewPageW)).current;
  const whatsNewScrollRef = useRef<ScrollView>(null);
  const whatsNewIndexRef = useRef(1);
  const whatsNewAutoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const whatsNewResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (whatsNewUpdates.length <= 1) return;
    const start = () => {
      if (whatsNewAutoplayRef.current) clearInterval(whatsNewAutoplayRef.current);
      whatsNewAutoplayRef.current = setInterval(() => {
        const next = whatsNewIndexRef.current + 1;
        whatsNewIndexRef.current = next;
        whatsNewScrollRef.current?.scrollTo({ x: next * whatsNewPageW, animated: true });
      }, 3000);
    };
    start();
    return () => {
      if (whatsNewAutoplayRef.current) clearInterval(whatsNewAutoplayRef.current);
      if (whatsNewResumeRef.current) clearTimeout(whatsNewResumeRef.current);
    };
  }, [whatsNewPageW]);
  const [member, setMember] = useState<Member>();
  const [membership, setMembership] = useState<Membership>();
  const [status, setStatus] = useState<MembershipStatus>();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [monthlyRenewalPrice, setMonthlyRenewalPrice] = useState(
    MONTHLY_MEMBERSHIP_PRICE,
  );
  const [studentVerificationStatus, setStudentVerificationStatus] =
    useState<StudentVerificationStatus>('Not Submitted');
  const [notification, setNotification] = useState<AppNotification>();
  const [activitySchedule, setActivitySchedule] = useState<GymActivityDay[]>([]);
  const [selectedActivityDayId, setSelectedActivityDayId] = useState('');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
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
        gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        sheetPanY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 44 || gestureState.vy > 0.45) {
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
      onPanResponderTerminate: () => {
        Animated.spring(sheetPanY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 90,
        }).start();
      },
      onPanResponderTerminationRequest: () => true,
      onShouldBlockNativeResponder: () => false,
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
      const renewalPricing = await membershipService.getMembershipRenewalPricing(
        currentMember.id,
      );

      setMember(currentMember);
      setMembership(currentMembership);
      setStatus(membershipStatus);
      setPlans(membershipPlans);
      setMonthlyRenewalPrice(renewalPricing.monthlyPrice);
      setStudentVerificationStatus(renewalPricing.studentStatus);
      setNotification(
        classUpdate ?? notifications.find((item) => !item.isRead) ?? notifications[0],
      );
      setActivitySchedule(activityDays);
      setSelectedActivityDayId(activityDays[0]?.id ?? '');
      setVouchers(currentVouchers);
      setIsLoading(false);
    };

    loadDashboard();

    const unsubscribe = memberService.subscribeToMemberUpdates((updatedMember) => {
      setMember(updatedMember);
    });

    return unsubscribe;
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
  const plan = plans.find((item) => item.id === membership?.planId);
  const membershipProgress = calculateMembershipProgress(
    membership,
    plan?.durationInDays,
  );
  const countdownColor = getCountdownColor(membershipProgress, status);
  const statusTone = getStatusTone(status);
  const isFrozen = status === 'Frozen';
  const canShowQr = status === 'Active';
  const expiryDate = formatDate(membership?.endDate);
  const selectedActivityDay =
    activitySchedule.find((item) => item.id === selectedActivityDayId) ??
    activitySchedule[0];
  const selectedRenewAmount = selectedRenewMonths * monthlyRenewalPrice;
  const selectedFreezeAmount = selectedFreezeWeeks * weeklyFreezePrice;
  const renewalPricingNote =
    studentVerificationStatus === 'Confirmed'
      ? 'Student pricing applied: $70/month.'
      : studentVerificationStatus === 'Pending Verification'
        ? 'Student verification pending. Student pricing applies after approval.'
        : '';
  const paymentVouchers = vouchers.filter(
    (voucher) =>
      voucher.type === 'Membership Renewal' ||
      voucher.type === 'Membership Freeze' ||
      voucher.type === 'Shop Reservation',
  );
  const reservationVouchers = vouchers.filter(
    (voucher) => voucher.type === 'Class Reservation',
  );
  const pendingPaymentVoucherCount = paymentVouchers.filter(
    (voucher) => voucher.status === 'Pending',
  ).length;
  const pendingReservationCount = reservationVouchers.filter(
    (voucher) => voucher.status === 'Pending',
  ).length;

  const refreshVouchers = async () => {
    const currentVouchers = await voucherService.getVouchers();

    setVouchers(currentVouchers);
  };

  const closeMembershipModal = () => {
    sheetPanY.stopAnimation();
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
  const isFreezeSheet = membershipModal === 'freeze';
  const sheetAccent = isFreezeSheet ? '#60A5FA' : '#9B7FF0';
  const sheetAccentSoft = isFreezeSheet ? 'rgba(96, 165, 250, 0.16)' : 'rgba(192, 132, 252, 0.16)';
  const sheetAccentBorder =
    isFreezeSheet ? 'rgba(96, 165, 250, 0.34)' : 'rgba(192, 132, 252, 0.34)';
  const sheetKicker = isFreezeSheet ? (isFrozen ? 'Extend Freeze' : 'Freeze Membership') : 'Renew Membership';
  const sheetCaption = isFreezeSheet ? 'Pause plan' : 'Increase validity';
  const sheetTitle = isFreezeSheet
    ? (isFrozen ? 'Keep your break going.' : 'Pause your membership with a cleaner request flow.')
    : 'Choose how long you want to extend your plan.';
  const sheetBody = isFreezeSheet
    ? 'Freeze requests stay pending until cash confirmation at the counter.'
    : 'Renewal requests stay pending until cash confirmation at the counter.';
  const sheetUnitValue = isFreezeSheet ? selectedFreezeWeeks : selectedRenewMonths;
  const sheetUnitLabel = isFreezeSheet
    ? `week${selectedFreezeWeeks > 1 ? 's' : ''}`
    : `month${selectedRenewMonths > 1 ? 's' : ''}`;
  const sheetTotal = isFreezeSheet ? selectedFreezeAmount : selectedRenewAmount;
  const sheetUnitPrice = isFreezeSheet ? weeklyFreezePrice : monthlyRenewalPrice;
  const sheetPrimaryAction = isFreezeSheet ? handleCreateFreezeVoucher : handleCreateRenewVoucher;
  const sheetPrimaryLabel = isCreatingVoucher ? 'Creating...' : 'Create voucher';
  const sheetSymbolName = isFreezeSheet ? 'snowflake' : 'sparkles';
  const sheetSymbolFallback = isFreezeSheet ? '❄' : '✦';
  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(8,9,13,0.34)', 'rgba(3,4,7,0.82)', 'rgba(5,6,10,0.6)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(30,64,175,0.24)',
              'rgba(37,99,235,0.08)',
              'rgba(168,85,247,0.14)',
              'rgba(255,255,255,0)',
            ]}
            locations={[0, 0.32, 0.66, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 0.85 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(99,102,241,0)', 'rgba(139,92,246,0.12)', 'rgba(99,102,241,0)']}
            start={{ x: 1, y: 0.1 }}
            end={{ x: 0.2, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.42)']}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.daysCrystalFacet, styles.daysCrystalFacetTop]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.daysCrystalFacet, styles.daysCrystalFacetBottom]}
          />
          <View style={styles.daysLeftEdge} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.kicker}>Welcome Back</Text>
              <Text style={styles.title}>{member?.firstName ?? 'Athlete'}</Text>
            </View>
            <View style={styles.avatarBadge}>
              {member?.profileImageUri ? (
                <Image
                  source={{ uri: member.profileImageUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {(member?.firstName?.[0] ?? '') + (member?.lastName?.[0] ?? '') ||
                    'M'}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroTagline}>Consistency is key.</Text>
            <Text style={styles.heroExpiryText}>
              Member since {formatDate(membership?.startDate)}
            </Text>
          </View>
        </View>

        {/* ── WHAT'S NEW — looping autoplay carousel (display only) ──────── */}
        <View style={styles.whatsNewLabel}>
          <Text style={styles.whatsNewLabelText}>WHAT&apos;S NEW</Text>
        </View>

        <View style={styles.whatsNewWidget}>
          <View style={styles.whatsNewCard}>
            <Animated.ScrollView
              ref={whatsNewScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate={0.95}
              scrollEventThrottle={16}
              contentOffset={{ x: whatsNewPageW, y: 0 }}
              style={{ flex: 1 }}
              onScrollBeginDrag={() => {
                if (whatsNewAutoplayRef.current) clearInterval(whatsNewAutoplayRef.current);
                if (whatsNewResumeRef.current) clearTimeout(whatsNewResumeRef.current);
              }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: whatsNewScrollX } } }],
                { useNativeDriver: true },
              )}
              onMomentumScrollEnd={(e) => {
                const n = whatsNewUpdates.length;
                let page = Math.round(e.nativeEvent.contentOffset.x / whatsNewPageW);
                if (page === n + 1) {
                  page = 1;
                  whatsNewScrollRef.current?.scrollTo({ x: whatsNewPageW, animated: false });
                } else if (page === 0) {
                  page = n;
                  whatsNewScrollRef.current?.scrollTo({ x: n * whatsNewPageW, animated: false });
                }
                whatsNewIndexRef.current = page;
                if (whatsNewResumeRef.current) clearTimeout(whatsNewResumeRef.current);
                whatsNewResumeRef.current = setTimeout(() => {
                  if (whatsNewAutoplayRef.current) clearInterval(whatsNewAutoplayRef.current);
                  whatsNewAutoplayRef.current = setInterval(() => {
                    const next = whatsNewIndexRef.current + 1;
                    whatsNewIndexRef.current = next;
                    whatsNewScrollRef.current?.scrollTo({ x: next * whatsNewPageW, animated: true });
                  }, 3000);
                }, 4000);
              }}>
              {[
                whatsNewUpdates[whatsNewUpdates.length - 1],
                ...whatsNewUpdates,
                whatsNewUpdates[0],
              ].map((item, i) => {
                const pageScale = whatsNewScrollX.interpolate({
                  inputRange: [(i - 1) * whatsNewPageW, i * whatsNewPageW, (i + 1) * whatsNewPageW],
                  outputRange: [0.7, 1, 0.7],
                  extrapolate: 'clamp',
                });
                return (
                  <View key={`wn-${i}`} style={[styles.whatsNewPage, { width: whatsNewPageW }]}>
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFillObject,
                        styles.whatsNewPageInner,
                        { transform: [{ scale: pageScale }] },
                      ]}>
                      <Image
                        source={{ uri: item.image }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'rgba(8,3,8,0.88)']}
                        locations={[0, 0.32, 1]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(255,255,255,0.10)', 'transparent', 'rgba(255,255,255,0.05)']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <View style={styles.whatsNewTopRow}>
                        <View style={styles.whatsNewBadge}>
                          <Text style={styles.whatsNewBadgeText}>{item.tag}</Text>
                        </View>
                      </View>
                      <View style={styles.whatsNewBottom}>
                        <Text style={styles.whatsNewTitle}>{item.title}</Text>
                        <Text style={styles.whatsNewDesc} numberOfLines={2}>
                          {item.desc}
                        </Text>
                      </View>
                    </Animated.View>
                  </View>
                );
              })}
            </Animated.ScrollView>
            <View pointerEvents="none" style={styles.whatsNewSpecular} />
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Membership</Text>
            <Text style={styles.sectionHeadingTitle}>Days Remaining</Text>
          </View>
          <View style={styles.expiryPill}>
            <Text style={styles.expiryPillLabel}>Expires</Text>
            <Text style={styles.expiryPillText}>{expiryDate}</Text>
          </View>
        </View>

        <View style={styles.ringStage}>
          <View style={styles.daysGlassCard}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(20, 10, 36, 0.94)', 'rgba(38, 16, 66, 0.82)', 'rgba(10, 11, 15, 0.2)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.heroGloss} />
            <View style={styles.daysTopRow}>
              <View>
                <Text style={[styles.daysNumber, { color: countdownColor }]}>
                  {daysRemaining}
                </Text>
                <Text style={styles.daysLabel}>Days Remaining</Text>
              </View>
              <View style={styles.daysStatusPill}>
                <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
                <Text style={styles.daysStatusText}>{status ?? 'Pending'}</Text>
              </View>
            </View>
            <View style={styles.membershipTrack}>
              <View
                style={[
                  styles.membershipTrackFill,
                  {
                    backgroundColor: countdownColor,
                    width: `${Math.round(membershipProgress * 100)}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.daysMetaRow}>
              <Text style={styles.daysMetaText}>
                {Math.round(membershipProgress * 100)}% of plan remaining
              </Text>
              <Text style={styles.daysMetaText}>{expiryDate}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionHeading, styles.featureSectionHeading]}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Quick actions</Text>
            <Text style={styles.sectionHeadingTitle}>Membership tools</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actionRailScroll}
          contentContainerStyle={styles.actionRail}>
          <View style={styles.actionGridInner}>
            <Pressable
              onPress={() => {
                setSelectedRenewMonths(1);
                setMembershipModal('renew');
              }}
              style={({ pressed }) => [
                styles.actionChip,
                styles.actionChipRenew,
                pressed && styles.buttonPressed,
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)']}
                style={styles.actionChipGloss}
              />
              <View style={[styles.actionIconWrap, styles.actionIconWrapRenew]}>
                <Text style={styles.actionIcon}>↻</Text>
              </View>
              <Text style={styles.actionTitle}>Renew</Text>
              <Text style={styles.actionCaption}>Increase Validity</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSelectedFreezeWeeks(1);
                setMembershipModal('freeze');
              }}
              style={({ pressed }) => [
                styles.actionChip,
                styles.actionChipFreeze,
                pressed && styles.buttonPressed,
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)']}
                style={styles.actionChipGloss}
              />
              <View style={[styles.actionIconWrap, styles.actionIconWrapFreeze]}>
                <Text style={styles.actionIcon}>❄</Text>
              </View>
              <Text style={styles.actionTitle}>Freeze</Text>
              <Text style={styles.actionCaption}>Pause plan</Text>
            </Pressable>

            <Pressable
              disabled={!canShowQr}
              onPress={handleShowQr}
              style={({ pressed }) => [
                styles.actionChip,
                styles.actionChipRenew,
                !canShowQr && styles.actionCardDisabled,
                pressed && styles.buttonPressed,
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)']}
                style={styles.actionChipGloss}
              />
              <View style={[styles.actionIconWrap, styles.actionIconWrapRenew]}>
                <Text style={styles.actionIcon}>⊞</Text>
              </View>
              <Text style={styles.actionTitle}>Open QR</Text>
              <Text style={styles.actionCaption}>Entry scan</Text>
            </Pressable>
          </View>
        </ScrollView>

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

        <View style={[styles.sectionHeading, styles.featureSectionHeading]}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Train smarter</Text>
            <Text style={styles.sectionHeadingTitle}>Guides &amp; help</Text>
          </View>
        </View>

        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={featurePageW}
          snapToAlignment="start"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: featureScrollX } } }],
            { useNativeDriver: true },
          )}
          style={styles.featureRailScroll}
          contentContainerStyle={styles.featureRail}>
          <Animated.View
            style={{
              width: featureCardWidth,
              transform: [
                {
                  scale: featureScrollX.interpolate({
                    inputRange: [-featurePageW, 0, featurePageW],
                    outputRange: [0.72, 1, 0.72],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}>
            <Pressable
              onPress={() => router.push('/machine-guide')}
              style={({ pressed }) => [
                styles.featureCard,
                pressed && styles.featurePressed,
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={['#7E0F1E', '#3A0B14', '#160609']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Image
                source={machineGuideSign}
                style={styles.featureWatermark}
                resizeMode="contain"
              />
              <View style={styles.featureTopRow}>
                <View style={styles.featureIconBadge}>
                  <SymbolView
                    name="dumbbell.fill"
                    size={23}
                    tintColor="#FFFFFF"
                    weight="semibold"
                    fallback={<Text style={styles.featureBadgeText}>D</Text>}
                  />
                </View>
              </View>
              <Text style={styles.featureKicker}>Machine Guide</Text>
              <Text style={styles.featureTitle}>Find the right equipment</Text>
              <Text style={styles.featureBody}>
                Pick a muscle group and get setup cues.
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View
            style={{
              width: featureCardWidth,
              transform: [
                {
                  scale: featureScrollX.interpolate({
                    inputRange: [0, featurePageW, featurePageW * 2],
                    outputRange: [0.72, 1, 0.72],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}>
            <Pressable
              onPress={() => router.push('/ai-plan' as Href)}
              style={({ pressed }) => [
                styles.featureCard,
                pressed && styles.featurePressed,
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={['#1A0A2E', '#110720', '#0A0414']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Image
                source={aiHelpSign}
                style={[styles.featureWatermark, styles.featureWatermarkAi]}
                resizeMode="contain"
              />
              <View style={styles.featureTopRow}>
                <View style={[styles.featureIconBadge, styles.featureIconBadgeAiPlan]}>
                  <SymbolView
                    name="sparkles"
                    size={22}
                    tintColor="#FFFFFF"
                    weight="semibold"
                    fallback={<Text style={styles.featureBadgeText}>✦</Text>}
                  />
                </View>
              </View>
              <Text style={[styles.featureKicker, styles.featureKickerAiPlan]}>
                AI Planner
              </Text>
              <Text style={styles.featureTitle}>Tailor your own plan using AI</Text>
              <Text style={styles.featureBody}>
                Set your goals and chat with AI to build your plan.
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View
            style={{
              width: featureCardWidth,
              transform: [
                {
                  scale: featureScrollX.interpolate({
                    inputRange: [featurePageW, featurePageW * 2, featurePageW * 3],
                    outputRange: [0.72, 1, 0.72],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}>
            <Pressable
              onPress={() => router.push('/how-to-use' as Href)}
              style={({ pressed }) => [
                styles.featureCard,
                pressed && styles.featurePressed,
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={['#1C1F29', '#14161D', '#0C0D12']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Image
                source={obliqueSign}
                style={[styles.featureWatermark, styles.featureWatermarkAi]}
                resizeMode="contain"
              />
              <View style={styles.featureTopRow}>
                <View style={[styles.featureIconBadge, styles.featureIconBadgeAi]}>
                  <SymbolView
                    name="book.fill"
                    size={22}
                    tintColor="#FFFFFF"
                    weight="semibold"
                    fallback={<Text style={styles.featureBadgeText}>B</Text>}
                  />
                </View>
              </View>
              <Text style={[styles.featureKicker, styles.featureKickerAi]}>
                AI Gym Help
              </Text>
              <Text style={styles.featureTitle}>How to use the app</Text>
              <Text style={styles.featureBody}>
                Instructions, AI assistant, and contact.
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.ScrollView>

        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Gym Activity</Text>
            <Text style={styles.sectionHeadingTitle}>Crowd level</Text>
          </View>
          <Text style={styles.sectionHint}>
            {selectedActivityDay?.scheduleLabel ?? 'Today'}
          </Text>
        </View>

        <View style={styles.activityPanel}>
          <View style={styles.daySelector}>
            <GlowingChips
              items={activitySchedule.map((item) => ({
                key: item.id,
                label: item.dayLabel.slice(0, 3),
              }))}
              selectedKey={selectedActivityDay?.id ?? ''}
              onSelect={setSelectedActivityDayId}
              indicatorColor="#2E1065"
              indicatorGlowColor="#4C2A9E"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activityChart}>
            {selectedActivityDay?.levels.map((item) => (
              <View key={item.id} style={styles.activityColumn}>
                <Text style={styles.activityValue}>
                  {getCrowdLevelLabel(item.count)}
                </Text>
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
          <View style={styles.sectionHeading}>
            <View style={styles.accentBar} />
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionEyebrow}>Requests</Text>
              <Text style={styles.sectionHeadingTitle}>Activity</Text>
            </View>
            <Text style={styles.sectionHint}>{vouchers.length} total</Text>
          </View>

          <View style={styles.requestLinksGrid}>
            <Pressable
              onPress={() => router.push('/payment-vouchers')}
              style={({ pressed }) => [
                styles.requestLinkCard,
                styles.requestLinkCardPayments,
                pressed && styles.buttonPressed,
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(110,79,207,0.18)', 'rgba(76,42,158,0.06)', 'rgba(0,0,0,0.10)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.requestLinkTopRow}>
                <View style={[styles.requestLinkIconWrap, styles.requestLinkIconWrapPayments]}>
                  <SymbolView
                    name="ticket.fill"
                    size={18}
                    tintColor="#FFFFFF"
                    fallback={<Text style={styles.requestLinkIconFallback}>T</Text>}
                  />
                </View>
                <View style={styles.requestLinkCountPill}>
                  <Text style={styles.requestLinkCountText}>{paymentVouchers.length}</Text>
                </View>
              </View>
              <Text style={styles.requestLinkTitle}>Vouchers</Text>
              <Text style={styles.requestLinkBody}>
                Renewals, freezes, and shop requests paid at the counter.
              </Text>
              <Text style={styles.requestLinkMeta}>
                {pendingPaymentVoucherCount} pending
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/class-bookings')}
              style={({ pressed }) => [
                styles.requestLinkCard,
                styles.requestLinkCardReservations,
                pressed && styles.buttonPressed,
              ]}>
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.requestLinkTopRow}>
                <View style={[styles.requestLinkIconWrap, styles.requestLinkIconWrapReservations]}>
                  <SymbolView
                    name="calendar.badge.clock"
                    size={18}
                    tintColor="#FFFFFF"
                    fallback={<Text style={styles.requestLinkIconFallback}>R</Text>}
                  />
                </View>
                <View style={styles.requestLinkCountPill}>
                  <Text style={styles.requestLinkCountText}>{reservationVouchers.length}</Text>
                </View>
              </View>
              <Text style={styles.requestLinkTitle}>My Reservations</Text>
              <Text style={styles.requestLinkBody}>
                See every pending, confirmed, and canceled class booking.
              </Text>
              <Text style={styles.requestLinkMeta}>
                {pendingReservationCount} pending
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Latest</Text>
            <Text style={styles.sectionHeadingTitle}>Updates</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.07)', 'rgba(225,29,46,0.05)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.cardLabel}>Latest update</Text>
            <Text style={styles.infoTitle}>
              {notification?.title ?? 'No notifications yet'}
            </Text>
            <Text style={styles.infoBody}>
              {feedback || notification?.message || 'Important membership updates will appear here.'}
            </Text>
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
            ]}>
            <View
              pointerEvents="box-only"
              style={styles.modalTopDragHitbox}
              {...sheetPanResponder.panHandlers}
            />
            <View style={styles.modalDragZone}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconWrap, { borderColor: sheetAccentBorder, backgroundColor: sheetAccentSoft }]}>
                <SymbolView
                  name={sheetSymbolName}
                  size={18}
                  tintColor="#FFFFFF"
                  fallback={<Text style={styles.modalIconFallback}>{sheetSymbolFallback}</Text>}
                />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={[styles.modalKicker, { color: sheetAccent }]}>{sheetKicker}</Text>
                <Text style={styles.modalTitle}>{sheetTitle}</Text>
              </View>
              <Pressable
                onPress={closeMembershipModal}
                style={styles.modalCloseButton}
                accessibilityLabel="Close sheet"
                accessibilityRole="button">
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.modalBody}>{sheetBody}</Text>

            <View style={[styles.modalHeroCard, { borderColor: sheetAccentBorder }]}>
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.modalHeroTopRow}>
                <View>
                  <Text style={styles.modalHeroLabel}>{sheetCaption}</Text>
                  <Text style={styles.modalHeroValue}>
                    ${sheetUnitPrice}
                    <Text style={styles.modalHeroUnit}> / {isFreezeSheet ? 'week' : 'month'}</Text>
                  </Text>
                </View>
                <View style={[styles.modalMiniPill, { borderColor: sheetAccentBorder, backgroundColor: sheetAccentSoft }]}>
                  <Text style={[styles.modalMiniPillText, { color: sheetAccent }]}>{status ?? 'Pending'}</Text>
                </View>
              </View>
              {renewalPricingNote && !isFreezeSheet ? (
                <Text style={[styles.modalNote, { color: sheetAccent }]}>{renewalPricingNote}</Text>
              ) : null}
            </View>

            <View style={styles.modalStatsRow}>
              <View style={styles.modalStatCard}>
                <Text style={styles.modalStatLabel}>{isFreezeSheet ? 'Duration' : 'Extension'}</Text>
                <Text style={styles.modalStatValue}>{sheetUnitValue}</Text>
                <Text style={styles.modalStatCaption}>{sheetUnitLabel}</Text>
              </View>
              <View style={styles.modalStatCard}>
                <Text style={styles.modalStatLabel}>Total</Text>
                <Text style={styles.modalStatValue}>${sheetTotal.toFixed(0)}</Text>
                <Text style={styles.modalStatCaption}>cash voucher</Text>
              </View>
            </View>

            <View style={styles.stepperRow}>
              <Pressable
                onPress={() =>
                  isFreezeSheet
                    ? setSelectedFreezeWeeks((value) => Math.max(1, value - 1))
                    : setSelectedRenewMonths((value) => Math.max(minRenewMonths, value - 1))
                }
                style={styles.stepperButton}>
                <Text style={[styles.stepperButtonText, { color: sheetAccent }]}>-</Text>
              </Pressable>
              <View style={styles.stepperValueCard}>
                <Text style={styles.stepperValue}>{sheetUnitValue}</Text>
                <Text style={styles.stepperLabel}>{sheetUnitLabel}</Text>
              </View>
              <Pressable
                onPress={() =>
                  isFreezeSheet
                    ? setSelectedFreezeWeeks((value) => Math.min(12, value + 1))
                    : setSelectedRenewMonths((value) => Math.min(maxRenewMonths, value + 1))
                }
                style={styles.stepperButton}>
                <Text style={[styles.stepperButtonText, { color: sheetAccent }]}>+</Text>
              </Pressable>
            </View>

            <View style={styles.durationTrack}>
              <View
                style={[
                  styles.durationFill,
                  {
                    backgroundColor: sheetAccent,
                    width: `${(sheetUnitValue / (isFreezeSheet ? 12 : maxRenewMonths)) * 100}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.modalFooterRow}>
              <View>
                <Text style={styles.modalFooterLabel}>Ready to request</Text>
                <Text style={styles.modalTotal}>${sheetTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.modalActionRow}>
                <Pressable
                  disabled={isCreatingVoucher}
                  onPress={closeMembershipModal}
                  style={({ pressed }) => [
                    styles.modalSecondaryButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={isCreatingVoucher}
                  onPress={sheetPrimaryAction}
                  style={({ pressed }) => [
                    styles.modalPrimaryButton,
                    { backgroundColor: sheetAccent, shadowColor: sheetAccent },
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.modalPrimaryText}>{sheetPrimaryLabel}</Text>
                </Pressable>
              </View>
            </View>
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
    position: 'relative',
    paddingHorizontal: 20,
    paddingTop: 84,
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
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 28,
    padding: 18,
    marginBottom: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.60,
    shadowRadius: 32,
    elevation: 12,
  },
  guestHeroFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGloss: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
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
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 6,
  },
  avatarBadge: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    borderTopWidth: 0,
    marginTop: 8,
    paddingTop: 0,
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
  heroTagline: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 14,
    fontWeight: '800',
  },
  whatsNewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  whatsNewLabelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  whatsNewWidget: {
    marginBottom: 24,
  },
  whatsNewCard: {
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    ...premiumShadow,
  },
  whatsNewPage: {
    height: 220,
  },
  whatsNewPageInner: {
    justifyContent: 'space-between',
    borderRadius: 26,
    overflow: 'hidden',
  },
  whatsNewSpecular: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  whatsNewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
  },
  whatsNewBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.75)',
    backgroundColor: 'rgba(225,29,46,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 8,
  },
  whatsNewBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  whatsNewBottom: { padding: 16 },
  whatsNewTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    lineHeight: 29,
  },
  whatsNewDesc: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 17,
  },
  heroExpiryText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  featureSectionHeading: {
    marginTop: 22,
  },
  featureRailScroll: {
    marginHorizontal: -20,
    marginBottom: 22,
  },
  featureRail: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
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
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
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
  ringStage: {
    alignItems: 'stretch',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  daysGlassCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    backgroundColor: 'rgba(15, 17, 23, 0.74)',
    width: '100%',
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 8,
  },
  daysCrystalFacet: {
    position: 'absolute',
    right: -18,
    width: 280,
    height: 1.5,
  },
  daysCrystalFacetTop: {
    top: 38,
    transform: [{ rotate: '-17deg' }],
  },
  daysCrystalFacetBottom: {
    bottom: 36,
    transform: [{ rotate: '14deg' }],
  },
  daysTopEdge: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
  },
  daysLeftEdge: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  daysTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  daysNumber: {
    color: textColor,
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 58,
  },
  daysLabel: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  daysStatusPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 12,
  },
  daysStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  membershipTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.095)',
    marginTop: 12,
  },
  membershipTrackFill: {
    height: '100%',
    borderRadius: 999,
  },
  daysMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  daysMetaText: {
    color: 'rgba(255, 255, 255, 0.62)',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
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
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  accentBar: {
    width: 4,
    height: 36,
    borderRadius: 999,
    backgroundColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 8,
  },
  sectionHeadingText: {
    flex: 1,
  },
  sectionEyebrow: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  sectionHeadingTitle: {
    color: textColor,
    fontSize: 21,
    fontWeight: '900',
  },
  activityPanel: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 26,
    backgroundColor: 'rgba(18, 20, 28, 0.68)',
    padding: 15,
    marginBottom: 22,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 6,
  },
  voucherRail: {
    gap: 12,
    paddingRight: 4,
  },
  actionRail: {
    paddingHorizontal: 20,
    paddingRight: 20,
    marginBottom: 22,
  },
  actionRailScroll: {
    marginHorizontal: -20,
  },
  actionGridInner: {
    flexDirection: 'row',
    gap: 12,
  },
  actionChip: {
    width: 150,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  actionChipGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
  },
  actionChipPrimary: {
    borderColor: 'rgba(225, 29, 46, 0.5)',
    backgroundColor: 'rgba(177, 18, 38, 0.18)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 7,
  },
  actionChipRenew: {
    borderColor: 'rgba(225, 29, 46, 0.28)',
    backgroundColor: 'rgba(120, 15, 30, 0.22)',
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  actionChipFreeze: {
    borderColor: 'rgba(96, 165, 250, 0.28)',
    backgroundColor: 'rgba(30, 58, 92, 0.22)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  actionIconWrapPrimary: {
    backgroundColor: accentColor,
  },
  actionIconWrapRenew: {
    backgroundColor: 'rgba(225, 29, 46, 0.85)',
  },
  actionIconWrapFreeze: {
    backgroundColor: 'rgba(59, 130, 246, 0.7)',
  },
  actionIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  actionCardDisabled: {
    opacity: 0.48,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  actionCaption: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
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
  featureRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  featureCard: {
    minHeight: 150,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 28,
    padding: 16,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 9,
  },
  featurePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  featureWatermark: {
    position: 'absolute',
    right: -14,
    top: -10,
    width: 92,
    height: 92,
    opacity: 0.16,
    tintColor: '#FFFFFF',
    transform: [{ rotate: '14deg' }],
  },
  featureWatermarkAi: {
    opacity: 0.12,
    tintColor: '#FF8088',
  },
  featureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featureIconBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  featureIconBadgeAi: {
    borderColor: 'rgba(225, 29, 46, 0.5)',
    backgroundColor: 'rgba(225, 29, 46, 0.18)',
  },
  featureIconGlyph: {
    position: 'absolute',
    opacity: 0,
  },
  featureArrow: {
    display: 'none',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  featureArrowText: {
    position: 'absolute',
    opacity: 0,
  },
  featureSignLarge: {
    width: 24,
    height: 24,
    marginRight: -2,
    display: 'none',
  },
  featureSignSmall: {
    width: 18,
    height: 22,
    marginLeft: -2,
    display: 'none',
  },
  featureDotSign: {
    width: 12,
    height: 12,
    marginRight: 2,
    display: 'none',
  },
  featureArrowSign: {
    width: 19,
    height: 19,
  },
  featureBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  featureKicker: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  featureKickerAi: {
    color: '#FF8088',
  },
  featureIconBadgeAiPlan: {
    borderColor: 'rgba(192,132,252,0.55)',
    backgroundColor: '#2E1065',
  },
  featureKickerAiPlan: {
    color: '#9B7FF0',
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
    marginTop: 6,
  },
  featureBody: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 6,
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
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 22,
    backgroundColor: 'rgba(3, 5, 10, 0.72)',
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
    width: 28,
    height: 120,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
  },
  activityFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.34,
    shadowRadius: 10,
    elevation: 4,
  },
  activityLabel: {
    color: premiumColors.textMuted,
    fontSize: 10,
    fontWeight: '900',
  },
  voucherSection: {
    marginBottom: 16,
  },
  requestLinksGrid: {
    gap: 12,
  },
  requestLinkCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 138,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    ...premiumShadow,
  },
  requestLinkCardPayments: {
    borderColor: 'rgba(76, 42, 158, 0.55)',
    backgroundColor: 'rgba(20, 10, 52, 0.90)',
  },
  requestLinkCardReservations: {
    borderColor: 'rgba(225, 29, 46, 0.2)',
    backgroundColor: 'rgba(28, 14, 18, 0.72)',
  },
  requestLinkTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  requestLinkIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
  },
  requestLinkIconWrapPayments: {
    borderColor: 'rgba(110, 79, 207, 0.55)',
    backgroundColor: 'rgba(60, 30, 140, 0.28)',
  },
  requestLinkIconWrapReservations: {
    borderColor: 'rgba(225, 29, 46, 0.38)',
    backgroundColor: 'rgba(225, 29, 46, 0.16)',
  },
  requestLinkIconFallback: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  requestLinkCountPill: {
    minWidth: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
  },
  requestLinkCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  requestLinkTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  requestLinkBody: {
    color: 'rgba(255, 255, 255, 0.74)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
    maxWidth: '92%',
  },
  requestLinkMeta: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 12,
    textTransform: 'uppercase',
  },
  emptyVoucherText: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  voucherTabs: {
    paddingBottom: 14,
  },
  voucherTabUnselected: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
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
    width: 290,
    minHeight: 126,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    backgroundColor: 'rgba(18, 20, 28, 0.74)',
    ...premiumShadow,
  },
  voucherTear: {
    width: 9,
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
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    backgroundColor: 'rgba(18, 20, 28, 0.74)',
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
    position: 'relative',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
  },
  modalDragZone: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -22,
    minHeight: 32,
    marginBottom: 10,
  },
  modalTopDragHitbox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 68,
    zIndex: 2,
  },
  modalKicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 15,
  },
  modalIconFallback: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalCloseText: {
    color: premiumColors.textMuted,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
  },
  modalTitle: {
    color: textColor,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
  },
  modalBody: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 12,
  },
  modalHeroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 18,
    padding: 16,
  },
  modalHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeroLabel: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalHeroValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 3,
  },
  modalHeroUnit: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  modalMiniPill: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
  },
  modalMiniPillText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalNote: {
    color: '#9B7FF0',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 18,
    marginTop: 10,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalStatCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  modalStatLabel: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalStatValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  modalStatCaption: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    marginTop: 18,
    padding: 10,
  },
  stepperButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(8, 10, 16, 0.72)',
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
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 18,
  },
  modalFooterLabel: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalTotal: {
    color: textColor,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 3,
  },
  modalActionRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  modalSecondaryButton: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalSecondaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  modalPrimaryButton: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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
