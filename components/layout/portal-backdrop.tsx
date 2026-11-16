/**
 * Fundo oficial do portal (tema escuro): aurora azul/dourada + G da marca
 * como marca d'água. Decorativo, não interativo, sem JS.
 */
export function PortalBackdrop() {
  return (
    <div className="portal-backdrop" aria-hidden="true" data-portal-backdrop="">
      <div className="portal-mesh" />
      <div className="portal-orb o1" />
      <div className="portal-orb o2" />
      <div className="portal-orb o3" />
      <div className="portal-orb o4" />
      <svg className="portal-wm w1" viewBox="0 0 64 64">
        <use href="#portal-gwm" />
      </svg>
      <svg className="portal-wm w2" viewBox="0 0 64 64">
        <use href="#portal-gwm" />
      </svg>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="portal-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe27a" />
            <stop offset="1" stopColor="#f8c208" />
          </linearGradient>
          <symbol id="portal-gwm" viewBox="0 0 64 64">
            <rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="none" stroke="url(#portal-gold)" strokeWidth="1" />
            <text x="32" y="45" textAnchor="middle" fontFamily="var(--font-display), Space Grotesk, Inter, system-ui, sans-serif" fontSize="40" fontWeight="700" fill="url(#portal-gold)">G</text>
          </symbol>
        </defs>
      </svg>
      <div className="portal-veil" />
    </div>
  );
}
