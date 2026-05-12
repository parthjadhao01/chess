// app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { 
  ChevronRight, 
  ArrowRight,
  Play,
  Brain,
  Users,
  Eye,
  Zap,
  BarChart3,
  MessageSquare,
  Globe,
  Clock,
  Target,
  Layers,
  Sparkles,
  TrendingUp,
  Shield,
  Command
} from 'lucide-react';
import Link from 'next/link';

// Vercel-style geometric grid background
const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
  </div>
);

// Vercel-style gradient orb
const GradientOrb = ({ className }: { className?: string }) => (
  <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} 
    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }} 
  />
);

// Animated counter
const Counter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);
  
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// Vercel-style feature card
const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  href,
  index
}: { 
  icon: any; 
  title: string; 
  description: string; 
  href: string;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ delay: index * 0.1, duration: 0.5 }}
    className="group relative"
  >
    <Link href={href} className="block">
      <div className="relative p-6 rounded-xl border border-[#333] bg-[#111] hover:border-[#444] hover:bg-[#1a1a1a] transition-all duration-300 h-full">
        <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
          <Icon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-sm text-white/50 leading-relaxed group-hover:text-white/60 transition-colors">
          {description}
        </p>
        <div className="mt-4 flex items-center gap-1 text-sm text-white/30 group-hover:text-white/50 transition-colors">
          <span>Learn more</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  </motion.div>
);

// Vercel-style code block / terminal
const Terminal = () => {
  const [lines, setLines] = useState<string[]>([]);
  const commands = [
    '> Analyzing position...',
    '> Eval: +2.4 (White advantage)',
    '> Best move: Nf3 (Knight to f3)',
    '> Threat: Black queen on d8',
    '> Recommended: Develop pieces',
    '> Analysis complete ✓'
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < commands.length) {
        setLines(prev => [...prev, commands[i]]);
        i++;
      } else {
        setTimeout(() => {
          setLines([]);
          i = 0;
        }, 3000);
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto rounded-lg overflow-hidden border border-[#333] bg-[#0a0a0a] shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222] bg-[#111]">
        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        <span className="ml-2 text-xs text-white/30 font-mono">claude-analysis.ts</span>
      </div>
      <div className="p-4 font-mono text-sm space-y-1 min-h-[180px]">
        <div className="text-white/30">$ chess-ai analyze --game=latest</div>
        <AnimatePresence mode="wait">
          {lines.map((line, i) => (
            line && (
              <motion.div
                key={`${line}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className={`${
                  line.includes('✓') 
                    ? 'text-emerald-400' 
                    : line.includes('+2.4') 
                      ? 'text-amber-400' 
                      : 'text-white/70'
                }`}
              >
                {line}
              </motion.div>
            )
          ))}
        </AnimatePresence>
        <motion.div 
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-2 h-4 bg-white/50 inline-block align-middle"
        />
      </div>
    </div>
  );
};

// Vercel-style hero chess board (minimal, geometric)
const HeroBoard = () => {
  const [hovered, setHovered] = useState<number | null>(null);
  
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="grid grid-cols-8 gap-0 rounded-lg overflow-hidden border border-[#333] shadow-2xl">
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isLight = (row + col) % 2 === 0;
          const isHovered = hovered === i;
          
          return (
            <motion.div
              key={i}
              className={`aspect-square flex items-center justify-center text-lg cursor-pointer relative
                ${isLight ? 'bg-[#1a1a1a]' : 'bg-[#0f0f0f]'}
              `}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              whileHover={{ scale: 1.15, zIndex: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {isHovered && (
                <motion.div 
                  layoutId="hover"
                  className="absolute inset-0 bg-white/5 rounded-sm"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              {(row === 1 || row === 6) && (
                <div className={`w-2 h-2 rounded-full ${row === 1 ? 'bg-white/20' : 'bg-white/10'}`} />
              )}
              {(row === 0 || row === 7) && (col === 0 || col === 7) && (
                <div className={`w-3 h-3 rotate-45 ${row === 0 ? 'bg-white/20' : 'bg-white/10'}`} />
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="absolute -inset-4 bg-gradient-to-r from-white/5 to-transparent rounded-xl blur-2xl -z-10" />
    </div>
  );
};

// Marquee / ticker component (Vercel style)
const Ticker = () => {
  const items = ['Blitz', 'Rapid', 'Classical', 'Bullet', 'Correspondence', '960', 'Crazyhouse', '3-Check'];
  
  return (
    <div className="relative overflow-hidden py-8 border-y border-[#222] bg-[#0a0a0a]">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10" />
      <motion.div 
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
      >
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} className="text-sm font-medium text-white/20 uppercase tracking-widest">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

export default function ChessLandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/20">
      {/* Progress bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[2px] bg-white z-50 origin-left"
        style={{ scaleX }}
      />
      
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#222]' : ''
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
              <span className="text-[#0a0a0a] text-lg font-bold">♔</span>
            </div>
            <span className="font-semibold tracking-tight">chess-ai</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-white/50 hover:text-white transition-colors">Features</Link>
            <Link href="#analysis" className="text-sm text-white/50 hover:text-white transition-colors">Analysis</Link>
            <Link href="#multiplayer" className="text-sm text-white/50 hover:text-white transition-colors">Multiplayer</Link>
            <Link href="#spectate" className="text-sm text-white/50 hover:text-white transition-colors">Spectate</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="#" className="hidden md:block text-sm text-white/50 hover:text-white transition-colors">
              Documentation
            </Link>
            <button className="px-4 py-2 rounded-md bg-white text-[#0a0a0a] text-sm font-medium hover:bg-white/90 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <GridBackground />
        <GradientOrb className="w-[600px] h-[600px] -top-40 -right-40" />
        <GradientOrb className="w-[400px] h-[400px] top-1/2 -left-40" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#111] text-xs text-white/60 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Now with Claude 3.7 Sonnet
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
                  The chess platform{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                    for the AI era
                  </span>
                </h1>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-lg md:text-xl text-white/40 max-w-lg leading-relaxed"
              >
                Play against Claude, analyze your games with natural language explanations, 
                and compete in real-time multiplayer matches.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex flex-wrap gap-4"
              >
                <button className="group px-6 py-3 bg-white text-[#0a0a0a] rounded-md font-medium text-sm hover:bg-white/90 transition-all flex items-center gap-2">
                  Start Playing
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button className="px-6 py-3 border border-[#333] rounded-md font-medium text-sm hover:border-[#444] hover:bg-[#111] transition-all flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Watch Demo
                </button>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="pt-4 flex items-center gap-6 text-sm text-white/30"
              >
                <div className="flex items-center gap-2">
                  <Command className="w-4 h-4" />
                  <span>npm install chess-ai</span>
                </div>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="hidden lg:block"
            >
              <HeroBoard />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <Ticker />

      {/* Stats */}
      <section className="py-20 border-b border-[#222]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 50000, label: 'Active Players', suffix: '+' },
              { value: 1.2, label: 'Games Analyzed', suffix: 'M', isDecimal: true },
              { value: 99.9, label: 'Uptime', suffix: '%', isDecimal: true },
              { value: 150, label: 'Countries', suffix: '+' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold tracking-tight mb-1">
                  {stat.isDecimal ? stat.value : <Counter target={stat.value} />}
                  {stat.suffix}
                </div>
                <div className="text-sm text-white/40">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 relative">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need to improve
            </h2>
            <p className="text-lg text-white/40 max-w-2xl">
              From AI-powered training to competitive multiplayer, all the tools to master chess.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard
              icon={Brain}
              title="Play with Claude AI"
              description="Challenge Claude or any LLM at your skill level. Get personalized coaching, adaptive difficulty, and learn from every move."
              href="#"
              index={0}
            />
            <FeatureCard
              icon={BarChart3}
              title="AI Game Analysis"
              description="Upload your games and receive deep analysis. Understand mistakes, discover missed opportunities, and get actionable insights."
              href="#"
              index={1}
            />
            <FeatureCard
              icon={Users}
              title="Multiplayer Arena"
              description="Challenge friends or match globally. Real-time games with live chat, custom time controls, and rated matches."
              href="#"
              index={2}
            />
            <FeatureCard
              icon={Eye}
              title="Spectate & Learn"
              description="Watch live games from top players. Interactive spectating with move predictions and community commentary."
              href="#"
              index={3}
            />
          </div>
        </div>
      </section>

      {/* Analysis */}
      <section id="analysis" className="py-32 border-y border-[#222] relative overflow-hidden">
        <GradientOrb className="w-[500px] h-[500px] top-0 right-0" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#111] text-xs text-white/60">
                <Sparkles className="w-3 h-3" />
                Claude Integration
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Your personal chess coach,{' '}
                <span className="text-white/50">powered by AI</span>
              </h2>
              <p className="text-lg text-white/40 leading-relaxed">
                Unlike traditional engines that just show the best move, Claude explains the reasoning. 
                Understand strategic concepts, tactical patterns, and positional ideas that matter.
              </p>
              
              <div className="space-y-3 pt-4">
                {[
                  { icon: Zap, text: 'Real-time move suggestions with explanations' },
                  { icon: Target, text: 'Identify blunders and learn alternatives' },
                  { icon: TrendingUp, text: 'Track improvement with progress reports' },
                  { icon: Layers, text: 'Study famous games with AI walkthroughs' },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-sm text-white/50"
                  >
                    <item.icon className="w-4 h-4 text-white/30" />
                    {item.text}
                  </motion.div>
                ))}
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Terminal />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Multiplayer */}
      <section id="multiplayer" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Play against anyone, anywhere
            </h2>
            <p className="text-lg text-white/40">
              From casual blitz to classical tournaments, find your perfect match.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'Blitz', time: '3+2', players: 1240, color: 'from-emerald-500/20 to-emerald-500/5' },
              { title: 'Rapid', time: '10+0', players: 892, color: 'from-amber-500/20 to-amber-500/5' },
              { title: 'Classical', time: '30+20', players: 456, color: 'from-blue-500/20 to-blue-500/5' },
            ].map((mode, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative p-6 rounded-xl border border-[#222] bg-[#111] hover:border-[#333] transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">{mode.title}</h3>
                    <Clock className="w-5 h-5 text-white/30" />
                  </div>
                  <div className="text-3xl font-mono font-bold text-white/20 mb-4 group-hover:text-white/40 transition-colors">
                    {mode.time}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/40 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {mode.players.toLocaleString()} playing
                    </span>
                    <button className="px-4 py-2 rounded-md bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                      Play
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Spectate */}
      <section id="spectate" className="py-32 border-y border-[#222]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="space-y-2">
                {[1, 2, 3, 4].map((game) => (
                  <motion.div
                    key={game}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: game * 0.1 }}
                    className="group flex items-center gap-4 p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] hover:bg-[#1a1a1a] transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-md bg-[#222] flex items-center justify-center text-lg">
                      {game % 2 === 0 ? '♘' : '♕'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-white truncate">Player_{game}</span>
                        <span className="text-white/30">vs</span>
                        <span className="font-medium text-white truncate">Opponent_{game}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/30">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {game === 1 ? '3+2' : game === 2 ? '10+0' : game === 3 ? '5+3' : '15+10'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {game * 234}
                        </span>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                      LIVE
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#111] text-xs text-white/60">
                <Globe className="w-3 h-3" />
                Live Spectating
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Watch & learn from{' '}
                <span className="text-white/50">top players</span>
              </h2>
              <p className="text-lg text-white/40 leading-relaxed">
                Spectate live games with interactive features. See predicted moves, join the conversation, 
                and learn from every decision. Follow your favorite players and never miss a brilliant combination.
              </p>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                  <Globe className="w-5 h-5 text-white/30 mb-2" />
                  <p className="text-sm font-medium text-white/70">Global Tournaments</p>
                  <p className="text-xs text-white/30 mt-1">Follow major events live</p>
                </div>
                <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                  <MessageSquare className="w-5 h-5 text-white/30 mb-2" />
                  <p className="text-sm font-medium text-white/70">Live Chat</p>
                  <p className="text-xs text-white/30 mt-1">Discuss with community</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <GradientOrb className="w-[800px] h-[800px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6">
              Ready to make your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30">
                first move?
              </span>
            </h2>
            <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
              Join thousands of players improving their game with AI-powered training and competitive play.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <button className="group px-8 py-4 bg-white text-[#0a0a0a] rounded-md font-medium hover:bg-white/90 transition-all flex items-center gap-2">
                Start Playing Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button className="px-8 py-4 border border-[#333] rounded-md font-medium hover:border-[#444] hover:bg-[#111] transition-all">
                View Pricing
              </button>
            </div>
            
            <p className="mt-8 text-sm text-white/20">
              No credit card required. Free tier includes unlimited games against AI.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222] py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
                  <span className="text-[#0a0a0a] text-lg font-bold">♔</span>
                </div>
                <span className="font-semibold">chess-ai</span>
              </div>
              <p className="text-sm text-white/30 leading-relaxed">
                The chess platform for the AI era. Powered by Claude and Next.js.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white/50 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-white/30">
                <li><Link href="#" className="hover:text-white transition-colors">Play vs AI</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Analysis</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Multiplayer</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Spectate</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white/50 mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-white/30">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Openings Database</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Community</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white/50 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-white/30">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-[#222] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/20">© 2026 Chess AI, Inc. All rights reserved.</p>
            <div className="flex gap-6 text-xs text-white/20">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Status</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}