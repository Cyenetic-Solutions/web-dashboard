import { Suspense } from 'react';
import AuthLayout from '@/features/auth/AuthLayout';
import LoginFlow from '@/features/auth/LoginFlow';

/** Staff sign-in: password then an emailed one-time code. */
export default function LoginPage() {
  return <AuthLayout><Suspense><LoginFlow /></Suspense></AuthLayout>;
}
