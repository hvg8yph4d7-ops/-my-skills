/** Заставки при запуске (~2 секунды), чередуются: банан и персик. Шутки. */

function Banana() {
  const banana = 'M100 34 C128 44 140 120 130 214 C126 250 114 266 100 268 C88 266 78 250 76 214 C68 120 76 48 100 34 Z';
  return (
    <svg viewBox="0 0 200 300" width="190" height="285" aria-hidden="true">
      <defs>
        <clipPath id="roll">
          <rect x="0" y="0" width="200" height="40">
            <animate attributeName="height" from="40" to="236" dur="1.6s" begin="0.25s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
          </rect>
        </clipPath>
      </defs>
      <rect x="95" y="20" width="10" height="18" rx="3" fill="#6b4f2a" />
      <path d={banana} fill="#f5c542" />
      <path d="M112 60 C122 110 124 170 116 240" stroke="#d9a92a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g clipPath="url(#roll)">
        <path d={banana} transform="translate(100 150) scale(1.07) translate(-100 -150)" fill="rgba(234,240,242,0.28)" stroke="rgba(234,240,242,0.75)" strokeWidth="2" />
        <ellipse cx="100" cy="26" rx="7" ry="8" fill="rgba(234,240,242,0.35)" stroke="rgba(234,240,242,0.75)" strokeWidth="2" />
      </g>
      <ellipse cx="103" cy="42" rx="25" ry="6" fill="none" stroke="#eaf0f2" strokeWidth="5">
        <animate attributeName="cy" from="42" to="236" dur="1.6s" begin="0.25s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
        <animate attributeName="rx" values="25;30;31;27;20" keyTimes="0;0.3;0.6;0.85;1" dur="1.6s" begin="0.25s" fill="freeze" />
      </ellipse>
    </svg>
  );
}

/** Большой персик: шлепок → трясётся → «ЕЩЁ!» → второй шлепок → снова трясётся. */
function Peach() {
  const D = '1.9s';
  // Тряска после каждого шлепка (удары на 0.26 и 0.68 от длительности).
  const jiggleT = '0;0.25;0.27;0.3;0.33;0.36;0.39;0.42;0.47;0.67;0.69;0.72;0.75;0.78;0.82;0.87;1';
  const jiggleS = '1 1;1 1;1.1 0.88;0.93 1.08;1.06 0.95;0.96 1.04;1.03 0.98;0.99 1.01;1 1;1 1;1.11 0.87;0.93 1.08;1.06 0.95;0.97 1.03;1.02 0.99;1 1;1 1';
  const shakeR = '0;0;-5;5;-4;3;-2;1;0;0;-6;6;-4;3;-2;0;0';
  return (
    <svg viewBox="0 -30 290 290" width="260" height="260" aria-hidden="true">
      <defs>
        <radialGradient id="peachShade" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffd6a5" stopOpacity="0.6" />
          <stop offset="1" stopColor="#e76f51" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <g transform="translate(110 160)">
        <g>
          <animateTransform attributeName="transform" type="rotate" dur={D} fill="freeze" values={shakeR} keyTimes={jiggleT} />
          <g>
            <animateTransform attributeName="transform" type="scale" dur={D} fill="freeze" values={jiggleS} keyTimes={jiggleT} />
            <path d="M0 -78 C-52 -86 -88 -50 -86 -2 C-84 50 -46 82 0 70 C46 82 84 50 86 -2 C88 -50 52 -86 0 -78 Z" fill="#f4a261" />
            <path d="M0 -78 C-52 -86 -88 -50 -86 -2 C-84 50 -46 82 0 70 C46 82 84 50 86 -2 C88 -50 52 -86 0 -78 Z" fill="url(#peachShade)" />
            <path d="M2 -74 C-10 -30 -10 30 2 68" stroke="#d9783c" strokeWidth="4" fill="none" strokeLinecap="round" />
            <ellipse cx="-44" cy="-36" rx="16" ry="10" fill="#fff" opacity="0.25" />
            {/* след от ладони — краснеет после каждого шлепка */}
            <ellipse cx="44" cy="0" rx="22" ry="26" fill="#e63946" opacity="0">
              <animate attributeName="opacity" values="0;0;0.35;0.25;0.25;0.5;0.4" keyTimes="0;0.25;0.27;0.5;0.67;0.69;1" dur={D} fill="freeze" />
            </ellipse>
            <path d="M-4 -80 C-6 -96 0 -104 8 -110" stroke="#6b4f2a" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M6 -100 C24 -116 46 -108 50 -96 C34 -88 16 -90 6 -100 Z" fill="#35a67c" />
          </g>
        </g>
      </g>
      {/* рука: замах — удар — отвод — снова удар */}
      <g transform="translate(190 30)">
        <g>
          <animateTransform attributeName="transform" type="rotate" dur={D} fill="freeze"
            values="-50;-50;35;20;-50;-50;35;20;-40" keyTimes="0;0.18;0.26;0.3;0.42;0.6;0.68;0.72;1" />
          <rect x="-14" y="-10" width="28" height="70" rx="12" fill="#eaf0f2" />
          <path d="M-26 56 C-30 80 -28 104 -16 112 C-4 118 12 118 22 110 C32 100 32 76 26 56 Z" fill="#f1c9a5" />
          <path d="M-10 70 L-12 100 M0 70 L0 104 M10 70 L12 100" stroke="#d9a07a" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      {/* «ШЛЁП!» на каждом ударе */}
      <text x="20" y="40" fill="#f5c542" fontFamily="Oswald, sans-serif" fontSize="30" fontWeight="700" opacity="0" transform="rotate(-12 20 40)">
        ШЛЁП!
        <animate attributeName="opacity" values="0;0;1;0;0;1;1" keyTimes="0;0.25;0.27;0.4;0.67;0.69;1" dur={D} fill="freeze" />
      </text>
      {/* «ЕЩЁ!» между шлепками */}
      <text x="236" y="175" fill="#e63946" stroke="#0d1b2a" strokeWidth="2" paintOrder="stroke" fontFamily="Oswald, sans-serif" fontSize="46" fontWeight="700" textAnchor="middle" opacity="0" transform="rotate(10 236 175)">
        ЕЩЁ!
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.42;0.45;0.6;0.65;1" dur={D} fill="freeze" />
      </text>
    </svg>
  );
}

// Чередуем при каждом запуске (номер запуска хранится на телефоне).
function nextVariant(): 'banana' | 'peach' {
  try {
    const n = Number(localStorage.getItem('forma-splash') || 0) + 1;
    localStorage.setItem('forma-splash', String(n));
    return n % 2 ? 'banana' : 'peach';
  } catch {
    return Math.random() < 0.5 ? 'banana' : 'peach';
  }
}
const variant = nextVariant();

export function Splash() {
  return (
    <div className="splash">
      {variant === 'banana' ? <Banana /> : <Peach />}
      <div className="splash-title">ФОРМА</div>
      <div className="splash-sub">{variant === 'banana' ? 'Безопасность прежде всего 😄' : 'Разогреваемся 🍑'}</div>
    </div>
  );
}
