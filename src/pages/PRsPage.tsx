import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, PR } from '../lib/api';
import { GitPullRequest, Search, Filter, Loader2, ExternalLink, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { VerificationResultCard } from '../components/VerificationResultCard';
import { ConsensusBanner } from '../components/ConsensusBanner';

interface PRsPageProps {
  repoId: string;
}

export const PRsPage: React.FC<PRsPageProps> = ({ repoId }) => {
  const queryClient = useQueryClient();
  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  const { data: prs, isLoading } = useQuery({
    queryKey: ['prs', repoId],
    queryFn: () => apiService.prs.listPRs(repoId),
  });

  const verifyMutation = useMutation({
    mutationFn: (prId: string) => apiService.prs.verifyPR(repoId, prId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prs', repoId] });
      toast.success('Verification triggered successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to trigger verification');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Open</span>;
      case 'verified':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Verified
          </span>
        );
      case 'needs_work':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">Needs Work</span>;
      case 'merged':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">Merged</span>;
      case 'closed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">Closed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search pull requests..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-gray-800 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {prs?.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/50 border border-gray-800 border-dashed rounded-xl">
            <GitPullRequest className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-1">No pull requests found</h3>
            <p className="text-gray-500">There are currently no pull requests for this repository.</p>
          </div>
        ) : (
          prs?.map((pr) => (
            <div key={pr.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all hover:border-gray-700">
              <div 
                className="p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setExpandedPR(expandedPR === pr.id ? null : pr.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-gray-800/50 rounded-lg text-gray-400 shrink-0">
                    <GitPullRequest className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-100 hover:text-green-400 transition-colors">
                        {pr.title}
                      </h3>
                      <span className="text-sm font-mono text-gray-500">#{pr.github_pr_number}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      {getStatusBadge(pr.status)}
                      <span>•</span>
                      <span>Opened {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}</span>
                      {pr.branch_name && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{pr.branch_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  {pr.verification_status === 'completed' ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Consensus</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold ${pr.consensus_score >= 2 ? 'text-green-400' : 'text-orange-400'}`}>
                          {pr.consensus_score}/2
                        </span>
                        <span className="text-gray-500 text-sm">Approved</span>
                      </div>
                    </div>
                  ) : pr.verification_status === 'in_progress' ? (
                    <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        verifyMutation.mutate(pr.id);
                      }}
                      disabled={verifyMutation.isPending}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-700 disabled:opacity-50"
                    >
                      {verifyMutation.isPending ? 'Triggering...' : 'Trigger Verification'}
                    </button>
                  )}
                  
                  {expandedPR === pr.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>

              {expandedPR === pr.id && (
                <div className="border-t border-gray-800 bg-gray-900/50 p-6 space-y-8">
                  {pr.verification_status === 'completed' && pr.verification_results ? (
                    <>
                      <ConsensusBanner 
                        safeToMerge={pr.consensus_score >= 2}
                        score={pr.consensus_score}
                        totalModels={2}
                        issues={pr.verification_results.critical_issues || []}
                        githubPrUrl={`https://github.com/placeholder/pull/${pr.github_pr_number}`} // Replace with actual URL if available
                      />

                      <div>
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Model Verification Results</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {Object.entries(pr.verification_results.models || {}).map(([modelName, result]: [string, any]) => (
                            <VerificationResultCard
                              key={modelName}
                              modelName={modelName}
                              approved={result.approved}
                              score={result.score}
                              reasoning={result.reasoning}
                              issuesFound={result.issues_found}
                              suggestions={result.suggestions}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  ) : pr.verification_status === 'in_progress' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                      <h4 className="text-lg font-medium text-gray-200 mb-2">Verification in Progress</h4>
                      <p className="text-gray-500 max-w-md">
                        ContriBot is analyzing this pull request using multiple AI models. This process usually takes 1-2 minutes.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-800 rounded-xl">
                      <AlertTriangle className="w-10 h-10 text-gray-600 mb-4" />
                      <h4 className="text-lg font-medium text-gray-300 mb-2">Not Verified Yet</h4>
                      <p className="text-gray-500 max-w-md mb-6">
                        This pull request has not been verified by ContriBot. Trigger verification to run the multi-model analysis.
                      </p>
                      <button 
                        onClick={() => verifyMutation.mutate(pr.id)}
                        disabled={verifyMutation.isPending}
                        className="px-6 py-3 bg-green-500 hover:bg-green-400 text-gray-950 font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {verifyMutation.isPending ? 'Triggering...' : 'Start Verification'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
