import Link from "next/link";

import { cn } from "@/lib/utils";

type AuthFooterLinkProps = {
  text: string;
  linkText: string;
  href: string;
  className?: string;
};

export function AuthFooterLink({
  text,
  linkText,
  href,
  className,
}: AuthFooterLinkProps) {
  return (
    <p className={cn("text-center text-sm text-muted-foreground", className)}>
      {text}{" "}
      <Link href={href} className="font-medium text-primary hover:underline">
        {linkText}
      </Link>
    </p>
  );
}
