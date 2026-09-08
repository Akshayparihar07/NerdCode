import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/lib/auth";

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { redirect_url: redirectUrl } = await props.searchParams;
  return (
    <AuthForm
      initialTab="sign-in"
      redirectUrl={safeRedirectPath(redirectUrl)}
    />
  );
}
