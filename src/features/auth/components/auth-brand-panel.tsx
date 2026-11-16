/**
 * Panel de marca de Login y Onboarding. Siempre oscuro en ambos temas (docs/redesign/login.html),
 * por eso sus colores son literales y viven solo aquí. El lima usa el token `brand-primary`.
 */
const PANEL_BG = 'bg-[#090a09]'
const PANEL_TEXT = 'text-[#b7bcb3]'
const PANEL_RULE = 'lg:border-[#272b25]'
const WATERMARK_TEXT = 'text-[#dfe0d4]/10'
const WORDMARK_TEXT = 'text-[#f2f1e9]'
const LOGO_LIGHT_FILL = 'fill-[#f2f1e9]'

const LOGO_PATH =
  'M46 110C20 106 0 84 0 56C0 33 14 12 35 3C48-2 60 4 62 16C66 29 57 39 44 39C36 39 28 35 23 28C11 38 5 51 7 65C9 86 24 103 46 109Z'

export function AuthBrandPanel() {
  return (
    <div className={`relative isolate min-h-24 overflow-hidden ${PANEL_BG} ${PANEL_TEXT} lg:min-h-full`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <span className="absolute left-0 top-1/2 h-0.5 w-[150%] origin-center -rotate-[7deg] bg-brand-primary lg:-left-[30%] lg:top-[46%] lg:w-[160%] lg:-rotate-12" />
        <span className="absolute left-0 top-1/2 h-0.5 w-[150%] origin-center rotate-[7deg] bg-brand-primary lg:-left-[30%] lg:top-[46%] lg:w-[160%] lg:rotate-12" />
      </div>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-[calc(72px-0.2em)] -left-[0.07em] z-[1] hidden select-none whitespace-nowrap font-display text-[clamp(220px,29vw,420px)] font-extrabold uppercase leading-[0.8] tracking-[-0.04em] ${WATERMARK_TEXT} lg:block`}
      >
        E<span className="text-brand-primary">X</span>OM
      </span>
      <p
        className={`absolute inset-0 z-[2] flex items-center gap-3 px-5 text-[13px] leading-5 ${PANEL_TEXT} lg:inset-x-0 lg:bottom-0 lg:top-auto lg:h-[72px] lg:gap-2.5 lg:border-t ${PANEL_RULE} ${PANEL_BG} lg:px-10`}
      >
        <svg viewBox="0 0 120 112" aria-hidden="true" focusable="false" className="h-6 w-[26px] shrink-0 lg:h-[21px] lg:w-[22px]">
          <path className={LOGO_LIGHT_FILL} d={LOGO_PATH} />
          <path className="fill-brand-primary" transform="rotate(180 60 56)" d={LOGO_PATH} />
        </svg>
        <span
          aria-hidden="true"
          className={`font-display text-[40px] font-extrabold uppercase leading-none tracking-[-0.04em] ${WORDMARK_TEXT} lg:hidden`}
        >
          E<span className="text-brand-primary">X</span>OM
        </span>
        <span className="max-lg:sr-only">Panel de administración EXOM</span>
      </p>
    </div>
  )
}
