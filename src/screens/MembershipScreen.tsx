import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { membershipService } from '@/services';
import type { Membership, MembershipPlan, MembershipStatus } from '@/types';

const accentColor = premiumColors.red;

function formatDate(value?: string) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function MembershipScreen() {
  const [membership, setMembership] = useState<Membership>();
  const [status, setStatus] = useState<MembershipStatus>();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMembership = async () => {
      const [currentMembership, currentStatus, currentPlans] = await Promise.all([
        membershipService.getCurrentMembership(),
        membershipService.getMembershipStatus(),
        membershipService.getMembershipPlans(),
      ]);

      setMembership(currentMembership);
      setStatus(currentStatus);
      setPlans(currentPlans);
      setIsLoading(false);
    };

    loadMembership();
  }, []);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === membership?.planId),
    [membership?.planId, plans],
  );

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading membership...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <Text style={styles.kicker}>Membership</Text>
          <Text style={styles.heroTitle}>{activePlan?.name ?? 'Member Access'}</Text>
          <Text style={styles.heroBody}>
            Review your plan status, expiry, and available renewal options.
          </Text>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{status ?? 'Pending'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Current plan</Text>
          <Text style={styles.sectionTitle}>{activePlan?.description ?? 'Marvel Gym access'}</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailTile}>
              <Text style={styles.detailValue}>{formatDate(membership?.startDate)}</Text>
              <Text style={styles.detailLabel}>Started</Text>
            </View>
            <View style={styles.detailTile}>
              <Text style={styles.detailValue}>{formatDate(membership?.endDate)}</Text>
              <Text style={styles.detailLabel}>Expires</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Plans</Text>
          <Text style={styles.sectionTitle}>Renewal options</Text>
          <View style={styles.planList}>
            {plans.map((plan) => (
              <View key={plan.id} style={styles.planRow}>
                <View style={styles.planCopy}>
                  <Text style={styles.planTitle}>{plan.name}</Text>
                  <Text style={styles.planBody}>{plan.description}</Text>
                </View>
                <Text style={styles.planPrice}>
                  {plan.currency} {plan.price.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
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
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 30,
    backgroundColor: premiumColors.surfaceAlt,
    padding: 22,
    marginBottom: 16,
    ...premiumShadow,
  },
  heroGlow: {
    position: 'absolute',
    right: -90,
    top: -90,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(177, 18, 38, 0.26)',
  },
  kicker: {
    color: '#F7D6DC',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: premiumColors.text,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 37,
    marginTop: 8,
  },
  heroBody: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  },
  statusPill: {
    alignSelf: 'flex-start',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    marginTop: 16,
    paddingHorizontal: 13,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: premiumColors.success,
  },
  statusText: {
    color: premiumColors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  card: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: premiumColors.surface,
    padding: 18,
    marginBottom: 16,
    ...premiumShadow,
  },
  cardLabel: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: premiumColors.text,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  detailTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 20,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 14,
  },
  detailValue: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  detailLabel: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  planList: {
    gap: 10,
    marginTop: 16,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 20,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 14,
  },
  planCopy: {
    flex: 1,
  },
  planTitle: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  planBody: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  planPrice: {
    color: premiumColors.redBright,
    fontSize: 14,
    fontWeight: '900',
  },
});
