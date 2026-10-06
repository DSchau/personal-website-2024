import { H, INK, PAPER, W, renderStaticScene } from "@/components/footer/scene";

const CARD_W = 1200;
const CARD_H = 620;
const BAND_H = 250;
// viewBox window: a ~1.25x zoom into the scene so posts don't all show the
// whole panorama. Height follows from the display aspect (1200x250).
const VIEW_W = 1280;
const VIEW_H = Math.round((VIEW_W * BAND_H) / CARD_W); // 267
const VIEW_Y = H - VIEW_H; // 73 — drops only empty upper sky

/** fnv-1a: deterministic per-title variation (hill seed, scene crop) */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const titleSize = (title: string) =>
  title.length > 70 ? 46 : title.length > 45 ? 56 : 68;

export const OGScene = ({ tags, title, excerpt }: { tags: string[]; title: string; excerpt?: string }) => {
  const text = title ?? "";
  const h = hash32(text);
  const seed = (h % 100000) + 1;
  const vx = h % (W - VIEW_W);

  // every card uses the footer's own tints (renderStaticScene's defaults);
  // only the hills and the crop vary per post
  const svg = renderStaticScene({ seed, reflectionsSeed: seed + 1 })
    .replace(`viewBox="0 0 ${W} ${H}"`, `viewBox="${vx} ${VIEW_Y} ${VIEW_W} ${VIEW_H}"`)
    .replace(`width="${W}" height="${H}"`, `width="${CARD_W}" height="${BAND_H}"`);
  const src = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CARD_W,
        height: CARD_H,
        backgroundColor: PAPER,
        color: INK,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          height: CARD_H - BAND_H,
          padding: "0 56px 30px",
        }}
      >
        <div style={{ display: "flex" }}>
          {(tags ?? []).map((item) => (
            <div
              key={item}
              style={{
                fontFamily: "SFPro",
                fontSize: 20,
                letterSpacing: 2,
                border: `1.5px solid ${INK}`,
                borderRadius: 8,
                padding: "8px 14px",
                marginRight: 12,
              }}
            >
              {item.toUpperCase()}
            </div>
          ))}
        </div>
        <h1
          style={{
            fontFamily: "Rockwell Bold",
            fontSize: titleSize(text),
            lineHeight: 1.12,
            margin: "18px 0 0",
            padding: 0,
          }}
        >
          {text}
        </h1>
        {excerpt ? (
          <div
            style={{
              fontFamily: "SFPro",
              fontSize: 26,
              lineHeight: 1.35,
              marginTop: 14,
              height: 70,
              overflow: "hidden",
              opacity: 0.75,
            }}
          >
            {excerpt}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", position: "relative", width: CARD_W, height: BAND_H }}>
        <img src={src} style={{ width: CARD_W, height: BAND_H }} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 32,
            bottom: 20,
            backgroundColor: PAPER,
            border: `1.5px solid ${INK}`,
            borderRadius: 10,
            fontFamily: "Rockwell Bold",
            fontSize: 26,
            padding: "8px 18px",
          }}
        >
          dustinschau.com
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 32,
            bottom: 20,
            backgroundColor: PAPER,
            border: `1.5px solid ${INK}`,
            borderRadius: 10,
            fontFamily: "SFPro",
            fontSize: 24,
            padding: "8px 18px",
          }}
        >
          Dustin Schau
        </div>
      </div>
    </div>
  );
};
