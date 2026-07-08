import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthFormShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthFormShell({
  title,
  description,
  children,
  footer,
  className,
}: AuthFormShellProps) {
  return (
    <Card className={cn("border-border/60 shadow-xl shadow-primary/5", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold tracking-tight">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer ? <CardFooter className="flex flex-col gap-4">{footer}</CardFooter> : null}
    </Card>
  );
}
