import Link from "next/link";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { BrandLogo } from "@/components/brand";

type AuthSplitLayoutProps = {
  children: React.ReactNode;
};

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-full bg-[var(--brand-white)] lg:grid-cols-2">
      <AuthBrandPanel />
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Link href="/" className="inline-flex">
            <BrandLogo markSize="md" showEdition />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
