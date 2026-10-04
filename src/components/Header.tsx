/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

import React, { useState } from 'react';
import { User } from '../types';
import { 
  ShoppingBag, 
  User as UserIcon, 
  LogOut, 
  ShieldAlert, 
  CreditCard, 
  Plus, 
  Coins, 
  Store,
  Sun,
  Moon
} from 'lucide-react';
import { StorageService } from '../lib/storage';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onAddFundsTrigger?: () => void;
  onSignInClick?: () => void;
  onNavigateToTab?: (tab: 'catalog' | 'profile') => void;
  activeTab?: 'catalog' | 'profile';
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Header({ 
  currentUser, 
  onLogout, 
  onAddFundsTrigger,
  onSignInClick,
  onNavigateToTab,
  activeTab,
  darkMode,
  onToggleDarkMode
}: HeaderProps) {

  return (
    <header id="header-root" className="sticky top-0 z-50 w-full bg-[#FAF9F6]/95 backdrop-blur-md border-b-2 border-neutral-900 select-none transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        
        {/* Brand Logo & Tag */}
        <div 
          onClick={() => onNavigateToTab?.('catalog')}
          className="flex items-center space-x-3 select-none cursor-pointer hover:opacity-85 transition"
          title="Back to Catalog"
        >
          <div className="w-9 h-9 bg-neutral-900 rounded-none flex items-center justify-center text-[#FAF9F6] font-serif font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-serif font-black tracking-widest text-neutral-900 block leading-none">
              NEXUS <span className="font-serif italic font-light lowercase text-neutral-600">marketplace</span>
            </span>
            <span className="text-[9px] text-neutral-500 font-mono tracking-[0.25em] uppercase mt-1 block">
              EST. 2026 • PORTAL SECURE
            </span>
          </div>
        </div>

        {/* Dynamic Navigation & Info */}
        <div className="flex items-center space-x-4">
          
          {/* Night/Day Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200 border-2 border-transparent hover:border-neutral-900 rounded-none transition flex items-center justify-center cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Night Mode"}
            aria-label="Toggle Night Mode"
          >
            {darkMode ? (
              <Sun className="w-4.5 h-4.5 text-amber-500 animate-pulse shrink-0" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-neutral-800 shrink-0" />
            )}
          </button>
          
          {currentUser ? (
            <div className="flex items-center space-x-3.5">
              
              {/* Contextual Role Pill */}
              <div className="hidden sm:flex flex-col text-right justify-center">
                <span className="text-sm sm:text-base md:text-lg font-serif font-black tracking-tight text-neutral-950 leading-tight">
                  {currentUser.name}
                </span>
                {currentUser.role !== 'buyer' && (
                  <span className="text-[9px] text-neutral-500 font-mono tracking-wider uppercase">
                    {currentUser.role === 'admin' && 'SYSTEM ADMINISTRATOR'}
                    {currentUser.role === 'seller' && `SELLER • ${currentUser.storeName}`}
                  </span>
                )}
              </div>

              {/* Unique Interactive Balance for Buyer in Header */}
              {currentUser.role === 'buyer' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onNavigateToTab?.('profile')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-none border-2 border-neutral-950 cursor-pointer transition font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none ${
                        activeTab === 'profile'
                          ? 'bg-[#EAE6DF] text-neutral-950'
                          : 'bg-[#FAF9F6] hover:bg-[#EAE6DF] text-neutral-950'
                    }`}
                    title="View profile"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-neutral-950 shrink-0" />
                    <span>My Profile</span>
                  </button>

                  <div 
                    onClick={() => {
                      onNavigateToTab?.('profile');
                      onAddFundsTrigger?.();
                    }}
                    className="flex items-center space-x-2 bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-none border-2 border-neutral-950 cursor-pointer transition text-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:shadow-none"
                    title="Demo store credit. Click to add more."
                  >
                    <CreditCard className="w-3.5 h-3.5 text-neutral-300" />
                    <span className="text-xs font-bold font-mono">
                      ${(currentUser.balance ?? 0).toFixed(2)}
                    </span>
                    <Plus className="w-3" />
                  </div>
                </div>
              )}

              {/* Logout Icon */}
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="p-2 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200 border border-transparent hover:border-neutral-900 rounded-none transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>

            </div>
          ) : (
            <button
              id="header-signin-btn"
              onClick={onSignInClick}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] border border-neutral-900 font-mono text-[10px] tracking-widest uppercase rounded-none transition font-bold"
            >
              Sign In / Partner Register
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
