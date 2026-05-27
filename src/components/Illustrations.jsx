/* Custom SVG illustrations for empty states — uses actual CSS design tokens */

export function NoResultsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="108" rx="36" ry="5" fill="var(--brand)" opacity="0.08" />
      {/* magnifying glass */}
      <circle cx="50" cy="50" r="28" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="2" />
      <circle cx="50" cy="50" r="18" fill="var(--surface)" stroke="var(--brand)" strokeWidth="1.5" opacity="0.5"/>
      {/* handle */}
      <line x1="72" y1="72" x2="88" y2="88" stroke="var(--border-strong)" strokeWidth="5" strokeLinecap="round" />
      <line x1="72" y1="72" x2="88" y2="88" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      {/* x inside glass */}
      <line x1="42" y1="42" x2="58" y2="58" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
      <line x1="58" y1="42" x2="42" y2="58" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
      {/* dashed search lines */}
      <line x1="8" y1="24" x2="24" y2="24" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round"/>
      <line x1="8" y1="32" x2="18" y2="32" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round"/>
      <line x1="88" y1="20" x2="108" y2="20" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round"/>
      <line x1="96" y1="28" x2="108" y2="28" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round"/>
    </svg>
  )
}

export function TransactionsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="108" rx="38" ry="5" fill="var(--brand)" opacity="0.08" />
      {/* central coin stack */}
      <ellipse cx="60" cy="72" rx="26" ry="7" fill="var(--brand)" opacity="0.12"/>
      <rect x="34" y="56" width="52" height="16" rx="4" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5"/>
      <ellipse cx="60" cy="56" rx="26" ry="7" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5"/>
      <ellipse cx="60" cy="56" rx="16" ry="4" fill="var(--brand)" opacity="0.18"/>
      <text x="60" y="60" fontSize="9" fill="var(--brand)" textAnchor="middle" fontWeight="700" fontFamily="sans-serif">FCFA</text>
      {/* deposit arrow (left, green) */}
      <circle cx="22" cy="38" r="16" fill="oklch(0.95 0.05 155)" stroke="oklch(0.8 0.1 155)" strokeWidth="1.5"/>
      <line x1="22" y1="30" x2="22" y2="44" stroke="oklch(0.5 0.15 155)" strokeWidth="2" strokeLinecap="round"/>
      <polyline points="16,36 22,30 28,36" stroke="oklch(0.5 0.15 155)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="22" y1="44" x2="38" y2="52" stroke="oklch(0.7 0.1 155)" strokeWidth="1.5" strokeDasharray="3 2"/>
      {/* withdrawal arrow (right, red) */}
      <circle cx="98" cy="38" r="16" fill="oklch(0.97 0.03 20)" stroke="oklch(0.88 0.08 20)" strokeWidth="1.5"/>
      <line x1="98" y1="30" x2="98" y2="44" stroke="oklch(0.55 0.18 20)" strokeWidth="2" strokeLinecap="round"/>
      <polyline points="92,38 98,44 104,38" stroke="oklch(0.55 0.18 20)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="98" y1="44" x2="82" y2="52" stroke="oklch(0.78 0.1 20)" strokeWidth="1.5" strokeDasharray="3 2"/>
      {/* labels */}
      <rect x="6" y="56" width="28" height="8" rx="3" fill="oklch(0.95 0.05 155)" />
      <text x="20" y="63" fontSize="7" fill="oklch(0.4 0.12 155)" textAnchor="middle" fontWeight="700" fontFamily="sans-serif">Dépôt</text>
      <rect x="86" y="56" width="28" height="8" rx="3" fill="oklch(0.97 0.03 20)" />
      <text x="100" y="63" fontSize="7" fill="oklch(0.5 0.15 20)" textAnchor="middle" fontWeight="700" fontFamily="sans-serif">Retrait</text>
    </svg>
  )
}

export function ClientsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="108" rx="40" ry="5" fill="var(--brand)" opacity="0.08" />
      {/* card body */}
      <rect x="14" y="30" width="92" height="60" rx="10" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5"/>
      {/* card header band */}
      <rect x="14" y="30" width="92" height="22" rx="10" fill="var(--brand)" opacity="0.14"/>
      <rect x="14" y="44" width="92" height="8" fill="var(--brand)" opacity="0.07"/>
      {/* avatar circle */}
      <circle cx="36" cy="41" r="10" fill="var(--brand)" opacity="0.25" stroke="var(--brand)" strokeWidth="1.5"/>
      <circle cx="36" cy="38" r="4" fill="var(--brand)" opacity="0.6"/>
      <path d="M26 52 Q26 46 36 46 Q46 46 46 52" fill="var(--brand)" opacity="0.35"/>
      {/* name bar */}
      <rect x="52" y="35" width="44" height="6" rx="2" fill="var(--brand)" opacity="0.45"/>
      <rect x="52" y="44" width="30" height="4" rx="2" fill="var(--border-strong)" opacity="0.4"/>
      {/* divider */}
      <line x1="24" y1="60" x2="96" y2="60" stroke="var(--border)" strokeWidth="1"/>
      {/* stat blocks */}
      <rect x="22" y="66" width="20" height="5" rx="1.5" fill="var(--border-strong)" opacity="0.35"/>
      <rect x="22" y="74" width="14" height="6" rx="2" fill="var(--brand)" opacity="0.5"/>
      <rect x="50" y="66" width="20" height="5" rx="1.5" fill="var(--border-strong)" opacity="0.35"/>
      <rect x="50" y="74" width="18" height="6" rx="2" fill="var(--border-strong)" opacity="0.3"/>
      <rect x="78" y="66" width="20" height="5" rx="1.5" fill="var(--border-strong)" opacity="0.35"/>
      <rect x="78" y="74" width="12" height="6" rx="2" fill="var(--border-strong)" opacity="0.3"/>
      {/* plus badge */}
      <circle cx="96" cy="96" r="16" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="1.5"/>
      <line x1="96" y1="90" x2="96" y2="102" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="90" y1="96" x2="102" y2="96" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

export function GoalIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="108" rx="36" ry="5" fill="var(--brand)" opacity="0.08" />
      {/* outer ring */}
      <circle cx="60" cy="56" r="38" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5"/>
      {/* progress arc ~72% */}
      <circle cx="60" cy="56" r="38"
        stroke="var(--brand)" strokeWidth="5" fill="none"
        strokeDasharray="171 67"
        strokeDashoffset="60"
        strokeLinecap="round"
        opacity="0.7"
        transform="rotate(-90 60 56)" />
      {/* middle ring */}
      <circle cx="60" cy="56" r="26" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.2"/>
      {/* inner ring */}
      <circle cx="60" cy="56" r="14" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.2"/>
      {/* bullseye */}
      <circle cx="60" cy="56" r="5" fill="var(--brand)" opacity="0.8"/>
      {/* dart */}
      <line x1="90" y1="26" x2="65" y2="51" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round"/>
      <polygon points="90,26 84,30 86,24" fill="var(--brand)"/>
      <line x1="90" y1="26" x2="96" y2="20" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* pct label */}
      <text x="60" y="100" fontSize="11" fill="var(--brand)" textAnchor="middle" fontWeight="700" fontFamily="sans-serif">72%</text>
    </svg>
  )
}

export function DisbursementIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="108" rx="38" ry="5" fill="var(--brand)" opacity="0.08" />
      {/* banknote back */}
      <rect x="10" y="44" width="88" height="46" rx="7" fill="var(--border-strong)" opacity="0.2" transform="rotate(-4 10 44)"/>
      {/* banknote front */}
      <rect x="12" y="46" width="88" height="46" rx="7" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5"/>
      {/* note bands */}
      <rect x="12" y="46" width="16" height="46" rx="7" fill="var(--brand)" opacity="0.18"/>
      <rect x="84" y="46" width="16" height="46" rx="7" fill="var(--brand)" opacity="0.18"/>
      {/* center circle */}
      <circle cx="56" cy="69" r="14" fill="var(--brand)" opacity="0.15" stroke="var(--brand)" strokeWidth="1.2"/>
      <text x="56" y="74" fontSize="14" fill="var(--brand)" textAnchor="middle" fontWeight="700" fontFamily="sans-serif" opacity="0.7">F</text>
      {/* value bar */}
      <rect x="36" y="82" width="40" height="4" rx="2" fill="var(--border-strong)" opacity="0.35"/>
      {/* arrow out */}
      <circle cx="88" cy="36" r="18" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="1.5"/>
      <line x1="88" y1="28" x2="88" y2="43" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round"/>
      <polyline points="82,35 88,28 94,35" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export function ProductsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="108" rx="38" ry="5" fill="var(--brand)" opacity="0.08" />
      {/* grid of 4 product cards */}
      {/* top-left: Épargne */}
      <rect x="10" y="16" width="44" height="40" rx="6" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.2"/>
      <rect x="10" y="16" width="44" height="12" rx="6" fill="var(--brand)" opacity="0.18"/>
      <rect x="10" y="22" width="44" height="6" fill="var(--brand)" opacity="0.09"/>
      <rect x="16" y="18" width="24" height="5" rx="1.5" fill="var(--brand)" opacity="0.5"/>
      <rect x="16" y="36" width="30" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.4"/>
      <rect x="16" y="43" width="20" height="6" rx="2" fill="var(--brand)" opacity="0.3"/>
      {/* top-right: Crédit */}
      <rect x="66" y="16" width="44" height="40" rx="6" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.2"/>
      <rect x="66" y="16" width="44" height="12" rx="6" fill="oklch(0.55 0.13 280)" opacity="0.18"/>
      <rect x="66" y="22" width="44" height="6" fill="oklch(0.55 0.13 280)" opacity="0.09"/>
      <rect x="72" y="18" width="24" height="5" rx="1.5" fill="oklch(0.55 0.13 280)" opacity="0.55"/>
      <rect x="72" y="36" width="30" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.4"/>
      <rect x="72" y="43" width="20" height="6" rx="2" fill="oklch(0.55 0.13 280)" opacity="0.3"/>
      {/* bottom-left: Tontine */}
      <rect x="10" y="66" width="44" height="40" rx="6" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.2"/>
      <rect x="10" y="66" width="44" height="12" rx="6" fill="oklch(0.6 0.13 130)" opacity="0.18"/>
      <rect x="10" y="72" width="44" height="6" fill="oklch(0.6 0.13 130)" opacity="0.09"/>
      <rect x="16" y="68" width="24" height="5" rx="1.5" fill="oklch(0.6 0.13 130)" opacity="0.55"/>
      <rect x="16" y="86" width="30" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.4"/>
      <rect x="16" y="93" width="20" height="6" rx="2" fill="oklch(0.6 0.13 130)" opacity="0.3"/>
      {/* bottom-right: Assurance */}
      <rect x="66" y="66" width="44" height="40" rx="6" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.2"/>
      <rect x="66" y="66" width="44" height="12" rx="6" fill="oklch(0.6 0.11 230)" opacity="0.18"/>
      <rect x="66" y="72" width="44" height="6" fill="oklch(0.6 0.11 230)" opacity="0.09"/>
      <rect x="72" y="68" width="24" height="5" rx="1.5" fill="oklch(0.6 0.11 230)" opacity="0.55"/>
      <rect x="72" y="86" width="30" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.4"/>
      <rect x="72" y="93" width="20" height="6" rx="2" fill="oklch(0.6 0.11 230)" opacity="0.3"/>
      {/* plus badge */}
      <circle cx="60" cy="56" r="13" fill="var(--surface)" stroke="var(--brand)" strokeWidth="1.5"/>
      <line x1="60" y1="50" x2="60" y2="62" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="54" y1="56" x2="66" y2="56" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}



export function StaffIllustration() {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* ground shadow */}
        <ellipse cx="60" cy="108" rx="40" ry="5" fill="var(--brand)" opacity="0.08" />
        {/* connecting line between avatars */}
        <line x1="28" y1="62" x2="92" y2="62" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="4 3" />
        {/* left avatar */}
        <circle cx="24" cy="52" r="18" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <circle cx="24" cy="48" r="7" fill="var(--border-strong)" />
        <path d="M10 66 Q10 58 24 58 Q38 58 38 66" fill="var(--border-strong)" />
        {/* center avatar — elevated, branded */}
        <circle cx="60" cy="44" r="22" fill="var(--surface-2)" stroke="var(--brand)" strokeWidth="2" />
        <circle cx="60" cy="39" r="9" fill="var(--brand)" opacity="0.7" />
        <path d="M42 62 Q42 52 60 52 Q78 52 78 62" fill="var(--brand)" opacity="0.5" />
        {/* center avatar star badge */}
        <circle cx="74" cy="30" r="9" fill="var(--surface)" stroke="var(--brand)" strokeWidth="1.5" />
        <text x="74" y="34" fontSize="9" fill="var(--brand)" textAnchor="middle" fontWeight="700" fontFamily="sans-serif">★</text>
        {/* right avatar */}
        <circle cx="96" cy="52" r="18" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <circle cx="96" cy="48" r="7" fill="var(--border-strong)" />
        <path d="M82 66 Q82 58 96 58 Q110 58 110 66" fill="var(--border-strong)" />
        {/* plus invite badge */}
        <circle cx="96" cy="86" r="14" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="1.5" />
        <line x1="96" y1="80" x2="96" y2="92" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="90" y1="86" x2="102" y2="86" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
        {/* left name bar */}
        <rect x="12" y="72" width="24" height="4" rx="2" fill="var(--border-strong)" opacity="0.5" />
        {/* center name bar */}
        <rect x="46" y="70" width="28" height="4" rx="2" fill="var(--brand)" opacity="0.35" />
        {/* right name bar */}
        <rect x="83" y="72" width="26" height="4" rx="2" fill="var(--border-strong)" opacity="0.5" />
      </svg>
    )
  }
  
  export function PermissionsIllustration() {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* shadow */}
        <ellipse cx="60" cy="108" rx="36" ry="5" fill="var(--brand)" opacity="0.08" />
        {/* shield body */}
        <path d="M60 10 L96 26 L96 58 Q96 84 60 100 Q24 84 24 58 L24 26 Z"
          fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {/* shield inner fill */}
        <path d="M60 18 L88 31 L88 58 Q88 78 60 92 Q32 78 32 58 L32 31 Z"
          fill="var(--brand)" opacity="0.07" />
        {/* lock body */}
        <rect x="48" y="52" width="24" height="20" rx="5" fill="var(--brand)" opacity="0.75" />
        {/* lock shackle */}
        <path d="M53 52 L53 46 Q53 38 60 38 Q67 38 67 46 L67 52"
          stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* keyhole */}
        <circle cx="60" cy="60" r="4" fill="var(--surface-2)" opacity="0.8" />
        <rect x="58" y="62" width="4" height="5" rx="1" fill="var(--surface-2)" opacity="0.8" />
        {/* role badge — Owner */}
        <rect x="4" y="28" width="34" height="16" rx="5" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="1" />
        <text x="21" y="40" fontSize="8.5" fill="var(--brand)" textAnchor="middle" fontWeight="700" fontFamily="sans-serif">Owner</text>
        {/* connector line owner */}
        <line x1="38" y1="36" x2="44" y2="46" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 2" />
        {/* role badge — Manager */}
        <rect x="82" y="28" width="36" height="16" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1" />
        <text x="100" y="40" fontSize="8.5" fill="var(--ink-3)" textAnchor="middle" fontWeight="600" fontFamily="sans-serif">Manager</text>
        {/* connector line manager */}
        <line x1="82" y1="36" x2="76" y2="46" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 2" />
        {/* role badge — Staff */}
        <rect x="4" y="72" width="28" height="16" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1" />
        <text x="18" y="84" fontSize="8.5" fill="var(--ink-3)" textAnchor="middle" fontWeight="600" fontFamily="sans-serif">Staff</text>
        {/* connector line staff */}
        <line x1="32" y1="80" x2="38" y2="74" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 2" />
        {/* role badge — Lead */}
        <rect x="88" y="72" width="30" height="16" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1" />
        <text x="103" y="84" fontSize="8.5" fill="var(--ink-3)" textAnchor="middle" fontWeight="600" fontFamily="sans-serif">Lead</text>
        {/* connector line lead */}
        <line x1="88" y1="80" x2="82" y2="74" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 2" />
      </svg>
    )
  }
  
  export function WarehouseIllustration() {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* ground shadow */}
        <ellipse cx="60" cy="104" rx="42" ry="6" fill="var(--brand)" opacity="0.08" />
        {/* building body */}
        <rect x="14" y="48" width="92" height="54" rx="4" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {/* roof fill */}
        <path d="M8 50 L60 16 L112 50Z" fill="var(--brand)" opacity="0.1" />
        {/* roof outline */}
        <path d="M8 50 L60 16 L112 50" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* ridge cap */}
        <circle cx="60" cy="16" r="4" fill="var(--brand)" opacity="0.55" />
        {/* left window frame */}
        <rect x="20" y="60" width="22" height="16" rx="3" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <line x1="31" y1="60" x2="31" y2="76" stroke="var(--border-strong)" strokeWidth="1" />
        <line x1="20" y1="68" x2="42" y2="68" stroke="var(--border-strong)" strokeWidth="1" />
        {/* right window frame */}
        <rect x="78" y="60" width="22" height="16" rx="3" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <line x1="89" y1="60" x2="89" y2="76" stroke="var(--border-strong)" strokeWidth="1" />
        <line x1="78" y1="68" x2="100" y2="68" stroke="var(--border-strong)" strokeWidth="1" />
        {/* door */}
        <rect x="47" y="72" width="26" height="30" rx="3" fill="var(--brand)" opacity="0.15" stroke="var(--brand)" strokeWidth="1.5" />
        {/* door handle */}
        <circle cx="70" cy="88" r="2" fill="var(--brand)" />
        {/* shelf dashes */}
        <line x1="20" y1="82" x2="42" y2="82" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 2" />
        <line x1="20" y1="90" x2="42" y2="90" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 2" />
        <line x1="78" y1="82" x2="100" y2="82" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 2" />
        <line x1="78" y1="90" x2="100" y2="90" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 2" />
        {/* boxes */}
        <rect x="16" y="94" width="10" height="8" rx="1.5" fill="var(--brand)" opacity="0.3" />
        <rect x="100" y="94" width="10" height="8" rx="1.5" fill="var(--brand)" opacity="0.3" />
      </svg>
    )
  }
  
  export function CountEntriesIllustration() {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* shadow */}
        <ellipse cx="60" cy="108" rx="36" ry="5" fill="var(--brand)" opacity="0.08" />
        {/* clipboard body */}
        <rect x="20" y="18" width="70" height="84" rx="6" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {/* clip */}
        <rect x="40" y="12" width="30" height="14" rx="4" fill="var(--brand)" opacity="0.8" />
        <rect x="44" y="12" width="22" height="14" rx="3" fill="var(--brand)" />
        {/* clip hole */}
        <rect x="51" y="14" width="8" height="6" rx="2" fill="var(--surface-2)" opacity="0.55" />
        {/* tally group */}
        <g stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round">
          <line x1="30" y1="40" x2="30" y2="50" />
          <line x1="35" y1="40" x2="35" y2="50" />
          <line x1="40" y1="40" x2="40" y2="50" />
          <line x1="45" y1="40" x2="45" y2="50" />
          <line x1="27" y1="45" x2="48" y2="42" />
        </g>
        {/* row 1 label bar */}
        <rect x="54" y="40" width="28" height="10" rx="3" fill="var(--border-strong)" opacity="0.7" />
        {/* row 2 tally */}
        <g stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" opacity="0.55">
          <line x1="30" y1="60" x2="30" y2="70" />
          <line x1="35" y1="60" x2="35" y2="70" />
          <line x1="40" y1="60" x2="40" y2="70" />
        </g>
        <rect x="54" y="60" width="20" height="10" rx="3" fill="var(--border-strong)" opacity="0.5" />
        {/* row 3 tally */}
        <g stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" opacity="0.3">
          <line x1="30" y1="80" x2="30" y2="90" />
          <line x1="35" y1="80" x2="35" y2="90" />
        </g>
        <rect x="54" y="80" width="14" height="10" rx="3" fill="var(--border-strong)" opacity="0.3" />
        {/* dividers */}
        <line x1="26" y1="55" x2="84" y2="55" stroke="var(--border)" strokeWidth="1" />
        <line x1="26" y1="75" x2="84" y2="75" stroke="var(--border)" strokeWidth="1" />
        {/* magnifying glass — uses surface so it reads on dark */}
        <circle cx="82" cy="82" r="18" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <circle cx="82" cy="82" r="10" fill="none" stroke="var(--brand)" strokeWidth="2" />
        <line x1="89" y1="89" x2="96" y2="96" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="82" y1="78" x2="82" y2="86" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <line x1="78" y1="82" x2="86" y2="82" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </svg>
    )
  }
  
  export function AuditSessionsIllustration() {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* shadow */}
        <ellipse cx="55" cy="108" rx="36" ry="5" fill="var(--brand)" opacity="0.08" />
        {/* calendar body */}
        <rect x="12" y="22" width="76" height="82" rx="8" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {/* calendar header band */}
        <rect x="12" y="22" width="76" height="20" rx="8" fill="var(--brand)" opacity="0.18" />
        <rect x="12" y="34" width="76" height="8" fill="var(--brand)" opacity="0.1" />
        {/* binding pegs */}
        <rect x="30" y="16" width="6" height="14" rx="3" fill="var(--brand)" opacity="0.7" />
        <rect x="64" y="16" width="6" height="14" rx="3" fill="var(--brand)" opacity="0.7" />
        {/* month label */}
        <rect x="30" y="26" width="40" height="8" rx="2" fill="var(--brand)" opacity="0.4" />
        {/* day-of-week letters */}
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <text key={i} x={22 + i * 10} y={56} fontSize="5.5" fill="var(--ink-3)" fontFamily="sans-serif" textAnchor="middle">{d}</text>
        ))}
        {/* row 1 */}
        {[0,1,2,3,4].map(i => (
          <rect key={i} x={17 + i * 10} y={59} width={8} height={8} rx="2" fill="var(--border-strong)" opacity="0.4" />
        ))}
        {/* row 2 — day 9 highlighted */}
        {[0,1,2,3,4,5,6].map((i) => (
          <rect key={i} x={17 + i * 10} y={70} width={8} height={8} rx="2"
            fill={i === 2 ? 'var(--brand)' : 'var(--border-strong)'}
            opacity={i === 2 ? 0.85 : 0.3} />
        ))}
        {/* row 3 */}
        {[0,1,2,3,4,5,6].map(i => (
          <rect key={i} x={17 + i * 10} y={81} width={8} height={8} rx="2" fill="var(--border-strong)" opacity="0.2" />
        ))}
        {/* row 4 */}
        {[0,1,2,3,4,5,6].map(i => (
          <rect key={i} x={17 + i * 10} y={92} width={8} height={8} rx="2" fill="var(--border-strong)" opacity="0.12" />
        ))}
        {/* clock badge */}
        <circle cx="88" cy="85" r="20" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
        <circle cx="88" cy="85" r="14" fill="none" stroke="var(--brand)" strokeWidth="1.5" opacity="0.25" />
        <line x1="88" y1="85" x2="88" y2="76" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
        <line x1="88" y1="85" x2="94" y2="88" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="88" cy="85" r="2" fill="var(--brand)" />
      </svg>
    )
  }
  
  export function ReportsIllustration() {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* shadow */}
        <ellipse cx="60" cy="108" rx="38" ry="5" fill="var(--brand)" opacity="0.08" />
        {/* document */}
        <rect x="18" y="10" width="72" height="94" rx="7" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {/* folded corner fill */}
        <path d="M72 10 L90 28 L72 28Z" fill="var(--border-strong)" opacity="0.5" />
        <path d="M72 10 L90 28" stroke="var(--border-strong)" strokeWidth="1.5" fill="none" />
        {/* title */}
        <rect x="26" y="20" width="36" height="6" rx="2" fill="var(--brand)" opacity="0.5" />
        {/* subtitle */}
        <rect x="26" y="30" width="28" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.5" />
        {/* chart background */}
        <rect x="24" y="40" width="72" height="42" rx="4" fill="var(--surface)" opacity="0.7" />
        {/* bars */}
        <rect x="30" y="64" width="10" height="14" rx="2" fill="var(--brand)" opacity="0.35" />
        <rect x="44" y="52" width="10" height="26" rx="2" fill="var(--brand)" opacity="0.6" />
        <rect x="58" y="56" width="10" height="22" rx="2" fill="var(--brand)" opacity="0.45" />
        <rect x="72" y="44" width="10" height="34" rx="2" fill="var(--brand)" opacity="0.85" />
        {/* baseline */}
        <line x1="26" y1="80" x2="86" y2="80" stroke="var(--border-strong)" strokeWidth="1.5" />
        {/* trend line */}
        <polyline points="35,70 49,58 63,62 77,48" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
        {/* trend dots */}
        <circle cx="35" cy="70" r="2.5" fill="var(--brand)" opacity="0.7" />
        <circle cx="77" cy="48" r="2.5" fill="var(--brand)" />
        {/* footer text bars */}
        <rect x="26" y="88" width="50" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.3" />
        <rect x="26" y="96" width="38" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.2" />
      </svg>
    )
  }
  
  export function TemplatesIllustration() {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* shadow */}
        <ellipse cx="60" cy="108" rx="38" ry="5" fill="var(--brand)" opacity="0.08" />
        {/* stacked docs behind */}
        <rect x="26" y="16" width="68" height="88" rx="7" fill="var(--border)" opacity="0.3" />
        <rect x="22" y="12" width="68" height="88" rx="7" fill="var(--border-strong)" opacity="0.35" />
        {/* front doc */}
        <rect x="18" y="8" width="72" height="90" rx="7" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {/* header band */}
        <rect x="18" y="8" width="72" height="20" rx="7" fill="var(--brand)" opacity="0.16" />
        <rect x="18" y="20" width="72" height="8" fill="var(--brand)" opacity="0.08" />
        {/* header label */}
        <rect x="26" y="13" width="40" height="7" rx="2" fill="var(--brand)" opacity="0.5" />
        {/* checkbox 1 — checked */}
        <rect x="26" y="36" width="12" height="12" rx="3" fill="var(--brand)" opacity="0.9" />
        <polyline points="29,42 32,45 37,39" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="44" y="38" width="38" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.55" />
        <rect x="44" y="44" width="26" height="3" rx="1.5" fill="var(--border-strong)" opacity="0.3" />
        {/* checkbox 2 — checked */}
        <rect x="26" y="56" width="12" height="12" rx="3" fill="var(--brand)" opacity="0.55" />
        <polyline points="29,62 32,65 37,59" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="44" y="58" width="32" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.4" />
        <rect x="44" y="64" width="20" height="3" rx="1.5" fill="var(--border-strong)" opacity="0.25" />
        {/* checkbox 3 — unchecked */}
        <rect x="26" y="76" width="12" height="12" rx="3" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
        <rect x="44" y="78" width="36" height="4" rx="1.5" fill="var(--border-strong)" opacity="0.28" />
        <rect x="44" y="84" width="22" height="3" rx="1.5" fill="var(--border-strong)" opacity="0.16" />
        {/* plus badge */}
        <circle cx="88" cy="92" r="16" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="1.5" />
        <line x1="88" y1="86" x2="88" y2="98" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="82" y1="92" x2="94" y2="92" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  