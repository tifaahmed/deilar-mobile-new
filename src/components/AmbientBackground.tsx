import { useEffect, useRef } from 'react';

type Theme = 'light' | 'dark';

/* Soft, calm backdrop: a warped grid + drifting medical icons. It reacts to a finger / mouse
   (grid bends toward it, icons drift away and glow). Different palette for light and dark. */

const PALETTE = {
  light: {
    line: [14, 165, 160],   // teal
    lineAlpha: 0.13,
    dot: [14, 165, 160],
    glow: [99, 102, 241],   // indigo
    icon: [14, 130, 150],
    iconAlpha: 0.2,
  },
  dark: {
    line: [96, 165, 250],   // soft blue
    lineAlpha: 0.1,
    dot: [147, 197, 253],
    glow: [167, 139, 250],  // violet
    icon: [148, 163, 220],
    iconAlpha: 0.22,
  },
} as const;

// 24x24 icon outlines (stroke only).
const ICON_PATHS = [
  'M12 21s-7-4.6-9.2-9.1C1.4 8.9 3 5.5 6.3 5.5c2 0 3.4 1.1 4.2 2.4.4.6 1.2.6 1.6 0 .8-1.3 2.2-2.4 4.2-2.4 3.300 0 4.900 3.400 3.500 6.400C19 16.400 12 21 12 21z', // heart
  'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',                                                                                              // cross
  'M12 3c3 4 6 6.500 6 10a6 6 0 0 1-12 0c0-3.500 3-6 6-10z',                                                                      // drop
  'M3 12h4l2-6 4 12 2-6h6',                                                                                                       // pulse
  'M7 4c-2 0-3.500 1.500-3.500 3.500 0 2 1 3 1 5.500 0 3 .8 7 2.300 7 1.300 0 1.200-3.500 2.200-3.500s.9 3.500 2.200 3.500c1.500 0 2.300-4 2.300-7 0-2.500 1-3.500 1-5.500C15.500 5.500 14 4 12 4c-1 0-1.500.5-2.500.5S8 4 7 4z', // tooth
  'M8.500 3.500a4.950 4.950 0 0 1 7 7l-5 5-7-7z M10 8.500l5 5',                                                                     // pill
];

interface Node { x: number; y: number }
interface Floater { x: number; y: number; vx: number; vy: number; s: number; rot: number; vr: number; k: number; ph: number }

export default function AmbientBackground({ theme }: { theme: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef<Theme>(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const paths = ICON_PATHS.map((d) => new Path2D(d));
    const STEP = 46;
    let w = 0, h = 0, dpr = 1, cols = 0, rows = 0;
    let floaters: Floater[] = [];
    let raf = 0, last = 0, running = true;
    const ptr = { x: -9999, y: -9999, on: 0 }; // on: 0..1 eased presence

    let target = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / STEP) + 2; rows = Math.ceil(h / STEP) + 2;
      const count = Math.max(7, Math.min(14, Math.round((w * h) / 60000)));
      floaters = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 9,
        s: 0.9 + Math.random() * 0.9, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.25,
        k: i % paths.length, ph: Math.random() * 6.28,
      }));
    };

    const onMove = (e: PointerEvent | TouchEvent) => {
      const p = 'touches' in e ? e.touches[0] : e;
      if (!p) return;
      ptr.x = p.clientX; ptr.y = p.clientY; target = 1;
    };
    const onLeave = () => { target = 0; };

    const draw = (t: number) => {
      const pal = PALETTE[themeRef.current];
      const R = 150; // pointer influence radius
      ptr.on += (target - ptr.on) * 0.08;
      ctx.clearRect(0, 0, w, h);

      // Grid nodes, bent toward the pointer + a very slow breathing wave.
      const nodes: Node[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: Node[] = [];
        for (let c = 0; c < cols; c++) {
          let x = c * STEP - STEP / 2, y = r * STEP - STEP / 2;
          if (!reduce) {
            x += Math.sin(t * 0.0004 + r * 0.6) * 3;
            y += Math.cos(t * 0.0005 + c * 0.6) * 3;
          }
          const dx = ptr.x - x, dy = ptr.y - y, d = Math.hypot(dx, dy);
          if (d < R && ptr.on > 0.01) {
            const f = (1 - d / R) ** 2 * 22 * ptr.on;
            x += (dx / (d || 1)) * f; y += (dy / (d || 1)) * f;
          }
          row.push({ x, y });
        }
        nodes.push(row);
      }
      const lineCol = `${pal.line[0]},${pal.line[1]},${pal.line[2]}`;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${lineCol},${pal.lineAlpha})`;
      ctx.beginPath();
      for (let r = 0; r < rows; r++) { ctx.moveTo(nodes[r][0].x, nodes[r][0].y); for (let c = 1; c < cols; c++) ctx.lineTo(nodes[r][c].x, nodes[r][c].y); }
      for (let c = 0; c < cols; c++) { ctx.moveTo(nodes[0][c].x, nodes[0][c].y); for (let r = 1; r < rows; r++) ctx.lineTo(nodes[r][c].x, nodes[r][c].y); }
      ctx.stroke();

      // Dots at intersections; they light up near the pointer.
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const n = nodes[r][c];
        const near = ptr.on > 0.01 ? Math.max(0, 1 - Math.hypot(ptr.x - n.x, ptr.y - n.y) / R) * ptr.on : 0;
        ctx.fillStyle = near > 0.02
          ? `rgba(${pal.glow[0]},${pal.glow[1]},${pal.glow[2]},${0.18 + near * 0.6})`
          : `rgba(${pal.dot[0]},${pal.dot[1]},${pal.dot[2]},${pal.lineAlpha * 1.6})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.4 + near * 2.2, 0, 6.283); ctx.fill();
      }

      // Floating icons.
      for (const f of floaters) {
        const dx = f.x - ptr.x, dy = f.y - ptr.y, d = Math.hypot(dx, dy);
        let glow = 0;
        if (d < R * 1.3 && ptr.on > 0.01) {
          glow = (1 - d / (R * 1.3)) * ptr.on;
          f.vx += (dx / (d || 1)) * glow * 3; f.vy += (dy / (d || 1)) * glow * 3;
        }
        f.vx *= 0.985; f.vy *= 0.985;
        const sp = Math.hypot(f.vx, f.vy);
        if (sp < 4) { f.vx += (Math.random() - 0.5) * 0.4; f.vy += (Math.random() - 0.5) * 0.4; }
        f.x += f.vx * 0.016; f.y += f.vy * 0.016; f.rot += f.vr * 0.016;
        const pad = 40;
        if (f.x < -pad) f.x = w + pad; else if (f.x > w + pad) f.x = -pad;
        if (f.y < -pad) f.y = h + pad; else if (f.y > h + pad) f.y = -pad;
        const pulse = 0.85 + Math.sin(t * 0.0008 + f.ph) * 0.15;
        ctx.save();
        ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.scale(f.s * (1 + glow * 0.25), f.s * (1 + glow * 0.25)); ctx.translate(-12, -12);
        ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (glow > 0.05) { ctx.shadowColor = `rgba(${pal.glow[0]},${pal.glow[1]},${pal.glow[2]},0.8)`; ctx.shadowBlur = 12 * glow; }
        ctx.strokeStyle = glow > 0.05
          ? `rgba(${pal.glow[0]},${pal.glow[1]},${pal.glow[2]},${pal.iconAlpha + glow * 0.5})`
          : `rgba(${pal.icon[0]},${pal.icon[1]},${pal.icon[2]},${pal.iconAlpha * pulse})`;
        ctx.stroke(paths[f.k]);
        ctx.restore();
      }
    };

    const loop = (t: number) => {
      if (!running) return;
      if (t - last > 30) { last = t; draw(t); } // ~30fps is plenty and kind to the battery
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchstart', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('touchend', onLeave, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    if (reduce) draw(0); else raf = requestAnimationFrame(loop);
    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchstart', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('touchend', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Half of it fades away: strong at the top, gone by ~70% of the screen height.
  const mask = 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,.6) 35%, transparent 72%)';
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 -z-10"
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    />
  );
}
