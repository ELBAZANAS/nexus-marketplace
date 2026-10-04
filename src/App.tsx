/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

import React, { useState, useEffect } from 'react';
import { User } from './types';
import { StorageService, initializeStorage } from './lib/storage';
import Header from './components/Header';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import SellerPanel from './components/SellerPanel';
import BuyerPanel from './components/BuyerPanel';
import AIAgentChat from './components/AIAgentChat';
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [addFundsTriggerCounter, setAddFundsTriggerCounter] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [buyerActiveTab, setBuyerActiveTab] = useState<'catalog' | 'profile'>('catalog');
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('eb_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('eb_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('eb_dark_mode', 'false');
    }
  }, [darkMode]);

  // Initialize standard Local Storage database when the application boots
  useEffect(() => {
    initializeStorage();
    const loadedUser = StorageService.getCurrentUser();
    if (loadedUser) {
      // Check if disabled by administrator
      if (loadedUser.status === 'disabled') {
        StorageService.setCurrentUser(null);
        setCurrentUser(null);
        alert('This account was disabled by the Administrator. Sign out.');
      } else {
        setCurrentUser(loadedUser);
      }
    }
  }, []);

  // Sync state cleanly whenever external components trigger updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      const refreshed = StorageService.getCurrentUser();
      if (refreshed && refreshed.status === 'disabled') {
        StorageService.setCurrentUser(null);
        setCurrentUser(null);
        alert('Session terminated: Your account has been disabled by the Administrator.');
      } else {
        setCurrentUser(refreshed);
      }
    };

    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
  };

  // Callback to refresh the signed-in account after balance or profile changes
  const refreshUserContext = () => {
    setCurrentUser(StorageService.getCurrentUser());
  };

  return (
    <div className="min-h-screen bg-transparent text-neutral-900 selection:bg-neutral-900 selection:text-[#FAF9F6] select-none font-sans relative">
      
      {/* Dynamic Background Architectural Overlay Grid & Blueprint Coordinates */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        
        {/* Technical Blueprint Vector Accents - Massive Center Circle (extends way beyond product boundaries!) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1300px] h-[1300px] border-2 border-neutral-900/[0.16] dark:border-neutral-100/[0.12] rounded-full pointer-events-none flex items-center justify-center select-none">
          <div className="w-[1050px] h-[1050px] border border-dashed border-neutral-900/[0.14] dark:border-neutral-100/[0.09] rounded-full flex items-center justify-center">
            <div className="w-[800px] h-[800px] border border-neutral-900/[0.1] dark:border-neutral-100/[0.07] rounded-full flex items-center justify-center">
              <div className="w-[500px] h-[500px] border border-dashed border-neutral-900/[0.08] dark:border-neutral-100/[0.05] rounded-full flex items-center justify-center animate-spin-slow">
                <div className="w-24 h-24 border-l-2 border-t-2 border-neutral-900/[0.22] dark:border-neutral-100/[0.18]" />
              </div>
            </div>
          </div>
        </div>

        {/* Left Side Compass/Radar Accent Gauge - Highly visible near left margin */}
        <div className="absolute left-6 md:left-14 top-[35%] -translate-y-1/2 w-[280px] h-[280px] border border-neutral-900/[0.18] dark:border-neutral-100/[0.12] rounded-full pointer-events-none hidden xl:flex items-center justify-center select-none animate-pulse">
          <div className="w-[200px] h-[200px] border border-dashed border-neutral-900/[0.14] dark:border-neutral-100/[0.09] rounded-full flex items-center justify-center">
            <div className="w-[120px] h-[120px] border border-neutral-900/[0.1] dark:border-neutral-100/[0.06] rounded-full flex items-center justify-center animate-spin-slow">
              <span className="text-[8px] font-mono tracking-widest text-neutral-900/30 dark:text-neutral-100/25 uppercase">360°N</span>
            </div>
          </div>
        </div>

        {/* Right Side Coordinate Scope Accent Gauge - Highly visible near right margin */}
        <div className="absolute right-6 md:right-14 top-[65%] -translate-y-1/2 w-[320px] h-[320px] border border-neutral-900/[0.18] dark:border-neutral-100/[0.12] rounded-full pointer-events-none hidden xl:flex items-center justify-center select-none animate-pulse">
          <div className="w-[240px] h-[240px] border border-dashed border-neutral-900/[0.14] dark:border-neutral-100/[0.09] rounded-full flex items-center justify-center">
            <div className="w-[160px] h-[160px] border border-neutral-900/[0.1] dark:border-neutral-100/[0.07] rounded-full flex items-center justify-center flex-col gap-1">
              <div className="w-8 h-8 border-r border-b border-neutral-900/[0.2] dark:border-neutral-100/[0.12]" />
            </div>
          </div>
        </div>

        {/* Subtle decorative background watermark coordinates */}
        <div className="absolute top-24 left-8 text-[9.5px] font-mono tracking-[0.3em] text-[#1A1A1A]/22 dark:text-neutral-400/20 uppercase select-none">
          {"NEXUS MARKETPLACE // LOCAL DEMO"}
        </div>
        <div className="absolute bottom-28 right-8 text-[9.5px] font-mono tracking-[0.3em] text-[#1A1A1A]/22 dark:text-neutral-400/20 uppercase text-right leading-relaxed hidden md:block select-none">
          {"STORE CREDIT AND ORDERS STAY IN THIS BROWSER"}
        </div>
        
        {/* Corner Grid Crosshair Corner Cropmarks */}
        <div className="absolute top-6 left-6 w-8 h-8 border-l border-t border-[#1A1A1A]/28 dark:border-neutral-400/26 select-none"></div>
        <div className="absolute top-6 right-6 w-8 h-8 border-r border-t border-[#1A1A1A]/28 dark:border-neutral-400/26 select-none"></div>
        <div className="absolute bottom-6 left-6 w-8 h-8 border-l border-b border-[#1A1A1A]/28 dark:border-neutral-400/26 select-none"></div>
        <div className="absolute bottom-6 right-6 w-8 h-8 border-r border-b border-[#1A1A1A]/28 dark:border-neutral-400/26 select-none"></div>
        
        {/* Horizontal & Vertical guide crosshairs */}
        <div className="absolute left-1/2 top-10 -translate-x-1/2 text-[#1A1A1A]/12 dark:text-neutral-400/12 font-mono text-[8.5px] tracking-[0.5em] uppercase pointer-events-none select-none">
          + CENTER REFERENCE ALIGNMENT +
        </div>
      </div>

      <div className="relative z-10 flex flex-col justify-between min-h-screen">
        {/* Navigation Headboard */}
        <Header 
          currentUser={currentUser}
          onLogout={handleLogout}
          onAddFundsTrigger={() => setAddFundsTriggerCounter(c => c + 1)}
          onSignInClick={() => setIsAuthOpen(true)}
          onNavigateToTab={(tab) => setBuyerActiveTab(tab)}
          activeTab={buyerActiveTab}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />

        {/* Core Frame Layout */}
        <main className="transition-all duration-200">
          {!currentUser ? (
            <BuyerPanel 
              currentUser={null} 
              onRefreshUser={refreshUserContext}
              addFundsTriggerCount={addFundsTriggerCounter}
              onSignInPrompt={() => setIsAuthOpen(true)}
              activeTab={buyerActiveTab}
              onNavigateToTab={setBuyerActiveTab}
            />
          ) : (
            <div>
              
              {/* Conditional viewport render depending on authorized role */}
              {currentUser.role === 'admin' && <AdminPanel />}
              
              {currentUser.role === 'seller' && (
                <SellerPanel currentUser={currentUser} darkMode={darkMode} />
              )}
              
              {currentUser.role === 'buyer' && (
                <BuyerPanel 
                  currentUser={currentUser} 
                  onRefreshUser={refreshUserContext}
                  addFundsTriggerCount={addFundsTriggerCounter}
                  onSignInPrompt={() => setIsAuthOpen(true)}
                  activeTab={buyerActiveTab}
                  onNavigateToTab={setBuyerActiveTab}
                />
              )}

            </div>
          )}
        </main>

      {isAuthOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md my-8">
            <AuthScreen 
              onLoginSuccess={(user) => {
                handleLoginSuccess(user);
                setIsAuthOpen(false);
              }}
              onClose={() => setIsAuthOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Persistent AI Agent Chat Companion */}
      <AIAgentChat currentUser={currentUser} onRefreshUser={refreshUserContext} />

      {/* Corporate footer */}
      <footer className="w-full bg-[#FAF9F6] border-t-2 border-neutral-900 py-8 text-center select-none">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-serif font-black tracking-widest text-[#1A1A1A] text-sm uppercase">
            NEXUS COMMERCIAL CORE
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-neutral-500 font-mono text-[9px] uppercase tracking-[0.18em]">
            <span>Buyer, seller, and admin workspaces</span>
            <span className="hidden sm:inline text-neutral-400">•</span>
            <span>Demo store credit only</span>
            <span className="hidden sm:inline text-neutral-400">•</span>
            <span>Saved in this browser</span>
          </div>
        </div>
      </footer>

      </div>
    </div>
  );
}
