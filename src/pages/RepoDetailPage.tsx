import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { Activity, AlertCircle, GitPullRequest, Tag, Settings2, ArrowLeft, Bot, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { IssuesPage } from './IssuesPage';
import { PRsPage } from './PRsPage';
import { ReleasesPage } from './ReleasesPage';
import { ActivityFeed } from '../components/ActivityFeed';

export const RepoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'prs' | 'releases' | 'activity'>('overview');

  const { data: repo, isLoading: repoLoading } = useQuery({
    queryKey: ['repo', id],
    queryFn: () => apiService.repos.getRepo(id!),
    enabled: !!id
  });

  const { data: activity } = useQuery({
    queryKey: ['repo-activity', id],
    queryFn: () => apiService.repos.getActivity(id!),
    enabled: !!id && activeTab === 'overview'
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ active }: { active: boolean }) => 
      active ? apiService.repos.deactivateRepo(id!) : apiService.repos.activateRepo(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repo', id] });
      toast.success('Repository status updated');
    }
  });

  if (repoLoading) {
    return <div className="text-gray-400">Loading repository details...</div>;
  }

  if (!repo) {
    return <div className="text-red-400">Repository not found.</div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'issues', label: 'Issues', icon: AlertCircle },
    { id: 'prs', label: 'Pull Requests', icon: GitPullRequest },
    { id: 'releases', label: 'Releases', icon: Tag },
    { id: 'activity', label: 'Activity Log', icon: Clock },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/repos')}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 font-mono tracking-tight flex items-center gap-3">
              {repo.github_full_name}
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 font-sans">
                {repo.current_version}
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${repo.contribot_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                {repo.contribot_active && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>}
                {repo.contribot_active ? 'ContriBot Active' : 'ContriBot Inactive'}
              </span>
              <span className="text-sm text-gray-500">
                Added {formatDistanceToNow(new Date(repo.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-2 pr-4">
            <div className={`p-2 rounded-lg ${repo.contribot_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Status</span>
              <button 
                onClick={() => toggleActiveMutation.mutate({ active: repo.contribot_active })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none mt-1 ${repo.contribot_active ? 'bg-green-500' : 'bg-gray-700'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${repo.contribot_active ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
          <button className="p-3 text-gray-400 hover:text-gray-200 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl transition-colors">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-green-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-400 rounded-t-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Open Issues</span>
                  </div>
                  <span className="text-3xl font-bold text-gray-100">--</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <GitPullRequest className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Open PRs</span>
                  </div>
                  <span className="text-3xl font-bold text-gray-100">--</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Tag className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Releases</span>
                  </div>
                  <span className="text-3xl font-bold text-gray-100">--</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Activity</h3>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  {activity?.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No recent activity.</div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {activity?.slice(0, 5).map((log: any) => (
                        <div key={log.id} className="p-4 flex items-start gap-4">
                          <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          <div>
                            <p className="text-sm text-gray-200">{log.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Bot Status</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Webhook Secret</p>
                    <div className="font-mono text-xs bg-gray-950 p-2 rounded border border-gray-800 text-gray-400 break-all">
                      {repo.webhook_secret || 'Not generated'}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Last Run</p>
                    <p className="text-sm text-gray-200">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'issues' && <IssuesPage repoId={repo.id} />}
        
        {activeTab === 'prs' && <PRsPage repoId={repo.id} />}
        {activeTab === 'releases' && <ReleasesPage repoId={repo.id} />}
        {activeTab === 'activity' && <ActivityFeed repoId={repo.id} />}
      </div>
    </div>
  );
};
