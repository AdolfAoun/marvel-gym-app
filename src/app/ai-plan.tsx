import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumGlow, premiumShadow } from '@/constants/premiumTheme';
import { journeyService } from '@/services';
import type { JourneyProfile } from '@/types';

const accentColor = premiumColors.red;
const wineColor = premiumColors.redBright;
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'ai',
  text: "Hi! I'm your AI fitness assistant. Tell me about your goals, fitness level, or any injuries and I'll help tailor a training plan just for you. You can also update your About Me above so I have more context.",
};

export default function AIPlanScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<JourneyProfile>();
  const [biographyDraft, setBiographyDraft] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const chatScrollRef = useRef<ScrollView>(null);
  const msgCounterRef = useRef(0);

  useEffect(() => {
    journeyService.getJourneyProfile().then((p) => {
      setProfile(p);
      setBiographyDraft(p.biography);
      setIsLoading(false);
    });
  }, []);

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const next = await journeyService.updateJourneyProfile({
        biography: biographyDraft.trim(),
      });
      setProfile(next);
      setBiographyDraft(next.biography);
      setIsEditingBio(false);
    } finally {
      setIsSavingBio(false);
    }
  };

  const getMockAiReply = (userText: string, bio: string): string => {
    const lower = userText.toLowerCase();
    const bioLower = bio.toLowerCase();

    if (lower.includes('weight loss') || lower.includes('lose weight') || lower.includes('fat')) {
      return "For weight loss, I'd recommend a mix of cardio and strength training. Aim for 3–4 sessions per week: 2 strength days to preserve muscle, and 1–2 cardio days. Keep your nutrition in a moderate caloric deficit. Would you like a sample weekly split?";
    }
    if (lower.includes('muscle') || lower.includes('bulk') || lower.includes('strength')) {
      return "To build muscle, focus on progressive overload — gradually increasing weight or reps over time. A push/pull/legs or upper/lower split works great. Aim for 0.7–1g of protein per pound of bodyweight. Want me to suggest a routine based on your schedule?";
    }
    if (lower.includes('beginner') || lower.includes('start') || lower.includes('new')) {
      return "Welcome! For beginners, I suggest starting with 3 full-body sessions per week, leaving a rest day between each. Focus on compound movements: squats, deadlifts, bench press, rows, and overhead press. Master form before adding weight. Consistency beats intensity early on!";
    }
    if (lower.includes('injury') || lower.includes('back') || lower.includes('knee')) {
      return "When training around an injury, always get medical clearance first. Focus on what you CAN do — if it's a lower back issue, prioritize upper body and controlled core work. Avoid movements that cause pain. Physical therapy exercises can be a great complement to gym training.";
    }
    if (lower.includes('cardio') || lower.includes('endurance') || lower.includes('run')) {
      return "For cardio and endurance, mix steady-state cardio (like 30-min runs at 60–70% max HR) with HIIT intervals for efficiency. 2–3 cardio sessions per week alongside strength training is a solid foundation. What's your current fitness level and goal time frame?";
    }
    if (bio && bioLower.length > 10) {
      return `Based on your profile ("${bio.slice(0, 60)}${bio.length > 60 ? '…' : ''}"), I can see you have specific goals. I'd suggest building a plan around those priorities. Could you tell me more about how many days per week you're able to train?`;
    }
    return "That's a great starting point! To give you the best tailored plan, could you share: (1) How many days per week you can train? (2) Your main goal — strength, fat loss, or endurance? (3) Any equipment limitations or injuries I should know about?";
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isAiTyping) return;

    msgCounterRef.current += 1;
    const userMsg: ChatMessage = {
      id: `user-${msgCounterRef.current}`,
      role: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsAiTyping(true);

    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    setTimeout(() => {
      msgCounterRef.current += 1;
      const aiMsg: ChatMessage = {
        id: `ai-${msgCounterRef.current}`,
        role: 'ai',
        text: getMockAiReply(text, profile?.biography ?? ''),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsAiTyping(false);
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }, 1200 + Math.random() * 800);
  };

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerEyebrow}>AI Planner</Text>
            <Text style={styles.headerTitle}>Tailor Your Plan</Text>
          </View>
          <View style={styles.headerSparkle}>
            <Text style={styles.headerSparkleText}>✦</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* About Me section */}
          <View style={styles.aboutCard}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(177,18,38,0.10)', 'rgba(255,255,255,0.03)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.aboutCardHeader}>
              <View style={styles.aboutCardHeaderText}>
                <Text style={styles.aboutLabel}>About Me</Text>
                <Text style={styles.aboutTitle}>Training note</Text>
                <Text style={styles.aboutSubtitle}>
                  This helps the AI tailor advice to your body, goals and injuries.
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (isEditingBio) {
                    handleSaveBio();
                  } else {
                    setIsEditingBio(true);
                  }
                }}
                disabled={isSavingBio}
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
                <Text style={styles.editBtnText}>
                  {isSavingBio ? '...' : isEditingBio ? 'Save' : 'Edit'}
                </Text>
              </Pressable>
            </View>

            {isEditingBio ? (
              <TextInput
                multiline
                autoFocus
                value={biographyDraft}
                onChangeText={setBiographyDraft}
                placeholder="Example: 28 years old, building lean strength, training 4 days weekly, protecting my lower back."
                placeholderTextColor="#9AA3AF"
                selectionColor={accentColor}
                style={styles.bioInput}
              />
            ) : (
              <Text style={styles.bioText}>
                {profile?.biography || 'Tap Edit to add your training note.'}
              </Text>
            )}
          </View>

          {/* Chat section heading */}
          <View style={styles.chatHeading}>
            <View style={styles.chatAccentBar} />
            <View>
              <Text style={styles.chatEyebrow}>AI Assistant</Text>
              <Text style={styles.chatHeadingTitle}>Chat to build your plan</Text>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled>
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                ]}>
                {msg.role === 'ai' && (
                  <View style={styles.aiBubbleAccent}>
                    <Text style={styles.aiBubbleAccentText}>✦</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAi,
                  ]}>
                  {msg.text}
                </Text>
              </View>
            ))}
            {isAiTyping && (
              <View style={[styles.bubble, styles.bubbleAi]}>
                <View style={styles.aiBubbleAccent}>
                  <Text style={styles.aiBubbleAccentText}>✦</Text>
                </View>
                <Text style={styles.typingDots}>• • •</Text>
              </View>
            )}
          </ScrollView>

          {/* Chat input */}
          <View style={styles.inputRow}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your training plan..."
              placeholderTextColor={mutedColor}
              selectionColor={accentColor}
              style={styles.chatInput}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              multiline
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isAiTyping}
              style={({ pressed }) => [
                styles.sendBtn,
                (!inputText.trim() || isAiTyping) && styles.sendBtnDisabled,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.sendBtnText}>›</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeTop: { backgroundColor: 'transparent' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  headerTextBlock: { flex: 1 },
  headerEyebrow: {
    color: wineColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: textColor,
    fontSize: 22,
    fontWeight: '900',
  },
  headerSparkle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(138,43,226,0.35)',
    borderRadius: 20,
    backgroundColor: 'rgba(138,43,226,0.12)',
  },
  headerSparkleText: {
    color: '#C084FC',
    fontSize: 16,
    fontWeight: '900',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // About Me card
  aboutCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 26,
    backgroundColor: 'rgba(18,20,28,0.86)',
    padding: 18,
    marginBottom: 22,
    ...premiumShadow,
  },
  aboutCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  aboutCardHeaderText: { flex: 1 },
  aboutLabel: {
    color: wineColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  aboutTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  aboutSubtitle: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  editBtn: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 16,
  },
  editBtnText: {
    color: wineColor,
    fontSize: 12,
    fontWeight: '900',
  },
  bioInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(177,18,38,0.18)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
    color: textColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    padding: 14,
    textAlignVertical: 'top',
  },
  bioText: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },

  // Chat heading
  chatHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  chatAccentBar: {
    width: 4,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#C084FC',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  chatEyebrow: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chatHeadingTitle: {
    color: textColor,
    fontSize: 21,
    fontWeight: '900',
  },

  // Chat scroll
  chatScroll: {
    maxHeight: 420,
    marginBottom: 14,
  },
  chatContent: {
    gap: 12,
    paddingBottom: 4,
  },

  // Bubbles
  bubble: {
    maxWidth: '88%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: accentColor,
    borderBottomRightRadius: 6,
    ...premiumGlow,
  },
  bubbleAi: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.22)',
    backgroundColor: 'rgba(30,20,50,0.86)',
    borderBottomLeftRadius: 6,
  },
  aiBubbleAccent: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(192,132,252,0.22)',
    marginTop: 1,
    flexShrink: 0,
  },
  aiBubbleAccentText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '900',
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    flex: 1,
  },
  bubbleTextUser: { color: '#FFFFFF' },
  bubbleTextAi: { color: textColor },
  typingDots: {
    color: '#C084FC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    flex: 1,
  },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.22)',
    borderRadius: 22,
    backgroundColor: 'rgba(18,20,28,0.86)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...premiumShadow,
  },
  chatInput: {
    flex: 1,
    color: textColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    maxHeight: 100,
    padding: 0,
  },
  sendBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: accentColor,
    ...premiumGlow,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  pressed: { opacity: 0.75 },
});
