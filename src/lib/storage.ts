/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

import { User, Product, Order, SystemActivity } from '../types';

// Pre-configured Users
const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    name: 'Built-in Administrator',
    email: 'admin@marketplace.com',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'u-seller1',
    username: 'alpha_seller',
    password: 'password123',
    role: 'seller',
    status: 'active',
    name: 'Alpha Electronics & Gear',
    email: 'sales@alphagear.com',
    storeName: 'Alpha Tech & Gear',
    createdAt: '2026-01-10T12:00:00.000Z'
  },
  {
    id: 'u-seller2',
    username: 'nordic_living',
    password: 'password123',
    role: 'seller',
    status: 'active',
    name: 'Nordic Designs Co.',
    email: 'info@nordicliving.com',
    storeName: 'Nordic Minimalist Living',
    createdAt: '2026-02-15T09:30:00.000Z'
  },
  {
    id: 'u-buyer1',
    username: 'alex_buyer',
    password: 'password123',
    role: 'buyer',
    status: 'active',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    balance: 1500, // Virtual starting balance
    createdAt: '2026-03-01T15:45:00.000Z'
  },
  {
    id: 'u-buyer2',
    username: 'jane_shopper',
    password: 'password123',
    role: 'buyer',
    status: 'active',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    balance: 850,
    createdAt: '2026-03-05T11:20:00.000Z'
  }
];

// Pre-configured Products
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Minimalist Leather Watch',
    description: 'An elegant timepiece featuring a polished silver casing, a clean minimalist dial, and a genuine tan leather strap.',
    price: 349.99,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    category: 'Electronics',
    stock: 12,
    unitsSold: 42,
    totalRevenue: 14699.58,
    createdAt: '2026-01-12T14:00:00.000Z'
  },
  {
    id: 'p-2',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Wireless Headphones',
    description: 'High-fidelity over-ear headphones with advanced active noise cancellation, rich deep bass, and comfortable leather cushions.',
    price: 199.50,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    category: 'Audio & Acoustics',
    stock: 18,
    unitsSold: 64,
    totalRevenue: 12768.00,
    createdAt: '2026-01-15T10:30:00.000Z'
  },
  {
    id: 'p-3',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Ergonomic Oak Desk',
    description: 'A premium minimalist desk constructed from solid natural oak with sturdy steel legs and a clean, built-in drawer.',
    price: 449.00,
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
    category: 'Home & Office',
    stock: 5,
    unitsSold: 12,
    totalRevenue: 5388.00,
    createdAt: '2026-02-18T16:00:00.000Z'
  },
  {
    id: 'p-4',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Sport Running Shoes',
    description: 'Lightweight, breathable athletic sneakers featuring responsive cushion soles and advanced performance mesh fabric.',
    price: 89.95,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    category: 'Fashion & Apparel',
    stock: 35,
    unitsSold: 108,
    totalRevenue: 9714.60,
    createdAt: '2026-01-20T08:15:00.000Z'
  },
  {
    id: 'p-5',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Glass Teapot',
    description: 'A heat-resistant borosilicate glass teapot complete with a removable stainless steel infuser and an elegant bamboo lid.',
    price: 38.00,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    category: 'Home & Office',
    stock: 22,
    unitsSold: 145,
    totalRevenue: 5510.00,
    createdAt: '2026-02-20T11:45:00.000Z'
  },
  {
    id: 'p-6',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Luxury Towel Set',
    description: 'Premium spa-quality towels loomed from organic cotton and natural bamboo fibers. Naturally quick-drying and extra soft.',
    price: 54.00,
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    category: 'Home & Office',
    stock: 45,
    unitsSold: 58,
    totalRevenue: 3132.00,
    createdAt: '2026-02-22T14:20:00.000Z'
  },
  {
    id: 'p-7',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Mechanical Keyboard',
    description: 'A compact professional keyboard equipped with tactile brown switches, warm amber backlight, and a premium walnut wood frame.',
    price: 159.00,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    category: 'Electronics',
    stock: 14,
    unitsSold: 35,
    totalRevenue: 5565.00,
    createdAt: '2026-03-01T10:00:00.000Z'
  },
  {
    id: 'p-8',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Leather Backpack',
    description: 'A timeless, rugged backpack handcrafted from vegetable-tanned full-grain leather, featuring a padded laptop slot.',
    price: 210.00,
    imageUrl: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&auto=format&fit=crop&q=80',
    category: 'Travel & Carry',
    stock: 9,
    unitsSold: 28,
    totalRevenue: 5880.00,
    createdAt: '2026-03-05T12:00:00.000Z'
  },
  {
    id: 'p-9',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Decorative Hourglass',
    description: 'A beautiful hand-blown glass hourglass filled with fine white sand. Measures exactly thirty minutes.',
    price: 75.00,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    category: 'Aesthetic Crafts',
    stock: 16,
    unitsSold: 41,
    totalRevenue: 3075.00,
    createdAt: '2026-03-10T09:15:00.000Z'
  },
  {
    id: 'p-10',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Ceramic Pour-Over Set',
    description: 'A premium matte ceramic coffee dripper and matching glass server, designed for brewing rich hand-poured coffee.',
    price: 65.00,
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80',
    category: 'Aesthetic Crafts',
    stock: 24,
    unitsSold: 88,
    totalRevenue: 5720.00,
    createdAt: '2026-03-15T11:45:00.000Z'
  },
  {
    id: 'p-11',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Portable Speaker',
    description: 'A compact wireless speaker housed in custom walnut wood. Delivers room-filling acoustic sound with 20 hours of battery life.',
    price: 129.00,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80',
    category: 'Audio & Acoustics',
    stock: 15,
    unitsSold: 52,
    totalRevenue: 6708.00,
    createdAt: '2026-03-20T14:30:00.000Z'
  },
  {
    id: 'p-12',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Leather Card Wallet',
    description: 'An ultra-slim, minimalist cardholder hand-stitched from vegetable-tanned leather with four convenient slots.',
    price: 49.00,
    imageUrl: 'https://images.unsplash.com/photo-1590483736148-3c1a5e71bc34?w=600&auto=format&fit=crop&q=80',
    category: 'Fashion & Apparel',
    stock: 50,
    unitsSold: 120,
    totalRevenue: 5880.00,
    createdAt: '2026-03-25T16:00:00.000Z'
  },
  {
    id: 'p-13',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Classic Fountain Pen',
    description: 'A luxury fountain pen styled with a modern carbon-fiber finish, an ink converter, and a medium titanium-plated nib.',
    price: 89.00,
    imageUrl: 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=600&auto=format&fit=crop&q=80',
    category: 'Aesthetic Crafts',
    stock: 20,
    unitsSold: 34,
    totalRevenue: 3026.00,
    createdAt: '2026-04-02T10:00:00.000Z'
  },
  {
    id: 'p-14',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Canvas Duffle Bag',
    description: 'A spacious, water-resistant weekend duffle built from heavy cotton canvas and reinforced with leather shoulder straps.',
    price: 135.00,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    category: 'Travel & Carry',
    stock: 11,
    unitsSold: 47,
    totalRevenue: 6345.00,
    createdAt: '2026-04-10T13:30:00.000Z'
  },
  {
    id: 'p-15',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Knit Wool Blanket',
    description: 'A super cozy, thick-knit throw blanket handmade from 100% natural, hypoallergenic chunky Merino wool.',
    price: 145.00,
    imageUrl: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=600&auto=format&fit=crop&q=80',
    category: 'Aesthetic Crafts',
    stock: 12,
    unitsSold: 14,
    totalRevenue: 2030.00,
    createdAt: '2026-04-15T09:00:00.000Z'
  },
  {
    id: 'p-16',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Stone Incense Burner',
    description: 'A modern incense holder carved from solid textured travertine stone. Includes a matching brass tray.',
    price: 52.00,
    imageUrl: 'https://images.unsplash.com/photo-1602872030219-cbf046a6f196?w=600&auto=format&fit=crop&q=80',
    category: 'Aesthetic Crafts',
    stock: 18,
    unitsSold: 30,
    totalRevenue: 1560.00,
    createdAt: '2026-04-20T10:15:00.000Z'
  },
  {
    id: 'p-17',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Aluminum Suitcase',
    description: 'A premium hardshell carry-on suitcase made from aerospace-grade aluminum. Features quiet 360 spinner wheels and dual locks.',
    price: 295.00,
    imageUrl: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600&auto=format&fit=crop&q=80',
    category: 'Travel & Carry',
    stock: 8,
    unitsSold: 21,
    totalRevenue: 6195.00,
    createdAt: '2026-04-25T14:40:00.000Z'
  },
  {
    id: 'p-18',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Ceramic Cup Set',
    description: 'A pair of hand-thrown stoneware coffee cups, finished with a beautiful textured matte dark glaze.',
    price: 36.00,
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&auto=format&fit=crop&q=80',
    category: 'Home & Office',
    stock: 30,
    unitsSold: 45,
    totalRevenue: 1620.00,
    createdAt: '2026-05-01T11:00:00.000Z'
  },
  {
    id: 'p-19',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Laptop Desk Riser',
    description: 'A sleek, heavy-duty laptop stand crafted from a single piece of anodized aluminum with secure silicone pads.',
    price: 49.00,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
    category: 'Home & Office',
    stock: 15,
    unitsSold: 28,
    totalRevenue: 1372.00,
    createdAt: '2026-05-05T16:20:00.000Z'
  },
  {
    id: 'p-20',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Desk Kinetic Toy',
    description: 'A beautifully polished kinetic balance pendulum engineered from aluminum and brass to create hypnotic desk motion.',
    price: 95.00,
    imageUrl: 'https://images.unsplash.com/photo-1509343256512-d77a5cb3791b?w=600&auto=format&fit=crop&q=80',
    category: 'Home & Office',
    stock: 15,
    unitsSold: 12,
    totalRevenue: 1140.00,
    createdAt: '2026-06-01T10:00:00.000Z'
  },
  {
    id: 'p-21',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Walnut Headphone Stand',
    description: 'An elegantly curved headphone holder crafted from real American walnut wood with a secure metal base.',
    price: 49.00,
    imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80',
    category: 'Audio & Acoustics',
    stock: 22,
    unitsSold: 30,
    totalRevenue: 1470.00,
    createdAt: '2026-06-03T11:45:00.000Z'
  },
  {
    id: 'p-22',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Scented Stone Candle',
    description: 'A fragrant hand-poured soy wax candle with notes of cedar and amber, housed in a reusable carved travertine jar.',
    price: 34.00,
    imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80',
    category: 'Home & Office',
    stock: 50,
    unitsSold: 65,
    totalRevenue: 2210.00,
    createdAt: '2026-06-04T12:00:00.000Z'
  },
  {
    id: 'p-23',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Leather Passport Holder',
    description: 'A premium leather travel wallet with slots for a passport, boarding pass, credit cards, and cash.',
    price: 65.05,
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
    category: 'Travel & Carry',
    stock: 12,
    unitsSold: 18,
    totalRevenue: 1170.90,
    createdAt: '2026-06-05T09:15:00.000Z'
  },
  {
    id: 'p-24',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Glass Flower Vase',
    description: 'A beautiful hand-blown glass vase featuring organic amber swirl patterns that catch daylight elegantly.',
    price: 78.00,
    imageUrl: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&auto=format&fit=crop&q=80',
    category: 'Aesthetic Crafts',
    stock: 8,
    unitsSold: 9,
    totalRevenue: 702.00,
    createdAt: '2026-06-06T15:30:00.000Z'
  },
  {
    id: 'p-25',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Silk Sleep Mask',
    description: 'An ultra-soft, light-blocking eye mask knitted from 100% natural pure Mulberry silk to support deep sleep.',
    price: 24.50,
    imageUrl: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600&auto=format&fit=crop&q=80',
    category: 'Fashion & Apparel',
    stock: 40,
    unitsSold: 92,
    totalRevenue: 2254.00,
    createdAt: '2026-06-07T14:40:00.000Z'
  },
  {
    id: 'p-26',
    sellerId: 'u-seller1',
    sellerName: 'Alpha Tech & Gear',
    title: 'Mechanical Numeric Pad',
    description: 'A professional retro numeric keypad with mechanical keycaps and hot-swappable tactile switches.',
    price: 72.00,
    imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&auto=format&fit=crop&q=80',
    category: 'Electronics',
    stock: 20,
    unitsSold: 14,
    totalRevenue: 1008.00,
    createdAt: '2026-06-08T11:00:00.000Z'
  },
  {
    id: 'p-27',
    sellerId: 'u-seller2',
    sellerName: 'Nordic Minimalist Living',
    title: 'Japanese Craft Shears',
    description: 'Traditional black carbon steel scissors, hand-forged by Japanese artisans with a razor-sharp edge.',
    price: 45.00,
    imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80',
    category: 'Aesthetic Crafts',
    stock: 18,
    unitsSold: 22,
    totalRevenue: 990.00,
    createdAt: '2026-06-09T09:30:00.000Z'
  }
];

// Pre-configured Orders
const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    buyerId: 'u-buyer1',
    buyerName: 'Alex Johnson',
    date: '2026-05-10T14:32:00.000Z',
    items: [
      {
        productId: 'p-1',
        title: 'Minimalist Leather Watch',
        price: 349.99,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=75'
      },
      {
        productId: 'p-4',
        title: 'Sport Running Shoes',
        price: 89.95,
        quantity: 2,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=75'
      }
    ],
    totalAmount: 529.89,
    paymentMethod: 'Store credit'
  },
  {
    id: 'ord-1002',
    buyerId: 'u-buyer2',
    buyerName: 'Jane Smith',
    date: '2026-06-02T10:15:00.000Z',
    items: [
      {
        productId: 'p-2',
        title: 'Wireless Headphones',
        price: 199.50,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=75'
      },
      {
        productId: 'p-5',
        title: 'Glass Teapot',
        price: 38.00,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=75'
      }
    ],
    totalAmount: 237.50,
    paymentMethod: 'Demo card'
  },
  {
    id: 'ord-1003',
    buyerId: 'u-buyer1',
    buyerName: 'Alex Johnson',
    date: '2026-06-12T16:45:00.000Z',
    items: [
      {
        productId: 'p-3',
        title: 'Ergonomic Oak Desk',
        price: 449.00,
        quantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80'
      }
    ],
    totalAmount: 449.00,
    paymentMethod: 'Store credit'
  }
];

const SEED_VERSION = '2';

function simpleHash(str: string) {
  let hash = 0;
  for (let idx = 0; idx < str.length; idx++) {
    hash = str.charCodeAt(idx) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function buildSeedCatalog() {
  const ordersList: Order[] = [...INITIAL_ORDERS];
  const buyers = [
    { id: 'u-buyer1', name: 'Alex Johnson' },
    { id: 'u-buyer2', name: 'Jane Smith' }
  ];

  INITIAL_PRODUCTS.forEach((product, productIndex) => {
    for (let i = 0; i < 2; i++) {
      const quantity = (simpleHash(product.id + i) % 2) + 1;
      const createdAt = new Date(product.createdAt || '2026-01-10T00:00:00.000Z');
      const orderDate = new Date(createdAt.getTime() + (4 + (simpleHash(product.id + '-' + i) % 36)) * 86400000);
      const buyer = buyers[(simpleHash(product.id + '-buyer-' + i) + productIndex) % buyers.length];
      ordersList.push({
        id: `ord-hist-${product.id.slice(2)}-${i}`,
        buyerId: buyer.id,
        buyerName: buyer.name,
        date: orderDate.toISOString(),
        items: [{
          productId: product.id,
          title: product.title,
          price: product.price,
          quantity,
          imageUrl: product.imageUrl
        }],
        totalAmount: Number((product.price * quantity).toFixed(2)),
        paymentMethod: i % 2 === 0 ? 'Store credit' : 'Demo card',
        status: 'paid'
      });
    }
  });

  const totals = new Map<string, { units: number; revenue: number }>();
  ordersList.forEach((order) => {
    order.items.forEach((item) => {
      const current = totals.get(item.productId) || { units: 0, revenue: 0 };
      current.units += item.quantity;
      current.revenue += item.price * item.quantity;
      totals.set(item.productId, current);
    });
  });

  const products = INITIAL_PRODUCTS.map((product) => {
    const stat = totals.get(product.id);
    if (!stat) return { ...product, unitsSold: 0, totalRevenue: 0 };
    return {
      ...product,
      unitsSold: stat.units,
      totalRevenue: Number(stat.revenue.toFixed(2))
    };
  });

  ordersList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { products, ordersList };
}

export function initializeStorage() {
  if (localStorage.getItem('eb_seed_version') !== SEED_VERSION) {
    localStorage.removeItem('eb_users');
    localStorage.removeItem('eb_products');
    localStorage.removeItem('eb_orders');
    localStorage.removeItem('eb_activities');
  }

  if (!localStorage.getItem('eb_users')) {
    localStorage.setItem('eb_users', JSON.stringify(INITIAL_USERS));
  }

  if (!localStorage.getItem('eb_orders') || !localStorage.getItem('eb_products')) {
    const seeded = buildSeedCatalog();
    localStorage.setItem('eb_products', JSON.stringify(seeded.products));
    localStorage.setItem('eb_orders', JSON.stringify(seeded.ordersList));
  }

  // Pre-configured Actions
  if (!localStorage.getItem('eb_activities')) {
    const activitiesList: SystemActivity[] = [];

    // Register initial users
    activitiesList.push({
      id: 'act-init-1',
      userId: 'u-admin',
      userName: 'Built-in Administrator',
      userRole: 'admin',
      action: 'Register',
      details: 'Administrator account established during system bootstrap.',
      timestamp: '2026-01-01T00:00:00.000Z'
    });
    activitiesList.push({
      id: 'act-init-2',
      userId: 'u-seller1',
      userName: 'Alpha Tech & Gear',
      userRole: 'seller',
      action: 'Register',
      details: 'Retailer account activated and store "Alpha Tech & Gear" initialized.',
      timestamp: '2026-01-10T12:00:00.000Z'
    });
    activitiesList.push({
      id: 'act-init-3',
      userId: 'u-seller2',
      userName: 'Nordic Minimalist Living',
      userRole: 'seller',
      action: 'Register',
      details: 'Retailer account activated and store "Nordic Minimalist Living" initialized.',
      timestamp: '2026-02-15T09:30:00.000Z'
    });
    activitiesList.push({
      id: 'act-init-4',
      userId: 'u-buyer1',
      userName: 'Alex Johnson',
      userRole: 'buyer',
      action: 'Register',
      details: 'Customer profile completed. Welcome credits of $1,500.00 loaded.',
      timestamp: '2026-03-01T15:45:00.000Z'
    });
    activitiesList.push({
      id: 'act-init-5',
      userId: 'u-buyer2',
      userName: 'Jane Smith',
      userRole: 'buyer',
      action: 'Register',
      details: 'Customer profile completed. Welcome credits of $850.00 loaded.',
      timestamp: '2026-03-05T11:20:00.000Z'
    });

    // List some product activities
    const prods: Product[] = JSON.parse(localStorage.getItem('eb_products') || '[]');
    prods.forEach((p) => {
      activitiesList.push({
        id: `act-init-p-${p.id}`,
        userId: p.sellerId,
        userName: p.sellerName,
        userRole: 'seller',
        action: 'List Product',
        details: `Published product listing: "${p.title}" in category "${p.category}" for $${p.price.toFixed(2)}.`,
        timestamp: p.createdAt || '2026-01-12T14:00:00.000Z'
      });
    });

    // Order purchase activities
    const ords: Order[] = JSON.parse(localStorage.getItem('eb_orders') || '[]');
    ords.forEach((o, idx) => {
      o.items.forEach((item, itIdx) => {
        activitiesList.push({
          id: `act-init-o-${o.id}-${itIdx}-${idx}`,
          userId: o.buyerId,
          userName: o.buyerName,
          userRole: 'buyer',
          action: 'Purchase',
          details: `Purchased ${item.quantity}x "${item.title}" for a total of $${(item.price * item.quantity).toFixed(2)}.`,
          timestamp: o.date
        });
      });
    });

    // Sort descending chronologically
    activitiesList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    localStorage.setItem('eb_activities', JSON.stringify(activitiesList));
  }

  localStorage.setItem('eb_seed_version', SEED_VERSION);
}

// Low-level helper to trigger storage events for cross-component re-renders
const notifyStorageChange = () => {
  window.dispatchEvent(new Event('storage'));
};

export const StorageService = {
  getUsers(): User[] {
    initializeStorage();
    return JSON.parse(localStorage.getItem('eb_users') || '[]');
  },

  saveUsers(users: User[]) {
    localStorage.setItem('eb_users', JSON.stringify(users));
    notifyStorageChange();
  },

  getActivities(): SystemActivity[] {
    initializeStorage();
    return JSON.parse(localStorage.getItem('eb_activities') || '[]');
  },

  saveActivities(activities: SystemActivity[]) {
    localStorage.setItem('eb_activities', JSON.stringify(activities));
    notifyStorageChange();
  },

  logActivity(userId: string, userName: string, userRole: any, action: string, details: string) {
    const activities = this.getActivities();
    const newActivity: SystemActivity = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      userName,
      userRole,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    activities.unshift(newActivity);
    this.saveActivities(activities);
  },

  updateUser(user: User) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      this.saveUsers(users);
    }
  },

  getProducts(): Product[] {
    initializeStorage();
    return JSON.parse(localStorage.getItem('eb_products') || '[]');
  },

  saveProducts(products: Product[]) {
    localStorage.setItem('eb_products', JSON.stringify(products));
    notifyStorageChange();
  },

  updateProduct(product: Product) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      products[index] = product;
    } else {
      products.push(product);
    }
    this.saveProducts(products);
  },

  deleteProduct(productId: string) {
    const products = this.getProducts();
    const updated = products.filter(p => p.id !== productId);
    this.saveProducts(updated);
  },

  getOrders(): Order[] {
    initializeStorage();
    return JSON.parse(localStorage.getItem('eb_orders') || '[]');
  },

  saveOrders(orders: Order[]) {
    localStorage.setItem('eb_orders', JSON.stringify(orders));
    notifyStorageChange();
  },

  addOrder(order: Order) {
    const orders = this.getOrders();
    orders.unshift(order); // Put new orders at top
    this.saveOrders(orders);
  },

  getCurrentUser(): User | null {
    const stored = localStorage.getItem('eb_current_user');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as User;
      // Refresh current user credentials in case they were modified/disabled by admin
      const allUsers = this.getUsers();
      const freshUser = allUsers.find(u => u.id === parsed.id);
      return freshUser || null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem('eb_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('eb_current_user');
    }
    notifyStorageChange();
  },

  getCart(userId: string): { productId: string; quantity: number }[] {
    const key = `eb_cart_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  saveCart(userId: string, cart: { productId: string; quantity: number }[]) {
    const key = `eb_cart_${userId}`;
    localStorage.setItem(key, JSON.stringify(cart));
    notifyStorageChange();
  },

  clearCart(userId: string) {
    const key = `eb_cart_${userId}`;
    localStorage.removeItem(key);
    notifyStorageChange();
  }
};
