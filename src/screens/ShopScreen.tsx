import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import {
  premiumColors,
  premiumGlow,
  premiumShadow,
} from '@/constants/premiumTheme';
import { productService, voucherService } from '@/services';
import { useAppTheme } from '@/theme/useAppTheme';
import type {
  Product,
  ProductCategory,
  Voucher,
  VoucherStatus,
} from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// ShopScreen content has 20px horizontal padding, so the carousel pages by the
// inner content width rather than the full screen width.
const accentColor = premiumColors.red;
const mutedColor = premiumColors.textMuted;
const shopHeartPurple = '#A855F7';

type OrderTab = 'Confirmed' | 'Canceled';

// Member-facing shop categories. Each groups one or more underlying
// ProductCategory values so the storefront stays clean (no Apparel section,
// Equipment + Accessories merged into "Gym Equipment").
type ShopCategory = 'Supplements' | 'Snacks' | 'Drinks' | 'Gym Equipment';

type CategoryMeta = {
  key: ShopCategory;
  symbol: string;
  fallback: string;
  sources: ProductCategory[];
};

type ProductCardLayout = { height: number; y: number };

const categoryMeta: CategoryMeta[] = [
  { key: 'Supplements', symbol: 'pills.fill', fallback: 'Su', sources: ['Supplements'] },
  { key: 'Snacks', symbol: 'popcorn.fill', fallback: 'Sn', sources: ['Nutrition'] },
  { key: 'Drinks', symbol: 'waterbottle.fill', fallback: 'Dr', sources: ['Beverages'] },
  {
    key: 'Gym Equipment',
    symbol: 'dumbbell.fill',
    fallback: 'Gym',
    sources: ['Equipment', 'Accessories', 'Apparel'],
  },
];

// Reverse lookup: underlying ProductCategory -> shop category.
const PRODUCT_TO_SHOP_CATEGORY = new Map<ProductCategory, ShopCategory>();
categoryMeta.forEach((meta) => {
  meta.sources.forEach((source) => PRODUCT_TO_SHOP_CATEGORY.set(source, meta.key));
});

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

function getReservationKind(product: Product) {
  if (product.category === 'Beverages') return 'Drink';
  if (product.category === 'Nutrition') return 'Snack';
  if (product.category === 'Supplements') return 'Supplement';
  if (product.category === 'Equipment') return 'Equipment';
  if (product.category === 'Accessories') return 'Accessory';
  if (product.category === 'Apparel') return 'Apparel';
  return 'Item';
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

// ── Animated heart button ─────────────────────────────────────────────────────
function HeartButton({
  isFav,
  onToggle,
  btnSize = 36,
  iconSize = 16,
  style,
}: {
  isFav: boolean;
  onToggle: () => void;
  btnSize?: number;
  iconSize?: number;
  style?: ViewStyle;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;
  const combined = useRef(Animated.multiply(pressScale, breatheScale)).current;

  useEffect(() => {
    if (isFav) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheScale, {
            toValue: 1.20,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(breatheScale, {
            toValue: 0.88,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
    Animated.timing(breatheScale, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFav, breatheScale]);

  const handlePress = () => {
    void (isFav
      ? Haptics.selectionAsync()
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(() => undefined);
    Animated.sequence([
      Animated.timing(pressScale, {
        toValue: 1.45,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(pressScale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 18,
        speed: 12,
      }),
    ]).start();
    onToggle();
  };

  return (
    <Pressable
      hitSlop={8}
      onPress={handlePress}
      style={[
        hStyles.btn,
        {
          width: btnSize,
          height: btnSize,
          borderRadius: btnSize / 2,
        },
        isFav && hStyles.btnLiked,
        style,
      ]}>
      <Animated.View style={{ transform: [{ scale: combined }] }}>
        <SymbolView
          name={isFav ? 'heart.fill' : 'heart'}
          size={isFav ? iconSize : iconSize + 2}
          tintColor={shopHeartPurple}
          weight={isFav ? 'semibold' : 'bold'}
          fallback={
            <Text style={[hStyles.glyph, { fontSize: isFav ? iconSize : iconSize + 2 }]}>
              {isFav ? '♥' : '♡'}
            </Text>
          }
        />
      </Animated.View>
    </Pressable>
  );
}

const hStyles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.30)',
  },
  btnLiked: {
    backgroundColor: 'rgba(148, 163, 184, 0.26)',
    borderColor: 'rgba(148, 163, 184, 0.42)',
    shadowColor: shopHeartPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 6,
  },
  glyph: { color: shopHeartPurple, fontWeight: '900' },
});
// ─────────────────────────────────────────────────────────────────────────────

function GlideSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const glideX = useRef(new Animated.Value(0)).current;
  const [controlWidth, setControlWidth] = useState(0);
  const innerControlWidth = Math.max(0, controlWidth - 6);
  const segmentWidth = innerControlWidth > 0 ? innerControlWidth / options.length : 0;
  const selectedIndex = Math.max(0, options.indexOf(value));

  useEffect(() => {
    if (!segmentWidth) return;
    Animated.spring(glideX, {
      toValue: selectedIndex * segmentWidth,
      useNativeDriver: false,
      speed: 18,
      bounciness: 5,
    }).start();
  }, [glideX, selectedIndex, segmentWidth]);

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    setControlWidth(nativeEvent.layout.width);
  };

  return (
    <View onLayout={handleLayout} style={styles.segmentedControl}>
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentedControlGlide,
            {
              width: segmentWidth,
              transform: [{ translateX: glideX }],
            },
          ]}>
          <LinearGradient
            colors={
              selectedIndex === 0
                ? ['#FF2638', '#B11226', '#2A0308']
                : ['#2A0308', '#B11226', '#FF2638']
            }
            locations={selectedIndex === 0 ? [0, 0.58, 1] : [0, 0.42, 1]}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 0.92, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      {options.map((option, index) => {
        const isActive = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(option);
            }}
            style={({ pressed }) => [
              styles.segmentedControlBtn,
              index === 0
                ? styles.segmentedControlBtnLeft
                : index === options.length - 1
                  ? styles.segmentedControlBtnRight
                  : undefined,
              pressed && styles.segmentedControlBtnPressed,
            ]}>
            <Text
              style={[
                styles.segmentedControlText,
                isActive && styles.segmentedControlTextActive,
              ]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ShopScreen() {
  const theme = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const isLight = theme.scheme === 'light';
  const surfaceTextStyle = isLight ? { color: theme.colors.text } : undefined;
  const priceTextStyle = { color: theme.colors.text };
  const searchIconColor = theme.colors.text;
  const orderButtonIconColor = '#FFFFFF';
  const mutedTextStyle = isLight ? { color: theme.colors.textMuted } : undefined;
  const themedSurfaceStyle = isLight
    ? {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }
    : undefined;
  const lightGlassStyle = isLight
    ? {
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderColor: 'rgba(10,11,15,0.78)',
      }
    : undefined;
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<ShopCategory>('Supplements');
  const [categoryLayouts, setCategoryLayouts] = useState<
    Partial<Record<ShopCategory, { x: number; width: number }>>
  >({});
  const categoryPillX = useRef(new Animated.Value(0)).current;
  const categoryPillW = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [shopVouchers, setShopVouchers] = useState<Voucher[]>([]);
  const [orderTab, setOrderTab] = useState<OrderTab>('Confirmed');
  const [pendingVoucherProduct, setPendingVoucherProduct] = useState<Product>();
  const [voucherQuantity, setVoucherQuantity] = useState(1);
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [toastText, setToastText] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [expandedBox, setExpandedBox] = useState<'vouchers' | 'orders' | null>(null);
  const [pendingScrollProductId, setPendingScrollProductId] = useState<string>();
  const [highlightedProductId, setHighlightedProductId] = useState<string>();

  const contentScrollRef = useRef<ScrollView>(null);
  const productGridYRef = useRef(0);
  const searchRowYRef = useRef(0);
  const searchRowHRef = useRef(0);
  const productLayoutRef = useRef<Record<string, ProductCardLayout>>({});
  const productHighlightAnim = useRef(new Animated.Value(0)).current;
  const shopFadeAnim = useRef(new Animated.Value(1)).current;
  const shopIndexRef = useRef(0);

  const loadData = useCallback(async () => {
    const [nextProducts, nextVouchers] = await Promise.all([
      productService.getProducts(),
      voucherService.getVouchers(),
    ]);
    setProducts(nextProducts.filter((item) => item.isActive));
    setShopVouchers(nextVouchers.filter((v) => v.type === 'Shop Reservation'));
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const transitionToShopSlide = useCallback((newIndex: number) => {
    // Slow, soft cross-fade (eased) so the auto-cycle feels gentle, not sharp.
    Animated.timing(shopFadeAnim, {
      toValue: 0,
      duration: 480,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setCarouselIndex(newIndex);
      shopIndexRef.current = newIndex;
      Animated.timing(shopFadeAnim, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  }, [shopFadeAnim]);

  useEffect(() => { shopIndexRef.current = carouselIndex; }, [carouselIndex]);

  // Glide the selection pill to the active category tile.
  useEffect(() => {
    const layout = categoryLayouts[selectedCategory];
    if (!layout) return;
    Animated.parallel([
      Animated.spring(categoryPillX, {
        toValue: layout.x,
        useNativeDriver: false,
        tension: 220,
        friction: 20,
      }),
      Animated.spring(categoryPillW, {
        toValue: layout.width,
        useNativeDriver: false,
        tension: 220,
        friction: 20,
      }),
    ]).start();
  }, [categoryLayouts, selectedCategory, categoryPillX, categoryPillW]);

  const normalizedSearch = search.trim().toLowerCase();

  const shopCategoryOf = (product: Product): ShopCategory | undefined =>
    product.category ? PRODUCT_TO_SHOP_CATEGORY.get(product.category) : undefined;

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      // Favorites view shows favorited products across every category;
      // otherwise stay within the selected category.
      if (showFavoritesOnly) {
        if (!favorites.has(product.id)) return false;
      } else if (shopCategoryOf(product) !== selectedCategory) {
        return false;
      }
      if (!normalizedSearch) return true;
      return product.name.toLowerCase().includes(normalizedSearch);
    });
  }, [products, selectedCategory, normalizedSearch, showFavoritesOnly, favorites]);

  const featuredProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);
  }, [products]);

  useEffect(() => {
    if (featuredProducts.length <= 1) return undefined;
    const timer = setInterval(() => {
      const next = (shopIndexRef.current + 1) % featuredProducts.length;
      transitionToShopSlide(next);
    }, 3500);
    return () => clearInterval(timer);
  }, [featuredProducts.length, transitionToShopSlide]);

  useEffect(() => {
    if (!pendingScrollProductId) return undefined;
    if (!visibleProducts.some((product) => product.id === pendingScrollProductId)) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const productLayout = productLayoutRef.current[pendingScrollProductId];
      contentScrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(
          0,
          productGridYRef.current +
            (productLayout?.y ?? 0) -
            windowHeight / 2 +
            (productLayout?.height ?? 260) / 2,
        ),
      });
      setHighlightedProductId(pendingScrollProductId);
      setPendingScrollProductId(undefined);
    }, 120);

    return () => clearTimeout(timer);
  }, [pendingScrollProductId, visibleProducts, windowHeight]);

  useEffect(() => {
    if (!highlightedProductId) {
      productHighlightAnim.setValue(0);
      return undefined;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    productHighlightAnim.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(productHighlightAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(productHighlightAnim, {
        toValue: 0.12,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(productHighlightAnim, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setHighlightedProductId(undefined);
    });

    return () => animation.stop();
  }, [highlightedProductId, productHighlightAnim]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ShopCategory, number>();
    products.forEach((product) => {
      const shopCategory = shopCategoryOf(product);
      if (!shopCategory) return;
      counts.set(shopCategory, (counts.get(shopCategory) ?? 0) + 1);
    });
    return counts;
  }, [products]);

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
      await voucherService.createShopVoucher(
        label,
        totalAmount,
      );
      await loadData();
      setPendingVoucherProduct(undefined);
      setVoucherQuantity(1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      showToast('Voucher created successfully');
    } finally {
      setIsCreatingVoucher(false);
    }
  };

  const handleCancelPendingVoucher = async (voucherId: string) => {
    await voucherService.cancelVoucher(voucherId);
    await loadData();
  };

  // Same bright-red selection glow in both themes (red reads clearly on the
  // dark surface too), just a touch stronger in light mode where the card is
  // pale.
  const selectedProductHighlightStyle = {
    borderColor: productHighlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(225,29,46,0.30)', 'rgba(225,29,46,0.95)'],
    }),
    borderWidth: productHighlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    }),
    backgroundColor: productHighlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(225,29,46,0)', isLight ? 'rgba(225,29,46,0.12)' : 'rgba(225,29,46,0.16)'],
    }),
    shadowColor: '#E11D2E',
    shadowOpacity: productHighlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: isLight ? [0.12, 0.5] : [0.12, 0.6],
    }),
    shadowRadius: productHighlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 20],
    }),
    transform: [
      {
        scale: productHighlightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, isLight ? 1.025 : 1.02],
        }),
      },
    ],
  };

  // Opens the search field and scrolls it toward the vertical middle of the
  // screen so it sits above the keyboard and stays readable while typing.
  const openSearchAndRecenter = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setSearchOpen(true);
    setTimeout(() => {
      contentScrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(
          0,
          searchRowYRef.current - windowHeight / 2 + searchRowHRef.current / 2,
        ),
      });
    }, 60);
  };

  const scrollToProduct = (product: Product) => {
    const shopCategory = shopCategoryOf(product);
    if (shopCategory) setSelectedCategory(shopCategory);
    setShowFavoritesOnly(false);
    setSearch('');
    setSearchOpen(false);
    setPendingScrollProductId(product.id);
  };

  if (isLoading) {
    return (
      <PremiumScreenBackground redHorizonHeight={400}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={[styles.loadingText, mutedTextStyle]}>Loading marketplace...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground redHorizonHeight={400}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        ref={contentScrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Header — matches Classes (big italic title + tagline) */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, surfaceTextStyle]}>SHOP</Text>
            <Text style={[styles.headerTagline, mutedTextStyle]}>
              <Text style={styles.headerAccent}>Fuel</Text> your grind.
            </Text>
          </View>
        </View>

        {/* Featured items — auto-cycling fade widget */}
        {featuredProducts.length > 0 && featuredProducts[carouselIndex] ? (() => {
          const product = featuredProducts[carouselIndex];
          const imageUri = getDisplayProductImageUri(product);
          const isFavorite = favorites.has(product.id);
          const discount =
            product.compareAtPrice && product.compareAtPrice > product.price
              ? Math.round(
                  ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100,
                )
              : undefined;
          return (
            <View style={styles.featuredWidget}>
              <View style={styles.featuredCircleGlow} />
              <View style={styles.featuredCard}>
                {/* Only the picture cross-fades on auto-next; the glass frame,
                    text and button stay put so the widget feels coherent. */}
                <Animated.View
                  style={[StyleSheet.absoluteFillObject, { opacity: shopFadeAnim }]}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, styles.featuredFallback]}>
                      <Text style={styles.featuredFallbackText}>
                        {getInitials(product.name)}
                      </Text>
                    </View>
                  )}
                </Animated.View>
                  <LinearGradient
                    pointerEvents="none"
                    colors={[
                      'rgba(255,255,255,0.15)',
                      'rgba(255,255,255,0.02)',
                      'rgba(10,3,8,0.88)',
                    ]}
                    locations={[0, 0.30, 1]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View pointerEvents="none" style={styles.featuredGlassSpecular} />
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(255,255,255,0.10)', 'transparent', 'rgba(255,255,255,0.05)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.featuredTopRow}>
                    <HeartButton
                      isFav={isFavorite}
                      onToggle={() => toggleFavorite(product.id)}
                    />
                  </View>
                  <View style={styles.featuredBottom}>
                    <Text style={styles.featuredTitle} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.featuredDesc} numberOfLines={2}>
                      {product.description}
                    </Text>
                    <View style={styles.statsRow}>
                      <Text style={styles.featuredPrice}>
                        {formatPrice(product.price)}
                      </Text>
                      {product.compareAtPrice ? (
                        <Text style={styles.featuredCompare}>
                          {formatPrice(product.compareAtPrice)}
                        </Text>
                      ) : null}
                      {discount ? (
                        <View style={styles.featuredDiscount}>
                          <Text style={styles.featuredDiscountText}>-{discount}%</Text>
                        </View>
                      ) : product.rating ? (
                        <View style={styles.featuredRatingChip}>
                          <Text style={styles.featuredRatingText}>
                            ★ {product.rating.toFixed(1)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                        scrollToProduct(product);
                      }}
                      style={({ pressed }) => [
                        styles.featuredBookBtn,
                        pressed && styles.buttonPressed,
                      ]}>
                      <LinearGradient
                        pointerEvents="none"
                        colors={['#FF2638', '#B11226', '#2A0308']}
                        locations={[0, 0.58, 1]}
                        start={{ x: 0.08, y: 0 }}
                        end={{ x: 0.92, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Text style={styles.featuredBookBtnText}>Shop Now</Text>
                      <Text style={styles.featuredBookBtnArrow}> ›</Text>
                    </Pressable>
                  </View>
                </View>
            </View>
          );
        })() : null}

        {/* Shop by Category */}
        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Browse</Text>
            <Text style={[styles.sectionHeadingTitle, surfaceTextStyle]}>Shop by Category</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRail}>
          <View style={styles.categoryRailInner}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.categoryActivePill,
                isLight && styles.categoryActivePillLight,
                {
                  opacity: categoryPillW.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                  transform: [{ translateX: categoryPillX }],
                  width: categoryPillW,
                },
              ]}
            />
          {categoryMeta.map((meta) => {
            const isSelected = selectedCategory === meta.key;
            const count = categoryCounts.get(meta.key) ?? 0;
            const available = count > 0;
            return (
              <Pressable
                key={meta.key}
                disabled={!available}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  setCategoryLayouts((current) => {
                    const existing = current[meta.key];
                    if (existing?.x === x && existing.width === width) return current;
                    return { ...current, [meta.key]: { x, width } };
                  });
                }}
                onPress={() => {
                  void Haptics.selectionAsync().catch(() => undefined);
                  setSelectedCategory(meta.key);
                }}
                style={({ pressed }) => [
                  styles.categoryTile,
                  isLight && styles.categoryTileLight,
                  isSelected && styles.categoryTileGliding,
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
                    size={20}
                  tintColor={isSelected ? '#FFFFFF' : theme.colors.textMuted}
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
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[
                    styles.categoryLabel,
                    !isSelected && surfaceTextStyle,
                    isSelected && styles.categoryLabelSelected,
                  ]}>
                  {meta.key}
                </Text>
                <Text style={[styles.categoryCount, mutedTextStyle]}>{count} items</Text>
              </Pressable>
            );
          })}
          </View>
        </ScrollView>

        {/* Products */}
        <View
          style={styles.sectionHeading}
          onLayout={(event) => {
            searchRowYRef.current = event.nativeEvent.layout.y;
            searchRowHRef.current = event.nativeEvent.layout.height;
          }}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>{selectedCategory}</Text>
            <Text style={[styles.sectionHeadingTitle, surfaceTextStyle]}>
              {showFavoritesOnly ? 'Favorites' : 'Available Products'}
            </Text>
          </View>
          <View style={styles.sectionIcons}>
            <HeartButton
              isFav={showFavoritesOnly}
              onToggle={() => setShowFavoritesOnly((v) => !v)}
              btnSize={38}
              iconSize={17}
            />
            {searchOpen ? (
              <View style={styles.searchExpanded}>
                <SymbolView
                  name="magnifyingglass"
                  size={14}
                  tintColor={theme.colors.textFaint}
                  fallback={<Text style={styles.searchGlyphSmall}>⌕</Text>}
                />
                <TextInput
                  autoFocus
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search"
                  placeholderTextColor={theme.colors.textFaint}
                  style={[styles.searchExpandedInput, surfaceTextStyle]}
                  returnKeyType="search"
                  autoCorrect={false}
                  onBlur={() => {
                    if (!search) setSearchOpen(false);
                  }}
                />
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setSearch('');
                    setSearchOpen(false);
                  }}>
                  <SymbolView
                    name="xmark"
                    size={12}
                    tintColor={theme.colors.textMuted}
                    fallback={<Text style={styles.searchGlyphSmall}>×</Text>}
                  />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={openSearchAndRecenter}
                style={[styles.iconBtnSmall, isLight && styles.iconBtnSmallLight]}>
                <SymbolView
                  name="magnifyingglass"
                  size={17}
                  tintColor={searchIconColor}
                  fallback={<Text style={[styles.iconGlyph, { color: searchIconColor }]}>⌕</Text>}
                />
              </Pressable>
            )}
          </View>
        </View>

        {visibleProducts.length === 0 ? (
          <View style={[styles.emptyCard, themedSurfaceStyle]}>
            <Text style={[styles.emptyTitle, surfaceTextStyle]}>
              {showFavoritesOnly ? 'No favorite products' : 'No products found'}
            </Text>
            <Text style={[styles.emptyBody, mutedTextStyle]}>
              {showFavoritesOnly
                ? 'Tap the heart on a product to add it here.'
                : normalizedSearch
                  ? 'Try a different search term.'
                  : 'No products in this category yet.'}
            </Text>
          </View>
        ) : (
          <View
            onLayout={(event: LayoutChangeEvent) => {
              productGridYRef.current = event.nativeEvent.layout.y;
            }}
            style={styles.productGrid}>
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
                <Animated.View
                  key={product.id}
                  onLayout={(event: LayoutChangeEvent) => {
                    const { height, y } = event.nativeEvent.layout;
                    productLayoutRef.current[product.id] = { height, y };
                  }}
                  style={[
                    styles.productCard,
                    themedSurfaceStyle,
                    highlightedProductId === product.id && selectedProductHighlightStyle,
                  ]}>
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
                    <HeartButton
                      isFav={isFavorite}
                      onToggle={() => toggleFavorite(product.id)}
                      btnSize={32}
                      iconSize={15}
                      style={styles.favoriteButton}
                    />
                  </View>

                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, surfaceTextStyle]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={[styles.productDesc, mutedTextStyle]} numberOfLines={1}>
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
                      <Text style={[styles.price, priceTextStyle]}>
                        {formatPrice(product.price)}
                      </Text>
                      {product.compareAtPrice ? (
                        <Text style={styles.compareAtPrice}>
                          {formatPrice(product.compareAtPrice)}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                        setPendingVoucherProduct(product);
                        setVoucherQuantity(1);
                      }}
                      style={({ pressed }) => [
                        styles.voucherButton,
                        pressed && styles.buttonPressed,
                      ]}>
                      <LinearGradient
                        pointerEvents="none"
                        colors={['#FF2638', '#B11226', '#2A0308']}
                        locations={[0, 0.58, 1]}
                        start={{ x: 0.08, y: 0 }}
                        end={{ x: 0.92, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <SymbolView
                        name="bag.fill"
                        size={15}
                        tintColor={orderButtonIconColor}
                        fallback={
                          <Text style={[styles.voucherButtonGlyph, { color: orderButtonIconColor }]}>
                            {'▤'}
                          </Text>
                        }
                      />
                      <Text style={styles.voucherButtonText}>Order</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* ── ORDERS + VOUCHERS — two independent glow boxes ─────── */}
        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>My activity</Text>
            <Text style={[styles.sectionHeadingTitle, surfaceTextStyle]}>Vouchers &amp; Orders</Text>
          </View>
        </View>
        <View style={styles.actBoxRow}>
          {/* VOUCHERS (left): pending, awaiting counter — can be canceled */}
          <Pressable
            onPress={() => {
              if (expandedBox !== 'vouchers') {
                void Haptics.selectionAsync().catch(() => undefined);
              }
              setExpandedBox(expandedBox === 'vouchers' ? null : 'vouchers');
            }}
            style={[
              styles.actBox,
              lightGlassStyle,
              expandedBox === 'vouchers' && styles.actBoxActive,
              isLight && expandedBox === 'vouchers' && styles.actBoxActiveLight,
            ]}>
            <SymbolView
              name="ticket.fill"
              size={24}
              tintColor={premiumColors.redBright}
              fallback={<Text style={styles.actBoxGlyph}>▤</Text>}
            />
            <Text style={[styles.actBoxCount, surfaceTextStyle]}>{pendingVouchers.length}</Text>
            <Text style={[styles.actBoxLabel, surfaceTextStyle]}>Vouchers</Text>
            <Text style={[styles.actBoxSub, mutedTextStyle]}>Pending</Text>
          </Pressable>

          {/* ORDERS (right): confirmed + canceled history log */}
          <Pressable
            onPress={() => {
              if (expandedBox !== 'orders') {
                void Haptics.selectionAsync().catch(() => undefined);
              }
              setExpandedBox(expandedBox === 'orders' ? null : 'orders');
            }}
            style={[
              styles.actBox,
              lightGlassStyle,
              expandedBox === 'orders' && styles.actBoxActive,
              isLight && expandedBox === 'orders' && styles.actBoxActiveLight,
            ]}>
            <SymbolView
              name="bag.fill"
              size={24}
              tintColor={premiumColors.redBright}
              fallback={<Text style={styles.actBoxGlyph}>≡</Text>}
            />
            <Text style={[styles.actBoxCount, surfaceTextStyle]}>{historyVouchers.length}</Text>
            <Text style={[styles.actBoxLabel, surfaceTextStyle]}>Orders</Text>
            <Text style={[styles.actBoxSub, mutedTextStyle]}>History</Text>
          </Pressable>
        </View>

        {/* Vouchers expanded — pending, can cancel */}
        {expandedBox === 'vouchers' ? (
          <View style={[styles.expandedPanel, lightGlassStyle]}>
            <Text style={[styles.expandedTitle, surfaceTextStyle]}>My Vouchers</Text>
            <Text style={[styles.expandedSub, mutedTextStyle]}>
              Awaiting counter confirmation. Cancel anytime before pickup.
            </Text>
            {pendingVouchers.length === 0 ? (
              <View style={[styles.emptyCard, themedSurfaceStyle]}>
                <Text style={[styles.emptyTitle, surfaceTextStyle]}>No pending vouchers</Text>
                <Text style={[styles.emptyBody, mutedTextStyle]}>
                  Reserve a product to create a cash voucher.
                </Text>
              </View>
            ) : (
              <View style={styles.voucherList}>
                {pendingVouchers.map((voucher) => (
                  <View key={voucher.id} style={[styles.voucherRow, lightGlassStyle]}>
                    <View
                      style={[
                        styles.voucherRail,
                        { backgroundColor: getVoucherStatusColor(voucher.status) },
                      ]}
                    />
                    <View style={styles.voucherRowBody}>
                      <Text style={[styles.voucherRowTitle, surfaceTextStyle]} numberOfLines={2}>
                        {voucher.description}
                      </Text>
                      <Text style={[styles.voucherRowMeta, mutedTextStyle]}>
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
          <View style={[styles.expandedPanel, lightGlassStyle]}>
            <Text style={[styles.expandedTitle, surfaceTextStyle]}>Order History</Text>
            <Text style={[styles.expandedSub, mutedTextStyle]}>
              Confirmed and canceled shop orders.
            </Text>
            <GlideSegmentedControl
              options={['Confirmed', 'Canceled'] as const}
              value={orderTab}
              onChange={setOrderTab}
            />
            {orderedVouchers.length === 0 ? (
              <View style={[styles.emptyCard, themedSurfaceStyle]}>
                <Text style={[styles.emptyTitle, surfaceTextStyle]}>
                  No {orderTab.toLowerCase()} orders
                </Text>
                <Text style={[styles.emptyBody, mutedTextStyle]}>
                  {orderTab === 'Confirmed'
                    ? 'Orders confirmed at the counter will appear here.'
                    : 'Cancelled orders will appear here.'}
                </Text>
              </View>
            ) : (
              <View style={styles.voucherList}>
                {orderedVouchers.map((voucher) => (
                  <View key={voucher.id} style={[styles.voucherRow, lightGlassStyle]}>
                    <View
                      style={[
                        styles.voucherRail,
                        { backgroundColor: getVoucherStatusColor(voucher.status) },
                      ]}
                    />
                    <View style={styles.voucherRowBody}>
                      <Text style={[styles.voucherRowTitle, surfaceTextStyle]} numberOfLines={2}>
                        {voucher.description}
                      </Text>
                      <Text style={[styles.voucherRowMeta, mutedTextStyle]}>
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
          <View style={[styles.modalCard, themedSurfaceStyle]}>
            {pendingVoucherProduct ? (
              <>
                <Text style={styles.modalKicker}>
                  Reserve {getReservationKind(pendingVoucherProduct)}
                </Text>
                <Text style={[styles.modalTitle, surfaceTextStyle]}>{pendingVoucherProduct.name}</Text>
                <Text style={[styles.modalBody, mutedTextStyle]}>
                  A pending order is created and paid in cash at the counter.
                </Text>

                <View style={styles.quantityAdjuster}>
                  <Pressable
                    onPress={() => {
                      void Haptics.selectionAsync().catch(() => undefined);
                      setVoucherQuantity((value) => Math.max(1, value - 1));
                    }}
                    style={({ pressed }) => [
                      styles.quantityButton,
                      isLight && styles.quantityButtonLight,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={[styles.quantityButtonText, isLight && styles.quantityButtonTextLight]}>-</Text>
                  </Pressable>
                  <View style={[styles.quantityValuePill, isLight && styles.quantityValuePillLight]}>
                    <Text style={[styles.quantityValue, isLight && styles.quantityValueLight]}>{voucherQuantity}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      void Haptics.selectionAsync().catch(() => undefined);
                      setVoucherQuantity((value) => Math.min(20, value + 1));
                    }}
                    style={({ pressed }) => [
                      styles.quantityButton,
                      isLight && styles.quantityButtonLight,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={[styles.quantityButtonText, isLight && styles.quantityButtonTextLight]}>+</Text>
                  </Pressable>
                </View>

                <View style={styles.orderAmountRow}>
                  <Text style={[styles.orderAmountText, mutedTextStyle]}>
                    {formatPrice(pendingVoucherProduct.price * voucherQuantity)}
                  </Text>
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
                    <LinearGradient
                      pointerEvents="none"
                      colors={['#FF2638', '#B11226', '#2A0308']}
                      locations={[0, 0.58, 1]}
                      start={{ x: 0.08, y: 0 }}
                      end={{ x: 0.92, y: 1 }}
                      style={styles.modalPrimaryFill}>
                      <View pointerEvents="none" style={styles.modalPrimaryGloss} />
                      <Text style={styles.modalPrimaryText}>Place Order</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            ) : null}
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
  // Header (matches ClassesScreen)
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
    lineHeight: 56,
  },
  headerTagline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 20,
  },
  headerAccent: { color: premiumColors.redBright, fontWeight: '800' },
  iconGlyph: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  // Section icon controls (favorites + expanding search)
  sectionIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtnSmall: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.30)',
    borderRadius: 19,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },
  iconBtnSmallLight: {
    borderColor: 'rgba(100,116,139,0.55)',
    backgroundColor: 'rgba(100,116,139,0.10)',
  },
  iconBtnActive: {
    borderColor: 'rgba(225,29,46,0.55)',
    backgroundColor: 'rgba(177,18,38,0.2)',
  },
  searchExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 168,
    height: 38,
    borderWidth: 1.5,
    borderColor: 'rgba(225,29,46,0.60)',
    borderRadius: 19,
    backgroundColor: 'rgba(177,18,38,0.10)',
    paddingHorizontal: 12,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 6,
  },
  searchExpandedInput: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
  },
  searchGlyphSmall: { color: premiumColors.textMuted, fontSize: 12, fontWeight: '800' },

  // Featured auto-fade widget
  featuredWidget: {
    marginBottom: 8,
    paddingBottom: 10,
    position: 'relative',
  },
  featuredGlassSpecular: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  // Circular red bloom behind the card (1×1 dot, huge shadowRadius = oval halo)
  featuredCircleGlow: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 55,
    elevation: 20,
  },
  featuredCard: {
    width: '100%',
    height: 300,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.52)',
    ...premiumShadow,
  },
  featuredFallback: {
    backgroundColor: premiumColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredFallbackText: { color: '#FFFFFF', fontSize: 48, fontWeight: '900' },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredBadge: {
    borderRadius: 999,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  featuredBottom: { padding: 18 },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  featuredDesc: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  featuredPrice: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  featuredCompare: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  featuredDiscount: {
    borderRadius: 8,
    backgroundColor: premiumColors.redBright,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featuredDiscountText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  featuredRatingChip: {
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featuredRatingText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  featuredBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
    backgroundColor: premiumColors.red,
    paddingVertical: 12,
    ...premiumGlow,
  },
  featuredBookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  featuredBookBtnArrow: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotActive: { width: 22, backgroundColor: premiumColors.redBright },

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
    paddingRight: 4,
    paddingVertical: 8,
    marginBottom: 22,
  },
  categoryRailInner: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
  },
  categoryActivePill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.72)',
    backgroundColor: 'rgba(177, 18, 38, 0.34)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 6,
  },
  categoryActivePillLight: {
    borderColor: 'rgba(225, 29, 46, 0.68)',
  },
  categoryTile: {
    width: 104,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 13,
    paddingHorizontal: 10,
  },
  categoryTileLight: {
    borderColor: 'rgba(148, 163, 184, 0.55)',
  },
  categoryTileGliding: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  categoryTileDisabled: {
    opacity: 0.4,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  categoryIconWrapSelected: {
    backgroundColor: premiumColors.red,
  },
  categoryFallback: {
    color: premiumColors.textMuted,
    fontSize: 14,
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
    alignSelf: 'stretch',
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
    color: '#000000',
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
    position: 'relative',
    gap: 6,
    overflow: 'hidden',
    minHeight: 40,
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
    backgroundColor: premiumColors.red,
    marginTop: 12,
    ...premiumGlow,
  },
  voucherButtonGlyph: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  voucherButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    marginBottom: 14,
    padding: 3,
    overflow: 'visible',
  },
  segmentedControlGlide: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    overflow: 'hidden',
    borderRadius: 999,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  segmentedControlBtn: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    zIndex: 1,
  },
  segmentedControlBtnLeft: {
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  segmentedControlBtnRight: {
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  segmentedControlBtnPressed: {
    opacity: 0.75,
  },
  segmentedControlText: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentedControlTextActive: {
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
    borderWidth: 1.4,
    borderColor: 'rgba(225,29,46,0.55)',
    borderRadius: 999,
    backgroundColor: 'rgba(7,2,5,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 12,
  },
  voucherCancelText: {
    color: '#FFFFFF',
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
  quantityAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  quantityButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  quantityButtonLight: {
    borderColor: 'rgba(107,114,128,0.55)',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  quantityButtonTextLight: {
    color: '#4B5563',
  },
  quantityValuePill: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  quantityValuePillLight: {
    borderColor: 'rgba(107,114,128,0.55)',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  quantityValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  quantityValueLight: {
    color: '#4B5563',
  },
  orderAmountRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  orderAmountText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: 'rgba(225,29,46,0.55)',
    borderRadius: 999,
    backgroundColor: 'rgba(7,2,5,0.45)',
  },
  modalSecondaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  modalPrimaryButton: {
    flex: 1.4,
    borderRadius: 999,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  modalPrimaryFill: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
  },
  modalPrimaryGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255,255,255,0.075)',
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

  // Two-box row (Orders / Vouchers)
  actBoxRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  actBox: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: 'transparent',
    paddingVertical: 22,
    paddingHorizontal: 10,
    gap: 4,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  actBoxWatermark: {
    position: 'absolute',
    right: -12,
    top: -10,
    width: 80,
    height: 80,
    opacity: 0.12,
    tintColor: '#FFFFFF',
    transform: [{ rotate: '14deg' }],
  },
  actBoxActive: {
    borderColor: 'rgba(225, 29, 46, 0.55)',
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
  },
  actBoxActiveLight: {
    borderColor: 'rgba(10, 11, 15, 0.78)',
  },
  actBoxGlyph: { color: premiumColors.redBright, fontSize: 22 },
  actBoxCount: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 4 },
  actBoxLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  actBoxSub: { color: mutedColor, fontSize: 11, fontWeight: '700' },

  // Expanded panel (vouchers / orders)
  expandedPanel: {
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
