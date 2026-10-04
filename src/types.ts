/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

export type UserRole = 'admin' | 'seller' | 'buyer';
export type UserStatus = 'active' | 'disabled' | 'pending_approval';

export interface BankCard {
  id: string;
  cardNumber: string;
  cardholderName: string;
  expDate: string;
  provider: 'visa' | 'mastercard' | 'amex' | 'discover';
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  email: string;
  balance?: number; // Only for buyers
  storeName?: string; // Only for sellers
  bankCards?: BankCard[]; // Simulated user credit/debit cards
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  unitsSold: number;
  totalRevenue: number;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  date: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  status?: 'paid' | 'refunded';
  refundedAt?: string;
}

export interface SalesStat {
  date: string;
  revenue: number;
  unitsSold: number;
}

export interface SystemActivity {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}
