import type { ReactNode } from "react";

export function LoadingCards({ count = 3, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-3 ${className}`} aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-zinc-100 bg-white p-4">
          <div className="h-3 w-24 rounded-full bg-zinc-100" />
          <div className="mt-3 h-4 w-3/4 rounded-full bg-zinc-200" />
          <div className="mt-2 h-3 w-full rounded-full bg-zinc-100" />
          <div className="mt-2 h-3 w-2/3 rounded-full bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

export function ErrorNotice({ title = "Something went wrong", message, action }: { title?: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          {message ? <p className="mt-1 text-red-700">{message}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}
