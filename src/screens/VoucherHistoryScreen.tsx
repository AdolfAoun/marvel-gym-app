import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumGradients, premiumShadow } from '@/constants/premiumTheme';
import { voucherService } from '@/services';
import { useAppTheme } from '@/theme/useAppTheme';
import type { Voucher, VoucherStatus, VoucherType } from '@/types';

type VoucherHistoryTab = 'All' | VoucherStatus;

type VoucherHistoryScreenProps = {
  type: VoucherType | VoucherType[];
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  canCancelPending?: boolean;
};

const historyTabs: VoucherHistoryTab[] = [
  'All',
  'Pending',
  'Confirmed',
  'Canceled',
];

function getStatusColor(status: VoucherStatus) {
  if (status === 'Confirmed') return premiumColors.success;
  if (status === 'Canceled') return premiumColors.textMuted;
  return premiumColors.warning;
}

function formatVoucherDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function VoucherHistoryScreen({
  type,
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyBody,
  canCancelPending = false,
}: VoucherHistoryScreenProps) {
  const theme = useAppTheme();
  const isLightMode = theme.scheme === 'light';
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<VoucherHistoryTab>('All');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const acceptedTypes = useMemo(() => (Array.isArray(type) ? type : [type]), [type]);

  const loadVouchers = useCallback(async () => {
    const memberVouchers = await voucherService.getVouchers();

    setVouchers(memberVouchers.filter((voucher) => acceptedTypes.includes(voucher.type)));
    setIsLoading(false);
  }, [acceptedTypes]);

  useFocusEffect(
    useCallback(() => {
      loadVouchers();
    }, [loadVouchers]),
  );

  const filteredVouchers = useMemo(
    () =>
      activeTab === 'All'
        ? vouchers
        : vouchers.filter((voucher) => voucher.status === activeTab),
    [activeTab, vouchers],
  );
  const pendingCount = vouchers.filter((voucher) => voucher.status === 'Pending').length;
  const confirmedCount = vouchers.filter((voucher) => voucher.status === 'Confirmed').length;

  const handleCancel = async (voucherId: string) => {
    await voucherService.cancelVoucher(voucherId);
    await loadVouchers();
  };

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style={isLightMode ? 'dark' : 'light'} />
        <View style={styles.loadingState}>
          <ActivityIndicator color={premiumColors.redBright} />
          <Text style={styles.loadingText}>Loading your requests...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground>
      <StatusBar style={isLightMode ? 'dark' : 'light'} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={premiumGradients.redPanel}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGloss} />
          <Text style={styles.heroEyebrow}>{eyebrow}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroBody}>{description}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>pending</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{confirmedCount}</Text>
              <Text style={styles.statLabel}>confirmed</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{vouchers.length}</Text>
              <Text style={styles.statLabel}>total</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={[styles.filterLabel, isLightMode && { color: theme.colors.text }]}>Filter requests</Text>
        <ScrollView
          horizontal
          contentContainerStyle={styles.filtersRow}
          showsHorizontalScrollIndicator={false}>
          {historyTabs.map((tab) => {
            const isSelected = tab === activeTab;

            return (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setActiveTab(tab)}
                style={({ pressed }) => [
                  styles.filterChip,
                  isLightMode && { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(177,18,38,0.18)' },
                  isSelected && styles.filterChipSelected,
                  pressed && styles.filterChipPressed,
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    isLightMode && { color: theme.colors.text },
                    isSelected && styles.filterChipTextSelected,
                  ]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filteredVouchers.length === 0 ? (
          <View style={[styles.emptyCard, isLightMode && { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(177,18,38,0.18)' }]}>
            <Text style={[styles.emptyTitle, isLightMode && { color: theme.colors.text }]}>{emptyTitle}</Text>
            <Text style={[styles.emptyBody, isLightMode && { color: theme.colors.textMuted }]}>{emptyBody}</Text>
          </View>
        ) : (
          <View style={styles.voucherList}>
            {filteredVouchers.map((voucher) => {
              const statusColor = getStatusColor(voucher.status);

              return (
                <View
                  key={voucher.id}
                  style={[
                    styles.voucherCard,
                    isLightMode && {
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      borderColor: 'rgba(177,18,38,0.18)',
                    },
                  ]}>
                  <View style={[styles.statusRail, { backgroundColor: statusColor }]} />
                  <View style={styles.voucherContent}>
                    <View style={styles.voucherTopRow}>
                      <View style={styles.statusPill}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {voucher.status}
                        </Text>
                      </View>
                      <Text style={[styles.voucherDate, isLightMode && { color: theme.colors.textMuted }]}>
                        {formatVoucherDate(voucher.date)}
                      </Text>
                    </View>
                    <Text style={[styles.voucherDescription, isLightMode && { color: theme.colors.text }]}>
                      {voucher.description}
                    </Text>
                    <View style={styles.voucherFooter}>
                      <Text style={styles.voucherAmount}>
                        {voucher.currency} {voucher.amount.toFixed(2)}
                      </Text>
                      {canCancelPending && voucher.status === 'Pending' ? (
                        <Pressable
                          accessibilityLabel={`Cancel ${voucher.description}`}
                          onPress={() => handleCancel(voucher.id)}
                          style={({ pressed }) => [
                            styles.cancelButton,
                            pressed && styles.cancelButtonPressed,
                          ]}>
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 88,
    paddingBottom: 36,
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
    fontWeight: '700',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 26,
    padding: 22,
    marginBottom: 22,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 10,
  },
  heroGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroEyebrow: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 35,
    marginTop: 5,
  },
  heroBody: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 10,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  filterLabel: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  filtersRow: {
    gap: 8,
    paddingBottom: 18,
  },
  filterChip: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 12,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 14,
  },
  filterChipSelected: {
    borderColor: premiumColors.redBright,
    backgroundColor: premiumColors.red,
  },
  filterChipPressed: {
    opacity: 0.78,
  },
  filterChipText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 22,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 18,
  },
  emptyTitle: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  voucherList: {
    gap: 10,
  },
  voucherCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 20,
    backgroundColor: premiumColors.surface,
    ...premiumShadow,
  },
  statusRail: {
    width: 4,
  },
  voucherContent: {
    flex: 1,
    padding: 14,
    gap: 7,
  },
  voucherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  voucherDate: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  voucherDescription: {
    color: premiumColors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  voucherFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  voucherAmount: {
    color: premiumColors.redBright,
    fontSize: 14,
    fontWeight: '900',
  },
  cancelButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.28)',
    borderRadius: 999,
    backgroundColor: 'rgba(225, 29, 46, 0.09)',
    paddingHorizontal: 14,
  },
  cancelButtonPressed: {
    opacity: 0.72,
  },
  cancelButtonText: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
  },
});
