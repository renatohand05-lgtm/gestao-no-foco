"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { brandAssets, brandConfig } from "@/config/brand";

type BrandMarkProps = {
  className?: string;
  /** Tamanho do quadrado */
  size?: "sm" | "md" | "lg" | "xl";
  title?: string;
  /** Fundo claro: usa marca com contraste adequado */
  variant?: "dark" | "light" | "auto";
};

const sizeMap = {
  sm: { className: "size-7", px: 28 },
  md: { className: "size-8", px: 32 },
  lg: { className: "size-10", px: 40 },
  xl: { className: "size-12", px: 48 },
} as const;

/**
 * Símbolo oficial G (PNG) — sem monograma genérico em texto.
 */
export function BrandMark({
  className,
  size = "md",
  title = brandConfig.name,
  variant = "auto",
}: BrandMarkProps) {
  const dim = sizeMap[size];
  const src =
    variant === "light" ? brandAssets.markTransparent : brandAssets.markPng;

  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-white/10",
        dim.className,
        className,
      )}
      data-brand-mark=""
      data-variant={variant}
    >
      <Image
        src={src}
        alt=""
        width={dim.px}
        height={dim.px}
        className="size-full object-cover"
        priority={size === "xl" || size === "lg"}
      />
    </span>
  );
}
