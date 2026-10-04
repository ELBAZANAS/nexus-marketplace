/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

import React, { useState, useEffect } from 'react';
import { User, Product, Order, SystemActivity } from '../types';
import { StorageService } from '../lib/storage';
import SalesChart, { buildMonthlySales } from './SalesChart';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Key, 
  Filter,
  Check,
  AlertCircle,
  Trash2,
  Edit,
  Plus,
  FileText,
  TrendingUp,
  Coins,
  ShoppingBag,
  History,
  ArrowLeft,
  Store,
  Clock,
  Settings,
  X,
  Package
} from 'lucide-react';

export default function AdminPanel() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'users' | 'sellers' | 'buyers' | 'activities'>('users');
  
  // Storage State
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  
  // Filtering & Selected states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);

  // Modals & Forms State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserNameInput, setEditUserNameInput] = useState('');
  const [editUserEmailInput, setEditUserEmailInput] = useState('');
  const [editUserUsernameInput, setEditUserUsernameInput] = useState('');
  const [editUserPasswordInput, setEditUserPasswordInput] = useState('');
  const [editUserStatusInput, setEditUserStatusInput] = useState<'active' | 'disabled'>('active');
  const [editUserBalanceInput, setEditUserBalanceInput] = useState<number>(0);
  const [editUserStoreNameInput, setEditUserStoreNameInput] = useState('');

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodStock, setProdStock] = useState<number>(0);
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodDescription, setProdDescription] = useState('');

  // Edit Activity Modal
  const [editingActivity, setEditingActivity] = useState<SystemActivity | null>(null);
  const [actAction, setActAction] = useState('');
  const [actDetails, setActDetails] = useState('');

  // Feedback Messages
  const [noticeMessage, setNoticeMessage] = useState('');

  // Load current Storage values
  const loadData = () => {
    setUsers(StorageService.getUsers());
    setProducts(StorageService.getProducts());
    setOrders(StorageService.getOrders());
    setActivities(StorageService.getActivities());
  };

  useEffect(() => {
    loadData();
    // Re-sync on external storage changes
    const syncOnStorage = () => loadData();
    window.addEventListener('storage', syncOnStorage);

    const handleAdminTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab) {
        setActiveTab(customEvent.detail.tab);
        setSelectedSellerId(null);
        setSelectedBuyerId(null);
      }
    };

    const handleSelectSeller = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSelectedSellerId(customEvent.detail.sellerId || null);
        setActiveTab('sellers');
      }
    };

    const handleSelectBuyer = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSelectedBuyerId(customEvent.detail.buyerId || null);
        setActiveTab('buyers');
      }
    };

    const handleAdminRefresh = () => {
      loadData();
    };

    window.addEventListener('nexus-admin-tab', handleAdminTab);
    window.addEventListener('nexus-admin-select-seller', handleSelectSeller);
    window.addEventListener('nexus-admin-select-buyer', handleSelectBuyer);
    window.addEventListener('nexus-admin-refresh', handleAdminRefresh);

    return () => {
      window.removeEventListener('storage', syncOnStorage);
      window.removeEventListener('nexus-admin-tab', handleAdminTab);
      window.removeEventListener('nexus-admin-select-seller', handleSelectSeller);
      window.removeEventListener('nexus-admin-select-buyer', handleSelectBuyer);
      window.removeEventListener('nexus-admin-refresh', handleAdminRefresh);
    };
  }, []);

  const triggerNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(''), 4000);
  };

  // Status Toggles
  const handleToggleStatus = (userId: string) => {
    if (userId === 'u-admin') return;
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        let nextStatus: 'active' | 'disabled' | 'pending_approval' = 'active';
        if (user.status === 'active') {
          nextStatus = 'disabled';
        } else if (user.status === 'disabled') {
          nextStatus = 'active';
        } else if (user.status === 'pending_approval') {
          nextStatus = 'active';
        }
        
        // Log status change
        StorageService.logActivity(
          'u-admin',
          'Admin Overrule',
          'admin',
          'Status Change',
          `Administrative status override for @${user.username} set to ${nextStatus.toUpperCase()}.`
        );
        
        return { ...user, status: nextStatus };
      }
      return user;
    });

    StorageService.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    triggerNotice("User status updated successfully.");
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserNameInput(user.name);
    setEditUserEmailInput(user.email);
    setEditUserUsernameInput(user.username);
    setEditUserPasswordInput('');
    setEditUserStatusInput(user.status);
    setEditUserBalanceInput(user.balance || 0);
    setEditUserStoreNameInput(user.storeName || '');
  };

  // Submit User Edits
  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const allUsers = StorageService.getUsers();
    const userIndex = allUsers.findIndex(u => u.id === editingUser.id);
    if (userIndex === -1) return;

    // Check username collision
    const collision = allUsers.find(u => u.username.toLowerCase() === editUserUsernameInput.trim().toLowerCase() && u.id !== editingUser.id);
    if (collision) {
      alert("This username is already taken by another portal account.");
      return;
    }

    const updatedUser: User = {
      ...allUsers[userIndex],
      name: editUserNameInput.trim(),
      email: editUserEmailInput.trim(),
      username: editUserUsernameInput.trim(),
      status: editUserStatusInput,
    };

    if (editUserPasswordInput.trim()) {
      updatedUser.password = editUserPasswordInput.trim();
    }
    if (editingUser.role === 'buyer') {
      updatedUser.balance = Number(editUserBalanceInput);
    }
    if (editingUser.role === 'seller') {
      updatedUser.storeName = editUserStoreNameInput.trim();
    }

    allUsers[userIndex] = updatedUser;
    StorageService.saveUsers(allUsers);
    
    // Log the adjustment
    StorageService.logActivity(
      'u-admin',
      'Admin Overrule',
      'admin',
      'Account Update',
      `Modified master details for @${editingUser.username} (${editingUser.role.toUpperCase()}).`
    );

    setEditingUser(null);
    loadData();
    triggerNotice(`Portal credentials for @${updatedUser.username} updated.`);
  };

  // Delete User Account
  const handleDeleteUser = (userId: string) => {
    if (userId === 'u-admin') return;
    const target = users.find(u => u.id === userId);
    if (!target) return;

    if (confirm(`CRITICAL HAZARD: Are you sure you want to permanently delete user @${target.username} (${target.name})?\nThis action cannot be undone.`)) {
      const remainingUsers = users.filter(u => u.id !== userId);
      StorageService.saveUsers(remainingUsers);
      
      StorageService.logActivity(
        'u-admin',
        'Admin Overrule',
        'admin',
        'Account Delete',
        `Permanently terminated portal account: @${target.username}.`
      );

      loadData();
      triggerNotice(`Permanently deleted user account @${target.username}`);
    }
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdTitle(prod.title);
    setProdCategory(prod.category);
    setProdPrice(prod.price);
    setProdStock(prod.stock);
    setProdImageUrl(prod.imageUrl);
    setProdDescription(prod.description);
  };

  // Submit Product Edits
  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const allProducts = StorageService.getProducts();
    const index = allProducts.findIndex(p => p.id === editingProduct.id);
    if (index === -1) return;

    const updatedProduct: Product = {
      ...allProducts[index],
      title: prodTitle.trim(),
      category: prodCategory,
      price: Number(prodPrice),
      stock: Number(prodStock),
      imageUrl: prodImageUrl.trim(),
      description: prodDescription.trim()
    };

    allProducts[index] = updatedProduct;
    StorageService.saveProducts(allProducts);

    // Log product edit activity
    StorageService.logActivity(
      'u-admin',
      'Admin Overrule',
      'admin',
      'Edit Product',
      `Modified parameters of seller product: "${updatedProduct.title}" (ID: ${updatedProduct.id}).`
    );

    setEditingProduct(null);
    loadData();
    triggerNotice("Retailer product catalog updated.");
  };

  // Delete Product
  const handleDeleteProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (confirm(`Are you sure you want to delete the product listing: "${prod.title}"?\nThis is a destructive transaction.`)) {
      StorageService.deleteProduct(productId);

      // Log product delete
      StorageService.logActivity(
        'u-admin',
        'Admin Overrule',
        'admin',
        'Delete Product',
        `Withdrew listing: "${prod.title}" (ID: ${productId}).`
      );

      loadData();
      triggerNotice(`Listed product "${prod.title}" was withdrawn.`);
    }
  };

  // Open Edit Activity Modal
  const handleOpenEditActivity = (act: SystemActivity) => {
    setEditingActivity(act);
    setActAction(act.action);
    setActDetails(act.details);
  };

  // Save Activity Edits
  const handleEditActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;

    const updatedActivities = activities.map(act => {
      if (act.id === editingActivity.id) {
        return {
          ...act,
          action: actAction.trim(),
          details: actDetails.trim()
        };
      }
      return act;
    });

    StorageService.saveActivities(updatedActivities);
    setEditingActivity(null);
    loadData();
    triggerNotice("System activity log edited successfully.");
  };

  // Delete Activity Entry
  const handleDeleteActivity = (actId: string) => {
    if (confirm("Remove this entry from the historical security registry?")) {
      const remainingActivites = activities.filter(act => act.id !== actId);
      StorageService.saveActivities(remainingActivites);
      loadData();
      triggerNotice("Registry log removed.");
    }
  };

  // Filter & Search Master Users list
  const filteredUsersList = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      user.name.toLowerCase().includes(query) || 
      user.username.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    // We do not show the currently logged in admin in general list to avoid self-disabling hazards
    return matchesSearch && matchesRole && user.id !== 'u-admin';
  });

  // Calculate detailed financial/product metrics for a specific seller
  const getSellerMetrics = (sellerId: string) => {
    const sellerProducts = products.filter(p => p.sellerId === sellerId);
    const storeRevenue = sellerProducts.reduce((acc, p) => acc + p.totalRevenue, 0);
    const storeUnits = sellerProducts.reduce((acc, p) => acc + p.unitsSold, 0);
    const storeItems = sellerProducts.length;
    
    // Sort listing priorities
    return { storeRevenue, storeUnits, storeItems, sellerProducts };
  };

  // Get buyer statistical profiles
  const getBuyerMetrics = (buyerId: string) => {
    const buyerOrders = orders.filter(o => o.buyerId === buyerId);
    const totalSpent = buyerOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const completedOrdersCount = buyerOrders.length;
    return { totalSpent, completedOrdersCount, buyerOrders };
  };

  const marketplaceTrend = buildMonthlySales(orders);
  const sellerShare = users
    .filter((user) => user.role === 'seller')
    .map((seller) => ({ seller, ...getSellerMetrics(seller.id) }))
    .sort((a, b) => b.storeRevenue - a.storeRevenue);
  const sellerShareMax = Math.max(...sellerShare.map((entry) => entry.storeRevenue), 1);

  return (
    <div id="admin-panel-root" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300 text-neutral-900 font-sans">
      
      {/* Blueprint Top Banner */}
      <div className="w-full h-1 bg-neutral-950 mb-6 stripe-accent"></div>

      {/* Header Grid */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b-2 border-neutral-900 pb-8">
        <div>
          <div className="flex items-center gap-2 text-neutral-900 font-mono text-xs font-bold uppercase tracking-[0.2em]">
            <ShieldCheck className="w-4 h-4 text-neutral-900" />
            SECURE PORTAL SYSTEM MANAGEMENT
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-neutral-950 mt-1">
            Administrative Control Matrix
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-1 uppercase tracking-wide">
            INSPECT INCOME LAYERS • MANAGE SELLER CATALOGS • AUDIT BUYER PURCHASES • REGISTRY DELETES
          </p>
        </div>

        {/* Global Feedback Notice */}
        {noticeMessage && (
          <div className="bg-emerald-50 border-2 border-emerald-900 px-4 py-2 flex items-center gap-2 text-emerald-900 font-mono text-xs shadow-[2px_2px_0px_0px_rgba(16,185,129,0.2)]">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>{noticeMessage}</span>
          </div>
        )}

        {/* Global Overview Grid */}
        <div className="bg-[#FAF9F6] border-2 border-neutral-900 px-5 py-3 flex gap-6 w-full md:w-auto rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <div className="text-center border-r border-neutral-300 pr-5">
            <span className="block text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">USERS</span>
            <span className="text-lg font-serif font-black text-neutral-900">{users.length}</span>
          </div>
          <div className="text-center border-r border-neutral-300 pr-5">
            <span className="block text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">SELLERS</span>
            <span className="text-lg font-serif font-black text-neutral-900 dark:text-white">
              {users.filter(u => u.role === 'seller').length}
            </span>
          </div>
          <div className="text-center pr-5 border-r border-neutral-300">
            <span className="block text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">BUYERS</span>
            <span className="text-lg font-serif font-black text-neutral-900 dark:text-white">
              {users.filter(u => u.role === 'buyer').length}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">PRODUCTS</span>
            <span className="text-lg font-serif font-black text-neutral-900">{products.length}</span>
          </div>
        </div>
      </div>

      {/* Primary Dashboard Navigation Tabs */}
      <div className="flex border-b-2 border-neutral-900 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => { setActiveTab('users'); setSelectedSellerId(null); setSelectedBuyerId(null); }}
          className={`px-5 py-3 font-mono text-xs uppercase tracking-wider font-bold border-t-2 border-r-2 border-l-2 transition-all -mb-[2px] ${
            activeTab === 'users'
              ? 'bg-[#FAF9F6] border-neutral-900 border-b-[#FAF9F6] text-neutral-950'
              : 'bg-[#FAF9F6]/40 border-transparent text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <div className="flex items-center gap-2 select-none">
            <Users className="w-4 h-4" />
            <span>Accounts & Credentials</span>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('sellers'); setSelectedSellerId(null); setSelectedBuyerId(null); }}
          className={`px-5 py-3 font-mono text-xs uppercase tracking-wider font-bold border-t-2 border-r-2 border-l-2 transition-all -mb-[2px] ${
            activeTab === 'sellers'
              ? 'bg-[#FAF9F6] border-neutral-900 border-b-[#FAF9F6] text-neutral-950'
              : 'bg-[#FAF9F6]/40 border-transparent text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <div className="flex items-center gap-2 select-none">
            <Store className="w-4 h-4" />
            <span>Sellers & Products</span>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('buyers'); setSelectedSellerId(null); setSelectedBuyerId(null); }}
          className={`px-5 py-3 font-mono text-xs uppercase tracking-wider font-bold border-t-2 border-r-2 border-l-2 transition-all -mb-[2px] ${
            activeTab === 'buyers'
              ? 'bg-[#FAF9F6] border-neutral-900 border-b-[#FAF9F6] text-neutral-950'
              : 'bg-[#FAF9F6]/40 border-transparent text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <div className="flex items-center gap-2 select-none">
            <ShoppingBag className="w-4 h-4" />
            <span>Buyers & Achats</span>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('activities'); setSelectedSellerId(null); setSelectedBuyerId(null); }}
          className={`px-5 py-3 font-mono text-xs uppercase tracking-wider font-bold border-t-2 border-r-2 border-l-2 transition-all -mb-[2px] ${
            activeTab === 'activities'
              ? 'bg-[#FAF9F6] border-neutral-900 border-b-[#FAF9F6] text-neutral-950'
              : 'bg-[#FAF9F6]/40 border-transparent text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <div className="flex items-center gap-2 select-none">
            <History className="w-4 h-4" />
            <span>Activity Registry</span>
          </div>
        </button>
      </div>

      {/* Tab 1: Accounts & Global Credentials */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-12 gap-8">
          
          {/* Main User Catalogue */}
          <section className="col-span-12 lg:col-span-8 bg-[#FAF9F6] border-2 border-neutral-900 flex flex-col rounded-none shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
            
            {/* Filter bar */}
            <div className="p-5 border-b-2 border-neutral-900 bg-[#EAE6DF]/65 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 w-full max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query names, email entries, handles..."
                  className="w-full pl-9 pr-4 py-2 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white bg-[#FAF9F6] placeholder-neutral-400"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <Filter className="w-3.5 h-3.5 text-neutral-600" />
                <div className="flex gap-1">
                  {['all', 'buyer', 'seller'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRoleFilter(role)}
                      className={`px-3 py-1.5 rounded-none text-[10px] font-mono tracking-wider uppercase font-bold transition-all border ${
                        roleFilter === role
                          ? 'bg-neutral-900 text-[#FAF9F6] border-neutral-900'
                          : 'bg-white text-neutral-500 border-neutral-300 hover:border-neutral-900 hover:text-neutral-900'
                      }`}
                    >
                      {role === 'all' ? 'All Roles' : `${role}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-900 bg-[#EAE6DF]/30 text-[10px] font-mono font-bold text-neutral-500 tracking-widest uppercase">
                    <th className="py-4 px-6 font-semibold">User Details</th>
                    <th className="py-4 px-6 font-semibold">Security Role</th>
                    <th className="py-4 px-6 font-semibold">Status Indicator</th>
                    <th className="py-4 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                  {filteredUsersList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 px-6 text-center text-neutral-400 select-none bg-white">
                        <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                        <p className="font-bold text-neutral-700 font-serif italic text-sm">No registered client accounts found</p>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mt-1">Try relaxing or modifying search criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsersList.map((user) => (
                      <tr key={user.id} className="hover:bg-neutral-50/50 bg-white transition border-b border-neutral-100">
                        {/* Name Header details */}
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-serif font-bold text-neutral-950 text-sm leading-tight">{user.name}</p>
                            <p className="text-neutral-400 font-mono text-[10px] mt-0.5 uppercase tracking-wide">@{user.username}</p>
                            <p className="text-neutral-500 font-mono text-[10px] mt-0.5">{user.email}</p>
                          </div>
                        </td>

                        {/* Security Role Type */}
                        <td className="py-4 px-6">
                          {user.role === 'seller' ? (
                            <span className="inline-flex flex-col px-2.5 py-1.5 rounded-none text-[9px] font-mono font-bold bg-purple-50 text-purple-950 border border-purple-200 uppercase tracking-wide">
                              <span>RETAILER PROFILE</span>
                              <span className="text-[9px] font-serif font-black text-purple-800 tracking-tight lowercase italic mt-0.5">
                                🏪 {user.storeName || 'Active Merchant'}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex flex-col px-2.5 py-1.5 rounded-none text-[9px] font-mono font-bold bg-emerald-50 text-emerald-950 border border-emerald-200 uppercase tracking-wide">
                              <span>BUYER PROFILE</span>
                              <span className="text-[9px] font-mono font-bold text-neutral-950 dark:text-neutral-50 tracking-tight lowercase mt-0.5">
                                💵 Wallet Balance: ${ (user.balance ?? 0).toFixed(2) }
                              </span>
                            </span>
                          )}
                        </td>

                        {/* Status Indicator */}
                        <td className="py-4 px-6">
                          {user.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-900 uppercase">
                              <span className="w-1.5 h-1.5 bg-emerald-700 rounded-full"></span>
                              Active
                            </span>
                          ) : user.status === 'pending_approval' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9px] font-mono font-bold bg-amber-100 text-amber-950 border border-amber-950 uppercase animate-pulse">
                              <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce"></span>
                              Pending Approval
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9px] font-mono font-bold bg-rose-100 text-rose-950 border border-rose-950 uppercase">
                              <span className="w-1.5 h-1.5 bg-rose-700 rounded-full animate-pulse"></span>
                              Disabled
                            </span>
                          )}
                        </td>

                        {/* User actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle status */}
                            {user.status === 'pending_approval' ? (
                              <button
                                id={`approve-user-btn-${user.id}`}
                                onClick={() => handleToggleStatus(user.id)}
                                className="px-2.5 py-1 text-[10px] font-mono font-bold border-2 border-neutral-900 text-[#FAF9F6] bg-neutral-900 hover:bg-white hover:text-neutral-900 transition-all rounded-none shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] uppercase tracking-wide"
                                title="Approve Merchant Access"
                              >
                                Approve
                              </button>
                            ) : (
                              <button
                                id={`toggle-status-btn-${user.id}`}
                                onClick={() => handleToggleStatus(user.id)}
                                className={`p-1.5 rounded-none border transition-all ${
                                  user.status === 'active'
                                    ? 'border-neutral-900 text-red-700 bg-white hover:bg-rose-50 hover:text-red-950'
                                    : 'border-emerald-950 text-emerald-950 bg-emerald-50 hover:bg-emerald-900 hover:text-white'
                                }`}
                                title={user.status === 'active' ? 'Suspend Account Access' : 'Restore Account Access'}
                              >
                                {user.status === 'active' ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Open master edit overlay */}
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 text-neutral-900 hover:text-white hover:bg-neutral-900 border border-neutral-900 rounded-none transition-all animate-none"
                              title="Modify Master Credentials"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete permanently */}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 text-red-700 hover:text-white hover:bg-rose-750 border border-red-750 rounded-none transition-all"
                              title="Terminate Account Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick tips panel sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-neutral-900 border-2 border-neutral-900 rounded-none p-6 text-white shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#FAF9F6] flex items-center gap-2 border-b border-neutral-700 pb-3 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                SYSTEM POLICIES
              </h3>
              
              <div className="space-y-4 text-xs font-mono text-neutral-300">
                <p className="uppercase leading-relaxed">
                  As the system administrator, you hold absolute structural override permissions:
                </p>
                <ul className="list-disc pl-4 space-y-2 uppercase text-[10px]">
                  <li>Suspend accounts instantly to block credential logins.</li>
                  <li>Manually override client balances or merchant store designations.</li>
                  <li>Retrieve live active records from LocalStorage databases recursively.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Tab 2: Sellers & Products Ledger */}
      {activeTab === 'sellers' && (
        <div className="space-y-8">
          {!selectedSellerId ? (
            /* Part 1: Sellers Index */
            <>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 bg-[#FAF9F6] border border-neutral-900/15 p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.08)]">
                <h2 className="font-serif text-lg text-neutral-950 mb-1">Marketplace revenue</h2>
                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-3">Last 12 months, refunds excluded</p>
                <SalesChart points={marketplaceTrend} />
              </div>
              <div className="lg:col-span-2 bg-[#FAF9F6] border border-neutral-900/15 p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.08)]">
                <h2 className="font-serif text-lg text-neutral-950 mb-1">Store share</h2>
                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4">Gross revenue by seller</p>
                <div className="space-y-4">
                  {sellerShare.length === 0 ? (
                    <p className="text-xs font-mono text-neutral-500">No sellers yet.</p>
                  ) : sellerShare.map(({ seller, storeRevenue, storeUnits }) => (
                    <div key={seller.id}>
                      <div className="flex justify-between gap-3 text-[11px] font-mono mb-1.5">
                        <span className="truncate text-neutral-800">{seller.storeName || seller.name}</span>
                        <span className="text-neutral-950">${storeRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#E6DFD4] dark:bg-[#2A2622]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#C4A882] to-[#1A1A1A] dark:from-[#E7D7C3] dark:to-[#8C7355]"
                          style={{ width: `${(storeRevenue / sellerShareMax) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] font-mono text-neutral-500">{storeUnits} units</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-[#FAF9F6] border-2 border-neutral-900 rounded-none shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
              <div className="p-5 border-b-2 border-neutral-900 bg-[#EAE6DF]/65 flex justify-between items-center">
                <h2 className="text-sm font-mono font-bold uppercase tracking-widest flex items-center gap-2 text-neutral-950">
                  <Store className="w-4 h-4" />
                  RETAILER REVENUE INDEX & INCOME MAPS
                </h2>
                <span className="text-[10px] font-mono bg-neutral-900 text-white px-2 py-0.5 leading-none">REAL-TIME MERCHANTS</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-neutral-900 bg-[#EAE6DF]/30 text-[10px] font-mono font-bold text-neutral-500 tracking-widest uppercase">
                      <th className="py-4 px-6">Merchant Details</th>
                      <th className="py-4 px-6">Store Name</th>
                      <th className="py-4 px-6">Catalog Listings</th>
                      <th className="py-4 px-6">Total Units Dispatched</th>
                      <th className="py-4 px-6">Aggregate Gross Income</th>
                      <th className="py-4 px-6 text-right">Ledger Dossiers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                    {users.filter(u => u.role === 'seller').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400 font-serif italic">
                          No registered sellers found.
                        </td>
                      </tr>
                    ) : (
                      users.filter(u => u.role === 'seller').map(seller => {
                        const metrics = getSellerMetrics(seller.id);
                        return (
                          <tr key={seller.id} className="hover:bg-neutral-50/50 bg-white border-b border-neutral-100">
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-serif font-bold text-neutral-900">{seller.name}</p>
                                <p className="text-[10px] font-mono text-neutral-400">@{seller.username} • {seller.email}</p>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-mono text-neutral-700 font-semibold uppercase">
                              🏪 {seller.storeName || 'Active Merchant'}
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-neutral-900">
                              {metrics.storeItems} Products
                            </td>
                            <td className="py-4 px-6 font-mono text-neutral-600">
                              {metrics.storeUnits} units
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-neutral-950 dark:text-neutral-50 text-sm">
                              ${metrics.storeRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => setSelectedSellerId(seller.id)}
                                className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-mono uppercase tracking-wider font-bold transition-all border border-neutral-950"
                              >
                                View Portal Ledger →
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          ) : (
            /* Part 2: Detailed Seller Dashboard Ledger */
            (() => {
              const seller = users.find(u => u.id === selectedSellerId);
              if (!seller) return <button onClick={() => setSelectedSellerId(null)}>Back to index</button>;
              const { storeItems, storeRevenue, storeUnits, sellerProducts } = getSellerMetrics(selectedSellerId);
              const sellerActivities = activities.filter(act => act.userId === selectedSellerId);

              return (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Back Navigation header */}
                  <div className="flex items-center justify-between border-b border-neutral-300 pb-4">
                    <button
                      onClick={() => setSelectedSellerId(null)}
                      className="flex items-center gap-2 text-neutral-900 border border-neutral-900 px-3 py-2 bg-[#FAF9F6] hover:bg-[#EAE6DF] font-mono text-xs uppercase font-bold tracking-wider rounded-none"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Sellers Index
                    </button>

                    <div className="text-right">
                      <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest leading-none">CURRENTLY STUDYING LEDGER</p>
                      <p className="text-sm font-serif font-bold text-neutral-900 mt-1">{seller.name} (@{seller.username})</p>
                    </div>
                  </div>

                  {/* Micro stats banner */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 border-2 border-neutral-900 bg-[#EAE6DF]/15 font-mono shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">AGGREGATE GROSS INCOME</p>
                      <p className="text-2xl font-serif font-black text-neutral-950 dark:text-neutral-50 mt-1">
                        ${storeRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-tight mt-0.5 mt-2">All product proceeds summarized</p>
                    </div>
                    
                    <div className="p-5 border-2 border-neutral-900 bg-[#EAE6DF]/15 font-mono shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">VOLUME DISPATCHED</p>
                      <p className="text-2xl font-serif font-black text-neutral-900 mt-1">
                        {storeUnits} Units
                      </p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-tight mt-0.5 mt-2">Active buyer units settled</p>
                    </div>

                    <div className="p-5 border-2 border-neutral-900 bg-[#EAE6DF]/15 font-mono shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">CATALOG OVERVIEW</p>
                      <p className="text-2xl font-serif font-black text-neutral-900 mt-1">
                        {storeItems} Items Listed
                      </p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-tight mt-0.5 mt-2">Active database nodes</p>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] border border-neutral-900/15 p-5">
                    <h3 className="font-serif text-lg text-neutral-950 mb-1">Product revenue</h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4">Share of this store&apos;s recorded sales</p>
                    <div className="space-y-3">
                      {sellerProducts.length === 0 ? (
                        <p className="text-xs font-mono text-neutral-500">No products listed.</p>
                      ) : [...sellerProducts].sort((a, b) => b.totalRevenue - a.totalRevenue).map((product) => {
                        const share = storeRevenue > 0 ? (product.totalRevenue / storeRevenue) * 100 : 0;
                        return (
                          <div key={product.id}>
                            <div className="flex justify-between gap-3 text-[11px] font-mono mb-1.5">
                              <span className="truncate text-neutral-800">{product.title}</span>
                              <span>${product.totalRevenue.toFixed(2)} · {product.unitsSold} sold</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#E6DFD4] dark:bg-[#2A2622]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#C4A882] to-[#1A1A1A] dark:from-[#E7D7C3] dark:to-[#8C7355]"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seller Detailed Section layout */}
                  <div className="grid grid-cols-12 gap-8">
                    
                    {/* Catalog Listings and Actions */}
                    <div className="col-span-12 lg:col-span-8 bg-[#FAF9F6] border-2 border-neutral-900 shadow-[5px_5px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
                      <div className="p-4 border-b-2 border-neutral-900 bg-[#EAE6DF]/50 flex justify-between items-center">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                          <Package className="w-4 h-4 text-neutral-950" />
                          Listed Inventories Catalogue
                        </h3>
                        <span className="text-[9px] font-mono bg-neutral-900 text-white px-2 py-0.5">ADMIN OVERLAY MODAL DISPATCH</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-neutral-300 bg-neutral-50 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
                              <th className="py-3 px-4">Product Details</th>
                              <th className="py-3 px-4">Category</th>
                              <th className="py-3 px-4">Price</th>
                              <th className="py-3 px-4 text-center">In Stock</th>
                              <th className="py-3 px-4 text-center">Units Sold</th>
                              <th className="py-3 px-4 text-right">Proceeds</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                            {sellerProducts.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-neutral-400 font-serif italic">
                                  This retailer currently has no products published.
                                </td>
                              </tr>
                            ) : (
                              sellerProducts.map(prod => (
                                <tr key={prod.id} className="hover:bg-neutral-50 bg-white">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={prod.imageUrl}
                                        alt={prod.title}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100';
                                        }}
                                        className="w-10 h-10 object-cover border border-neutral-300 rounded-none bg-neutral-100"
                                      />
                                      <div className="max-w-[150px]">
                                        <p className="font-serif font-bold text-neutral-900 truncate" title={prod.title}>
                                          {prod.title}
                                        </p>
                                        <p className="text-[9px] font-mono text-neutral-400 uppercase">ID: {prod.id}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[10px] text-neutral-500 uppercase">
                                    {prod.category}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-neutral-900 font-medium">
                                    ${prod.price.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono">
                                    <span className={`px-1.5 py-0.5 font-bold ${
                                      prod.stock <= 4 ? 'bg-red-50 text-red-950 font-black animate-pulse' : 'text-neutral-700'
                                    }`}>
                                      {prod.stock} left
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono">
                                    {prod.unitsSold} sold
                                  </td>
                                  <td className="py-3 px-4 font-mono text-right text-neutral-950 dark:text-neutral-50 font-bold">
                                    ${prod.totalRevenue.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-1">
                                      <button
                                        onClick={() => handleOpenEditProduct(prod)}
                                        className="p-1 border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white rounded-none"
                                        title="Admin Override: Edit Product"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteProduct(prod.id)}
                                        className="p-1 border border-red-900 text-red-900 hover:bg-red-900 hover:text-white rounded-none"
                                        title="Admin Override: Withdraw Product"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Left Column: Seller specific Activities log */}
                    <div className="col-span-12 lg:col-span-4 bg-[#FAF9F6] border-2 border-neutral-900 p-5 shadow-[5px_5px_0px_0px_rgba(26,26,26,1)]">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-950 border-b-2 border-neutral-900 pb-3 mb-4 flex items-center gap-2">
                        <History className="w-4 h-4 text-purple-900" />
                        Retailer Activity Ledger
                      </h3>

                      {sellerActivities.length === 0 ? (
                        <p className="text-xs font-serif italic text-neutral-400 py-12 text-center">
                          No historical activities catalogued for this retailer.
                        </p>
                      ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                          {sellerActivities.map(act => (
                            <div key={act.id} className="p-3 bg-white border border-neutral-300 font-mono text-[10px] text-neutral-800 uppercase relative group">
                              <p className="text-[11px] font-black tracking-tight text-neutral-900">{act.action}</p>
                              <p className="text-neutral-500 tracking-normal normal-case mt-1">{act.details}</p>
                              
                              <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-neutral-200">
                                <span className="text-[8px] text-neutral-400">{new Date(act.timestamp).toLocaleString()}</span>
                                
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleOpenEditActivity(act)}
                                    className="text-neutral-600 hover:text-blue-900"
                                    title="Edit Log Content"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteActivity(act.id)}
                                    className="text-red-700 hover:text-red-900"
                                    title="Remove Log Entry"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Tab 3: Buyers & Purchase Timeline */}
      {activeTab === 'buyers' && (
        <div>
          {!selectedBuyerId ? (
            /* Part 1: Buyers Index */
            <div className="bg-[#FAF9F6] border-2 border-neutral-900 rounded-none shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
              <div className="p-5 border-b-2 border-neutral-900 bg-[#EAE6DF]/65 flex justify-between items-center">
                <h2 className="text-sm font-mono font-bold uppercase tracking-widest flex items-center gap-2 text-neutral-950">
                  <Coins className="w-4 h-4" />
                  BUYER BALANCES & TRANSACTION LEDGER
                </h2>
                <span className="text-[10px] font-mono bg-neutral-900 text-white px-2 py-0.5 leading-none">REAL-TIME ACCOUNTS</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-neutral-900 bg-[#EAE6DF]/30 text-[10px] font-mono font-bold text-neutral-500 tracking-widest uppercase">
                      <th className="py-4 px-6">Buyer Details</th>
                      <th className="py-4 px-6">Wallet Cash Balance</th>
                      <th className="py-4 px-6">Simulated Credit Cards</th>
                      <th className="py-4 px-6">Completed Purchase Nodes</th>
                      <th className="py-4 px-6">Aggregate Funds Dispatched</th>
                      <th className="py-4 px-6 text-right">Dossier Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                    {users.filter(u => u.role === 'buyer').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400 font-serif italic">
                          No registered buyers found.
                        </td>
                      </tr>
                    ) : (
                      users.filter(u => u.role === 'buyer').map(buyer => {
                        const metrics = getBuyerMetrics(buyer.id);
                        return (
                          <tr key={buyer.id} className="hover:bg-neutral-50/50 bg-white border-b border-neutral-100">
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-serif font-bold text-neutral-900">{buyer.name}</p>
                                <p className="text-[10px] font-mono text-neutral-400">@{buyer.username} • {buyer.email}</p>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-neutral-950 dark:text-neutral-50 text-sm">
                              💵 ${(buyer.balance ?? 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-6 font-mono text-neutral-600">
                              {(buyer.bankCards || []).length} saved demo cards
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-neutral-900">
                              {metrics.completedOrdersCount} purchases
                            </td>
                            <td className="py-4 px-6 font-mono font-bold text-neutral-900">
                              ${metrics.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => setSelectedBuyerId(buyer.id)}
                                className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-mono uppercase tracking-wider font-bold transition-all border border-neutral-950"
                              >
                                View Portal Dossier →
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Part 2: Detailed Buyer Account study (Purchase logs + Activities logs) */
            (() => {
              const buyer = users.find(u => u.id === selectedBuyerId);
              if (!buyer) return <button onClick={() => setSelectedBuyerId(null)}>Back to index</button>;
              const { completedOrdersCount, totalSpent, buyerOrders } = getBuyerMetrics(selectedBuyerId);
              const buyerActivities = activities.filter(act => act.userId === selectedBuyerId);

              return (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Back Navigation Header */}
                  <div className="flex items-center justify-between border-b border-neutral-300 pb-4">
                    <button
                      onClick={() => setSelectedBuyerId(null)}
                      className="flex items-center gap-2 text-neutral-900 border border-neutral-900 px-3 py-2 bg-[#FAF9F6] hover:bg-[#EAE6DF] font-mono text-xs uppercase font-bold tracking-wider rounded-none"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Buyers Index
                    </button>

                    <div className="text-right">
                      <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest leading-none">CURRENTLY STUDYING DOSSIER</p>
                      <p className="text-sm font-serif font-bold text-neutral-900 mt-1">{buyer.name} (@{buyer.username})</p>
                    </div>
                  </div>

                  {/* Micro metrics cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 border-2 border-neutral-900 bg-[#EAE6DF]/15 font-mono shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">AVAILABLE VIRTUAL WALLET</p>
                      <p className="text-2xl font-serif font-black text-neutral-950 dark:text-neutral-50 mt-1">
                        ${(buyer.balance ?? 0).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-tight mt-2">Active cash buffer</p>
                    </div>
                    
                    <div className="p-5 border-2 border-neutral-900 bg-[#EAE6DF]/15 font-mono shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">COMPLETED ORDERS</p>
                      <p className="text-2xl font-serif font-black text-neutral-900 mt-1">
                        {completedOrdersCount} Transactions
                      </p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-tight mt-2">Historical purchases</p>
                    </div>

                    <div className="p-5 border-2 border-neutral-900 bg-[#EAE6DF]/15 font-mono shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">TOTAL INFLOW DISPATCHED</p>
                      <p className="text-2xl font-serif font-black text-[#1A1A1A] mt-1">
                        ${totalSpent.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-tight mt-2">Volume spent in marketplace</p>
                    </div>
                  </div>

                  {/* Buyer details sub-sections */}
                  <div className="grid grid-cols-12 gap-8">
                    
                    {/* Buyer Purchase History: "Historic of Achats" */}
                    <div className="col-span-12 lg:col-span-8 bg-[#FAF9F6] border-2 border-neutral-900 shadow-[5px_5px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
                      <div className="p-4 border-b-2 border-neutral-900 bg-[#EAE6DF]/50 flex justify-between items-center">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-emerald-950" />
                          Historic of Achats (Purchase History Grid)
                        </h3>
                        <span className="text-[9px] font-mono bg-neutral-900 text-white px-2 py-0.5">COMPLETED COMMERCE</span>
                      </div>

                      {buyerOrders.length === 0 ? (
                        <div className="py-16 text-center text-neutral-400 select-none bg-white font-serif italic">
                          This buyer profile has not concluded any transaction orders.
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-300">
                          {buyerOrders.map((order) => (
                            <div key={order.id} className="p-6 bg-white hover:bg-neutral-55 transition">
                              
                              {/* Order metadata line */}
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-3 mb-4">
                                <div className="font-mono text-xs">
                                  <span className="font-black text-neutral-900">ORDER NODE: #{order.id}</span>
                                  <span className="mx-2 text-neutral-300">•</span>
                                  <span className="text-neutral-500">{new Date(order.date).toLocaleString()}</span>
                                  {order.status === 'refunded' && (
                                    <span className="ml-2.5 inline-block px-1.5 py-0.5 text-[9px] font-bold bg-neutral-900 text-white select-none">
                                      SIMULATION REFUNDED
                                    </span>
                                  )}
                                </div>
                                
                                <div className="text-right font-mono">
                                  <span className="text-[10px] text-neutral-400 block tracking-wider uppercase">NET SETTLEMENT</span>
                                  <span className="text-sm font-bold text-neutral-950">${order.totalAmount.toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Order items nested listing */}
                              <div className="space-y-3">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-neutral-50 p-2.5 border border-neutral-200">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100';
                                        }}
                                        className="w-10 h-10 object-cover border border-neutral-300 select-none bg-white"
                                      />
                                      <div>
                                        <p className="font-serif font-bold text-xs text-neutral-900">{item.title}</p>
                                        <p className="font-mono text-[9px] text-neutral-400 mt-0.5 uppercase">UNITS: {item.quantity}x @ ${item.price.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <div className="text-right font-mono font-medium text-xs text-neutral-800">
                                      ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-3.5 flex justify-between items-center text-[10px] font-mono text-neutral-500">
                                <span className="uppercase">PAID VIA: {order.paymentMethod}</span>
                                <span className="uppercase">TRANSID LOGGED</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right column: Buyer specific activity log */}
                    <div className="col-span-12 lg:col-span-4 bg-[#FAF9F6] border-2 border-neutral-900 p-5 shadow-[5px_5px_0px_0px_rgba(26,26,26,1)]">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-950 border-b-2 border-neutral-900 pb-3 mb-4 flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-900" />
                        Buyer Activity Registry
                      </h3>

                      {buyerActivities.length === 0 ? (
                        <p className="text-xs font-serif italic text-neutral-400 py-12 text-center">
                          No historical logs cached for this client profile.
                        </p>
                      ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                          {buyerActivities.map(act => (
                            <div key={act.id} className="p-3 bg-white border border-neutral-300 font-mono text-[10px] text-neutral-800 uppercase relative group">
                              <p className="text-[11px] font-black tracking-tight text-neutral-900">{act.action}</p>
                              <p className="text-neutral-500 tracking-normal normal-case mt-1">{act.details}</p>
                              
                              <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-neutral-200">
                                <span className="text-[8px] text-neutral-400">{new Date(act.timestamp).toLocaleString()}</span>
                                
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleOpenEditActivity(act)}
                                    className="text-neutral-600 hover:text-blue-950"
                                    title="Edit Log"
                                  >
                                    <Edit className="w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteActivity(act.id)}
                                    className="text-red-700 hover:text-red-950"
                                    title="Delete Log"
                                  >
                                    <Trash2 className="w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Tab 4: Global Activity Registry */}
      {activeTab === 'activities' && (
        <div className="bg-[#FAF9F6] border-2 border-neutral-900 rounded-none shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b-2 border-neutral-900 bg-[#EAE6DF]/65 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-widest flex items-center gap-2 text-neutral-950">
                <Clock className="w-4 h-4 text-neutral-950" />
                GLOBAL SECURED TELEMETRY & TRANSACTION REGISTRY
              </h2>
              <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mt-0.5">Edit or delete logs directly to sanitize database audits</p>
            </div>
            
            <div className="relative flex-1 w-full max-w-xs sm:max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query actor, details, operations..."
                className="w-full pl-9 pr-4 py-2 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white bg-[#FAF9F6] placeholder-neutral-400"
              />
            </div>
          </div>

          {/* Activities Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-900 bg-[#EAE6DF]/30 text-[10px] font-mono font-bold text-neutral-500 tracking-widest uppercase">
                  <th className="py-4 px-6">Timestamp UTC</th>
                  <th className="py-4 px-6">Source Operator (Actor)</th>
                  <th className="py-4 px-6">Role Rank</th>
                  <th className="py-4 px-6">Operation Action</th>
                  <th className="py-4 px-6 max-w-sm">Detailed Parameter Log</th>
                  <th className="py-4 px-6 text-right">Sanitize / Alter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                {activities.filter(act => {
                  const q = searchQuery.toLowerCase();
                  return (
                    act.userName.toLowerCase().includes(q) ||
                    act.action.toLowerCase().includes(q) ||
                    act.details.toLowerCase().includes(q)
                  );
                }).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-neutral-400 font-serif italic text-sm">
                      No system telemetry entries found.
                    </td>
                  </tr>
                ) : (
                  activities
                    .filter(act => {
                      const q = searchQuery.toLowerCase();
                      return (
                        act.userName.toLowerCase().includes(q) ||
                        act.action.toLowerCase().includes(q) ||
                        act.details.toLowerCase().includes(q)
                      );
                    })
                    .map((act) => (
                      <tr key={act.id} className="hover:bg-neutral-50/50 bg-white font-mono text-[11px]">
                        <td className="py-4 px-6 text-neutral-500 whitespace-nowrap">
                          {new Date(act.timestamp).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 font-bold text-neutral-900">
                          {act.userName}
                          <span className="block text-[8.5px] font-normal text-neutral-400 lowercase italic mt-0.5">ID: {act.userId}</span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {act.userRole === 'admin' ? (
                            <span className="px-2 py-0.5 border border-dashed border-red-500 text-red-700 bg-red-50 text-[9px] font-bold">ADMIN SEC</span>
                          ) : act.userRole === 'seller' ? (
                            <span className="px-2 py-0.5 border border-dashed border-purple-500 text-purple-700 bg-purple-50 text-[9px] font-bold">RETAILER</span>
                          ) : (
                            <span className="px-2 py-0.5 border border-dashed border-emerald-500 text-emerald-700 bg-emerald-50 text-[9px] font-bold">BUYER LOG</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-black uppercase text-neutral-900 whitespace-nowrap">
                          {act.action}
                        </td>
                        <td className="py-4 px-6 text-neutral-600 font-sans tracking-wide">
                          {act.details}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditActivity(act)}
                              className="p-1 border border-neutral-900 text-neutral-950 hover:bg-neutral-900 hover:text-white rounded-none"
                              title="Update System Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(act.id)}
                              className="p-1 border border-red-800 text-red-800 hover:bg-red-800 hover:text-white rounded-none"
                              title="Discard Telemetry Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: UNIVERSAL PROFILE MODIFY FORM */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-[#1A1A1A]/72 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-6 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] rounded-none text-neutral-900 relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-950 p-1 rounded-none border border-transparent hover:border-neutral-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-neutral-900 pb-3 mb-6">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-950" />
                Modify Profile Parameters
              </h3>
              <p className="text-[10px] font-mono text-neutral-400 uppercase mt-1">OPERATOR SYSTEM PROFILE OVERRULE</p>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div className="p-3 bg-[#EAE6DF] border border-neutral-900 font-mono text-[9px] uppercase tracking-wide">
                <span>Database Node: {editingUser.id}</span>
                <span className="mx-2 text-neutral-400">•</span>
                <span>Type Rank: {editingUser.role}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editUserNameInput}
                    onChange={(e) => setEditUserNameInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-10.5 uppercase tracking-wider">Email Entry Address</label>
                  <input
                    type="email"
                    required
                    value={editUserEmailInput}
                    onChange={(e) => setEditUserEmailInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Username Handle</label>
                  <input
                    type="text"
                    required
                    value={editUserUsernameInput}
                    onChange={(e) => setEditUserUsernameInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Password Override (Virtual)</label>
                  <input
                    type="password"
                    value={editUserPasswordInput}
                    onChange={(e) => setEditUserPasswordInput(e.target.value)}
                    placeholder="Enter bypass password"
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none placeholder-neutral-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Status layer</label>
                  <select
                    value={editUserStatusInput}
                    onChange={(e) => setEditUserStatusInput(e.target.value as 'active' | 'disabled')}
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                  >
                    <option value="active">Active System Node</option>
                    <option value="disabled">Disabled System Node</option>
                  </select>
                </div>

                {/* Role Specific Parameters */}
                {editingUser.role === 'buyer' && (
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Adjust Wallet Cash ($)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={editUserBalanceInput}
                      onChange={(e) => setEditUserBalanceInput(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                    />
                  </div>
                )}

                {editingUser.role === 'seller' && (
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Modify Store Name</label>
                    <input
                      type="text"
                      required
                      value={editUserStoreNameInput}
                      onChange={(e) => setEditUserStoreNameInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono font-black uppercase tracking-widest border border-neutral-900"
                >
                  Save Override Settings
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 bg-white hover:bg-neutral-200 text-neutral-950 border border-neutral-950 text-xs font-mono uppercase font-black"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADMIN EDIT PRODUCT DETAILS */}
      {/* ========================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 bg-[#1A1A1A]/72 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-6 w-full max-w-xl shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] rounded-none text-neutral-900 relative">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-950 p-1 border border-transparent hover:border-neutral-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-neutral-900 pb-3 mb-6">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-[#1A1A1A] flex items-center gap-2">
                <Package className="w-5 h-5" />
                Administrative Catalog Override
              </h3>
              <p className="text-[10px] font-mono text-neutral-400 mt-1 uppercase">Modify listed items and pricing layers directly</p>
            </div>

            <form onSubmit={handleEditProductSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Product Title</label>
                <input
                  type="text"
                  required
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Category Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Audio & Acoustics">Audio & Acoustics</option>
                    <option value="Home & Office">Home & Office</option>
                    <option value="Aesthetic Crafts">Aesthetic Crafts</option>
                    <option value="Travel & Carry">Travel & Carry</option>
                    <option value="Fashion & Apparel">Fashion & Apparel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Stock Units</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Image Resource (URL)</label>
                <input
                  type="url"
                  required
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-10.5 uppercase tracking-wider">Listed Description</label>
                <textarea
                  rows={3}
                  required
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-sans border border-neutral-900 bg-white text-neutral-900 focus:outline-none resize-none leading-relaxed"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono uppercase tracking-widest font-black border border-neutral-900"
                >
                  Confirm Catalog Correction
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 bg-white hover:bg-neutral-200 text-neutral-950 border border-neutral-900 text-xs font-mono uppercase font-black"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADMIN EDIT ACTIVITY CONTENT */}
      {/* ========================================================= */}
      {editingActivity && (
        <div className="fixed inset-0 bg-[#1A1A1A]/72 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] rounded-none text-neutral-900 relative">
            <button
              onClick={() => setEditingActivity(null)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-900 p-1 border border-transparent hover:border-neutral-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b-2 border-neutral-900 pb-3 mb-6">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-neutral-900 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Sanitize Telemetry Entry
              </h3>
              <p className="text-[10px] font-mono text-neutral-400 mt-1 uppercase">Alter log details in the security registry</p>
            </div>

            <form onSubmit={handleEditActivitySubmit} className="space-y-4">
              <div className="p-3 bg-[#EAE6DF] border border-neutral-900 font-mono text-[9px] uppercase tracking-wide">
                <span>Activity Node ID: {editingActivity.id}</span>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Operation Action Name</label>
                <input
                  type="text"
                  required
                  value={actAction}
                  onChange={(e) => setActAction(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-wider">Description Content Log Details</label>
                <textarea
                  rows={4}
                  required
                  value={actDetails}
                  onChange={(e) => setActDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-neutral-900 bg-white text-neutral-900 focus:outline-none resize-none leading-relaxed"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono uppercase tracking-widest font-black border border-neutral-900"
                >
                  Save Log Sanitize
                </button>
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2.5 bg-white hover:bg-[#EAE6DF] text-neutral-950 border border-neutral-900 text-xs font-mono uppercase font-black"
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
