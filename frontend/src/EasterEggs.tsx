/** Doodle-style easter egg sketches (2D + simple 3D) in the background. Same look & feel as reference sketches. */
import React from "react";

const sketchStyle: React.CSSProperties = {
  opacity: 0.2,
  display: "block",
  imageRendering: "pixelated",
};

const positions: { top?: string; right?: string; bottom?: string; left?: string }[] = [
  { top: "8%", right: "6%" },
  { bottom: "15%", left: "5%" },
  { top: "40%", left: "3%" },
  { bottom: "25%", right: "8%" },
  { top: "12%", left: "12%" },
  { bottom: "8%", right: "15%" },
  { top: "55%", right: "5%" },
  { bottom: "40%", left: "10%" },
];

const sketches = [
  /* 2D rubber duck doodle */
  <svg key="duck" width="56" height="48" viewBox="0 0 56 48" fill="none" style={{ ...sketchStyle, width: 56, height: 48 }}>
    <path d="M28 8c-4 0-8 4-8 10s2 10 6 12c2 4 6 8 12 8s10-4 12-8c4-2 6-6 6-12s-4-10-8-10z" stroke="#000" strokeWidth="2" fill="#ffc107" />
    <circle cx="32" cy="18" r="2" fill="#000" />
    <path d="M24 14 Q20 18 22 22" stroke="#000" strokeWidth="1.5" fill="none" />
  </svg>,
  /* Banana */
  <svg key="banana" width="48" height="32" viewBox="0 0 48 32" fill="none" style={{ ...sketchStyle, width: 48, height: 32 }}>
    <path d="M8 16 Q20 4 40 12 Q44 20 38 26 Q24 30 10 22 Q4 18 8 16z" stroke="#000" strokeWidth="2" fill="#ffeb3b" />
    <path d="M12 18 Q22 10 36 14" stroke="#000" strokeWidth="1" fill="none" opacity={0.6} />
  </svg>,
  /* Simple 3D isometric cube */
  <svg key="cube3d" width="52" height="44" viewBox="0 0 52 44" fill="none" style={{ ...sketchStyle, width: 52, height: 44 }}>
    <path d="M26 4 L50 18 L50 38 L26 44 L2 38 L2 18 Z" stroke="#000" strokeWidth="2" fill="none" />
    <path d="M26 4 L26 44" stroke="#000" strokeWidth="2" />
    <path d="M26 4 L50 18" stroke="#000" strokeWidth="2" />
    <path d="M26 4 L2 18" stroke="#000" strokeWidth="2" />
    <path d="M2 18 L26 24 L50 18" stroke="#000" strokeWidth="2" />
    <path d="M26 24 L26 44" stroke="#000" strokeWidth="2" />
  </svg>,
  /* Kawaii blob with hat */
  <svg key="blob" width="44" height="48" viewBox="0 0 44 48" fill="none" style={{ ...sketchStyle, width: 44, height: 48 }}>
    <ellipse cx="22" cy="28" rx="18" ry="16" stroke="#000" strokeWidth="2" fill="#8bc34a" />
    <circle cx="22" cy="24" r="14" stroke="#000" strokeWidth="1.5" fill="#fff" />
    <path d="M14 20 L16 24 M22 18 L22 24 M30 20 L28 24" stroke="#000" strokeWidth="1.5" fill="none" />
    <path d="M18 14 Q22 6 26 14" stroke="#000" strokeWidth="2" fill="none" />
    <rect x="10" y="4" width="24" height="12" rx="2" stroke="#000" strokeWidth="2" fill="#2196f3" />
    <rect x="12" y="2" width="8" height="4" stroke="#000" strokeWidth="1" fill="#ffeb3b" />
  </svg>,
  /* Skull doodle (simple) */
  <svg key="skull" width="40" height="36" viewBox="0 0 40 36" fill="none" style={{ ...sketchStyle, width: 40, height: 36 }}>
    <circle cx="20" cy="14" r="10" stroke="#000" strokeWidth="2" fill="#fff" />
    <path d="M8 14 L32 14 L30 28 Q20 34 10 28 Z" stroke="#000" strokeWidth="2" fill="#fff" />
    <circle cx="16" cy="12" r="2" fill="#000" />
    <circle cx="24" cy="12" r="2" fill="#000" />
  </svg>,
  /* 3D cone / low-poly shape */
  <svg key="cone3d" width="40" height="44" viewBox="0 0 40 44" fill="none" style={{ ...sketchStyle, width: 40, height: 44 }}>
    <path d="M20 4 L36 40 L4 40 Z" stroke="#000" strokeWidth="2" fill="none" />
    <path d="M20 4 L20 40" stroke="#000" strokeWidth="2" />
    <path d="M20 4 L4 40" stroke="#000" strokeWidth="2" />
    <path d="M20 4 L36 40" stroke="#000" strokeWidth="2" />
  </svg>,
  /* Simple cat face */
  <svg key="cat" width="48" height="40" viewBox="0 0 48 40" fill="none" style={{ ...sketchStyle, width: 48, height: 40 }}>
    <circle cx="24" cy="20" r="14" stroke="#000" strokeWidth="2" fill="#fff" />
    <path d="M14 8 L18 4 L22 8 M26 8 L30 4 L34 8" stroke="#000" strokeWidth="2" fill="none" />
    <circle cx="20" cy="18" r="2" fill="#000" />
    <circle cx="28" cy="18" r="2" fill="#000" />
    <path d="M22 26 Q24 30 26 26" stroke="#000" strokeWidth="1.5" fill="none" />
  </svg>,
  /* Wireframe sphere (3D feel) */
  <svg key="sphere3d" width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ ...sketchStyle, width: 44, height: 44 }}>
    <ellipse cx="22" cy="22" rx="20" ry="8" stroke="#000" strokeWidth="1.5" fill="none" />
    <ellipse cx="22" cy="22" rx="20" ry="8" stroke="#000" strokeWidth="1.5" fill="none" transform="rotate(60 22 22)" />
    <ellipse cx="22" cy="22" rx="20" ry="8" stroke="#000" strokeWidth="1.5" fill="none" transform="rotate(120 22 22)" />
    <ellipse cx="22" cy="22" rx="8" ry="20" stroke="#000" strokeWidth="1.5" fill="none" />
  </svg>,
];

export function EasterEggs() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const shuffled = React.useMemo(() => {
    const order = [...positions];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }, []);

  if (!mounted) return null;

  return (
    <div className="easter-eggs-layer" aria-hidden="true">
      {sketches.slice(0, 6).map((sketch, i) => (
        <div key={i} className="easter-egg" style={shuffled[i]}>
          {sketch}
        </div>
      ))}
    </div>
  );
}
