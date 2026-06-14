import { useRouter } from 'expo-router';
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
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';

const accentColor = premiumColors.red;
const wineColor = premiumColors.redBright;
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
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Help</Text>
          <Text style={styles.heroTitle}>Support Hub</Text>
          <Text style={styles.heroBody}>
            How to use the app, contact options, and the future Marvel Gym assistant.
          </Text>
        </View>

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

        <View style={styles.card}>
          <Text style={styles.cardLabel}>How it works</Text>
          <Text style={styles.supportTitle}>How to use the app</Text>
          <Text style={styles.supportBody}>
            A quick guide to the main Marvel Gym member tools.
          </Text>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Contact Us</Text>
          <Text style={styles.supportTitle}>Need help from Marvel Gym?</Text>
          <Text style={styles.supportBody}>
            Reach the team through WhatsApp or a direct phone call.
          </Text>
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
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 26,
    backgroundColor: 'rgba(18, 20, 28, 0.72)',
    padding: 20,
    marginBottom: 16,
    ...premiumShadow,
  },
  kicker: {
    color: premiumColors.redBright,
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
    color: premiumColors.textMuted,
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
