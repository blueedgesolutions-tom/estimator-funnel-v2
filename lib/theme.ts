import type { TenantTheme, ResolvedTheme } from './types';

// ─────────────────────────────────────────────────────────
// HEX ↔ HSL UTILITIES
// ─────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);

  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lN - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────
// THEME RESOLVER
//
// Derivation rules (from BRANDING.md):
//   primary_hover = HSL lightness − 12, capped at 0
//   primary_light = HSL lightness + 42 (max 97), saturation − 20 (min 0)
//   accent        = primary if not set
// ─────────────────────────────────────────────────────────

export function resolveTheme(theme: TenantTheme): ResolvedTheme {
  const [h, s, l] = hexToHsl(theme.primary);

  const primary_hover =
    theme.primary_hover ?? hslToHex(h, s, clamp(l - 12, 0, 100));

  const primary_light =
    theme.primary_light ??
    hslToHex(h, clamp(s - 20, 0, 100), clamp(l + 42, 0, 97));

  const accent = theme.accent ?? theme.primary;

  return {
    primary: theme.primary,
    primary_hover,
    primary_light,
    accent,
  };
}

// ─────────────────────────────────────────────────────────
// CSS INJECTION HELPER
// ─────────────────────────────────────────────────────────

export function buildBrandStyles(theme: ResolvedTheme): string {
  return `:root{--brand-primary:${theme.primary};--brand-primary-hover:${theme.primary_hover};--brand-primary-light:${theme.primary_light};--brand-accent:${theme.accent};}`;
}
