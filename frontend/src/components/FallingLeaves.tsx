import { useEffect, useRef } from "react";

// Canvas falling-leaves for the casual style. Leaves drift down with gravity,
// a sinusoidal sway, rotation and depth (parallax-ish). Honors
// prefers-reduced-motion and adapts its palette to the active theme.

interface Leaf {
  x: number;
  y: number;
  size: number;
  rot: number;
  rotSpeed: number;
  swayAmp: number;
  swayPhase: number;
  swaySpeed: number;
  fall: number; // px per second
  depth: number; // 0..1, closer leaves are bigger, faster and more opaque
  hue: number; // palette index
}

const PALETTE_LIGHT = ["#8ca678", "#6f9b7e", "#c8a24a", "#b07d4b", "#9caf88"];
const PALETTE_DARK = ["#74866a", "#5c7a70", "#9c8038", "#7c5a36", "#6b7d5a"];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const FallingLeaves = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = Math.max(14, Math.min(34, Math.round((width * height) / 42000)));

    const makeLeaf = (startAbove: boolean): Leaf => {
      const depth = rnd(0.4, 1);
      return {
        x: rnd(0, width),
        y: startAbove ? rnd(-height, 0) : rnd(0, height),
        size: rnd(10, 20) * depth + 6,
        rot: rnd(0, Math.PI * 2),
        rotSpeed: rnd(-0.6, 0.6),
        swayAmp: rnd(14, 46),
        swayPhase: rnd(0, Math.PI * 2),
        swaySpeed: rnd(0.4, 1.1),
        fall: rnd(18, 42) * depth + 14,
        depth,
        hue: Math.floor(rnd(0, PALETTE_LIGHT.length)),
      };
    };

    const leaves: Leaf[] = Array.from({ length: count }, () => makeLeaf(false));

    const isDark = () =>
      document.documentElement.getAttribute("data-theme") === "dark";

    const drawLeaf = (l: Leaf, x: number, color: string) => {
      const s = l.size;
      ctx.save();
      ctx.translate(x, l.y);
      ctx.rotate(l.rot);
      ctx.globalAlpha = 0.35 + l.depth * 0.45;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -s / 2);
      ctx.bezierCurveTo(s / 2, -s / 4, s / 2, s / 4, 0, s / 2);
      ctx.bezierCurveTo(-s / 2, s / 4, -s / 2, -s / 4, 0, -s / 2);
      ctx.fill();
      ctx.globalAlpha *= 0.5;
      ctx.strokeStyle = "rgba(40, 50, 30, 0.35)";
      ctx.lineWidth = Math.max(0.6, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, -s / 2);
      ctx.lineTo(0, s / 2);
      ctx.stroke();
      ctx.restore();
    };

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);
      const palette = isDark() ? PALETTE_DARK : PALETTE_LIGHT;
      for (const l of leaves) {
        l.y += l.fall * dt;
        l.swayPhase += l.swaySpeed * dt;
        l.rot += l.rotSpeed * dt;
        if (l.y - l.size > height) {
          l.y = -l.size - rnd(0, height * 0.3);
          l.x = rnd(0, width);
        }
        drawLeaf(l, l.x + Math.sin(l.swayPhase) * l.swayAmp, palette[l.hue]);
      }
      raf = requestAnimationFrame(frame);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      const palette = isDark() ? PALETTE_DARK : PALETTE_LIGHT;
      leaves.slice(0, 8).forEach((l) => drawLeaf(l, l.x, palette[l.hue]));
    };

    window.addEventListener("resize", resize);
    if (reduce) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="falling-leaves-canvas" aria-hidden="true" />;
};

export default FallingLeaves;
