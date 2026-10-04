/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

import React, { useState, useEffect } from 'react';
import { User, Product, Order } from '../types';
import { StorageService } from '../lib/storage';
import SalesChart from './SalesChart';
import { 
  PackagePlus, 
  BarChart3, 
  Trash2, 
  Edit, 
  Layers, 
  Plus, 
  Save, 
  X, 
  TrendingUp, 
  Coins, 
  PackageCheck, 
  AlertTriangle,
  Image,
  Sparkles,
  ShoppingBag,
  Store,
  Calendar
} from 'lucide-react';

interface SellerPanelProps {
  currentUser: User;
  darkMode?: boolean;
}

export default function SellerPanel({ currentUser, darkMode }: SellerPanelProps) {
  const [activeTab, setActiveTab ] = useState<'stats' | 'products'>('stats');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Analytics chart states
  const [timescale, setTimescale] = useState<'24h' | '1w' | '1y'>('1y');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [selectedProductForChart, setSelectedProductForChart] = useState<string>('all');
  
  // Product Form states
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form values
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formCategory, setFormCategory] = useState('Electronics');
  const [formStock, setFormStock] = useState(10);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Selected file must be an image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setFormImageUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const loadData = () => {
    const allProducts = StorageService.getProducts();
    // Filter products designed by this seller
    const sellerProducts = allProducts.filter(p => p.sellerId === currentUser.id);
    setProducts(sellerProducts);
    
    // Load all orders
    setOrders(StorageService.getOrders());
  };

  useEffect(() => {
    loadData();
    // Listen for real-time local storage actions
    const handleStorageChange = () => loadData();
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.tab === 'string') {
        const tab = customEvent.detail.tab;
        if (tab === 'stats' || tab === 'products') {
          setActiveTab(tab as 'stats' | 'products');
        }
      }
    };
    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('nexus-seller-tab', handleTabChange);
    window.addEventListener('nexus-seller-refresh', handleRefresh);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nexus-seller-tab', handleTabChange);
      window.removeEventListener('nexus-seller-refresh', handleRefresh);
    };
  }, [currentUser.id]);

  // Handle open form for creation
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormDescription('');
    setFormPrice(29.99);
    setFormCategory('Electronics');
    setFormStock(15);
    setFormImageUrl('');
    setFormError('');
    setShowProductForm(true);
  };

  // Handle open form for editing
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormTitle(p.title);
    setFormDescription(p.description);
    setFormPrice(p.price);
    setFormCategory(p.category);
    setFormStock(p.stock);
    setFormImageUrl(p.imageUrl);
    setFormError('');
    setShowProductForm(true);
  };

  // Handle Save / Edit Products
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim() || !formDescription.trim() || formPrice <= 0 || formStock < 0) {
      setFormError('Please fill out all fields with valid numbers. Price must be greater than 0.');
      return;
    }

    // Default high-quality placeholder image depending on category
    let finalImageUrl = formImageUrl.trim();
    if (!finalImageUrl) {
      if (formCategory === 'Electronics') {
        finalImageUrl = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=75';
      } else if (formCategory === 'Home & Office') {
        finalImageUrl = 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=600&auto=format&fit=crop&q=75';
      } else if (formCategory === 'Fashion & Apparel') {
        finalImageUrl = 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=75';
      } else {
        finalImageUrl = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=75';
      }
    }

    const allProducts = StorageService.getProducts();

    if (editingProduct) {
      // Update
      const updatedProduct: Product = {
        ...editingProduct,
        title: formTitle.trim(),
        description: formDescription.trim(),
        price: Number(formPrice),
        category: formCategory,
        stock: Number(formStock),
        imageUrl: finalImageUrl
      };
      
      StorageService.updateProduct(updatedProduct);
      StorageService.logActivity(
        currentUser.id, 
        currentUser.storeName || currentUser.name, 
        'seller', 
        'Edit Product', 
        `Updated details for "${updatedProduct.title}".`
      );
    } else {
      // Create new
      const newProduct: Product = {
        id: `p-${Date.now()}`,
        sellerId: currentUser.id,
        sellerName: currentUser.storeName || currentUser.name,
        title: formTitle.trim(),
        description: formDescription.trim(),
        price: Number(formPrice),
        imageUrl: finalImageUrl,
        category: formCategory,
        stock: Number(formStock),
        unitsSold: 0,
        totalRevenue: 0,
        createdAt: new Date().toISOString()
      };

      StorageService.updateProduct(newProduct);
      StorageService.logActivity(
        currentUser.id, 
        currentUser.storeName || currentUser.name, 
        'seller', 
        'List Product', 
        `Published new product: "${newProduct.title}" in category "${newProduct.category}" for $${newProduct.price.toFixed(2)}.`
      );
    }

    setShowProductForm(false);
    loadData();
  };

  // Delete product
  const handleDeleteProduct = (productId: string) => {
    const productToDelete = products.find(p => p.id === productId);
    const title = productToDelete ? productToDelete.title : 'Unknown Product';
    if (confirm('Are you sure you want to delete this product? Buyers will no longer be able to purchase it.')) {
      StorageService.deleteProduct(productId);
      StorageService.logActivity(
        currentUser.id, 
        currentUser.storeName || currentUser.name, 
        'seller', 
        'Delete Product', 
        `Withdrew product listing: "${title}".`
      );
      loadData();
    }
  };

  // ================= STATISTICS COMPUTATION =================
  // Gather statistics for this seller
  const sellerProductIds = products.map(p => p.id);
  
  // Calculate aggregate store values based on actual database totals
  const totalRevenue = products.reduce((acc, p) => acc + p.totalRevenue, 0);
  const totalUnitsSold = products.reduce((acc, p) => acc + p.unitsSold, 0);
  const lowStockThreshold = 4;
  const lowStockCount = products.filter(p => p.stock <= lowStockThreshold).length;

  // ================= GRAPH ANALYTICS CALCULATIONS =================
  const getChartData = () => {
    const sellerProductIdsForSearch = selectedProductForChart === 'all'
      ? products.map(p => p.id)
      : [selectedProductForChart];

    // Read orders matching these products
    const actualOrders = orders.filter(order =>
      order.status !== 'refunded' &&
      order.items.some(item => sellerProductIdsForSearch.includes(item.productId))
    );

    const points: { label: string; dateKey: string; revenue: number; unitsSold: number }[] = [];
    const now = selectedCalendarDate ? new Date(selectedCalendarDate + 'T23:59:59') : new Date();

    if (timescale === '24h') {
      // Real 24 hourly intervals ending at now
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const label = d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
        points.push({
          label,
          dateKey: d.toISOString().slice(0, 13), // Hour prefix (e.g., "2026-06-16T02")
          revenue: 0,
          unitsSold: 0
        });
      }

      actualOrders.forEach(order => {
        const orderDate = new Date(order.date);
        const diffMs = now.getTime() - orderDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours >= 0 && diffHours < 24) {
          const key = orderDate.toISOString().slice(0, 13);
          const index = points.findIndex(p => p.dateKey === key);
          if (index !== -1) {
            const matchItems = order.items.filter(item => sellerProductIdsForSearch.includes(item.productId));
            points[index].revenue += matchItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
            points[index].unitsSold += matchItems.reduce((acc, item) => acc + item.quantity, 0);
          }
        }
      });

    } else if (timescale === '1w') {
      // 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString([], { weekday: 'long' });
        points.push({
          label,
          dateKey: d.toISOString().slice(0, 10), // YYYY-MM-DD
          revenue: 0,
          unitsSold: 0
        });
      }

      actualOrders.forEach(order => {
        const key = order.date.slice(0, 10);
        const index = points.findIndex(p => p.dateKey === key);
        if (index !== -1) {
          const matchItems = order.items.filter(item => sellerProductIdsForSearch.includes(item.productId));
          points[index].revenue += matchItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
          points[index].unitsSold += matchItems.reduce((acc, item) => acc + item.quantity, 0);
        }
      });

    } else {
      // 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString([], { month: 'short', year: '2-digit' });
        points.push({
          label,
          dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          revenue: 0,
          unitsSold: 0
        });
      }

      actualOrders.forEach(order => {
        const orderDate = new Date(order.date);
        const key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        const index = points.findIndex(p => p.dateKey === key);
        if (index !== -1) {
          const matchItems = order.items.filter(item => sellerProductIdsForSearch.includes(item.productId));
          points[index].revenue += matchItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
          points[index].unitsSold += matchItems.reduce((acc, item) => acc + item.quantity, 0);
        }
      });
    }

    return points;
  };

  const chartData = getChartData();

  // Daily Specific Calendar Search filtering
  const ordersOnThisDate = selectedCalendarDate 
    ? orders.filter(o => o.date.slice(0, 10) === selectedCalendarDate)
    : [];

  const dailySellerItems = selectedCalendarDate
    ? ordersOnThisDate.flatMap(order => 
        order.items
          .filter(item => sellerProductIds.includes(item.productId))
          .map(item => {
            const prod = products.find(p => p.id === item.productId);
            return {
              id: item.productId,
              title: prod?.title || 'Unknown Product',
              price: item.price,
              quantity: item.quantity,
              buyerName: order.buyerName,
              orderId: order.id,
              time: new Date(order.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            };
          })
      )
    : [];

  const dailyRevenue = dailySellerItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const dailyUnits = dailySellerItems.reduce((acc, curr) => acc + curr.quantity, 0);

  // Process transaction logs to match items belonging to this seller
  const salesHistory = orders.map(order => {
    const sellerItems = order.items.filter(item => sellerProductIds.includes(item.productId));
    if (sellerItems.length === 0) return null;
    
    const itemsTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemQuantity = sellerItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      orderId: order.id,
      buyerName: order.buyerName,
      date: new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      itemsCount: itemQuantity,
      amount: itemsTotal
    };
  }).filter(Boolean) as { orderId: string; buyerName: string; date: string; itemsCount: number; amount: number }[];

  // Revenue per product
  const productPerformance = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <div id="seller-panel-root" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300 text-neutral-900">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b-2 border-neutral-900 pb-6">
        <div>
          <div className="flex items-center gap-2 text-neutral-950 font-mono text-xs font-bold uppercase tracking-[0.2em]">
            <Store className="w-4 h-4" />
            MERCHANT SYSTEM OVERWATCH
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-neutral-950 mt-1">
            {currentUser.storeName || 'Digital Storefront'}
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-1 uppercase tracking-wide">
            ANALYZE LEDGER METRICS • ORGANIZE INVENTORY LISTINGS • ADJUST STORE STOCKS
          </p>
        </div>

        {/* Dashboard Tab triggers */}
        <div className="flex bg-[#EAE6DF] p-1 border-2 border-neutral-900 rounded-none shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-mono uppercase tracking-wider font-bold transition-all ${
              activeTab === 'stats' 
                ? 'bg-neutral-900 text-neutral-50' 
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-[#FAF9F6]/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Performance • Logs
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-none text-xs font-mono uppercase tracking-wider font-bold transition-all ${
              activeTab === 'products' 
                ? 'bg-neutral-900 text-neutral-50' 
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-[#FAF9F6]/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            Inventory ({products.length})
          </button>
        </div>
      </div>

      {/* ================= VIEW 1: SALES STATISTICS ================= */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          
          {/* Quick Metrics Dashboard Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">Gross Sales</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-serif font-black text-neutral-950">${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span className="text-[9px] text-emerald-700 font-mono font-bold uppercase tracking-wider">Live</span>
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-1.5 uppercase tracking-wide">Direct ledger capture</p>
            </div>

            <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">Units Dispatched</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span
                  className="text-2xl font-serif font-black px-0.5 py-0.5 inline-block"
                  style={{
                    color: darkMode ? '#FFFFFF' : '#000000',
                    backgroundColor: darkMode ? '#1A1816' : '#FAF9F6'
                  }}
                >
                  {totalUnitsSold}
                </span>
                <span className="text-xs text-neutral-500 font-mono font-bold">PCS</span>
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-2.5 uppercase tracking-wide">Dispatch receipts</p>
            </div>

            <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">Conversion Count</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-serif font-black text-neutral-950">{salesHistory.length}</span>
                <span className="text-xs text-neutral-500 font-mono font-bold ml-1">TXNS</span>
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-1.5 uppercase tracking-wide">Ledger entries</p>
            </div>

            <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">Stock Alerts</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className={`text-2xl font-serif font-black ${lowStockCount > 0 ? 'text-amber-800 animate-pulse' : 'text-neutral-950 dark:text-neutral-50'}`}>
                  {lowStockCount}
                </span>
                <span className="text-xs text-neutral-500 font-mono font-bold ml-1">UNITS TYPE</span>
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-1.5 uppercase tracking-wide">Under {lowStockThreshold} count</p>
            </div>

          </div>

          {/* Product Sales Performance Visual Chart */}
          <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex flex-col space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-neutral-900 pb-4">
              <div>
                <h3 className="font-serif font-black text-sm text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-neutral-900" />
                  Product Sales Tracker
                </h3>
                <p className="text-[10px] text-neutral-500 font-mono mt-0.5 uppercase tracking-wide">
                  Analyze sales trends & volume data since launch
                </p>
              </div>

              {/* Toggle controls */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Product filter selection */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400">Filter:</span>
                  <select
                    value={selectedProductForChart}
                    onChange={(e) => setSelectedProductForChart(e.target.value)}
                    className="bg-white border-2 border-neutral-900 px-2 py-0.5 text-[10px] font-mono font-bold rounded-none focus:outline-none focus:ring-0 cursor-pointer text-neutral-950"
                  >
                    <option value="all">All Products (Combined)</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                {/* Timescale Selector */}
                <div className="flex bg-[#EAE6DF] p-0.5 border-2 border-neutral-900 rounded-none shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)]">
                  {(['24h', '1w', '1y'] as const).map(ts => (
                    <button
                      key={ts}
                      onClick={() => setTimescale(ts)}
                      className={`px-2.5 py-0.5 text-[9px] font-mono uppercase font-black tracking-wider transition-all rounded-none cursor-pointer ${
                        timescale === ts 
                          ? 'bg-neutral-900 text-neutral-50' 
                          : 'text-neutral-600 hover:text-neutral-950'
                      }`}
                    >
                      {ts === '24h' ? '24 Hours' : ts === '1w' ? 'Weekly' : 'Yearly'}
                    </button>
                  ))}
                </div>

                {/* Audit Calendar Lookup Selector */}
                <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-500" />
                    Audit Day:
                  </span>
                  <div className="flex items-center bg-white border-2 border-neutral-900 px-1.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)]">
                    <input
                      type="date"
                      value={selectedCalendarDate}
                      onChange={(e) => setSelectedCalendarDate(e.target.value)}
                      className="bg-transparent border-0 text-[10px] font-mono font-bold focus:ring-0 focus:outline-none text-neutral-950 cursor-pointer w-28 uppercase p-0"
                    />
                    {selectedCalendarDate && (
                      <button
                        onClick={() => setSelectedCalendarDate('')}
                        title="Clear calendar selection"
                        className="ml-1 text-[8px] bg-red-600 text-white font-mono font-bold px-1.5 py-0.5 cursor-pointer uppercase transition-all"
                      >
                        X
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-1 py-2 sm:px-2">
              <SalesChart points={chartData} />
            </div>


            {/* Daily Calendar Specific Audit Report Box */}
            {selectedCalendarDate && (
              <div className="mt-6 border-2 border-dashed border-neutral-900 bg-neutral-100 dark:bg-neutral-900 p-5 rounded-none animate-in zoom-in duration-150">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-neutral-900 pb-3">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest block">Ledger Partition Search</span>
                    <h4 className="text-base font-serif font-black text-neutral-950 dark:text-neutral-50 mt-0.5 uppercase tracking-wide flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neutral-950 dark:text-white" />
                      Day Audit: {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedCalendarDate('')}
                    className="text-[10px] font-mono font-black border-2 border-neutral-900 bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] dark:shadow-none rounded-none transition-all uppercase cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white border-2 border-neutral-900 p-4 rounded-none shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                    <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">Audit Day Revenue</span>
                    <span className="text-2xl font-serif font-black text-neutral-900 dark:text-neutral-50 block mt-1">
                      ${dailyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white border-2 border-neutral-900 p-4 rounded-none shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                    <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">Audit Day Volume</span>
                    <span className="text-2xl font-serif font-black text-neutral-950 block mt-1">
                      {dailyUnits} PCS
                    </span>
                  </div>
                  <div className="bg-white border-2 border-neutral-900 p-4 rounded-none shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                    <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">Invoices Recorded</span>
                    <span className="text-2xl font-serif font-black text-neutral-950 block mt-1">
                      {ordersOnThisDate.length} TXNS
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mb-2.5">Itemized Ledger Receipts</span>
                  {dailySellerItems.length === 0 ? (
                    <div className="p-8 text-center bg-white border-2 border-neutral-900 font-mono text-[10px] uppercase font-bold text-neutral-400">
                      No sales recorded in local storefront logs for this specific calendar date.
                    </div>
                  ) : (
                    <div className="w-full overflow-x-auto border-2 border-neutral-900 bg-white shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                      <table className="w-full text-left font-mono text-xs border-collapse">
                        <thead>
                          <tr className="bg-neutral-900 text-white font-bold text-[10px]">
                            <th className="p-3 border-r border-neutral-700 uppercase tracking-wider">Time</th>
                            <th className="p-3 border-r border-neutral-700 uppercase tracking-wider">Product Name</th>
                            <th className="p-3 border-r border-neutral-700 uppercase tracking-wider">Buyer Account</th>
                            <th className="p-3 border-r border-neutral-700 text-right uppercase tracking-wider">Price</th>
                            <th className="p-3 border-r border-neutral-700 text-center uppercase tracking-wider">Qty</th>
                            <th className="p-3 text-right uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-neutral-950">
                          {dailySellerItems.map((item, idx) => (
                            <tr key={`${item.orderId}-${idx}`} className="border-b-2 border-neutral-200 last:border-b-0 hover:bg-neutral-50">
                              <td className="p-3 border-r border-neutral-200 font-bold whitespace-nowrap text-neutral-500">{item.time}</td>
                              <td className="p-3 border-r border-neutral-200 font-black text-neutral-950">{item.title}</td>
                              <td className="p-3 border-r border-neutral-200 text-neutral-600">{item.buyerName}</td>
                              <td className="p-3 border-r border-neutral-200 text-right font-medium">${item.price.toFixed(2)}</td>
                              <td className="p-3 border-r border-neutral-200 text-center font-bold bg-neutral-50">{item.quantity}</td>
                              <td className="p-3 text-right font-black text-neutral-950">${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Graphical Analytics breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Box: Product Popularity and statistics */}
            <div className="col-span-12 lg:col-span-7 bg-[#FAF9F6] border-2 border-neutral-900 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex flex-col h-[400px]">
              <h3 className="font-serif font-black text-sm text-neutral-950 border-b-2 border-neutral-900 pb-3 mb-4 flex items-center justify-between uppercase tracking-wider">
                <span>Product Sales Leaderboard</span>
                <Sparkles className="w-4 h-4 text-neutral-900" />
              </h3>

              <div className="flex-1 overflow-y-auto pr-1">
                <div className={`h-full flex flex-col ${productPerformance.length > 0 && productPerformance.length <= 4 ? 'justify-between py-2' : 'space-y-4'}`}>
                  {productPerformance.length === 0 ? (
                    <p className="text-xs font-mono font-medium text-neutral-400 py-10 text-center uppercase tracking-wide">
                      No listed products found. Put items on the list in the inventory panel first.
                    </p>
                  ) : (
                    productPerformance.map((product, i) => {
                      const percentage = totalRevenue > 0 ? (product.totalRevenue / totalRevenue) * 100 : 0;
                      return (
                        <div key={product.id} className="space-y-1.5 flex-none">
                          <div className="flex justify-between text-xs font-bold font-mono">
                            <span className="text-neutral-900 line-clamp-1 flex-1 uppercase tracking-wider">{product.title}</span>
                            <span className="text-neutral-950 font-black ml-4">${product.totalRevenue.toFixed(2)} ({product.unitsSold} sold)</span>
                          </div>
                          {/* Percentage progress indicator */}
                          <div className="h-2 overflow-hidden rounded-full bg-[#E6DFD4] dark:bg-[#2A2622]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#C4A882] to-[#1A1A1A] dark:from-[#E7D7C3] dark:to-[#8C7355] transition-all duration-300"
                              style={{ width: `${Math.max(percentage, product.totalRevenue > 0 ? 2 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Box: Live Transaction History log */}
            <div className="col-span-12 lg:col-span-5 bg-[#FAF9F6] border-2 border-neutral-900 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex flex-col h-[400px]">
              <h3 className="font-serif font-black text-sm text-neutral-950 border-b-2 border-neutral-900 pb-3 mb-4 flex items-center justify-between uppercase tracking-wider">
                <span>Direct Sales Ledger</span>
                <TrendingUp className="w-4 h-4 text-neutral-900" />
              </h3>

              <div className="flex-1 overflow-y-auto pr-1">
                <div className={`h-full flex flex-col ${salesHistory.length > 0 && salesHistory.length <= 3 ? 'justify-between py-1' : 'space-y-3'}`}>
                  {salesHistory.length === 0 ? (
                    <div className="text-center py-16 text-neutral-400 select-none">
                      <ShoppingBag className="w-8 h-8 text-neutral-300 mx-auto mb-1.5" />
                      <p className="text-xs font-mono font-bold uppercase tracking-wide">No orders received yet</p>
                      <p className="text-[10px] text-neutral-400 font-mono mt-1">Checkouts of your items will display here immediately.</p>
                    </div>
                  ) : (
                    salesHistory.map((sh, idx) => (
                      <div key={`${sh.orderId}-${idx}`} className="flex justify-between items-center bg-white border border-neutral-300 p-3 rounded-none transition hover:border-neutral-950">
                        <div>
                          <p className="text-xs font-mono font-black text-neutral-900 uppercase">Order #{sh.orderId}</p>
                          <p className="text-[10px] font-mono text-neutral-500 mt-0.5">By {sh.buyerName} on {sh.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-neutral-950 dark:text-neutral-50 font-mono">+${sh.amount.toFixed(2)}</p>
                          <p className="text-[9px] font-mono text-neutral-400 mt-0.5 uppercase">{sh.itemsCount} Unit{sh.itemsCount > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= VIEW 2: PRODUCT MANAGEMENT ================= */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          
          {/* List Headers and Creation Trigger */}
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl border transition-colors duration-200 ${
            darkMode ? 'bg-[#1A1816] border-neutral-800' : 'bg-white border-gray-100 shadow-sm'
          }`}>
            <div>
              <h3 className={`font-extrabold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>Product Inventory Listings</h3>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-neutral-400' : 'text-gray-400'}`}>Publish products, customize prices, details, and replenish stocks.</p>
            </div>
            
            <button
              id="add-product-main-btn"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/25 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Publish New Product
            </button>
          </div>

          {/* Product Items Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.length === 0 ? (
              <div className={`col-span-12 py-16 text-center border rounded-2xl transition-colors duration-200 ${
                darkMode ? 'bg-[#1A1816] border-neutral-800 text-neutral-400' : 'text-gray-500 bg-white border-gray-100 shadow-sm'
              }`}>
                <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-gray-850'}`}>No active product listings</p>
                <p className="text-xs text-neutral-400 mt-1">Tap the button above to publish your first item on Nexus.</p>
              </div>
            ) : (
              products.map((product) => {
                const isLowStock = product.stock <= lowStockThreshold;
                return (
                  <div key={product.id} className={`border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 ${
                    darkMode ? 'bg-[#1A1816] border-neutral-800 hover:border-neutral-700' : 'bg-white border-gray-100 hover:shadow-md'
                  }`}>
                    
                    {/* Header Image */}
                    <div className="relative h-44 bg-gray-50 dark:bg-neutral-900 flex items-center justify-center overflow-hidden">
                      <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80";
                        }}
                      />
                      <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-gray-800 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-100">
                        {product.category}
                      </span>
                      
                      {isLowStock && (
                        <span className="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Low Stock
                        </span>
                      )}
                    </div>

                    {/* Metadata & Controls */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h4 className={`text-sm font-bold transition truncate ${darkMode ? 'text-white hover:text-indigo-400' : 'text-gray-900 hover:text-indigo-600'}`}>{product.title}</h4>
                        <p className={`text-xs leading-relaxed line-clamp-2 ${darkMode ? 'text-neutral-400' : 'text-gray-400'}`}>{product.description}</p>
                      </div>

                      <div className={`grid grid-cols-2 gap-3 py-4 my-2 border-t border-b text-[11px] font-mono font-bold ${
                        darkMode ? 'border-neutral-800 text-neutral-400' : 'border-gray-50 text-gray-500'
                      }`}>
                        <div>
                          <p className={`${darkMode ? 'text-neutral-400' : 'text-gray-400'} font-sans text-[10px] font-normal`}>UNIT PRICE</p>
                          <p className={`text-sm mt-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>${product.price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className={`${darkMode ? 'text-neutral-400' : 'text-gray-400'} font-sans text-[10px] font-normal`}>In Stock ({product.stock})</p>
                          <p className={`text-sm mt-0.5 ${product.stock === 0 ? 'text-red-650 font-black' : (darkMode ? 'text-white' : 'text-gray-950')}`}>
                            {product.stock === 0 ? 'SOLD OUT' : `${product.stock} units`}
                          </p>
                        </div>
                      </div>

                      {/* Controls Footer */}
                      <div className="flex gap-2 pt-2">
                        <button
                          id={`edit-prod-btn-${product.id}`}
                          onClick={() => handleOpenEdit(product)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            darkMode 
                              ? 'bg-neutral-900 border-neutral-800 text-indigo-400 hover:bg-neutral-800' 
                              : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                          }`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit Details
                        </button>
                        <button
                          id={`del-prod-btn-${product.id}`}
                          onClick={() => handleDeleteProduct(product.id)}
                          className={`p-2 rounded-lg border transition cursor-pointer ${
                            darkMode
                              ? 'bg-neutral-900 border-neutral-800 text-rose-450 hover:bg-neutral-800'
                              : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'
                          }`}
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* ================= MODAL PRODUCT FORM ================= */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border animate-in zoom-in-95 duration-200 ${
            darkMode ? 'bg-[#1A1816] text-white border-neutral-800' : 'bg-white text-gray-900 border-gray-150'
          }`}>
            
            {/* Header */}
            <div className={`p-5 border-b flex justify-between items-center ${
              darkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-gray-100 bg-gray-50/50'
            }`}>
              <h3 className={`font-extrabold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingProduct ? 'Modify Listing details' : 'Publish New Product listing'}
              </h3>
              <button 
                onClick={() => setShowProductForm(false)}
                className={`p-1.5 rounded-lg transition ${
                  darkMode ? 'text-neutral-400 hover:text-white' : 'text-gray-400 hover:text-gray-650'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                
                {/* Title */}
                <div>
                  <label className="block font-bold text-gray-500 dark:text-neutral-400 mb-1 uppercase tracking-wider">Product Name / Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. UltraFit Waterproof Fitness Watch"
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border font-medium ${
                      darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-gray-500 dark:text-neutral-400 mb-1 uppercase tracking-wider">Product Description</label>
                  <textarea
                    required
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Provide description regarding product specifications, materials, warranty, or contents."
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border font-medium ${
                      darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  />
                </div>

                {/* Grid Inputs for Price, Stock, Category */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-500 dark:text-neutral-400 mb-1 uppercase tracking-wider">Unit Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border font-bold font-mono ${
                        darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 dark:text-neutral-400 mb-1 uppercase tracking-wider">Initial Stock Units</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border font-bold font-mono ${
                        darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 dark:text-neutral-400 mb-1 uppercase tracking-wider">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border font-bold ${
                        darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Audio & Acoustics">Audio & Acoustics</option>
                      <option value="Fashion & Apparel">Fashion & Apparel</option>
                      <option value="Home & Office">Home & Office</option>
                      <option value="Travel & Carry">Travel & Carry</option>
                      <option value="Aesthetic Crafts">Aesthetic Crafts</option>
                    </select>
                  </div>
                </div>

                {/* Upload Image from Computer Drag & Drop Zone */}
                <div className="space-y-2">
                  <label className="block font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Product Photo Listing</label>
                  
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-500/10' 
                        : darkMode 
                          ? 'border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-800/85 text-white' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white text-gray-850'
                    }`}
                    onClick={() => {
                      const fileInput = document.getElementById('product-file-upload');
                      fileInput?.click();
                    }}
                  >
                    <input
                      id="product-file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />
                    
                    {formImageUrl && (formImageUrl.startsWith('data:image/') || formImageUrl.trim() !== '') ? (
                      <div className="space-y-2 flex flex-col items-center justify-center">
                        <img
                          src={formImageUrl}
                          alt="Uploaded Preview"
                          className="h-16 w-auto object-cover rounded-lg border border-neutral-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80";
                          }}
                        />
                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Photo loaded. Drag new file or click here to replace.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-1">
                        <div className={`p-2 rounded-full w-fit mx-auto ${darkMode ? 'bg-neutral-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                          <Image className="w-5 h-5 mx-auto" />
                        </div>
                        <p className="text-xs font-bold">Drag & drop photo, or click to upload from computer</p>
                        <p className={`text-[9px] ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>Supports JPG, PNG, WEBP files</p>
                      </div>
                    )}
                  </div>

                  {/* Manual URL Input alternative */}
                  <div className="pt-1">
                    <p className={`text-[9px] uppercase font-bold text-center mb-1.5 ${darkMode ? 'text-neutral-500' : 'text-gray-400'}`}>— OR PROVIDE IMAGE URL MANUAL BYPASS —</p>
                    <input
                      type="url"
                      value={formImageUrl.startsWith('data:image/') ? '' : formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or paste any direct image address"
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border font-medium font-mono ${
                        darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    />
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className={`flex gap-2.5 pt-4 border-t ${darkMode ? 'border-neutral-800' : 'border-gray-100'}`}>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Apply & Save Listing
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                    darkMode 
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800' 
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Cancel
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
