import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dsElevation, dsType } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn(dsElevation.section, className)}>
      <CardHeader className="space-y-1">
        <CardTitle className={dsType.cardTitle}>{title}</CardTitle>
        {description ? (
          <CardDescription className={dsType.description}>
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
