/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

import React, { useState } from 'react';
import { StorageService } from '../lib/storage';
import { User, UserRole } from '../types';
import { 
  UserPlus, 
  LogIn, 
  Store, 
  ShoppingBag, 
  Key, 
  User as UserIcon,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  onClose?: () => void;
}

export default function AuthScreen({ onLoginSuccess, onClose }: AuthScreenProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  
  // Login Form States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register Form States
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<'buyer' | 'seller'>('buyer');
  const [regStoreName, setRegStoreName] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername || !loginPassword) {
      setLoginError('Please enter both username and password.');
      return;
    }

    const allUsers = StorageService.getUsers();
    const foundUser = allUsers.find(
      u => u.username.toLowerCase() === loginUsername.toLowerCase()
    );

    if (!foundUser) {
      setLoginError('Account not found. Check credentials or register.');
      return;
    }

    if (foundUser.password !== loginPassword) {
      setLoginError('Invalid password. Please try again.');
      return;
    }

    if (foundUser.status === 'disabled') {
      setLoginError('Your account has been disabled by the system administrator.');
      return;
    }

    if (foundUser.status === 'pending_approval') {
      setLoginError('Your merchant account is pending registration approval by the administrator.');
      return;
    }

    // Set user
    StorageService.setCurrentUser(foundUser);
    onLoginSuccess(foundUser);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    // Common validations
    if (!regUsername || !regPassword || !regConfirmPassword || !regFullName || !regEmail) {
      setRegError('All fields are required.');
      return;
    }

    if (regUsername.length < 4) {
      setRegError('Username must be at least 4 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    if (regRole === 'seller' && !regStoreName.trim()) {
      setRegError('Please provide a name for your store.');
      return;
    }

    const allUsers = StorageService.getUsers();
    const exists = allUsers.some(
      u => u.username.toLowerCase() === regUsername.toLowerCase()
    );

    if (exists) {
      setRegError('Username is already taken.');
      return;
    }

    // Create custom user
    const newUser: User = {
      id: `u-${Date.now()}`,
      username: regUsername.trim(),
      password: regPassword,
      role: regRole,
      status: regRole === 'seller' ? 'pending_approval' : 'active',
      name: regFullName.trim(),
      email: regEmail.trim(),
      ...(regRole === 'buyer' ? { balance: 1000 } : { storeName: regStoreName.trim() }),
      createdAt: new Date().toISOString()
    };

    allUsers.push(newUser);
    StorageService.saveUsers(allUsers);

    if (newUser.role === 'seller') {
      setRegSuccess('Merchant registration submitted! Your account is pending administrator approval before you can list products.');
    } else {
      setRegSuccess('Registration successful! You can now log in below.');
    }
    
    // Clear forms and toggle
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegFullName('');
    setRegEmail('');
    setRegStoreName('');
    setIsLoginTab(true);

    // Auto-populate login form
    setLoginUsername(newUser.username);
  };

  return (
    <div id="auth-root" className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-transparent p-4 py-12 select-none relative">
      
      <div className="relative w-full max-w-md">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-0 -right-10 z-20 p-1.5 bg-[#FAF9F6] hover:bg-[#EAE6DF] border-2 border-neutral-900 text-neutral-950 font-bold transition rounded-none text-xs flex items-center justify-center w-7 h-7 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
            title="Return to Shop Browse"
          >
            ✕
          </button>
        )}

        <div className="w-full bg-[#FAF9F6] rounded-none border-2 border-neutral-900 overflow-hidden text-neutral-900 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] relative">

        {/* Auth Toggle Tabs */}
        <div className="flex border-b-2 border-neutral-900 bg-[#EAE6DF]">
          <button
            onClick={() => setIsLoginTab(true)}
            className={`w-1/2 py-4 text-xs font-mono uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 ${
              isLoginTab 
                ? 'text-neutral-50 bg-neutral-900 border-r-2 border-neutral-900' 
                : 'text-neutral-500 hover:text-neutral-900 bg-transparent'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
          <button
            onClick={() => setIsLoginTab(false)}
            className={`w-1/2 py-4 text-xs font-mono uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 ${
              !isLoginTab 
                ? 'text-neutral-50 bg-neutral-900 border-l-2 border-neutral-900' 
                : 'text-neutral-500 hover:text-neutral-900 bg-transparent'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Register
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="p-8">
          
          {regSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-950 text-emerald-900 rounded-none text-xs flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-mono uppercase tracking-wide text-[11px]">{regSuccess}</span>
            </div>
          )}

          {isLoginTab ? (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-serif italic font-bold text-neutral-950">Welcome Back</h2>
                <div className="w-12 h-[1px] bg-neutral-900 mx-auto my-2.5"></div>
                <p className="text-[11px] text-neutral-500 font-mono uppercase tracking-wider">Sign in with a marketplace account</p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-50 border border-rose-950 text-rose-950 rounded-none text-xs flex items-center gap-2 animate-shake font-mono">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1.5 uppercase tracking-widest">Username</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                      <UserIcon className="w-4 h-4 text-neutral-600" />
                    </span>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="e.g. alex_buyer"
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white transition-colors bg-[#FAF9F6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1.5 uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                      <Key className="w-4 h-4 text-neutral-600" />
                    </span>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white transition-colors bg-[#FAF9F6]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-[#FAF9F6] font-mono text-xs tracking-widest uppercase rounded-none transition border-2 border-neutral-900 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] mt-2"
              >
                Sign in
              </button>
            </form>
          ) : (
            /* ================= REGISTRATION FORM ================= */
            <form onSubmit={handleRegister} className="space-y-4.5">
              <div className="text-center mb-5">
                <h2 className="text-2xl font-serif italic font-bold text-neutral-950">Create Account</h2>
                <div className="w-12 h-[1px] bg-neutral-900 mx-auto my-2.5"></div>
                <p className="text-[11px] text-neutral-500 font-mono uppercase tracking-wider">JOIN AS CUSTOMER OR BRAND SELLER</p>
              </div>

              {regError && (
                <div className="p-3.5 bg-rose-50 border border-rose-950 text-rose-950 rounded-none text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="space-y-3.5">
                {/* Role Switcher Button Group */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-400 mb-1.5 uppercase tracking-widest">I AM REGISTERING AS A:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole('buyer')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-none border-2 text-xs font-mono uppercase tracking-widest transition-all ${
                        regRole === 'buyer'
                          ? 'border-neutral-900 bg-neutral-900 text-[#FAF9F6]'
                          : 'border-neutral-300 bg-white text-neutral-500 hover:border-neutral-950 hover:text-neutral-950'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Buyer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('seller')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-none border-2 text-xs font-mono uppercase tracking-widest transition-all ${
                        regRole === 'seller'
                          ? 'border-neutral-900 bg-neutral-900 text-[#FAF9F6]'
                          : 'border-neutral-300 bg-white text-neutral-500 hover:border-neutral-950 hover:text-neutral-950'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      Seller
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-widest">Username</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Minimal 4 characters"
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white bg-[#FAF9F6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-widest">Full Name</label>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-widest">Email Address</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white bg-[#FAF9F6]"
                    />
                  </div>
                </div>

                {regRole === 'seller' && (
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-purple-700 mb-1 uppercase tracking-widest">Store or Brand name</label>
                    <input
                      type="text"
                      value={regStoreName}
                      onChange={(e) => setRegStoreName(e.target.value)}
                      placeholder="e.g. Vintage Apparel Shop"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-none border-2 border-purple-900 focus:outline-none focus:bg-white bg-purple-50/10 font-bold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-widest">Password</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-500 mb-1 uppercase tracking-widest">Confirm Password</label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-none border border-neutral-900 focus:outline-none focus:bg-white bg-[#FAF9F6]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-[#FAF9F6] font-mono text-xs tracking-widest uppercase rounded-none transition border-2 border-neutral-900 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] mt-4"
              >
                Register Account
              </button>
            </form>
          )}

        </div>

      </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-6 text-xs font-mono font-bold uppercase tracking-widest text-neutral-600 hover:text-neutral-900 border-b border-dashed border-neutral-400 hover:border-neutral-900 transition-all pb-0.5"
        >
          ← Or Continue Browsing as Guest
        </button>
      )}
    </div>
  );
}
