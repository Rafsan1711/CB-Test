import React from 'react';
import { CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface ConsensusBannerProps {
  safeToMerge: boolean;
  score: number;
  totalModels: number;
  issues: string[];
  githubPrUrl?: string;
}

export const ConsensusBanner: React.FC<ConsensusBannerProps> = ({
  safeToMerge,
  score,
  totalModels,
  issues,
  githubPrUrl,
}) => {
  if (safeToMerge) {
    return (
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-xl p-6 shadow-lg shadow-green-500/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <CheckCircle className="w-32 h-32 text-green-400" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-green-400 flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              SAFE TO MERGE — Verified by {totalModels} AI Models (Consensus: {score}/{totalModels})
            </h3>
            <p className="text-green-200/80 text-sm max-w-2xl">
              This PR has passed ContriBot's multi-model verification. All critical checks have passed.
              Click Merge on GitHub to complete this. Only you can merge.
            </p>
          </div>
          
          {githubPrUrl && (
            <a
              href={githubPrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-gray-950 font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Open on GitHub <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 shadow-lg shadow-orange-500/5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-4 w-full">
          <h3 className="text-xl font-bold text-orange-400 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Not Ready — Only {score}/{totalModels} Models Approved
          </h3>
          <p className="text-orange-200/80 text-sm">
            This PR requires additional work before it can be safely merged. The following critical issues were identified:
          </p>
          
          {issues && issues.length > 0 && (
            <div className="bg-gray-950/50 rounded-lg p-4 border border-orange-500/20">
              <ul className="space-y-2">
                {issues.map((issue, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {githubPrUrl && (
          <a
            href={githubPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg transition-colors whitespace-nowrap border border-gray-700"
          >
            View on GitHub <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};
