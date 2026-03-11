import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, Issue } from '../lib/api';
import { IssueApprovalCard } from '../components/IssueApprovalCard';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, XCircle, Tag, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface IssuesPageProps {
  repoId: string;
}

export const IssuesPage: React.FC<IssuesPageProps> = ({ repoId }) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', repoId, filter],
    queryFn: () => apiService.issues.listIssues(repoId, filter === 'all' ? undefined : filter)
  });

  const syncIssuesMutation = useMutation({
    mutationFn: () => apiService.repos.syncIssues(repoId),
    onSuccess: (data) => {
      toast.success(`Synced ${data.count} issues from GitHub`);
      queryClient.invalidateQueries({ queryKey: ['issues', repoId] });
    }
  });

  const respondMutation = useMutation({
    mutationFn: ({ issueId, response }: { issueId: string, response: 'yes' | 'no' }) => 
      apiService.issues.respondToIssue(repoId, issueId, response),
    onMutate: async ({ issueId, response }) => {
      await queryClient.cancelQueries({ queryKey: ['issues', repoId, filter] });
      const previousIssues = queryClient.getQueryData<Issue[]>(['issues', repoId, filter]);
      
      if (previousIssues) {
        queryClient.setQueryData<Issue[]>(['issues', repoId, filter], old => 
          old?.map(issue => 
            issue.id === issueId 
              ? { 
                  ...issue, 
                  status: response === 'yes' ? 'approved' : 'rejected',
                  user_response: response 
                } 
              : issue
          )
        );
      }
      return { previousIssues };
    },
    onError: (err, variables, context) => {
      if (context?.previousIssues) {
        queryClient.setQueryData(['issues', repoId, filter], context.previousIssues);
      }
      toast.error('Failed to respond to issue');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', repoId] });
    }
  });

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'pending_approval', label: 'Pending Approval' },
    { id: 'approved', label: 'Approved' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'in_progress': return <PlayCircle className="w-4 h-4 text-blue-400" />;
      case 'resolved': return <CheckCircle2 className="w-4 h-4 text-purple-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'bug': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'feature': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'enhancement': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  if (isLoading) {
    return <div className="text-gray-400 py-8">Loading issues...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2">
        <div className="flex gap-2 overflow-x-auto">
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
        <button
          onClick={() => syncIssuesMutation.mutate()}
          disabled={syncIssuesMutation.isPending}
          className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${syncIssuesMutation.isPending ? 'animate-spin' : ''}`} />
          {syncIssuesMutation.isPending ? 'Syncing...' : 'Sync from GitHub'}
        </button>
      </div>

      {issues?.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-200 mb-2">No issues found</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {filter === 'all' 
              ? "ContriBot will analyze your repo and create issues automatically when webhooks are received." 
              : `No issues matching status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues?.map(issue => {
            if (issue.status === 'pending_approval') {
              return (
                <IssueApprovalCard 
                  key={issue.id} 
                  issue={issue} 
                  onRespond={(response) => respondMutation.mutate({ issueId: issue.id, response })} 
                />
              );
            }

            const isRejected = issue.status === 'rejected';

            return (
              <div key={issue.id} className={`bg-gray-900 border border-gray-800 rounded-xl p-5 transition-all ${isRejected ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-gray-500">#{issue.github_issue_number}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(issue.issue_type)}`}>
                        {issue.issue_type || 'unknown'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-950 px-2.5 py-0.5 rounded-full border border-gray-800">
                        {getStatusIcon(issue.status)}
                        <span className="capitalize">{issue.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <h3 className={`text-lg font-medium text-gray-100 truncate ${isRejected ? 'line-through text-gray-500' : ''}`}>
                      {issue.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>Opened {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
                      {issue.labels?.length > 0 && (
                        <div className="flex gap-2">
                          {issue.labels.map(label => (
                            <span key={label} className="flex items-center gap-1">
                              <Tag className="w-3 h-3" /> {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {issue.status === 'approved' && (
                    <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                      <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      ContriBot is implementing...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
