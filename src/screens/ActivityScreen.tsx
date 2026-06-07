import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { activityService } from '@/services';
import type { GymActivityLevel } from '@/types';

const accentColor = '#B11226';

function getBarColor(intensity: GymActivityLevel['intensity']) {
  if (intensity === 'High') {
    return accentColor;
  }

  if (intensity === 'Medium') {
    return '#F59E0B';
  }

  return '#22C55E';
}

export default function ActivityScreen() {
  const [activityLevels, setActivityLevels] = useState<GymActivityLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      const levels = await activityService.getGymActivityLevels();

      setActivityLevels(levels);
      setIsLoading(false);
    };

    loadActivity();
  }, []);

  const maxCount = useMemo(
    () => Math.max(...activityLevels.map((item) => item.count), 1),
    [activityLevels],
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Activity</Text>
          <Text style={styles.title}>Busiest hours</Text>
          <Text style={styles.subtitle}>See when the gym is busiest.</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={accentColor} />
            <Text style={styles.loadingText}>Loading activity levels...</Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {activityLevels.map((item) => {
                const barHeight = Math.max(34, (item.count / maxCount) * 210);

                return (
                  <View key={item.id} style={styles.barColumn}>
                    <Text style={styles.countText}>{item.count}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: barHeight,
                            backgroundColor: getBarColor(item.intensity),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.timeLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendText}>Low</Text>
              <Text style={styles.legendText}>Medium</Text>
              <Text style={styles.legendText}>High traffic</Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Planning your visit</Text>
          <Text style={styles.infoBody}>
            Evening sessions are currently the strongest. Choose quieter hours for
            more space or peak hours for a high-energy floor.
          </Text>
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
    paddingTop: 20,
    paddingBottom: 108,
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
    color: '#181A20',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  loadingCard: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  loadingText: {
    color: '#5B6472',
    fontSize: 14,
    fontWeight: '700',
  },
  chartCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 18,
    marginBottom: 14,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  chart: {
    height: 274,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  countText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '900',
  },
  barTrack: {
    width: '100%',
    maxWidth: 34,
    height: 210,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#F3E2E5',
  },
  barFill: {
    width: '100%',
    borderRadius: 999,
  },
  timeLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(177, 18, 38, 0.12)',
    marginTop: 18,
    paddingTop: 14,
  },
  legendText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
  },
  infoCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.16)',
    borderRadius: 22,
    backgroundColor: '#FFF1F3',
    padding: 18,
  },
  infoTitle: {
    color: '#181A20',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  infoBody: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
