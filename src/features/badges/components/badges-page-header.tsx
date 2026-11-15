export function BadgesPageHeader() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-text">
          Catálogo
        </p>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Etiquetas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Gestiona grupos musculares, equipamiento, tipos y tags de entrenamientos y badges
            nutricionales.
          </p>
        </div>
      </div>
    </div>
  )
}
