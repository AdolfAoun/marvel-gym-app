import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  memberService,
  membershipService,
  notificationService,
} from '@/services';
import type {
  AppNotification,
  Member,
  Membership,
  MembershipPlan,
  MembershipStatus,
} from '@/types';

const accentColor = '#B11226';
const surfaceColor = '#FFFFFF';

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

  if (daysRemaining <= 7) {
    return '#EF4444';
  }

  if (daysRemaining <= 21) {
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

export default function HomeScreen() {
  const [member, setMember] = useState<Member>();
  const [membership, setMembership] = useState<Membership>();
  const [status, setStatus] = useState<MembershipStatus>();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [notification, setNotification] = useState<AppNotification>();
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('Ready when you are.');

  useEffect(() => {
    const loadDashboard = async () => {
      const [
        currentMember,
        currentMembership,
        membershipStatus,
        membershipPlans,
        notifications,
      ] = await Promise.all([
        memberService.getCurrentMember(),
        membershipService.getCurrentMembership(),
        membershipService.getMembershipStatus(),
        membershipService.getMembershipPlans(),
        notificationService.getNotifications(),
      ]);

      setMember(currentMember);
      setMembership(currentMembership);
      setStatus(membershipStatus);
      setPlans(membershipPlans);
      setNotification(notifications.find((item) => !item.isRead) ?? notifications[0]);
      setIsLoading(false);
    };

    loadDashboard();
  }, []);

  const daysRemaining = useMemo(
    () => calculateDaysRemaining(membership?.endDate),
    [membership?.endDate],
  );
  const countdownColor = getCountdownColor(daysRemaining, status);
  const plan = plans.find((item) => item.id === membership?.planId);
  const isFrozen = status === 'Frozen';
  const expiryDate = formatDate(membership?.endDate);
  const memberInitials = `${member?.firstName?.slice(0, 1) ?? 'M'}${
    member?.lastName?.slice(0, 1) ?? 'G'
  }`;

  const handleShowQr = async () => {
    const qrCode = await membershipService.showQRCode();

    setFeedback(
      qrCode ? `QR ready: ${qrCode}` : 'QR is available only for active memberships.',
    );
  };

  const handleFreezeToggle = async () => {
    const updatedMembership = isFrozen
      ? await membershipService.unfreezeMembership()
      : await membershipService.freezeMembership();

    setMembership(updatedMembership);
    setStatus(updatedMembership.status);
    setFeedback(
      updatedMembership.status === 'Frozen'
        ? 'Membership freeze request saved for Phase 1.'
        : 'Membership is marked active again.',
    );
  };

  const handleRenew = async () => {
    const availablePlans = await membershipService.getMembershipPlans();
    const firstPlan = availablePlans.find((item) => item.isActive);

    setFeedback(
      firstPlan
        ? `Renewal placeholder loaded ${firstPlan.name}.`
        : 'Renewal plans are not available yet.',
    );
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
                {plan?.name ?? 'Current Membership'} dashboard
              </Text>
            </View>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>{memberInitials}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.statusBadgeOnRed}>
              <View style={[styles.statusDot, { backgroundColor: countdownColor }]} />
              <Text style={styles.statusTextOnRed}>{status ?? 'Pending'}</Text>
            </View>
            <Text style={styles.heroExpiryText}>Expires {expiryDate}</Text>
          </View>
        </View>

        <View style={styles.countdownCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Membership clock</Text>
              <Text style={styles.cardTitle}>Access window</Text>
            </View>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>
                {plan?.name ?? 'Membership'}
              </Text>
            </View>
          </View>

          <View style={styles.countdownWidgetRow}>
          <View
            style={[
              styles.countdownCircle,
              {
                borderColor: countdownColor,
                shadowColor: countdownColor,
              },
            ]}>
              <View style={styles.countdownInner}>
            <Text style={styles.daysNumber}>{daysRemaining}</Text>
            <Text style={styles.daysLabel}>days remaining</Text>
              </View>
          </View>

            <View style={styles.membershipDetails}>
              <View style={styles.detailTile}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{status ?? 'Pending'}</Text>
              </View>
              <View style={styles.detailTile}>
                <Text style={styles.detailLabel}>Expiry</Text>
                <Text style={styles.detailValue}>{expiryDate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.sectionHint}>Member tools</Text>
        </View>

        <View style={styles.actionGrid}>
          <Pressable
            onPress={handleShowQr}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.actionEyebrow}>Entry</Text>
            <Text style={styles.actionText}>Show QR</Text>
          </Pressable>

          <Pressable
            onPress={handleFreezeToggle}
            style={({ pressed }) => [
              styles.actionButton,
              isFrozen && styles.unfreezeButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.actionEyebrow}>
              {isFrozen ? 'Resume' : 'Pause'}
            </Text>
            <Text style={styles.actionText}>
              {isFrozen ? 'Unfreeze' : 'Freeze Membership'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleRenew}
          style={({ pressed }) => [
            styles.renewButton,
            pressed && styles.buttonPressed,
          ]}>
          <Text style={styles.renewText}>Renew Membership</Text>
        </Pressable>

        <View style={styles.todayCard}>
          <View>
            <Text style={styles.cardLabel}>Today at Marvel Gym</Text>
            <Text style={styles.todayTitle}>
              {status === 'Active' ? 'Your QR access is ready.' : 'Check your membership status.'}
            </Text>
          </View>
          <Text style={styles.todayBody}>
            {status === 'Active'
              ? 'Drop in anytime and use Show QR at the counter.'
              : 'Renew or resolve your status before your next visit.'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Latest update</Text>
          <Text style={styles.cardTitle}>
            {notification?.title ?? 'No notifications yet'}
          </Text>
          <Text style={styles.cardBody}>
            {notification?.message ?? 'Important membership updates will appear here.'}
          </Text>
        </View>

        <View style={styles.actionStatusCard}>
          <Text style={styles.cardLabel}>Action status</Text>
          <Text style={styles.actionStatusText}>{feedback}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F7',
  },
  content: {
    paddingHorizontal: 22,
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
    color: '#5B6472',
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
    right: -70,
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
  statusRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  statusBadge: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.16)',
    borderRadius: 999,
    backgroundColor: surfaceColor,
    paddingHorizontal: 14,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#181A20',
    fontSize: 13,
    fontWeight: '900',
  },
  planText: {
    flex: 1,
    color: '#667085',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  countdownCard: {
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
  planPill: {
    maxWidth: 136,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.16)',
    borderRadius: 999,
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  planPillText: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  countdownWidgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  countdownCircle: {
    width: 158,
    height: 158,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 9,
    borderRadius: 79,
    backgroundColor: '#FFF3F5',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 8,
  },
  countdownInner: {
    width: 122,
    height: 122,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 61,
    backgroundColor: '#FFFFFF',
  },
  daysNumber: {
    color: '#181A20',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 58,
  },
  daysLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'lowercase',
  },
  membershipDetails: {
    flex: 1,
    minWidth: 128,
    gap: 10,
  },
  detailTile: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 18,
    backgroundColor: '#FFF8F7',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailLabel: {
    color: '#8E6670',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#181A20',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#181A20',
    fontSize: 17,
    fontWeight: '900',
  },
  sectionHint: {
    color: '#8E6670',
    fontSize: 12,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.3)',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  unfreezeButton: {
    borderColor: 'rgba(34, 197, 94, 0.34)',
    backgroundColor: '#F0FDF4',
  },
  actionEyebrow: {
    color: '#8E6670',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  actionText: {
    color: accentColor,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  renewButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
    marginBottom: 18,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 5,
  },
  renewText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  todayCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 22,
    backgroundColor: '#FFF1F3',
    padding: 18,
    marginBottom: 12,
  },
  todayTitle: {
    color: '#181A20',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  todayBody: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 22,
    backgroundColor: surfaceColor,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  actionStatusCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardLabel: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#181A20',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardBody: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  actionStatusText: {
    color: '#58111B',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
});
