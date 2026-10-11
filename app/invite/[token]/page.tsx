import AuthLayout from '@/features/auth/AuthLayout';
import SetPassword from '@/features/auth/SetPassword';

/** Activates an invited staff account from the emailed link. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return <AuthLayout><SetPassword mode="invite" token={(await params).token} /></AuthLayout>;
}
