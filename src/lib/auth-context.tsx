import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  GithubAuthProvider, 
  GoogleAuthProvider,
  linkWithPopup
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from './firebase';
import { apiService, User as SupabaseUser } from './api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export type AuthState = 'loading' | 'unauthenticated' | 'google_only' | 'github_only' | 'fully_authenticated';

interface AuthContextType {
  user: FirebaseUser | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  linkGitHub: () => Promise<void>;
  linkGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshGitHubToken: () => Promise<void>;
  updateSettings: (settings: any) => Promise<void>;
  authState: AuthState;
  githubUsername: string | null;
  hasRequiredScopes: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const queryClient = new QueryClient();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isSigningInRef = useRef(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        if (!isSigningInRef.current) {
          try {
            const dbUser = await apiService.auth.getMe();
            setSupabaseUser(dbUser);
          } catch (error: any) {
            // Only try to login if the error is 401 (Unauthorized) or 404 (Not Found)
            if (error.response?.status === 401 || error.response?.status === 404) {
              try {
                const token = await firebaseUser.getIdToken();
                const dbUser = await apiService.auth.login(token);
                setSupabaseUser(dbUser);
              } catch (loginError: any) {
                console.error('Failed to sync user with backend:', loginError.response?.data || loginError.message || loginError);
              }
            } else {
              console.error('Failed to fetch user from backend:', error.response?.data || error.message || error);
            }
          }
        }
      } else {
        setSupabaseUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      isSigningInRef.current = true;
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      const dbUser = await apiService.auth.login(token);
      setSupabaseUser(dbUser);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      isSigningInRef.current = false;
    }
  };

  const signInWithGitHub = async () => {
    try {
      isSigningInRef.current = true;
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;
      const token = await result.user.getIdToken();
      const dbUser = await apiService.auth.login(token, githubToken);
      setSupabaseUser(dbUser);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      isSigningInRef.current = false;
    }
  };

  const linkGitHub = async () => {
    if (!auth.currentUser) return;
    try {
      isSigningInRef.current = true;
      const result = await linkWithPopup(auth.currentUser, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;
      const token = await result.user.getIdToken();
      const dbUser = await apiService.auth.login(token, githubToken);
      setSupabaseUser(dbUser);
      toast.success('GitHub account linked successfully!');
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        toast.error('This GitHub account is already linked to another user.');
      } else {
        toast.error(error.message);
      }
    } finally {
      isSigningInRef.current = false;
    }
  };

  const linkGoogle = async () => {
    if (!auth.currentUser) return;
    try {
      isSigningInRef.current = true;
      const result = await linkWithPopup(auth.currentUser, googleProvider);
      const token = await result.user.getIdToken();
      const dbUser = await apiService.auth.login(token);
      setSupabaseUser(dbUser);
      toast.success('Google account linked successfully!');
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        toast.error('This Google account is already linked to another user.');
      } else {
        toast.error(error.message);
      }
    } finally {
      isSigningInRef.current = false;
    }
  };

  const refreshGitHubToken = async () => {
    if (!auth.currentUser) return;
    try {
      isSigningInRef.current = true;
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;
      const token = await result.user.getIdToken();
      const dbUser = await apiService.auth.login(token, githubToken);
      setSupabaseUser(dbUser);
      toast.success('GitHub token refreshed successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      isSigningInRef.current = false;
    }
  };

  const updateSettings = async (settings: any) => {
    try {
      const updatedUser = await apiService.auth.updateSettings(settings);
      setSupabaseUser(updatedUser);
    } catch (error: any) {
      throw error;
    }
  };

  const signOut = async () => {
    await auth.signOut();
    try {
      await apiService.auth.logout();
    } catch (e) {}
    setSupabaseUser(null);
  };

  // Determine auth state
  let authState: AuthState = 'loading';
  if (!loading) {
    if (!user) {
      authState = 'unauthenticated';
    } else {
      const providers = user.providerData.map(p => p.providerId);
      const hasGoogle = providers.includes('google.com');
      const hasGitHub = providers.includes('github.com');
      
      if (hasGoogle && hasGitHub) {
        authState = 'fully_authenticated';
      } else if (hasGoogle) {
        authState = 'google_only';
      } else if (hasGitHub) {
        authState = 'github_only';
      } else {
        authState = 'unauthenticated'; // Fallback
      }
    }
  }

  const githubUsername = supabaseUser?.github_username || null;
  
  // Check if required scopes are present (repo, workflow, read:user)
  const requiredScopes = ['repo', 'workflow', 'read:user'];
  const hasRequiredScopes = supabaseUser?.github_token_scopes 
    ? requiredScopes.every(scope => supabaseUser.github_token_scopes?.includes(scope))
    : false;

  return (
    <AuthContext.Provider value={{ 
      user, 
      supabaseUser, 
      loading, 
      signInWithGoogle, 
      signInWithGitHub, 
      linkGitHub,
      linkGoogle,
      signOut,
      refreshGitHubToken,
      updateSettings,
      authState,
      githubUsername,
      hasRequiredScopes
    }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
