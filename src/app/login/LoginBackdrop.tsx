const WALLPAPER = "/backgrounds/login%20wallpaper.webp";

type Speck = {
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
  swirl: boolean;
  hot: boolean;
};

function buildDust(): Speck[] {
  const colors = ["var(--magenta-400)", "var(--magenta-500)", "var(--pink-500)", "#f9a8d4"];
  const hotColors = ["#7df9ff", "#ff7bf0", "#ffffff", "#fb923c", "#f0abfc"];
  const specks: Speck[] = [];

  for (let i = 0; i < 56; i += 1) {
    const hot = i % 5 === 0;
    specks.push({
      left: `${(i * 17 + 8) % 97}%`,
      top: `${(i * 29 + 11) % 96}%`,
      size: hot ? (i % 10 === 0 ? 3 : 2) : i % 7 === 0 ? 2 : 1,
      delay: `${((i * 13) % 90) / 10}s`,
      duration: `${12 + (i % 8) * 1.6}s`,
      color: hot ? hotColors[i % hotColors.length] : colors[i % colors.length],
      swirl: i % 4 === 0,
      hot,
    });
  }

  const volutes = [
    { cx: 22, cy: 68 },
    { cx: 74, cy: 28 },
    { cx: 48, cy: 52 },
  ];
  volutes.forEach((v, vi) => {
    for (let j = 0; j < 10; j += 1) {
      const a = (j / 10) * Math.PI * 2;
      const r = 4 + (j % 4);
      const hot = j % 3 === 0;
      specks.push({
        left: `${v.cx + Math.cos(a) * r}%`,
        top: `${v.cy + Math.sin(a) * r * 0.7}%`,
        size: hot ? 3 : j % 3 === 0 ? 2 : 1,
        delay: `${vi * 0.8 + j * 0.22}s`,
        duration: `${9 + j * 0.7}s`,
        color: hot ? hotColors[(vi + j) % hotColors.length] : colors[(vi + j) % colors.length],
        swirl: true,
        hot,
      });
    }
  });

  return specks;
}

const DUST = buildDust();

export function LoginBackdrop() {
  return (
    <div className="login-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="login-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={WALLPAPER} alt="" className="login-wallpaper" />
      </div>
      <div className="login-veil absolute inset-0" />
      <div className="login-bokeh login-bokeh--orange" />
      <div className="login-bokeh login-bokeh--cyan" />
      <div className="login-bokeh login-bokeh--pink" />
      <div className="absolute inset-0">
        {DUST.map((speck, i) => (
          <span
            key={i}
            className={[
              "login-dust",
              speck.swirl ? "login-dust--swirl" : "",
              speck.hot ? "login-dust--hot" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: speck.left,
              top: speck.top,
              width: speck.size,
              height: speck.size,
              color: speck.color,
              background: speck.color,
              animationDelay: speck.delay,
              animationDuration: speck.duration,
            }}
          />
        ))}
      </div>
    </div>
  );
}
