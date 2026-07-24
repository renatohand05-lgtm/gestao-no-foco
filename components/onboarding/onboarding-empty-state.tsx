import { ExecutiveEmptyState } from "@/components/executive";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type Props = {
  title: string;
  description: string;
  impact: string;
  href: string;
  ctaLabel: string;
  icon?: LucideIcon;
};

/**
 * Empty state de onboarding — ExecutiveEmptyState oficial (Gate 19.4.1).
 */
export function OnboardingEmptyState({
  title,
  description,
  impact,
  href,
  ctaLabel,
  icon = Inbox,
}: Props) {
  return (
    <ExecutiveEmptyState
      icon={icon}
      title={title}
      description={`${description} Impacto: ${impact}`}
      action={{ label: ctaLabel, href }}
    />
  );
}
