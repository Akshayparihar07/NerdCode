import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/lib/auth";

export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const { redirect_url: redirectUrl } = await props.searchParams;
  return (
    <AuthForm
      initialTab="sign-up"
      redirectUrl={safeRedirectPath(redirectUrl)}
    />
  );
}
