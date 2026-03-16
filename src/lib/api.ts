import axios from 'axios';
import { auth } from './firebase';
import toast from 'react-hot-toast';

const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
const api = axios.create({
  baseURL: `${backendUrl}/api/v1`,
  timeout: 15000, // 15 seconds timeout to allow HF Spaces to wake up
});

api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/me') || error.config?.url?.includes('/auth/login');
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (!isAuthEndpoint) {
      toast.error(error.response?.data?.detail || error.message || 'An error occurred');
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  github_username?: string;
  avatar_url?: string;
  providers?: string[];
  github_token_scopes?: string[];
  settings?: any;
  created_at: string;
}

export interface Repo {
  id: string;
  user_id: string;
  github_full_name: string;
  github_repo_url?: string;
  contribot_active: boolean;
  current_version: string;
  webhook_secret?: string;
  settings: any;
  created_at: string;
}

export interface Issue {
  id: string;
  repo_id: string;
  github_issue_number?: number;
  issue_type?: string;
  title: string;
  body?: string;
  status: string;
  user_response?: string;
  ai_analysis?: any;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface PR {
  id: string;
  repo_id: string;
  issue_id?: string;
  github_pr_number?: number;
  title: string;
  branch_name?: string;
  status: string;
  verification_status: string;
  verification_results: any;
  consensus_score: number;
  created_at: string;
  updated_at: string;
}

export interface Release {
  id: string;
  repo_id: string;
  version: string;
  bump_type?: string;
  release_notes?: string;
  github_release_url?: string;
  tag_name?: string;
  created_at: string;
}

export interface Task {
  id: string;
  repo_id: string;
  task_type: string;
  status: string;
  input_data: any;
  output_data: any;
  model_used?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  repo_id: string;
  event_type: string;
  message: string;
  metadata: any;
  severity: string;
  created_at: string;
}

export const apiService = {
  auth: {
    login: async (firebaseToken: string, githubToken?: string) => {
      const res = await api.post<User>('/auth/login', { firebase_token: firebaseToken, github_access_token: githubToken || null });
      return res.data;
    },
    getMe: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
    updateSettings: async (settings: any) => {
      const res = await api.put<User>('/auth/settings', settings);
      return res.data;
    },
    logout: async () => {
      const res = await api.post('/auth/logout');
      return res.data;
    }
  },
  repos: {
    listRepos: async () => {
      const res = await api.get<Repo[]>('/repos/');
      return res.data;
    },
    addRepo: async (data: { github_full_name: string; github_repo_url?: string }) => {
      const res = await api.post<Repo>('/repos/', data);
      return res.data;
    },
    getRepo: async (id: string) => {
      const res = await api.get<Repo>(`/repos/${id}`);
      return res.data;
    },
    updateRepo: async (id: string, data: any) => {
      const res = await api.put<Repo>(`/repos/${id}`, data);
      return res.data;
    },
    activateRepo: async (id: string) => {
      const res = await api.post<Repo>(`/repos/${id}/activate`);
      return res.data;
    },
    deactivateRepo: async (id: string) => {
      const res = await api.post<Repo>(`/repos/${id}/deactivate`);
      return res.data;
    },
    removeRepo: async (id: string) => {
      const res = await api.delete(`/repos/${id}`);
      return res.data;
    },
    getActivity: async (id: string) => {
      const res = await api.get<ActivityLog[]>(`/repos/${id}/activity`);
      return res.data;
    },
    getAllActivity: async () => {
      const res = await api.get<ActivityLog[]>('/repos/activity/all');
      return res.data;
    },
    getGlobalAnalytics: async () => {
      const res = await api.get<any>('/repos/analytics/global');
      return res.data;
    },
    analyzeRepo: async (id: string) => {
      const res = await api.post(`/repos/${id}/analyze`);
      return res.data;
    },
    getContext: async (id: string) => {
      const res = await api.get(`/repos/${id}/context`);
      return res.data;
    },
    getHealth: async (id: string) => {
      const res = await api.get(`/repos/${id}/health`);
      return res.data;
    },
    installTemplates: async (id: string) => {
      const res = await api.post(`/repos/${id}/install-templates`);
      return res.data;
    },
    getErrors: async (id: string) => {
      const res = await api.get(`/repos/${id}/errors`);
      return res.data;
    },
    resolveError: async (id: string, errorId: string) => {
      const res = await api.post(`/repos/${id}/errors/${errorId}/resolve`);
      return res.data;
    },
    syncIssues: async (id: string) => {
      const res = await api.post(`/repos/${id}/sync-issues`);
      return res.data;
    },
    getStats: async (id: string) => {
      const res = await api.get(`/repos/${id}/stats`);
      return res.data;
    }
  },
  issues: {
    listIssues: async (repoId: string, status?: string) => {
      const res = await api.get<Issue[]>(`/issues/${repoId}/issues`, { params: { status } });
      return res.data;
    },
    respondToIssue: async (repoId: string, issueId: string, response: 'yes' | 'no') => {
      const res = await api.put(`/issues/${repoId}/issues/${issueId}/respond`, { response });
      return res.data;
    }
  },
  prs: {
    listPRs: async (repoId: string) => {
      const res = await api.get<PR[]>(`/prs/${repoId}/prs`);
      return res.data;
    },
    getPR: async (repoId: string, prId: string) => {
      const res = await api.get<PR>(`/prs/${repoId}/prs/${prId}`);
      return res.data;
    },
    verifyPR: async (repoId: string, prId: string) => {
      const res = await api.post(`/prs/${repoId}/prs/${prId}/verify`);
      return res.data;
    }
  },
  releases: {
    listReleases: async (repoId: string) => {
      const res = await api.get<Release[]>(`/releases/${repoId}/releases`);
      return res.data;
    },
    getLatestRelease: async (repoId: string) => {
      const res = await api.get<Release>(`/releases/${repoId}/releases/latest`);
      return res.data;
    },
    triggerRelease: async (repoId: string) => {
      const res = await api.post<Release>(`/releases/${repoId}/releases/trigger`);
      return res.data;
    }
  },
  tasks: {
    listTasks: async (repoId?: string) => {
      const res = await api.get<Task[]>('/agent/tasks', { params: { repo_id: repoId } });
      return res.data;
    },
    retryTask: async (taskId: string) => {
      const res = await api.post(`/agent/tasks/${taskId}/retry`);
      return res.data;
    },
    testAI: async () => {
      const res = await api.get('/agent/test-ai');
      return res.data;
    }
  }
};
