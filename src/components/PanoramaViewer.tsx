'use client';

import { useEffect, useRef } from 'react';
import { getPandal, ZONE_META } from '@/data/pandals';

/**
 * Paints a 4096x2048 equirectangular "mandap interior" so every pandal has a
 * 360° experience even before real panoramas are scraped. Real panorama URLs
 * (anything not prefixed with `procedural:`) are passed straight through.
 */
function proceduralPanorama(id: string): string {
  const W = 4096;
  const H = 2048;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const p = getPandal(id);
  const accent = p ? ZONE_META[p.zone].color : '#e0301e';
  let s = [...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);

  // Canopy (top) → walls → floor
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0a05');
  g.addColorStop(0.35, accent);
  g.addColorStop(0.5, '#ffbf3c');
  g.addColorStop(0.62, '#7a1b0c');
  g.addColorStop(1, '#140b08');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Fabric pleats on the canopy
  for (let x = 0; x < W; x += 64) {
    ctx.fillStyle = x % 128 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, 0, 64, H * 0.4);
  }

  // Repeating arches around the walls
  const arches = 12;
  for (let i = 0; i < arches; i++) {
    const cx = (i + 0.5) * (W / arches);
    const w = W / arches - 40;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, H * 0.68);
    ctx.lineTo(cx - w / 2, H * 0.48);
    ctx.quadraticCurveTo(cx, H * 0.3, cx + w / 2, H * 0.48);
    ctx.lineTo(cx + w / 2, H * 0.68);
    ctx.lineWidth = 14;
    ctx.strokeStyle = i % 2 ? '#ffd166' : '#fff3d6';
    ctx.stroke();
    ctx.fillStyle = 'rgba(20,11,8,0.45)';
    ctx.fill();
  }

  // The pratima straight ahead (yaw 0 = centre of image)
  const cx = W / 2;
  const halo = ctx.createRadialGradient(cx, H * 0.5, 10, cx, H * 0.5, 320);
  halo.addColorStop(0, 'rgba(255,209,102,1)');
  halo.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, H * 0.5, 320, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffbf3c';
  for (let a = 0; a < 10; a++) {
    ctx.save();
    ctx.translate(cx, H * 0.52);
    ctx.rotate(-Math.PI / 2 + (a - 4.5) * 0.28);
    ctx.fillRect(-10, 0, 20, 200 - Math.abs(a - 4.5) * 14);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(cx, H * 0.44, 60, 75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 140, H * 0.7);
  ctx.quadraticCurveTo(cx, H * 0.38, cx + 140, H * 0.7);
  ctx.fill();

  // Fairy lights
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,${180 + rnd() * 70},${80 + rnd() * 100},${0.5 + rnd() * 0.5})`;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H * 0.45, 2 + rnd() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Alpana floor rings
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 6;
  for (let x = 0; x < W; x += 256) {
    ctx.beginPath();
    ctx.ellipse(x + 128, H * 0.86, 100, 30, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.font = 'bold 72px Georgia';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(p?.name ?? 'PujoPulse', cx, H * 0.78);
  return c.toDataURL('image/jpeg', 0.85);
}

export default function PanoramaViewer({ url, caption }: { url: string; caption?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let viewer: { destroy: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const { Viewer } = await import('@photo-sphere-viewer/core');
      if (cancelled || !ref.current) return;
      const panorama = url.startsWith('procedural:') ? proceduralPanorama(url.slice('procedural:'.length)) : url;
      viewer = new Viewer({
        container: ref.current,
        panorama,
        caption,
        defaultZoomLvl: 20,
        navbar: ['autorotate', 'zoom', 'move', 'caption', 'fullscreen'],
        loadingTxt: 'Entering the mandap…',
      });
    })();
    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [url, caption]);

  return <div ref={ref} className="h-full w-full overflow-hidden rounded-2xl" />;
}
