import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { ListTodo, PlayCircle, CheckCircle2, XCircle, Clock, RotateCcw, Terminal } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiService.tasks.listTasks(),
    refetchInterval: 10000 // Auto-refresh every 10s
  });

  const retryMutation = useMutation({
    mutationFn: (taskId: string) => apiService.tasks.retryTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task queued for retry');
    },
    onError: () => {
      toast.error('Failed to retry task');
    }
  });

  const filters = [
    { id: 'all', label: 'All Tasks' },
    { id: 'queued', label: 'Queued' },
    { id: 'running', label: 'Running' },
    { id: 'completed', label: 'Completed' },
    { id: 'failed', label: 'Failed' },
  ];

  const filteredTasks = tasks?.filter(t => filter === 'all' || t.status === filter) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Clock className="w-3.5 h-3.5" /> Queued
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            Running
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <ListTodo className="w-5 h-5 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Agent Tasks</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.id 
                ? 'bg-gray-800 text-gray-100 border border-gray-700' 
                : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-medium">
                <th className="p-4 pl-6">Task Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Model Used</th>
                <th className="p-4">Started</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Loading tasks...</td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <Terminal className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    No tasks found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => (
                  <React.Fragment key={task.id}>
                    <tr className="hover:bg-gray-800/30 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-200">{task.task_type}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-mono truncate max-w-[200px]">
                          {task.id.split('-')[0]}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-gray-400 bg-gray-950 px-2 py-1 rounded border border-gray-800">
                          {task.model_used || 'gemini-3.1-pro-preview'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-300">
                          {task.started_at ? formatDistanceToNow(new Date(task.started_at), { addSuffix: true }) : '-'}
                        </div>
                        {task.started_at && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {format(new Date(task.started_at), 'MMM d, HH:mm:ss')}
                          </div>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {task.status === 'failed' && (
                          <button 
                            onClick={() => retryMutation.mutate(task.id)}
                            disabled={retryMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition-colors border border-gray-700"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                    {task.status === 'failed' && task.error_message && (
                      <tr className="bg-red-500/5 border-b border-gray-800">
                        <td colSpan={5} className="p-4 pl-6">
                          <div className="text-xs font-mono text-red-400 break-all">
                            <span className="font-bold mr-2">Error:</span>
                            {task.error_message}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
