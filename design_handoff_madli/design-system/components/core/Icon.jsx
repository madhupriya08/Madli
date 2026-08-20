import React from "react";

const BASE = "https://unpkg.com/lucide-static@0.475.0/icons/";
const cache = {};

/**
 * Recolorable icon. Madli has no proprietary glyph set, so the system uses
 * Lucide (static SVGs from CDN) applied as a CSS mask so `color` drives the ink.
 * The glyph is only inked once the mask has actually loaded — if the CDN is
 * unreachable the icon renders as empty space, never as a filled block.
 */
export function Icon({ name, size = 20, color = "currentColor", style, ...rest }) {
  const url = BASE + name + ".svg";
  const [ok, setOk] = React.useState(() => cache[url] === true);
  React.useEffect(() => {
    if (cache[url] === true) { setOk(true); return; }
    if (cache[url] === false) return;
    const img = new Image();
    img.onload = () => { cache[url] = true; setOk(true); };
    img.onerror = () => { cache[url] = false; };
    img.src = url;
  }, [url]);
  return (
    <span
      role="img"
      aria-hidden={!rest["aria-label"]}
      style={{
        display: "inline-block", width: size, height: size, flex: "0 0 auto",
        background: ok ? color : "transparent",
        WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        WebkitMaskPosition: "center", maskPosition: "center",
        WebkitMaskSize: "contain", maskSize: "contain",
        ...style,
      }}
      {...rest}
    />
  );
}
