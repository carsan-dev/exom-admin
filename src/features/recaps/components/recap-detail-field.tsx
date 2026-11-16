export function RecapDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-t border-border py-3">
      <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-foreground [overflow-wrap:anywhere]">{value}</p>
    </div>
  )
}
