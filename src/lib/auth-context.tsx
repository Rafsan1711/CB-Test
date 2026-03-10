import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User as FirebaseUser, signInWithPopup, GithubAuthProvider } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from './firebase';
import { apiService, User as SupabaseUser } from './api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
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
            // If getMe fails (e.g. user not in DB yet), try to login
            try {
              const token = await firebaseUser.getIdToken();
              const dbUser = await apiService.auth.login(token);
              setSupabaseUser(dbUser);
            } catch (loginError: any) {
              console.error('Failed to sync user with backend:', loginError.response?.data || loginError.message || loginError);
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

  const signOut = async () => {
    await auth.signOut();
    try {
      await apiService.auth.logout();
    } catch (e) {}
    setSupabaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, loading, signInWithGoogle, signInWithGitHub, signOut }}>
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
