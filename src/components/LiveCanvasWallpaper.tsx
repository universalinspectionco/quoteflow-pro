import React, { useEffect, useRef } from 'react';
import { Settings } from '../types/quotation';

interface LiveCanvasWallpaperProps {
  settings: Settings;
}

type AnimationPreset = 'particles' | 'cyber-grid' | 'ocean-flow' | 'aurora-wave' | 'starfield' | 'matrix-rain' | 'neon-circles' | 'constellation';

const PRESETS: Record<string, string> = {
  particles: 'Particle Swarm',
  'cyber-grid': 'Cyber Grid',
  'ocean-flow': 'Ocean Flow',
  'aurora-wave': 'Aurora Wave',
  starfield: 'Starfield',
  'matrix-rain': 'Matrix Rain',
  'neon-circles': 'Neon Circles',
  constellation: 'Constellation',
};

const THEMES = {
  terminal: { bg: '#050802', accent: '#00ff41', secondary: '#008f11' },
  frosted: { bg: '#0f172a', accent: '#ffffff', secondary: '#94a3b8' },
  navy: { bg: '#0a1628', accent: '#1e3a5e', secondary: '#3b82f6' },
  ocean: { bg: '#0c1929', accent: '#0ea5e9', secondary: '#06b6d4' },
  anime: { bg: '#1a0a0e', accent: '#f43f5e', secondary: '#fb7185' },
  mechanical: { bg: '#1c1408', accent: '#b45309', secondary: '#f59e0b' },
  car: { bg: '#1a0a0a', accent: '#dc2626', secondary: '#ef4444' },
  slate: { bg: '#0f172a', accent: '#64748b', secondary: '#94a3b8' },
  emerald: { bg: '#042f2e', accent: '#059669', secondary: '#10b981' },
  midnight: { bg: '#0a0a1a', accent: '#6366f1', secondary: '#818cf8' },
  sapphire: { bg: '#0a1628', accent: '#1e3a5e', secondary: '#38bdf8' },
  amber: { bg: '#1c1008', accent: '#d97706', secondary: '#fbbf24' },
};

export function LiveCanvasWallpaper({ settings }: LiveCanvasWallpaperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; life: number; maxLife: number }[]>([]);
  const trailsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const starsRef = useRef<{ x: number; y: number; size: number; brightness: number }[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const handleResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);

    const preset = PRESETS[settings.bgAnimationPreset || 'particles'] || 'particles';
    const theme = THEMES[settings.theme || 'terminal'] || THEMES['terminal'];
    const opacity = (settings.bgOpacity ?? 80) / 100;
    const speed = settings.bgPlaybackSpeed || 1;

    // Initialize particles
    for (let i = 0; i < 80; i++) {
      particlesRef.current.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3 + 1, life: Math.random() * 200, maxLife: 200,
      });
    }
    // Initialize stars
    for (let i = 0; i < 150; i++) {
      starsRef.current.push({
        x: Math.random() * W, y: Math.random() * H,
        size: Math.random() * 2 + 0.5, brightness: Math.random(),
      });
    }

    function animate() {
      timeRef.current += 0.016 * speed;
      const t = timeRef.current;
      ctx.clearRect(0, 0, W, H);

      // Background
      const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H));
      grad.addColorStop(0, theme.bg);
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      switch (preset) {
        case 'starfield': drawStarfield(ctx, W, H, t, theme, opacity, starsRef.current); break;
        case 'matrix-rain': drawMatrixRain(ctx, W, H, t, theme, opacity); break;
        case 'cyber-grid': drawCyberGrid(ctx, W, H, t, theme, opacity); break;
        case 'ocean-flow': drawOceanFlow(ctx, W, H, t, theme, opacity); break;
        case 'aurora-wave': drawAuroraWave(ctx, W, H, t, theme, opacity); break;
        case 'neon-circles': drawNeonCircles(ctx, W, H, t, theme, opacity); break;
        case 'constellation': drawConstellation(ctx, W, H, t, particlesRef.current, theme, opacity); break;
        default: drawParticles(ctx, W, H, t, particlesRef.current, theme, opacity);
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [settings.bgAnimationPreset, settings.theme, settings.bgOpacity, settings.bgPlaybackSpeed]);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />
  );
}

function drawParticles(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, particles: {x:number,y:number,vx:number,vy:number,size:number,life:number,maxLife:number}[], theme: any, opacity: number) {
  particles.forEach(p => {
    p.x += p.vx * 0.5; p.y += p.vy * 0.5;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    p.life += 0.5;
    const alpha = opacity * Math.min(1, p.life / 30) * Math.min(1, (p.maxLife - p.life) / 30) * 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(theme.accent, alpha);
    ctx.fill();
    // Glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(theme.accent, alpha * 0.15);
    ctx.fill();
  });
}

function drawStarfield(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, theme: any, opacity: number, stars: {x:number,y:number,size:number,brightness:number}[]) {
  stars.forEach(star => {
    const breathe = 0.5 + 0.5 * Math.sin(t * 2 + star.brightness * 10);
    const alpha = opacity * (0.3 + breathe * 0.7);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size * (0.5 + breathe * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba('#ffffff', alpha);
    ctx.fill();
    // Subtle color tint
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(theme.accent, alpha * 0.2);
    ctx.fill();
  });
}

function drawMatrixRain(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, theme: any, opacity: number) {
  const cols = Math.floor(W / 14);
  for (let i = 0; i < cols; i++) {
    const x = i * 14 + 7;
    const speed = 1 + Math.random() * 0.5;
    const y = (t * 60 * speed + i * 37) % H;
    const alpha = opacity * 0.4 * (1 - Math.abs(y - H/2) / (H/2));
    ctx.font = '12px monospace';
    ctx.fillStyle = hexToRgba(theme.accent, alpha);
    ctx.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), x, y);
  }
}

function drawCyberGrid(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, theme: any, opacity: number) {
  const gridSize = 40;
  const offset = (t * 20) % gridSize;
  ctx.strokeStyle = hexToRgba(theme.accent, opacity * 0.15);
  ctx.lineWidth = 0.5;
  for (let x = -gridSize + offset; x < W + gridSize; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = -gridSize + offset; y < H + gridSize; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Horizon perspective lines
  const horizon = H * 0.6;
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(W/2, horizon);
    ctx.lineTo(W/2 + i * 80, H);
    ctx.strokeStyle = hexToRgba(theme.accent, opacity * 0.1);
    ctx.stroke();
  }
}

function drawOceanFlow(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, theme: any, opacity: number) {
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) {
      const y = H * 0.5 + layer * 60 + Math.sin((x * 0.01) + t * (0.5 + layer * 0.2)) * 30 + Math.sin((x * 0.005) + t * 0.3) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(theme.accent, opacity * (0.05 + layer * 0.02));
    ctx.fill();
  }
}

function drawAuroraWave(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, theme: any, opacity: number) {
  for (let band = 0; band < 3; band++) {
    const baseY = H * 0.3 + band * 80;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 5) {
      const wave = Math.sin(x * 0.003 + t * 0.3 + band) * 60 + Math.sin(x * 0.007 + t * 0.5) * 30;
      ctx.lineTo(x, baseY + wave);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, baseY - 100, 0, baseY + 100);
    grad.addColorStop(0, hexToRgba(theme.accent, 0));
    grad.addColorStop(0.5, hexToRgba(theme.accent, opacity * 0.08));
    grad.addColorStop(1, hexToRgba(theme.secondary, 0));
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function drawNeonCircles(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, theme: any, opacity: number) {
  const cx = W / 2, cy = H / 2;
  for (let ring = 0; ring < 8; ring++) {
    const radius = 50 + ring * 40 + Math.sin(t + ring) * 10;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(theme.accent, opacity * (0.15 - ring * 0.015));
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Orbiting dots
  for (let i = 0; i < 5; i++) {
    const angle = t * (0.5 + i * 0.2) + i * Math.PI * 0.4;
    const r = 100 + i * 50;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(theme.accent, opacity * 0.8);
    ctx.fill();
  }
}

function drawConstellation(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, particles: any[], theme: any, opacity: number) {
  // Update positions gently
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > W) p.vx *= -1;
    if (p.y < 0 || p.y > H) p.vy *= -1;
    p.x = Math.max(0, Math.min(W, p.x));
    p.y = Math.max(0, Math.min(H, p.y));
  });
  // Draw connections
  const threshold = 120;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < threshold) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = hexToRgba(theme.accent, opacity * 0.2 * (1 - dist/threshold));
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
  // Draw nodes
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(theme.accent, opacity * 0.6);
    ctx.fill();
  });
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3), 16) || 255;
  const g = parseInt(hex.slice(3,5), 16) || 255;
  const b = parseInt(hex.slice(5,7), 16) || 255;
  return `rgba(${r},${g},${b},${alpha})`;
}