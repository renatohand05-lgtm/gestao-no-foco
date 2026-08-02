"use client";

import {
  COMPANY_FIELDS,
  type CompanyProfile,
} from "@/config/onboarding/company-fields";
import { Input } from "@/components/ui/input";
import { gofFocusRing, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  value: CompanyProfile;
  onChange: (next: CompanyProfile) => void;
};

export function CompanyForm({ value, onChange }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {COMPANY_FIELDS.map((field) => {
        const id = `company-${field.key}`;
        const fieldValue = value[field.key] ?? "";

        return (
          <div
            key={field.key}
            className={cn(
              field.key === "address" || field.key === "legalName"
                ? "sm:col-span-2"
                : null,
            )}
          >
            <label htmlFor={id} className={gofTypography.caption}>
              {field.label}
              {!field.required ? (
                <span className="text-muted-foreground"> · opcional</span>
              ) : null}
            </label>
            {field.input === "select" ? (
              <select
                id={id}
                value={String(fieldValue)}
                onChange={(e) =>
                  onChange({ ...value, [field.key]: e.target.value })
                }
                className={cn(
                  "mt-1 flex min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                  gofFocusRing,
                )}
              >
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={id}
                type={field.input === "text" ? "text" : field.input}
                value={String(fieldValue)}
                placeholder={field.placeholder}
                onChange={(e) =>
                  onChange({ ...value, [field.key]: e.target.value })
                }
                className={cn("mt-1 min-h-11", gofFocusRing)}
                autoComplete="organization"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
