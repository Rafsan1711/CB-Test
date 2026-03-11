import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService, Task } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Code, GitPullRequest, Search, Tag, Activity } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAuth } from '../lib/auth-context';

export const TaskProgressCard: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [now, setNow] = useState(new Date());
  const { user } = useAuth();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'running'],
    queryFn: () => apiService.tasks.listTasks(),
    refetchInterval: 5000,
    retry: false,
    enabled: !!user,
  });

  const runningTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending');

  useEffect(() => {
    if (runningTasks.length > 0) {
      setIsDismissed(false);
      const interval = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [runningTasks.length]);

  if (runningTasks.length === 0 || isDismissed) {
    return null;
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'analyze_issue': return <Search className="w-4 h-4 text-blue-400" />;
      case 'write_code':
      case 'fix_bug':
      case 'implement_feature': return <Code className="w-4 h-4 text-green-400" />;
      case 'verify_pr': return <GitPullRequest className="w-4 h-4 text-purple-400" />;
      case 'release': return <Tag className="w-4 h-4 text-yellow-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTaskLabel = (type: string) => {
    switch (type) {
      case 'analyze_issue': return 'Analyzing issue context...';
      case 'write_code':
      case 'fix_bug':
      case 'implement_feature': return 'Gemini writing code...';
      case 'verify_pr': return 'Verifying pull request...';
      case 'release': return 'Publishing release...';
      default: return 'Processing task...';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 50, x: 20 }}
        className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
            <h3 className="font-semibold text-gray-100 text-sm">ContriBot is working</h3>
            <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs font-medium text-gray-400">
              {runningTasks.length} active
            </span>
          </div>
          <button 
            onClick={() => setIsDismissed(true)}
            className="p-1 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto p-2 space-y-2">
          {runningTasks.map(task => {
            const startedAt = task.started_at ? new Date(task.started_at) : new Date(task.created_at);
            const duration = formatDistanceToNowStrict(startedAt, { addSuffix: false });
            
            return (
              <div key={task.id} className="p-3 bg-gray-950 rounded-xl border border-gray-800/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
                  <motion.div 
                    className="h-full bg-green-500/50"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                
                <div className="flex items-start justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-900 rounded-lg border border-gray-800">
                      {getTaskIcon(task.task_type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{getTaskLabel(task.task_type)}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">Repo ID: {task.repo_id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded-md border border-gray-800">
                    {duration}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
