import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { StorageService } from '../lib/storage';
import { User, Product, CartItem, Order, OrderItem } from '../types';

interface AIAgentChatProps {
  currentUser: User | null;
  onRefreshUser: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionsPerformed?: Array<{
    type: string;
    details: string;
    success: boolean;
  }>;
  productsList?: Product[]; // For rendering interactive products directly inside chat
}

export default function AIAgentChat({ currentUser, onRefreshUser }: AIAgentChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiMode, setApiMode] = useState<'online' | 'offline' | 'error' | null>(null);
  const [aiEngine, setAiEngine] = useState<'qwen' | 'gemini' | 'offline' | 'error' | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with cart drawer state changes to dynamically shift positions and avoid collision
  useEffect(() => {
    const handleCartDrawerState = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.open === 'boolean') {
        setIsCartOpen(customEvent.detail.open);
      }
    };
    window.addEventListener('nexus-cart-drawer-state-change', handleCartDrawerState);
    return () => {
      window.removeEventListener('nexus-cart-drawer-state-change', handleCartDrawerState);
    };
  }, []);

  // Probe API mode on mount
  useEffect(() => {
    const checkMode = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          setApiMode(data.ai === 'online' ? 'online' : 'offline');
          setAiEngine(data.engine || 'offline');
        } else {
          setApiMode('offline');
          setAiEngine('offline');
        }
      } catch (err) {
        console.warn("Could not retrieve AI mode on mount, defaulting to offline:", err);
        setApiMode('offline');
        setAiEngine('offline');
      }
    };
    checkMode();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Insert initial greeting when chat opens or user session changes
  // Reset message history to match the new user profile, removing stale guest messages
  useEffect(() => {
    setMessages([
      {
        id: 'welcome-' + (currentUser?.id || 'guest') + '-' + Date.now(),
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [currentUser?.id]);

  const getWelcomeMessage = () => {
    if (!currentUser) {
      return "Hello! I am your Nexus Intelligent AI Companion. Please sign in to enjoy personalized features. For now, I can help you search the catalog or answer basic questions.";
    }
    if (currentUser.role === 'buyer') {
      return `Welcome back, ${currentUser.name}! I am your AI Shopping Assistant. I can help you search the product catalog, manage your cart, set delivery addresses, and complete checkout. How can I help you shop today?`;
    }
    if (currentUser.role === 'seller') {
      return `Hello, ${currentUser.name}! I am your AI Business Advisor. I can help you list new products, unlist stock, edit product descriptions, and analyze your sales and revenue statistics. Let me know what we should work on!`;
    }
    if (currentUser.role === 'admin') {
      return `System authorized: Administrator Mode. I can help you manage user profiles, reset passwords, change user status (active/disabled), and block or delete inappropriate product listings. Enter administrative commands.`;
    }
    return "Hello! How can I assist you inside the Nexus marketplace?";
  };

  const getSuggestions = () => {
    if (!currentUser) {
      return [
        "Search for watches",
        "List all crafts",
        "What products are in high stock?"
      ];
    }
    if (currentUser.role === 'buyer') {
      return [
        "Find high-fidelity headphones",
        "Add the Minimalist Leather Watch to my cart",
        "Increase watch quantity by 2",
        "Set delivery address to 456 Walnut Avenue",
        "Show my current cart",
        "Checkout my cart items"
      ];
    }
    if (currentUser.role === 'seller') {
      return [
        "List a product: Retro Walnut Desk Clock, handcrafted solid walnut frame with dynamic movement, price: 59.99, stock: 15, category: Aesthetic Crafts",
        "Modify product description of p-2 to: New active noise cancelling studio headset",
        "Unlist/delete product p-1",
        "Calculate my sales stats & total revenue"
      ];
    }
    if (currentUser.role === 'admin') {
      return [
        "Reset password of alex_buyer to adminPass123",
        "Disable user jane_shopper",
        "Enable user jane_shopper",
        "Block invalid product p-4",
        "Show all registered users"
      ];
    }
    return [];
  };

  // Run database/state action locally on the client's LocalStorage state
  const executeLocalAction = (action: { type: string; payload: any }): { success: boolean; details: string; productsResult?: Product[] } => {
    try {
      const allProducts = StorageService.getProducts();
      const allUsers = StorageService.getUsers();

      switch (action.type) {
        case 'SEARCH_PRODUCTS': {
          const q = (action.payload?.query || '').toLowerCase();
          // Dispatch custom event to trigger filter update on the main buyer panel in real-time
          window.dispatchEvent(new CustomEvent('nexus-search', { detail: { query: action.payload?.query } }));
          
          const found = allProducts.filter(p => 
            p.title.toLowerCase().includes(q) || 
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
          return {
            success: true,
            details: `Searched for "${action.payload?.query}" and found ${found.length} matching products.`,
            productsResult: found
          };
        }

        case 'FILTER_CATEGORY': {
          const category = action.payload?.category || 'All';
          window.dispatchEvent(new CustomEvent('nexus-category', { detail: { category } }));
          const found = allProducts.filter(p => category === 'All' || p.category.toLowerCase() === category.toLowerCase());
          return {
            success: true,
            details: `Filtered products by category "${category}" and found ${found.length} matching products.`,
            productsResult: found
          };
        }

        case 'ADD_TO_CART': {
          if (!currentUser || currentUser.role !== 'buyer') {
            return { success: false, details: "Only buyers can add items to cart." };
          }
          const prodId = action.payload?.productId;
          const targetProd = allProducts.find(p => p.id === prodId || p.title.toLowerCase().includes((prodId || '').toLowerCase()));
          if (!targetProd) {
            return { success: false, details: `Could not find product matching "${prodId}".` };
          }
          if (targetProd.stock <= 0) {
            return { success: false, details: `"${targetProd.title}" is currently sold out.` };
          }
          const cart = StorageService.getCart(currentUser.id);
          const idx = cart.findIndex(item => item.productId === targetProd.id);
          const qtyToAdd = Number(action.payload?.quantity) || 1;
          
          if (idx !== -1) {
            const nextQty = cart[idx].quantity + qtyToAdd;
            if (nextQty > targetProd.stock) {
              cart[idx].quantity = targetProd.stock;
            } else {
              cart[idx].quantity = nextQty;
            }
          } else {
            cart.push({ productId: targetProd.id, quantity: Math.min(qtyToAdd, targetProd.stock) });
          }
          StorageService.saveCart(currentUser.id, cart);
          
          // Trigger cart drawer open in real-time
          window.dispatchEvent(new CustomEvent('nexus-cart-drawer', { detail: { open: true } }));
          onRefreshUser();

          return {
            success: true,
            details: `Added ${qtyToAdd}x "${targetProd.title}" to your cart.`
          };
        }

        case 'CHANGE_CART_QTY': {
          if (!currentUser || currentUser.role !== 'buyer') {
            return { success: false, details: "Only buyers can manage cart quantities." };
          }
          const prodId = action.payload?.productId;
          const targetProd = allProducts.find(p => p.id === prodId || p.title.toLowerCase().includes((prodId || '').toLowerCase()));
          if (!targetProd) {
            return { success: false, details: `Could not find product matching "${prodId}".` };
          }
          const cart = StorageService.getCart(currentUser.id);
          const idx = cart.findIndex(item => item.productId === targetProd.id);
          if (idx === -1) {
            return { success: false, details: `"${targetProd.title}" is not in your cart.` };
          }

          const adjustQty = Number(action.payload?.quantity);
          if (isNaN(adjustQty)) {
            return { success: false, details: "Invalid quantity specified." };
          }

          const nextQty = adjustQty < 0 ? cart[idx].quantity + adjustQty : adjustQty;
          if (nextQty <= 0) {
            cart.splice(idx, 1);
            StorageService.saveCart(currentUser.id, cart);
            onRefreshUser();
            return { success: true, details: `Removed "${targetProd.title}" from your cart.` };
          } else {
            if (nextQty > targetProd.stock) {
              cart[idx].quantity = targetProd.stock;
              StorageService.saveCart(currentUser.id, cart);
              onRefreshUser();
              return { success: true, details: `Capped cart quantity for "${targetProd.title}" at maximum stock of ${targetProd.stock} units.` };
            } else {
              cart[idx].quantity = nextQty;
              StorageService.saveCart(currentUser.id, cart);
              onRefreshUser();
              return { success: true, details: `Updated "${targetProd.title}" cart quantity to ${nextQty} units.` };
            }
          }
        }

        case 'SET_ADDRESS': {
          if (!currentUser || currentUser.role !== 'buyer') {
            return { success: false, details: "Only buyers can set shipping addresses." };
          }
          const address = action.payload?.address || '';
          if (!address) {
            return { success: false, details: "No address specified." };
          }
          localStorage.setItem(`eb_delivery_address_${currentUser.id}`, address);
          return {
            success: true,
            details: `Shipping address saved: "${address}".`
          };
        }

        case 'CHECKOUT': {
          if (!currentUser || currentUser.role !== 'buyer') {
            return { success: false, details: "Only buyers can checkout items." };
          }
          const cart = StorageService.getCart(currentUser.id);
          if (cart.length === 0) {
            return { success: false, details: "Your cart is currently empty." };
          }

          // Calculate subtotal
          let subtotal = 0;
          for (const item of cart) {
            const p = allProducts.find(prod => prod.id === item.productId);
            if (!p) continue;
            subtotal += p.price * item.quantity;
          }

          // Verify balance
          const myProfileIndex = allUsers.findIndex(u => u.id === currentUser.id);
          if (myProfileIndex === -1) {
            return { success: false, details: "Account re-authentication failed." };
          }
          const userBalance = allUsers[myProfileIndex].balance ?? 0;
          if (userBalance < subtotal) {
            return {
              success: false,
              details: `Insufficient balance. Total order cost is $${subtotal.toFixed(2)}, but you only have $${userBalance.toFixed(2)} available. Please add virtual funds.`
            };
          }

          // Verify stock
          for (const item of cart) {
            const prod = allProducts.find(p => p.id === item.productId);
            if (!prod || prod.stock < item.quantity) {
              return { success: false, details: `Checkout cancelled: "${prod?.title || 'Unknown Item'}" has insufficient stock.` };
            }
          }

          // Deduct stocks & update balances
          const orderItems: OrderItem[] = [];
          for (const item of cart) {
            const prodIdx = allProducts.findIndex(p => p.id === item.productId);
            if (prodIdx !== -1) {
              const p = allProducts[prodIdx];
              allProducts[prodIdx].stock -= item.quantity;
              allProducts[prodIdx].unitsSold += item.quantity;
              allProducts[prodIdx].totalRevenue += p.price * item.quantity;

              orderItems.push({
                productId: p.id,
                title: p.title,
                price: p.price,
                quantity: item.quantity,
                imageUrl: p.imageUrl
              });
            }
          }

          // Deduct from buyer
          allUsers[myProfileIndex].balance = userBalance - subtotal;
          StorageService.saveUsers(allUsers);
          StorageService.saveProducts(allProducts);

          // Add Order
          const newOrder: Order = {
            id: `ord-ai-${Math.floor(1000 + Math.random() * 9000)}`,
            buyerId: currentUser.id,
            buyerName: currentUser.name,
            date: new Date().toISOString(),
            items: orderItems,
            totalAmount: subtotal,
            paymentMethod: 'Store credit'
          };
          StorageService.addOrder(newOrder);

          // Log activities
          orderItems.forEach(item => {
            StorageService.logActivity(
              currentUser.id,
              currentUser.name,
              'buyer',
              'Purchase',
              `Purchased ${item.quantity}x "${item.title}" for a total of $${(item.price * item.quantity).toFixed(2)} via AI Chat Agent.`
            );
          });

          // Clear Cart
          StorageService.clearCart(currentUser.id);
          onRefreshUser();

          return {
            success: true,
            details: `Checkout completed successfully! Purchased ${orderItems.length} items for a total of $${subtotal.toFixed(2)}.`
          };
        }

        case 'LIST_PRODUCT': {
          if (!currentUser || currentUser.role !== 'seller') {
            return { success: false, details: "Only sellers can publish products." };
          }
          const { title, description, price, stock, category } = action.payload;
          if (!title || price === undefined || stock === undefined) {
            return { success: false, details: "Failed to list product: Title, Price, and Stock are required fields." };
          }

          const newProduct: Product = {
            id: `p-seller-${Date.now()}`,
            sellerId: currentUser.id,
            sellerName: currentUser.storeName || currentUser.name || "Sellers Store",
            title,
            description: description || "Listed via Nexus AI Assistant.",
            price: Number(price) || 0,
            imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
            category: category || "General",
            stock: Number(stock) || 0,
            unitsSold: 0,
            totalRevenue: 0,
            createdAt: new Date().toISOString()
          };

          StorageService.updateProduct(newProduct);
          StorageService.logActivity(
            currentUser.id,
            currentUser.name,
            'seller',
            'List Product',
            `Published listing "${newProduct.title}" for $${newProduct.price.toFixed(2)} with stock level ${newProduct.stock}.`
          );

          // Force reload and select products/inventory tab
          window.dispatchEvent(new CustomEvent('nexus-seller-refresh'));
          window.dispatchEvent(new CustomEvent('nexus-seller-tab', { detail: { tab: 'products' } }));
          onRefreshUser();

          return {
            success: true,
            details: `Successfully listed your new product "${title}" for $${Number(price).toFixed(2)}.`
          };
        }

        case 'DELETE_PRODUCT': {
          const prodId = action.payload?.productId;
          const match = allProducts.find(p => p.id === prodId || p.title.toLowerCase().includes((prodId || '').toLowerCase()));
          if (!match) {
            return { success: false, details: `Could not locate product matching "${prodId}".` };
          }

          // Authorization check
          if (currentUser?.role === 'seller' && match.sellerId !== currentUser.id) {
            return { success: false, details: "You are not authorized to delete other seller's products." };
          }
          if (currentUser?.role !== 'seller' && currentUser?.role !== 'admin') {
            return { success: false, details: "Only sellers and admins can unlist products." };
          }

          StorageService.deleteProduct(match.id);
          StorageService.logActivity(
            currentUser.id,
            currentUser.name,
            currentUser.role,
            'Delete Product',
            `Unlisted product "${match.title}" (ID: ${match.id}) from marketplace.`
          );

          // Force reload
          window.dispatchEvent(new CustomEvent('nexus-seller-refresh'));
          onRefreshUser();

          return {
            success: true,
            details: `Unlisted product "${match.title}" successfully.`
          };
        }

        case 'MODIFY_PRODUCT_DESC': {
          if (!currentUser || currentUser.role !== 'seller') {
            return { success: false, details: "Only sellers can modify descriptions." };
          }
          const prodId = action.payload?.productId;
          const desc = action.payload?.description || '';
          
          const match = allProducts.find(p => p.id === prodId || p.title.toLowerCase().includes((prodId || '').toLowerCase()));
          if (!match) {
            return { success: false, details: `Could not locate product matching "${prodId}".` };
          }
          if (match.sellerId !== currentUser.id) {
            return { success: false, details: "You can only edit descriptions for your own listings." };
          }

          match.description = desc;
          StorageService.updateProduct(match);
          
          StorageService.logActivity(
            currentUser.id,
            currentUser.name,
            'seller',
            'Update Product',
            `Updated description for "${match.title}".`
          );

          // Force reload
          window.dispatchEvent(new CustomEvent('nexus-seller-refresh'));
          onRefreshUser();

          return {
            success: true,
            details: `Updated description for "${match.title}" to: "${desc.slice(0, 50)}...".`
          };
        }

        case 'MODIFY_PRODUCT': {
          if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) {
            return { success: false, details: "Only sellers and administrators can modify product details." };
          }
          const prodId = action.payload?.productId;
          const match = allProducts.find(p => p.id === prodId || p.title.toLowerCase().includes((prodId || '').toLowerCase()));
          if (!match) {
            return { success: false, details: `Could not locate product matching "${prodId}".` };
          }
          if (currentUser.role === 'seller' && match.sellerId !== currentUser.id) {
            return { success: false, details: "You can only edit your own listings." };
          }

          const { title, description, price, stock, category } = action.payload;
          let changes = [];
          if (title !== undefined && title !== "") {
            match.title = title;
            changes.push("name/title");
          }
          if (description !== undefined && description !== "") {
            match.description = description;
            changes.push("description");
          }
          if (price !== undefined) {
            match.price = Number(price);
            changes.push(`price ($${Number(price).toFixed(2)})`);
          }
          if (stock !== undefined) {
            match.stock = Number(stock);
            changes.push(`stock (${Number(stock)} units)`);
          }
          if (category !== undefined && category !== "") {
            match.category = category;
            changes.push("category");
          }

          if (changes.length === 0) {
            return { success: false, details: "No product modifications specified." };
          }

          StorageService.updateProduct(match);
          StorageService.logActivity(
            currentUser.id,
            currentUser.name,
            currentUser.role,
            'Update Product',
            `Modified product "${match.title}" (ID: ${match.id}) parameters: ${changes.join(', ')}.`
          );

          // Force reload
          window.dispatchEvent(new CustomEvent('nexus-seller-refresh'));
          window.dispatchEvent(new CustomEvent('nexus-admin-refresh'));
          onRefreshUser();

          return {
            success: true,
            details: `Successfully updated ${changes.join(', ')} for product "${match.title}".`
          };
        }

        case 'SELECT_SELLER_TAB': {
          if (!currentUser || currentUser.role !== 'seller') {
            return { success: false, details: "Only sellers can change seller dashboard views." };
          }
          const tab = action.payload?.tab || 'products';
          window.dispatchEvent(new CustomEvent('nexus-seller-tab', { detail: { tab } }));
          return {
            success: true,
            details: `Switched seller dashboard view to "${tab === 'products' ? 'Inventory Products' : 'Sales Analytics & Statistics'}".`
          };
        }

        case 'SELECT_ADMIN_TAB': {
          if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, details: "Only administrators can switch admin control tabs." };
          }
          const tab = action.payload?.tab || 'users';
          window.dispatchEvent(new CustomEvent('nexus-admin-tab', { detail: { tab } }));
          return {
            success: true,
            details: `Switched administrative control view to "${tab}".`
          };
        }

        case 'SELECT_ADMIN_SELLER': {
          if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, details: "Only administrators can view detailed seller dossiers." };
          }
          const sellerId = action.payload?.sellerId;
          const match = allUsers.find(u => u.role === 'seller' && (u.id === sellerId || u.username.toLowerCase() === (sellerId || '').toLowerCase() || u.name.toLowerCase().includes((sellerId || '').toLowerCase()) || (u.storeName && u.storeName.toLowerCase().includes((sellerId || '').toLowerCase()))));
          if (!match) {
            return { success: false, details: `Could not locate seller matching "${sellerId}".` };
          }
          window.dispatchEvent(new CustomEvent('nexus-admin-select-seller', { detail: { sellerId: match.id } }));
          return {
            success: true,
            details: `Opened administrative dossier for seller "${match.name}" (Store: "${match.storeName}").`
          };
        }

        case 'SELECT_ADMIN_BUYER': {
          if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, details: "Only administrators can view detailed buyer dossiers." };
          }
          const buyerId = action.payload?.buyerId;
          const match = allUsers.find(u => u.role === 'buyer' && (u.id === buyerId || u.username.toLowerCase() === (buyerId || '').toLowerCase() || u.name.toLowerCase().includes((buyerId || '').toLowerCase())));
          if (!match) {
            return { success: false, details: `Could not locate buyer matching "${buyerId}".` };
          }
          window.dispatchEvent(new CustomEvent('nexus-admin-select-buyer', { detail: { buyerId: match.id } }));
          return {
            success: true,
            details: `Opened administrative dossier for buyer "${match.name}".`
          };
        }

        case 'DELETE_USER': {
          if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, details: "Only administrators can delete user accounts." };
          }
          const userId = action.payload?.userId;
          if (!userId) {
            return { success: false, details: "User ID or Username is required." };
          }
          const targetIdx = allUsers.findIndex(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
          if (targetIdx === -1) {
            return { success: false, details: `User "${userId}" not found.` };
          }
          if (allUsers[targetIdx].id === currentUser.id) {
            return { success: false, details: "You cannot delete your own administrator account." };
          }
          const username = allUsers[targetIdx].username;
          allUsers.splice(targetIdx, 1);
          StorageService.saveUsers(allUsers);
          StorageService.logActivity(
            currentUser.id,
            currentUser.name,
            'admin',
            'Delete User',
            `Deleted user account "${username}" (ID: ${userId}).`
          );
          window.dispatchEvent(new CustomEvent('nexus-admin-refresh'));
          onRefreshUser();
          return {
            success: true,
            details: `Successfully deleted user account "${username}".`
          };
        }

        case 'MODIFY_USER_PROFILE': {
          if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, details: "Only administrators can modify user profiles." };
          }
          const userId = action.payload?.userId;
          if (!userId) {
            return { success: false, details: "User ID or Username is required." };
          }
          const targetIdx = allUsers.findIndex(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
          if (targetIdx === -1) {
            return { success: false, details: `User "${userId}" not found.` };
          }
          const targetUser = allUsers[targetIdx];
          const { name, username, storeName, balance } = action.payload;
          let changes = [];
          if (name !== undefined && name !== "") {
            targetUser.name = name;
            changes.push(`name to "${name}"`);
          }
          if (username !== undefined && username !== "") {
            const collision = allUsers.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== targetUser.id);
            if (collision) {
              return { success: false, details: "This username is already taken by another portal account." };
            }
            targetUser.username = username.trim();
            changes.push(`username to "${username}"`);
          }
          if (storeName !== undefined) {
            targetUser.storeName = storeName;
            changes.push(`store name to "${storeName}"`);
          }
          if (balance !== undefined) {
            targetUser.balance = Number(balance);
            changes.push(`balance to $${Number(balance).toFixed(2)}`);
          }
          if (changes.length === 0) {
            return { success: false, details: "No user profile modifications specified." };
          }
          allUsers[targetIdx] = targetUser;
          StorageService.saveUsers(allUsers);
          StorageService.logActivity(
            currentUser.id,
            currentUser.name,
            'admin',
            'Modify User Profile',
            `Modified user account "${targetUser.username}": ${changes.join(', ')}.`
          );
          window.dispatchEvent(new CustomEvent('nexus-admin-refresh'));
          onRefreshUser();
          return {
            success: true,
            details: `Successfully updated user "${targetUser.username}": ${changes.join(', ')}.`
          };
        }

        case 'RESET_PASSWORD': {
          if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, details: "Only administrators can reset user credentials." };
          }
          const userId = action.payload?.userId;
          const newPass = action.payload?.newPassword;
          if (!userId || !newPass) {
            return { success: false, details: "User ID/Username and new password are required." };
          }

          const targetUserIdx = allUsers.findIndex(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
          if (targetUserIdx === -1) {
            return { success: false, details: `User "${userId}" not found.` };
          }

          allUsers[targetUserIdx].password = newPass;
          StorageService.saveUsers(allUsers);

          StorageService.logActivity(
            currentUser.id,
            currentUser.name,
            'admin',
            'Reset Password',
            `Reset the password for "${allUsers[targetUserIdx].username}".`
          );

          window.dispatchEvent(new CustomEvent('nexus-admin-refresh'));
          onRefreshUser();

          return {
            success: true,
            details: `Password reset for "${allUsers[targetUserIdx].username}".`
          };
        }

        case 'CHANGE_USER_STATUS': {
          if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, details: "Only administrators can toggle user accounts." };
          }
          const userId = action.payload?.userId;
          const status = action.payload?.status || 'disabled';
          if (!userId) {
            return { success: false, details: "Username or User ID is required." };
          }

          const targetUserIdx = allUsers.findIndex(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
          if (targetUserIdx === -1) {
            return { success: false, details: `User "${userId}" not found.` };
          }

          if (allUsers[targetUserIdx].id === currentUser.id) {
            return { success: false, details: "You cannot disable your own administrator account." };
          }

          allUsers[targetUserIdx].status = status as 'active' | 'disabled';
          StorageService.saveUsers(allUsers);

          StorageService.logActivity(
            currentUser.id,
            currentUser.name,
            'admin',
            'Modify User Status',
            `Changed status of account "${allUsers[targetUserIdx].username}" to "${status.toUpperCase()}".`
          );

          window.dispatchEvent(new CustomEvent('nexus-admin-refresh'));
          onRefreshUser();

          return {
            success: true,
            details: `Successfully set account status of "${allUsers[targetUserIdx].username}" to ${status.toUpperCase()}.`
          };
        }

        default:
          return { success: false, details: `Unsupported action type: "${action.type}".` };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, details: `Operation failed: ${err.message || err}` };
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    setInput('');
    setIsLoading(true);

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      // Gather current state from LocalStorage to send as context to backend
      const products = StorageService.getProducts();
      const cart = currentUser ? StorageService.getCart(currentUser.id) : [];
      const users = currentUser?.role === 'admin'
        ? StorageService.getUsers().map(({ password, bankCards, ...account }) => account)
        : [];
      const orders = StorageService.getOrders();

      const chatHistory = messages
        .filter(m => !m.id.startsWith('welcome'))
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      chatHistory.push({ role: 'user', content: trimmed });

      // Call our secure full-stack backend endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: chatHistory,
          currentUser: currentUser
            ? (({ password, bankCards, ...account }) => account)(currentUser)
            : null,
          products,
          cart,
          users,
          orders
        })
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.mode) {
        setApiMode(data.mode);
      }
      if (data.engine) {
        setAiEngine(data.engine);
      }
      
      const assistantMsgContent = data.message || "I completed your query, but could not determine a response.";
      const actions = data.actions || [];

      // Execute returned structured actions locally
      const results: Array<{ type: string; details: string; success: boolean }> = [];
      let productsResult: Product[] | undefined;

      for (const act of actions) {
        if (!act || act.type === 'WEB_SEARCH') continue;
        const res = executeLocalAction(act);
        results.push({
          type: act.type,
          details: res.details,
          success: res.success
        });
        if (res.productsResult) {
          productsResult = res.productsResult;
        }
      }

      const assistantMsg: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantMsgContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionsPerformed: results.length > 0 ? results : undefined,
        productsList: productsResult
      };

      setMessages(prev => [...prev, assistantMsg]);

    } catch (error: any) {
      console.error(error);
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `I'm sorry, I couldn't reach the secure Nexus AI servers. Error: ${error.message || error}. Please ensure the server is booted properly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-' + (currentUser?.id || 'guest') + '-' + Date.now(),
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className={`fixed bottom-6 z-50 flex flex-col items-end transition-all duration-300 ease-in-out ${isCartOpen ? 'right-6 md:right-[472px]' : 'right-6'}`}>
      {/* Floating Chat Window Panel */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] h-[550px] bg-[#FAF9F6] dark:bg-neutral-900 border-2 border-neutral-900 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] flex flex-col mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          
          {/* Header Bar */}
          <div className="bg-neutral-900 text-[#FAF9F6] px-4 py-3 flex flex-col gap-1.5 border-b border-neutral-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neutral-100 animate-pulse" />
                <span className="font-serif font-black uppercase text-xs tracking-wider">NEXUS AI COMPANION</span>
                <span className="bg-neutral-800 border border-neutral-700 text-[8px] font-mono font-bold px-1 py-0.5 rounded text-neutral-400">
                  {currentUser?.role?.toUpperCase() || 'GUEST'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearChat}
                  className="text-[9px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-400 px-1.5 py-0.5 border border-neutral-700 uppercase"
                  title="Reset conversation"
                >
                  Clear
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Connection Mode Indicator */}
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-800/80 text-[9px] font-mono text-neutral-400 select-none">
              <span className={`w-1.5 h-1.5 rounded-full ${
                apiMode === 'online' ? 'bg-emerald-500 animate-pulse' :
                apiMode === 'offline' ? 'bg-amber-500' :
                apiMode === 'error' ? 'bg-rose-500' : 'bg-neutral-600 animate-pulse'
              }`} />
              <span className="uppercase tracking-tight">
                {apiMode === 'online' ? (
                  aiEngine === 'qwen' ? 'Qwen connected' :
                  aiEngine === 'gemini' ? 'Gemini connected' :
                  'Assistant connected'
                ) :
                 apiMode === 'offline' ? 'Intelligent Offline Mode (Perform actions)' :
                 apiMode === 'error' ? 'API Connection Error' : 'Detecting system status...'}
              </span>
            </div>
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#EAE6DF]/15 dark:bg-neutral-950/40 custom-scrollbar">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] px-3 py-2.5 rounded-none border-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]'
                      : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]'
                  }`}
                >
                  {/* Speaker Label */}
                  <span className="text-[8px] font-mono block mb-1 opacity-50 uppercase tracking-widest">
                    {msg.role === 'user' ? currentUser?.username || 'You' : 'NEXUS_AI'}
                  </span>
                  
                  {/* Message content */}
                  <p className="whitespace-pre-wrap font-sans font-medium">{msg.content}</p>

                  {/* Structured Search Results in Chat */}
                  {msg.productsList && msg.productsList.length > 0 && (
                    <div className="mt-3 border-t border-dashed border-neutral-300 pt-2.5 space-y-2">
                      <span className="text-[9px] font-mono font-bold uppercase text-neutral-400 tracking-wider">Found Items:</span>
                      <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto">
                        {msg.productsList.slice(0, 3).map((prod) => (
                          <div key={prod.id} className="flex gap-2 p-1.5 bg-[#FAF9F6] border border-neutral-900/60 rounded-none items-center">
                            <img src={prod.imageUrl} alt={prod.title} className="w-8 h-8 object-cover border border-neutral-900" referrerPolicy="no-referrer" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold truncate text-neutral-950">{prod.title}</p>
                              <p className="text-[9px] font-mono text-neutral-600">${prod.price.toFixed(2)} • Stock: {prod.stock}</p>
                            </div>
                            {currentUser?.role === 'buyer' && prod.stock > 0 && (
                              <button
                                onClick={() => handleSendMessage(`Add ${prod.title} to my cart`)}
                                className="bg-neutral-900 text-[#FAF9F6] text-[8px] font-mono font-bold px-1.5 py-1 uppercase"
                              >
                                Buy
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions logs */}
                  {msg.actionsPerformed && msg.actionsPerformed.length > 0 && (
                    <div className="mt-2.5 border-t border-dashed border-neutral-300 pt-2 space-y-1">
                      {msg.actionsPerformed.map((act, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-1.5 text-[9.5px] font-mono font-bold px-1.5 py-1 ${
                            act.success 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900' 
                              : 'bg-rose-50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                          }`}
                        >
                          {act.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{act.details}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[8px] text-neutral-400 font-mono mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-900 px-3 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-neutral-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-neutral-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-neutral-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-widest opacity-50">thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions area */}
          <div className="p-2.5 bg-[#FAF9F6] dark:bg-[#1A1816] border-t-2 border-neutral-900 flex gap-2 overflow-x-auto custom-scrollbar-horizontal select-none py-3">
            {getSuggestions().map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                className="flex-shrink-0 text-[10px] font-mono font-bold border border-neutral-900 bg-white dark:bg-neutral-800 hover:bg-neutral-900 hover:text-[#FAF9F6] dark:hover:bg-neutral-100 dark:hover:text-neutral-900 text-neutral-900 dark:text-neutral-100 px-3 py-1.5 transition-all rounded-none uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] truncate max-w-[220px]"
                title={suggestion}
              >
                {suggestion.length > 25 ? suggestion.slice(0, 25) + '...' : suggestion}
              </button>
            ))}
          </div>

          {/* Input text form bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 bg-neutral-900 flex gap-2 border-t border-neutral-800"
          >
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI Companion to do something..."
              className="flex-1 bg-neutral-800 text-white font-sans text-xs px-3 py-2 rounded-none border border-neutral-700 focus:outline-none focus:border-neutral-500"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-white hover:bg-neutral-100 text-neutral-900 font-mono text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 flex items-center gap-1.5 rounded-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3 h-3" />
              <span>Send</span>
            </button>
          </form>

        </div>
      )}

      {/* Floating Sparkles Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-neutral-900 text-[#FAF9F6] border-2 border-neutral-900 p-3.5 hover:bg-neutral-800 transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] active:translate-x-0 active:translate-y-0 flex items-center gap-2 rounded-none group"
      >
        <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
        <span className="font-serif font-black text-xs uppercase tracking-widest">NEXUS AI</span>
        {isOpen ? <X className="w-3.5 h-3.5 ml-1" /> : <Bot className="w-3.5 h-3.5 ml-1" />}
      </button>
    </div>
  );
}
