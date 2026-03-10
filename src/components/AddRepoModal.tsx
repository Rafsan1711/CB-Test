import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, Loader2, AlertCircle, Check } from 'lucide-react';
import { apiService } from '../lib/api';
import toast from 'react-hot-toast';

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddRepoModal: React.FC<AddRepoModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [repoName, setRepoName] = useState('');
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate format: owner/repo
  const isValidFormat = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repoName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidFormat) {
      setError('Invalid repository format. Must be "owner/repo-name"');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Add the repository
      const newRepo = await apiService.repos.addRepo({
        github_full_name: repoName,
      });

      // 2. Activate if requested
      if (activateImmediately) {
        await apiService.repos.activateRepo(newRepo.id);
        toast.success(`Repository added and ContriBot activated!`);
      } else {
        toast.success(`Repository added successfully.`);
      }

      onSuccess();
      onClose();
      setRepoName('');
      setActivateImmediately(true);
    } catch (err: any) {
      console.error('Failed to add repo:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to add repository');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                  <Github className="w-5 h-5" />
                  Add Repository
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="repoName" className="block text-sm font-medium text-gray-300">
                    GitHub Repository Name
                  </label>
                  <div className="relative">
                    <input
                      id="repoName"
                      type="text"
                      value={repoName}
                      onChange={(e) => {
                        setRepoName(e.target.value);
                        setError(null);
                      }}
                      placeholder="e.g. facebook/react"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                      autoFocus
                    />
                    {repoName && isValidFormat && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Must be the full name including the owner/organization.
                  </p>
                </div>

                <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={activateImmediately}
                        onChange={(e) => setActivateImmediately(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-gray-600 rounded bg-gray-900 peer-checked:bg-green-500 peer-checked:border-green-500 transition-colors flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-gray-950 opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-200 block mb-1">
                        Activate ContriBot immediately
                      </span>
                      <span className="text-xs text-gray-500 block leading-relaxed">
                        ContriBot will register a webhook on this repo using your connected GitHub account to listen for new issues and PRs.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!repoName || !isValidFormat || isLoading}
                    className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-500 text-gray-950 font-semibold rounded-lg transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Repository'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
