import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCurrentAuthUser,
  useLogin as useLoginMutation,
  useLogout as useLogoutMutation,
  getGetCurrentAuthUserQueryKey,
  type AuthUser,
} from '@workspace/api-client-react';

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
}

export function useAuth(): AuthState {
  const qc = useQueryClient();
  const { data, isLoading } = useGetCurrentAuthUser();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      await qc.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
      if (!result.user) throw new Error('Login failed');
      return result.user;
    },
    [loginMutation, qc],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    await qc.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
  }, [logoutMutation, qc]);

  const user = data?.user ?? null;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    loginError: loginMutation.error ? getErrorMessage(loginMutation.error) : null,
    isLoggingIn: loginMutation.isPending,
  };
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
