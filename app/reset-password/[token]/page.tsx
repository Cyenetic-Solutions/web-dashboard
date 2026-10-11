import AuthLayout from '@/features/auth/AuthLayout';
import SetPassword from '@/features/auth/SetPassword';

/** Completes a reset from the emailed single-use link. */
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  return <AuthLayout><SetPassword mode="reset" token={(await params).token} /></AuthLayout>;
}
