"use client";

import type { OAuthStrategy } from "@clerk/nextjs/types";
import {
  GithubLogo,
  GoogleLogo,
  type Icon,
  XLogo,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export const SOCIAL_PROVIDERS = [
  { strategy: "oauth_google", label: "Google", icon: GoogleLogo },
  { strategy: "oauth_x", label: "Twitter", icon: XLogo },
  { strategy: "oauth_github", label: "GitHub", icon: GithubLogo },
] as const satisfies ReadonlyArray<{
  strategy: OAuthStrategy;
  label: string;
  icon: Icon;
}>;

interface SocialButtonsProps {
  disabled: boolean;
  onSelect: (strategy: OAuthStrategy) => void;
}

export function SocialButtons({ disabled, onSelect }: SocialButtonsProps) {
  return (
    <div className="grid gap-2">
      {SOCIAL_PROVIDERS.map((provider) => (
        <Button
          key={provider.strategy}
          type="button"
          variant="outline"
          size="lg"
          disabled={disabled}
          className="h-10 w-full justify-center gap-2"
          onClick={() => {
            onSelect(provider.strategy);
          }}
        >
          <provider.icon aria-hidden size={16} />
          Continue with {provider.label}
        </Button>
      ))}
    </div>
  );
}
