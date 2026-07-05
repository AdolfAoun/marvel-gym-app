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
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import {
  premiumColors,
  premiumShadow,
} from '@/constants/premiumTheme';
import { useAppTheme } from '@/theme/useAppTheme';

const accentColor = premiumColors.red;
const backgroundColor = premiumColors.background;
const surfaceColor = premiumColors.surface;
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;

export default function HelpScreen() {
  const theme = useAppTheme();
  const isLightMode = theme.scheme === 'light';
  const handleContact = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Contact unavailable', 'This contact option could not be opened.');
    }
  };

  return (
    <PremiumScreenBackground>
      <StatusBar style={isLightMode ? 'dark' : 'light'} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.helpHeader}>
          <Text style={styles.helpEyebrow}>Help</Text>
          <Text style={[styles.helpTitle, isLightMode && { color: theme.colors.text }]}>Support Hub</Text>
        </View>
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={[styles.aiCard, isLightMode && { backgroundColor: 'rgba(255,255,255,0.64)', borderColor: theme.colors.border }]}>
          <Text style={[styles.aiTitle, isLightMode && { color: theme.colors.text }]}>AI Assistant</Text>
          <Text style={[styles.aiBody, isLightMode && { color: theme.colors.textMuted }]}>
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
            <Text style={[styles.sectionHeadingTitle, isLightMode && { color: theme.colors.text }]}>How to use the app</Text>
          </View>
        </View>
        <View style={styles.stepList}>
            <View style={[styles.stepRow, isLightMode && { backgroundColor: 'rgba(255,255,255,0.64)', borderColor: theme.colors.border }]}>
              <Text style={styles.stepNumber}>01</Text>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, isLightMode && { color: theme.colors.text }]}>Entry and membership</Text>
                <Text style={[styles.stepBody, isLightMode && { color: theme.colors.textMuted }]}>
                  Use Home to check your membership status and open your QR when your plan is active.
                </Text>
              </View>
            </View>
            <View style={[styles.stepRow, isLightMode && { backgroundColor: 'rgba(255,255,255,0.64)', borderColor: theme.colors.border }]}>
              <Text style={styles.stepNumber}>02</Text>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, isLightMode && { color: theme.colors.text }]}>Freeze, renew, or extend</Text>
                <Text style={[styles.stepBody, isLightMode && { color: theme.colors.textMuted }]}>
                  Request membership changes from Home and complete cash confirmation at the counter.
                </Text>
              </View>
            </View>
            <View style={[styles.stepRow, isLightMode && { backgroundColor: 'rgba(255,255,255,0.64)', borderColor: theme.colors.border }]}>
              <Text style={styles.stepNumber}>03</Text>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, isLightMode && { color: theme.colors.text }]}>Vouchers</Text>
                <Text style={[styles.stepBody, isLightMode && { color: theme.colors.textMuted }]}>
                  Track pending, confirmed, and canceled cash requests in the Vouchers section.
                </Text>
              </View>
            </View>
            <View style={[styles.stepRow, isLightMode && { backgroundColor: 'rgba(255,255,255,0.64)', borderColor: theme.colors.border }]}>
              <Text style={styles.stepNumber}>04</Text>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, isLightMode && { color: theme.colors.text }]}>Classes and Gym Shop</Text>
                <Text style={[styles.stepBody, isLightMode && { color: theme.colors.textMuted }]}>
                  Browse classes when available and check product availability, prices, and filters in Gym Shop.
                </Text>
              </View>
            </View>
            <View style={[styles.stepRow, isLightMode && { backgroundColor: 'rgba(255,255,255,0.64)', borderColor: theme.colors.border }]}>
              <Text style={styles.stepNumber}>05</Text>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, isLightMode && { color: theme.colors.text }]}>Journey</Text>
                <Text style={[styles.stepBody, isLightMode && { color: theme.colors.textMuted }]}>
                  Follow your visits, attendance streak, workout timer, and progress stats.
                </Text>
              </View>
            </View>
            <View style={[styles.stepRow, isLightMode && { backgroundColor: 'rgba(255,255,255,0.64)', borderColor: theme.colors.border }]}>
              <Text style={styles.stepNumber}>06</Text>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, isLightMode && { color: theme.colors.text }]}>Profile</Text>
                <Text style={[styles.stepBody, isLightMode && { color: theme.colors.textMuted }]}>
                  Open Profile from the top-right icon to review member details and update editable preferences.
                </Text>
              </View>
            </View>
          </View>

        <View style={[styles.sectionHeading, { marginTop: 28 }]}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Contact Us</Text>
            <Text style={[styles.sectionHeadingTitle, { color: '#000000' }]}>
              Need help from Marvel Gym?
            </Text>
          </View>
        </View>
        <View style={styles.contactRow}>
          {/* WhatsApp — gradient like Sign In button on Welcome screen */}
          <Pressable
            onPress={() => handleContact('https://wa.me/96179197997')}
            style={({ pressed }) => [styles.contactBtnWrap, pressed && styles.buttonPressed]}>
            <LinearGradient
              colors={['#FF2638', '#B11226', '#2A0308']}
              locations={[0, 0.58, 1]}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={styles.contactGradientBtn}>
              <View pointerEvents="none" style={styles.contactBtnGloss} />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </LinearGradient>
          </Pressable>
          {/* Phone — ghost outlined like Continue as Guest */}
          <Pressable
            onPress={() => handleContact('tel:+96179197997')}
            style={({ pressed }) => [styles.contactGhostBtn, pressed && styles.buttonPressed]}>
            <Text style={styles.contactGhostText}>Phone Call</Text>
          </Pressable>
        </View>
      </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeTop: { backgroundColor: 'transparent' },
  helpHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  helpEyebrow: {
    color: premiumColors.red,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  helpTitle: {
    color: premiumColors.text,
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 132,
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
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  // Sign-In gradient button (WhatsApp)
  contactBtnWrap: {
    flex: 1,
    borderRadius: 999,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 8,
  },
  contactGradientBtn: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
  },
  contactBtnGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  // Ghost outlined button (Phone) like Continue as Guest
  contactGhostBtn: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: 'rgba(255,35,55,0.78)',
    borderRadius: 999,
    backgroundColor: 'rgba(7,2,5,0.45)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  contactGhostText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
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
