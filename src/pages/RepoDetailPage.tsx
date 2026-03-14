import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { Activity, AlertCircle, GitPullRequest, Tag, Settings2, ArrowLeft, Bot, Clock, ShieldAlert, RefreshCw, FileCode2, Terminal, CheckCircle2, XCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'prs' | 'releases' | 'activity' | 'errors' | 'settings'>('overview');
  const [isContextExpanded, setIsContextExpanded] = useState(false);

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

  const { data: health } = useQuery({
    queryKey: ['repo-health', id],
    queryFn: () => apiService.repos.getHealth(id!),
    enabled: !!id && activeTab === 'overview'
  });

  const { data: context } = useQuery({
    queryKey: ['repo-context', id],
    queryFn: () => apiService.repos.getContext(id!),
    enabled: !!id && activeTab === 'overview'
  });

  const { data: errors, refetch: refetchErrors } = useQuery({
    queryKey: ['repo-errors', id],
    queryFn: () => apiService.repos.getErrors(id!),
    enabled: !!id && activeTab === 'errors'
  });

  const rebuildContextMutation = useMutation({
    mutationFn: () => apiService.repos.analyzeRepo(id!),
    onSuccess: () => {
      toast.success('Context rebuild started');
      queryClient.invalidateQueries({ queryKey: ['repo-context', id] });
    }
  });

  const resolveErrorMutation = useMutation({
    mutationFn: (errorId: string) => apiService.repos.resolveError(id!, errorId),
    onSuccess: () => {
      toast.success('Error marked as resolved');
      refetchErrors();
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ active }: { active: boolean }) => 
      active ? apiService.repos.deactivateRepo(id!) : apiService.repos.activateRepo(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repo', id] });
      toast.success('Repository status updated');
    }
  });

  const updateRepoMutation = useMutation({
    mutationFn: (data: any) => apiService.repos.updateRepo(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repo', id] });
      toast.success('Settings updated');
    }
  });

  const syncIssuesMutation = useMutation({
    mutationFn: () => apiService.repos.syncIssues(id!),
    onSuccess: () => {
      toast.success('Issue sync started');
    }
  });

  const testAIMutation = useMutation({
    mutationFn: () => apiService.tasks.testAI(),
    onSuccess: (data: any) => {
      const geminiStatus = data.gemini.status === 'ok' ? '✅ Gemini OK' : `❌ Gemini Error: ${data.gemini.error}`;
      const deepseekStatus = data.deepseek.status === 'ok' ? '✅ DeepSeek OK' : 
                            data.deepseek.status === 'not_configured' ? '⚪ DeepSeek Not Configured' :
                            `❌ DeepSeek Error: ${data.deepseek.error}`;
      
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="font-bold">AI Connection Test Results:</p>
          <p className="text-sm">{geminiStatus}</p>
          <p className="text-sm">{deepseekStatus}</p>
        </div>
      ), { duration: 5000 });
    }
  });

  if (repoLoading) {
    return <div className="text-gray-400">Loading repository details...</div>;
  }

  if (!repo) {
    return <div className="text-red-400">Repository not found.</div>;
  }

  const tabs: { id: 'overview' | 'issues' | 'prs' | 'releases' | 'activity' | 'errors' | 'settings', label: string, icon: any, badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'issues', label: 'Issues', icon: AlertCircle },
    { id: 'prs', label: 'Pull Requests', icon: GitPullRequest },
    { id: 'releases', label: 'Releases', icon: Tag },
    { id: 'activity', label: 'Activity Log', icon: Clock },
    { id: 'errors', label: 'Errors', icon: ShieldAlert, badge: health?.error_count_24h || 0 },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

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
              {tab.badge ? (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                  {tab.badge}
                </span>
              ) : null}
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
              {/* Repo Health Dashboard */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Repo Health
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">Webhook Status</p>
                    <div className="flex items-center gap-1.5">
                      {health?.webhook_status === 'active' ? (
                        <><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-sm text-green-400">Active</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-400" /><span className="text-sm text-red-400">Inactive</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">Last Webhook</p>
                    <p className="text-sm text-gray-200">{health?.last_webhook || 'Never'}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">Task Queue</p>
                    <p className="text-sm text-gray-200">{health?.tasks_running} running, {health?.tasks_queued} queued</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">API Rate Limit</p>
                    <p className="text-sm text-gray-200">{health?.rate_limit_remaining || 'Unknown'} remaining</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <p className="text-xs text-gray-500">Errors (24h)</p>
                    <button 
                      onClick={() => setActiveTab('errors')}
                      className={`text-sm font-bold px-2.5 py-1 rounded-full ${health?.error_count_24h ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-800 text-gray-400'}`}
                    >
                      {health?.error_count_24h || 0}
                    </button>
                  </div>
                </div>
              </div>

              {/* Context Panel */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setIsContextExpanded(!isContextExpanded)}
                >
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <FileCode2 className="w-4 h-4" /> Repo Context
                  </h3>
                  <button className="text-gray-500 hover:text-gray-300">
                    {isContextExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                
                {isContextExpanded && context && (
                  <div className="p-4 border-t border-gray-800 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Main Language</p>
                        <p className="text-sm text-gray-200">{context.main_language}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Files Indexed</p>
                        <p className="text-sm text-gray-200">{context.file_count}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tech Stack</p>
                      <div className="flex flex-wrap gap-2">
                        {context.tech_stack.map((tech: string, idx: number) => (
                          <span key={`${tech}-${idx}`} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">{tech}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> Directory Tree
                      </p>
                      <pre className="text-xs text-gray-400 bg-gray-950 p-3 rounded-lg overflow-x-auto border border-gray-800">
                        {context.tree}
                      </pre>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); rebuildContextMutation.mutate(); }}
                      disabled={rebuildContextMutation.isPending}
                      className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${rebuildContextMutation.isPending ? 'animate-spin' : ''}`} />
                      {rebuildContextMutation.isPending ? 'Rebuilding...' : 'Rebuild Context'}
                    </button>
                  </div>
                )}
              </div>

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
        {activeTab === 'errors' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" /> Error Logs
              </h2>
            </div>
            
            {errors?.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                <p>No errors found in the last 72 hours.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-950/50 text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4 font-medium">Time</th>
                      <th className="px-6 py-4 font-medium">Category</th>
                      <th className="px-6 py-4 font-medium">Severity</th>
                      <th className="px-6 py-4 font-medium">Message</th>
                      <th className="px-6 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {errors?.map((error: any) => (
                      <tr key={error.id} className={`hover:bg-gray-800/50 transition-colors ${error.resolved ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 text-xs font-mono">
                            {error.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            error.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            error.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }`}>
                            {error.severity === 'critical' && !error.resolved && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>}
                            {error.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 max-w-md truncate" title={error.message}>
                          {error.message}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!error.resolved ? (
                            <button 
                              onClick={() => resolveErrorMutation.mutate(error.id)}
                              disabled={resolveErrorMutation.isPending}
                              className="text-xs font-medium text-green-400 hover:text-green-300 bg-green-400/10 hover:bg-green-400/20 px-3 py-1.5 rounded transition-colors"
                            >
                              Mark Resolved
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Resolved
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-6">AI Model Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Preferred AI Model
                  </label>
                  <p className="text-xs text-gray-500 mb-4">
                    Choose which model ContriBot should use for analysis and code generation. 
                    Gemini is the default, while DeepSeek-R1 serves as a high-performance fallback.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => updateRepoMutation.mutate({ settings: { ...repo.settings, preferred_model: 'gemini' } })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        (repo.settings?.preferred_model || 'gemini') === 'gemini'
                          ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <div className="font-bold mb-1">Google Gemini</div>
                      <div className="text-xs opacity-70">Default. Fast & balanced.</div>
                    </button>
                    <button
                      onClick={() => updateRepoMutation.mutate({ settings: { ...repo.settings, preferred_model: 'deepseek' } })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        repo.settings?.preferred_model === 'deepseek'
                          ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <div className="font-bold mb-1">DeepSeek-R1</div>
                      <div className="text-xs opacity-70">Advanced reasoning. Manual selection.</div>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-800">
                  <h4 className="text-sm font-medium text-gray-300 mb-4">Manual Actions</h4>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => syncIssuesMutation.mutate()}
                      disabled={syncIssuesMutation.isPending}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncIssuesMutation.isPending ? 'animate-spin' : ''}`} />
                      Sync GitHub Issues
                    </button>
                    <button
                      onClick={() => rebuildContextMutation.mutate()}
                      disabled={rebuildContextMutation.isPending}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${rebuildContextMutation.isPending ? 'animate-spin' : ''}`} />
                      Rebuild Code Context
                    </button>
                    <button
                      onClick={() => testAIMutation.mutate()}
                      disabled={testAIMutation.isPending}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg border border-blue-500/20 transition-colors flex items-center gap-2"
                    >
                      <Bot className={`w-4 h-4 ${testAIMutation.isPending ? 'animate-spin' : ''}`} />
                      {testAIMutation.isPending ? 'Testing...' : 'Test AI Connection'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-400 mb-6">
                Removing this repository will delete all associated issues, pull requests, and activity logs from ContriBot.
              </p>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to remove this repository?')) {
                    apiService.repos.removeRepo(id!).then(() => navigate('/repos'));
                  }
                }}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg border border-red-500/20 transition-colors"
              >
                Remove Repository
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
