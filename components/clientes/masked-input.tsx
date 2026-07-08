"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MaskedInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  mask: (value: string) => string;
};

export function MaskedInput({
  value,
  onChange,
  mask,
  className,
  ...props
}: MaskedInputProps) {
  return (
    <Input
      {...props}
      className={cn(className)}
      value={value}
      onChange={(event) => onChange(mask(event.target.value))}
    />
  );
}
