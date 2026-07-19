import { SkeletonCard } from "@/components/ui/skeleton-card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCard lines={3} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
      <SkeletonCard lines={6} />
    </div>
  );
}
