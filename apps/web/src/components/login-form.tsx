"use client"
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true)
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })
      if (result?.error) {
        toast.error("Invalid Credential")
      } else {
        router.push("/play")
      }
    } catch (err) {
      toast.error("Something went wrong")
      console.log(err);
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm z-10"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group">
            <span className="text-white text-4xl leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] transition-all duration-300">♞</span>
            <span className="text-lg font-semibold text-white tracking-tight">chess</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-[#222] bg-[#111] p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-sm text-white/40 mt-1">Sign in to your account to continue</p>
          </div>

          {/* Features hint */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { icon: Sparkles, label: 'AI Coach' },
              { icon: Shield, label: 'Secure' },
              { icon: Zap, label: 'Fast' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <item.icon className="w-4 h-4 text-white/30" />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                className="w-full px-4 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#222] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#444] focus:ring-1 focus:ring-white/10 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/60" htmlFor="password">
                  Password
                </label>
                <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-[#0a0a0a] border border-[#222] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#444] focus:ring-1 focus:ring-white/10 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-2.5 bg-white text-[#0a0a0a] rounded-lg font-medium text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#0a0a0a]/20 border-t-[#0a0a0a] rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-white/30">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-white/60 hover:text-white transition-colors font-medium">
              Create one
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/20">
            By signing in, you agree to our{' '}
            <Link href="#" className="hover:text-white/40 transition-colors">Terms</Link>
            {' '}and{' '}
            <Link href="#" className="hover:text-white/40 transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
