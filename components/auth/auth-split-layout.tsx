import Link from "next/link";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { siteConfig } from "@/config/site";

type AuthSplitLayoutProps = {
  children: React.ReactNode;
};

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <AuthBrandPanel />
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-xs font-bold">GF</span>
            </div>
            <span className="font-semibold">{siteConfig.name}</span>
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
