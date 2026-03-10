import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { 
  Activity, 
  GitPullRequest, 
  AlertCircle, 
  Tag, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  RefreshCw,
  Clock
} from 'lucide-react';
import { apiService } from '../lib/api';

interface ActivityFeedProps {
  repoId: string;
}

const getIconForEvent = (eventType: string) => {
  switch (eventType) {
    case 'issue_created':
    case 'issue_updated':
      return AlertCircle;
    case 'pr_created':
    case 'pr_updated':
      return GitPullRequest;
    case 'release_created':
      return Tag;
    case 'verification_passed':
      return CheckCircle2;
    case 'verification_failed':
      return XCircle;
    case 'comment_added':
      return MessageSquare;
    default:
      return Activity;
  }
};

const getColorForSeverity = (severity: string) => {
  switch (severity) {
    case 'info':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'success':
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'warning':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'error':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    default:
      return 'text-gray-400 bg-gray-800 border-gray-700';
  }
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ repoId }) => {
  const { data: activity, isLoading, isError, refetch } = useQuery({
    queryKey: ['repo-activity', repoId],
    queryFn: () => apiService.repos.getActivity(repoId),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" />
        Loading activity...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
        Failed to load activity feed.
        <button 
          onClick={() => refetch()}
          className="ml-4 underline hover:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!activity || activity.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-gray-800 rounded-xl">
        <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <h3 className="text-gray-400 font-medium">No activity yet</h3>
        <p className="text-gray-500 text-sm mt-1">Events will appear here as ContriBot interacts with your repository.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-400" />
          Activity Feed
        </h3>
        <button 
          onClick={() => refetch()}
          className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="relative border-l border-gray-800 ml-4 space-y-8 pb-4">
        {activity.map((log: any) => {
          const Icon = getIconForEvent(log.event_type);
          const colorClass = getColorForSeverity(log.severity || 'info');

          return (
            <div key={log.id} className="relative pl-8">
              <div className={`absolute -left-4 top-1 w-8 h-8 rounded-full border flex items-center justify-center bg-gray-950 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-sm hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-sm text-gray-200 font-medium leading-relaxed">
                    {log.message}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap shrink-0 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-3 bg-gray-950 rounded-lg p-3 border border-gray-800/50">
                    <pre className="text-xs font-mono text-gray-400 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activity.length >= 50 && (
        <button className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-200 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl transition-colors">
          Load More Activity
        </button>
      )}
    </div>
  );
};
