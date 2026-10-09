/** Заставка при запуске: на банан раскатывается презерватив. Шутка, ~2 секунды. */
export function Splash() {
  const banana = 'M100 34 C128 44 140 120 130 214 C126 250 114 266 100 268 C88 266 78 250 76 214 C68 120 76 48 100 34 Z';
  return (
    <div className="splash">
      <svg viewBox="0 0 200 300" width="190" height="285" aria-hidden="true">
        <defs>
          <clipPath id="roll">
            <rect x="0" y="0" width="200" height="40">
              <animate attributeName="height" from="40" to="236" dur="1.6s" begin="0.25s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
            </rect>
          </clipPath>
        </defs>
        {/* банан */}
        <rect x="95" y="20" width="10" height="18" rx="3" fill="#6b4f2a" />
        <path d={banana} fill="#f5c542" />
        <path d="M112 60 C122 110 124 170 116 240" stroke="#d9a92a" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* презерватив: прозрачная оболочка, раскатывается сверху вниз */}
        <g clipPath="url(#roll)">
          <path d={banana} transform="translate(100 150) scale(1.07) translate(-100 -150)" fill="rgba(234,240,242,0.28)" stroke="rgba(234,240,242,0.75)" strokeWidth="2" />
          <ellipse cx="100" cy="26" rx="7" ry="8" fill="rgba(234,240,242,0.35)" stroke="rgba(234,240,242,0.75)" strokeWidth="2" />
        </g>
        {/* скатанное колечко, которое едет вниз */}
        <ellipse cx="103" cy="42" rx="25" ry="6" fill="none" stroke="#eaf0f2" strokeWidth="5">
          <animate attributeName="cy" from="42" to="236" dur="1.6s" begin="0.25s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
          <animate attributeName="rx" values="25;30;31;27;20" keyTimes="0;0.3;0.6;0.85;1" dur="1.6s" begin="0.25s" fill="freeze" />
        </ellipse>
      </svg>
      <div className="splash-title">ФОРМА</div>
      <div className="splash-sub">Безопасность прежде всего 😄</div>
    </div>
  );
}
