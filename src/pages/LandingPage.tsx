import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Architecture } from '../components/Architecture';
import { 
  Bot, Github, Terminal, GitPullRequest, GitMerge, CheckCircle, 
  Code, Tag, Bug, FolderTree, Zap, Shield, ArrowRight, Menu, X, 
  ChevronRight, Star, ExternalLink, Activity, Server, Database, Cpu, Globe
} from 'lucide-react';

import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef, useMemo, useLayoutEffect } from 'react';

// --- Three.js Background ---
function Circuits() {
  const linesRef = useRef<THREE.LineSegments>(null);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.LineDashedMaterial>(null);
  
  const { positions, colors } = useMemo(() => {
    const points: number[] = [];
    const cols: number[] = [];
    const color1 = new THREE.Color('#00FF88'); // Green
    const color2 = new THREE.Color('#58A6FF'); // Blue
    const color3 = new THREE.Color('#A855F7'); // Purple
    
    const colorsArr = [color1, color2, color3];

    for (let i = 0; i < 250; i++) {
      let x = (Math.random() - 0.5) * 40;
      let y = (Math.random() - 0.5) * 40;
      let z = (Math.random() - 0.5) * 20 - 10;
      
      const pathLength = Math.floor(Math.random() * 6) + 2;
      const c = colorsArr[Math.floor(Math.random() * colorsArr.length)];

      for (let j = 0; j < pathLength; j++) {
        points.push(x, y, z);
        cols.push(c.r, c.g, c.b);
        
        const dir = Math.floor(Math.random() * 3);
        const dist = (Math.random() * 4 + 1) * (Math.random() > 0.5 ? 1 : -1);
        if (dir === 0) x += dist;
        else if (dir === 1) y += dist;
        else z += dist;
        
        points.push(x, y, z);
        cols.push(c.r, c.g, c.b);
      }
    }
    return {
      positions: new Float32Array(points),
      colors: new Float32Array(cols)
    };
  }, []);

  useLayoutEffect(() => {
    if (linesRef.current) {
      linesRef.current.computeLineDistances();
    }
  }, []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      (materialRef.current as any).dashOffset -= delta * 4; // Speed of data flow
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      linesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
    }
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineDashedMaterial
        ref={materialRef}
        vertexColors
        transparent
        opacity={0.35}
        dashSize={0.8}
        gapSize={2.5}
        linewidth={1}
      />
    </lineSegments>
  );
}

function DataNodes() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(200 * 3);
    for(let i=0; i<200; i++) {
      pos[i*3] = (Math.random() - 0.5) * 40;
      pos[i*3+1] = (Math.random() - 0.5) * 40;
      pos[i*3+2] = (Math.random() - 0.5) * 20 - 10;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
      const material = ref.current.material as THREE.PointsMaterial;
      material.size = 0.06 + Math.sin(state.clock.elapsedTime * 4) * 0.03;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={200} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00FF88" size={0.08} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </points>
  );
}

const HeroBackground = () => (
  <div className="absolute inset-0 z-0 opacity-70">
    <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
      <fog attach="fog" args={['#0D1117', 5, 25]} />
      <Circuits />
      <DataNodes />
    </Canvas>
  </div>
);

// --- Custom Hooks ---

function useTypewriter(lines: string[], typingSpeed = 30, lineDelay = 500, loopDelay = 5000) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
      }, loopDelay);
      return () => clearTimeout(timeout);
    }

    const currentLine = lines[currentLineIndex];

    if (currentCharIndex < currentLine.length) {
      const timeout = setTimeout(() => {
        setCurrentCharIndex(prev => prev + 1);
      }, typingSpeed);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => [...prev, currentLine]);
        setCurrentLineIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, lineDelay);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex, lines, typingSpeed, lineDelay, loopDelay]);

  const currentTypingLine = lines[currentLineIndex]?.substring(0, currentCharIndex) || '';

  return { displayedLines, currentTypingLine, isComplete: currentLineIndex >= lines.length };
}

function useLineReveal(lines: string[], lineDelay = 800, loopDelay = 5000) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= lines.length) {
      const timeout = setTimeout(() => {
        setVisibleCount(0);
      }, loopDelay);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      setVisibleCount(prev => prev + 1);
    }, lineDelay);

    return () => clearTimeout(timeout);
  }, [visibleCount, lines.length, lineDelay, loopDelay]);

  return { visibleLines: lines.slice(0, visibleCount), isComplete: visibleCount >= lines.length };
}

// --- Animation Variants ---

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const flipCard = {
  hidden: { opacity: 0, rotateY: -90 },
  visible: { opacity: 1, rotateY: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

// --- Components ---

export const LandingPage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroLines = [
    "> contribot run --issue 42",
    "Analyzing issue context...",
    "Writing implementation...",
    "Creating Pull Request...",
    "4/4 AI models approved.",
    "Safe to merge! 🚀"
  ];
  const { displayedLines: heroDisplayed, currentTypingLine: heroTyping } = useTypewriter(heroLines, 40, 600);

  const demoLines = [
    '[ContriBot] 🔍 Analyzing issue #42: "Add dark mode toggle"',
    '[ContriBot] 📁 Reading 23 files (src/, components/, styles/)',
    '[ContriBot] 🧠 Generating implementation with Gemini 3.1 Pro...',
    '[ContriBot] ✅ Code written: 4 files modified, 1 file created',
    '[ContriBot] 🌿 Branch created: contribot/issue-42-dark-mode-toggle',
    '[ContriBot] 📬 PR #15 opened: "feat(ui): add dark mode toggle"',
    '[ContriBot] 🔍 Running 4-model verification...',
    '  → gemini-3.1-pro-preview: ✅ Approved (9/10)',
    '  → gemini-3-flash-preview:  ✅ Approved (8/10)',
    '  → gemini-2.5-pro:          ✅ Approved (9/10)',
    '  → gemini-2.5-flash:        ✅ Approved (8/10)',
    '[ContriBot] 🎉 CONSENSUS: 4/4 — Safe to merge!',
    '[ContriBot] 💬 Notifying owner @you to review and merge'
  ];
  const { visibleLines: demoVisible } = useLineReveal(demoLines, 700, 6000);

  return (
    <div className="min-h-screen bg-[#0D1117] text-gray-300 font-sans selection:bg-[#00FF88]/30 overflow-x-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        .glow-text {
          text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
        }
        .glow-box {
          box-shadow: 0 0 30px rgba(0, 255, 136, 0.15);
        }
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      {/* Section 1: Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 backdrop-blur-md ${isScrolled ? 'bg-[#0D1117]/80 border-b border-[#00FF88]/20 shadow-[0_0_15px_rgba(0,255,136,0.1)] py-3' : 'bg-transparent border-b border-transparent shadow-none py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FF88] to-[#58A6FF] flex items-center justify-center shadow-lg shadow-[#00FF88]/20 overflow-hidden">
              <img src="/contribot-logo.png" alt="ContriBot Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">ContriBot</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">How it Works</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2">
              <Github className="w-4 h-4" /> GitHub
            </a>
            <Link to="/login" className="px-5 py-2.5 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] hover:from-[#00FF88] hover:to-[#00FF88] text-[#0D1117] font-semibold rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:shadow-[0_0_25px_rgba(0,255,136,0.5)]">
              Launch App
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-[#161B22] border-b border-gray-800 overflow-hidden"
            >
              <div className="flex flex-col px-6 py-4 gap-4">
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white font-medium">Features</a>
                <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white font-medium">How it Works</a>
                <Link to="/login" className="text-center px-5 py-3 bg-[#00FF88] text-[#0D1117] font-semibold rounded-lg">
                  Launch App
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Section 2: Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <HeroBackground />

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="text-center lg:text-left">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#161B22] border border-gray-800 mb-6">
              <SparklesIcon className="w-4 h-4 text-[#58A6FF]" />
              <span className="text-sm font-medium text-gray-300">Powered by Gemini AI</span>
              <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-ping ml-1"></div>
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
              Your GitHub Repos, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-[#58A6FF] glow-text">
                Managed by AI
              </span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              ContriBot writes code, reviews PRs with 4 AI models, manages releases, and handles your entire GitHub workflow — autonomously.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/docs?doc=setup" className="w-full sm:w-auto px-8 py-4 bg-[#00FF88] hover:bg-[#00CC6A] text-[#0D1117] font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] hover:-translate-y-1">
                Read Docs <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="w-full sm:w-auto px-8 py-4 bg-[#161B22] hover:bg-gray-800 text-white font-semibold rounded-xl border border-gray-700 transition-all flex items-center justify-center gap-2 hover:-translate-y-1">
                <Github className="w-5 h-5" /> View on GitHub
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-12 flex flex-wrap justify-center lg:justify-start gap-4">
              <Badge icon={<Cpu />} text="4 AI Models" />
              <Badge icon={<Tag />} text="Semantic Versioning" />
              <Badge icon={<Shield />} text="Auto PR Review" />
            </motion.div>
          </motion.div>

          {/* Hero Visual: Terminal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative perspective-1000"
          >
            <div className="bg-[#161B22] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl glow-box transform rotate-y-[-5deg] rotate-x-[5deg]">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0D1117] border-b border-gray-800">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-2 text-xs font-mono text-gray-500">contribot-agent ~ zsh</span>
              </div>
              <div className="p-6 font-mono text-sm leading-relaxed h-[280px] overflow-hidden">
                {heroDisplayed.map((line, i) => (
                  <div key={i} className={line.includes("Safe to merge") ? "text-[#00FF88] font-bold mt-2" : "text-gray-300"}>
                    {line}
                  </div>
                ))}
                <div className="text-gray-300">
                  {heroTyping}
                  <span className="inline-block w-2 h-4 bg-[#00FF88] ml-1 animate-pulse"></span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section id="how-it-works" className="py-32 bg-[#0D1117] relative border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">From Issue to Release, <span className="text-[#58A6FF]">Automatically</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">ContriBot seamlessly integrates into your existing GitHub workflow, acting as a tireless senior engineer on your team.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-gray-800 via-[#00FF88]/50 to-gray-800 -translate-y-1/2 z-0"></div>

            <StepCard 
              number="01"
              icon={<Bug className="w-8 h-8 text-[#58A6FF]" />}
              title="Issue Detected"
              description="ContriBot analyzes new issues, classifies them, and waits for your approval to begin implementation."
              delay={0.1}
            />
            <StepCard 
              number="02"
              icon={<Code className="w-8 h-8 text-[#00FF88]" />}
              title="Code Written"
              description="Gemini 3.1 Pro reads your entire repo context, writes production-ready code, and opens a Pull Request."
              delay={0.3}
            />
            <StepCard 
              number="03"
              icon={<Shield className="w-8 h-8 text-purple-400" />}
              title="Multi-Model Verified"
              description="4 different AI models review the PR. If consensus is reached, you merge, and a release is auto-published."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Section 4: Features Grid */}
      <section id="features" className="py-32 bg-[#161B22] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Everything a <span className="text-[#00FF88]">Senior Dev</span> Would Do</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">Built with deep understanding of software engineering principles and GitHub best practices.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Cpu className="w-6 h-6 text-[#00FF88]" />}
              title="Intelligent Code Writing"
              description="Uses Gemini 3.1 Pro to write full implementations. Style-aware, context-aware, and production-quality."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-[#58A6FF]" />}
              title="4-Model PR Verification"
              description="Consensus-based reviews using Gemini 3.1 Pro, 3 Flash, 2.5 Pro, and 2.5 Flash to catch bugs and security flaws."
            />
            <FeatureCard 
              icon={<Tag className="w-6 h-6 text-purple-400" />}
              title="Semantic Versioning"
              description="Automatically determines patch/minor/major bumps based on PRs and generates beautiful release notes."
            />
            <FeatureCard 
              icon={<Activity className="w-6 h-6 text-yellow-400" />}
              title="Issue Intelligence"
              description="Auto-classifies issues, prioritizes them, and analyzes implementation complexity before writing a single line."
            />
            <FeatureCard 
              icon={<FolderTree className="w-6 h-6 text-pink-400" />}
              title="Full Repo Understanding"
              description="Builds an ASCII tree and reads all key files to maintain deep context for every architectural decision."
            />
            <FeatureCard 
              icon={<Github className="w-6 h-6 text-white" />}
              title="GitHub Native"
              description="Operates entirely via GitHub APIs. Webhooks, branches, PRs, and releases feel like they were made by a human."
            />
          </div>
        </div>
      </section>

      {/* Section 5: Multi-Model Verification Showcase */}
      <section className="py-32 bg-[#0D1117] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[300px] bg-[#58A6FF]/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Unprecedented Code Safety</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Every PR generated by ContriBot is independently reviewed by 4 different AI models. Only when consensus is reached is it marked safe to merge.</p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
          >
            <ModelCard name="Gemini 3.1 Pro" score="9/10" desc="Excellent architecture, no security flaws found." />
            <ModelCard name="Gemini 3 Flash" score="8/10" desc="Code is clean. Minor suggestion on variable naming." />
            <ModelCard name="Gemini 2.5 Pro" score="9/10" desc="Logic is sound. Edge cases are handled properly." />
            <ModelCard name="Gemini 2.5 Flash" score="8/10" desc="LGTM. Performance is optimal." />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="max-w-3xl mx-auto bg-gradient-to-r from-[#00FF88]/20 to-[#00CC6A]/20 border border-[#00FF88]/50 rounded-2xl p-6 text-center glow-box"
          >
            <h3 className="text-2xl font-bold text-[#00FF88] flex items-center justify-center gap-3">
              <CheckCircle className="w-8 h-8" /> CONSENSUS: 4/4 — Safe to Merge
            </h3>
            <p className="text-[#00FF88]/80 mt-2">You always have the final say. Only you can click Merge.</p>
          </motion.div>
        </div>
      </section>

      {/* Section 6: Terminal Demo Section */}
      <section className="py-32 bg-[#161B22] border-y border-gray-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Watch ContriBot Think</h2>
            <p className="text-gray-400">Real-time activity logs straight from the agent's brain.</p>
          </div>

          <div className="bg-[#0D1117] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#161B22] border-b border-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs font-mono text-gray-500">activity.log</span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed h-[400px] overflow-y-auto">
              {demoVisible.map((line, i) => {
                let colorClass = "text-gray-300";
                if (line.includes("✅") || line.includes("🎉")) colorClass = "text-[#00FF88]";
                if (line.includes("🧠") || line.includes("🔍")) colorClass = "text-[#58A6FF]";
                if (line.includes("🌿") || line.includes("📬")) colorClass = "text-purple-400";
                
                return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`${colorClass} mb-1`}
                  >
                    {line}
                  </motion.div>
                );
              })}
              <div className="w-2 h-4 bg-gray-500 animate-pulse mt-1"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Capability Stack */}
      <section className="py-24 bg-[#0D1117] overflow-hidden">
        <div className="text-center mb-12">
          <p className="text-sm font-bold tracking-widest text-gray-500 uppercase">Powered By Industry Leaders</p>
        </div>
        
        <div className="relative w-full max-w-7xl mx-auto">
          {/* Gradient Masks for smooth fade on edges */}
          <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#0D1117] to-transparent z-10"></div>
          <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#0D1117] to-transparent z-10"></div>
          
          <div className="flex w-[200%] animate-marquee">
            {/* Double the logos for seamless infinite scroll */}
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex w-1/2 justify-around items-center px-4">
                <TechLogo icon={<SparklesIcon />} name="Gemini AI" />
                <TechLogo icon={<Github />} name="GitHub" />
                <TechLogo icon={<Database />} name="Supabase" />
                <TechLogo icon={<Globe />} name="HuggingFace" />
                <TechLogo icon={<Server />} name="FastAPI" />
                <TechLogo icon={<Zap />} name="Vercel" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Architecture />

      {/* Section 8: Open Source Banner */}
      <section className="py-24 bg-gradient-to-r from-[#0D1117] via-[#00FF88]/10 to-[#0D1117] border-y border-[#00FF88]/20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">100% Open Source — GPL-3.0</h2>
          <p className="text-xl text-[#00FF88] mb-8">Built for developers, by a developer. Fork it, extend it, own it.</p>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-200 text-[#0D1117] font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            <Github className="w-5 h-5" /> View Source Code
          </a>
        </div>
      </section>

      {/* Section 9: Footer */}
      <footer className="bg-[#0D1117] py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FF88] to-[#58A6FF] flex items-center justify-center overflow-hidden">
              <img src="/contribot-logo.png" alt="ContriBot Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-white">ContriBot</span>
          </div>
          
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-[#00FF88] transition-colors">Docs</a>
            <a href="#" className="hover:text-[#00FF88] transition-colors">GitHub</a>
            <a href="#" className="hover:text-[#00FF88] transition-colors">License</a>
            <a href="#" className="hover:text-[#00FF88] transition-colors">Roadmap</a>
          </div>
          
          <div className="text-sm text-gray-500 text-center md:text-right">
            <p>Built with Gemini AI</p>
            <p>Deployed on HuggingFace Spaces</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Subcomponents ---

const Badge = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#161B22] border border-gray-700 text-gray-300 text-sm font-medium shadow-sm">
    <span className="text-[#00FF88]">{icon}</span>
    {text}
  </div>
);

const StepCard = ({ number, icon, title, description, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay }}
    className="bg-[#161B22] border border-gray-800 rounded-2xl p-8 relative z-10 hover:border-gray-600 transition-colors"
  >
    <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#0D1117] border border-gray-800 rounded-full flex items-center justify-center font-mono font-bold text-gray-500">
      {number}
    </div>
    <div className="mb-6 p-4 bg-[#0D1117] rounded-xl inline-block border border-gray-800">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

const FeatureCard = ({ icon, title, description }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-[#161B22] border border-gray-800 hover:border-[#00FF88]/50 rounded-2xl p-6 transition-all duration-300 group"
  >
    <div className="w-12 h-12 rounded-lg bg-[#0D1117] border border-gray-800 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(0,255,136,0.2)] transition-shadow">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

const ModelCard = ({ name, score, desc }: any) => (
  <motion.div variants={flipCard} className="bg-[#161B22] border border-gray-800 rounded-xl p-5 flex flex-col h-full">
    <div className="flex justify-between items-start mb-4">
      <h4 className="font-bold text-gray-200">{name}</h4>
      <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> {score}
      </span>
    </div>
    <p className="text-sm text-gray-400 mt-auto">{desc}</p>
  </motion.div>
);

const TechLogo = ({ icon, name }: any) => (
  <div className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors cursor-default group">
    <div className="group-hover:text-[#58A6FF] transition-colors">{icon}</div>
    <span className="font-bold text-lg tracking-tight">{name}</span>
  </div>
);

// Custom Sparkles Icon since lucide-react might not have it in all versions
const SparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </svg>
);
