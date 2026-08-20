/* @ds-bundle: {"format":4,"namespace":"MadliDesignSystem_b70beb","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"PhotoFrame","sourcePath":"components/core/PhotoFrame.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"PickSkeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"SearchField","sourcePath":"components/forms/SearchField.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"},{"name":"PickCard","sourcePath":"components/trust/PickCard.jsx"},{"name":"RankBadge","sourcePath":"components/trust/RankBadge.jsx"},{"name":"RankGap","sourcePath":"components/trust/RankGap.jsx"},{"name":"ReasonNote","sourcePath":"components/trust/ReasonNote.jsx"},{"name":"SampleSize","sourcePath":"components/trust/SampleSize.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"d9366d9db93a","components/core/Button.jsx":"49969017d994","components/core/Card.jsx":"1ad49da520c4","components/core/Icon.jsx":"3a36a51a8303","components/core/IconButton.jsx":"6c76e30fc592","components/core/Logo.jsx":"4b79d9d2ee76","components/core/PhotoFrame.jsx":"4e7effa05a9d","components/core/Tag.jsx":"7d8730d6f86a","components/feedback/Dialog.jsx":"2009689f8a51","components/feedback/EmptyState.jsx":"d655cc4bb1c4","components/feedback/Skeleton.jsx":"380d8fe39014","components/feedback/Toast.jsx":"2113460b9c54","components/feedback/Tooltip.jsx":"ff22c4e39dec","components/forms/Checkbox.jsx":"e828b6a74c01","components/forms/Input.jsx":"c37613da5448","components/forms/Radio.jsx":"3cdc66e47665","components/forms/SearchField.jsx":"21fe2efd97a7","components/forms/Select.jsx":"168596959f39","components/forms/Switch.jsx":"bbcb05aafd1d","components/navigation/TabBar.jsx":"00d79a00d9ef","components/navigation/Tabs.jsx":"155073f27e6e","components/navigation/TopBar.jsx":"fc1c944954c5","components/trust/PickCard.jsx":"4a5ab6a0bf84","components/trust/RankBadge.jsx":"a3f822314ded","components/trust/RankGap.jsx":"30c53cb080ae","components/trust/ReasonNote.jsx":"dce6936459fe","components/trust/SampleSize.jsx":"ae936c845ed9","ui_kits/madli-app/App.jsx":"c120e700cb01","ui_kits/madli-app/PickDetailScreen.jsx":"ec511d3f254b","ui_kits/madli-app/PicksScreen.jsx":"f9ead7b5f7ee","ui_kits/madli-app/SecondaryScreens.jsx":"b9eb5ed6e379","ui_kits/madli-app/StartScreen.jsx":"8f9007e81df9","ui_kits/madli-app/data.js":"38e9ac50742d","ui_kits/madli-site/SitePage.jsx":"3e3fc8c16454","ui_kits/madli-site/SiteSections.jsx":"12b45f933e8f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MadliDesignSystem_b70beb = window.MadliDesignSystem_b70beb || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    background: "var(--surface-sunken)",
    color: "var(--text-body)"
  },
  teal: {
    background: "var(--teal-50)",
    color: "var(--teal-600)"
  },
  sky: {
    background: "var(--status-info-bg)",
    color: "var(--status-info-fg)"
  },
  coral: {
    background: "var(--surface-coral-soft)",
    color: "var(--coral-600)"
  },
  success: {
    background: "var(--status-success-bg)",
    color: "var(--status-success-fg)"
  },
  warn: {
    background: "var(--status-warn-bg)",
    color: "var(--status-warn-fg)"
  },
  solid: {
    background: "var(--action-primary)",
    color: "var(--text-on-dark)"
  },
  onImage: {
    background: "rgba(11,47,54,0.72)",
    color: "var(--white)"
  }
};
function Badge({
  children,
  tone = "neutral",
  uppercase = true,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      font: "var(--type-eyebrow)",
      textTransform: uppercase ? "uppercase" : "none",
      letterSpacing: uppercase ? "var(--tracking-wide)" : "0",
      padding: "4px 9px",
      borderRadius: "var(--radius-pill)",
      whiteSpace: "nowrap",
      ...t,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 36,
    padding: "0 14px",
    font: "var(--type-body-sm)",
    radius: "var(--radius-sm)",
    gap: 6
  },
  md: {
    height: 44,
    padding: "0 20px",
    font: "var(--type-label)",
    radius: "var(--radius-md)",
    gap: 8
  },
  lg: {
    height: 52,
    padding: "0 26px",
    font: "var(--type-body-lg)",
    radius: "var(--radius-md)",
    gap: 10
  }
};
const VARIANTS = {
  primary: {
    background: "var(--action-primary)",
    color: "var(--text-on-dark)",
    border: "1px solid transparent",
    boxShadow: "var(--shadow-xs)"
  },
  accent: {
    background: "var(--action-accent)",
    color: "var(--text-on-dark)",
    border: "1px solid transparent",
    boxShadow: "var(--shadow-xs)"
  },
  secondary: {
    background: "var(--surface-card)",
    color: "var(--text-heading)",
    border: "1px solid var(--border-strong)",
    boxShadow: "var(--shadow-xs)"
  },
  ghost: {
    background: "transparent",
    color: "var(--text-body)",
    border: "1px solid transparent",
    boxShadow: "none"
  },
  quiet: {
    background: "var(--surface-sunken)",
    color: "var(--text-heading)",
    border: "1px solid transparent",
    boxShadow: "none"
  },
  inverse: {
    background: "var(--white)",
    color: "var(--teal-800)",
    border: "1px solid transparent",
    boxShadow: "none"
  }
};
const HOVER = {
  primary: "var(--action-primary-hover)",
  accent: "var(--action-accent-hover)",
  secondary: "var(--slate-50)",
  ghost: "var(--action-ghost-hover)",
  quiet: "var(--slate-200)",
  inverse: "var(--slate-100)"
};
function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  iconLeft,
  iconRight,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: block ? "flex" : "inline-flex",
      width: block ? "100%" : undefined,
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      font: s.font,
      letterSpacing: "0.01em",
      borderRadius: s.radius,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "var(--transition-color), var(--transition-shadow), var(--transition-transform)",
      whiteSpace: "nowrap",
      textAlign: "center",
      ...v,
      ...(disabled ? {
        background: "var(--action-disabled-bg)",
        color: "var(--action-disabled-text)",
        border: "1px solid transparent",
        boxShadow: "none"
      } : {}),
      ...(!disabled && hover ? {
        background: HOVER[variant]
      } : {}),
      ...(!disabled && press ? {
        transform: "var(--press-translate)",
        boxShadow: "none"
      } : {}),
      ...style
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  padding = "var(--space-5)",
  interactive = false,
  elevation = "sm",
  radius = "var(--radius-lg)",
  as = "div",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const El = as;
  const shadows = {
    none: "none",
    xs: "var(--shadow-xs)",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)"
  };
  return /*#__PURE__*/React.createElement(El, _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: radius,
      padding,
      boxShadow: shadows[elevation] ?? shadows.sm,
      transition: "var(--transition-shadow), var(--transition-color)",
      cursor: interactive ? "pointer" : undefined,
      ...(interactive && hover ? {
        boxShadow: "var(--shadow-md)",
        borderColor: "var(--border-strong)"
      } : {}),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = "https://unpkg.com/lucide-static@0.475.0/icons/";
const cache = {};

/**
 * Recolorable icon. Madli has no proprietary glyph set, so the system uses
 * Lucide (static SVGs from CDN) applied as a CSS mask so `color` drives the ink.
 * The glyph is only inked once the mask has actually loaded — if the CDN is
 * unreachable the icon renders as empty space, never as a filled block.
 */
function Icon({
  name,
  size = 20,
  color = "currentColor",
  style,
  ...rest
}) {
  const url = BASE + name + ".svg";
  const [ok, setOk] = React.useState(() => cache[url] === true);
  React.useEffect(() => {
    if (cache[url] === true) {
      setOk(true);
      return;
    }
    if (cache[url] === false) return;
    const img = new Image();
    img.onload = () => {
      cache[url] = true;
      setOk(true);
    };
    img.onerror = () => {
      cache[url] = false;
    };
    img.src = url;
  }, [url]);
  return /*#__PURE__*/React.createElement("span", _extends({
    role: "img",
    "aria-hidden": !rest["aria-label"],
    style: {
      display: "inline-block",
      width: size,
      height: size,
      flex: "0 0 auto",
      background: ok ? color : "transparent",
      WebkitMaskImage: `url(${url})`,
      maskImage: `url(${url})`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 32,
  md: 40,
  lg: 44
};
function IconButton({
  icon,
  label,
  size = "md",
  variant = "ghost",
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const box = SIZES[size] || SIZES.md;
  const skins = {
    ghost: {
      background: "transparent",
      color: "var(--text-body)",
      border: "1px solid transparent",
      hover: "var(--action-ghost-hover)"
    },
    outline: {
      background: "var(--surface-card)",
      color: "var(--text-heading)",
      border: "1px solid var(--border-strong)",
      hover: "var(--slate-50)"
    },
    solid: {
      background: "var(--action-primary)",
      color: "var(--text-on-dark)",
      border: "1px solid transparent",
      hover: "var(--action-primary-hover)"
    },
    onImage: {
      background: "rgba(255,255,255,0.9)",
      color: "var(--teal-800)",
      border: "1px solid transparent",
      hover: "var(--white)"
    }
  };
  const sk = skins[variant] || skins.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: box,
      height: box,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "var(--transition-color)",
      background: sk.background,
      color: sk.color,
      border: sk.border,
      ...(hover && !disabled ? {
        background: sk.hover
      } : {}),
      ...(disabled ? {
        color: "var(--action-disabled-text)"
      } : {}),
      ...style
    }
  }, rest), typeof icon === "string" ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === "sm" ? 16 : 20
  }) : icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const FILES = {
  full: "logo-madli-full.png",
  lockup: "logo-madli-full.png",
  mark: "logo-mark-transparent.png",
  wordmark: "logo-wordmark-transparent.png",
  tagline: "logo-tagline-transparent.png"
};

/**
 * The Madli mark. Always the supplied artwork — never redrawn, never recoloured.
 * `assetBase` is the path from the consuming page to this system's /assets folder.
 */
function Logo({
  variant = "wordmark",
  height = 28,
  assetBase = "assets",
  style,
  ...rest
}) {
  const file = FILES[variant] || FILES.wordmark;
  return /*#__PURE__*/React.createElement("img", _extends({
    src: assetBase.replace(/\/$/, "") + "/" + file,
    alt: "Madli",
    style: {
      height,
      width: "auto",
      display: "block",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/PhotoFrame.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Photography container. Madli leans on real photos; until they are supplied a
 * PhotoFrame with no `src` renders a quiet warm placeholder that states what
 * belongs there. Never fills the slot with an illustration or icon.
 */
function PhotoFrame({
  src,
  alt,
  label,
  ratio = "16 / 10",
  radius = "var(--radius-lg)",
  overlay = false,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      aspectRatio: children && !ratio ? undefined : ratio,
      borderRadius: radius,
      overflow: "hidden",
      background: src ? "var(--surface-sunken)" : "var(--brand-cream)",
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt || label || "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "flex-end",
      padding: "var(--space-3)",
      background: "var(--brand-cream)",
      boxShadow: "var(--shadow-inset-hair)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-evidence)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--slate-400)"
    }
  }, "Photo \u2014 ", label || "placeholder")), overlay ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--scrim-bottom)"
    }
  }) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0
    }
  }, children) : null);
}
Object.assign(__ds_scope, { PhotoFrame });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PhotoFrame.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  children,
  icon,
  selected = false,
  onClick,
  onRemove,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!onClick;
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--type-body-sm)",
      padding: onRemove ? "6px 8px 6px 11px" : "6px 11px",
      borderRadius: "var(--radius-sm)",
      cursor: interactive ? "pointer" : "default",
      transition: "var(--transition-color)",
      background: selected ? "var(--teal-500)" : "var(--surface-sunken)",
      color: selected ? "var(--text-on-dark)" : "var(--text-body)",
      border: "1px solid " + (selected ? "var(--teal-500)" : "var(--border-hairline)"),
      ...(interactive && hover && !selected ? {
        background: "var(--slate-200)"
      } : {}),
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14
  }) : null, children, onRemove ? /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      onRemove();
    },
    style: {
      display: "inline-flex",
      cursor: "pointer",
      opacity: 0.6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 13
  })) : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * One dialog component, two presentations: a centred modal on wide viewports
 * and a bottom sheet on the phone. Both fade the scrim and slide 8px, no bounce.
 */
function Dialog({
  open = true,
  variant = "modal",
  title,
  subtitle,
  onClose,
  footer,
  children,
  width = 460,
  style,
  ...rest
}) {
  if (!open) return null;
  const sheet = variant === "sheet";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 60,
      display: "flex",
      alignItems: sheet ? "flex-end" : "center",
      justifyContent: "center",
      background: "var(--scrim-flat)",
      padding: sheet ? 0 : "var(--space-6)",
      animation: "madli-fade-up var(--dur-base) var(--ease-out)"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", _extends({
    onClick: e => e.stopPropagation(),
    style: {
      width: sheet ? "100%" : "min(100%, " + width + "px)",
      background: "var(--surface-card)",
      borderRadius: sheet ? "var(--radius-2xl) var(--radius-2xl) 0 0" : "var(--radius-xl)",
      boxShadow: sheet ? "var(--shadow-sheet)" : "var(--shadow-lg)",
      padding: "var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      ...style
    }
  }, rest), sheet ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 4,
      borderRadius: "var(--radius-pill)",
      background: "var(--border-strong)",
      alignSelf: "center",
      marginTop: -8
    }
  }) : null, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)"
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, subtitle) : null), onClose && !sheet ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close",
    size: "sm",
    onClick: onClose,
    style: {
      marginRight: -6,
      marginTop: -4
    }
  }) : null) : null, children, footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "var(--space-2)"
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Says what is missing and what to do next. Never apologises twice. */
function EmptyState({
  icon = "map-pin-off",
  title,
  body,
  action,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-3)",
      textAlign: "center",
      padding: "var(--space-9) var(--space-6)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 26,
    color: "var(--text-faint)"
  }), /*#__PURE__*/React.createElement("h4", {
    style: {
      font: "var(--type-h4)",
      color: "var(--text-heading)"
    }
  }, title), body ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)",
      maxWidth: "34ch"
    }
  }, body) : null, action);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Quiet loading placeholder. A slow opacity breath, never a travelling sheen —
 * the app should read as fast, not as busy.
 */
function Skeleton({
  width = "100%",
  height = 12,
  radius = "var(--radius-sm)",
  circle = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    style: {
      display: "block",
      width,
      height: circle ? width : height,
      borderRadius: circle ? "var(--radius-circle)" : radius,
      background: "var(--surface-skeleton)",
      animation: "madli-skeleton var(--skeleton-dur) var(--ease-standard) infinite",
      ...style
    }
  }, rest));
}

/** Skeleton in the exact shape of a PickCard, so nothing shifts on load. */
function PickSkeleton({
  layout = "vertical",
  style
}) {
  const horizontal = layout === "horizontal";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: horizontal ? "row" : "column",
      gap: horizontal ? "var(--space-5)" : 0,
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
      ...style
    }
  }, /*#__PURE__*/React.createElement(Skeleton, {
    width: horizontal ? "190px" : "100%",
    height: horizontal ? "auto" : 150,
    radius: "0",
    style: {
      flex: horizontal ? "0 0 190px" : undefined,
      alignSelf: "stretch"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: horizontal ? "var(--space-5) var(--space-5) var(--space-5) 0" : "var(--space-5)",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Skeleton, {
    width: "58%",
    height: 20
  }), /*#__PURE__*/React.createElement(Skeleton, {
    width: "38%",
    height: 11
  }), /*#__PURE__*/React.createElement(Skeleton, {
    width: "90%",
    height: 11
  }), /*#__PURE__*/React.createElement(Skeleton, {
    width: "72%",
    height: 11
  }), /*#__PURE__*/React.createElement(Skeleton, {
    width: "46%",
    height: 9
  })));
}
Object.assign(__ds_scope, { Skeleton, PickSkeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    bg: "var(--teal-800)",
    fg: "var(--white)",
    icon: null
  },
  success: {
    bg: "var(--teal-800)",
    fg: "var(--white)",
    icon: "check"
  },
  warn: {
    bg: "var(--amber-600)",
    fg: "var(--white)",
    icon: "alert-triangle"
  },
  error: {
    bg: "var(--red-600)",
    fg: "var(--white)",
    icon: "alert-circle"
  }
};

/** Dark, single-line confirmation. Sits above the tab bar; no auto-dismiss animation flourish. */
function Toast({
  children,
  tone = "neutral",
  action,
  actionLabel,
  onDismiss,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      padding: "12px 14px",
      borderRadius: "var(--radius-md)",
      background: t.bg,
      color: t.fg,
      boxShadow: "var(--shadow-lg)",
      font: "var(--type-body-sm)",
      animation: "madli-fade-up var(--dur-base) var(--ease-out)",
      ...style
    }
  }, rest), t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 17,
    color: "currentColor"
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), actionLabel ? /*#__PURE__*/React.createElement("button", {
    onClick: action,
    style: {
      background: "transparent",
      border: "none",
      color: "inherit",
      font: "var(--type-label)",
      cursor: "pointer",
      textDecoration: "underline",
      textUnderlineOffset: 3,
      padding: 0
    }
  }, actionLabel) : null, onDismiss ? /*#__PURE__*/React.createElement("span", {
    onClick: onDismiss,
    style: {
      cursor: "pointer",
      opacity: 0.7,
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 15,
    color: "currentColor"
  })) : null);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Explains a trust term (score, sample window) on hover or tap. Dark, small, 2 lines max. */
function Tooltip({
  label,
  children,
  placement = "top",
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const pos = placement === "bottom" ? {
    top: "calc(100% + 6px)"
  } : {
    bottom: "calc(100% + 6px)"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: "relative",
      display: "inline-flex"
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false)
  }, rest), children, open ? /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
      ...pos,
      background: "var(--teal-800)",
      color: "var(--white)",
      font: "var(--type-caption)",
      padding: "7px 10px",
      borderRadius: "var(--radius-sm)",
      width: "max-content",
      maxWidth: 220,
      boxShadow: "var(--shadow-md)",
      zIndex: 40,
      animation: "madli-fade-up var(--dur-fast) var(--ease-out)",
      ...style
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: "flex",
      alignItems: description ? "flex-start" : "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 20,
      height: 20,
      flex: "0 0 auto",
      marginTop: description ? 2 : 0,
      borderRadius: "var(--radius-xs)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: checked ? "var(--action-primary)" : "var(--surface-card)",
      border: "1px solid " + (checked ? "var(--action-primary)" : "var(--border-strong)"),
      transition: "var(--transition-color)"
    }
  }, checked ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    color: "var(--white)"
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-heading)"
    }
  }, label), description ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, description) : null));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  value,
  onChange,
  placeholder,
  type = "text",
  iconLeft,
  suffix,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || React.useMemo(() => "in-" + Math.random().toString(36).slice(2, 7), []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      font: "var(--type-label)",
      color: "var(--text-heading)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: 44,
      padding: "0 12px",
      borderRadius: "var(--radius-md)",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
      border: "1px solid " + (error ? "var(--red-500)" : focus ? "var(--border-focus)" : "var(--border-strong)"),
      boxShadow: focus && !error ? "var(--shadow-focus)" : "none",
      transition: "var(--transition-color), var(--transition-shadow)"
    }
  }, iconLeft ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: 17,
    color: "var(--text-faint)"
  }) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      font: "var(--type-body)",
      color: "var(--text-heading)"
    }
  }, rest)), suffix ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-faint)"
    }
  }, suffix) : null), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--status-error-fg)"
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  name,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: "flex",
      alignItems: description ? "flex-start" : "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    checked: checked,
    onChange: () => onChange && onChange(true),
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      flex: "0 0 auto",
      marginTop: description ? 2 : 0,
      borderRadius: "var(--radius-circle)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--surface-card)",
      border: "1px solid " + (checked ? "var(--action-primary)" : "var(--border-strong)"),
      transition: "var(--transition-color)"
    }
  }, checked ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "var(--radius-circle)",
      background: "var(--action-primary)"
    }
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-heading)"
    }
  }, label), description ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, description) : null));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchField({
  value,
  onChange,
  placeholder = "Search a city or a craving",
  onSubmit,
  size = "md",
  onClear,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === "lg" ? 52 : 44;
  return /*#__PURE__*/React.createElement("form", _extends({
    onSubmit: e => {
      e.preventDefault();
      onSubmit && onSubmit(value);
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: h,
      padding: "0 14px",
      borderRadius: "var(--radius-pill)",
      background: "var(--surface-card)",
      border: "1px solid " + (focus ? "var(--border-focus)" : "var(--border-hairline)"),
      boxShadow: focus ? "var(--shadow-focus)" : "var(--shadow-sm)",
      transition: "var(--transition-color), var(--transition-shadow)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 18,
    color: "var(--text-faint)"
  }), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      font: size === "lg" ? "var(--type-body-lg)" : "var(--type-body)",
      color: "var(--text-heading)"
    }
  }), value && onClear ? /*#__PURE__*/React.createElement("span", {
    onClick: onClear,
    style: {
      cursor: "pointer",
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16,
    color: "var(--text-faint)"
  })) : null);
}
Object.assign(__ds_scope, { SearchField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  value,
  onChange,
  options = [],
  hint,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const selectId = id || React.useMemo(() => "sel-" + Math.random().toString(36).slice(2, 7), []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: selectId,
    style: {
      font: "var(--type-label)",
      color: "var(--text-heading)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selectId,
    value: value,
    onChange: onChange,
    disabled: disabled,
    style: {
      appearance: "none",
      width: "100%",
      height: 44,
      padding: "0 38px 0 12px",
      borderRadius: "var(--radius-md)",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
      border: "1px solid var(--border-strong)",
      font: "var(--type-body)",
      color: "var(--text-heading)",
      cursor: disabled ? "not-allowed" : "pointer",
      outline: "none"
    }
  }, rest), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value ?? o,
    value: o.value ?? o
  }, o.label ?? o))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 17,
    color: "var(--text-muted)",
    style: {
      position: "absolute",
      right: 12,
      pointerEvents: "none"
    }
  })), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-heading)"
    }
  }, label) : null, description ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, description) : null), /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 44,
      height: 26,
      flex: "0 0 auto",
      borderRadius: "var(--radius-pill)",
      padding: 3,
      display: "inline-flex",
      alignItems: "center",
      background: checked ? "var(--action-primary)" : "var(--slate-300)",
      transition: "background-color var(--dur-fast) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "var(--radius-circle)",
      background: "var(--white)",
      boxShadow: "var(--shadow-xs)",
      transform: checked ? "translateX(18px)" : "translateX(0)",
      transition: "transform var(--dur-fast) var(--ease-standard)"
    }
  })));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Bottom bar for the Madli app. Four destinations, labels always visible. */
function TabBar({
  items = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: "flex",
      alignItems: "stretch",
      background: "var(--bar-scrim)",
      backdropFilter: "var(--blur-bar)",
      WebkitBackdropFilter: "var(--blur-bar)",
      borderTop: "1px solid var(--border-hairline)",
      padding: "8px 6px 10px",
      ...style
    }
  }, rest), items.map(it => {
    const active = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      onClick: () => onChange && onChange(it.value),
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        minHeight: "var(--tap-target-min)",
        padding: "4px 0",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--teal-500)" : "var(--text-faint)",
        transition: "var(--transition-color)"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 21
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-evidence)",
        fontWeight: active ? "var(--weight-demi)" : "var(--weight-book)",
        letterSpacing: "0.02em"
      }
    }, it.label));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Segmented control. Madli uses it for scope switches (Eat / Do / Stay). */
function Tabs({
  items = [],
  value,
  onChange,
  size = "md",
  style,
  ...rest
}) {
  const h = size === "sm" ? 34 : 40;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "inline-flex",
      gap: 2,
      padding: 3,
      height: h + 6,
      background: "var(--surface-sunken)",
      borderRadius: "var(--radius-md)",
      ...style
    }
  }, rest), items.map(it => {
    const v = it.value ?? it;
    const active = v === value;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(v),
      style: {
        height: h,
        padding: "0 16px",
        border: "none",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        font: "var(--type-label)",
        background: active ? "var(--surface-card)" : "transparent",
        color: active ? "var(--text-heading)" : "var(--text-muted)",
        boxShadow: active ? "var(--shadow-xs)" : "none",
        transition: "var(--transition-color), var(--transition-shadow)"
      }
    }, it.label ?? v);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** App header. Sticky, translucent over scrolling content, hairline underneath. */
function TopBar({
  title,
  subtitle,
  leading,
  trailing,
  onBack,
  sticky = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      position: sticky ? "sticky" : "static",
      top: 0,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      minHeight: 56,
      padding: "10px var(--gutter-mobile)",
      background: "var(--bar-scrim)",
      backdropFilter: "var(--blur-bar)",
      WebkitBackdropFilter: "var(--blur-bar)",
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, rest), onBack ? /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    "aria-label": "Back",
    style: {
      width: 36,
      height: 36,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      marginLeft: -8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-left",
    size: 20,
    color: "var(--text-heading)"
  })) : leading, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 1
    }
  }, title ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-h4)",
      color: "var(--text-heading)"
    }
  }, title) : null, subtitle ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-caption)",
      color: "var(--text-muted)"
    }
  }, subtitle) : null), trailing);
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// components/trust/RankBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  1: {
    fill: "var(--rank-1)",
    ring: "rgba(15,118,110,0.18)",
    ink: "var(--white)"
  },
  2: {
    fill: "var(--rank-2)",
    ring: "rgba(56,189,248,0.22)",
    ink: "var(--teal-900)"
  },
  3: {
    fill: "var(--rank-3)",
    ring: "rgba(100,116,139,0.20)",
    ink: "var(--white)"
  }
};
const SIZES = {
  sm: {
    box: 26,
    font: 14,
    ring: 2
  },
  md: {
    box: 34,
    font: 19,
    ring: 3
  },
  lg: {
    box: 46,
    font: 26,
    ring: 4
  }
};
function RankBadge({
  rank = 1,
  size = "md",
  variant = "solid",
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const t = TONE[rank] || TONE[3];
  const solid = variant === "solid";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: s.box,
      height: s.box,
      flex: "0 0 auto",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-circle)",
      background: solid ? t.fill : "var(--white)",
      color: solid ? t.ink : t.fill,
      // a soft halo ring instead of a hard border — reads as a medal, not a bullet
      boxShadow: solid ? `0 0 0 ${s.ring}px ${t.ring}, var(--shadow-xs)` : `inset 0 0 0 1.5px ${t.fill}, 0 0 0 ${s.ring}px ${t.ring}`,
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-black)",
      fontStyle: "var(--display-upright)",
      fontSize: s.font,
      lineHeight: 1,
      fontVariantNumeric: "lining-nums",
      // optical centering: Cooper's numerals sit slightly low and left-heavy
      paddingLeft: 1,
      paddingBottom: 1,
      ...style
    }
  }, rest), rank);
}
Object.assign(__ds_scope, { RankBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/RankBadge.jsx", error: String((e && e.message) || e) }); }

// components/trust/RankGap.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * States the distance between this pick and the next one, plainly.
 * Madli shows gaps openly — a near-tie is said out loud, not hidden.
 */
const TONES = {
  clear: {
    color: "var(--gap-clear)",
    label: "Clear gap"
  },
  close: {
    color: "var(--gap-close)",
    label: "Close call"
  },
  thin: {
    color: "var(--gap-thin)",
    label: "Thin data"
  }
};
function RankGap({
  tone = "clear",
  points,
  comparedTo = "#2",
  note,
  showBar = true,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.clear;
  const pct = tone === "clear" ? 82 : tone === "close" ? 34 : 14;
  const text = note || (points != null ? `${points > 0 ? "+" : ""}${points} pts over ${comparedTo}` : t.label);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 5,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "var(--radius-circle)",
      background: t.color,
      flex: "0 0 auto"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-body)"
    }
  }, text)), showBar ? /*#__PURE__*/React.createElement("div", {
    style: {
      height: 3,
      borderRadius: "var(--radius-pill)",
      background: "var(--surface-sunken)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      height: "100%",
      background: t.color,
      borderRadius: "var(--radius-pill)"
    }
  })) : null);
}
Object.assign(__ds_scope, { RankGap });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/RankGap.jsx", error: String((e && e.message) || e) }); }

// components/trust/ReasonNote.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The reason next to a pick — the one thing Madli never crowds out.
 * One sentence, body-size, held to --reason-max so it always sets in 2–3 lines.
 */
function ReasonNote({
  children,
  label = "Why this one",
  tone = "plain",
  style,
  ...rest
}) {
  const rail = tone === "gem" ? "var(--action-accent)" : "var(--teal-200)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 5,
      paddingLeft: "var(--space-3)",
      borderLeft: "2px solid " + rail,
      maxWidth: "var(--reason-max)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-eyebrow)",
      color: tone === "gem" ? "var(--coral-600)" : "var(--teal-600)"
    }
  }, label), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-body)"
    }
  }, children));
}
Object.assign(__ds_scope, { ReasonNote });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/ReasonNote.jsx", error: String((e && e.message) || e) }); }

// components/trust/SampleSize.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The evidence line. Always real counts, never "thousands of reviews".
 * Reads as a footnote: small, grey, factual, no icon decoration.
 */
function SampleSize({
  locals,
  visitors,
  window: windowLabel = "last 90 days",
  extra,
  style,
  ...rest
}) {
  const parts = [];
  if (locals != null) parts.push(`${locals.toLocaleString()} locals`);
  if (visitors != null) parts.push(`${visitors.toLocaleString()} visitors`);
  if (windowLabel) parts.push(windowLabel);
  if (extra) parts.push(extra);
  return /*#__PURE__*/React.createElement("p", _extends({
    style: {
      font: "var(--type-evidence)",
      color: "var(--evidence-text)",
      letterSpacing: "0.01em",
      ...style
    }
  }, rest), parts.join("  ·  "));
}
Object.assign(__ds_scope, { SampleSize });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/SampleSize.jsx", error: String((e && e.message) || e) }); }

// components/trust/PickCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The core Madli unit: one of three picks, with its reason attached.
 * Never renders without a reason — a pick with no reason is not a pick.
 */
function PickCard({
  rank = 1,
  name,
  category,
  neighborhood,
  priceLevel,
  reason,
  reasonLabel,
  gem = false,
  gapTone = "clear",
  gapPoints,
  gapNote,
  locals,
  visitors,
  dataWindow,
  photoSrc,
  photoLabel,
  layout = "vertical",
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const horizontal = layout === "horizontal";
  const meta = [category, neighborhood, priceLevel].filter(Boolean).join("  ·  ");
  return /*#__PURE__*/React.createElement("article", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      flexDirection: horizontal ? "row" : "column",
      gap: horizontal ? "var(--space-5)" : 0,
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      boxShadow: hover && onClick ? "var(--shadow-md)" : "var(--shadow-sm)",
      transition: "var(--transition-shadow), var(--transition-color)",
      cursor: onClick ? "pointer" : undefined,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: horizontal ? "0 0 190px" : undefined
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PhotoFrame, {
    src: photoSrc,
    label: photoLabel || name,
    ratio: horizontal ? "1 / 1" : "16 / 10",
    radius: horizontal ? "0" : "0",
    style: {
      height: horizontal ? "100%" : undefined
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      left: 12,
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.RankBadge, {
    rank: rank,
    size: "md"
  }), gem ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "onImage"
  }, "Local gem") : null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      padding: horizontal ? "var(--space-5) var(--space-5) var(--space-5) 0" : "var(--space-5)",
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--type-h3)",
      letterSpacing: "var(--tracking-display)"
    }
  }, name), meta ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, meta) : null), reason ? /*#__PURE__*/React.createElement(__ds_scope.ReasonNote, {
    label: reasonLabel || (gem ? "Why this is a gem" : "Why this one"),
    tone: gem ? "gem" : "plain"
  }, reason) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.RankGap, {
    tone: gapTone,
    points: gapPoints,
    note: gapNote
  }), /*#__PURE__*/React.createElement(__ds_scope.SampleSize, {
    locals: locals,
    visitors: visitors,
    window: dataWindow
  }))));
}
Object.assign(__ds_scope, { PickCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/PickCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/madli-app/App.jsx
try { (() => {
const {
  TabBar,
  Toast
} = window.MadliDesignSystem_b70beb;
function App() {
  const [view, setView] = React.useState("start");
  const [tab, setTab] = React.useState("picks");
  const [scope, setScope] = React.useState("eat");
  const [pick, setPick] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const start = () => {
    setView("app");
    setLoading(true);
    setTimeout(() => setLoading(false), 900);
  };
  const changeScope = s => {
    setScope(s);
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };
  const save = () => {
    setToast("Saved to Kadıköy list");
    setTimeout(() => setToast(null), 2600);
  };
  let body;
  if (view === "start") body = /*#__PURE__*/React.createElement(window.StartScreen, {
    onStart: start
  });else if (pick) body = /*#__PURE__*/React.createElement(window.PickDetailScreen, {
    pick: pick,
    onBack: () => setPick(null),
    onSave: save
  });else if (tab === "picks") body = /*#__PURE__*/React.createElement(window.PicksScreen, {
    scope: scope,
    onScope: changeScope,
    onOpen: setPick,
    loading: loading
  });else if (tab === "map") body = /*#__PURE__*/React.createElement(window.MapScreen, null);else if (tab === "saved") body = /*#__PURE__*/React.createElement(window.SavedScreen, {
    onOpen: () => {
      setTab("picks");
      setPick(window.MADLI_DATA.picks.eat[0]);
    }
  });else body = /*#__PURE__*/React.createElement(window.ProfileScreen, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "phone"
  }, /*#__PURE__*/React.createElement("div", {
    className: "statusbar"
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", null, "Kad\u0131k\xF6y"), /*#__PURE__*/React.createElement("span", null, "100%"))), body, toast ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 92,
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: "success",
    actionLabel: "Undo",
    action: () => setToast(null)
  }, toast)) : null, view === "app" && !pick ? /*#__PURE__*/React.createElement(TabBar, {
    value: tab,
    onChange: t => {
      setTab(t);
      setPick(null);
    },
    items: [{
      value: "picks",
      label: "Picks",
      icon: "sparkles"
    }, {
      value: "map",
      label: "Map",
      icon: "map"
    }, {
      value: "saved",
      label: "Saved",
      icon: "bookmark"
    }, {
      value: "you",
      label: "You",
      icon: "user"
    }]
  }) : null);
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/madli-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/madli-app/PickDetailScreen.jsx
try { (() => {
const {
  TopBar,
  PhotoFrame,
  RankBadge,
  Badge,
  ReasonNote,
  RankGap,
  SampleSize,
  Button,
  IconButton,
  Icon,
  Card,
  Dialog,
  Tooltip
} = window.MadliDesignSystem_b70beb;

// One pick, in full. The reason sits above everything transactional.
function PickDetailScreen({
  pick,
  onBack,
  onSave
}) {
  const [method, setMethod] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    onBack: onBack,
    title: pick.name,
    trailing: /*#__PURE__*/React.createElement(IconButton, {
      icon: "share-2",
      label: "Share"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement(PhotoFrame, {
    label: pick.name,
    ratio: "4 / 3",
    radius: "0",
    overlay: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 14,
      left: 14,
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(RankBadge, {
    rank: pick.rank,
    size: "lg"
  }), pick.gem ? /*#__PURE__*/React.createElement(Badge, {
    tone: "onImage"
  }, "Local gem") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 14,
      left: 16,
      right: 16,
      color: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-caption)",
      opacity: 0.85
    }
  }, pick.category, " \xB7 ", pick.priceLevel), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-h2)",
      fontSize: 30,
      color: "var(--white)"
    }
  }, pick.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-5) var(--gutter-mobile) var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(ReasonNote, {
    tone: pick.gem ? "gem" : "plain",
    label: pick.gem ? "Why this is a gem" : "Why this one"
  }, pick.reason), /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-4)",
    elevation: "none",
    style: {
      background: "var(--surface-sunken)",
      border: "none",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-label)",
      color: "var(--text-heading)"
    }
  }, "Where it sits"), /*#__PURE__*/React.createElement(Tooltip, {
    label: "Points are a 0\u2013100 local score. The gap is what separates this pick from the next."
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 15,
    color: "var(--text-faint)"
  }))), /*#__PURE__*/React.createElement(RankGap, {
    tone: pick.gapTone,
    points: pick.gapPoints,
    note: pick.gapNote
  }), /*#__PURE__*/React.createElement(SampleSize, {
    locals: pick.locals,
    visitors: pick.visitors,
    window: "last 90 days"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMethod(true),
    style: {
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
      font: "var(--type-body-sm)",
      color: "var(--text-link)",
      textDecoration: "underline",
      textUnderlineOffset: 3,
      cursor: "pointer"
    }
  }, "How this was ranked")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, [["map-pin", pick.address], ["footprints", pick.walk], ["clock", pick.open]].map(([ic, text]) => /*#__PURE__*/React.createElement("div", {
    key: text,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      font: "var(--type-body)",
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 17,
    color: "var(--text-faint)"
  }), text))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    style: {
      flex: 1
    },
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "navigation",
      size: 18
    })
  }, "Directions"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: onSave,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "bookmark",
      size: 18
    })
  }, "Save")))), /*#__PURE__*/React.createElement(Dialog, {
    open: method,
    variant: "sheet",
    title: "How this was ranked",
    onClose: () => setMethod(false),
    footer: /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "sm",
      onClick: () => setMethod(false)
    }, "Got it")
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-body)"
    }
  }, pick.method), /*#__PURE__*/React.createElement(SampleSize, {
    locals: pick.locals,
    visitors: pick.visitors,
    window: "last 90 days",
    extra: "ratings older than 18 months dropped"
  })));
}
window.PickDetailScreen = PickDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/madli-app/PickDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/madli-app/PicksScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  TopBar,
  Tabs,
  PickCard,
  PickSkeleton,
  IconButton,
  Badge,
  Button,
  Icon
} = window.MadliDesignSystem_b70beb;

// The main view: exactly three picks for the chosen scope.
function PicksScreen({
  scope,
  onScope,
  onOpen,
  loading
}) {
  const d = window.MADLI_DATA;
  const picks = d.picks[scope];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: d.area,
    subtitle: "3 picks · " + d.updated,
    trailing: /*#__PURE__*/React.createElement(IconButton, {
      icon: "sliders-horizontal",
      label: "Filters"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "var(--space-4) var(--gutter-mobile) var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    items: d.scopes,
    value: scope,
    onChange: onScope,
    style: {
      alignSelf: "flex-start"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)",
      fontSize: 28
    }
  }, scope === "eat" ? "Eat tonight" : scope === "do" ? "Do this evening" : "Stay two nights"), /*#__PURE__*/React.createElement(Badge, {
    tone: "teal"
  }, "Locals weighted")), loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PickSkeleton, null), /*#__PURE__*/React.createElement(PickSkeleton, null)) : picks.map(p => /*#__PURE__*/React.createElement(PickCard, _extends({
    key: p.name
  }, p, {
    photoLabel: p.name,
    dataWindow: "last 90 days",
    onClick: () => onOpen(p)
  }))), !loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      padding: "var(--space-4) 0"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, "That is the list. We stop at three on purpose."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "refresh-cw",
      size: 16
    }),
    style: {
      alignSelf: "flex-start"
    }
  }, "Re-rank without chains")) : null));
}
window.PicksScreen = PicksScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/madli-app/PicksScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/madli-app/SecondaryScreens.jsx
try { (() => {
const {
  TopBar,
  Card,
  PhotoFrame,
  Button,
  EmptyState,
  Switch,
  Radio,
  Icon,
  Badge,
  SampleSize
} = window.MadliDesignSystem_b70beb;
function SavedScreen({
  onOpen
}) {
  const items = window.MADLI_DATA.saved;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Saved",
    subtitle: items.length + " places · 1 list"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "var(--space-4) var(--gutter-mobile) var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, items.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.name,
    padding: "var(--space-3)",
    interactive: true,
    onClick: onOpen,
    style: {
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(PhotoFrame, {
    label: s.name,
    ratio: "1 / 1",
    radius: "var(--radius-md)",
    style: {
      width: 56,
      flex: "0 0 56px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-h4)",
      fontSize: 17,
      color: "var(--text-heading)"
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, s.area), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-evidence)",
      color: "var(--evidence-text)",
      marginTop: 2
    }
  }, s.note)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-faint)"
  }))), /*#__PURE__*/React.createElement(EmptyState, {
    icon: "folder-plus",
    title: "One list is usually enough",
    body: "Make another only if you are planning a different trip.",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm"
    }, "New list"),
    style: {
      padding: "var(--space-7) var(--space-4)"
    }
  })));
}
function ProfileScreen() {
  const [gaps, setGaps] = React.useState(true);
  const [chains, setChains] = React.useState(false);
  const [basis, setBasis] = React.useState("locals");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "You",
    subtitle: "Kad\u0131k\xF6y \xB7 34 ratings given"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "var(--space-4) var(--gutter-mobile) var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-4)",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-label)",
      color: "var(--text-heading)"
    }
  }, "Your local status"), /*#__PURE__*/React.createElement(Badge, {
    tone: "teal"
  }, "Local \xB7 Kad\u0131k\xF6y")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-body)"
    }
  }, "Your ratings in Kad\u0131k\xF6y count at full weight. Elsewhere they count as a visitor."), /*#__PURE__*/React.createElement(SampleSize, {
    extra: "34 ratings given \xB7 18 in Kad\u0131k\xF6y",
    window: ""
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--text-muted)"
    }
  }, "How you want it ranked"), /*#__PURE__*/React.createElement(Radio, {
    name: "basis",
    label: "Locals only",
    description: "Ignores visitor ratings entirely",
    checked: basis === "locals",
    onChange: () => setBasis("locals")
  }), /*#__PURE__*/React.createElement(Radio, {
    name: "basis",
    label: "Locals weighted",
    description: "Visitors count for a fifth as much",
    checked: basis === "weighted",
    onChange: () => setBasis("weighted")
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Show ranking gaps",
    description: "Tell me when #1 and #2 are close",
    checked: gaps,
    onChange: setGaps
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Include chains",
    description: "Off by default",
    checked: chains,
    onChange: setChains
  }))));
}
function MapScreen() {
  const {
    EmptyState: ES,
    Button: B
  } = window.MadliDesignSystem_b70beb;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: "Map",
    subtitle: "Kad\u0131k\xF6y \xB7 3 picks"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement(ES, {
    icon: "map",
    title: "Map view not in the source material",
    body: "No map screen was supplied for this kit, so it is left blank rather than invented.",
    action: /*#__PURE__*/React.createElement(B, {
      variant: "secondary",
      size: "sm"
    }, "Back to picks")
  })));
}
Object.assign(window, {
  SavedScreen,
  ProfileScreen,
  MapScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/madli-app/SecondaryScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/madli-app/StartScreen.jsx
try { (() => {
const {
  SearchField,
  Button,
  Tag,
  Logo,
  Icon
} = window.MadliDesignSystem_b70beb;

// Entry screen. One question, three shortcuts, one action.
function StartScreen({
  onStart
}) {
  const [q, setQ] = React.useState("Kadıköy, Istanbul");
  const [craving, setCraving] = React.useState("Dinner");
  const cravings = ["Dinner", "Breakfast", "Something to do", "A quiet night"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "var(--brand-cream)",
      padding: "var(--gutter-mobile)",
      paddingTop: 56,
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "wordmark",
    height: 30,
    assetBase: "../../assets"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--type-h1)",
      fontSize: 40
    }
  }, "Three picks, one reason each."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-lg)",
      color: "var(--slate-600)",
      maxWidth: "var(--reason-max)"
    }
  }, "Ranked by people who actually eat here. Decide in two minutes.")), /*#__PURE__*/React.createElement(SearchField, {
    value: q,
    onChange: e => setQ(e.target.value),
    size: "lg",
    placeholder: "Where are you?"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--slate-500)"
    }
  }, "What are you after"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-2)"
    }
  }, cravings.map(c => /*#__PURE__*/React.createElement(Tag, {
    key: c,
    selected: craving === c,
    onClick: () => setCraving(c)
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      paddingBottom: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg",
    block: true,
    onClick: onStart,
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    })
  }, "Get 3 picks"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-caption)",
      color: "var(--slate-500)",
      textAlign: "center"
    }
  }, "1,284 local ratings in Kad\u0131k\xF6y \xB7 last 90 days")));
}
window.StartScreen = StartScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/madli-app/StartScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/madli-app/data.js
try { (() => {
const NS = window.MadliDesignSystem_b70beb;

// Three picks per scope. Reasons are the product; every pick carries one.
window.MADLI_DATA = {
  city: "Istanbul",
  area: "Kadıköy",
  updated: "updated 2h ago",
  scopes: [{
    value: "eat",
    label: "Eat"
  }, {
    value: "do",
    label: "Do"
  }, {
    value: "stay",
    label: "Stay"
  }],
  picks: {
    eat: [{
      rank: 1,
      name: "Çiya Sofrası",
      category: "Anatolian",
      neighborhood: "Kadıköy",
      priceLevel: "₺₺",
      reason: "Locals rank it first for a sit-down lunch: the stews change daily and nothing is over 200₺.",
      gapTone: "clear",
      gapPoints: 11,
      locals: 412,
      visitors: 88,
      address: "Güneşli Bahçe Sk. 43",
      walk: "6 min walk",
      open: "Open till 22:00",
      method: "500 local ratings, weighted by how often each person eats in this area. Visitor ratings count for a fifth as much.",
      gem: false
    }, {
      rank: 2,
      name: "Kadıköy Fish Market",
      category: "Seafood · counters",
      neighborhood: "Kadıköy",
      priceLevel: "₺₺",
      reason: "Best if you want to stand and eat: the two counters at the far end turn over fastest, so nothing sits.",
      gapTone: "close",
      gapNote: "3 pts behind #1 — either works",
      locals: 298,
      visitors: 210,
      address: "Serasker Cd.",
      walk: "9 min walk",
      open: "Open till 20:00",
      method: "508 ratings across 14 stalls. We rank the market as one place because locals do.",
      gem: false
    }, {
      rank: 3,
      name: "Bal Kaymak Hüseyin",
      category: "Breakfast",
      neighborhood: "Yeldeğirmeni",
      priceLevel: "₺",
      reason: "Nine tables, no sign, and 84% of the people rating it live within a kilometre.",
      gapTone: "thin",
      gapNote: "Only 61 ratings — treat as a hint",
      locals: 61,
      visitors: 4,
      address: "Karakolhane Cd. 22",
      walk: "14 min walk",
      open: "Closes 13:00",
      method: "61 local ratings. Below our 100-rating threshold, so we show it as a hint, not a verdict.",
      gem: true
    }],
    do: [{
      rank: 1,
      name: "Moda Coastline Walk",
      category: "Walk · 40 min",
      neighborhood: "Moda",
      priceLevel: "Free",
      reason: "The one thing almost every local recommends to a visitor with a spare evening. Go west, not east.",
      gapTone: "clear",
      gapPoints: 19,
      locals: 640,
      visitors: 302,
      address: "Moda Sahil",
      walk: "12 min walk",
      open: "Best 18:00–20:30",
      method: "942 ratings. Weighted toward people who have rated 5+ places in Kadıköy.",
      gem: false
    }, {
      rank: 2,
      name: "Yeldeğirmeni murals",
      category: "Street art",
      neighborhood: "Yeldeğirmeni",
      priceLevel: "Free",
      reason: "Six blocks, about 25 minutes. Locals rate it higher on weekday mornings when the streets are empty.",
      gapTone: "close",
      gapNote: "Nearly tied with #1 in summer",
      locals: 188,
      visitors: 401,
      address: "Macit Erbudak Sk.",
      walk: "8 min walk",
      open: "Anytime",
      method: "589 ratings. Visitors rate this higher than locals — we show both.",
      gem: false
    }, {
      rank: 3,
      name: "Barış Manço Museum",
      category: "Museum",
      neighborhood: "Moda",
      priceLevel: "₺",
      reason: "Small and specific. Worth it if you already know the music; skip it if you do not.",
      gapTone: "thin",
      gapNote: "Divides opinion — 41% rate it top, 30% rate it low",
      locals: 132,
      visitors: 96,
      address: "Değirmen Sk. 4",
      walk: "11 min walk",
      open: "Closed Mondays",
      method: "228 ratings with an unusually wide spread, so we say so instead of averaging it away.",
      gem: false
    }],
    stay: [{
      rank: 1,
      name: "Hush Moda",
      category: "Guesthouse · 14 rooms",
      neighborhood: "Moda",
      priceLevel: "₺₺",
      reason: "Quietest of the three and the only one where locals send their own visiting family.",
      gapTone: "clear",
      gapPoints: 8,
      locals: 96,
      visitors: 344,
      address: "Bademaltı Sk. 6",
      walk: "10 min walk",
      open: "Check-in 14:00",
      method: "440 ratings. Local weight is lower here — few locals sleep in their own city.",
      gem: false
    }, {
      rank: 2,
      name: "Kadıköy Rooms",
      category: "Apartments",
      neighborhood: "Kadıköy",
      priceLevel: "₺₺",
      reason: "Closest to the ferry, which matters more than anything else if you are here for two nights.",
      gapTone: "close",
      gapNote: "2 pts behind #1",
      locals: 40,
      visitors: 512,
      address: "Serasker Cd. 71",
      walk: "3 min walk",
      open: "Self check-in",
      method: "552 ratings, mostly visitors. We flag that the local sample is thin.",
      gem: false
    }, {
      rank: 3,
      name: "Villa Yeldeğirmeni",
      category: "Guesthouse · 6 rooms",
      neighborhood: "Yeldeğirmeni",
      priceLevel: "₺",
      reason: "Cheapest of the three and the walls are thin. Fine for one night, not for four.",
      gapTone: "thin",
      gapNote: "Only 38 ratings",
      locals: 12,
      visitors: 26,
      address: "Rıhtım Cd. 9",
      walk: "15 min walk",
      open: "Check-in 15:00",
      method: "38 ratings. Shown because there is nothing else in this price band nearby.",
      gem: false
    }]
  },
  saved: [{
    name: "Çiya Sofrası",
    area: "Kadıköy",
    note: "Saved for Thursday lunch"
  }, {
    name: "Moda Coastline Walk",
    area: "Moda",
    note: "Saved 3 days ago"
  }, {
    name: "Bal Kaymak Hüseyin",
    area: "Yeldeğirmeni",
    note: "Saved 1 week ago"
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/madli-app/data.js", error: String((e && e.message) || e) }); }

// ui_kits/madli-site/SitePage.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  PickCard,
  Card,
  Button,
  Badge,
  Icon,
  Logo,
  Tabs,
  SampleSize
} = window.MadliDesignSystem_b70beb;
function SamplePicks() {
  const [scope, setScope] = React.useState("eat");
  const d = window.MADLI_DATA;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--brand-cream)",
      borderTop: "1px solid var(--border-hairline)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--content-max)",
      margin: "0 auto",
      padding: "var(--space-11) var(--gutter-desktop)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: "var(--space-6)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--slate-500)"
    }
  }, "Tonight in Kad\u0131k\xF6y, Istanbul"), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)"
    }
  }, "What you actually get")), /*#__PURE__*/React.createElement(Tabs, {
    items: d.scopes,
    value: scope,
    onChange: setScope
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "var(--space-5)"
    }
  }, d.picks[scope].map(p => /*#__PURE__*/React.createElement(PickCard, _extends({
    key: p.name
  }, p, {
    photoLabel: p.name,
    dataWindow: "last 90 days"
  })))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--slate-600)"
    }
  }, "Three, then it stops. The gap and the sample size are on every card, including the ones we are unsure about.")));
}
function TrustSection() {
  const rows = [["We show the gap", "When #1 and #2 are three points apart we print it. A near-tie is useful information, not a problem to hide."], ["We show the sample", "Every pick carries the real count: 412 locals, 88 visitors, last 90 days. Nothing says 'thousands of reviews'."], ["We stop at three", "A longer list is easier to build and harder to use. If we cannot separate three places honestly, we say the data is thin."], ["We do not sell rank", "Nothing in the top three is paid for. There is no promoted slot and no plan to add one."]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--teal-800)",
      color: "var(--text-on-dark)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--content-max)",
      margin: "0 auto",
      padding: "var(--space-11) var(--gutter-desktop)",
      display: "grid",
      gridTemplateColumns: "0.9fr 1.1fr",
      gap: "var(--space-10)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)",
      color: "var(--white)"
    }
  }, "Why you can trust the order"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-lg)",
      color: "var(--text-on-dark-muted)",
      maxWidth: "40ch"
    }
  }, "The whole product is one promise: the ranking is honest about what it knows and what it does not."), /*#__PURE__*/React.createElement(Button, {
    variant: "inverse",
    size: "md",
    style: {
      alignSelf: "flex-start",
      marginTop: "var(--space-2)"
    },
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 17
    })
  }, "Read the method")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-6) var(--space-7)"
    }
  }, rows.map(([t, b]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      paddingTop: "var(--space-3)",
      borderTop: "1px solid var(--border-on-dark)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-h4)",
      color: "var(--white)"
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-on-dark-muted)"
    }
  }, b))))));
}
function CitiesSection() {
  const cities = [["Istanbul", "1,284 local ratings", "34 areas"], ["Lisbon", "902 local ratings", "12 areas"], ["Mexico City", "1,105 local ratings", "21 areas"], ["Naples", "480 local ratings", "9 areas"], ["Hanoi", "356 local ratings", "7 areas"], ["Tbilisi", "212 local ratings", "5 areas"]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--bg-page)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--content-max)",
      margin: "0 auto",
      padding: "var(--space-11) var(--gutter-desktop)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)"
    }
  }, "Where we rank"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "34 cities")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "var(--space-4)"
    }
  }, cities.map(([c, r, a]) => /*#__PURE__*/React.createElement(Card, {
    key: c,
    interactive: true,
    padding: "var(--space-4)",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--type-h4)"
    }
  }, c), /*#__PURE__*/React.createElement(SampleSize, {
    extra: a,
    window: r
  })), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-faint)"
  })))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, "A city goes live when it has 50 local ratings in at least three neighbourhoods. Until then it stays off the list.")));
}
function SiteFooter() {
  const cols = [["Product", ["How ranking works", "Cities", "Gems", "Download"]], ["Company", ["About", "Method", "Careers", "Press"]], ["Legal", ["Privacy", "Terms", "Rating policy"]]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--brand-cream)",
      borderTop: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--content-max)",
      margin: "0 auto",
      padding: "var(--space-9) var(--gutter-desktop)",
      display: "grid",
      gridTemplateColumns: "1.4fr repeat(3, 1fr)",
      gap: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "mark",
    height: 44,
    assetBase: "../../assets"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--slate-600)",
      maxWidth: "28ch"
    }
  }, "3 picks. 1 reason. 2 minutes.")), cols.map(([title, items]) => /*#__PURE__*/React.createElement("div", {
    key: title,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--slate-500)"
    }
  }, title), items.map(i => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      font: "var(--type-body-sm)",
      borderBottom: "none",
      color: "var(--slate-600)"
    }
  }, i))))));
}
Object.assign(window, {
  SamplePicks,
  TrustSection,
  CitiesSection,
  SiteFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/madli-site/SitePage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/madli-site/SiteSections.jsx
try { (() => {
const {
  Logo,
  Button,
  Icon,
  SearchField,
  Badge
} = window.MadliDesignSystem_b70beb;
function SiteHeader({
  page,
  onPage
}) {
  const links = [["how", "How ranking works"], ["cities", "Cities"], ["gems", "Gems"]];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 30,
      background: "var(--bar-scrim)",
      backdropFilter: "var(--blur-bar)",
      WebkitBackdropFilter: "var(--blur-bar)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--content-max)",
      margin: "0 auto",
      padding: "14px var(--gutter-desktop)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "wordmark",
    height: 24,
    assetBase: "../../assets"
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: "var(--space-6)",
      flex: 1
    }
  }, links.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => onPage(k),
    style: {
      background: "none",
      border: "none",
      padding: 0,
      cursor: "pointer",
      font: "var(--type-body-sm)",
      color: page === k ? "var(--text-heading)" : "var(--text-muted)",
      borderBottom: page === k ? "1.5px solid var(--teal-500)" : "1.5px solid transparent",
      paddingBottom: 2
    }
  }, l))), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "sm"
  }, "Get the app")));
}
function Hero() {
  const [q, setQ] = React.useState("");
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--brand-cream)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--content-max)",
      margin: "0 auto",
      padding: "var(--space-12) var(--gutter-desktop)",
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      gap: "var(--space-10)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--slate-500)"
    }
  }, "Locally ranked food & travel"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--type-display)",
      fontSize: 68
    }
  }, "Three picks.", /*#__PURE__*/React.createElement("br", null), "One reason each."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-lg)",
      color: "var(--slate-600)",
      maxWidth: "48ch"
    }
  }, "Not a list of forty places. Three, ranked by the people who eat there every week, with the reason written out so you can decide in two minutes."), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 420,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(SearchField, {
    size: "lg",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Which city are you in?"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-caption)",
      color: "var(--slate-500)"
    }
  }, "34 cities ranked \xB7 1.2M local ratings \xB7 gaps and sample sizes shown on every pick"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-madli-full.png",
    alt: "Madli",
    style: {
      width: "78%",
      maxWidth: 420,
      mixBlendMode: "multiply"
    }
  }))));
}
function HowSection() {
  const steps = [["map-pin", "Say where you are", "One field. City or neighbourhood — Madli ranks at the neighbourhood level because that is how people actually choose."], ["scale", "We weight locals", "A rating counts at full weight where you live and a fifth as much where you are visiting. Ratings older than 18 months are dropped."], ["list-ordered", "You get three", "With the reason, the gap to the next pick, and the number of people behind it. If the top two are nearly tied, we say so."]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--bg-page)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--content-max)",
      margin: "0 auto",
      padding: "var(--space-11) var(--gutter-desktop)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "var(--type-h2)",
      maxWidth: "22ch"
    }
  }, "How the ranking works"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "var(--space-7)"
    }
  }, steps.map(([ic, title, body], i) => /*#__PURE__*/React.createElement("div", {
    key: title,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      paddingTop: "var(--space-4)",
      borderTop: "2px solid var(--teal-200)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 20,
    color: "var(--teal-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-eyebrow)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-eyebrow)",
      color: "var(--slate-500)"
    }
  }, "Step ", i + 1)), /*#__PURE__*/React.createElement("h4", {
    style: {
      font: "var(--type-h4)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body)",
      color: "var(--text-body)"
    }
  }, body))))));
}
Object.assign(window, {
  SiteHeader,
  Hero,
  HowSection
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/madli-site/SiteSections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.PhotoFrame = __ds_scope.PhotoFrame;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.PickSkeleton = __ds_scope.PickSkeleton;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.SearchField = __ds_scope.SearchField;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.TopBar = __ds_scope.TopBar;

__ds_ns.PickCard = __ds_scope.PickCard;

__ds_ns.RankBadge = __ds_scope.RankBadge;

__ds_ns.RankGap = __ds_scope.RankGap;

__ds_ns.ReasonNote = __ds_scope.ReasonNote;

__ds_ns.SampleSize = __ds_scope.SampleSize;

})();
