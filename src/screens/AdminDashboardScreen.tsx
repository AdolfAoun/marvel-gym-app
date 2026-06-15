import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { authService } from '@/services';

const adminGroups = [
  {
    title: 'Member Operations',
    sections: [
      {
        description: 'Search members and manage mock membership details.',
        href: '/admin/members',
        title: 'Members',
      },
      {
        description: 'Confirm or cancel pending member vouchers.',
        href: '/admin/vouchers',
        title: 'Vouchers',
      },
      {
        description: 'Approve or reject student ID pricing requests.',
        href: '/admin/student-verification',
        title: 'Student Verification',
      },
    ],
  },
  {
    title: 'Gym Content',
    sections: [
      {
        description: 'Add, edit, remove, and schedule classes.',
        href: '/admin/classes',
        title: 'Classes',
      },
      {
        description: 'Manage shop product listings and availability.',
        href: '/admin/products',
        title: 'Shop Products',
      },
    ],
  },
  {
    title: 'App Display',
    sections: [
      {
        description: 'Manage Welcome Page carousel placeholders.',
        href: '/admin/photos',
        title: 'Welcome Photos',
      },
    ],
  },
] as const;

export default function AdminDashboardScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await authService.logoutMember();
    router.replace('/login');
  };

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.kicker}>Marvel Gym Staff</Text>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            Manage Marvel Gym app content, members, and verification requests.
          </Text>
          <Text style={styles.body}>
            Staff-only mock testing area for demo workflows. Real permissions,
            storage, and backend enforcement are still future work.
          </Text>
        </View>

        {adminGroups.map((group) => (
          <View key={group.title} style={styles.groupBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Admin tools</Text>
              <Text style={styles.sectionTitle}>{group.title}</Text>
            </View>
            <View style={styles.grid}>
              {group.sections.map((section) => (
                <Pressable
                  key={section.title}
                  onPress={() => router.push(section.href as Href)}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.buttonPressed,
                  ]}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>{section.title.slice(0, 1)}</Text>
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{section.title}</Text>
                    <Text style={styles.cardBody}>{section.description}</Text>
                  </View>
                  <Text style={styles.cardArrow}>Open</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.buttonPressed,
          ]}>
          <Text style={styles.logoutText}>Logout and return to login</Text>
        </Pressable>
      </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 42,
  },
  headerCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: 'rgba(18, 20, 28, 0.86)',
    padding: 22,
    ...premiumShadow,
  },
  kicker: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  title: {
    color: premiumColors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 39,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  body: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 12,
  },
  sectionHeader: {
    marginTop: 4,
  },
  groupBlock: {
    gap: 10,
  },
  sectionLabel: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: premiumColors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },
  grid: {
    gap: 12,
  },
  card: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    padding: 16,
    ...premiumShadow,
  },
  cardIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  cardIconText: {
    color: premiumColors.redBright,
    fontSize: 18,
    fontWeight: '900',
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  cardBody: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
  },
  cardArrow: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  logoutButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: premiumColors.red,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 5,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
