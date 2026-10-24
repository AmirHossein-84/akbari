import React, { useEffect, useRef } from 'react';

interface FireworksCanvasProps {
  burstTrigger: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'spark' | 'confetti';
  rotation: number;
  rotationSpeed: number;
}

interface AmbientDust {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
  color: string;
}

const JOYFUL_PALETTE = [
  '#F43F5E', // Vibrant Rose Pink
  '#FB7185', // Soft Coral Pink
  '#0EA5E9', // Sky Blue
  '#38BDF8', // Bright Azure
  '#F59E0B', // Warm Sunshine Amber
  '#FBBF24', // Cheerful Yellow
  '#10B981', // Fresh Mint Green
  '#34D399', // Pastel Mint
];

export const FireworksCanvas: React.FC<FireworksCanvasProps> = ({ burstTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ambientRef = useRef<AmbientDust[]>([]);

  const spawnBurst = (cx: number, cy: number, count = 75) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
      const speed = 2.0 + Math.random() * 6.8;
      const isConfetti = i % 2 === 0;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isConfetti ? 1.8 : 0.8),
        size: isConfetti ? 5.5 + Math.random() * 4 : 2.2 + Math.random() * 2.5,
        color: JOYFUL_PALETTE[Math.floor(Math.random() * JOYFUL_PALETTE.length)],
        alpha: 1,
        decay: isConfetti ? 0.006 + Math.random() * 0.005 : 0.011 + Math.random() * 0.009,
        type: isConfetti ? 'confetti' : 'spark',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.14,
      });
    }
  };

  useEffect(() => {
    if (burstTrigger <= 0) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    spawnBurst(w * 0.5, h * 0.34, 85);
    const t1 = window.setTimeout(() => spawnBurst(w * 0.26, h * 0.28, 65), 240);
    const t2 = window.setTimeout(() => spawnBurst(w * 0.74, h * 0.28, 65), 450);
    const t3 = window.setTimeout(() => spawnBurst(w * 0.4, h * 0.22, 75), 720);
    const t4 = window.setTimeout(() => spawnBurst(w * 0.6, h * 0.24, 75), 980);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [burstTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Subtle floating pastel bubbles/sparkles
    ambientRef.current = Array.from({ length: 24 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1.5 + Math.random() * 2.5,
      vy: -0.15 - Math.random() * 0.2,
      vx: (Math.random() - 0.5) * 0.18,
      alpha: 0.14 + Math.random() * 0.2,
      color: JOYFUL_PALETTE[Math.floor(Math.random() * JOYFUL_PALETTE.length)],
    }));

    let animId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const dust of ambientRef.current) {
        dust.x += dust.vx;
        dust.y += dust.vy;
        if (dust.y < -10) dust.y = canvas.height + 10;
        if (dust.x < -10) dust.x = canvas.width + 10;
        if (dust.x > canvas.width + 10) dust.x = -10;

        ctx.save();
        ctx.globalAlpha = dust.alpha;
        ctx.fillStyle = dust.color;
        ctx.beginPath();
        ctx.arc(dust.x, dust.y, dust.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.type === 'confetti' ? 0.05 : 0.07;
        p.vx *= 0.988;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.type === 'confetti') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = window.requestAnimationFrame(render);
    };

    animId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40"
      aria-hidden="true"
    />
  );
};
