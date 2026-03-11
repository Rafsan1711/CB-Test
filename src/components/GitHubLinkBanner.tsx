import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { Github, X, AlertTriangle } from 'lucide-react';

export const GitHubLinkBanner: React.FC = () => {
  const { authState, linkGitHub } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if google_only
    if (authState !== 'google_only') {
      setIsVisible(false);
      return;
    }

    // Check if dismissed recently (within 24 hours)
    const dismissedAt = localStorage.getItem('github_banner_dismissed_at');
    if (dismissedAt) {
      const dismissedTime = new Date(dismissedAt).getTime();
      const now = new Date().getTime();
      const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60);
      
      if (hoursSinceDismissed < 24) {
        setIsVisible(false);
        return;
      }
    }

    setIsVisible(true);
  }, [authState]);

  const handleDismiss = () => {
    localStorage.setItem('github_banner_dismissed_at', new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-amber-200">
            <span className="md:hidden">Link GitHub to manage repos.</span>
            <span className="hidden md:inline">Link your GitHub account to enable ContriBot on your repositories.</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={linkGitHub}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-gray-900 bg-amber-400 hover:bg-amber-500 rounded-md transition-colors"
          >
            <Github className="w-4 h-4" />
            Connect GitHub
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
