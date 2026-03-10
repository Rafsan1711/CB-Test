import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { RepoCard } from '../components/RepoCard';
import { Activity, Plus, GitPullRequest, AlertCircle, FolderGit2, Bot } from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: repos, isLoading: reposLoading } = useQuery({
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

  const activeRepos = repos?.filter(r => r.contribot_active) || [];

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={FolderGit2} label="Total Repos" value={repos?.length || 0} color="text-blue-400" bg="bg-blue-400/10" />
        <StatCard icon={Activity} label="Active Bots" value={activeRepos.length} color="text-green-400" bg="bg-green-400/10" />
        <StatCard icon={AlertCircle} label="Open Issues" value="--" color="text-yellow-400" bg="bg-yellow-400/10" />
        <StatCard icon={GitPullRequest} label="Pending PRs" value="--" color="text-purple-400" bg="bg-purple-400/10" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-100">Active Bots</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-gray-950 font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Repository
        </button>
      </div>

      {reposLoading ? (
        <div className="text-gray-400">Loading repositories...</div>
      ) : activeRepos.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">No active bots</h3>
          <p className="text-gray-400 max-w-md mx-auto">Activate ContriBot on your repositories to let Gemini manage issues, write code, and verify PRs automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeRepos.map(repo => (
            <RepoCard 
              key={repo.id} 
              repo={repo} 
              onToggleActive={(id, active) => toggleActiveMutation.mutate({ id, active })} 
            />
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-100 mb-6">Recent Activity</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-500 text-sm">Activity feed will be populated here.</p>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, bg }: any) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
    </div>
  </div>
);
