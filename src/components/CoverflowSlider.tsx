'use client';

import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Embla carousel with a 3D perspective "coverflow" tween: slides rotate on Y
 * and recede in Z based on their distance from the snapped centre.
 */
export default function CoverflowSlider<T>({
  items,
  render,
  onSelect,
  slideClass = 'basis-[78%] sm:basis-[46%] lg:basis-[34%]',
}: {
  items: T[];
  render: (item: T, active: boolean) => ReactNode;
  onSelect?: (index: number) => void;
  slideClass?: string;
}) {
  const [ref, api] = useEmblaCarousel({ loop: items.length > 2, align: 'center', skipSnaps: false });
  const [active, setActive] = useState(0);
  const nodes = useRef<HTMLElement[]>([]);

  const tween = useCallback((e: EmblaCarouselType) => {
    const progress = e.scrollProgress();
    const snaps = e.scrollSnapList();
    const engine = e.internalEngine();
    snaps.forEach((snap, i) => {
      let diff = snap - progress;
      if (engine.options.loop) {
        engine.slideLooper.loopPoints.forEach((lp) => {
          const target = lp.target();
          if (i === lp.index && target !== 0) diff = snap - (progress + (target < 0 ? -1 : 1));
        });
      }
      const d = Math.max(-1.5, Math.min(1.5, diff * snaps.length * 0.9));
      const el = nodes.current[i];
      if (el) {
        el.style.transform = `perspective(1100px) rotateY(${d * -38}deg) translateZ(${-Math.abs(d) * 160}px) scale(${1 - Math.abs(d) * 0.08})`;
        el.style.opacity = String(1 - Math.min(0.6, Math.abs(d) * 0.4));
        el.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      }
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    nodes.current = api.slideNodes().map((n) => n.firstElementChild as HTMLElement);
    const sel = () => {
      setActive(api.selectedScrollSnap());
      onSelect?.(api.selectedScrollSnap());
    };
    tween(api);
    sel();
    api.on('scroll', tween).on('reInit', tween).on('select', sel);
    return () => {
      api.off('scroll', tween).off('reInit', tween).off('select', sel);
    };
  }, [api, tween, onSelect]);

  return (
    <div className="relative">
      <div className="overflow-hidden py-6" ref={ref}>
        <div className="flex touch-pan-y">
          {items.map((item, i) => (
            <div key={i} className={`min-w-0 shrink-0 grow-0 px-3 ${slideClass}`}>
              <div className="will-change-transform transition-[opacity] duration-150" onClick={() => api?.scrollTo(i)}>
                {render(item, i === active)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button aria-label="Previous" onClick={() => api?.scrollPrev()} className="btn-ghost absolute left-1 top-1/2 -translate-y-1/2 !p-2">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button aria-label="Next" onClick={() => api?.scrollNext()} className="btn-ghost absolute right-1 top-1/2 -translate-y-1/2 !p-2">
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="mt-1 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-marigold-400' : 'w-1.5 bg-white/25'}`}
          />
        ))}
      </div>
    </div>
  );
}
