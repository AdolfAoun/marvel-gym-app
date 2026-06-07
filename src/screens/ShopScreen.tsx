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
import { SafeAreaView } from 'react-native-safe-area-context';

import { productService } from '@/services';
import type { Product, ProductCategory } from '@/types';

const accentColor = '#B11226';
const wineColor = '#58111B';
const backgroundColor = '#FFF8F7';
const surfaceColor = '#FFFFFF';
const textColor = '#181A20';
const mutedColor = '#667085';

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
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading marketplace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <Text style={styles.kicker}>Member shop</Text>
          <Text style={styles.heroTitle}>Browse gym essentials.</Text>
          <Text style={styles.heroBody}>
            Check current availability and compare prices for Marvel Gym products.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Categories</Text>
              <Text style={styles.sectionTitle}>Product filters</Text>
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
                <Text style={styles.productImageText}>
                  {getProductImageLabel(product)}
                </Text>
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
                <Text
                  style={[
                    styles.availabilityText,
                    !product.isAvailable && styles.unavailableText,
                  ]}>
                  {product.isAvailable ? 'Available' : 'Out of Stock'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 108,
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
    borderRadius: 28,
    backgroundColor: accentColor,
    padding: 20,
    marginBottom: 14,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 7,
  },
  heroGlow: {
    position: 'absolute',
    right: -76,
    top: -76,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  kicker: {
    color: '#F7D6DC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 36,
    marginTop: 6,
  },
  heroBody: {
    color: '#FCE7EA',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
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
    backgroundColor: '#FFF8F7',
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
    backgroundColor: '#FFFFFF',
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
    minHeight: 228,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 24,
    backgroundColor: surfaceColor,
    padding: 14,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  productCardUnavailable: {
    opacity: 0.58,
  },
  productImage: {
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF1F3',
    marginBottom: 12,
  },
  productImageText: {
    color: accentColor,
    fontSize: 22,
    fontWeight: '900',
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
    borderTopColor: 'rgba(177, 18, 38, 0.1)',
    marginTop: 12,
    paddingTop: 12,
  },
  productPrice: {
    color: wineColor,
    fontSize: 14,
    fontWeight: '900',
  },
  availabilityText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  unavailableText: {
    color: '#F59E0B',
  },
});
