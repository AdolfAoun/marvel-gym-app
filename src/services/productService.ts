import { paymentHistory, products } from '../mock';
import type {
  Payment,
  PaymentMethod,
  Product,
  ProductCategory,
} from '../types';

export const getProducts = async (): Promise<Product[]> => {
  return products;
};

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  return ['Gym Equipment', 'Beverages', 'Snacks'];
};

export const buyProduct = async (
  productId: string,
  method: PaymentMethod = 'Pay at Counter',
): Promise<Payment | undefined> => {
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return undefined;
  }

  return {
    ...paymentHistory[1],
    productId: product.id,
    amount: product.price,
    currency: product.currency,
    method,
    status: 'Paid',
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const productService = {
  getProducts,
  getProductCategories,
  buyProduct,
};
