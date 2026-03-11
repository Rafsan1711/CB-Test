import React, { useState } from 'react';
import { Repo } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, AlertCircle, Settings2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RepoCardProps {
  repo: Repo;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onRemove: (id: string) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onToggleActive, onRemove }) => {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors flex flex-col h-full relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-lg font-mono font-medium text-gray-100 truncate" title={repo.github_full_name}>
            {repo.github_full_name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${repo.contribot_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {repo.contribot_active && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>}
              {repo.contribot_active ? 'Active' : 'Inactive'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {repo.current_version}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowConfirm(true)}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Remove Repository"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onToggleActive(repo.id, repo.contribot_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${repo.contribot_active ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${repo.contribot_active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="flex-1"></div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-950 rounded-lg p-3 border border-gray-800/50">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Issues</span>
          </div>
          <span className="text-xl font-semibold text-gray-200">--</span>
        </div>
        <div className="bg-gray-950 rounded-lg p-3 border border-gray-800/50">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <GitPullRequest className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">PRs</span>
          </div>
          <span className="text-xl font-semibold text-gray-200">--</span>
        </div>
      </div>

      <button 
        onClick={() => navigate(`/repos/${repo.id}`)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm font-medium"
      >
        <Settings2 className="w-4 h-4" />
        Manage Repository
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center"
          >
            <Trash2 className="w-10 h-10 text-red-500 mb-3" />
            <h4 className="text-lg font-semibold text-gray-100 mb-2">Remove Repository?</h4>
            <p className="text-sm text-gray-400 mb-6">
              This will remove {repo.github_full_name} from ContriBot. No files will be deleted from GitHub.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowConfirm(false);
                  onRemove(repo.id);
                }}
                className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors text-sm font-medium"
              >
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
