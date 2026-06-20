import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import {
  adminMemberService,
  authService,
  classService,
  entryContentService,
  productService,
  studentVerificationService,
  voucherService,
} from '@/services';

type StatKey =
  | 'members'
  | 'vouchers'
  | 'students'
  | 'classes'
  | 'products'
  | 'photos';

type AdminStats = {
  members: number;
  pendingVouchers: number;
  totalVouchers: number;
  pendingStudents: number;
  classes: number;
  products: number;
  outOfStock: number;
  photos: number;
};

type AdminSection = {
  title: string;
  description: string;
  href: string;
  statKey: StatKey;
};

type AdminGroup = {
  title: string;
  sections: AdminSection[];
};

const adminGroups: AdminGroup[] = [
  {
    title: 'Member Operations',
    sections: [
      {
        description: 'Search members and manage membership details.',
        href: '/admin/members',
        title: 'Members',
        statKey: 'members',
      },
      {
        description: 'Confirm or cancel pending member vouchers.',
        href: '/admin/vouchers',
        title: 'Vouchers',
        statKey: 'vouchers',
      },
      {
        description: 'Approve or reject student ID pricing requests.',
        href: '/admin/student-verification',
        title: 'Student Verification',
        statKey: 'students',
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
        statKey: 'classes',
      },
      {
        description: 'Manage shop product listings and availability.',
        href: '/admin/products',
        title: 'Shop Products',
        statKey: 'products',
      },
    ],
  },
  {
    title: 'App Display',
    sections: [
      {
        description: 'Manage Welcome Page carousel photos.',
        href: '/admin/photos',
        title: 'Welcome Photos',
        statKey: 'photos',
      },
    ],
  },
];

const quickStatTiles: { key: StatKey; label: string }[] = [
  { key: 'members', label: 'Members' },
  { key: 'vouchers', label: 'Pending vouchers' },
  { key: 'students', label: 'Student requests' },
  { key: 'classes', label: 'Active classes' },
  { key: 'products', label: 'Products' },
];

type Badge = { label: string; tone: 'neutral' | 'warn' | 'good' };

function getSectionBadge(statKey: StatKey, stats?: AdminStats): Badge {
  if (!stats) {
    return { label: '—', tone: 'neutral' };
  }

  switch (statKey) {
    case 'members':
      return { label: `${stats.members} total`, tone: 'neutral' };
    case 'vouchers':
      return stats.pendingVouchers > 0
        ? { label: `${stats.pendingVouchers} pending`, tone: 'warn' }
        : { label: `${stats.totalVouchers} total`, tone: 'neutral' };
    case 'students':
      return stats.pendingStudents > 0
        ? { label: `${stats.pendingStudents} pending`, tone: 'warn' }
        : { label: 'All clear', tone: 'good' };
    case 'classes':
      return { label: `${stats.classes} active`, tone: 'neutral' };
    case 'products':
      return stats.outOfStock > 0
        ? { label: `${stats.outOfStock} out of stock`, tone: 'warn' }
        : { label: `${stats.products} listed`, tone: 'neutral' };
    case 'photos':
      return { label: `${stats.photos} photos`, tone: 'neutral' };
    default:
      return { label: '—', tone: 'neutral' };
  }
}

function getQuickStatValue(statKey: StatKey, stats?: AdminStats): string {
  if (!stats) {
    return '—';
  }

  switch (statKey) {
    case 'members':
      return `${stats.members}`;
    case 'vouchers':
      return `${stats.pendingVouchers}`;
    case 'students':
      return `${stats.pendingStudents}`;
    case 'classes':
      return `${stats.classes}`;
    case 'products':
      return `${stats.products}`;
    case 'photos':
      return `${stats.photos}`;
    default:
      return '—';
  }
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>();
  const [query, setQuery] = useState('');
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadStats = async () => {
      const [members, pending, allVouchers, students, classes, products, photos] =
        await Promise.all([
          adminMemberService.searchMembers(''),
          voucherService.getPendingVouchers(),
          voucherService.getAllVouchers(),
          studentVerificationService.getStudentVerificationRequests(),
          classService.getAdminClasses(),
          productService.getAdminProducts(),
          entryContentService.getWelcomePhotos(),
        ]);

      if (!isActive) {
        return;
      }

      setStats({
        members: members.length,
        pendingVouchers: pending.length,
        totalVouchers: allVouchers.length,
        pendingStudents: students.filter(
          (request) => request.status === 'Pending Verification',
        ).length,
        classes: classes.length,
        products: products.length,
        outOfStock: products.filter((product) => !product.isAvailable).length,
        photos: photos.length,
      });
    };

    loadStats();

    return () => {
      isActive = false;
    };
  }, []);

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const filteredSections = useMemo(() => {
    if (!isSearching) {
      return [];
    }

    return adminGroups
      .flatMap((group) => group.sections)
      .filter(
        (section) =>
          section.title.toLowerCase().includes(trimmedQuery) ||
          section.description.toLowerCase().includes(trimmedQuery),
      );
  }, [isSearching, trimmedQuery]);

  const handleLogout = async () => {
    setIsLogoutVisible(false);
    await authService.logoutMember();
    router.replace('/login');
  };

  const renderSectionCard = (section: AdminSection) => {
    const badge = getSectionBadge(section.statKey, stats);

    return (
      <Pressable
        key={section.title}
        onPress={() => router.push(section.href as Href)}
        style={({ pressed }) => [styles.card, pressed && styles.buttonPressed]}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>{section.title.slice(0, 1)}</Text>
        </View>
        <View style={styles.cardCopy}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <View
              style={[
                styles.badge,
                badge.tone === 'warn' && styles.badgeWarn,
                badge.tone === 'good' && styles.badgeGood,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  badge.tone === 'warn' && styles.badgeTextWarn,
                  badge.tone === 'good' && styles.badgeTextGood,
                ]}>
                {badge.label}
              </Text>
            </View>
          </View>
          <Text style={styles.cardBody}>{section.description}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View pointerEvents="none" style={styles.headerGloss} />
          <Text style={styles.kicker}>Marvel Gym Staff</Text>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>
            Manage members, content, and verification requests.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statRail}>
            {quickStatTiles.map((tile) => {
              const isAlert =
                (tile.key === 'vouchers' && (stats?.pendingVouchers ?? 0) > 0) ||
                (tile.key === 'students' && (stats?.pendingStudents ?? 0) > 0);

              return (
                <View
                  key={tile.key}
                  style={[styles.statTile, isAlert && styles.statTileAlert]}>
                  <Text
                    style={[styles.statValue, isAlert && styles.statValueAlert]}>
                    {getQuickStatValue(tile.key, stats)}
                  </Text>
                  <Text style={styles.statLabel}>{tile.label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search admin tools"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable
              hitSlop={10}
              onPress={() => setQuery('')}
              style={({ pressed }) => [
                styles.searchClear,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {isSearching ? (
          <View style={styles.groupBlock}>
            <Text style={styles.sectionTitle}>
              {filteredSections.length} result
              {filteredSections.length === 1 ? '' : 's'}
            </Text>
            {filteredSections.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No matching tools</Text>
                <Text style={styles.emptyBody}>
                  Try a different keyword like &quot;members&quot; or
                  &quot;classes&quot;.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {filteredSections.map(renderSectionCard)}
              </View>
            )}
          </View>
        ) : (
          adminGroups.map((group) => (
            <View key={group.title} style={styles.groupBlock}>
              <View style={styles.sectionHeader}>
                <View style={styles.accentBar} />
                <Text style={styles.sectionTitle}>{group.title}</Text>
              </View>
              <View style={styles.grid}>
                {group.sections.map(renderSectionCard)}
              </View>
            </View>
          ))
        )}

        <Pressable
          onPress={() => setIsLogoutVisible(true)}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.buttonPressed,
          ]}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>

      <Modal transparent visible={isLogoutVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsLogoutVisible(false)}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.modalKicker}>Admin</Text>
            <Text style={styles.confirmTitle}>Log out of the admin panel?</Text>
            <Text style={styles.confirmBody}>
              You will return to the login screen.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setIsLogoutVisible(false)}
                style={({ pressed }) => [
                  styles.confirmSecondary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.confirmPrimary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmPrimaryText}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 42,
  },
  headerCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 28,
    backgroundColor: 'rgba(18, 20, 28, 0.78)',
    padding: 20,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
  headerGloss: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  kicker: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: premiumColors.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  statRail: {
    gap: 10,
    marginTop: 18,
    paddingRight: 4,
  },
  statTile: {
    minWidth: 104,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statTileAlert: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  statValueAlert: {
    color: '#F8C471',
  },
  statLabel: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.28)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  searchIcon: {
    color: premiumColors.redBright,
    fontSize: 20,
    fontWeight: '900',
  },
  searchInput: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 12,
  },
  searchClear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchClearText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  groupBlock: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accentBar: {
    width: 4,
    height: 20,
    borderRadius: 3,
    backgroundColor: premiumColors.redBright,
  },
  sectionTitle: {
    color: premiumColors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  grid: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 20,
    backgroundColor: premiumColors.surface,
    padding: 14,
    ...premiumShadow,
  },
  cardIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 14,
    backgroundColor: premiumColors.surfaceSoft,
  },
  cardIconText: {
    color: premiumColors.redBright,
    fontSize: 18,
    fontWeight: '900',
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  badgeGood: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
  },
  badgeText: {
    color: premiumColors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeTextWarn: {
    color: '#F8C471',
  },
  badgeTextGood: {
    color: '#74DFA0',
  },
  cardBody: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 16,
  },
  emptyTitle: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyBody: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
  },
  logoutButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.4)',
    borderRadius: 18,
    backgroundColor: 'rgba(177, 18, 38, 0.16)',
    marginTop: 6,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: premiumColors.surface,
    padding: 22,
    ...premiumShadow,
  },
  modalKicker: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  confirmTitle: {
    color: premiumColors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  confirmBody: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  confirmSecondary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  confirmSecondaryText: {
    color: premiumColors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  confirmPrimary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: premiumColors.red,
  },
  confirmPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
