import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { Activity, CheckCircle, GitPullRequest, Tag, Clock, FolderGit2, Globe } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { format, subDays, isAfter, startOfDay } from 'date-fns';

export const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');

  const { data: repos = [] } = useQuery({
    queryKey: ['repos'],
    queryFn: () => apiService.repos.listRepos()
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'all'],
    queryFn: () => apiService.repos.getAllActivity()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => apiService.tasks.listTasks()
  });

  const { data: globalStats } = useQuery({
    queryKey: ['analytics', 'global'],
    queryFn: () => apiService.repos.getGlobalAnalytics()
  });

  // Filter data based on date range
  const filterDate = new Date();
  if (dateRange !== 'all') {
    filterDate.setDate(filterDate.getDate() - parseInt(dateRange));
  }

  const filteredTasks = tasks.filter(t => dateRange === 'all' || isAfter(new Date(t.created_at), filterDate));
  const filteredActivities = activities.filter(a => dateRange === 'all' || isAfter(new Date(a.created_at), filterDate));

  // Calculate real data
  const issuesOverTime = useMemo(() => {
    const days = dateRange === 'all' ? 30 : parseInt(dateRange);
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const nextDate = startOfDay(subDays(new Date(), i - 1));
      
      const dayActivities = filteredActivities.filter(a => {
        const d = new Date(a.created_at);
        return d >= date && d < nextDate;
      });
      
      data.push({
        date: format(date, 'MMM dd'),
        created: dayActivities.filter(a => a.event_type === 'issue_analyzed').length,
        resolved: dayActivities.filter(a => a.event_type === 'issue_resolved').length
      });
    }
    return data;
  }, [filteredActivities, dateRange]);

  const prVerificationData = useMemo(() => {
    const prTasks = filteredTasks.filter(t => t.task_type === 'verify_pr');
    const passed = prTasks.filter(t => t.status === 'completed').length;
    const failed = prTasks.filter(t => t.status === 'failed').length;
    const pending = prTasks.filter(t => t.status === 'pending' || t.status === 'running').length;
    
    // If no data, show empty state
    if (passed === 0 && failed === 0 && pending === 0) {
      return [{ name: 'No Data', value: 1, color: '#374151' }];
    }
    
    return [
      { name: 'Passed', value: passed, color: '#4ade80' },
      { name: 'Failed', value: failed, color: '#f87171' },
      { name: 'Pending', value: pending, color: '#fbbf24' },
    ].filter(d => d.value > 0);
  }, [filteredTasks]);

  const taskSuccessData = useMemo(() => {
    const types = ['analyze_issue', 'write_code', 'verify_pr', 'create_release'];
    const labels: Record<string, string> = {
      'analyze_issue': 'Analyze',
      'write_code': 'Write Code',
      'verify_pr': 'Verify PR',
      'create_release': 'Release'
    };
    
    return types.map(type => {
      const typeTasks = filteredTasks.filter(t => t.task_type === type);
      const success = typeTasks.filter(t => t.status === 'completed').length;
      const fail = typeTasks.filter(t => t.status === 'failed').length;
      return {
        name: labels[type],
        success,
        fail
      };
    });
  }, [filteredTasks]);

  // Summary stats (Real data only)
  const totalResolved = filteredActivities.filter(a => a.event_type === 'issue_resolved').length;
  const prsAutoWritten = filteredTasks.filter(t => t.task_type === 'write_code' && t.status === 'completed').length;
  const releasesPublished = filteredActivities.filter(a => a.event_type === 'release_published').length;
  
  // Calculate average time (mocked format but based on real task duration if available)
  const completedTasks = filteredTasks.filter(t => t.status === 'completed' && t.started_at && t.completed_at);
  let avgTimeStr = '0m';
  if (completedTasks.length > 0) {
    const totalMs = completedTasks.reduce((acc, t) => {
      return acc + (new Date(t.completed_at!).getTime() - new Date(t.started_at!).getTime());
    }, 0);
    const avgMs = totalMs / completedTasks.length;
    const mins = Math.floor(avgMs / 60000);
    if (mins > 60) {
      avgTimeStr = `${Math.floor(mins / 60)}h ${mins % 60}m`;
    } else {
      avgTimeStr = `${mins}m`;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Analytics</h1>
        </div>
        
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
          {[
            { value: '7', label: '7D' },
            { value: '30', label: '30D' },
            { value: '90', label: '90D' },
            { value: 'all', label: 'All Time' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value as any)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateRange === opt.value 
                  ? 'bg-gray-800 text-gray-100 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Analytics Section */}
      {globalStats && (
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-blue-100">Global ContriBot Network Stats</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
              <div className="text-sm text-gray-400 mb-1">Total Repos</div>
              <div className="text-2xl font-bold text-gray-100">{globalStats.total_repos}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
              <div className="text-sm text-gray-400 mb-1">Total Issues</div>
              <div className="text-2xl font-bold text-gray-100">{globalStats.total_issues}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
              <div className="text-sm text-gray-400 mb-1">Total PRs</div>
              <div className="text-2xl font-bold text-gray-100">{globalStats.total_prs}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
              <div className="text-sm text-gray-400 mb-1">Tasks Run</div>
              <div className="text-2xl font-bold text-gray-100">{globalStats.total_tasks}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
              <div className="text-sm text-gray-400 mb-1">Success Rate</div>
              <div className="text-2xl font-bold text-green-400">{globalStats.success_rate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 text-gray-400 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="font-medium">Issues Resolved</span>
          </div>
          <div className="text-3xl font-bold text-gray-100">{totalResolved}</div>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 text-gray-400 mb-4">
            <GitPullRequest className="w-5 h-5 text-blue-400" />
            <span className="font-medium">PRs Auto-Written</span>
          </div>
          <div className="text-3xl font-bold text-gray-100">{prsAutoWritten}</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 text-gray-400 mb-4">
            <Tag className="w-5 h-5 text-purple-400" />
            <span className="font-medium">Releases Published</span>
          </div>
          <div className="text-3xl font-bold text-gray-100">{releasesPublished}</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 text-gray-400 mb-4">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="font-medium">Avg Time to Resolution</span>
          </div>
          <div className="text-3xl font-bold text-gray-100">{avgTimeStr}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues Over Time */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-100 mb-6">Activity Over Time</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={issuesOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Legend />
                <Line type="monotone" dataKey="created" name="Analyzed" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#4ade80" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PR Verification Success Rate */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-100 mb-6">PR Verification Status</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prVerificationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {prVerificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Success Rate */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 lg:col-span-2">
          <h3 className="text-lg font-medium text-gray-100 mb-6">Task Success Rate</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskSuccessData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                  cursor={{ fill: '#374151', opacity: 0.4 }}
                />
                <Legend />
                <Bar dataKey="success" name="Success" stackId="a" fill="#4ade80" radius={[0, 0, 4, 4]} />
                <Bar dataKey="fail" name="Failed" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Per-repo Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-medium text-gray-100">Repository Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800">
                <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Repository</th>
                <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Version</th>
                <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Tasks Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {repos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No repositories found.
                  </td>
                </tr>
              ) : (
                repos.map(repo => {
                  const repoTasks = tasks.filter(t => t.repo_id === repo.id).length;
                  return (
                    <tr key={repo.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FolderGit2 className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-200">{repo.github_full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${repo.contribot_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                          {repo.contribot_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 font-mono">{repo.current_version || 'v0.0.0'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{repoTasks}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
