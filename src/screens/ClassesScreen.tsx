import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { classService } from '@/services';
import type { GymClass } from '@/types';

function formatClassTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ClassesScreen() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadClasses = async () => {
      const scheduledClasses = await classService.getScheduledClasses();

      setClasses(scheduledClasses.filter((gymClass) => gymClass.isActive));
      setIsLoading(false);
    };

    loadClasses();
  }, []);

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={premiumColors.red} />
          <Text style={styles.loadingText}>Loading classes...</Text>
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
          <Text style={styles.kicker}>Classes</Text>
          <Text style={styles.heroTitle}>Train with purpose.</Text>
          <Text style={styles.heroBody}>
            Browse upcoming sessions, availability, and class pricing.
          </Text>
        </View>

        <View style={styles.classList}>
          {classes.map((gymClass) => (
            <View key={gymClass.id} style={styles.classCard}>
              <View style={styles.classTopRow}>
                <View style={styles.classTimeTile}>
                  <Text style={styles.classTime}>{formatClassTime(gymClass.startTime)}</Text>
                </View>
                <View
                  style={[
                    styles.availabilityPill,
                    gymClass.status === 'Full' && styles.availabilityPillFull,
                  ]}>
                  <Text style={styles.availabilityText}>{gymClass.status}</Text>
                </View>
              </View>
              <Text style={styles.classTitle}>{gymClass.title}</Text>
              <Text style={styles.classBody}>{gymClass.description}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{gymClass.instructorName}</Text>
                <Text style={styles.metaText}>{gymClass.location ?? 'Studio'}</Text>
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.capacityText}>
                  {gymClass.enrolledCount}/{gymClass.capacity} booked
                </Text>
                <Text style={styles.priceText}>
                  {gymClass.isPaid
                    ? `${gymClass.currency} ${gymClass.price.toFixed(2)}`
                    : 'Free'}
                </Text>
              </View>
            </View>
          ))}
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
  classList: {
    gap: 14,
  },
  classCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: premiumColors.surface,
    padding: 18,
    ...premiumShadow,
  },
  classTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  classTimeTile: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  classTime: {
    color: premiumColors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  availabilityPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  availabilityPillFull: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  availabilityText: {
    color: premiumColors.text,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  classTitle: {
    color: premiumColors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  classBody: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 7,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: premiumColors.border,
    marginTop: 14,
    paddingTop: 12,
  },
  metaText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  capacityText: {
    color: premiumColors.textFaint,
    fontSize: 12,
    fontWeight: '800',
  },
  priceText: {
    color: premiumColors.redBright,
    fontSize: 13,
    fontWeight: '900',
  },
});
