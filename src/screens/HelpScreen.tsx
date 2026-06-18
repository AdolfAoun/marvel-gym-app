import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { MarvelMarks } from '@/components/PremiumUI';
import {
  premiumColors,
  premiumGradients,
  premiumShadow,
} from '@/constants/premiumTheme';

const accentColor = premiumColors.red;
const backgroundColor = premiumColors.background;
const surfaceColor = premiumColors.surface;
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;

export default function HelpScreen() {
  const handleContact = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Contact unavailable', 'This contact option could not be opened.');
    }
  };

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={premiumGradients.redPanel}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGloss} />
          <MarvelMarks variant="corner" color="#FFFFFF" />
          <Text style={styles.kicker}>Help</Text>
          <Text style={styles.heroTitle}>Support Hub</Text>
          <Text style={styles.heroBody}>
            How to use the app, contact options, and the future Marvel Gym assistant.
          </Text>
        </LinearGradient>

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

        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>How it works</Text>
            <Text style={styles.sectionHeadingTitle}>How to use the app</Text>
          </View>
        </View>
        <View style={styles.stepList}>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>01</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Entry and membership</Text>
                <Text style={styles.stepBody}>
                  Use Home to check your membership status and open your QR when your plan is active.
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>02</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Freeze, renew, or extend</Text>
                <Text style={styles.stepBody}>
                  Request membership changes from Home and complete cash confirmation at the counter.
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>03</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Vouchers</Text>
                <Text style={styles.stepBody}>
                  Track pending, confirmed, and canceled cash requests in the Vouchers section.
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>04</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Classes and Gym Shop</Text>
                <Text style={styles.stepBody}>
                  Browse classes when available and check product availability, prices, and filters in Gym Shop.
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>05</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Journey</Text>
                <Text style={styles.stepBody}>
                  Follow your visits, attendance streak, workout timer, and progress stats.
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>06</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Profile</Text>
                <Text style={styles.stepBody}>
                  Open Profile from the top-right icon to review member details and update editable preferences.
                </Text>
              </View>
            </View>
          </View>

        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Contact Us</Text>
            <Text style={styles.sectionHeadingTitle}>Need help from Marvel Gym?</Text>
          </View>
        </View>
        <View style={styles.contactRow}>
            <Pressable
              onPress={() => handleContact('https://wa.me/96179197997')}
              style={({ pressed }) => [
                styles.contactButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.contactButtonText}>WhatsApp</Text>
            </Pressable>
            <Pressable
              onPress={() => handleContact('tel:+96179197997')}
              style={({ pressed }) => [
                styles.contactButton,
                styles.contactButtonDark,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.contactButtonTextDark}>Phone call</Text>
            </Pressable>
          </View>
      </ScrollView>
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
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,
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
  heroSheen: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 120, 130, 0.2)',
  },
  kicker: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 37,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroBody: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 16,
    ...premiumShadow,
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
    borderRadius: 3,
    backgroundColor: premiumColors.redBright,
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
  contactSpacer: {
    marginBottom: 16,
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
    marginTop: 14,
  },
  supportTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  supportBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  contactButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 16,
    backgroundColor: accentColor,
  },
  contactButtonDark: {
    backgroundColor: premiumColors.surfaceSoft,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  contactButtonTextDark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 20,
    backgroundColor: premiumColors.surfaceSoft,
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
  aiCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: premiumColors.surfaceAlt,
    padding: 18,
    marginBottom: 16,
    ...premiumShadow,
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
