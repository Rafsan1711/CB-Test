import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, FolderGit2, Plus, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const RepoSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: repos = [] } = useQuery({
    queryKey: ['repos'],
    queryFn: apiService.repos.listRepos
  });

  // Determine current repo from URL if applicable
  const match = location.pathname.match(/\/repos\/([a-zA-Z0-9-]+)/);
  const currentRepoId = match ? match[1] : null;
  const currentRepo = repos.find(r => r.id === currentRepoId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredRepos = repos.filter(r => 
    r.github_full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg transition-colors text-sm font-medium text-gray-200"
      >
        <FolderGit2 className="w-4 h-4 text-gray-400" />
        <span className="max-w-[150px] truncate">
          {currentRepo ? currentRepo.github_full_name.split('/')[1] : 'Select Repository'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
          >
            <div className="p-2 border-b border-gray-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Find repository..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-1">
              {filteredRepos.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No repositories found
                </div>
              ) : (
                filteredRepos.map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => {
                      navigate(`/repos/${repo.id}`);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${repo.contribot_active ? 'bg-green-500' : 'bg-gray-600'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-200 truncate group-hover:text-green-400 transition-colors">
                          {repo.github_full_name}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {repo.current_version}
                        </span>
                      </div>
                    </div>
                    {currentRepoId === repo.id && (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="p-1 border-t border-gray-800 bg-gray-900/50">
              <button
                onClick={() => {
                  navigate('/repos');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add new repository
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
