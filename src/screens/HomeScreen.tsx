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

const accentColor = '#E11D2E';
const surfaceColor = '#121214';

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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading member dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Welcome back</Text>
          <Text style={styles.title}>{member?.firstName ?? 'Member'}</Text>
          <Text style={styles.subtitle}>Your membership command center.</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: countdownColor }]} />
            <Text style={styles.statusText}>{status ?? 'Pending'}</Text>
          </View>
          <Text style={styles.planText}>{plan?.name ?? 'Current Membership'}</Text>
        </View>

        <View style={styles.countdownCard}>
          <View
            style={[
              styles.countdownCircle,
              {
                borderColor: countdownColor,
                shadowColor: countdownColor,
              },
            ]}>
            <Text style={styles.daysNumber}>{daysRemaining}</Text>
            <Text style={styles.daysLabel}>days remaining</Text>
          </View>
          <Text style={styles.expiryText}>
            Expires {formatDate(membership?.endDate)}
          </Text>
        </View>

        <View style={styles.actionGrid}>
          <Pressable
            onPress={handleShowQr}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.actionText}>Show QR</Text>
          </Pressable>

          <Pressable
            onPress={handleFreezeToggle}
            style={({ pressed }) => [
              styles.actionButton,
              isFrozen && styles.unfreezeButton,
              pressed && styles.buttonPressed,
            ]}>
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

        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Latest update</Text>
          <Text style={styles.cardTitle}>
            {notification?.title ?? 'No notifications yet'}
          </Text>
          <Text style={styles.cardBody}>
            {notification?.message ?? 'Important membership updates will appear here.'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Action status</Text>
          <Text style={styles.cardBody}>{feedback}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 108,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#D7DEE8',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    marginBottom: 18,
  },
  kicker: {
    color: accentColor,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4,
  },
  subtitle: {
    color: '#A8B2C0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    backgroundColor: surfaceColor,
    paddingHorizontal: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  planText: {
    flex: 1,
    color: '#A8B2C0',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  countdownCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 28,
    backgroundColor: surfaceColor,
    paddingVertical: 26,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  countdownCircle: {
    width: 202,
    height: 202,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 10,
    borderRadius: 101,
    backgroundColor: '#080809',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 8,
  },
  daysNumber: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 72,
  },
  daysLabel: {
    color: '#D7DEE8',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'lowercase',
  },
  expiryText: {
    color: '#A8B2C0',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
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
    borderColor: 'rgba(225, 29, 46, 0.55)',
    borderRadius: 18,
    backgroundColor: '#17171A',
    paddingHorizontal: 12,
  },
  unfreezeButton: {
    borderColor: 'rgba(34, 197, 94, 0.58)',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  actionText: {
    color: '#FFFFFF',
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
  infoCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 22,
    backgroundColor: surfaceColor,
    padding: 18,
    marginBottom: 12,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardBody: {
    color: '#D7DEE8',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
