import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GlowingChips } from '@/components/GlowingChips';
import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { MarvelMarks } from '@/components/PremiumUI';
import {
  premiumColors,
  premiumGradients,
  premiumShadow,
} from '@/constants/premiumTheme';
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

function getDisplayProductImageUri(product: Product) {
  if (!product.imageUrl || product.imageUrl.includes('example.com')) {
    return undefined;
  }

  return product.imageUrl;
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={premiumGradients.redPanel}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGloss} />
          <MarvelMarks variant="corner" color="#FFFFFF" />
          <Text style={styles.kicker}>Gym Shop</Text>
          <Text style={styles.heroTitle}>Premium gym essentials.</Text>
          <Text style={styles.heroBody}>
            Check current availability and prices for Marvel Gym products.
          </Text>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Availability and pricing</Text>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Categories</Text>
            <Text style={styles.sectionHeadingTitle}>Browse by category</Text>
          </View>
        </View>

        <View style={styles.categoryList}>
          <GlowingChips
            items={categories.map((category) => ({
              key: category,
              label: category,
            }))}
            selectedKey={selectedCategory}
            onSelect={(key) => setSelectedCategory(key as ProductCategory)}
          />
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Products</Text>
            <Text style={styles.productCategoryHeading}>{selectedCategory}</Text>
            <Text style={styles.sortLabel}>{sortLabel}</Text>
          </View>
          <View style={styles.sortGroup}>
            <GlowingChips
              variant="segment"
              items={[
                { key: 'price-asc', label: 'Low' },
                { key: 'price-desc', label: 'High' },
              ]}
              selectedKey={sortMode}
              onSelect={(key) => setSortMode(key as SortMode)}
            />
          </View>
        </View>

        <View style={styles.productGrid}>
          {visibleProducts.map((product) => {
            const displayImageUri = getDisplayProductImageUri(product);

            return (
              <View
                key={product.id}
                style={[
                  styles.productCard,
                  !product.isAvailable && styles.productCardUnavailable,
                ]}>
                <View style={styles.productImage}>
                  {displayImageUri ? (
                    <Image
                      source={{ uri: displayImageUri }}
                      style={styles.productPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <>
                      <View style={styles.productImageGlow} />
                      <View style={styles.productImageFrame}>
                        <Text style={styles.productImageInitialText}>
                          {getProductImageLabel(product)}
                        </Text>
                      </View>
                      <Text style={styles.productImageText}>Photo soon</Text>
                    </>
                  )}
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
                  <View style={styles.priceStatusRow}>
                    <Text style={styles.productPrice}>{formatPrice(product)}</Text>
                    <View
                      style={[
                        styles.availabilityPill,
                        !product.isAvailable && styles.availabilityPillUnavailable,
                      ]}>
                      <Text
                        style={[
                          styles.availabilityPillText,
                          !product.isAvailable && styles.availabilityPillTextUnavailable,
                        ]}>
                        {product.isAvailable ? 'Available' : 'Out of stock'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.productCategoryText}>{product.category}</Text>
                </View>
              </View>
            );
          })}
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
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 10,
  },
  heroGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroSheen: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 120, 130, 0.2)',
  },
  kicker: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 35,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroBody: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  heroPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: '#FFFFFF',
    fontSize: 11,
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
    color: textColor,
    fontSize: 21,
    fontWeight: '900',
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
    marginTop: 8,
  },
  categoryList: {
    paddingBottom: 18,
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  productCategoryHeading: {
    color: textColor,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
    marginTop: 4,
  },
  sortGroup: {
    flexDirection: 'row',
    width: 132,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  productCard: {
    minHeight: 256,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 24,
    backgroundColor: surfaceColor,
    padding: 12,
    ...premiumShadow,
  },
  productCardUnavailable: {
    opacity: 0.58,
  },
  productImage: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
  productPhoto: {
    width: '100%',
    height: '100%',
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
  priceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  availabilityPill: {
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.16)',
    borderRadius: 999,
    backgroundColor: 'rgba(34, 197, 94, 0.07)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  availabilityPillUnavailable: {
    borderColor: 'rgba(245, 158, 11, 0.18)',
    backgroundColor: 'rgba(245, 158, 11, 0.07)',
  },
  availabilityPillText: {
    color: '#74DFA0',
    fontSize: 7,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  availabilityPillTextUnavailable: {
    color: '#EAB308',
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
