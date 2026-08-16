"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PostSaveAction = {
  href?: string;
  label: string;
  onClick?: () => void;
  primary?: boolean;
};

type Props = {
  title: string;
  actions: PostSaveAction[];
};

export function PostSaveActions({ title, actions }: Props) {
  return (
    <div
      className="space-y-4 rounded-xl border bg-card p-4"
      data-fast-input="post-save"
      role="status"
    >
      <p className="text-base font-semibold">{title}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                buttonVariants({
                  variant: action.primary ? "default" : "outline",
                }),
                "min-h-11 justify-center",
              )}
            >
              {action.label}
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              className={cn(
                buttonVariants({
                  variant: action.primary ? "default" : "outline",
                }),
                "min-h-11",
              )}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
