import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CrowdLevel } from '@/types/pandal';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CROWD_STYLE: Record<CrowdLevel, string> = {
  Low: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  High: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  Extreme: 'bg-red-500/20 text-red-300 ring-red-500/40',
};

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
