import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderGit2, LayoutDashboard, Settings, BookOpen, ListTodo, Tag, Activity, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface CommandItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: repos = [] } = useQuery({
    queryKey: ['repos'],
    queryFn: apiService.repos.listRepos,
    enabled: isOpen && !!user,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const staticCommands: CommandItem[] = [
    { id: 'nav-dashboard', title: 'Go to Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, action: () => { navigate('/dashboard'); close(); }, category: 'Pages' },
    { id: 'nav-repos', title: 'Go to Repositories', icon: <FolderGit2 className="w-4 h-4" />, action: () => { navigate('/repos'); close(); }, category: 'Pages' },
    { id: 'nav-tasks', title: 'Go to Tasks', icon: <ListTodo className="w-4 h-4" />, action: () => { navigate('/tasks'); close(); }, category: 'Pages' },
    { id: 'nav-analytics', title: 'Go to Analytics', icon: <Activity className="w-4 h-4" />, action: () => { navigate('/analytics'); close(); }, category: 'Pages' },
    { id: 'nav-settings', title: 'Go to Settings', icon: <Settings className="w-4 h-4" />, action: () => { navigate('/settings'); close(); }, category: 'Pages' },
    { id: 'nav-docs', title: 'Go to Documentation', icon: <BookOpen className="w-4 h-4" />, action: () => { navigate('/docs'); close(); }, category: 'Pages' },
    { id: 'action-add-repo', title: 'Add Repository', icon: <Plus className="w-4 h-4" />, action: () => { navigate('/repos'); close(); }, category: 'Actions' },
  ];

  const repoCommands: CommandItem[] = repos.map(repo => ({
    id: `repo-${repo.id}`,
    title: repo.github_full_name,
    icon: <FolderGit2 className="w-4 h-4" />,
    action: () => { navigate(`/repos/${repo.id}`); close(); },
    category: 'Repositories'
  }));

  const allCommands = [...staticCommands, ...repoCommands];

  const filteredCommands = allCommands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter' && filteredCommands.length > 0) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center px-4 py-4 border-b border-gray-800">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0 text-lg"
              />
              <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">ESC</kbd>
                <span>to close</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>No results found for "{query}"</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {Array.from(new Set(filteredCommands.map(c => c.category))).map(category => (
                    <div key={category} className="mb-4">
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {category}
                      </div>
                      {filteredCommands
                        .filter(c => c.category === category)
                        .map((cmd) => {
                          const index = filteredCommands.indexOf(cmd);
                          const isSelected = index === selectedIndex;
                          return (
                            <button
                              key={cmd.id}
                              onClick={cmd.action}
                              onMouseEnter={() => setSelectedIndex(index)}
                              className={`w-full flex items-center px-3 py-3 rounded-xl text-left transition-colors ${
                                isSelected ? 'bg-green-500/10 text-green-400' : 'text-gray-300 hover:bg-gray-800/50'
                              }`}
                            >
                              <div className={`mr-3 ${isSelected ? 'text-green-400' : 'text-gray-400'}`}>
                                {cmd.icon}
                              </div>
                              <span className="flex-1 font-medium">{cmd.title}</span>
                              {isSelected && (
                                <span className="text-xs text-green-500/50 font-mono">Enter</span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
