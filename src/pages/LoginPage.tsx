import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Github, Mail, Bot, GitPullRequest, Rocket, CheckCircle2, ArrowRight, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoginPage: React.FC = () => {
  const { supabaseUser, signInWithGoogle, signInWithGitHub } = useAuth();
  const navigate = useNavigate();
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  useEffect(() => {
    if (supabaseUser) {
      navigate('/dashboard');
    }
  }, [supabaseUser, navigate]);

  const handleGithubLogin = async () => {
    setIsLoadingGithub(true);
    await signInWithGitHub();
    setIsLoadingGithub(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    await signInWithGoogle();
    setIsLoadingGoogle(false);
  };

  const features = [
    {
      icon: <Bot className="w-5 h-5 text-green-400" />,
      title: 'Autonomous Issue Resolution',
      description: 'Gemini analyzes issues and writes production-ready code automatically.'
    },
    {
      icon: <GitPullRequest className="w-5 h-5 text-blue-400" />,
      title: 'Multi-Model PR Verification',
      description: '4 independent AI models review every PR for bugs and security flaws.'
    },
    {
      icon: <Rocket className="w-5 h-5 text-purple-400" />,
      title: 'Automated Semantic Releases',
      description: 'Auto-generates version bumps and Keep-a-Changelog formatted release notes.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex font-sans text-gray-100 selection:bg-green-500/30">
      {/* Left Panel - Marketing & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-gray-800 overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-0 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-gray-950 to-gray-950 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent blur-3xl"></div>
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSIjM2YzZjQ2IiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZD0iTTAgNDBoNDBWMEgweiIvPjwvZz48L3N2Zz4=')] opacity-10"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-lg shadow-green-500/20 overflow-hidden">
              <img src="/contribot-logo.png" alt="ContriBot Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ContriBot</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight mb-6">
              Automate your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
                GitHub workflow
              </span>
              <br/> with Gemini.
            </h1>
            <p className="text-lg text-gray-400 max-w-md mb-12 leading-relaxed">
              ContriBot acts as an autonomous software engineer, managing issues, writing code, and reviewing PRs 24/7.
            </p>

            <div className="space-y-8">
              {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + (idx * 0.1) }}
                  className="flex gap-4"
                >
                  <div className="mt-1 w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-gray-200 font-semibold mb-1">{feature.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Terminal Simulation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="relative z-10 mt-12 bg-gray-950/80 backdrop-blur-md border border-gray-800 rounded-xl p-4 font-mono text-xs shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-3">
            <Terminal className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">contribot-agent ~ running</span>
          </div>
          <div className="space-y-2">
            <p className="text-gray-400"><span className="text-green-400">→</span> Analyzing issue #42: "Add dark mode toggle"</p>
            <p className="text-gray-400"><span className="text-blue-400">→</span> Generating React components...</p>
            <p className="text-gray-400"><span className="text-purple-400">→</span> Opening PR #43 with changes</p>
            <p className="text-gray-400 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-400" /> Task completed successfully
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative">
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-lg shadow-green-500/20 overflow-hidden">
            <img src="/contribot-logo.png" alt="ContriBot Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight">ContriBot</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold text-gray-100 mb-3 tracking-tight">Welcome back</h2>
            <p className="text-gray-400">Sign in to manage your autonomous repositories.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGithubLogin}
              disabled={isLoadingGithub || isLoadingGoogle}
              className="group relative w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-xl transition-all duration-200 border border-gray-700 hover:border-gray-600 font-medium disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              {isLoadingGithub ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  Continue with GitHub
                  <ArrowRight className="w-4 h-4 absolute right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </>
              )}
            </button>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-800"></div>
              <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">or</span>
              <div className="flex-grow border-t border-gray-800"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoadingGithub || isLoadingGoogle}
              className="group relative w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-100 text-gray-900 rounded-xl transition-all duration-200 font-medium disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"
            >
              {isLoadingGoogle ? (
                <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Continue with Google
                  <ArrowRight className="w-4 h-4 absolute right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </>
              )}
            </button>
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-gray-400 hover:text-gray-300 underline underline-offset-4 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-gray-400 hover:text-gray-300 underline underline-offset-4 transition-colors">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
};
