import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
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
import {
  premiumColors,
  premiumGradients,
  premiumGlow,
  premiumShadow,
} from '@/constants/premiumTheme';
import { productService, voucherService } from '@/services';
import type {
  Product,
  ProductCategory,
  Voucher,
  VoucherStatus,
} from '@/types';

const accentColor = premiumColors.red;
const mutedColor = premiumColors.textMuted;

type OrderTab = 'Confirmed' | 'Canceled';

type CategoryMeta = {
  key: ProductCategory;
  symbol: string;
  fallback: string;
};

const categoryMeta: CategoryMeta[] = [
  { key: 'Supplements', symbol: 'pills.fill', fallback: 'Su' },
  { key: 'Apparel', symbol: 'tshirt.fill', fallback: 'Ap' },
  { key: 'Equipment', symbol: 'dumbbell.fill', fallback: 'Eq' },
  { key: 'Accessories', symbol: 'bag.fill', fallback: 'Ac' },
  { key: 'Nutrition', symbol: 'fork.knife', fallback: 'Nu' },
  { key: 'Beverages', symbol: 'cup.and.saucer.fill', fallback: 'Be' },
];

function formatPrice(price: number) {
  return `$${price.toFixed(2)}`;
}

function getDisplayProductImageUri(product: Product) {
  if (!product.imageUrl || product.imageUrl.includes('example.com')) {
    return undefined;
  }
  return product.imageUrl;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatVoucherDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getVoucherStatusColor(status: VoucherStatus) {
  if (status === 'Confirmed') return premiumColors.success;
  if (status === 'Canceled') return premiumColors.textMuted;
  return premiumColors.warning;
}

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Text
          key={index}
          style={[styles.star, index <= rounded && styles.starFilled]}>
          {'★'}
        </Text>
      ))}
    </View>
  );
}

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategory>('Supplements');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [shopVouchers, setShopVouchers] = useState<Voucher[]>([]);
  const [orderTab, setOrderTab] = useState<OrderTab>('Confirmed');
  const [pendingVoucherProduct, setPendingVoucherProduct] = useState<Product>();
  const [voucherQuantity, setVoucherQuantity] = useState(1);
  const [isCustomVoucherOpen, setIsCustomVoucherOpen] = useState(false);
  const [customVoucherName, setCustomVoucherName] = useState('');
  const [customVoucherAmount, setCustomVoucherAmount] = useState('');
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [toastText, setToastText] = useState('');
  const [expandedBox, setExpandedBox] = useState<'vouchers' | 'orders' | null>(null);

  const loadData = useCallback(async () => {
    const [nextProducts, nextCategories, nextVouchers] = await Promise.all([
      productService.getProducts(),
      productService.getProductCategories(),
      voucherService.getVouchers(),
    ]);
    setProducts(nextProducts.filter((item) => item.isActive));
    setCategories(nextCategories);
    setShopVouchers(nextVouchers.filter((v) => v.type === 'Shop Reservation'));
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const normalizedSearch = search.trim().toLowerCase();

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      if (product.category !== selectedCategory) return false;
      if (!normalizedSearch) return true;
      return product.name.toLowerCase().includes(normalizedSearch);
    });
  }, [products, selectedCategory, normalizedSearch]);

  const featuredProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ProductCategory, number>();
    products.forEach((product) => {
      if (!product.category) return;
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    });
    return counts;
  }, [products]);

  const heroProduct = featuredProducts[0];
  const pendingVouchers = shopVouchers.filter((v) => v.status === 'Pending');
  const historyVouchers = shopVouchers.filter((v) => v.status !== 'Pending');
  const orderedVouchers = historyVouchers.filter((v) => v.status === orderTab);

  const showToast = (message: string) => {
    setToastText(message);
    setTimeout(() => setToastText(''), 2500);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleCreateVoucher = async () => {
    if (!pendingVoucherProduct) return;
    setIsCreatingVoucher(true);
    try {
      const totalAmount = pendingVoucherProduct.price * voucherQuantity;
      const label =
        voucherQuantity > 1
          ? `${voucherQuantity}x ${pendingVoucherProduct.name}`
          : pendingVoucherProduct.name;
      await voucherService.createShopVoucher(label, totalAmount);
      await loadData();
      setPendingVoucherProduct(undefined);
      setVoucherQuantity(1);
      showToast('Voucher created successfully');
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const handleCreateCustomVoucher = async () => {
    const amount = Number.parseFloat(customVoucherAmount);
    const name = customVoucherName.trim();
    if (!name || Number.isNaN(amount) || amount <= 0) return;
    setIsCreatingVoucher(true);
    try {
      await voucherService.createShopVoucher(name, amount);
      await loadData();
      setIsCustomVoucherOpen(false);
      setCustomVoucherName('');
      setCustomVoucherAmount('');
      showToast('Custom voucher created');
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const handleCancelPendingVoucher = async (voucherId: string) => {
    await voucherService.cancelVoucher(voucherId);
    await loadData();
  };

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading marketplace...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Top brand row */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandKicker}>Marvel</Text>
            <Text style={styles.brandTitle}>Shop</Text>
          </View>
          {pendingVouchers.length > 0 ? (
            <View style={styles.cartBadge}>
              <SymbolView
                name="bag.fill"
                size={18}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.cartBadgeGlyph}>{pendingVouchers.length}</Text>}
              />
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{pendingVouchers.length}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <SymbolView
            name="magnifyingglass"
            size={18}
            tintColor={premiumColors.textFaint}
            fallback={<Text style={styles.searchGlyph}>{'⌕'}</Text>}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>

        {/* Hero banner */}
        {heroProduct ? (
          <View style={styles.heroCard}>
            <View pointerEvents="none" style={styles.heroGloss} />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(177, 18, 38, 0.32)', 'rgba(10, 11, 15, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBody}>
              <View style={styles.heroLeft}>
                <View style={styles.heroTag}>
                  <Text style={styles.heroTagText}>Limited Time</Text>
                </View>
                <Text style={styles.heroTitle}>Maximum</Text>
                <Text style={styles.heroTitleAccent}>Performance</Text>
                <Text style={styles.heroSubtitle}>
                  Premium supplements for serious results.
                </Text>
                <Pressable
                  onPress={() => {
                    if (heroProduct) {
                      setPendingVoucherProduct(heroProduct);
                      setVoucherQuantity(1);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.heroButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <LinearGradient
                    colors={premiumGradients.redButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroButtonGradient}>
                    <Text style={styles.heroButtonText}>Shop Now</Text>
                    <SymbolView
                      name="arrow.right"
                      size={16}
                      tintColor="#FFFFFF"
                      fallback={<Text style={styles.heroButtonArrow}>{'→'}</Text>}
                    />
                  </LinearGradient>
                </Pressable>
              </View>
              {getDisplayProductImageUri(heroProduct) ? (
                <Image
                  source={{ uri: getDisplayProductImageUri(heroProduct) }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.heroImage, styles.heroImageFallback]}>
                  <Text style={styles.heroImageFallbackText}>
                    {getInitials(heroProduct.name)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Shop by Category */}
        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Browse</Text>
            <Text style={styles.sectionHeadingTitle}>Shop by Category</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}>
          {categoryMeta.map((meta) => {
            const isSelected = selectedCategory === meta.key;
            const available = categories.includes(meta.key);
            return (
              <Pressable
                key={meta.key}
                disabled={!available}
                onPress={() => setSelectedCategory(meta.key)}
                style={({ pressed }) => [
                  styles.categoryTile,
                  isSelected && styles.categoryTileSelected,
                  !available && styles.categoryTileDisabled,
                  pressed && styles.buttonPressed,
                ]}>
                <View
                  style={[
                    styles.categoryIconWrap,
                    isSelected && styles.categoryIconWrapSelected,
                  ]}>
                  <SymbolView
                    name={meta.symbol as never}
                    size={24}
                    tintColor={isSelected ? '#FFFFFF' : premiumColors.textMuted}
                    fallback={
                      <Text
                        style={[
                          styles.categoryFallback,
                          isSelected && styles.categoryFallbackSelected,
                        ]}>
                        {meta.fallback}
                      </Text>
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelSelected,
                  ]}>
                  {meta.key}
                </Text>
                <Text style={styles.categoryCount}>
                  {categoryCounts.get(meta.key) ?? 0} items
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Products */}
        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>{selectedCategory}</Text>
            <Text style={styles.sectionHeadingTitle}>Featured Products</Text>
          </View>
          <Text style={styles.sectionHint}>{visibleProducts.length} items</Text>
        </View>

        {visibleProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyBody}>
              {normalizedSearch
                ? 'Try a different search term.'
                : 'No products in this category yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {visibleProducts.map((product) => {
              const imageUri = getDisplayProductImageUri(product);
              const isFavorite = favorites.has(product.id);
              const discount =
                product.compareAtPrice && product.compareAtPrice > product.price
                  ? Math.round(
                      ((product.compareAtPrice - product.price) /
                        product.compareAtPrice) *
                        100,
                    )
                  : undefined;
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productImageWrap}>
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.productImage, styles.productImageFallback]}>
                        <Text style={styles.productImageFallbackText}>
                          {getInitials(product.name)}
                        </Text>
                      </View>
                    )}
                    {discount ? (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>-{discount}%</Text>
                      </View>
                    ) : product.badge ? (
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{product.badge}</Text>
                      </View>
                    ) : null}
                    <Pressable
                      hitSlop={8}
                      onPress={() => toggleFavorite(product.id)}
                      style={styles.favoriteButton}>
                      <SymbolView
                        name={isFavorite ? 'heart.fill' : 'heart'}
                        size={16}
                        tintColor={isFavorite ? premiumColors.redBright : '#FFFFFF'}
                        fallback={
                          <Text
                            style={[
                              styles.favoriteGlyph,
                              isFavorite && styles.favoriteGlyphActive,
                            ]}>
                            {isFavorite ? '♥' : '♡'}
                          </Text>
                        }
                      />
                    </Pressable>
                  </View>

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.productDesc} numberOfLines={1}>
                      {product.description}
                    </Text>
                    {product.rating ? (
                      <View style={styles.ratingRow}>
                        <RatingStars rating={product.rating} />
                        <Text style={styles.reviewCount}>
                          ({product.reviewCount ?? 0})
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>{formatPrice(product.price)}</Text>
                      {product.compareAtPrice ? (
                        <Text style={styles.compareAtPrice}>
                          {formatPrice(product.compareAtPrice)}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => {
                        setPendingVoucherProduct(product);
                        setVoucherQuantity(1);
                      }}
                      style={({ pressed }) => [
                        styles.voucherButton,
                        pressed && styles.buttonPressed,
                      ]}>
                      <SymbolView
                        name="ticket.fill"
                        size={15}
                        tintColor={premiumColors.redBright}
                        fallback={<Text style={styles.voucherButtonGlyph}>{'▤'}</Text>}
                      />
                      <Text style={styles.voucherButtonText}>Create Voucher</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Create your own voucher CTA */}
        <Pressable
          onPress={() => setIsCustomVoucherOpen(true)}
          style={({ pressed }) => [
            styles.customVoucherCard,
            pressed && styles.buttonPressed,
          ]}>
          <View style={styles.customVoucherIcon}>
            <SymbolView
              name="percent"
              size={22}
              tintColor={premiumColors.redBright}
              fallback={<Text style={styles.customVoucherGlyph}>%</Text>}
            />
          </View>
          <View style={styles.customVoucherText}>
            <Text style={styles.customVoucherTitle}>Create your own voucher</Text>
            <Text style={styles.customVoucherSub}>Gift or save with custom vouchers.</Text>
          </View>
          <SymbolView
            name="chevron.right"
            size={18}
            tintColor={premiumColors.textMuted}
            fallback={<Text style={styles.customVoucherChevron}>{'›'}</Text>}
          />
        </Pressable>

        {/* ── VOUCHERS + ORDERS — two independent boxes ──────────── */}
        <View style={styles.actBoxRow}>
          {/* VOUCHERS: pending, awaiting counter — can be canceled */}
          <Pressable
            onPress={() =>
              setExpandedBox(expandedBox === 'vouchers' ? null : 'vouchers')
            }
            style={[
              styles.actBox,
              expandedBox === 'vouchers' && styles.actBoxActive,
            ]}>
            <SymbolView
              name="ticket.fill"
              size={24}
              tintColor={premiumColors.redBright}
              fallback={<Text style={styles.actBoxGlyph}>▤</Text>}
            />
            <Text style={styles.actBoxCount}>{pendingVouchers.length}</Text>
            <Text style={styles.actBoxLabel}>Vouchers</Text>
            <Text style={styles.actBoxSub}>Pending</Text>
          </Pressable>

          {/* ORDERS: confirmed + canceled history log */}
          <Pressable
            onPress={() =>
              setExpandedBox(expandedBox === 'orders' ? null : 'orders')
            }
            style={[
              styles.actBox,
              expandedBox === 'orders' && styles.actBoxActive,
            ]}>
            <SymbolView
              name="list.bullet.clipboard"
              size={24}
              tintColor={premiumColors.redBright}
              fallback={<Text style={styles.actBoxGlyph}>≡</Text>}
            />
            <Text style={styles.actBoxCount}>{historyVouchers.length}</Text>
            <Text style={styles.actBoxLabel}>Orders</Text>
            <Text style={styles.actBoxSub}>History</Text>
          </Pressable>
        </View>

        {/* Vouchers expanded — pending, can cancel */}
        {expandedBox === 'vouchers' ? (
          <View style={styles.expandedPanel}>
            <Text style={styles.expandedTitle}>My Vouchers</Text>
            <Text style={styles.expandedSub}>
              Awaiting counter confirmation. Cancel anytime before pickup.
            </Text>
            {pendingVouchers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending vouchers</Text>
                <Text style={styles.emptyBody}>
                  Reserve a product to create a cash voucher.
                </Text>
              </View>
            ) : (
              <View style={styles.voucherList}>
                {pendingVouchers.map((voucher) => (
                  <View key={voucher.id} style={styles.voucherRow}>
                    <View
                      style={[
                        styles.voucherRail,
                        { backgroundColor: getVoucherStatusColor(voucher.status) },
                      ]}
                    />
                    <View style={styles.voucherRowBody}>
                      <Text style={styles.voucherRowTitle} numberOfLines={2}>
                        {voucher.description}
                      </Text>
                      <Text style={styles.voucherRowMeta}>
                        {formatVoucherDate(voucher.date)} ·{' '}
                        {formatPrice(voucher.amount)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleCancelPendingVoucher(voucher.id)}
                      style={({ pressed }) => [
                        styles.voucherCancel,
                        pressed && styles.buttonPressed,
                      ]}>
                      <Text style={styles.voucherCancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Orders expanded — confirmed + canceled history */}
        {expandedBox === 'orders' ? (
          <View style={styles.expandedPanel}>
            <Text style={styles.expandedTitle}>Order History</Text>
            <Text style={styles.expandedSub}>
              Confirmed and canceled shop orders.
            </Text>
            <View style={styles.tabsRow}>
              {(['Confirmed', 'Canceled'] as OrderTab[]).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setOrderTab(tab)}
                  style={[styles.tab, orderTab === tab && styles.tabActive]}>
                  <Text
                    style={[
                      styles.tabText,
                      orderTab === tab && styles.tabTextActive,
                    ]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>
            {orderedVouchers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  No {orderTab.toLowerCase()} orders
                </Text>
                <Text style={styles.emptyBody}>
                  {orderTab === 'Confirmed'
                    ? 'Orders confirmed at the counter will appear here.'
                    : 'Cancelled orders will appear here.'}
                </Text>
              </View>
            ) : (
              <View style={styles.voucherList}>
                {orderedVouchers.map((voucher) => (
                  <View key={voucher.id} style={styles.voucherRow}>
                    <View
                      style={[
                        styles.voucherRail,
                        { backgroundColor: getVoucherStatusColor(voucher.status) },
                      ]}
                    />
                    <View style={styles.voucherRowBody}>
                      <Text style={styles.voucherRowTitle} numberOfLines={2}>
                        {voucher.description}
                      </Text>
                      <Text style={styles.voucherRowMeta}>
                        {formatVoucherDate(voucher.date)} ·{' '}
                        {formatPrice(voucher.amount)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusChip,
                        { borderColor: getVoucherStatusColor(voucher.status) },
                      ]}>
                      <Text
                        style={[
                          styles.statusChipText,
                          { color: getVoucherStatusColor(voucher.status) },
                        ]}>
                        {voucher.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Create Voucher modal */}
      <Modal transparent visible={Boolean(pendingVoucherProduct)} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPendingVoucherProduct(undefined)}
          />
          <View style={styles.modalCard}>
            {pendingVoucherProduct ? (
              <>
                <Text style={styles.modalKicker}>Create Voucher</Text>
                <Text style={styles.modalTitle}>{pendingVoucherProduct.name}</Text>
                <Text style={styles.modalBody}>
                  A pending reservation is created and paid in cash at the counter.
                </Text>

                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => setVoucherQuantity((v) => Math.max(1, v - 1))}
                    style={styles.stepperButton}>
                    <Text style={styles.stepperButtonText}>-</Text>
                  </Pressable>
                  <View style={styles.stepperValueCard}>
                    <Text style={styles.stepperValue}>{voucherQuantity}</Text>
                    <Text style={styles.stepperLabel}>
                      qty · {formatPrice(pendingVoucherProduct.price * voucherQuantity)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setVoucherQuantity((v) => Math.min(20, v + 1))}
                    style={styles.stepperButton}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>

                <View style={styles.modalActionRow}>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={() => setPendingVoucherProduct(undefined)}
                    style={({ pressed }) => [
                      styles.modalSecondaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalSecondaryText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={isCreatingVoucher}
                    onPress={handleCreateVoucher}
                    style={({ pressed }) => [
                      styles.modalPrimaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalPrimaryText}>Create voucher</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Custom Voucher modal */}
      <Modal transparent visible={isCustomVoucherOpen} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsCustomVoucherOpen(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalKicker}>Custom Voucher</Text>
            <Text style={styles.modalTitle}>Create your own</Text>
            <Text style={styles.modalBody}>
              Name the voucher and set an amount to pay in cash at the counter.
            </Text>
            <TextInput
              value={customVoucherName}
              onChangeText={setCustomVoucherName}
              placeholder="Voucher name"
              placeholderTextColor={premiumColors.textFaint}
              style={styles.modalInput}
            />
            <TextInput
              value={customVoucherAmount}
              onChangeText={setCustomVoucherAmount}
              placeholder="Amount (USD)"
              placeholderTextColor={premiumColors.textFaint}
              keyboardType="decimal-pad"
              style={styles.modalInput}
            />
            <View style={styles.modalActionRow}>
              <Pressable
                disabled={isCreatingVoucher}
                onPress={() => setIsCustomVoucherOpen(false)}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isCreatingVoucher}
                onPress={handleCreateCustomVoucher}
                style={({ pressed }) => [
                  styles.modalPrimaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.modalPrimaryText}>Create voucher</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {toastText ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toastText}</Text>
        </View>
      ) : null}
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 132,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandKicker: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  cartBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cartBadgeGlyph: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  cartCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: premiumColors.redBright,
    paddingHorizontal: 5,
  },
  cartCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchGlyph: {
    color: premiumColors.textFaint,
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 28,
    backgroundColor: 'rgba(18, 20, 28, 0.72)',
    padding: 18,
    marginBottom: 24,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  heroGloss: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroLeft: {
    flex: 1,
  },
  heroTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.4)',
    borderRadius: 999,
    backgroundColor: 'rgba(177, 18, 38, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  heroTagText: {
    color: premiumColors.redBright,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  heroTitleAccent: {
    color: premiumColors.redBright,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
  },
  heroButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...premiumGlow,
  },
  heroButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  heroButtonArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  heroImage: {
    width: 116,
    height: 152,
    borderRadius: 18,
  },
  heroImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroImageFallbackText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
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
    color: premiumColors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionHint: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
  },
  categoryRail: {
    gap: 12,
    paddingRight: 4,
    paddingBottom: 4,
    marginBottom: 22,
  },
  categoryTile: {
    width: 104,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  categoryTileSelected: {
    borderColor: 'rgba(225, 29, 46, 0.5)',
    backgroundColor: 'rgba(177, 18, 38, 0.16)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  categoryTileDisabled: {
    opacity: 0.4,
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  categoryIconWrapSelected: {
    backgroundColor: premiumColors.red,
  },
  categoryFallback: {
    color: premiumColors.textMuted,
    fontSize: 16,
    fontWeight: '900',
  },
  categoryFallbackSelected: {
    color: '#FFFFFF',
  },
  categoryLabel: {
    color: premiumColors.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
  },
  categoryCount: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 22,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 20,
    marginBottom: 22,
  },
  emptyTitle: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productCard: {
    width: '48.5%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    marginBottom: 14,
    ...premiumShadow,
  },
  productImageWrap: {
    position: 'relative',
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImageFallbackText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 10,
    backgroundColor: premiumColors.redBright,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  tagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 11, 15, 0.7)',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(10, 11, 15, 0.55)',
  },
  favoriteGlyph: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  favoriteGlyphActive: {
    color: premiumColors.redBright,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  productDesc: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 1,
  },
  star: {
    color: premiumColors.textFaint,
    fontSize: 11,
  },
  starFilled: {
    color: premiumColors.redBright,
  },
  reviewCount: {
    color: premiumColors.textFaint,
    fontSize: 11,
    fontWeight: '800',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 8,
  },
  price: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  compareAtPrice: {
    color: premiumColors.textFaint,
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'line-through',
  },
  voucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.4)',
    borderRadius: 12,
    backgroundColor: 'rgba(177, 18, 38, 0.1)',
    marginTop: 12,
  },
  voucherButtonGlyph: {
    color: premiumColors.redBright,
    fontSize: 14,
    fontWeight: '900',
  },
  voucherButtonText: {
    color: premiumColors.redBright,
    fontSize: 13,
    fontWeight: '900',
  },
  customVoucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.36)',
    borderRadius: 22,
    backgroundColor: 'rgba(177, 18, 38, 0.08)',
    padding: 16,
    marginTop: 6,
    marginBottom: 24,
  },
  customVoucherIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.4)',
    borderRadius: 16,
    backgroundColor: 'rgba(177, 18, 38, 0.16)',
  },
  customVoucherGlyph: {
    color: premiumColors.redBright,
    fontSize: 20,
    fontWeight: '900',
  },
  customVoucherText: {
    flex: 1,
  },
  customVoucherTitle: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  customVoucherSub: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  customVoucherChevron: {
    color: premiumColors.textMuted,
    fontSize: 20,
    fontWeight: '900',
  },
  tabsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    marginBottom: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: premiumColors.red,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  tabText: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  voucherList: {
    gap: 10,
    marginBottom: 22,
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 18,
    backgroundColor: premiumColors.surface,
    ...premiumShadow,
  },
  voucherRail: {
    width: 4,
    alignSelf: 'stretch',
  },
  voucherRowBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  voucherRowTitle: {
    color: premiumColors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  voucherRowMeta: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  voucherCancel: {
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(177, 18, 38, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 12,
  },
  voucherCancelText: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 5, 8, 0.72)',
  },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 26,
    backgroundColor: premiumColors.charcoal,
    padding: 22,
    ...premiumShadow,
  },
  modalKicker: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: premiumColors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 6,
  },
  modalBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
  },
  modalInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    marginTop: 12,
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  stepperButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepperButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  stepperValueCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    paddingVertical: 10,
  },
  stepperValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  stepperLabel: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  modalSecondaryText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },
  modalPrimaryButton: {
    flex: 1.4,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: premiumColors.red,
    ...premiumGlow,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 22, 29, 0.96)',
    paddingVertical: 14,
    ...premiumShadow,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  // Two-box row (Vouchers / Orders)
  actBoxRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 14 },
  actBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    paddingVertical: 22,
    paddingHorizontal: 10,
    gap: 4,
    ...premiumShadow,
  },
  actBoxActive: {
    borderColor: 'rgba(225, 29, 46, 0.55)',
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
  },
  actBoxGlyph: { color: premiumColors.redBright, fontSize: 22 },
  actBoxCount: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 4 },
  actBoxLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  actBoxSub: { color: mutedColor, fontSize: 11, fontWeight: '700' },

  // Expanded panel (vouchers / orders)
  expandedPanel: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    padding: 16,
  },
  expandedTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  expandedSub: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 14,
    lineHeight: 17,
  },
});
