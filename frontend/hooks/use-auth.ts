'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { useUserStore } from '@/store/user.store';
import { ROLE_HOME } from '@/constants';
import type { LoginPayload, RegisterPayload } from '@/types';

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.email.split('@')[0]}!`);
      router.replace(ROLE_HOME[user.role] ?? '/');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      toast.success('Account created — welcome to InternBridge!');
      router.replace(ROLE_HOME[user.role] ?? '/');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reset = useAuthStore((s) => s.reset);
  const resetUser = useUserStore((s) => s.reset);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      reset();
      resetUser();
      queryClient.clear();
      router.replace('/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: (data) => toast.success(data.message),
  });
}

export function useResetPassword() {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
    onSuccess: (data) => {
      toast.success(data.message);
      router.replace('/login');
    },
  });
}
