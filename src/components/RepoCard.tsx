import React from 'react';
import { Repo } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, AlertCircle, Settings2 } from 'lucide-react';

interface RepoCardProps {
  repo: Repo;
  onToggleActive: (id: string, currentStatus: boolean) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onToggleActive }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
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
        
        <button 
          onClick={() => onToggleActive(repo.id, repo.contribot_active)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${repo.contribot_active ? 'bg-green-500' : 'bg-gray-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${repo.contribot_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
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
    </div>
  );
};
