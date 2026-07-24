import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type AuthSubmitButtonProps = {
  loading?: boolean;
  loadingText: string;
  children: React.ReactNode;
};

export function AuthSubmitButton({
  loading = false,
  loadingText,
  children,
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      className="h-11 w-full bg-[var(--brand-graphite)] text-white hover:bg-[var(--brand-graphite)]/90"
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
