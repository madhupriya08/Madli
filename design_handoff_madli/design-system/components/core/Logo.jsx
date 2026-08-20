import React from "react";

const FILES = {
  full: "logo-madli-full.png",
  lockup: "logo-madli-full.png",
  mark: "logo-mark-transparent.png",
  wordmark: "logo-wordmark-transparent.png",
  tagline: "logo-tagline-transparent.png",
};

/**
 * The Madli mark. Always the supplied artwork — never redrawn, never recoloured.
 * `assetBase` is the path from the consuming page to this system's /assets folder.
 */
export function Logo({ variant = "wordmark", height = 28, assetBase = "assets", style, ...rest }) {
  const file = FILES[variant] || FILES.wordmark;
  return (
    <img
      src={assetBase.replace(/\/$/, "") + "/" + file}
      alt="Madli"
      style={{ height, width: "auto", display: "block", ...style }}
      {...rest}
    />
  );
}
