import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  classService,
  entryContentService,
  productService,
  studentVerificationService,
  voucherService,
  FREEZE_WEEKLY_PRICE,
} from '@/services';
import type {
  AdminMemberSummary,
  ClassMutationInput,
  EntrySlide,
  ProductMutationInput,
  StudentVerificationWithMember,
} from '@/services';
import type {
  ClassCategory,
  GymClass,
  Member,
  MembershipStatus,
  Product,
  ProductCategory,
  StudentVerificationStatus,
  Voucher,
} from '@/types';

const statusOptions: MembershipStatus[] = [
  'Active',
  'Expired',
  'Frozen',
  'Suspended',
  'Pending Approval',
];
const productCategories: ProductCategory[] = ['Gym Equipment', 'Beverages', 'Snacks'];
const classCategories: ClassCategory[] = [
  'Fitness Classes',
  'Martial Arts',
  'Gymnastics',
  'Extra Classes',
];
const voucherStatusOrder = ['Pending', 'Confirmed', 'Canceled'] as const;
const defaultClassStart = '2026-06-15T18:00:00.000Z';
const studentStatusFilters: StudentVerificationStatus[] = [
  'Pending Verification',
  'Confirmed',
  'Rejected',
];
type ClassFilter = 'All' | 'Today' | 'Upcoming' | 'Available' | 'Full';
type ClassCategoryFilter = 'All' | ClassCategory;
type ProductCategoryFilter = 'All' | ProductCategory;
type ProductAvailabilityFilter = 'All' | 'Available' | 'Unavailable';

type ConfirmAction = {
  body: string;
  onConfirm: () => Promise<void>;
  title: string;
};

type ClassForm = {
  capacity: string;
  instructorName: string;
  instructorImageUri: string;
  category: ClassCategory;
  startTime: string;
  status: GymClass['status'];
  title: string;
};

const classStatusOptions: GymClass['status'][] = ['Available', 'Full', 'Upcoming'];

// Admin start-time field is a simple 24-hour HH:MM value; convert to/from the
// ISO datetime the service layer stores.
function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function timeToIso(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());

  if (!match) {
    return defaultClassStart;
  }

  const hours = Math.min(23, Number(match[1]));
  const minutes = Math.min(59, Number(match[2]));
  const base = new Date(defaultClassStart);

  base.setHours(hours, minutes, 0, 0);

  return base.toISOString();
}

function isoToTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

type ProductForm = {
  category: ProductCategory;
  description: string;
  isAvailable: boolean;
  name: string;
  price: string;
  imageUri: string;
};

// Opens the device gallery and returns a local image URI (frontend-only mock
// storage). Returns undefined if permission is denied or the user cancels.
async function pickImageFromLibrary(): Promise<string | undefined> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return undefined;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled) {
    return undefined;
  }

  return result.assets[0].uri;
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function getStatusColor(status: string) {
  if (status === 'Active' || status === 'Available' || status === 'Confirmed') {
    return '#22C55E';
  }

  if (
    status === 'Frozen' ||
    status === 'Pending' ||
    status === 'Pending Approval' ||
    status === 'Pending Verification' ||
    status === 'Upcoming'
  ) {
    return '#F59E0B';
  }

  return '#EF4444';
}

function StatusChip({ label }: { label: string }) {
  const color = getStatusColor(label);

  return (
    <View
      style={[
        styles.statusChip,
        {
          backgroundColor: `${color}1A`,
          borderColor: `${color}55`,
        },
      ]}>
      <Text style={[styles.statusChipText, { color }]}>{label}</Text>
    </View>
  );
}

function toClassInput(form: ClassForm): ClassMutationInput {
  return {
    capacity: Number(form.capacity) || 12,
    instructorName: form.instructorName.trim() || 'Coach',
    instructorImageUrl: form.instructorImageUri.trim() || undefined,
    category: form.category,
    startTime: timeToIso(form.startTime),
    status: form.status,
    title: form.title.trim() || 'New Class',
  };
}

function toProductInput(form: ProductForm): ProductMutationInput {
  return {
    category: form.category,
    description: form.description.trim(),
    isAvailable: form.isAvailable,
    name: form.name.trim() || 'New Product',
    price: Number(form.price) || 0,
    imageUrl: form.imageUri.trim() || undefined,
  };
}

function getClassForm(gymClass?: GymClass): ClassForm {
  return {
    capacity: gymClass ? String(gymClass.capacity) : '0',
    instructorName: gymClass?.instructorName ?? '',
    instructorImageUri: gymClass?.instructorImageUrl ?? '',
    category: gymClass?.category ?? classCategories[0],
    startTime: gymClass ? isoToTime(gymClass.startTime) : '',
    status: gymClass?.status ?? 'Available',
    title: gymClass?.title ?? '',
  };
}

function getProductForm(product?: Product): ProductForm {
  return {
    category: product?.category ?? productCategories[0],
    description: product?.description ?? '',
    isAvailable: product?.isAvailable ?? true,
    name: product?.name ?? '',
    price: String(product?.price ?? 0),
    imageUri: product?.imageUrl ?? '',
  };
}

function AdminShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  const router = useRouter();

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={styles.kicker}>Admin</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        {children}
      </ScrollView>
    </PremiumScreenBackground>
  );
}

function ConfirmModal({
  action,
  onClose,
}: {
  action?: ConfirmAction;
  onClose: () => void;
}) {
  const [isWorking, setIsWorking] = useState(false);

  return (
    <Modal transparent visible={Boolean(action)} animationType="fade">
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.confirmCard}>
          <Text style={styles.kicker}>Confirm</Text>
          <Text style={styles.modalTitle}>{action?.title}</Text>
          <Text style={styles.modalBody}>{action?.body}</Text>
          <View style={styles.modalRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={isWorking}
              onPress={async () => {
                if (!action) {
                  return;
                }

                setIsWorking(true);
                await action.onConfirm();
                setIsWorking(false);
                onClose();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !isWorking && styles.buttonPressed,
              ]}>
              {isWorking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Apply</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminMemberManagementScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [foundMember, setFoundMember] = useState<Member>();
  const [summary, setSummary] = useState<AdminMemberSummary>();
  const [months, setMonths] = useState(1);
  const [weeks, setWeeks] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus>('Active');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>();

  const refreshSummary = useCallback(async (memberId: string) => {
    const nextSummary = await adminMemberService.getAdminMemberSummary(memberId);

    setSummary(nextSummary);
  }, []);

  useEffect(() => {
    let isActive = true;

    adminMemberService.searchMembers(query).then((members) => {
      if (isActive) {
        setResults(members);
      }
    });

    return () => {
      isActive = false;
    };
  }, [query]);

  const selectMember = useCallback(
    async (member: Member) => {
      setFoundMember(member);
      setSummary(undefined);
      await refreshSummary(member.id);
    },
    [refreshSummary],
  );

  const selectedMemberId = foundMember?.id;

  return (
    <AdminShell
      title="Member Management"
      subtitle="Search members and manage mock membership state.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Member directory</Text>
        <Text style={styles.bodyText}>
          Search the mock member directory by name or phone number, then tap a
          member to manage their membership.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or phone"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.searchInput}
        />
        {results.length === 0 ? (
          <Text style={styles.helperText}>No members match this search.</Text>
        ) : (
          results.map((member) => {
            const selected = member.id === selectedMemberId;

            return (
              <Pressable
                key={member.id}
                onPress={() => selectMember(member)}
                style={[
                  styles.selectableRow,
                  selected && styles.selectableRowSelected,
                ]}>
                <View style={styles.adminAvatar}>
                  <Text style={styles.adminAvatarText}>
                    {member.firstName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>
                    {member.firstName} {member.lastName}
                  </Text>
                  <Text style={styles.helperText}>{member.phone}</Text>
                </View>
                {selected ? (
                  <Text style={styles.selectedTag}>Selected</Text>
                ) : null}
              </Pressable>
            );
          })
        )}
        <Text style={styles.helperText}>
          TODO: Real admin permissions and authority checks must later be enforced by backend/Gmind.
        </Text>
      </View>

      {summary ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Member Details</Text>
            <Text style={styles.cardTitle}>
              {summary.member.firstName} {summary.member.lastName}
            </Text>
            <Text style={styles.bodyText}>Phone: {summary.member.phone}</Text>
            <Text style={styles.bodyText}>Email: {summary.member.email || '-'}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.sectionLabel}>Membership Status</Text>
                <Text style={styles.cardTitle}>Current plan</Text>
              </View>
              <StatusChip label={summary.membership.status} />
            </View>
            <Text style={styles.bodyText}>Start: {formatDate(summary.membership.startDate)}</Text>
            <Text style={styles.bodyText}>End: {formatDate(summary.membership.endDate)}</Text>
            <Text style={styles.bodyText}>Remaining: {summary.remainingDays} days</Text>
            <Text style={styles.bodyText}>
              Frozen until: {formatDate(summary.membership.frozenUntil)}
            </Text>
            <Text style={styles.bodyText}>
              Pending vouchers: {summary.pendingVouchersCount}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.sectionLabel}>Student Verification Status</Text>
                <Text style={styles.cardTitle}>Student pricing</Text>
              </View>
              <StatusChip label={summary.studentVerification?.status ?? 'Not Submitted'} />
            </View>
            <Text style={styles.bodyText}>
              {summary.studentVerification?.status === 'Confirmed'
                ? 'Student confirmed. Renewal pricing is $70/month.'
                : summary.studentVerification?.status === 'Pending Verification'
                  ? 'Student ID is pending admin approval.'
                  : summary.studentVerification?.status === 'Rejected'
                    ? 'Student proof was rejected.'
                    : 'No student ID has been submitted.'}
            </Text>
            {summary.studentVerification?.submittedAt ? (
              <Text style={styles.helperText}>
                Submitted: {formatDate(summary.studentVerification.submittedAt)}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Membership Actions</Text>
            <Text style={styles.cardTitle}>Extend, freeze, or update status</Text>
            <Text style={styles.fieldLabel}>Extend membership</Text>
            <View style={styles.pillRow}>
              {[1, 3, 6, 12].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMonths(value)}
                  style={[styles.pill, months === value && styles.pillSelected]}>
                  <Text style={[styles.pillText, months === value && styles.pillTextSelected]}>
                    {value} mo
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={!selectedMemberId}
              onPress={() =>
                selectedMemberId &&
                setConfirmAction({
                  title: 'Extend membership?',
                  body: `Add ${months} month${months > 1 ? 's' : ''} to this membership.`,
                  onConfirm: async () => {
                    await adminMemberService.extendMembership(selectedMemberId, months);
                    await refreshSummary(selectedMemberId);
                  },
                })
              }
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Extend</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>
              Freeze membership: ${weeks * FREEZE_WEEKLY_PRICE}.00 total
            </Text>
            <View style={styles.pillRow}>
              {[1, 4, 8, 12].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setWeeks(value)}
                  style={[styles.pill, weeks === value && styles.pillSelected]}>
                  <Text style={[styles.pillText, weeks === value && styles.pillTextSelected]}>
                    {value} wk
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={!selectedMemberId}
              onPress={() =>
                selectedMemberId &&
                setConfirmAction({
                  title: 'Freeze membership?',
                  body: `Freeze this membership for ${weeks} week${weeks > 1 ? 's' : ''}.`,
                  onConfirm: async () => {
                    await adminMemberService.freezeMembershipForMember(selectedMemberId, weeks);
                    await refreshSummary(selectedMemberId);
                  },
                })
              }
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Freeze</Text>
            </Pressable>

            <Pressable
              disabled={!selectedMemberId}
              onPress={() =>
                selectedMemberId &&
                setConfirmAction({
                  title: 'Unfreeze membership?',
                  body: 'Set this membership back to Active.',
                  onConfirm: async () => {
                    await adminMemberService.unfreezeMembershipForMember(selectedMemberId);
                    await refreshSummary(selectedMemberId);
                  },
                })
              }
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Unfreeze</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Change status</Text>
            <View style={styles.pillRow}>
              {statusOptions.map((status) => (
                <Pressable
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                  style={[styles.pill, selectedStatus === status && styles.pillSelected]}>
                  <Text
                    style={[
                      styles.pillText,
                      selectedStatus === status && styles.pillTextSelected,
                    ]}>
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={!selectedMemberId}
              onPress={() =>
                selectedMemberId &&
                setConfirmAction({
                  title: 'Change status?',
                  body: `Set membership status to ${selectedStatus}.`,
                  onConfirm: async () => {
                    await adminMemberService.changeMembershipStatus(
                      selectedMemberId,
                      selectedStatus,
                    );
                    await refreshSummary(selectedMemberId);
                  },
                })
              }
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Apply Status</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Vouchers</Text>
            <Text style={styles.cardTitle}>Member voucher requests</Text>
            {summary.vouchers.length === 0 ? (
              <Text style={styles.helperText}>No vouchers for this member.</Text>
            ) : (
              summary.vouchers.map((voucher) => (
                <View key={voucher.id} style={styles.compactVoucherRow}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{voucher.type}</Text>
                    <Text style={styles.helperText}>
                      {voucher.currency} {voucher.amount.toFixed(2)} - {formatDate(voucher.date)}
                    </Text>
                  </View>
                  <StatusChip label={voucher.status} />
                </View>
              ))
            )}
          </View>
        </>
      ) : null}

      <ConfirmModal action={confirmAction} onClose={() => setConfirmAction(undefined)} />
    </AdminShell>
  );
}

export function AdminVoucherManagementScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedVoucherStatus, setSelectedVoucherStatus] =
    useState<Voucher['status']>('Pending');
  const [search, setSearch] = useState('');

  const loadVouchers = useCallback(async () => {
    setVouchers(await voucherService.getAllVouchers());
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  return (
    <AdminShell title="Voucher Management" subtitle="Confirm or cancel demo vouchers.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status filters</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by voucher type or description"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.searchInput}
        />
        <View style={styles.pillRow}>
          {voucherStatusOrder.map((status) => {
            const selected = selectedVoucherStatus === status;
            const count = vouchers.filter((voucher) => voucher.status === status).length;

            return (
              <Pressable
                key={status}
                onPress={() => setSelectedVoucherStatus(status)}
                style={[styles.pill, selected && styles.pillSelected]}>
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {status} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {voucherStatusOrder.map((status) => {
        if (status !== selectedVoucherStatus) {
          return null;
        }

        const normalizedVoucherSearch = search.trim().toLowerCase();
        const statusVouchers = vouchers.filter((voucher) => {
          if (voucher.status !== status) {
            return false;
          }

          if (!normalizedVoucherSearch) {
            return true;
          }

          return `${voucher.type} ${voucher.description}`
            .toLowerCase()
            .includes(normalizedVoucherSearch);
        });

        return (
          <View key={status} style={styles.card}>
            <Text style={styles.cardTitle}>{status}</Text>
            {statusVouchers.length === 0 ? (
              <Text style={styles.helperText}>
                {normalizedVoucherSearch
                  ? `No ${status.toLowerCase()} vouchers match this search.`
                  : `No ${status.toLowerCase()} vouchers.`}
              </Text>
            ) : (
              statusVouchers.map((voucher) => (
                <View key={voucher.id} style={styles.rowCard}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{voucher.type}</Text>
                    <Text style={styles.bodyText}>{voucher.description}</Text>
                    <Text style={styles.helperText}>
                      {voucher.currency} {voucher.amount.toFixed(2)} · {formatDate(voucher.date)}
                    </Text>
                  </View>
                  {voucher.status === 'Pending' ? (
                    <View style={styles.actionStack}>
                      <Pressable
                        onPress={async () => {
                          await voucherService.confirmVoucher(voucher.id);
                          await loadVouchers();
                        }}
                        style={styles.tinyPrimary}>
                        <Text style={styles.tinyPrimaryText}>Confirm</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          await voucherService.cancelVoucher(voucher.id);
                          await loadVouchers();
                        }}
                        style={styles.tinySecondary}>
                        <Text style={styles.tinySecondaryText}>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        );
      })}
    </AdminShell>
  );
}

export function AdminClassManagementScreen() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [classCategoryFilter, setClassCategoryFilter] =
    useState<ClassCategoryFilter>('All');
  const [classFilter, setClassFilter] = useState<ClassFilter>('All');
  const [search, setSearch] = useState('');
  const [editingClass, setEditingClass] = useState<GymClass>();
  const [form, setForm] = useState<ClassForm>(getClassForm());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>();

  const loadClasses = useCallback(async () => {
    setClasses(await classService.getAdminClasses());
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const resetForm = () => {
    setEditingClass(undefined);
    setForm(getClassForm());
  };

  const saveClass = async () => {
    if (editingClass) {
      await classService.updateAdminClass(editingClass.id, toClassInput(form));
    } else {
      await classService.createAdminClass(toClassInput(form));
    }

    resetForm();
    await loadClasses();
  };

  const handlePickInstructorImage = async () => {
    const uri = await pickImageFromLibrary();

    if (uri) {
      setForm((current) => ({ ...current, instructorImageUri: uri }));
    }
  };

  const normalizedClassSearch = search.trim().toLowerCase();
  const filteredClasses = classes.filter((gymClass) => {
    if (classCategoryFilter !== 'All' && gymClass.category !== classCategoryFilter) {
      return false;
    }

    if (normalizedClassSearch) {
      const haystack = `${gymClass.title} ${gymClass.instructorName} ${
        gymClass.category
      }`.toLowerCase();

      if (!haystack.includes(normalizedClassSearch)) {
        return false;
      }
    }

    const startDate = new Date(gymClass.startTime);
    const today = new Date();
    const isToday =
      startDate.getFullYear() === today.getFullYear() &&
      startDate.getMonth() === today.getMonth() &&
      startDate.getDate() === today.getDate();

    if (classFilter === 'Today') {
      return isToday;
    }

    if (classFilter === 'Upcoming') {
      return startDate.getTime() >= Date.now();
    }

    if (classFilter === 'Available' || classFilter === 'Full') {
      return gymClass.status === classFilter;
    }

    return true;
  });

  return (
    <AdminShell title="Class Management" subtitle="Manage mock class schedule data.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Class filters</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by class, coach, or category"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.searchInput}
        />
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pillRow}>
          {(['All', ...classCategories] as ClassCategoryFilter[]).map((filter) => {
            const count =
              filter === 'All'
                ? classes.length
                : classes.filter((gymClass) => gymClass.category === filter).length;

            return (
              <Pressable
                key={filter}
                onPress={() => setClassCategoryFilter(filter)}
                style={[
                  styles.pill,
                  classCategoryFilter === filter && styles.pillSelected,
                ]}>
                <Text
                  style={[
                    styles.pillText,
                    classCategoryFilter === filter && styles.pillTextSelected,
                  ]}>
                  {filter} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.fieldLabel}>Schedule & status</Text>
        <View style={styles.pillRow}>
          {(['All', 'Today', 'Upcoming', 'Available', 'Full'] as ClassFilter[]).map(
            (filter) => (
              <Pressable
                key={filter}
                onPress={() => setClassFilter(filter)}
                style={[styles.pill, classFilter === filter && styles.pillSelected]}>
                <Text
                  style={[
                    styles.pillText,
                    classFilter === filter && styles.pillTextSelected,
                  ]}>
                  {filter}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      </View>

      <View style={[styles.card, editingClass ? styles.cardEditing : styles.cardCreating]}>
        <View style={styles.formHeader}>
          <Text style={styles.formModeKicker}>
            {editingClass ? 'Editing class' : 'Creating class'}
          </Text>
          <Text style={styles.cardTitle}>
            {editingClass ? editingClass.title : 'New class'}
          </Text>
        </View>

        <Text style={styles.formSectionLabel}>Class details</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Class name</Text>
          <TextInput
            value={form.title}
            onChangeText={(title) => setForm((current) => ({ ...current, title }))}
            placeholder="e.g. Morning Strength"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Instructor</Text>
          <TextInput
            value={form.instructorName}
            onChangeText={(instructorName) =>
              setForm((current) => ({ ...current, instructorName }))
            }
            placeholder="e.g. Steve Rogers"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Instructor profile picture</Text>
          <View style={styles.imagePreviewBox}>
            {form.instructorImageUri ? (
              <Image
                source={{ uri: form.instructorImageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.imagePlaceholderText}>
                No instructor photo selected
              </Text>
            )}
          </View>
          <View style={styles.pillRow}>
            <Pressable onPress={handlePickInstructorImage} style={styles.compactPrimary}>
              <Text style={styles.primaryButtonText}>
                {form.instructorImageUri ? 'Change photo' : 'Upload photo'}
              </Text>
            </Pressable>
            {form.instructorImageUri ? (
              <Pressable
                onPress={() =>
                  setForm((current) => ({ ...current, instructorImageUri: '' }))
                }
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.pillRow}>
            {classCategories.map((category) => (
              <Pressable
                key={category}
                onPress={() => setForm((current) => ({ ...current, category }))}
                style={[styles.pill, form.category === category && styles.pillSelected]}>
                <Text
                  style={[
                    styles.pillText,
                    form.category === category && styles.pillTextSelected,
                  ]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.formSectionLabel}>Schedule</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Start time</Text>
          <TextInput
            value={form.startTime}
            onChangeText={(value) =>
              setForm((current) => ({ ...current, startTime: formatTimeInput(value) }))
            }
            placeholder="HH:MM"
            placeholderTextColor={premiumColors.textFaint}
            keyboardType="number-pad"
            maxLength={5}
            style={styles.input}
          />
          <Text style={styles.fieldHint}>24-hour time, e.g. 18:30</Text>
        </View>

        <Text style={styles.formSectionLabel}>Availability & capacity</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Availability</Text>
          <View style={styles.pillRow}>
            {classStatusOptions.map((status) => (
              <Pressable
                key={status}
                onPress={() => setForm((current) => ({ ...current, status }))}
                style={[styles.pill, form.status === status && styles.pillSelected]}>
                <Text
                  style={[styles.pillText, form.status === status && styles.pillTextSelected]}>
                  {status}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Capacity</Text>
          <TextInput
            value={form.capacity}
            onChangeText={(capacity) => setForm((current) => ({ ...current, capacity }))}
            placeholder="0"
            placeholderTextColor={premiumColors.textFaint}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.formActions}>
          <Pressable
            onPress={resetForm}
            style={[styles.secondaryButton, styles.formActionButton]}>
            <Text style={styles.secondaryButtonText}>
              {editingClass ? 'Cancel' : 'Clear'}
            </Text>
          </Pressable>
          <Pressable
            onPress={saveClass}
            style={[styles.primaryButton, styles.formActionButton]}>
            <Text style={styles.primaryButtonText}>
              {editingClass ? 'Save changes' : 'Add class'}
            </Text>
          </Pressable>
        </View>
      </View>

      {filteredClasses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.cardTitle}>No classes found</Text>
          <Text style={styles.helperText}>Try a different class filter.</Text>
        </View>
      ) : (
        filteredClasses.map((gymClass) => (
          <View key={gymClass.id} style={styles.rowCard}>
          <View style={styles.adminAvatar}>
            {gymClass.instructorImageUrl ? (
              <Image
                source={{ uri: gymClass.instructorImageUrl }}
                style={styles.adminAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.adminAvatarText}>
                {gymClass.instructorName.slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{gymClass.title}</Text>
            <Text style={styles.bodyText}>Coach {gymClass.instructorName}</Text>
            <View style={styles.pillRow}>
              <StatusChip label={gymClass.status} />
            </View>
            <Text style={styles.helperText}>
              {formatDateTime(gymClass.startTime)} · {gymClass.category} · {gymClass.status}
            </Text>
          </View>
          <View style={styles.actionStack}>
            <Pressable
              onPress={() => {
                setEditingClass(gymClass);
                setForm(getClassForm(gymClass));
              }}
              style={styles.tinyPrimary}>
              <Text style={styles.tinyPrimaryText}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setConfirmAction({
                  title: 'Delete class?',
                  body: `Remove ${gymClass.title} from the mock class schedule.`,
                  onConfirm: async () => {
                    await classService.deleteAdminClass(gymClass.id);
                    await loadClasses();
                  },
                })
              }
              style={styles.tinySecondary}>
              <Text style={styles.tinySecondaryText}>Delete</Text>
            </Pressable>
          </View>
          </View>
        ))
      )}

      <ConfirmModal action={confirmAction} onClose={() => setConfirmAction(undefined)} />
    </AdminShell>
  );
}

export function AdminProductManagementScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategoryFilter, setProductCategoryFilter] =
    useState<ProductCategoryFilter>('All');
  const [productAvailabilityFilter, setProductAvailabilityFilter] =
    useState<ProductAvailabilityFilter>('All');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product>();
  const [form, setForm] = useState<ProductForm>(getProductForm());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>();

  const loadProducts = useCallback(async () => {
    setProducts(await productService.getAdminProducts());
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const resetForm = () => {
    setEditingProduct(undefined);
    setForm(getProductForm());
  };

  const saveProduct = async () => {
    if (editingProduct) {
      await productService.updateProduct(editingProduct.id, toProductInput(form));
    } else {
      await productService.createProduct(toProductInput(form));
    }

    resetForm();
    await loadProducts();
  };

  const handlePickProductImage = async () => {
    const uri = await pickImageFromLibrary();

    if (uri) {
      setForm((current) => ({ ...current, imageUri: uri }));
    }
  };

  const normalizedProductSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    if (normalizedProductSearch) {
      const haystack = `${product.name} ${product.description ?? ''} ${
        product.category ?? ''
      }`.toLowerCase();

      if (!haystack.includes(normalizedProductSearch)) {
        return false;
      }
    }

    if (
      productCategoryFilter !== 'All' &&
      product.category !== productCategoryFilter
    ) {
      return false;
    }

    if (productAvailabilityFilter === 'Available') {
      return product.isAvailable;
    }

    if (productAvailabilityFilter === 'Unavailable') {
      return !product.isAvailable;
    }

    return true;
  });

  return (
    <AdminShell title="Product Management" subtitle="Manage mock Gym Shop listings.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Inventory filters</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by product, description, or category"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.searchInput}
        />
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pillRow}>
          {(['All', ...productCategories] as ProductCategoryFilter[]).map((filter) => {
            const count =
              filter === 'All'
                ? products.length
                : products.filter((product) => product.category === filter).length;

            return (
              <Pressable
                key={filter}
                onPress={() => setProductCategoryFilter(filter)}
                style={[
                  styles.pill,
                  productCategoryFilter === filter && styles.pillSelected,
                ]}>
                <Text
                  style={[
                    styles.pillText,
                    productCategoryFilter === filter && styles.pillTextSelected,
                  ]}>
                  {filter} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.fieldLabel}>Availability</Text>
        <View style={styles.pillRow}>
          {(['All', 'Available', 'Unavailable'] as ProductAvailabilityFilter[]).map(
            (filter) => {
              const count =
                filter === 'All'
                  ? products.length
                  : products.filter((product) =>
                      filter === 'Available'
                        ? product.isAvailable
                        : !product.isAvailable,
                    ).length;

              return (
                <Pressable
                  key={filter}
                  onPress={() => setProductAvailabilityFilter(filter)}
                  style={[
                    styles.pill,
                    productAvailabilityFilter === filter && styles.pillSelected,
                  ]}>
                  <Text
                    style={[
                      styles.pillText,
                      productAvailabilityFilter === filter && styles.pillTextSelected,
                    ]}>
                    {filter} ({count})
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
      </View>

      <View style={[styles.card, editingProduct ? styles.cardEditing : styles.cardCreating]}>
        <View style={styles.formHeader}>
          <Text style={styles.formModeKicker}>
            {editingProduct ? 'Editing product' : 'Creating product'}
          </Text>
          <Text style={styles.cardTitle}>
            {editingProduct ? editingProduct.name : 'New product'}
          </Text>
        </View>

        <Text style={styles.formSectionLabel}>Product image</Text>
        <View style={styles.field}>
          <View style={styles.imagePreviewBox}>
            {form.imageUri ? (
              <Image
                source={{ uri: form.imageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.imagePlaceholderText}>No image selected</Text>
            )}
          </View>
          <View style={styles.pillRow}>
            <Pressable onPress={handlePickProductImage} style={styles.compactPrimary}>
              <Text style={styles.primaryButtonText}>
                {form.imageUri ? 'Change image' : 'Upload image'}
              </Text>
            </Pressable>
            {form.imageUri ? (
              <Pressable
                onPress={() => setForm((current) => ({ ...current, imageUri: '' }))}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.formSectionLabel}>Product details</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Product name</Text>
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((current) => ({ ...current, name }))}
            placeholder="e.g. Energy Drink"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            value={form.description}
            onChangeText={(description) =>
              setForm((current) => ({ ...current, description }))
            }
            placeholder="Short product description"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.input}
          />
        </View>

        <Text style={styles.formSectionLabel}>Pricing & availability</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Price (USD)</Text>
          <TextInput
            value={form.price}
            onChangeText={(price) => setForm((current) => ({ ...current, price }))}
            placeholder="0"
            placeholderTextColor={premiumColors.textFaint}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Category & stock</Text>
          <View style={styles.pillRow}>
            {productCategories.map((category) => (
              <Pressable
                key={category}
                onPress={() => setForm((current) => ({ ...current, category }))}
                style={[styles.pill, form.category === category && styles.pillSelected]}>
                <Text
                  style={[
                    styles.pillText,
                    form.category === category && styles.pillTextSelected,
                  ]}>
                  {category}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() =>
                setForm((current) => ({ ...current, isAvailable: !current.isAvailable }))
              }
              style={[styles.pill, form.isAvailable && styles.pillSelected]}>
              <Text style={[styles.pillText, form.isAvailable && styles.pillTextSelected]}>
                {form.isAvailable ? 'Available' : 'Out of stock'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.formActions}>
          <Pressable
            onPress={resetForm}
            style={[styles.secondaryButton, styles.formActionButton]}>
            <Text style={styles.secondaryButtonText}>
              {editingProduct ? 'Cancel' : 'Clear'}
            </Text>
          </Pressable>
          <Pressable
            onPress={saveProduct}
            style={[styles.primaryButton, styles.formActionButton]}>
            <Text style={styles.primaryButtonText}>
              {editingProduct ? 'Save changes' : 'Add product'}
            </Text>
          </Pressable>
        </View>
      </View>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.cardTitle}>No products found</Text>
          <Text style={styles.helperText}>Try a different inventory filter.</Text>
        </View>
      ) : (
        filteredProducts.map((product) => (
          <View key={product.id} style={styles.rowCard}>
          <View style={styles.adminAvatar}>
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.adminAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.adminAvatarText}>{product.name.slice(0, 1)}</Text>
            )}
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{product.name}</Text>
            <View style={styles.pillRow}>
              <StatusChip label={product.isAvailable ? 'Available' : 'Unavailable'} />
              <StatusChip label={product.category ?? 'Product'} />
            </View>
            <Text style={styles.bodyText}>
              {product.currency} {product.price.toFixed(2)} · {product.category}
            </Text>
            <Text style={styles.helperText}>
              {product.isAvailable ? 'Available' : 'Out of stock'}
            </Text>
          </View>
          <View style={styles.actionStack}>
            <Pressable
              onPress={() => {
                setEditingProduct(product);
                setForm(getProductForm(product));
              }}
              style={styles.tinyPrimary}>
              <Text style={styles.tinyPrimaryText}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await productService.toggleProductAvailability(product.id);
                await loadProducts();
              }}
              style={styles.tinySecondary}>
              <Text style={styles.tinySecondaryText}>Toggle</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setConfirmAction({
                  title: 'Delete product?',
                  body: `Remove ${product.name} from the mock shop listings.`,
                  onConfirm: async () => {
                    await productService.deleteProduct(product.id);
                    await loadProducts();
                  },
                })
              }
              style={styles.tinySecondary}>
              <Text style={styles.tinySecondaryText}>Delete</Text>
            </Pressable>
          </View>
          </View>
        ))
      )}

      <ConfirmModal action={confirmAction} onClose={() => setConfirmAction(undefined)} />
    </AdminShell>
  );
}

export function AdminWelcomePhotoManagementScreen() {
  const [photos, setPhotos] = useState<EntrySlide[]>([]);
  const [signInWallpaper, setSignInWallpaper] = useState<EntrySlide>();
  const [label, setLabel] = useState('');

  const loadPhotos = useCallback(async () => {
    setPhotos(await entryContentService.getWelcomePhotos());
    setSignInWallpaper(await entryContentService.getSignInWallpaper());
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const movePhoto = async (photoId: string, direction: -1 | 1) => {
    const currentIndex = photos.findIndex((photo) => photo.id === photoId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= photos.length) {
      return;
    }

    const nextPhotos = [...photos];
    const [selectedPhoto] = nextPhotos.splice(currentIndex, 1);

    nextPhotos.splice(nextIndex, 0, selectedPhoto);
    await entryContentService.reorderWelcomePhotos(nextPhotos.map((photo) => photo.id));
    await loadPhotos();
  };

  const handleUploadPhoto = async () => {
    const uri = await pickImageFromLibrary();

    if (!uri) {
      return;
    }

    await entryContentService.addWelcomePhoto({
      image: { uri },
      label: label.trim() || undefined,
    });
    setLabel('');
    await loadPhotos();
  };

  const handleReplacePhoto = async (photoId: string) => {
    const uri = await pickImageFromLibrary();

    if (!uri) {
      return;
    }

    await entryContentService.updateWelcomePhoto(photoId, { image: { uri } });
    await loadPhotos();
  };

  const handleReplaceSignInWallpaper = async () => {
    const uri = await pickImageFromLibrary();

    if (!uri) {
      return;
    }

    await entryContentService.updateSignInWallpaper({
      image: { uri },
      label: 'Sign In Wallpaper',
    });
    await loadPhotos();
  };

  return (
    <AdminShell
      title="Welcome Photos"
      subtitle="Manage Welcome Page carousel photos and the Sign In wallpaper.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In wallpaper</Text>
        <Text style={styles.bodyText}>
          This image is used behind the phone and password fields on the Sign In screen.
        </Text>
        <View style={styles.imagePreviewBox}>
          {signInWallpaper ? (
            <Image
              source={signInWallpaper.image}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.imagePlaceholderText}>No wallpaper loaded</Text>
          )}
        </View>
        <Pressable onPress={handleReplaceSignInWallpaper} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Replace Sign In Wallpaper</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add photo</Text>
        <Text style={styles.bodyText}>
          Upload photos from your gallery for the Welcome Page carousel shown
          behind the Sign In and Continue as Guest buttons.
        </Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Optional photo label"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.input}
        />
        <Pressable onPress={handleUploadPhoto} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Upload Photo</Text>
        </Pressable>
      </View>

      {photos.map((photo, index) => (
        <View key={photo.id} style={styles.rowCard}>
          <View style={styles.photoPreviewSlot}>
            <Image
              source={photo.image}
              style={styles.photoPreviewImage}
              resizeMode="cover"
            />
            <View style={styles.photoPositionBadge}>
              <Text style={styles.photoPositionText}>#{index + 1}</Text>
            </View>
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{photo.label ?? `Photo ${index + 1}`}</Text>
            <Text style={styles.helperText}>Welcome carousel photo</Text>
          </View>
          <View style={styles.actionStack}>
            <Pressable
              onPress={() => movePhoto(photo.id, -1)}
              style={styles.tinyPrimary}>
              <Text style={styles.tinyPrimaryText}>Up</Text>
            </Pressable>
            <Pressable
              onPress={() => movePhoto(photo.id, 1)}
              style={styles.tinyPrimary}>
              <Text style={styles.tinyPrimaryText}>Down</Text>
            </Pressable>
            <Pressable
              onPress={() => handleReplacePhoto(photo.id)}
              style={styles.tinySecondary}>
              <Text style={styles.tinySecondaryText}>Replace</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await entryContentService.deleteWelcomePhoto(photo.id);
                await loadPhotos();
              }}
              style={styles.tinySecondary}>
              <Text style={styles.tinySecondaryText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </AdminShell>
  );
}

export function AdminStudentVerificationScreen() {
  const [requests, setRequests] = useState<StudentVerificationWithMember[]>([]);
  const [selectedStatus, setSelectedStatus] =
    useState<StudentVerificationStatus>('Pending Verification');
  const [search, setSearch] = useState('');

  const loadRequests = useCallback(async () => {
    setRequests(await studentVerificationService.getStudentVerificationRequests());
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const normalizedRequestSearch = search.trim().toLowerCase();
  const visibleRequests = requests.filter((request) => {
    if (request.status !== selectedStatus) {
      return false;
    }

    if (!normalizedRequestSearch) {
      return true;
    }

    const memberName = request.member
      ? `${request.member.firstName} ${request.member.lastName}`
      : request.memberId;
    const haystack = `${memberName} ${request.member?.phone ?? ''} ${
      request.member?.email ?? ''
    }`.toLowerCase();

    return haystack.includes(normalizedRequestSearch);
  });

  return (
    <AdminShell
      title="Student Verification"
      subtitle="Approve student ID requests for mock student renewal pricing.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verification queue</Text>
        <Text style={styles.bodyText}>
          Pending requests keep normal $85/month pricing until approved by staff.
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by member name, phone, or email"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.searchInput}
        />
        <View style={styles.pillRow}>
          {studentStatusFilters.map((status) => {
            const selected = selectedStatus === status;
            const count = requests.filter((request) => request.status === status).length;

            return (
              <Pressable
                key={status}
                onPress={() => setSelectedStatus(status)}
                style={[styles.pill, selected && styles.pillSelected]}>
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {status.replace(' Verification', '')} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {visibleRequests.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No requests</Text>
          <Text style={styles.helperText}>
            {normalizedRequestSearch
              ? 'No requests match this search.'
              : 'Student ID submissions will appear here after members upload proof from Profile.'}
          </Text>
        </View>
      ) : (
        visibleRequests.map((request) => (
          <View key={request.id} style={styles.rowCard}>
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>
                {(request.member?.firstName ?? 'S').slice(0, 1)}
              </Text>
            </View>
            <View style={styles.rowCopy}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.rowTitle}>
                  {request.member
                    ? `${request.member.firstName} ${request.member.lastName}`
                    : request.memberId}
                </Text>
                <StatusChip label={request.status} />
              </View>
              <Text style={styles.bodyText}>Phone: {request.member?.phone ?? '-'}</Text>
              <Text style={styles.bodyText}>Email: {request.member?.email ?? '-'}</Text>
              <Text style={styles.helperText}>
                Submitted: {formatDate(request.submittedAt)} - Proof:{' '}
                {request.proofLabel ?? 'Student ID proof'}
              </Text>
            </View>
            {request.status === 'Pending Verification' ? (
              <View style={styles.actionStack}>
                <Pressable
                  onPress={async () => {
                    await studentVerificationService.approveStudentVerification(request.id);
                    await loadRequests();
                  }}
                  style={styles.tinyPrimary}>
                  <Text style={styles.tinyPrimaryText}>Approve</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    await studentVerificationService.rejectStudentVerification(request.id);
                    await loadRequests();
                  }}
                  style={styles.tinySecondary}>
                  <Text style={styles.tinySecondaryText}>Reject</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 66,
    paddingBottom: 56,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  backButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 14,
  },
  backButtonText: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
  },
  topCopy: {
    flex: 1,
  },
  kicker: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: premiumColors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    marginTop: 4,
  },
  subtitle: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 5,
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 24,
    backgroundColor: premiumColors.surface,
    padding: 16,
    ...premiumShadow,
  },
  cardTitle: {
    color: premiumColors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  cardEditing: {
    borderColor: premiumColors.red,
  },
  cardCreating: {
    borderColor: premiumColors.borderStrong,
  },
  formHeader: {
    gap: 2,
  },
  formModeKicker: {
    color: premiumColors.redBright,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  formSectionLabel: {
    color: premiumColors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  field: {
    gap: 6,
  },
  fieldFlex: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  fieldHint: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '700',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  formActionButton: {
    flex: 1,
  },
  sectionLabel: {
    color: premiumColors.redBright,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bodyText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  helperText: {
    color: premiumColors.textFaint,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    minHeight: 48,
    flex: 1,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 15,
    backgroundColor: premiumColors.surfaceSoft,
    color: premiumColors.text,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 13,
  },
  searchInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 14,
    backgroundColor: premiumColors.surfaceSoft,
    color: premiumColors.text,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 13,
  },
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 12,
  },
  selectableRowSelected: {
    borderColor: premiumColors.red,
    backgroundColor: 'rgba(177, 18, 38, 0.16)',
  },
  selectedTag: {
    color: premiumColors.redBright,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  compactPrimary: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 16,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: premiumColors.red,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  secondaryButtonText: {
    color: premiumColors.redBright,
    fontSize: 13,
    fontWeight: '900',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 12,
  },
  pillSelected: {
    borderColor: premiumColors.red,
    backgroundColor: premiumColors.red,
  },
  pillText: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 20,
    backgroundColor: premiumColors.surface,
    padding: 13,
    ...premiumShadow,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 20,
    backgroundColor: premiumColors.surface,
    padding: 16,
    ...premiumShadow,
  },
  compactVoucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 12,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  actionStack: {
    gap: 7,
  },
  tinyPrimary: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 10,
  },
  tinyPrimaryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  tinySecondary: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 10,
  },
  tinySecondaryText: {
    color: premiumColors.redBright,
    fontSize: 10,
    fontWeight: '900',
  },
  adminAvatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 15,
    backgroundColor: premiumColors.surfaceSoft,
  },
  adminAvatarImage: {
    width: '100%',
    height: '100%',
  },
  adminAvatarText: {
    color: premiumColors.redBright,
    fontSize: 16,
    fontWeight: '900',
  },
  photoPreviewSlot: {
    width: 74,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 16,
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
  },
  photoPreviewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  photoPositionBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoPositionText: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
  },
  photoPreviewText: {
    color: premiumColors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  imagePreviewBox: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholderText: {
    color: premiumColors.textFaint,
    fontSize: 12,
    fontWeight: '800',
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
    borderRadius: 24,
    backgroundColor: premiumColors.surface,
    padding: 20,
    ...premiumShadow,
  },
  modalTitle: {
    color: premiumColors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  modalBody: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonPressed: {
    opacity: 0.76,
  },
});
