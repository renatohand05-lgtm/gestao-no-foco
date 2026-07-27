"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  className?: string;
  onChange?: (value: string) => void;
};

export function TimelineSearch({ value, className, onChange }: Props) {
  return (
    <Input
      data-timeline-search
      placeholder="Buscar eventos…"
      className={cn("max-w-md", className)}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
