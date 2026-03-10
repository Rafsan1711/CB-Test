import React from 'react';
import { CheckCircle2, XCircle, Clock, PlayCircle, AlertCircle, ShieldCheck, ShieldAlert, Bot } from 'lucide-react';

type StatusSize = 'sm' | 'md' | 'lg';

interface StatusIndicatorProps {
  status: string;
  size?: StatusSize;
  type?: 'task' | 'bot' | 'verification' | 'general';
  showLabel?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = 'md', 
  type = 'general',
  showLabel = true 
}) => {
  const normalizedStatus = status?.toLowerCase() || 'unknown';

  // Size mappings
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const paddingSizes = {
    sm: 'px-2 py-0.5',
    md: 'px-2.5 py-1',
    lg: 'px-3 py-1.5'
  };

  const iconClass = iconSizes[size];
  const textClass = textSizes[size];
  const paddingClass = showLabel ? paddingSizes[size] : 'p-1';

  // Configuration for different statuses
  let config = {
    icon: AlertCircle,
    colorClass: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    label: normalizedStatus.replace(/_/g, ' '),
    animate: false
  };

  if (type === 'bot') {
    if (normalizedStatus === 'active' || normalizedStatus === 'true') {
      config = {
        icon: Bot,
        colorClass: 'text-green-400 bg-green-500/10 border-green-500/20',
        label: 'Active',
        animate: true
      };
    } else {
      config = {
        icon: Bot,
        colorClass: 'text-gray-500 bg-gray-800 border-gray-700',
        label: 'Inactive',
        animate: false
      };
    }
  } else if (type === 'verification') {
    if (normalizedStatus === 'safe') {
      config = {
        icon: ShieldCheck,
        colorClass: 'text-green-400 bg-green-500/10 border-green-500/20',
        label: 'Safe to Merge',
        animate: false
      };
    } else if (normalizedStatus === 'unsafe' || normalizedStatus === 'failed') {
      config = {
        icon: ShieldAlert,
        colorClass: 'text-red-400 bg-red-500/10 border-red-500/20',
        label: 'Unsafe',
        animate: false
      };
    } else if (normalizedStatus === 'pending') {
      config = {
        icon: Clock,
        colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        label: 'Verifying...',
        animate: true
      };
    }
  } else {
    // General / Task statuses
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
      case 'resolved':
      case 'approved':
        config = {
          icon: CheckCircle2,
          colorClass: 'text-green-400 bg-green-500/10 border-green-500/20',
          label: normalizedStatus,
          animate: false
        };
        break;
      case 'failed':
      case 'error':
      case 'rejected':
        config = {
          icon: XCircle,
          colorClass: 'text-red-400 bg-red-500/10 border-red-500/20',
          label: normalizedStatus,
          animate: false
        };
        break;
      case 'in_progress':
      case 'running':
        config = {
          icon: PlayCircle,
          colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          label: normalizedStatus,
          animate: true
        };
        break;
      case 'pending':
      case 'pending_approval':
      case 'queued':
        config = {
          icon: Clock,
          colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
          label: normalizedStatus,
          animate: false
        };
        break;
    }
  }

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.colorClass} ${paddingClass} ${textClass}`}>
      {config.animate ? (
        <div className="relative flex items-center justify-center">
          <Icon className={`${iconClass} relative z-10`} />
          <div className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
        </div>
      ) : (
        <Icon className={iconClass} />
      )}
      {showLabel && <span className="capitalize">{config.label.replace(/_/g, ' ')}</span>}
    </div>
  );
};
