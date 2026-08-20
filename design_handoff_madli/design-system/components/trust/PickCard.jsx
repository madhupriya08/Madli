import React from "react";
import { RankBadge } from "./RankBadge.jsx";
import { RankGap } from "./RankGap.jsx";
import { SampleSize } from "./SampleSize.jsx";
import { ReasonNote } from "./ReasonNote.jsx";
import { Badge } from "../core/Badge.jsx";
import { PhotoFrame } from "../core/PhotoFrame.jsx";

/**
 * The core Madli unit: one of three picks, with its reason attached.
 * Never renders without a reason — a pick with no reason is not a pick.
 */
export function PickCard({
  rank = 1, name, category, neighborhood, priceLevel, reason, reasonLabel, gem = false,
  gapTone = "clear", gapPoints, gapNote, locals, visitors, dataWindow, photoSrc, photoLabel,
  layout = "vertical", onClick, style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const horizontal = layout === "horizontal";
  const meta = [category, neighborhood, priceLevel].filter(Boolean).join("  ·  ");
  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", flexDirection: horizontal ? "row" : "column",
        gap: horizontal ? "var(--space-5)" : 0,
        background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-xl)", overflow: "hidden",
        boxShadow: hover && onClick ? "var(--shadow-md)" : "var(--shadow-sm)",
        transition: "var(--transition-shadow), var(--transition-color)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
      {...rest}
    >
      <div style={{ position: "relative", flex: horizontal ? "0 0 190px" : undefined }}>
        <PhotoFrame
          src={photoSrc} label={photoLabel || name}
          ratio={horizontal ? "1 / 1" : "16 / 10"}
          radius={horizontal ? "0" : "0"}
          style={{ height: horizontal ? "100%" : undefined }}
        />
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, alignItems: "center" }}>
          <RankBadge rank={rank} size="md" />
          {gem ? <Badge tone="onImage">Local gem</Badge> : null}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: horizontal ? "var(--space-5) var(--space-5) var(--space-5) 0" : "var(--space-5)", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h3 style={{ font: "var(--type-h3)", letterSpacing: "var(--tracking-display)" }}>{name}</h3>
          {meta ? <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{meta}</p> : null}
        </div>
        {reason ? <ReasonNote label={reasonLabel || (gem ? "Why this is a gem" : "Why this one")} tone={gem ? "gem" : "plain"}>{reason}</ReasonNote> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "auto" }}>
          <RankGap tone={gapTone} points={gapPoints} note={gapNote} />
          <SampleSize locals={locals} visitors={visitors} window={dataWindow} />
        </div>
      </div>
    </article>
  );
}
