import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const accentColor = '#B11226';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.phoneFrame}>
        <View style={styles.heroArea}>
          <View pointerEvents="none" style={styles.heroRedField} />
          <View pointerEvents="none" style={styles.heroGlowPrimary} />
          <View pointerEvents="none" style={styles.heroGlowDark} />
          <View pointerEvents="none" style={styles.heroRing} />
          <View pointerEvents="none" style={styles.athleticSlashOne} />
          <View pointerEvents="none" style={styles.athleticSlashTwo} />
          <Image
            source={require('@/assets/images/prototype-three-finger-back-pose-background.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View pointerEvents="none" style={styles.imageRedWash} />
          <View pointerEvents="none" style={styles.heroVeil} />
          <View pointerEvents="none" style={styles.heroLowerFade} />
          <View style={styles.logoBlock}>
            <View style={styles.logoGlow} />
            <Image
              source={require('@/assets/images/marvel-logo-transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>Marvel Fitness and Health</Text>
            <Text style={styles.title}>Your gym, ready when you are.</Text>
            <Text style={styles.subtitle}>
              Premium member access for training, shop essentials, and progress.
            </Text>
          </View>
        </View>

        <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.actionPanel}>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [
              styles.guestButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    backgroundColor: '#080809',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 414 : undefined,
    overflow: 'hidden',
    backgroundColor: '#090A0E',
    borderColor: Platform.OS === 'web' ? '#1d2733' : 'transparent',
    borderRadius: Platform.OS === 'web' ? 34 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    marginVertical: Platform.OS === 'web' ? 22 : 0,
  },
  heroArea: {
    flex: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: '#141016',
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  heroRedField: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A0B10',
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -130,
    right: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F43F5E',
    opacity: 0.24,
  },
  heroGlowDark: {
    position: 'absolute',
    left: -150,
    bottom: 36,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#180207',
    opacity: 0.48,
  },
  heroRing: {
    position: 'absolute',
    right: -42,
    bottom: 148,
    width: 190,
    height: 190,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 95,
  },
  athleticSlashOne: {
    position: 'absolute',
    top: 44,
    right: -84,
    width: 132,
    height: 540,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '24deg' }],
  },
  athleticSlashTwo: {
    position: 'absolute',
    top: 120,
    right: 66,
    width: 38,
    height: 260,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    transform: [{ rotate: '24deg' }],
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.62,
    transform: [{ scale: 1.06 }],
  },
  imageRedWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(177, 18, 38, 0.14)',
  },
  heroVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  heroLowerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    backgroundColor: 'rgba(10, 7, 10, 0.78)',
  },
  logoBlock: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 44 : 64,
    left: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.52,
    shadowRadius: 26,
  },
  logo: {
    width: 92,
    height: 92,
  },
  heroCopy: {
    maxWidth: 320,
  },
  kicker: {
    color: '#F7D6DC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
  },
  subtitle: {
    color: '#E8ECF2',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 12,
  },
  actionPanel: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFDFD',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -18,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 24,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: -14 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  guestButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.24)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.64)',
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  guestButtonText: {
    color: '#58111B',
    fontSize: 15,
    fontWeight: '900',
  },
  signInButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
