import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const accentColor = '#B11226';
const wineColor = '#58111B';
const backgroundColor = '#FFF8F7';
const surfaceColor = '#FFFFFF';
const textColor = '#181A20';
const mutedColor = '#667085';

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <Text style={styles.kicker}>Help</Text>
          <Text style={styles.heroTitle}>How it works</Text>
          <Text style={styles.heroBody}>
            Quick guidance for using your Marvel Gym membership tools.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>How to use the app</Text>
          <View style={styles.stepList}>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>1</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Open QR at entry</Text>
                <Text style={styles.stepBody}>
                  Use the Home tab to show your active member QR for gym access.
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>2</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Manage membership actions</Text>
                <Text style={styles.stepBody}>
                  Freeze or renew from Home. Requests stay voucher-backed for Phase 1.
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>3</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Track your journey</Text>
                <Text style={styles.stepBody}>
                  Use Journey for visits, workout timing, calories, and attendance.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/machine-guide')}
          style={({ pressed }) => [
            styles.machineGuideCard,
            pressed && styles.buttonPressed,
          ]}>
          <View>
            <Text style={styles.cardLabel}>How It Works</Text>
            <Text style={styles.machineGuideTitle}>Open Machine Guide</Text>
            <Text style={styles.machineGuideBody}>
              Equipment setup by muscle target with simple setup cues.
            </Text>
          </View>
          <Text style={styles.machineGuideArrow}>Go</Text>
        </Pressable>

        <View style={styles.aiCard}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>Coming soon</Text>
          </View>
          <Text style={styles.aiTitle}>AI Assistant</Text>
          <Text style={styles.aiBody}>
            Ask questions about your membership, visits, classes, and gym services.
          </Text>
          <View style={styles.aiInputPreview}>
            <Text style={styles.aiInputText}>Ask Marvel Gym...</Text>
          </View>
        </View>
      </ScrollView>
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
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: wineColor,
    padding: 22,
    marginBottom: 16,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 7,
  },
  heroGlow: {
    position: 'absolute',
    right: -84,
    top: -84,
    width: 214,
    height: 214,
    borderRadius: 107,
    backgroundColor: 'rgba(225, 29, 46, 0.38)',
  },
  kicker: {
    color: '#F7D6DC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 37,
    marginTop: 6,
  },
  heroBody: {
    color: '#FCE7EA',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  card: {
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
  cardLabel: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  stepList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 20,
    backgroundColor: '#FFF8F7',
    padding: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: accentColor,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
  },
  stepCopy: {
    flex: 1,
  },
  stepTitle: {
    color: textColor,
    fontSize: 15,
    fontWeight: '900',
  },
  stepBody: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  machineGuideCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 26,
    backgroundColor: '#FFFDFD',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  machineGuideTitle: {
    color: textColor,
    fontSize: 19,
    fontWeight: '900',
  },
  machineGuideBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 250,
  },
  machineGuideArrow: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: accentColor,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  aiCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 28,
    backgroundColor: '#181A20',
    padding: 18,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  aiBadgeText: {
    color: '#F7D6DC',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 14,
  },
  aiBody: {
    color: '#D8DEE8',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  aiInputPreview: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginTop: 16,
    paddingHorizontal: 14,
  },
  aiInputText: {
    color: '#9AA3AF',
    fontSize: 13,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.76,
  },
});
