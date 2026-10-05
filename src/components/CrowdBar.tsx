import { CROWD_SCORE } from '@/lib/planner';
import type { Pandal } from '@/types/pandal';

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];
const HOURS = [8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];

/** Compact hourly crowd forecast (8 AM → 2 AM). */
export default function CrowdBar({ pandal, highlightHour }: { pandal: Pandal; highlightHour?: number }) {
  return (
    <div>
      <div className="flex h-14 items-end gap-1" role="img" aria-label="Crowd forecast by hour">
        {HOURS.map((h) => {
          const lvl = pandal.crowdLevelByHour[h];
          const score = CROWD_SCORE[lvl];
          const hl = highlightHour !== undefined && Math.floor(highlightHour) % 24 === h;
          return (
            <div key={h} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${h}:00 — ${lvl}`}>
              <div
                className={`w-full rounded-t ${hl ? 'ring-2 ring-white' : ''}`}
                style={{ height: `${(score + 1) * 22}%`, background: COLORS[score] }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1 text-[9px] text-stone-400">
        {HOURS.map((h) => (
          <span key={h} className="flex-1 text-center">{h === 0 ? '12a' : h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}</span>
        ))}
      </div>
    </div>
  );
}
