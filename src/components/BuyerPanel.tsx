/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

import React, { useState, useEffect } from 'react';
import { User, Product, Order, CartItem, OrderItem } from '../types';
import { StorageService } from '../lib/storage';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  CheckCircle,
  Coins, 
  AlertCircle, 
  ArrowRight, 
  Filter, 
  Layers,
  Sparkles,
  ShoppingBag,
  Clock,
  ChevronRight,
  ShieldCheck,
  Award,
  X,
  User as UserIcon
} from 'lucide-react';

interface BuyerPanelProps {
  currentUser: User | null;
  onRefreshUser: () => void;
  addFundsTriggerCount: number; // to trigger fund add popup
  onSignInPrompt: () => void;
  activeTab: 'catalog' | 'profile';
  onNavigateToTab: (tab: 'catalog' | 'profile') => void;
}

export default function BuyerPanel({ 
  currentUser, 
  onRefreshUser, 
  addFundsTriggerCount, 
  onSignInPrompt,
  activeTab,
  onNavigateToTab
}: BuyerPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);

  // Detailed Modal details for Product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Checkout virtual payment states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'details' | 'processing' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'card'>('balance');
  const [simulatedCardNumber, setSimulatedCardNumber] = useState('4111 2222 3333 4444');
  const [simulatedCardName, setSimulatedCardName] = useState(currentUser?.name || 'GUEST CUSTOMER');
  const [checkoutError, setCheckoutError] = useState('');
  
  // Wallet top-up states
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [fundsToAdd, setFundsToAdd] = useState(250);

  // Profile modification states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [infoSuccessMsg, setInfoSuccessMsg] = useState('');

  // Add bank card states
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardholder, setNewCardholder] = useState('');
  const [newCardExp, setNewCardExp] = useState('');
  const [newCardProvider, setNewCardProvider] = useState<'visa' | 'mastercard' | 'amex' | 'discover'>('visa');
  const [cardSuccessMsg, setCardSuccessMsg] = useState('');

  // Sync profile update inputs whenever user switches or enters
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditEmail(currentUser.email);
      setEditUsername(currentUser.username);
      setEditPassword('');
    }
  }, [currentUser]);

  // Sync card name if user logs in
  useEffect(() => {
    setSimulatedCardName(currentUser?.name || 'GUEST CUSTOMER');
  }, [currentUser]);

  const loadData = () => {
    setProducts(StorageService.getProducts());
    setCart(StorageService.getCart(currentUser?.id || 'guest'));
    
    // Load only orders belonging to *this* buyer
    const allOrders = StorageService.getOrders();
    const buyerOrders = currentUser ? allOrders.filter(o => o.buyerId === currentUser.id) : [];
    setPastOrders(buyerOrders);
  };

  useEffect(() => {
    loadData();
    setShowCartDrawer(false);
    // Re-load on core updates
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser?.id]);

  // Dispatch state changes for the cart drawer so other overlays (like AI Agent) can move dynamically
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nexus-cart-drawer-state-change', { detail: { open: showCartDrawer } }));
  }, [showCartDrawer]);

  // Custom Event Listeners to receive real-time queries/interactions from the Nexus AI Agent Chat
  useEffect(() => {
    const handleSearchEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.query === 'string') {
        setSearchQuery(customEvent.detail.query);
        setSelectedCategory('All');
        onNavigateToTab('catalog');
      }
    };
    const handleCategoryEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.category === 'string') {
        setSelectedCategory(customEvent.detail.category);
        setSearchQuery('');
        onNavigateToTab('catalog');
      }
    };
    const handleCartDrawerEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.open === 'boolean') {
        setShowCartDrawer(customEvent.detail.open);
      }
    };

    window.addEventListener('nexus-search', handleSearchEvent);
    window.addEventListener('nexus-category', handleCategoryEvent);
    window.addEventListener('nexus-cart-drawer', handleCartDrawerEvent);
    return () => {
      window.removeEventListener('nexus-search', handleSearchEvent);
      window.removeEventListener('nexus-category', handleCategoryEvent);
      window.removeEventListener('nexus-cart-drawer', handleCartDrawerEvent);
    };
  }, [onNavigateToTab]);

  // Listener to open virtual wallet top-up modal if requested by header trigger
  useEffect(() => {
    if (addFundsTriggerCount > 0) {
      if (!currentUser) {
        onSignInPrompt();
      } else {
        onNavigateToTab('profile');
        setIsAddFundsModalOpen(true);
      }
    }
  }, [addFundsTriggerCount, currentUser]);

  // Get active catalog categories
  const categories = ['All', ...new Set(products.map(p => p.category))];

  // Filter products catalog
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate cart counts
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => {
    const p = products.find(prod => prod.id === item.productId);
    return acc + (p ? p.price * item.quantity : 0);
  }, 0);

  // Cart operations
  const handleAddToCart = (product: Product, quantityToAdd = 1) => {
    if (product.stock <= 0) {
      alert('This product is currently sold out and cannot be added to your cart.');
      return;
    }

    const updatedCart = [...cart];
    const existingIndex = updatedCart.findIndex(item => item.productId === product.id);

    if (existingIndex !== -1) {
      const nextQuantity = updatedCart[existingIndex].quantity + quantityToAdd;
      if (nextQuantity > product.stock) {
        alert(`Sorry, only ${product.stock} units are currently available.`);
        updatedCart[existingIndex].quantity = product.stock;
      } else {
        updatedCart[existingIndex].quantity = nextQuantity;
      }
    } else {
      updatedCart.push({ productId: product.id, quantity: Math.min(quantityToAdd, product.stock) });
    }

    setCart(updatedCart);
    StorageService.saveCart(currentUser?.id || 'guest', updatedCart);
    
    // Short visual cue
    setShowCartDrawer(true);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;

    const updatedCart = cart.map(item => {
      if (item.productId === productId) {
        const nextQuantity = item.quantity + delta;
        if (nextQuantity <= 0) return null;
        if (nextQuantity > targetProduct.stock) {
          alert(`Sorry, maximum available stock is ${targetProduct.stock} units.`);
          return { ...item, quantity: targetProduct.stock };
        }
        return { ...item, quantity: nextQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[];

    setCart(updatedCart);
    StorageService.saveCart(currentUser?.id || 'guest', updatedCart);
  };

  const handleRemoveFromCart = (productId: string) => {
    const updated = cart.filter(item => item.productId !== productId);
    setCart(updated);
    StorageService.saveCart(currentUser?.id || 'guest', updated);
  };

  // Fund virtual wallet top up execution
  const handleAddFundsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAddFundsModalOpen(false);
      onSignInPrompt();
      return;
    }
    if (fundsToAdd <= 0) return;

    const allUsers = StorageService.getUsers();
    const myProfileIndex = allUsers.findIndex(u => u.id === currentUser.id);

    if (myProfileIndex !== -1) {
      const updatedBalance = (allUsers[myProfileIndex].balance ?? 0) + Number(fundsToAdd);
      allUsers[myProfileIndex].balance = updatedBalance;
      StorageService.saveUsers(allUsers);
      
      // Update local storage context
      StorageService.setCurrentUser(allUsers[myProfileIndex]);
      onRefreshUser();
    }

    setIsAddFundsModalOpen(false);
  };

  // Virtual Payment Submission
  const handleLaunchCheckout = () => {
    if (!currentUser) {
      onSignInPrompt();
      return;
    }
    if (cart.length === 0) return;
    setCheckoutError('');
    setPaymentStep('details');
    setIsCheckoutModalOpen(true);
  };

  const handleProcessSimulatedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    // Verification step
    if (paymentMethod === 'balance') {
      const userBalance = currentUser.balance ?? 0;
      if (userBalance < cartSubtotal) {
        setCheckoutError(`Insufficient virtual bank balance. You need $${(cartSubtotal - userBalance).toFixed(2)} more simulation funds! Tap 'Add Funds' to replenish.`);
        return;
      }
    }

    // Step 1: Processing Animation
    setPaymentStep('processing');

    setTimeout(() => {
      // Step 2: Write final order & deduct stocks / update balances
      const allUsers = StorageService.getUsers();
      const allProducts = StorageService.getProducts();

      // Find references
      const myProfileIndex = allUsers.findIndex(u => u.id === currentUser.id);
      if (myProfileIndex === -1) {
        setCheckoutError('Authentication error. Please re-authenticate.');
        setPaymentStep('details');
        return;
      }

      // Check stock levels physically before deducting
      for (const item of cart) {
        const prod = allProducts.find(p => p.id === item.productId);
        if (!prod || prod.stock < item.quantity) {
          setCheckoutError(`Stock verification error: "${prod?.title || 'Unknown Item'}" has insufficient stock in this second. Checkout cancelled.`);
          setPaymentStep('details');
          return;
        }
      }

      // Safe checkout processing
      const orderItemsList: OrderItem[] = [];

      for (const item of cart) {
        const prodIndex = allProducts.findIndex(p => p.id === item.productId);
        if (prodIndex !== -1) {
          const prod = allProducts[prodIndex];
          
          // Decrement stock levels
          allProducts[prodIndex].stock -= item.quantity;
          // Increment sales counts
          allProducts[prodIndex].unitsSold += item.quantity;
          allProducts[prodIndex].totalRevenue += prod.price * item.quantity;

          orderItemsList.push({
            productId: prod.id,
            title: prod.title,
            price: prod.price,
            quantity: item.quantity,
            imageUrl: prod.imageUrl
          });
        }
      }

      // Deduct funds if balance method
      if (paymentMethod === 'balance') {
        const freshBalance = (allUsers[myProfileIndex].balance ?? 0) - cartSubtotal;
        allUsers[myProfileIndex].balance = freshBalance;
        // Update user context
        StorageService.setCurrentUser(allUsers[myProfileIndex]);
      }

      // Save database adjustments
      StorageService.saveUsers(allUsers);
      StorageService.saveProducts(allProducts);

      // Create rich new historical order logs
      const generatedOrder: Order = {
        id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        date: new Date().toISOString(),
        items: orderItemsList,
        totalAmount: cartSubtotal,
        paymentMethod: paymentMethod === 'balance' ? 'Store credit' : 'Demo card'
      };

      StorageService.addOrder(generatedOrder);

      // Log purchase activities
      orderItemsList.forEach((item) => {
        StorageService.logActivity(
          currentUser.id,
          currentUser.name,
          'buyer',
          'Purchase',
          `Purchased ${item.quantity}x "${item.title}" for a total of $${(item.price * item.quantity).toFixed(2)}.`
        );
      });
      
      // Reset clear Cart
      StorageService.clearCart(currentUser.id);
      setCart([]);

      // Transition checkouts
      setPaymentStep('success');
      onRefreshUser();
    }, 1800); // 1.8s simulation delay for awesome authentic loading spinner feel
  };

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!editName.trim() || !editEmail.trim() || !editUsername.trim()) {
      alert("All fields (except password if unchanged) must be populated.");
      return;
    }

    const allUsers = StorageService.getUsers();
    // Check if other user is using the username
    const usernameCollision = allUsers.find(u => u.username.toLowerCase() === editUsername.trim().toLowerCase() && u.id !== currentUser.id);
    if (usernameCollision) {
      alert("This username is already taken by another portal user.");
      return;
    }

    const myIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (myIndex !== -1) {
      const updatedUser: User = {
        ...allUsers[myIndex],
        name: editName.trim(),
        email: editEmail.trim(),
        username: editUsername.trim(),
      };
      if (editPassword.trim()) {
        updatedUser.password = editPassword.trim();
      }
      allUsers[myIndex] = updatedUser;
      StorageService.saveUsers(allUsers);
      StorageService.setCurrentUser(updatedUser);
      StorageService.logActivity(
        currentUser.id,
        updatedUser.name,
        'buyer',
        'Account Update',
        `Updated personal configuration details.`
      );
      setInfoSuccessMsg("Personal credentials updated successfully!");
      onRefreshUser();
      setTimeout(() => setInfoSuccessMsg(''), 4000);
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newCardNumber.trim() || !newCardholder.trim()) {
      alert("Please provide card details.");
      return;
    }

    // Clean number
    const cleanedNumber = newCardNumber.replace(/\s+/g, '');
    if (cleanedNumber.length < 12) {
      alert("Please enter a valid card number.");
      return;
    }

    const allUsers = StorageService.getUsers();
    const myIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (myIndex !== -1) {
      const existingCards = allUsers[myIndex].bankCards || [];
      const newCard = {
        id: `card-${Math.floor(100000 + Math.random() * 900000)}`,
        cardNumber: cleanedNumber.slice(-4),
        cardholderName: newCardholder.trim(),
        expDate: newCardExp.trim() || '12/29',
        provider: newCardProvider
      };

      const updatedUser: User = {
        ...allUsers[myIndex],
        bankCards: [...existingCards, newCard]
      };

      allUsers[myIndex] = updatedUser;
      StorageService.saveUsers(allUsers);
      StorageService.setCurrentUser(updatedUser);
      StorageService.logActivity(
        currentUser.id,
        currentUser.name,
        'buyer',
        'Add Card',
        `Linked new simulated card: ${newCardProvider.toUpperCase()} ending in *${newCardNumber.slice(-4) || 'XXXX'}.`
      );
      
      setNewCardNumber('');
      setNewCardholder('');
      setNewCardExp('');
      setCardSuccessMsg("Demo card saved. Only the last four digits are kept.");
      onRefreshUser();
      setTimeout(() => setCardSuccessMsg(''), 4000);
    }
  };

  const handleRemoveCard = (cardId: string) => {
    if (!currentUser) return;
    const allUsers = StorageService.getUsers();
    const myIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (myIndex !== -1) {
      const existingCards = allUsers[myIndex].bankCards || [];
      const updatedCards = existingCards.filter(c => c.id !== cardId);

      const removedCard = existingCards.find(c => c.id === cardId);
      const cardDetail = removedCard ? `${removedCard.provider.toUpperCase()} ending in *${removedCard.cardNumber.slice(-4) || 'XXXX'}` : 'simulated card';
      const updatedUser: User = {
        ...allUsers[myIndex],
        bankCards: updatedCards
      };

      allUsers[myIndex] = updatedUser;
      StorageService.saveUsers(allUsers);
      StorageService.setCurrentUser(updatedUser);
      StorageService.logActivity(
        currentUser.id,
        currentUser.name,
        'buyer',
        'Remove Card',
        `Removed linked simulated card detail: ${cardDetail}.`
      );
      onRefreshUser();
    }
  };

  const handleRefund = (orderId: string) => {
    if (!currentUser) return;
    
    // Read the latest state
    const allOrders = StorageService.getOrders();
    const orderIndex = allOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      alert("Order record not found.");
      return;
    }

    const order = allOrders[orderIndex];
    if (order.status === 'refunded') {
      alert("This purchase has already been refunded.");
      return;
    }

    const confirmRefund = window.confirm(`Are you sure you want to request a simulation refund of $${order.totalAmount.toFixed(2)} for this order? Product stock will be returned.`);
    if (!confirmRefund) return;

    // Restore quantities to Catalog
    const allProducts = StorageService.getProducts();
    for (const item of order.items) {
      const prodIndex = allProducts.findIndex(p => p.id === item.productId);
      if (prodIndex !== -1) {
        allProducts[prodIndex].stock += item.quantity;
        // Adjust unitsSold and totalRevenue
        allProducts[prodIndex].unitsSold = Math.max(0, allProducts[prodIndex].unitsSold - item.quantity);
        allProducts[prodIndex].totalRevenue = Math.max(0, allProducts[prodIndex].totalRevenue - (item.price * item.quantity));
      }
    }

    // Terminate order or mark refunded
    allOrders[orderIndex] = {
      ...order,
      status: 'refunded',
      refundedAt: new Date().toISOString()
    };

    // Return money to simulated wallet balance
    const allUsers = StorageService.getUsers();
    const myIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (myIndex !== -1) {
      allUsers[myIndex].balance = (allUsers[myIndex].balance ?? 0) + order.totalAmount;
      StorageService.saveUsers(allUsers);
      StorageService.setCurrentUser(allUsers[myIndex]);
    }

    StorageService.saveProducts(allProducts);
    StorageService.saveOrders(allOrders);
    StorageService.logActivity(
      currentUser.id,
      currentUser.name,
      'buyer',
      'Refund',
      `Requested simulation refund of $${order.totalAmount.toFixed(2)} for transaction ${orderId}.`
    );

    loadData();
    onRefreshUser();
    alert("Simulated transaction refunded! Funds successfully returned to bank balance.");
  };

  return (
    <div id="buyer-panel-root" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300 text-neutral-900 font-sans">
      
      {/* Decorative Blueprint Header Banner */}
      <div className="w-full h-1 bg-neutral-950 mb-4 stripe-accent"></div>

      {activeTab === 'catalog' ? (
        <div>
          {/* Category selector row */}
      <div className="flex items-center justify-between border-b-2 border-neutral-900 pb-4 mb-8">
        <div className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap scrollbar-none pr-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-none text-xs font-mono font-bold uppercase tracking-wider border transition ${
                selectedCategory === cat 
                  ? 'bg-neutral-900 text-white border-neutral-900' 
                  : 'bg-white text-neutral-500 border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Floating Cart Button Trigger */}
        <button
          id="cart-drawer-trigger-btn"
          onClick={() => setShowCartDrawer(true)}
          className="relative px-4 py-2 bg-[#FAF9F6] hover:bg-[#EAE6DF] text-neutral-950 font-mono font-bold text-xs rounded-none border-2 border-neutral-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition flex items-center gap-2"
        >
          <ShoppingCart className="w-4 h-4 text-neutral-900" />
          <span className="uppercase tracking-wider">My Cart</span>
          <span className="px-2 py-0.5 rounded-none bg-neutral-900 text-neutral-50 text-[10px] font-mono font-bold leading-none shrink-0">
            {totalCartItems}
          </span>
        </button>
      </div>

      <div className="w-full">
        
        {/* Full-width catalog browse & search */}
        <section className="space-y-6">
          
          {/* Marketplace header and search */}
          <div className="bg-[#EAE6DF] border-2 border-neutral-900 rounded-none p-8 text-neutral-900 relative overflow-hidden select-none">
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-neutral-950 text-white px-2.5 py-1 rounded-none text-[9px] font-mono uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> High-End Modern Marketplace
              </span>
              <h2 className="text-3xl font-serif font-black tracking-tight leading-tight text-neutral-950 max-w-xl">
                Discover Selected Design & Modern Artifacts
              </h2>
              
              {/* Dynamic search bar */}
              <div className="relative max-w-lg mt-3">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Search className="w-5 h-5 text-neutral-400" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH THE NEXUS CATALOG..."
                  className="w-full pl-11 pr-4 py-3 rounded-none bg-white text-neutral-900 text-xs font-mono tracking-wider focus:outline-none focus:bg-[#FAF9F6] border border-neutral-900 placeholder-neutral-400"
                />
              </div>
            </div>
          </div>

          {/* Product Items Display Section */}
          <div>
            <h3 className="text-sm font-serif font-black text-neutral-950 mb-7 flex items-center justify-between uppercase tracking-wider">
              <span>Selected Catalog ({filteredProducts.length} items)</span>
              <Layers className="w-4 h-4 text-neutral-500 font-normal" />
            </h3>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-[#FAF9F6] border-2 border-neutral-900 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <ShoppingBag className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm font-serif font-black uppercase text-neutral-900">No products matched query</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mt-1">Try expanding category requirements or updating search keywords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((p) => {
                  const isSoldOut = p.stock === 0;
                  return (
                    <div 
                      key={p.id} 
                      className="bg-[#FAF9F6] border-2 border-neutral-900 rounded-none overflow-hidden hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] animate-in fade-in zoom-in-95 duration-200"
                    >
                      {/* Image Block */}
                      <div className="relative h-48 bg-[#EAE6DF] overflow-hidden cursor-pointer border-b-2 border-neutral-900 flex items-center justify-center bg-blueprint" onClick={() => setSelectedProduct(p)}>
                        <img 
                          src={p.imageUrl} 
                          alt={p.title} 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-350 pointer-events-none"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80";
                          }}
                        />
                        <span className="absolute top-3 left-3 bg-[#FAF9F6] text-neutral-950 border border-neutral-900 px-2 rounded-none text-[8px] font-mono font-black uppercase tracking-widest">
                          {p.category}
                        </span>

                        {isSoldOut && (
                          <div className="absolute inset-0 bg-neutral-900/85 backdrop-blur-[1px] flex items-center justify-center font-mono font-black text-white text-xs tracking-widest">
                            OUT OF STOCK
                          </div>
                        )}
                      </div>

                      {/* Content block */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-neutral-400 font-bold font-mono tracking-widest block uppercase">🏪 Store • {p.sellerName}</span>
                          <h4 
                            onClick={() => setSelectedProduct(p)}
                            className="text-sm font-serif font-black text-neutral-950 group-hover:underline cursor-pointer transition truncate leading-snug block uppercase"
                          >
                            {p.title}
                          </h4>
                          <p className="text-[11px] text-neutral-500 font-mono tracking-normal leading-relaxed line-clamp-2">{p.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-3 border-t border-neutral-300">
                          <span className="text-sm font-black text-neutral-950 font-mono">${p.price.toFixed(2)}</span>
                          
                          <button
                            id={`add-cart-btn-${p.id}`}
                            onClick={() => handleAddToCart(p, 1)}
                            disabled={isSoldOut}
                            className={`px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-none transition flex items-center gap-1 ${
                              isSoldOut 
                                ? 'bg-[#EAE6DF] text-neutral-400 cursor-not-allowed border border-neutral-300'
                                : 'bg-white hover:bg-neutral-900 hover:text-white text-neutral-950 border border-neutral-900'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Basket
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>

      </div>
    </div>
  ) : (
    /* Render beautiful dedicated Member Profile Page with Wallet and History */
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Top Banner Row: Profile information and Simulated Credit Balance side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* Component 1: Premium Member Record */}
        <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col justify-between">
          <div>
            <span className="text-[9px] bg-neutral-950 text-white px-2 py-0.5 font-mono uppercase tracking-widest inline-block mb-4 leading-none select-none">
              SECURITY CREDENTIAL RECORD
            </span>
            
            <div className="flex items-start gap-4">
              {/* Visual Portrait Silhouette wrapper */}
              <div className="w-16 h-16 bg-[#EAE6DF] border-2 border-neutral-950 flex items-center justify-center font-serif text-3xl font-black text-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] select-none shrink-0 bg-blueprint">
                {currentUser ? currentUser.name.charAt(0).toUpperCase() : "G"}
              </div>
              
              <div className="space-y-1">
                <h3 className="font-serif font-black text-xl text-neutral-950 uppercase tracking-tight">
                  {currentUser ? currentUser.name : "Guest Session"}
                </h3>
                <div className="inline-block bg-neutral-900 text-neutral-50 font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest leading-none select-none">
                  {currentUser ? `ROLE • ${currentUser.role}` : "READ-ONLY GUEST"}
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-300 pt-4 mt-6 space-y-2.5 font-mono text-xs text-neutral-700">
              <div className="flex justify-between">
                <span className="text-neutral-400 uppercase">USERNAME:</span>
                <span className="font-bold text-neutral-950">{currentUser ? currentUser.username : "guest_browsing"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 uppercase">MEMBER E-MAIL:</span>
                <span className="font-bold text-neutral-950 truncate max-w-[180px]">{currentUser ? currentUser.email : "none@public_nexus.com"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 uppercase">COMMERCIAL STATUS:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> SECURE INTEGRATED
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 uppercase">MEMBER SINCE:</span>
                <span className="font-bold text-neutral-950 font-mono">
                  {currentUser ? new Date(currentUser.createdAt || "").toLocaleDateString() : "JUNE 2026"}
                </span>
              </div>
            </div>
          </div>

          {!currentUser && (
            <div className="pt-3 border-t border-neutral-300 mt-4">
              <button
                onClick={onSignInPrompt}
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-[#FAF9F6] border-2 border-neutral-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono text-[10px] uppercase font-black tracking-widest transition cursor-pointer"
              >
                Authenticate Member Profile
              </button>
            </div>
          )}
        </div>

        {/* Component 2: Simulated Ledger Balance */}
        <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-serif font-black text-base text-neutral-950 flex items-center gap-2 border-b border-neutral-300 pb-3 uppercase tracking-wider">
              <Coins className="w-5 h-5 text-neutral-950" />
              Simulated Credit Ledger Balance
            </h3>
            <p className="text-xs text-neutral-500 font-mono leading-relaxed uppercase tracking-normal">
              Authorize test funds to satisfy immediate marketplace buy acquisitions. Purchases will dynamically record corresponding invoice logs in real-time.
            </p>
          </div>

          {currentUser ? (
            <div className="p-5 mt-6 bg-[#EAE6DF] rounded-none border-2 border-neutral-950 flex flex-col sm:flex-row items-center justify-between bg-blueprint gap-4">
              <div>
                <span className="text-[9px] text-neutral-500 font-mono font-bold uppercase tracking-widest block">Available Balance</span>
                <span className="text-2xl font-serif font-black text-neutral-950 mt-1 block">${(currentUser.balance ?? 0).toFixed(2)}</span>
              </div>
              <button
                id="replenish-wallet-btn"
                onClick={() => setIsAddFundsModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-mono font-bold text-[10px] tracking-widest uppercase rounded-none border border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] transition cursor-pointer"
              >
                + Add Simulation Funds
              </button>
            </div>
          ) : (
            <div className="p-6 bg-neutral-100 rounded-none border border-dashed border-neutral-300 text-center space-y-3 mt-6">
              <p className="text-[10px] font-mono font-bold text-neutral-450 uppercase tracking-widest">Simulated Wallet is currently locked</p>
              <p className="text-[10px] font-mono text-neutral-450 uppercase tracking-wide leading-relaxed">Sign in to initialize your balance and complete instant credit checkout simulations.</p>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Row Layout: Settings/Cards Stack on Left, Receipt Roll on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Account Settings Form & Manage Cards stack */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          
          {/* Component 3: Account Information Editor */}
          {currentUser && (
            <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] space-y-6 animate-in fade-in duration-200">
              <h3 className="font-serif font-black text-base text-neutral-950 flex items-center gap-2 border-b border-neutral-300 pb-3 uppercase tracking-wider">
                <UserIcon className="w-5 h-5 text-neutral-950" />
                Update Credentials
              </h3>

              {infoSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500 text-emerald-800 text-[10px] font-mono uppercase font-black tracking-widest animate-pulse leading-relaxed">
                  {infoSuccessMsg}
                </div>
              )}

              <form onSubmit={handleUpdateInfo} className="space-y-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="text-neutral-400 uppercase block font-bold text-[9px] tracking-widest">Display Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-900 rounded-none focus:outline-none focus:bg-[#EAE6DF]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-400 uppercase block font-bold text-[9px] tracking-widest">E-Mail Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-900 rounded-none focus:outline-none focus:bg-[#EAE6DF]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-400 uppercase block font-bold text-[9px] tracking-widest">Username Handle</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-900 rounded-none focus:outline-none focus:bg-[#EAE6DF]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-400 uppercase block font-bold text-[9px] tracking-widest">New Security Password (or leave blank)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2.5 bg-white border border-neutral-900 rounded-none focus:outline-none focus:bg-[#EAE6DF] placeholder-neutral-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[10px] uppercase font-black tracking-widest rounded-none border border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer"
                >
                  Apply Profile Changes
                </button>
              </form>
            </div>
          )}

          {/* Component 4: Linked Payment Bank Cards */}
          {currentUser && (
            <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] space-y-6 animate-in fade-in duration-200">
              <h3 className="font-serif font-black text-base text-neutral-950 flex items-center gap-2 border-b border-neutral-300 pb-3 uppercase tracking-wider">
                <CreditCard className="w-5 h-5 text-neutral-950" />
                Manage Linked Cards
              </h3>

              {/* List Linked Cards */}
              <div className="space-y-3.5">
                <label className="text-neutral-400 block uppercase font-bold text-[9px] tracking-widest">Saved demo cards</label>
                
                {!currentUser.bankCards || currentUser.bankCards.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-neutral-300 text-center text-neutral-400 font-mono text-[10px] uppercase tracking-wider bg-white/50 leading-relaxed">
                    No demo cards saved. These are not charged and are not sent to a bank.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentUser.bankCards.map((card) => {
                      const cleanNum = card.cardNumber.replace(/\s+/g, '');
                      const last4 = cleanNum.slice(-4) || '4444';
                      return (
                        <div key={card.id} className="relative p-4 bg-neutral-900 text-[#FAF9F6] border-2 border-neutral-950 rounded-none shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] font-mono text-xs flex justify-between items-center overflow-hidden bg-blueprint">
                          <div className="space-y-1 z-10">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-white text-neutral-900 px-1.5 py-0.5 rounded-none leading-none select-none">
                                {card.provider.toUpperCase()}
                              </span>
                              <span className="font-bold">•••• •••• •••• {last4}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 uppercase tracking-widest flex items-center gap-3 mt-1.5 font-bold">
                              <span>EXP: {card.expDate}</span>
                              <span className="truncate max-w-[160px]">{card.cardholderName || 'MEMBER'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveCard(card.id)}
                            className="text-red-500 hover:text-white p-2 border border-red-500/20 hover:bg-neutral-800 transition rounded-none z-10 cursor-pointer"
                            title="Remove unlink card"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Link New Card Form */}
              <form onSubmit={handleAddCard} className="space-y-4 border-t border-neutral-300 pt-5 text-xs font-mono">
                <span className="text-neutral-950 uppercase block font-black text-[10px] tracking-wider">Add a demo card</span>

                {cardSuccessMsg && (
                  <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500 text-emerald-800 text-[10px] font-mono uppercase font-black tracking-widest animate-pulse">
                    {cardSuccessMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-neutral-400 uppercase block font-bold text-[9px] tracking-widest">Card Issuer Provider</label>
                    <select
                      value={newCardProvider}
                      onChange={(e) => setNewCardProvider(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-white border border-neutral-900 rounded-none focus:outline-none"
                    >
                      <option value="visa">Visa Payment System</option>
                      <option value="mastercard">Mastercard Worldwide</option>
                      <option value="amex">American Express</option>
                      <option value="discover">Discover Card</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-neutral-400 uppercase block font-bold text-[9px] tracking-widest">Card number</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={19}
                        value={newCardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d\s]/g, '');
                          setNewCardNumber(val);
                        }}
                        placeholder="4111 2222 3333 4444"
                        className="w-full pl-3 pr-16 py-2.5 bg-white border border-neutral-900 rounded-none focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const num = `4532 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
                          setNewCardNumber(num);
                        }}
                        className="absolute right-2 top-1.5 bg-neutral-100 hover:bg-neutral-900 hover:text-[#FAF9F6] border border-neutral-900 px-2 py-1 text-[8px] uppercase tracking-widest font-black transition cursor-pointer"
                      >
                        Fill Demo
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-neutral-400 uppercase block font-bold text-[9px] tracking-widest">Name on card</label>
                    <input
                      type="text"
                      value={newCardholder}
                      onChange={(e) => setNewCardholder(e.target.value.toUpperCase())}
                      placeholder="MEMBER SURNAME"
                      className="w-full px-3 py-2.5 bg-white border border-neutral-900 rounded-none focus:outline-none placeholder-neutral-300"
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-neutral-400 uppercase block font-bold text-[9px] tracking-widest">Expiration</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={newCardExp}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^\d/]/g, '');
                        if (val.length === 2 && !val.includes('/')) {
                          val = val + '/';
                        }
                        setNewCardExp(val);
                      }}
                      placeholder="12/29"
                      className="w-full px-3 py-2.5 bg-white border border-neutral-900 rounded-none focus:outline-none placeholder-neutral-300"
                      required
                    />
                  </div>

                </div>

                <button
                  type="submit"
                  className="w-full mt-2.5 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[10px] uppercase font-black tracking-widest rounded-none border border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer"
                >
                  Save demo card
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Right Column: Receipt Invoice History Roll */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="bg-[#FAF9F6] border-2 border-neutral-900 p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] space-y-6">
            <div className="border-b border-neutral-300 pb-4 flex items-center justify-between col-span-12 sm:flex-row flex-col gap-2 align-center">
              <div>
                <h3 className="font-serif font-black text-base text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-5 h-5 text-neutral-900" />
                  Simulated Receipt History
                </h3>
                <p className="text-[10px] font-mono text-neutral-400 uppercase mt-1 tracking-wider">
                  Official digital vouchers issued by Nexus Escrows
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-neutral-900 text-white px-2.5 py-1 select-none">
                TOTAL RECORDS: {currentUser ? pastOrders.length : 0}
              </span>
            </div>

            <div className="space-y-4 max-h-[880px] overflow-y-auto pr-1">
              {!currentUser ? (
                <div className="text-center py-20 bg-neutral-100/55 border border-dashed border-neutral-300 text-neutral-450">
                  <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">Member Session Required</p>
                  <p className="text-[10px] text-neutral-400 font-mono mt-1.5 max-w-[280px] mx-auto uppercase tracking-wide leading-relaxed">
                    Please validate your profile records above. Purchase rolls are securely stored inside active accounts.
                  </p>
                </div>
              ) : pastOrders.length === 0 ? (
                <div className="text-center py-20 bg-neutral-50 border border-dashed border-neutral-300">
                  <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#1a1a1a]">No transactions recorded</p>
                  <p className="text-[10px] text-neutral-400 font-mono mt-1 max-w-[240px] mx-auto uppercase tracking-wider leading-relaxed">
                    Browse the catalogue, add design objects to your basket, and pay to register invoice vouchers!
                  </p>
                </div>
              ) : (
                pastOrders.map((ord) => (
                  <div key={ord.id} className="border border-neutral-900 p-5 rounded-none bg-white space-y-4 relative overflow-hidden bg-blueprint animate-in fade-in duration-250">
                    
                    {/* Decorative invoice header dots */}
                    <div className="flex justify-between items-center pb-3 border-b border-dashed border-neutral-300">
                      <div>
                        <span className="text-xs font-mono font-black text-neutral-950 uppercase tracking-widest block font-bold">NEXUS ORDER INVOICE #{ord.id}</span>
                        <span className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider block mt-0.5 font-bold">TRANSACTIONED • {new Date(ord.date).toLocaleString()}</span>
                      </div>
                      {ord.status === 'refunded' ? (
                        <span className="text-[9px] bg-red-100 border-2 border-red-650 text-red-700 font-mono font-black px-2.5 py-1 tracking-wider uppercase inline-block select-none transform rotate-1">
                          VOIDED / REFUNDED
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-100 border border-emerald-400 text-emerald-800 font-mono font-bold px-2 py-0.5 tracking-wider uppercase inline-block select-none transform rotate-2">
                          PAID IN FULL
                        </span>
                      )}
                    </div>

                    {/* Purchased products item block */}
                    <div className="space-y-3">
                      {ord.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3.5 text-xs font-mono text-neutral-805 uppercase tracking-wide">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-10 h-10 rounded-none border border-neutral-300 object-cover shrink-0 bg-blueprint" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80";
                            }}
                          />
                          <div className="flex-1">
                            <span className={`${ord.status === 'refunded' ? 'line-through text-neutral-400' : 'font-bold text-neutral-900'} line-clamp-1`}>{item.title}</span>
                            <span className="text-[9px] text-neutral-400 tracking-wider">UNIT VALUE: ${item.price.toFixed(2)}</span>
                          </div>
                          <span className="text-neutral-400 font-mono shrink-0">QTY x{item.quantity}</span>
                          <span className={`font-bold shrink-0 ${ord.status === 'refunded' ? 'line-through text-neutral-400' : 'text-neutral-950'}`}>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total details summary */}
                    <div className="border-t border-dashed border-neutral-300 pt-3 flex justify-between items-end text-xs font-mono">
                      <div className="space-y-0.5 text-neutral-400 text-[10px] uppercase font-bold">
                        <p>PAY METHOD: {ord.paymentMethod}</p>
                        <p>DELIVERY: DIGITAL SYSTEM FULFILLMENT</p>
                        {ord.status === 'refunded' && ord.refundedAt && (
                          <p className="text-red-500 font-black tracking-widest mt-0.5 font-bold">● REFUND PROCESSED AT {new Date(ord.refundedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        {ord.status !== 'refunded' && (
                          <button
                            onClick={() => handleRefund(ord.id)}
                            className="px-2.5 py-1 text-[9px] font-mono tracking-widest font-black uppercase text-red-600 bg-red-50 hover:bg-neutral-990 hover:text-[#FAF9F6] border-2 border-red-500 transition rounded-none cursor-pointer shadow-[2px_2px_0px_0px_rgba(220,38,38,0.15)]"
                          >
                            Request Refund
                          </button>
                        )}
                        <div>
                          <span className="text-[9px] text-neutral-400 block uppercase font-mono">TOTAL FUNDS TRANSFERRED</span>
                          <span className={`text-sm font-black font-mono ${ord.status === 'refunded' ? 'line-through text-neutral-400' : 'text-neutral-950'}`}>
                            ${ord.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
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

      {/* ================= SLIDING SHOPPING CART DRAWER ================= */}
      {showCartDrawer && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#FAF9F6] max-w-md w-full h-full shadow-none relative flex flex-col justify-between border-l-2 border-neutral-900 animate-in slide-in-from-right duration-250">
            
            {/* Drawer Header */}
            <div className="p-5 border-b-2 border-neutral-900 flex justify-between items-center bg-[#EAE6DF]">
              <h3 className="font-serif font-black text-sm text-neutral-900 flex items-center gap-2 uppercase tracking-wider">
                <ShoppingCart className="w-5 h-5 text-neutral-900" />
                Shopping Basket ({totalCartItems})
              </h3>
              <button 
                id="close-cart-drawer-btn"
                onClick={() => setShowCartDrawer(false)}
                className="px-3 py-1 bg-white hover:bg-neutral-900 hover:text-white text-neutral-900 font-mono text-[10px] uppercase tracking-widest border border-neutral-900 rounded-none transition"
              >
                Close
              </button>
            </div>

            {/* Cart Items listing */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-24 text-neutral-450 select-none">
                  <ShoppingCart className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm font-serif font-black uppercase text-neutral-900">Your basket is empty</p>
                  <p className="text-[10px] text-neutral-450 font-mono uppercase tracking-wider mt-2 max-w-[220px] mx-auto leading-relaxed">Explore the catalog and add products into your shopping cart list.</p>
                </div>
              ) : (
                cart.map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;
                  return (
                    <div key={item.productId} className="flex gap-4 p-3 rounded-none border border-neutral-300 bg-white hover:bg-neutral-50/50 transition">
                      <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="w-16 h-16 rounded-none object-cover shrink-0 border border-neutral-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80";
                        }}
                      />
                      
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-serif font-black text-neutral-900 line-clamp-1 uppercase">{product.title}</h4>
                          <p className="text-[10px] text-neutral-450 font-mono mt-0.5">${product.price.toFixed(2)} each</p>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity Selector controls */}
                          <div className="flex items-center space-x-1.5 bg-white border border-neutral-900 rounded-none p-0.5 shrink-0">
                            <button
                              id={`decrease-qty-btn-${product.id}`}
                              onClick={() => handleUpdateQuantity(item.productId, -1)}
                              className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-none"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold font-mono px-2 text-neutral-900">{item.quantity}</span>
                            <button
                              id={`increase-qty-btn-${product.id}`}
                              onClick={() => handleUpdateQuantity(item.productId, 1)}
                              className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-none"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            id={`remove-cart-item-btn-${product.id}`}
                            onClick={() => handleRemoveFromCart(item.productId)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent hover:border-neutral-900 rounded-none transition"
                            title="Remove Product"
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

            {/* Footer Summary Checkout triggers */}
            <div className="p-5 border-t-2 border-neutral-900 bg-[#EAE6DF] space-y-4">
              <div className="flex justify-between text-xs font-mono font-bold text-neutral-800 tracking-wider">
                <span>ESTIMATED TOTAL:</span>
                <span className="text-base font-black font-mono text-neutral-950">${cartSubtotal.toFixed(2)}</span>
              </div>
              
              <button
                id="checkout-main-btn"
                onClick={handleLaunchCheckout}
                disabled={cart.length === 0}
                className={`w-full py-3 text-white font-mono font-bold rounded-none text-xs uppercase tracking-widest flex items-center justify-center gap-1 border-2 border-neutral-900 transition ${
                  cart.length === 0
                    ? 'bg-neutral-400 text-neutral-500 border-neutral-400 cursor-not-allowed'
                    : 'bg-neutral-900 hover:bg-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5'
                }`}
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= CHECKOUT MODAL: VIRTUAL PAYMENT PROCESSOR ================= */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] rounded-none border-2 border-neutral-900 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Payment header */}
            <div className="p-5 border-b-2 border-neutral-900 flex justify-between items-center bg-[#EAE6DF]">
              <h3 className="font-serif font-black text-sm text-neutral-900 flex items-center gap-1.5 uppercase tracking-wider">
                <CreditCard className="w-5 h-5 text-neutral-900" />
                Nexus Virtual Checkout
              </h3>
              {paymentStep !== 'processing' && (
                <button 
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-[#FAF9F6] border border-transparent hover:border-neutral-900 rounded-none transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Payment Steps content */}
            <div className="p-6">
              
              {checkoutError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-neutral-900 text-rose-805 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-serif font-black uppercase block">Checkout Overdraft:</span>
                    <span className="text-[10.5px] font-mono leading-normal block mt-1">{checkoutError}</span>
                  </div>
                </div>
              )}

              {paymentStep === 'details' && (
                /* STEP 1: CHOOSE PAYMENT METHOD */
                <form onSubmit={handleProcessSimulatedPayment} className="space-y-4">
                  <div className="p-4 bg-[#EAE6DF] rounded-none border border-neutral-900 font-mono">
                    <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">ORDER LEDGER SUMMARY</p>
                    <p className="text-2xl font-black text-neutral-950 mt-1 font-mono">${cartSubtotal.toFixed(2)}</p>
                    <p className="text-[9px] text-neutral-450 mt-1 uppercase tracking-wider">Total items in catalog basket: {totalCartItems} Units</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <label className="block font-mono font-bold text-neutral-500 uppercase tracking-widest text-[9px]">Select Settlement System:</label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('balance')}
                        className={`p-3.5 rounded-none border text-left flex flex-col justify-between transition h-24 ${
                          paymentMethod === 'balance'
                            ? 'border-2 border-neutral-900 bg-[#EAE6DF]'
                            : 'border-neutral-300 bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <Coins className={`w-5 h-5 ${paymentMethod === 'balance' ? 'text-neutral-950' : 'text-neutral-400'}`} />
                        <div>
                          <p className="font-serif font-black uppercase text-[11px] text-neutral-950">Virtual Balance</p>
                          <p className="text-[10px] font-mono text-neutral-450 mt-0.5">${(currentUser.balance ?? 0).toFixed(2)}</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-3.5 rounded-none border text-left flex flex-col justify-between transition h-24 ${
                          paymentMethod === 'card'
                            ? 'border-2 border-neutral-900 bg-[#EAE6DF]'
                            : 'border-neutral-300 bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-neutral-950' : 'text-neutral-400'}`} />
                        <div>
                          <p className="font-serif font-black uppercase text-[11px] text-neutral-950">Visa Simulator</p>
                          <p className="text-[10px] font-mono text-neutral-450 mt-0.5">Mock card token</p>
                        </div>
                      </button>
                    </div>

                    {paymentMethod === 'card' && (
                      <div className="bg-neutral-900 text-[#FAF9F6] rounded-none p-4.5 space-y-4 shadow-none mt-2 font-mono border-2 border-neutral-950">
                        <div className="flex justify-between items-center text-[9px] tracking-widest opacity-75">
                          <span>NEXUS INTEGRATION SYSTEM</span>
                          <CreditCard className="w-5 h-5 text-neutral-300" />
                        </div>
                        <input
                          type="text"
                          required
                          value={simulatedCardNumber}
                          onChange={(e) => setSimulatedCardNumber(e.target.value)}
                          placeholder="Card details"
                          className="w-full bg-transparent focus:outline-none text-sm border-b border-white/20 pb-1 text-white tracking-widest font-black"
                        />
                        <div className="flex justify-between items-center text-[9px]">
                          <div>
                            <p className="opacity-50">CARDHOLDER</p>
                            <input
                              type="text"
                              required
                              value={simulatedCardName}
                              onChange={(e) => setSimulatedCardName(e.target.value)}
                              className="bg-transparent focus:outline-none text-[10px] font-bold text-white uppercase mt-0.5 border-b border-transparent focus:border-white/20"
                            />
                          </div>
                          <div>
                            <p className="opacity-50 text-right">EXPIRES</p>
                            <p className="font-bold mt-0.5">12 / 2030</p>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-mono font-bold uppercase tracking-widest transition !mt-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-neutral-950"
                  >
                    Place demo order
                  </button>
                </form>
              )}

              {paymentStep === 'processing' && (
                /* STEP 2: LOADING SIMULATION */
                <div className="text-center py-10 space-y-4">
                  <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-950 rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm font-serif font-black uppercase text-neutral-900 tracking-wider">Processing virtual transaction...</p>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wide">Syncing double-entry logs and decrementing inventory layers safely...</p>
                </div>
              )}

              {paymentStep === 'success' && (
                /* STEP 3: SUCCESS FEEDBACK */
                <div className="text-center py-10 space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-[#EAE6DF] rounded-none border-2 border-neutral-900 flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <CheckCircle className="w-10 h-10 text-neutral-900" />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-base font-serif font-black uppercase text-neutral-950 tracking-tight">Payment Completed successfully!</h4>
                    <p className="text-xs font-mono text-emerald-800 font-bold uppercase tracking-widest">Store credit applied</p>
                  </div>

                  <p className="text-[11px] font-mono text-neutral-500 max-w-xs mx-auto leading-relaxed uppercase tracking-wider">
                    Inventory logs updated, transaction histories written, and double-entry ledger published.
                  </p>

                  <button
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-[#FAF9F6] border-2 border-neutral-950 text-xs font-mono uppercase tracking-widest rounded-none transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Close Receipt
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ================= WALLET TOP UP MODAL ================= */}
      {isAddFundsModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] rounded-none border-2 border-neutral-900 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] max-w-xs w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b-2 border-neutral-900 flex justify-between items-center bg-[#EAE6DF]">
              <h3 className="font-serif font-black text-sm text-neutral-900 flex items-center gap-1 uppercase tracking-wider">
                <Coins className="w-4.5 h-4.5 text-neutral-900" />
                Add store credit
              </h3>
              <button 
                onClick={() => setIsAddFundsModalOpen(false)}
                className="p-1 px-2.5 bg-white border border-neutral-900 font-mono text-[9px] uppercase tracking-widest text-[#1A1A1A]"
              >
                X
              </button>
            </div>

            <form onSubmit={handleAddFundsSubmit} className="p-6 space-y-4">
              <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wide leading-relaxed">
                Add demo store credit. Nothing is charged to a real card or bank account.
              </p>

              <div>
                <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1">Deposit amount (USD)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10000"
                  value={fundsToAdd}
                  onChange={(e) => setFundsToAdd(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm rounded-none border-2 border-neutral-900 text-neutral-900 bg-white focus:bg-[#FAF9F6] font-bold font-mono focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-mono font-bold uppercase tracking-widest transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Add credit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRODUCT DETAILED MODAL VIEWER ================= */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] rounded-none border-2 border-neutral-900 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header image preview */}
            <div className="relative h-64 bg-[#EAE6DF] border-b-2 border-neutral-900">
              <img 
                src={selectedProduct.imageUrl} 
                alt={selectedProduct.title} 
                className="w-full h-full object-cover grayscale"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80";
                }}
              />
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 bg-[#FAF9F6] hover:bg-[#EAE6DF] text-neutral-950 border-2 border-neutral-900 rounded-none transition"
              >
                <X className="w-5 h-5 text-neutral-900" />
              </button>
              
              <span className="absolute bottom-4 left-4 bg-[#FAF9F6] border border-neutral-900 px-3 py-1 rounded-none text-[9px] font-black font-mono uppercase tracking-widest text-[#1A1A1A]">
                {selectedProduct.category}
              </span>
            </div>

            {/* Info contents */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <p className="text-[9px] text-neutral-450 font-bold uppercase tracking-widest flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-neutral-500" />
                  Listing Merchant: <span className="text-neutral-900 font-bold underline">{selectedProduct.sellerName}</span>
                </p>
                <h3 className="text-lg font-serif font-black text-[#1A1A1A] uppercase tracking-wide leading-snug">{selectedProduct.title}</h3>
                <p className="text-xs font-mono text-neutral-500 leading-relaxed">{selectedProduct.description}</p>
              </div>

              {/* Stats parameters */}
              <div className="grid grid-cols-2 gap-4 py-4 pr-1.5 border-t border-b border-neutral-300 text-xs">
                <div>
                  <p className="text-neutral-450 uppercase tracking-widest font-mono font-bold text-[8.5px]">Unit price</p>
                  <p className="text-base font-black text-neutral-950 tracking-tight font-mono">${selectedProduct.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-neutral-450 uppercase tracking-widest font-mono font-bold text-[8.5px]">Inventory status</p>
                  <p className={`text-xs font-mono font-bold mt-1 uppercase tracking-wider ${selectedProduct.stock === 0 ? 'text-red-750 font-black' : 'text-neutral-800'}`}>
                    {selectedProduct.stock === 0 ? 'OUT OF STOCK' : `${selectedProduct.stock} units legacy stock`}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  id={`detail-add-cart-btn-${selectedProduct.id}`}
                  onClick={() => {
                    handleAddToCart(selectedProduct, 1);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock === 0}
                  className={`flex-1 py-3 text-white font-mono font-bold rounded-none text-xs flex items-center justify-center gap-1 border-2 border-neutral-900 transition outline-none ${
                    selectedProduct.stock === 0
                      ? 'bg-[#EAE6DF] text-neutral-450 border-neutral-300 cursor-not-allowed'
                      : 'bg-neutral-900 hover:bg-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  Add To Basket
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-5 py-3 bg-white hover:bg-neutral-100 text-neutral-500 border border-neutral-400 font-mono tracking-widest uppercase text-[10px] rounded-none transition"
                >
                  Close View
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
