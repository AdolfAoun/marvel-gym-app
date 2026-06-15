import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
} from '@/services';
import type {
  AdminMemberSummary,
  ClassMutationInput,
  EntrySlide,
  ProductMutationInput,
  StudentVerificationWithMember,
} from '@/services';
import type {
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
const classCategories = [
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
type ClassFilter = 'All' | 'Today' | 'Upcoming' | 'Available' | 'Full' | 'Paid' | 'Free';
type ProductFilter =
  | 'All'
  | 'Available'
  | 'Unavailable'
  | 'Gym Equipment'
  | 'Beverages'
  | 'Snacks';

type ConfirmAction = {
  body: string;
  onConfirm: () => Promise<void>;
  title: string;
};

type ClassForm = {
  capacity: string;
  instructorName: string;
  isPaid: boolean;
  location: string;
  price: string;
  startTime: string;
  status: GymClass['status'];
  title: string;
};

type ProductForm = {
  category: ProductCategory;
  description: string;
  isAvailable: boolean;
  name: string;
  price: string;
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 8);
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
    status === 'Pending Verification'
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
    isPaid: form.isPaid,
    location: form.location,
    price: Number(form.price) || 0,
    startTime: form.startTime.trim() || defaultClassStart,
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
  };
}

function getClassForm(gymClass?: GymClass): ClassForm {
  return {
    capacity: String(gymClass?.capacity ?? 16),
    instructorName: gymClass?.instructorName ?? '',
    isPaid: gymClass?.isPaid ?? false,
    location: gymClass?.location ?? classCategories[0],
    price: String(gymClass?.price ?? 0),
    startTime: gymClass?.startTime ?? defaultClassStart,
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
  const [phone, setPhone] = useState('');
  const [foundMember, setFoundMember] = useState<Member>();
  const [summary, setSummary] = useState<AdminMemberSummary>();
  const [message, setMessage] = useState('Search by local 8-digit Lebanese phone number.');
  const [months, setMonths] = useState(1);
  const [weeks, setWeeks] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus>('Active');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>();

  const refreshSummary = useCallback(async (memberId: string) => {
    const nextSummary = await adminMemberService.getAdminMemberSummary(memberId);

    setSummary(nextSummary);
  }, []);

  const handleSearch = async () => {
    const member = await adminMemberService.searchMemberByPhone(phone);

    setFoundMember(member);
    setSummary(undefined);

    if (!member) {
      setMessage('No member found for that phone number.');
      return;
    }

    setMessage('Member found.');
    await refreshSummary(member.id);
  };

  const selectedMemberId = foundMember?.id;

  return (
    <AdminShell
      title="Member Management"
      subtitle="Search members and manage mock membership state.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phone search</Text>
        <Text style={styles.bodyText}>
          TODO: Real admin permissions and authority checks must later be enforced by backend/Gmind.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            value={phone}
            onChangeText={(value) => setPhone(normalizePhone(value))}
            placeholder="70 123 456"
            placeholderTextColor={premiumColors.textFaint}
            keyboardType="number-pad"
            style={styles.input}
          />
          <Pressable onPress={handleSearch} style={styles.compactPrimary}>
            <Text style={styles.primaryButtonText}>Search</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>{message}</Text>
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
            <Text style={styles.helperText}>Extend membership</Text>
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

            <Text style={styles.helperText}>Freeze membership: ${weeks * 10}.00 total</Text>
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

            <Text style={styles.helperText}>Change status</Text>
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

        const statusVouchers = vouchers.filter((voucher) => voucher.status === status);

        return (
          <View key={status} style={styles.card}>
            <Text style={styles.cardTitle}>{status}</Text>
            {statusVouchers.length === 0 ? (
              <Text style={styles.helperText}>No {status.toLowerCase()} vouchers.</Text>
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
  const [classFilter, setClassFilter] = useState<ClassFilter>('All');
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

  const filteredClasses = classes.filter((gymClass) => {
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

    if (classFilter === 'Paid') {
      return gymClass.isPaid;
    }

    if (classFilter === 'Free') {
      return !gymClass.isPaid;
    }

    return true;
  });

  return (
    <AdminShell title="Class Management" subtitle="Manage mock class schedule data.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Class filters</Text>
        <View style={styles.pillRow}>
          {(['All', 'Today', 'Upcoming', 'Available', 'Full', 'Paid', 'Free'] as ClassFilter[]).map(
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingClass ? 'Edit class' : 'Add class'}</Text>
        <TextInput
          value={form.title}
          onChangeText={(title) => setForm((current) => ({ ...current, title }))}
          placeholder="Class name"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.input}
        />
        <TextInput
          value={form.instructorName}
          onChangeText={(instructorName) =>
            setForm((current) => ({ ...current, instructorName }))
          }
          placeholder="Instructor name"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.input}
        />
        <TextInput
          value={form.startTime}
          onChangeText={(startTime) => setForm((current) => ({ ...current, startTime }))}
          placeholder={defaultClassStart}
          placeholderTextColor={premiumColors.textFaint}
          style={styles.input}
        />
        <View style={styles.pillRow}>
          {classCategories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setForm((current) => ({ ...current, location: category }))}
              style={[styles.pill, form.location === category && styles.pillSelected]}>
              <Text
                style={[
                  styles.pillText,
                  form.location === category && styles.pillTextSelected,
                ]}>
                {category}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.pillRow}>
          {(['Available', 'Full'] as const).map((status) => (
            <Pressable
              key={status}
              onPress={() => setForm((current) => ({ ...current, status }))}
              style={[styles.pill, form.status === status && styles.pillSelected]}>
              <Text style={[styles.pillText, form.status === status && styles.pillTextSelected]}>
                {status}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setForm((current) => ({ ...current, isPaid: !current.isPaid }))}
            style={[styles.pill, form.isPaid && styles.pillSelected]}>
            <Text style={[styles.pillText, form.isPaid && styles.pillTextSelected]}>
              {form.isPaid ? 'Paid' : 'Free'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            value={form.capacity}
            onChangeText={(capacity) => setForm((current) => ({ ...current, capacity }))}
            placeholder="Capacity"
            placeholderTextColor={premiumColors.textFaint}
            keyboardType="number-pad"
            style={styles.input}
          />
          <TextInput
            value={form.price}
            onChangeText={(price) => setForm((current) => ({ ...current, price }))}
            placeholder="Price"
            placeholderTextColor={premiumColors.textFaint}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={styles.modalRow}>
          <Pressable onPress={resetForm} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </Pressable>
          <Pressable onPress={saveClass} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{editingClass ? 'Save' : 'Add'}</Text>
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
            <Text style={styles.adminAvatarText}>
              {gymClass.instructorName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{gymClass.title}</Text>
            <Text style={styles.bodyText}>Coach {gymClass.instructorName}</Text>
            <View style={styles.pillRow}>
              <StatusChip label={gymClass.status} />
              <StatusChip label={gymClass.isPaid ? `Paid $${gymClass.price}` : 'Free'} />
            </View>
            <Text style={styles.helperText}>
              {formatDateTime(gymClass.startTime)} · {gymClass.location} · {gymClass.status}
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
  const [productFilter, setProductFilter] = useState<ProductFilter>('All');
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

  const filteredProducts = products.filter((product) => {
    if (productFilter === 'Available') {
      return product.isAvailable;
    }

    if (productFilter === 'Unavailable') {
      return !product.isAvailable;
    }

    if (
      productFilter === 'Gym Equipment' ||
      productFilter === 'Beverages' ||
      productFilter === 'Snacks'
    ) {
      return product.category === productFilter;
    }

    return true;
  });

  return (
    <AdminShell title="Product Management" subtitle="Manage mock Gym Shop listings.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Inventory filters</Text>
        <View style={styles.pillRow}>
          {(['All', 'Available', 'Unavailable', ...productCategories] as ProductFilter[]).map(
            (filter) => (
              <Pressable
                key={filter}
                onPress={() => setProductFilter(filter)}
                style={[styles.pill, productFilter === filter && styles.pillSelected]}>
                <Text
                  style={[
                    styles.pillText,
                    productFilter === filter && styles.pillTextSelected,
                  ]}>
                  {filter}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingProduct ? 'Edit product' : 'Add product'}</Text>
        <TextInput
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Product name"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.input}
        />
        <TextInput
          value={form.description}
          onChangeText={(description) =>
            setForm((current) => ({ ...current, description }))
          }
          placeholder="Description"
          placeholderTextColor={premiumColors.textFaint}
          style={styles.input}
        />
        <TextInput
          value={form.price}
          onChangeText={(price) => setForm((current) => ({ ...current, price }))}
          placeholder="Price"
          placeholderTextColor={premiumColors.textFaint}
          keyboardType="decimal-pad"
          style={styles.input}
        />
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
              {form.isAvailable ? 'Available' : 'Out'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.modalRow}>
          <Pressable onPress={resetForm} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </Pressable>
          <Pressable onPress={saveProduct} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{editingProduct ? 'Save' : 'Add'}</Text>
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
            <Text style={styles.adminAvatarText}>{product.name.slice(0, 1)}</Text>
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
  const [label, setLabel] = useState('');

  const loadPhotos = useCallback(async () => {
    setPhotos(await entryContentService.getWelcomePhotos());
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

  return (
    <AdminShell title="Welcome Photos" subtitle="Manage Welcome Page carousel placeholders.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add placeholder</Text>
        <Text style={styles.bodyText}>
          Manage the Welcome Page carousel shown before sign in.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Photo label"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.input}
          />
          <Pressable
            onPress={async () => {
              await entryContentService.addWelcomePhoto(label.trim() || 'New welcome photo');
              setLabel('');
              await loadPhotos();
            }}
            style={styles.compactPrimary}>
            <Text style={styles.primaryButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {photos.map((photo, index) => (
        <View key={photo.id} style={styles.rowCard}>
          <View style={styles.photoPreviewSlot}>
            <Text style={styles.photoPositionText}>#{index + 1}</Text>
            <Text style={styles.photoPreviewText}>Welcome</Text>
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{photo.label ?? photo.id}</Text>
            <Text style={styles.helperText}>Welcome carousel placeholder</Text>
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
              onPress={async () => {
                await entryContentService.updateWelcomePhoto(photo.id, {
                  label: `${photo.label ?? 'Photo'} updated`,
                });
                await loadPhotos();
              }}
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

  const loadRequests = useCallback(async () => {
    setRequests(await studentVerificationService.getStudentVerificationRequests());
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const visibleRequests = requests.filter((request) => request.status === selectedStatus);

  return (
    <AdminShell
      title="Student Verification"
      subtitle="Approve student ID requests for mock student renewal pricing.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verification queue</Text>
        <Text style={styles.bodyText}>
          Pending requests keep normal $85/month pricing until approved by staff.
        </Text>
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
            Student ID submissions will appear here after members upload proof from Profile.
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
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 15,
    backgroundColor: premiumColors.surfaceSoft,
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
