import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService, ActivityLog } from '../lib/api';
import { Bell, CheckCircle, AlertTriangle, XCircle, Info, Tag, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'all'],
    queryFn: apiService.repos.getAllActivity,
    refetchInterval: 30000, // Poll every 30s
    retry: false,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = activities.filter(a => !readIds.has(a.id)).length;

  const markAllRead = () => {
    const allIds = new Set(activities.map(a => a.id));
    setReadIds(allIds);
  };

  const handleNotificationClick = (activity: ActivityLog) => {
    setReadIds(prev => new Set(prev).add(activity.id));
    setIsOpen(false);
    navigate(`/repos/${activity.repo_id}`);
  };

  const getIcon = (type: string, severity: string) => {
    if (type === 'release_published') return <Tag className="w-5 h-5 text-purple-400" />;
    if (type === 'pr_verified' || type === 'safe_to_merge') return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (type === 'task_failed' || severity === 'error') return <XCircle className="w-5 h-5 text-red-400" />;
    if (severity === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <Info className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-100 transition-colors relative rounded-lg hover:bg-gray-800"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-950"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <h3 className="font-semibold text-gray-100">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-xs flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {activities.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {activities.map((activity) => {
                    const isRead = readIds.has(activity.id);
                    return (
                      <div 
                        key={activity.id}
                        onClick={() => handleNotificationClick(activity)}
                        className={`p-4 flex gap-3 cursor-pointer hover:bg-gray-800/50 transition-colors ${!isRead ? 'bg-gray-800/20' : ''}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(activity.event_type, activity.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!isRead ? 'text-gray-100 font-medium' : 'text-gray-300'}`}>
                            {activity.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                            <span className="truncate max-w-[120px]">{activity.metadata?.repo_name || 'Repository'}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        {!isRead && (
                          <div className="flex-shrink-0 flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-gray-800 bg-gray-900/50 text-center">
              <button 
                onClick={() => { setIsOpen(false); navigate('/dashboard'); }}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                View all activity
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
