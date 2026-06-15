import { paymentHistory, products } from '../mock';
import type { Payment, Product, ProductCategory } from '../types';

export type ProductMutationInput = {
  category: ProductCategory;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  name: string;
  price: number;
};

let productRecords: Product[] = [...products];

export const getProducts = async (): Promise<Product[]> => {
  return productRecords;
};

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  return ['Gym Equipment', 'Beverages', 'Snacks'];
};

export const buyProduct = async (
  productId: string,
): Promise<Payment | undefined> => {
  const product = productRecords.find((item) => item.id === productId);

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

export const getAdminProducts = async (): Promise<Product[]> => {
  return productRecords;
};

export const createProduct = async (
  input: ProductMutationInput,
): Promise<Product> => {
  const timestamp = new Date().toISOString();
  const product: Product = {
    id: `product-${Date.now().toString(36)}`,
    currency: 'USD',
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };

  productRecords = [product, ...productRecords];

  return product;
};

export const updateProduct = async (
  productId: string,
  updates: Partial<ProductMutationInput>,
): Promise<Product | undefined> => {
  let updatedProduct: Product | undefined;

  productRecords = productRecords.map((product) => {
    if (product.id !== productId) {
      return product;
    }

    updatedProduct = {
      ...product,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return updatedProduct;
  });

  return updatedProduct;
};

export const deleteProduct = async (
  productId: string,
): Promise<Product | undefined> => {
  const deletedProduct = productRecords.find((product) => product.id === productId);

  productRecords = productRecords.filter((product) => product.id !== productId);

  return deletedProduct;
};

export const toggleProductAvailability = async (
  productId: string,
): Promise<Product | undefined> => {
  const product = productRecords.find((item) => item.id === productId);

  if (!product) {
    return undefined;
  }

  return updateProduct(productId, { isAvailable: !product.isAvailable });
};

export const productService = {
  getProducts,
  getProductCategories,
  buyProduct,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
};
