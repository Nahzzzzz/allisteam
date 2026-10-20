import { Skeleton } from '@/components/ui/skeleton';

/** 列表卡片骨架：形状和 PostCard 保持一致，换页面不跳版 */
export function PostCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-[12px] border border-line bg-surface shadow-card">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-surface-3" />

      <div className="flex gap-2.5 pb-3 pl-4 pr-3 pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex gap-1.5">
            <Skeleton className="h-[18px] w-16 rounded-[3px]" />
            <Skeleton className="h-[18px] w-8 rounded-[3px]" />
            <Skeleton className="h-[18px] w-10 rounded-[3px]" />
          </div>
          <Skeleton className="mt-2.5 h-[17px] w-3/4" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
        <Skeleton className="h-[46px] w-[46px] shrink-0 rounded-[6px]" />
      </div>

      <div className="border-t border-dashed border-line px-3 py-2 pl-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-32 rounded-[4px]" />
          <Skeleton className="h-4 w-20 rounded-[3px]" />
        </div>
      </div>
    </div>
  );
}
