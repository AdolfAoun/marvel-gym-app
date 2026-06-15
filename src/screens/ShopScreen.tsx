import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { productService } from '@/services';
import type { Product, ProductCategory } from '@/types';

const accentColor = premiumColors.red;
const wineColor = premiumColors.redBright;
const backgroundColor = premiumColors.background;
const surfaceColor = premiumColors.surface;
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;

type SortMode = 'price-asc' | 'price-desc';

function formatPrice(product: Product) {
  return `${product.currency} ${product.price.toFixed(2)}`;
}

function getProductImageLabel(product: Product) {
  return product.name
    .split(' ')
    .map((part) => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategory>('Gym Equipment');
  const [sortMode, setSortMode] = useState<SortMode>('price-asc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMarketplace = async () => {
      const [nextProducts, nextCategories] = await Promise.all([
        productService.getProducts(),
        productService.getProductCategories(),
      ]);

      setProducts(nextProducts.filter((item) => item.isActive));
      setCategories(nextCategories);
      setSelectedCategory(nextCategories[0] ?? 'Gym Equipment');
      setIsLoading(false);
    };

    loadMarketplace();
  }, []);

  const visibleProducts = useMemo(() => {
    return products
      .filter((product) => product.category === selectedCategory)
      .sort((first, second) =>
        sortMode === 'price-asc'
          ? first.price - second.price
          : second.price - first.price,
      );
  }, [products, selectedCategory, sortMode]);
  const sortLabel =
    sortMode === 'price-asc'
      ? 'Price: Low to High'
      : 'Price: High to Low';

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
      <View pointerEvents="none" style={styles.pageGlow} />
      <View pointerEvents="none" style={styles.pageBlade} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Gym Shop</Text>
          <Text style={styles.heroTitle}>Premium gym essentials.</Text>
          <Text style={styles.heroBody}>
            Check current availability and prices for Marvel Gym products.
          </Text>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Availability and pricing</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Categories</Text>
              <Text style={styles.sectionTitle}>Browse by category</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}>
            {categories.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                  ]}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.productsHeader}>
          <View>
            <Text style={styles.cardLabel}>Products</Text>
            <Text style={styles.sectionTitle}>{selectedCategory}</Text>
            <Text style={styles.sortLabel}>{sortLabel}</Text>
          </View>
          <View style={styles.sortGroup}>
            <Pressable
              onPress={() => setSortMode('price-asc')}
              style={[
                styles.sortButton,
                sortMode === 'price-asc' && styles.sortButtonSelected,
              ]}>
              <Text
                style={[
                  styles.sortButtonText,
                  sortMode === 'price-asc' && styles.sortButtonTextSelected,
                ]}>
                Low
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSortMode('price-desc')}
              style={[
                styles.sortButton,
                sortMode === 'price-desc' && styles.sortButtonSelected,
              ]}>
              <Text
                style={[
                  styles.sortButtonText,
                  sortMode === 'price-desc' && styles.sortButtonTextSelected,
                ]}>
                High
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.productGrid}>
          {visibleProducts.map((product) => (
            <View
              key={product.id}
              style={[
                styles.productCard,
                !product.isAvailable && styles.productCardUnavailable,
              ]}>
              <View style={styles.productImage}>
                <View style={styles.productImageGlow} />
                <View style={styles.productImageFrame}>
                  <Text style={styles.productImageInitialText}>
                    {getProductImageLabel(product)}
                  </Text>
                </View>
                <Text style={styles.productImageText}>Photo soon</Text>
                <View
                  style={[
                    styles.availabilityBadge,
                    !product.isAvailable && styles.availabilityBadgeUnavailable,
                  ]}>
                  <Text
                    style={[
                      styles.availabilityBadgeText,
                      !product.isAvailable &&
                        styles.availabilityBadgeTextUnavailable,
                    ]}>
                    {product.isAvailable ? 'Available' : 'Out'}
                  </Text>
                </View>
              </View>

              <View style={styles.productCopy}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.description ? (
                  <Text style={styles.productDescription}>
                    {product.description}
                  </Text>
                ) : null}
              </View>

              <View style={styles.productFooter}>
                <Text style={styles.productPrice}>{formatPrice(product)}</Text>
                <Text style={styles.productCategoryText}>{product.category}</Text>
              </View>
            </View>
          ))}
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
  pageGlow: {
    position: 'absolute',
    right: -120,
    top: 80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(177, 18, 38, 0.08)',
  },
  pageBlade: {
    position: 'absolute',
    left: -40,
    top: 260,
    width: 74,
    height: 360,
    borderRadius: 34,
    backgroundColor: 'rgba(177, 18, 38, 0.04)',
    transform: [{ rotate: '20deg' }],
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 72,
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
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 35,
    marginTop: 6,
  },
  heroBody: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  heroPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  cardLabel: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  sortLabel: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  categoryList: {
    gap: 8,
  },
  categoryChip: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 16,
  },
  categoryChipSelected: {
    borderColor: accentColor,
    backgroundColor: accentColor,
  },
  categoryChipText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '900',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sortGroup: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
  },
  sortButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sortButtonSelected: {
    backgroundColor: accentColor,
  },
  sortButtonText: {
    color: wineColor,
    fontSize: 12,
    fontWeight: '900',
  },
  sortButtonTextSelected: {
    color: '#FFFFFF',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  productCard: {
    minHeight: 246,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 13,
    ...premiumShadow,
  },
  productCardUnavailable: {
    opacity: 0.58,
  },
  productImage: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: premiumColors.surfaceSoft,
    marginBottom: 12,
  },
  productImageGlow: {
    position: 'absolute',
    left: -26,
    bottom: -28,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(225, 29, 46, 0.14)',
  },
  productImageFrame: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    backgroundColor: 'rgba(7, 8, 12, 0.78)',
  },
  productImageText: {
    color: accentColor,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  productImageInitialText: {
    color: accentColor,
    fontSize: 20,
    fontWeight: '900',
  },
  availabilityBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availabilityBadgeUnavailable: {
    backgroundColor: '#FEF3C7',
  },
  availabilityBadgeText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  availabilityBadgeTextUnavailable: {
    color: '#B45309',
  },
  productCopy: {
    flex: 1,
  },
  productName: {
    color: textColor,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  productDescription: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 6,
  },
  productFooter: {
    borderTopWidth: 1,
    borderTopColor: premiumColors.border,
    marginTop: 12,
    paddingTop: 12,
  },
  productPrice: {
    color: wineColor,
    fontSize: 14,
    fontWeight: '900',
  },
  productCategoryText: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
});
