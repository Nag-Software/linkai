export function ArtistHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex h-13 shrink-0 items-center justify-between gap-3 border-b-2 border-zinc-950 px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-black uppercase tracking-tight">{title}</h1>
        {description && <span className="text-xs font-medium text-zinc-500">{description}</span>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}