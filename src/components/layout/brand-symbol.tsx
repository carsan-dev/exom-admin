const SYMBOL_PATH =
  'M46 110C20 106 0 84 0 56C0 33 14 12 35 3C48-2 60 4 62 16C66 29 57 39 44 39C36 39 28 35 23 28C11 38 5 51 7 65C9 86 24 103 46 109Z'

export function BrandSymbol() {
  return (
    <svg
      viewBox="0 0 120 112"
      className="h-[19px] w-5 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path className="fill-foreground" d={SYMBOL_PATH} />
      <path className="fill-brand-primary" transform="rotate(180 60 56)" d={SYMBOL_PATH} />
    </svg>
  )
}
