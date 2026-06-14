import { paymentHistory, products } from '../mock';
import type { Payment, Product, ProductCategory } from '../types';

export const getProducts = async (): Promise<Product[]> => {
  return products;
};

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  return ['Gym Equipment', 'Beverages', 'Snacks'];
};

export const buyProduct = async (
  productId: string,
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
    method: 'Cash',
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
