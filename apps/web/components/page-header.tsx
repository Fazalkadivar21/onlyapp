export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">{description}</p>
    </div>
  );
}
