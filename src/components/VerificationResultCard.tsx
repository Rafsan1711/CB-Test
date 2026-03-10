import React, { useState } from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, AlertTriangle, Lightbulb } from 'lucide-react';

interface VerificationResultCardProps {
  modelName: string;
  approved: boolean;
  score: number;
  reasoning: string;
  issuesFound: string[];
  suggestions: string[];
}

export const VerificationResultCard: React.FC<VerificationResultCardProps> = ({
  modelName,
  approved,
  score,
  reasoning,
  issuesFound,
  suggestions,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${approved ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {approved ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
          <h4 className="font-semibold text-gray-200 font-mono text-sm">{modelName}</h4>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${approved ? 'bg-green-400' : 'bg-red-400'}`}
                style={{ width: `${(score / 10) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400">{score}/10</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-800/50 space-y-4 mt-2">
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Reasoning</h5>
            <p className="text-sm text-gray-300 leading-relaxed">{reasoning}</p>
          </div>

          {issuesFound && issuesFound.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-red-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Issues Found
              </h5>
              <ul className="space-y-1.5">
                {issuesFound.map((issue, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-blue-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Suggestions
              </h5>
              <ul className="space-y-1.5">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
