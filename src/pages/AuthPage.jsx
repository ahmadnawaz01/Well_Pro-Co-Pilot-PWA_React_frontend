import React, { useState } from 'react';
import { authService } from '../services/authService';
import { validateAuthForm, getReadableAuthError } from '../utils/authValidation';
import { Cpu, ShieldCheck, AlertCircle } from 'lucide-react';

export function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Client-Side Validation Check
    const validationError = validateAuthForm({
      isLogin,
      email,
      password,
      firstName
    });

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);

    // 2. API Call with Friendly Error Handling
    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.signup({
          email,
          password,
          first_name: firstName,
          last_name: lastName
        });
      }
      onAuthSuccess();
    } catch (err) {
      // Translate HTTP code / Frappe error to user-friendly message
      const friendlyError = getReadableAuthError(err, isLogin);
      setErrorMsg(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d12] text-[#f0f4f8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121820]/80 backdrop-blur-xl border border-[#2a3644] rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Header Branding */}
        <div className="flex items-center gap-3 border-b border-[#2a3644] pb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">WELLPRO CO-PILOT</h1>
            <span className="font-mono text-[10px] text-[#06b6d4] tracking-widest block">SECURE SYSTEM AUTHENTICATION</span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-[#1a232e] p-1 rounded-xl border border-[#2a3644]">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
            className={`flex-1 py-2 font-mono text-xs font-bold rounded-lg transition-all ${
              isLogin ? 'bg-[#f43f5e] text-white shadow-lg' : 'text-[#8a99ad] hover:text-white'
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            className={`flex-1 py-2 font-mono text-xs font-bold rounded-lg transition-all ${
              !isLogin ? 'bg-[#f43f5e] text-white shadow-lg' : 'text-[#8a99ad] hover:text-white'
            }`}
          >
            SIGN UP
          </button>
        </div>

        {/* User-Friendly Error Alert */}
        {errorMsg && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 p-3 rounded-xl font-sans text-xs flex items-start gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm" noValidate>
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] text-[#8a99ad] block mb-1">FIRST NAME *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl focus:outline-none focus:border-[#f43f5e]"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-[#8a99ad] block mb-1">LAST NAME</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl focus:outline-none focus:border-[#f43f5e]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="font-mono text-[10px] text-[#8a99ad] block mb-1">EMAIL ADDRESS *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl focus:outline-none focus:border-[#f43f5e]"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] text-[#8a99ad] block mb-1">PASSWORD *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#1a232e] border border-[#2a3644] text-white p-2.5 rounded-xl focus:outline-none focus:border-[#f43f5e]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all font-mono text-xs tracking-wider disabled:opacity-50"
          >
            {loading ? 'INITIALIZING...' : isLogin ? 'AUTHENTICATE SYSTEM' : 'CREATE USER PROFILE'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 font-mono text-[10px] text-[#8a99ad] pt-2 border-t border-[#2a3644]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
          <span>FRAPPE TOKEN ENCRYPTION ACTIVE</span>
        </div>
      </div>
    </div>
  );
}