import { memo } from 'react';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

import type { MachineGuide } from '@/types';

export type MuscleKey = MachineGuide['muscleGroup'];

// ─── Geometry ─────────────────────────────────────────────────────────────────
// A clean, symmetric vector body in a 200×470 view box. Every muscle head is its
// own shape so it can be highlighted and tapped independently. Paired muscles use
// `mirror` to auto-reflect across the centre line (x = 100). This is intentionally
// a diagram-style map — commissioned art can later replace the shapes behind the
// same `MuscleKey` contract.
const VIEW_W = 200;
const VIEW_H = 470;

type Shape =
  | { t: 'e'; cx: number; cy: number; rx: number; ry: number; rot?: number }
  | { t: 'r'; x: number; y: number; w: number; h: number; r?: number };

type Zone = {
  key: MuscleKey;
  side: 'front' | 'back';
  mirror?: boolean;
  shapes: Shape[];
};

// Faint silhouette drawn behind the muscles so the body reads as a body.
type BaseShape = Shape & { mirror?: boolean };
const BASE: BaseShape[] = [
  { t: 'e', cx: 100, cy: 30, rx: 16, ry: 18 },              // head
  { t: 'r', x: 93, y: 44, w: 14, h: 12, r: 5 },             // neck
  { t: 'r', x: 64, y: 56, w: 72, h: 128, r: 30 },           // torso
  { t: 'r', x: 45, y: 64, w: 16, h: 118, r: 8, mirror: true }, // upper+lower arm (left)
  { t: 'e', cx: 53, cy: 188, rx: 9, ry: 11, mirror: true }, // hand
  { t: 'r', x: 73, y: 180, w: 24, h: 170, r: 13, mirror: true }, // leg (left)
  { t: 'e', cx: 85, cy: 356, rx: 10, ry: 9, mirror: true }, // foot
];

const ZONES: Zone[] = [
  // ── FRONT ────────────────────────────────────────────────────────────────
  // Shoulders
  { key: 'Anterior Deltoid', side: 'front', mirror: true, shapes: [{ t: 'e', cx: 65, cy: 67, rx: 11, ry: 10 }] },
  { key: 'Lateral Deltoid',  side: 'front', mirror: true, shapes: [{ t: 'e', cx: 53, cy: 72, rx: 7, ry: 12 }] },
  // Chest — upper / middle / lower bands, split left & right
  { key: 'Upper Chest',  side: 'front', mirror: true, shapes: [{ t: 'e', cx: 85, cy: 70, rx: 14, ry: 7 }] },
  { key: 'Middle Chest', side: 'front', mirror: true, shapes: [{ t: 'e', cx: 86, cy: 82, rx: 14, ry: 7 }] },
  { key: 'Lower Chest',  side: 'front', mirror: true, shapes: [{ t: 'e', cx: 87, cy: 93, rx: 12, ry: 6 }] },
  // Biceps
  { key: 'Bicep Long Head',  side: 'front', mirror: true, shapes: [{ t: 'e', cx: 49, cy: 97, rx: 5, ry: 15 }] },
  { key: 'Bicep Short Head', side: 'front', mirror: true, shapes: [{ t: 'e', cx: 58, cy: 97, rx: 5, ry: 15 }] },
  { key: 'Brachialis',       side: 'front', mirror: true, shapes: [{ t: 'e', cx: 53, cy: 116, rx: 6, ry: 7 }] },
  // Forearms
  { key: 'Forearm Flexors',   side: 'front', mirror: true, shapes: [{ t: 'e', cx: 50, cy: 138, rx: 6, ry: 17 }] },
  { key: 'Forearm Extensors', side: 'front', mirror: true, shapes: [{ t: 'e', cx: 59, cy: 138, rx: 5, ry: 17 }] },
  // Core
  { key: 'Upper Abs', side: 'front', mirror: true, shapes: [{ t: 'r', x: 90, y: 101, w: 9, h: 16, r: 3 }] },
  { key: 'Lower Abs', side: 'front', mirror: true, shapes: [{ t: 'r', x: 90, y: 119, w: 9, h: 18, r: 3 }] },
  { key: 'Obliques',  side: 'front', mirror: true, shapes: [{ t: 'e', cx: 80, cy: 122, rx: 5, ry: 16 }] },
  { key: 'Transverse Abdominis', side: 'front', shapes: [{ t: 'r', x: 91, y: 140, w: 18, h: 10, r: 4 }] },
  // Quads
  { key: 'Vastus Lateralis', side: 'front', mirror: true, shapes: [{ t: 'e', cx: 77, cy: 212, rx: 6, ry: 27 }] },
  { key: 'Rectus Femoris',   side: 'front', mirror: true, shapes: [{ t: 'e', cx: 86, cy: 216, rx: 7, ry: 31 }] },
  { key: 'Vastus Medialis',  side: 'front', mirror: true, shapes: [{ t: 'e', cx: 93, cy: 240, rx: 6, ry: 14 }] },
  { key: 'Adductors',        side: 'front', mirror: true, shapes: [{ t: 'e', cx: 96, cy: 206, rx: 5, ry: 20 }] },
  // Shins
  { key: 'Tibialis Anterior', side: 'front', mirror: true, shapes: [{ t: 'e', cx: 84, cy: 300, rx: 6, ry: 26 }] },

  // ── BACK ─────────────────────────────────────────────────────────────────
  // Shoulders / traps
  { key: 'Posterior Deltoid', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 65, cy: 67, rx: 11, ry: 10 }] },
  { key: 'Lateral Deltoid',   side: 'back', mirror: true, shapes: [{ t: 'e', cx: 53, cy: 72, rx: 7, ry: 12 }] },
  { key: 'Upper Traps', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 85, cy: 60, rx: 14, ry: 9 }] },
  { key: 'Lower Traps', side: 'back', shapes: [{ t: 'e', cx: 100, cy: 100, rx: 15, ry: 16 }] },
  // Back
  { key: 'Upper Back', side: 'back', mirror: true, shapes: [{ t: 'r', x: 88, y: 78, w: 11, h: 18, r: 4 }] },
  { key: 'Latissimus Dorsi', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 78, cy: 114, rx: 12, ry: 22 }] },
  { key: 'Lower Back', side: 'back', shapes: [{ t: 'r', x: 92, y: 130, w: 16, h: 24, r: 5 }] },
  // Triceps
  { key: 'Tricep Long Head',    side: 'back', mirror: true, shapes: [{ t: 'e', cx: 50, cy: 97, rx: 5, ry: 15 }] },
  { key: 'Tricep Lateral Head', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 59, cy: 95, rx: 5, ry: 13 }] },
  { key: 'Tricep Medial Head',  side: 'back', mirror: true, shapes: [{ t: 'e', cx: 54, cy: 115, rx: 6, ry: 8 }] },
  // Forearms (also visible from the back)
  { key: 'Forearm Extensors', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 50, cy: 138, rx: 6, ry: 17 }] },
  { key: 'Forearm Flexors',   side: 'back', mirror: true, shapes: [{ t: 'e', cx: 59, cy: 138, rx: 5, ry: 17 }] },
  // Glutes
  { key: 'Gluteus Medius',  side: 'back', mirror: true, shapes: [{ t: 'e', cx: 77, cy: 168, rx: 7, ry: 9 }] },
  { key: 'Gluteus Minimus', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 82, cy: 178, rx: 5, ry: 6 }] },
  { key: 'Gluteus Maximus', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 88, cy: 184, rx: 13, ry: 16 }] },
  // Hamstrings
  { key: 'Hamstrings', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 86, cy: 226, rx: 10, ry: 30 }] },
  // Calves
  { key: 'Gastrocnemius', side: 'back', mirror: true, shapes: [{ t: 'e', cx: 85, cy: 296, rx: 8, ry: 20 }] },
  { key: 'Soleus',        side: 'back', mirror: true, shapes: [{ t: 'e', cx: 85, cy: 321, rx: 7, ry: 14 }] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const muscleLobePath = (cx: number, cy: number, rx: number, ry: number) => `
  M ${cx} ${cy - ry}
  C ${cx - rx * 0.7} ${cy - ry * 0.9}, ${cx - rx * 1.02} ${cy - ry * 0.3}, ${cx - rx * 0.82} ${cy}
  C ${cx - rx * 1.02} ${cy + ry * 0.35}, ${cx - rx * 0.48} ${cy + ry * 0.9}, ${cx} ${cy + ry}
  C ${cx + rx * 0.48} ${cy + ry * 0.9}, ${cx + rx * 1.02} ${cy + ry * 0.35}, ${cx + rx * 0.82} ${cy}
  C ${cx + rx * 1.02} ${cy - ry * 0.3}, ${cx + rx * 0.7} ${cy - ry * 0.9}, ${cx} ${cy - ry}
  Z
`;

const muscleSlabPath = (x: number, y: number, w: number, h: number) => {
  const cx = x + w / 2;
  const top = y;
  const bottom = y + h;
  const left = x;
  const right = x + w;

  return `
    M ${cx} ${top}
    C ${left + w * 0.12} ${top + h * 0.08}, ${left} ${top + h * 0.26}, ${left + w * 0.12} ${top + h * 0.5}
    C ${left} ${top + h * 0.74}, ${left + w * 0.16} ${bottom - h * 0.08}, ${cx} ${bottom}
    C ${right - w * 0.16} ${bottom - h * 0.08}, ${right} ${top + h * 0.74}, ${right - w * 0.12} ${top + h * 0.5}
    C ${right} ${top + h * 0.26}, ${right - w * 0.12} ${top + h * 0.08}, ${cx} ${top}
    Z
  `;
};

const renderShape = (
  s: Shape,
  fill: string,
  stroke: string,
  strokeWidth: number,
  flip: boolean,
  k: string,
) => {
  if (s.t === 'e') {
    const cx = flip ? VIEW_W - s.cx : s.cx;
    return (
      <Ellipse
        key={k}
        cx={cx}
        cy={s.cy}
        rx={s.rx}
        ry={s.ry}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  const x = flip ? VIEW_W - s.x - s.w : s.x;
  return (
    <Rect
      key={k}
      x={x}
      y={s.y}
      width={s.w}
      height={s.h}
      rx={s.r ?? 0}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
};

const renderMuscleShape = (
  s: Shape,
  fill: string,
  stroke: string,
  strokeWidth: number,
  flip: boolean,
  k: string,
) => {
  const d =
    s.t === 'e'
      ? muscleLobePath(s.cx, s.cy, s.rx, s.ry)
      : muscleSlabPath(s.x, s.y, s.w, s.h);

  return (
    <Path
      key={k}
      d={d}
      fill={fill}
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      transform={flip ? `translate(${VIEW_W} 0) scale(-1 1)` : undefined}
    />
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
type Props = {
  side: 'front' | 'back';
  selectedKey: MuscleKey;
  available: MuscleKey[];
  colorOf: (key: MuscleKey) => string;
  onSelect: (key: MuscleKey) => void;
  height?: number;
};

function MuscleMapBase({ side, selectedKey, available, colorOf, onSelect, height = 440 }: Props) {
  const width = height * (VIEW_W / VIEW_H);
  const zones = ZONES.filter((z) => z.side === side);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      {/* Faint body silhouette for context */}
      {BASE.map((s, i) => {
        const main = renderShape(s, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.10)', 0.8, false, `base-${i}`);
        if (!s.mirror) return main;
        return (
          <G key={`base-g-${i}`}>
            {main}
            {renderShape(s, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.10)', 0.8, true, `base-m-${i}`)}
          </G>
        );
      })}

      {/* Muscle zones */}
      {zones.map((z, i) => {
        const isSelected = z.key === selectedKey;
        const isAvailable = available.includes(z.key);
        const base = colorOf(z.key);
        const fill = isSelected
          ? base
          : isAvailable
            ? hexToRgba(base, 0.24)
            : 'rgba(255,255,255,0.06)';
        const stroke = isSelected
          ? '#FFFFFF'
          : isAvailable
            ? hexToRgba(base, 0.55)
            : 'rgba(255,255,255,0.12)';
        const strokeWidth = isSelected ? 1.6 : 0.9;

        return (
          <G key={`${z.key}-${i}`} onPress={() => onSelect(z.key)} opacity={isSelected ? 1 : isAvailable ? 0.95 : 0.6}>
            {z.shapes.map((s, si) => (
              <G key={`s-${si}`}>
                {renderMuscleShape(s, fill, stroke, strokeWidth, false, `${z.key}-${si}-a`)}
                {z.mirror
                  ? renderMuscleShape(s, fill, stroke, strokeWidth, true, `${z.key}-${si}-b`)
                  : null}
              </G>
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

export const MuscleMap = memo(MuscleMapBase);
export default MuscleMap;
