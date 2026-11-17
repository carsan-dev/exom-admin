/**
 * Panel de marca de Login y Onboarding. Siempre oscuro en ambos temas (docs/redesign/login.html),
 * por eso sus colores son literales y viven solo aquí. El lima usa el token `brand-primary`.
 * El movimiento (clases `auth-*`) vive en `src/index.css`; solo anima `transform` y `opacity`.
 */
const PANEL_BG = 'bg-[#090a09]'
const PANEL_TEXT = 'text-[#b7bcb3]'
const WORDMARK_TEXT = 'text-[#f2f1e9]'
const LOGO_LIGHT_FILL = 'fill-[#f2f1e9]'

const LOGO_PATH =
  'M46 110C20 106 0 84 0 56C0 33 14 12 35 3C48-2 60 4 62 16C66 29 57 39 44 39C36 39 28 35 23 28C11 38 5 51 7 65C9 86 24 103 46 109Z'

const WORDMARK_LETTERS = [
  { char: 'E', delay: '150ms', accent: false },
  { char: 'X', delay: '210ms', accent: true },
  { char: 'O', delay: '270ms', accent: false },
  { char: 'M', delay: '330ms', accent: false },
]

export function AuthBrandPanel() {
  return (
    <div
      className={`relative isolate min-h-24 overflow-hidden [container-type:inline-size] ${PANEL_BG} ${PANEL_TEXT} lg:min-h-full`}
    >
      <div
        aria-hidden="true"
        className="auth-mark-spin pointer-events-none absolute left-5 top-[27px] aspect-[120/112] w-11 lg:left-10 lg:top-10 lg:w-[clamp(88px,15cqw,140px)]"
      >
        <svg viewBox="0 0 120 112" focusable="false" className="auth-mark-light absolute inset-0 h-full w-full">
          <path className={LOGO_LIGHT_FILL} d={LOGO_PATH} />
        </svg>
        <svg viewBox="0 0 120 112" focusable="false" className="auth-mark-dark absolute inset-0 h-full w-full">
          <path className="fill-brand-primary" transform="rotate(180 60 56)" d={LOGO_PATH} />
        </svg>
      </div>
      <div
        aria-hidden="true"
        data-testid="auth-wordmark"
        className={`pointer-events-none absolute left-[78px] top-[26px] flex select-none whitespace-nowrap font-display text-[54px] font-extrabold uppercase leading-[0.8] tracking-[-0.04em] ${WORDMARK_TEXT} lg:bottom-[calc(72px+0.12em)] lg:left-10 lg:top-auto lg:text-[length:clamp(96px,36cqw,400px)]`}
      >
        {WORDMARK_LETTERS.map(({ char, delay, accent }) => (
          <span key={char} className="block overflow-hidden">
            <span
              className={`auth-letter block${accent ? ' text-brand-primary' : ''}`}
              style={{ animationDelay: delay }}
            >
              {char}
            </span>
          </span>
        ))}
      </div>
      <span
        aria-hidden="true"
        className="auth-rule pointer-events-none absolute inset-x-0 bottom-0 h-px bg-brand-primary lg:bottom-[72px]"
      />
      <p
        className={`sr-only text-[13px] leading-5 ${PANEL_TEXT} lg:not-sr-only lg:absolute lg:bottom-0 lg:left-10 lg:flex lg:h-[72px] lg:items-center`}
      >
        Panel de administración EXOM
      </p>
    </div>
  )
}
