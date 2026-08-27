'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import axios from 'axios';
import { BACKEND_URL } from '@/config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaticChessBoard } from '@/components/static-chess-board';

const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-[#0a0a0a]" />
  </div>
);

const GradientOrb = ({ className }: { className?: string }) => (
  <div
    className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
  />
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

function LoginTabForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const result = await signIn('credentials', { username, password, redirect: false });
      if (result?.error) {
        toast.error('Invalid credentials');
      } else {
        router.push('/play');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60" htmlFor="landing-login-username">
          Username
        </label>
        <input
          id="landing-login-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your username"
          required
          className="w-full px-3 py-2 rounded-md bg-[#0a0a0a] border border-[#222] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#444] focus:ring-1 focus:ring-white/10 transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60" htmlFor="landing-login-password">
          Password
        </label>
        <div className="relative">
          <input
            id="landing-login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-3 py-2 pr-9 rounded-md bg-[#0a0a0a] border border-[#222] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#444] focus:ring-1 focus:ring-white/10 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
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
        className="w-full py-2.5 bg-white text-[#0a0a0a] rounded-md font-medium text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-[#0a0a0a]/20 border-t-[#0a0a0a] rounded-full animate-spin" />
        ) : (
          <>
            Sign in
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </motion.button>
    </form>
  );
}

function SignupTabForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${BACKEND_URL}/api/signup`, { username, password });
      const result = await signIn('credentials', { username, password, redirect: false });
      if (result?.ok) {
        router.push('/play');
      } else {
        toast.success('Account created! Please log in.');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message ?? 'Something went wrong');
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60" htmlFor="landing-signup-username">
          Username
        </label>
        <input
          id="landing-signup-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your username"
          required
          className="w-full px-3 py-2 rounded-md bg-[#0a0a0a] border border-[#222] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#444] focus:ring-1 focus:ring-white/10 transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60" htmlFor="landing-signup-password">
          Password
        </label>
        <div className="relative">
          <input
            id="landing-signup-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-3 py-2 pr-9 rounded-md bg-[#0a0a0a] border border-[#222] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#444] focus:ring-1 focus:ring-white/10 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60" htmlFor="landing-signup-confirm">
          Confirm password
        </label>
        <input
          id="landing-signup-confirm"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full px-3 py-2 rounded-md bg-[#0a0a0a] border border-[#222] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#444] focus:ring-1 focus:ring-white/10 transition-all"
        />
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full py-2.5 bg-white text-[#0a0a0a] rounded-md font-medium text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-[#0a0a0a]/20 border-t-[#0a0a0a] rounded-full animate-spin" />
        ) : (
          <>
            Create account
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </motion.button>
    </form>
  );
}

function AuthPanel() {
  return (
    <div className="w-full sm:w-[300px] shrink-0 rounded-xl border border-[#222] bg-[#111] p-4">
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="login">Log in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="pt-4">
          <LoginTabForm />
        </TabsContent>
        <TabsContent value="signup" className="pt-4">
          <SignupTabForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ChessLandingPage() {
  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] text-white flex flex-col">
      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden">
        <GridBackground />
        <GradientOrb className="w-150 h-150 -top-40 -right-40" />
        <GradientOrb className="w-100 h-100 top-1/2 -left-40" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-2xl mx-auto text-center space-y-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <a
                href="https://github.com/parthjadhao01/chess"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#111] text-xs text-white/60 mb-6 hover:border-[#444] hover:text-white/80 transition-all"
              >
                <GitHubIcon />
                Open source — ⭐️ us on GitHub
              </a>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
                The chess platform{' '}
                <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/50">
                  built in the open
                </span>
              </h1>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex justify-center"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 rounded-2xl border border-[#222] bg-[#111]/40 backdrop-blur-sm p-6">
              <div className="relative">
                <div className="rounded-lg overflow-hidden border border-[#333] shadow-2xl">
                  <StaticChessBoard squareClassName="w-14 h-14" />
                </div>
                <div className="absolute -inset-4 bg-linear-to-r from-white/5 to-transparent rounded-xl blur-2xl -z-10" />
              </div>
              <AuthPanel />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}