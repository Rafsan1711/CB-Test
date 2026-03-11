import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { RepoCard } from '../components/RepoCard';
import { Plus, X, FolderGit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const RepositoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [repoName, setRepoName] = useState('');

  const { data: repos, isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: apiService.repos.listRepos
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string, active: boolean }) => 
      active ? apiService.repos.deactivateRepo(id) : apiService.repos.activateRepo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      toast.success('Repository status updated');
    }
  });

  const addRepoMutation = useMutation({
    mutationFn: (github_full_name: string) => apiService.repos.addRepo({ github_full_name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      toast.success('Repository added successfully');
      setIsModalOpen(false);
      setRepoName('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add repository');
    }
  });

  const removeRepoMutation = useMutation({
    mutationFn: (id: string) => apiService.repos.removeRepo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      toast.success('Repository removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to remove repository');
    }
  });

  const handleAddRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.includes('/')) {
      toast.error('Invalid format. Use "username/repo"');
      return;
    }
    addRepoMutation.mutate(repoName);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <FolderGit2 className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Repositories</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-gray-950 font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Repository
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading repositories...</div>
      ) : repos?.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <FolderGit2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-200 mb-2">No repositories yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">Add a GitHub repository to let ContriBot start managing issues and writing code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos?.map(repo => (
            <RepoCard 
              key={repo.id} 
              repo={repo} 
              onToggleActive={(id, active) => toggleActiveMutation.mutate({ id, active })} 
              onRemove={(id) => removeRepoMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Add Repository Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-100">Add Repository</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddRepo} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    GitHub Repository Name
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="e.g. facebook/react"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all font-mono text-sm"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    ContriBot will use your connected GitHub account to access this repository.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-400 hover:text-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addRepoMutation.isPending || !repoName}
                    className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-medium rounded-lg transition-colors"
                  >
                    {addRepoMutation.isPending ? 'Adding...' : 'Add Repository'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
