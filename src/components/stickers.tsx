/**
 * Adesivos decorativos. Formas cheias com contorno escuro, no mesmo traço dos
 * painéis — é daí que vem a fofura da referência, não da fonte.
 *
 * Todos são aria-hidden: são enfeite, e leitor de tela não deve anunciá-los.
 */

type Props = { className?: string }

export function Star({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 1.5c.5 5.2 5.3 10 10.5 10.5-5.2.5-10 5.3-10.5 10.5-.5-5.2-5.3-10-10.5-10.5C6.7 11.5 11.5 6.7 12 1.5Z"
        fill="currentColor"
        stroke="var(--color-border)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Heart({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 21S3 14.6 3 8.9A5 5 0 0 1 12 6a5 5 0 0 1 9 2.9C21 14.6 12 21 12 21Z"
        fill="currentColor"
        stroke="var(--color-border)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Flower({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g stroke="var(--color-border)" strokeWidth="1.6">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse
            key={angle}
            cx="12"
            cy="6.5"
            rx="3.6"
            ry="5"
            fill="currentColor"
            transform={`rotate(${angle} 12 12)`}
          />
        ))}
        <circle cx="12" cy="12" r="2.8" fill="var(--color-cream)" />
      </g>
    </svg>
  )
}

/** Rostinho da referência do quarto: um sorriso simples. */
export function Smiley({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="currentColor"
        stroke="var(--color-border)"
        strokeWidth="1.8"
      />
      <circle cx="8.5" cy="10" r="1.2" fill="var(--color-border)" />
      <circle cx="15.5" cy="10" r="1.2" fill="var(--color-border)" />
      <path
        d="M8 14.5c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Trio de brilhos, para cantos vazios. */
export function Sparkles({ className }: Props) {
  return (
    <span className={className} aria-hidden>
      <Star className="inline-block size-4 text-butter" />
      <Star className="-ml-1 inline-block size-3 text-candy" />
      <Star className="-ml-0.5 inline-block size-2.5 text-mint" />
    </span>
  )
}
