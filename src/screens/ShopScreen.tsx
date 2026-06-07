import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { productService, voucherService } from '@/services';
import type { Product, ProductCategory, Voucher } from '@/types';

const accentColor = '#B11226';
const wineColor = '#58111B';
const backgroundColor = '#FFF8F7';
const surfaceColor = '#FFFFFF';
const textColor = '#181A20';
const mutedColor = '#667085';

type SortMode = 'price-asc' | 'price-desc';
type PaymentMode = 'Pay at Counter' | 'Pay with Card';

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
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [latestVoucher, setLatestVoucher] = useState<Voucher>();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingVoucher, setIsCreatingVoucher] = useState(false);
  const [feedback, setFeedback] = useState('Reserve products and pay at the counter.');
  const modalProgress = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    modalProgress.setValue(0);
    Animated.spring(modalProgress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  }, [selectedProduct, modalProgress]);

  const visibleProducts = useMemo(() => {
    return products
      .filter((product) => product.category === selectedCategory)
      .sort((first, second) =>
        sortMode === 'price-asc'
          ? first.price - second.price
          : second.price - first.price,
      );
  }, [products, selectedCategory, sortMode]);

  const closeModal = () => {
    Animated.timing(modalProgress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setSelectedProduct(undefined));
  };

  const handleReserve = async (paymentMode: PaymentMode) => {
    if (!selectedProduct) {
      return;
    }

    setIsCreatingVoucher(true);

    try {
      if (paymentMode === 'Pay with Card') {
        await productService.buyProduct(selectedProduct.id, 'Visa');
      }

      const voucher = await voucherService.createShopVoucher(
        selectedProduct.name,
        selectedProduct.price,
        paymentMode,
      );

      setLatestVoucher(voucher);
      setFeedback(
        paymentMode === 'Pay at Counter'
          ? `${selectedProduct.name} reserved. Pending shop voucher created.`
          : `${selectedProduct.name} reserved. Card placeholder created a paid voucher.`,
      );
      closeModal();
    } finally {
      setIsCreatingVoucher(false);
    }
  };

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

  const modalScale = modalProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <Text style={styles.kicker}>Member shop</Text>
          <Text style={styles.heroTitle}>Reserve gym essentials.</Text>
          <Text style={styles.heroBody}>
            Browse curated categories, reserve at the counter, or use a card
            placeholder for Phase 1.
          </Text>
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Categories</Text>
              <Text style={styles.sectionTitle}>Shop floor</Text>
            </View>
            <Text style={styles.sectionHint}>Level 1</Text>
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

              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>{formatPrice(product)}</Text>
              <Text
                style={[
                  styles.availabilityText,
                  !product.isAvailable && styles.unavailableText,
                ]}>
                {product.isAvailable ? 'Available' : 'Out of Stock'}
              </Text>

              <Pressable
                disabled={!product.isAvailable}
                onPress={() => setSelectedProduct(product)}
                style={({ pressed }) => [
                  styles.reserveButton,
                  !product.isAvailable && styles.reserveButtonDisabled,
                  pressed && styles.buttonPressed,
                ]}>
                <Text
                  style={[
                    styles.reserveButtonText,
                    !product.isAvailable && styles.reserveButtonTextDisabled,
                  ]}>
                  Reserve Item
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {latestVoucher && (
          <View style={styles.voucherCard}>
            <View style={styles.voucherTear} />
            <View style={styles.voucherContent}>
              <Text style={styles.cardLabel}>Latest voucher</Text>
              <Text style={styles.voucherTitle}>{latestVoucher.type}</Text>
              <Text style={styles.voucherBody}>{latestVoucher.description}</Text>
            </View>
            <View style={styles.voucherAmountBlock}>
              <Text style={styles.voucherAmount}>
                ${latestVoucher.amount.toFixed(2)}
              </Text>
              <Text style={styles.voucherStatus}>{latestVoucher.status}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(selectedProduct)} animationType="none">
        <Animated.View style={[styles.modalOverlay, { opacity: modalProgress }]}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [{ scale: modalScale }],
              },
            ]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalKicker}>Reserve Item</Text>
            <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
            <Text style={styles.modalBody}>
              Choose payment. Pay at counter creates a pending shop voucher;
              card payment creates a paid voucher placeholder.
            </Text>

            <View style={styles.modalProductRow}>
              <View style={styles.modalProductImage}>
                <Text style={styles.modalProductImageText}>
                  {selectedProduct ? getProductImageLabel(selectedProduct) : ''}
                </Text>
              </View>
              <View style={styles.modalProductCopy}>
                <Text style={styles.modalProductName}>
                  {selectedProduct?.name}
                </Text>
                <Text style={styles.modalProductPrice}>
                  {selectedProduct ? formatPrice(selectedProduct) : ''}
                </Text>
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <Pressable
                disabled={isCreatingVoucher}
                onPress={() => handleReserve('Pay at Counter')}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.modalSecondaryText}>Pay at Counter</Text>
              </Pressable>
              <Pressable
                disabled={isCreatingVoucher}
                onPress={() => handleReserve('Pay with Card')}
                style={({ pressed }) => [
                  styles.modalPrimaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.modalPrimaryText}>Pay with Card</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
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
  feedbackCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.16)',
    borderRadius: 20,
    backgroundColor: '#FFF1F3',
    padding: 14,
    marginBottom: 14,
  },
  feedbackText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
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
  sectionHint: {
    color: '#8E6670',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
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
    minHeight: 238,
    flexBasis: '47%',
    flexGrow: 1,
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
  productName: {
    color: textColor,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  productPrice: {
    color: wineColor,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 6,
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
  reserveButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: accentColor,
    marginTop: 12,
  },
  reserveButtonDisabled: {
    backgroundColor: '#E6E8EC',
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  reserveButtonTextDisabled: {
    color: '#8B95A5',
  },
  voucherCard: {
    minHeight: 108,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.14)',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  voucherTear: {
    width: 10,
    backgroundColor: accentColor,
  },
  voucherContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 15,
  },
  voucherTitle: {
    color: textColor,
    fontSize: 15,
    fontWeight: '900',
  },
  voucherBody: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 5,
  },
  voucherAmountBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 14,
  },
  voucherAmount: {
    color: textColor,
    fontSize: 17,
    fontWeight: '900',
  },
  voucherStatus: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.76,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(24, 26, 32, 0.42)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 14,
  },
  modalHandle: {
    width: 48,
    height: 5,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: '#E8D4D8',
    marginBottom: 18,
  },
  modalKicker: {
    color: accentColor,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: textColor,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  modalBody: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  modalProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 20,
    backgroundColor: '#FFF8F7',
    padding: 12,
    marginTop: 18,
  },
  modalProductImage: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
  },
  modalProductImageText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  modalProductCopy: {
    flex: 1,
  },
  modalProductName: {
    color: textColor,
    fontSize: 16,
    fontWeight: '900',
  },
  modalProductPrice: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalSecondaryButton: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.24)',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  modalSecondaryText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '900',
  },
  modalPrimaryButton: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 5,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
