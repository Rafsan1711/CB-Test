import React from 'react';
import { Issue } from '../lib/api';
import { Bot, Check, X, Zap, BrainCircuit, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface IssueApprovalCardProps {
  issue: Issue;
  onRespond: (response: 'yes' | 'no') => void;
}

export const IssueApprovalCard: React.FC<IssueApprovalCardProps> = ({ issue, onRespond }) => {
  const analysis = issue.ai_analysis || {};
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gray-900 border-2 border-green-500/30 rounded-2xl p-6 shadow-lg shadow-green-500/5 overflow-hidden group"
    >
      {/* Animated subtle pulse background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full text-xs font-medium border border-yellow-500/20">
                <Clock className="w-3.5 h-3.5" />
                Pending Owner Approval
              </div>
              <span className="font-mono text-sm text-gray-500">#{issue.github_issue_number}</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2 leading-tight">
              {issue.title}
            </h3>
            <p className="text-gray-400 text-sm line-clamp-2">
              {issue.body || 'No description provided.'}
            </p>
          </div>
          
          <div className="shrink-0 w-12 h-12 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center">
            <Bot className="w-6 h-6 text-green-400" />
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-300">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            ContriBot Analysis
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Type</p>
              <p className="text-sm text-gray-200 capitalize">{analysis.type || issue.issue_type || 'Feature'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Priority</p>
              <p className="text-sm text-gray-200 capitalize">{analysis.priority || 'Medium'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Complexity</p>
              <p className="text-sm text-gray-200 capitalize">{analysis.estimated_complexity || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Labels</p>
              <div className="flex gap-1 flex-wrap">
                {(analysis.labels || issue.labels || []).slice(0, 2).map((l: string) => (
                  <span key={l} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{l}</span>
                ))}
              </div>
            </div>
          </div>
          
          {analysis.summary && (
            <div className="text-sm text-gray-400 border-t border-gray-800 pt-3">
              <span className="text-gray-500 mr-2">Plan:</span>
              {analysis.summary}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onRespond('yes')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-400 text-gray-950 font-semibold rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]"
          >
            <Check className="w-5 h-5" />
            Approve & Implement
          </button>
          <button
            onClick={() => onRespond('no')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-red-500/10 text-gray-300 hover:text-red-400 font-medium rounded-xl border border-gray-700 hover:border-red-500/30 transition-all duration-200"
          >
            <X className="w-5 h-5" />
            Decline
          </button>
        </div>
      </div>
    </motion.div>
  );
};
