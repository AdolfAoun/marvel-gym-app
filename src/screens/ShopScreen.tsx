import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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
import type { Product } from '@/types';

const accentColor = '#B11226';

function formatPrice(product: Product) {
  return `${product.currency} ${product.price.toFixed(2)}`;
}

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('Reserve products and pay at the counter.');

  useEffect(() => {
    const loadProducts = async () => {
      const nextProducts = await productService.getProducts();

      setProducts(nextProducts.filter((item) => item.isActive));
      setIsLoading(false);
    };

    loadProducts();
  }, []);

  const handleReserve = async (product: Product) => {
    if (!product.isAvailable) {
      setFeedback(`${product.name} is currently unavailable.`);
      return;
    }

    await productService.buyProduct(product.id);
    setFeedback(`${product.name} reserved for counter payment.`);
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Member shop</Text>
          <Text style={styles.title}>Gym essentials</Text>
          <Text style={styles.subtitle}>
            View products available at Marvel Gym.
          </Text>
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={accentColor} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : (
          <View style={styles.productList}>
            {products.map((product) => (
              <View
                key={product.id}
                style={[
                  styles.productCard,
                  !product.isAvailable && styles.productCardUnavailable,
                ]}>
                <View style={styles.productTopRow}>
                  <View style={styles.productImagePlaceholder}>
                    <Text style={styles.productImageText}>
                      {product.name.slice(0, 1)}
                    </Text>
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDescription}>
                      {product.description ?? 'Available at the gym counter.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.productBottomRow}>
                  <View>
                    <Text style={styles.priceText}>{formatPrice(product)}</Text>
                    <Text
                      style={[
                        styles.availabilityText,
                        !product.isAvailable && styles.unavailableText,
                      ]}>
                      {product.isAvailable ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>

                  <Pressable
                    disabled={!product.isAvailable}
                    onPress={() => handleReserve(product)}
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
                      Reserve
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F7',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 108,
  },
  header: {
    marginBottom: 18,
  },
  kicker: {
    color: accentColor,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#181A20',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 18,
    backgroundColor: '#FFF1F3',
    padding: 14,
    marginBottom: 14,
  },
  feedbackText: {
    color: '#58111B',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  loadingCard: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  loadingText: {
    color: '#5B6472',
    fontSize: 14,
    fontWeight: '700',
  },
  productList: {
    gap: 14,
  },
  productCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  productCardUnavailable: {
    opacity: 0.58,
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  productImagePlaceholder: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 18,
    backgroundColor: '#FFF1F3',
  },
  productImageText: {
    color: accentColor,
    fontSize: 22,
    fontWeight: '900',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    color: '#181A20',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 5,
  },
  productDescription: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  productBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceText: {
    color: '#181A20',
    fontSize: 18,
    fontWeight: '900',
  },
  availabilityText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  unavailableText: {
    color: '#F59E0B',
  },
  reserveButton: {
    minHeight: 44,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: accentColor,
    paddingHorizontal: 16,
  },
  reserveButtonDisabled: {
    backgroundColor: '#E6E8EC',
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  reserveButtonTextDisabled: {
    color: '#8B95A5',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
