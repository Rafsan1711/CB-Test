import { useQuery } from '@tanstack/react-query';
import { apiService } from '../lib/api';

export function useRepoData(repoId: string) {
  // 1. Fetch Repository Details
  const { 
    data: repo, 
    isLoading: isRepoLoading,
    refetch: refetchRepo
  } = useQuery({
    queryKey: ['repo', repoId],
    queryFn: () => apiService.repos.getRepo(repoId),
    enabled: !!repoId,
  });

  // 2. Fetch Tasks (Fast polling if tasks are running)
  const { 
    data: tasks, 
    isLoading: isTasksLoading,
    refetch: refetchTasks
  } = useQuery({
    queryKey: ['tasks', repoId],
    queryFn: () => apiService.tasks.listTasks(repoId),
    enabled: !!repoId,
    refetchInterval: (query) => {
      // If any task is 'pending' or 'in_progress', poll every 5 seconds
      const hasRunningTasks = query.state.data?.some(
        t => t.status === 'pending' || t.status === 'in_progress'
      );
      return hasRunningTasks ? 5000 : 30000; // Otherwise poll every 30s
    }
  });

  // 3. Fetch Activity Log
  const { 
    data: activity, 
    isLoading: isActivityLoading,
    refetch: refetchActivity
  } = useQuery({
    queryKey: ['activity', repoId],
    queryFn: () => apiService.repos.getActivity(repoId),
    enabled: !!repoId,
    refetchInterval: 30000, // Poll every 30s
  });

  // 4. Fetch Issues
  const { 
    data: issues, 
    isLoading: isIssuesLoading,
    refetch: refetchIssues
  } = useQuery({
    queryKey: ['issues', repoId],
    queryFn: () => apiService.issues.listIssues(repoId),
    enabled: !!repoId,
    refetchInterval: 60000, // Poll every 60s
  });

  // 5. Fetch PRs
  const { 
    data: prs, 
    isLoading: isPrsLoading,
    refetch: refetchPrs
  } = useQuery({
    queryKey: ['prs', repoId],
    queryFn: () => apiService.prs.listPRs(repoId),
    enabled: !!repoId,
    refetchInterval: 60000, // Poll every 60s
  });

  // 6. Fetch Releases
  const { 
    data: releases, 
    isLoading: isReleasesLoading,
    refetch: refetchReleases
  } = useQuery({
    queryKey: ['releases', repoId],
    queryFn: () => apiService.releases.listReleases(repoId),
    enabled: !!repoId,
  });

  const isLoading = isRepoLoading || isTasksLoading || isActivityLoading || isIssuesLoading || isPrsLoading || isReleasesLoading;

  const refetchAll = () => {
    refetchRepo();
    refetchTasks();
    refetchActivity();
    refetchIssues();
    refetchPrs();
    refetchReleases();
  };

  return {
    repo,
    issues,
    prs,
    releases,
    tasks,
    activity,
    isLoading,
    refetchAll
  };
}
