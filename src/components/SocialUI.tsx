'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { LogOut, MessageCircle, Users, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AVATAR_LIST, avatarSvg } from '@/lib/avatars';
import type { AvatarId } from '@/lib/social';
import { useFestival } from '@/lib/useFestival';
import { useSocial } from '@/lib/useSocial';

export function Avatar({ id, size = 40 }: { id: AvatarId; size?: number }) {
  // eslint-disable-next-line react/no-danger
  return <span className="inline-block shrink-0" dangerouslySetInnerHTML={{ __html: avatarSvg(id, size) }} />;
}

const HI = ['Which pandal are you at?', 'Queue kemon? 👀', 'Let’s meet for phuchka 😋'];

/** Header strip: join button, or "you + who's online" with quick nearby greeting. */
export function SocialBar() {
  const { enabled, me, peers, logout, setAuthOpen, send } = useSocial();
  const [note, setNote] = useState<string | null>(null);
  const { phase } = useFestival();
  if (!enabled) return null;

  if (!me) {
    return (
      <button className="btn-primary" onClick={() => setAuthOpen(true)} data-testid="join-crowd">
        <Users className="h-4 w-4" /> Join the pandal crowd
      </button>
    );
  }
  return (
    <div className="card flex flex-wrap items-center gap-3 px-3 py-2 text-sm" data-testid="social-bar">
      <Avatar id={me.avatar} size={38} />
      <div className="leading-tight">
        <div className="font-semibold">{me.name}</div>
        <div className="text-xs text-emerald-300">● {peers.length + 1} online now</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {[phase.hello, HI[0]].map((m) => (
          <button
            key={m}
            className="chip cursor-pointer px-2.5 py-1 text-marigold-300 ring-marigold-400/40 hover:bg-white/10"
            onClick={async () => setNote((await send(null, m)) ?? 'Sent to everyone nearby ✓')}
          >
            <MessageCircle className="h-3 w-3" /> {m}
          </button>
        ))}
      </div>
      {note && <span className="text-xs text-stone-300">{note}</span>}
      <button className="btn-ghost ml-auto !px-2.5 !py-1.5 text-xs" onClick={logout} aria-label="Log out">
        <LogOut className="h-3.5 w-3.5" /> Leave
      </button>
    </div>
  );
}

export function AuthDialog() {
  const { authOpen, setAuthOpen, auth } = useSocial();
  const [step, setStep] = useState<'creds' | 'avatar'>('creds');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<AvatarId | null>(null);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep('creds');
    setError('');
    setSuggestions([]);
    setAvatar(null);
  };

  const run = async (av?: AvatarId) => {
    setBusy(true);
    setError('');
    const r = await auth(name.trim(), password, av);
    setBusy(false);
    if (r.status === 'new') setStep('avatar');
    else if (r.status === 'taken') {
      setStep('creds');
      setError(r.error);
      setSuggestions(r.suggestions);
    } else if (r.status === 'error') setError(r.error);
    else {
      reset();
      setPassword('');
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 'creds') run();
    else if (avatar) run(avatar);
  };

  return (
    <Dialog.Root open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) reset(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[1001] max-h-[92vh] w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-marigold-400/30 bg-ink-800 p-6 shadow-2xl"
          aria-describedby="auth-desc"
          data-testid="auth-dialog"
        >
          <Dialog.Close className="absolute right-4 top-4 text-stone-400 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></Dialog.Close>
          <Dialog.Title className="font-display text-2xl font-bold">{step === 'creds' ? 'Join the pandal crowd' : 'Choose your character'}</Dialog.Title>
          <p id="auth-desc" className="mt-1 text-sm text-stone-400">
            {step === 'creds'
              ? 'Pick a name and password. New here? We’ll make your account. Back again? Same two boxes log you in.'
              : 'This is how others see you on the map. You can’t change it later without a new account.'}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {step === 'creds' ? (
              <>
                <label className="block text-sm">
                  <span className="text-stone-300">Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" required minLength={3} maxLength={20} placeholder="e.g. shiuli_rani" className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900/70 px-3 py-2 outline-none focus:border-marigold-400" />
                </label>
                <label className="block text-sm">
                  <span className="text-stone-300">Password</span>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required minLength={4} maxLength={64} className="mt-1 w-full rounded-xl border border-white/15 bg-ink-900/70 px-3 py-2 outline-none focus:border-marigold-400" />
                </label>
                {error && (
                  <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-200" role="alert">
                    {error}
                    {suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs">Try a free name:</span>
                        {suggestions.map((s) => (
                          <button type="button" key={s} className="chip cursor-pointer px-2.5 py-1 text-marigold-300 ring-marigold-400/50" onClick={() => { setName(s); setError(''); setSuggestions([]); }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button className="btn-primary w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Character">
                  {AVATAR_LIST.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      role="radio"
                      aria-checked={avatar === a.id}
                      data-testid={`avatar-${a.id}`}
                      onClick={() => setAvatar(a.id)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${avatar === a.id ? 'border-marigold-400 bg-marigold-500/15' : 'border-white/10 bg-ink-900/50 hover:bg-white/5'}`}
                    >
                      <Avatar id={a.id} size={84} />
                      <b className="text-sm">{a.label}</b>
                      <span className="text-[11px] leading-tight text-stone-400">{a.blurb}</span>
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm text-orange-300" role="alert">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setStep('creds')}>Back</button>
                  <button className="btn-primary flex-1" disabled={!avatar || busy}>{busy ? 'Creating…' : 'Enter the pandals'}</button>
                </div>
              </>
            )}
            <p className="text-[11px] text-stone-500">Passwords are salted and hashed on the server. Your character and the spot you choose on the map are visible to other visitors while you’re online — nothing else is shared.</p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Pop-up messages (nearby arrivals + notes people send you). */
export function Toasts() {
  const { toasts, dismiss } = useSocial();
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[1100] flex w-[min(92vw,22rem)] flex-col gap-2" aria-live="polite" data-testid="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-marigold-400/40 bg-ink-800/95 p-3 shadow-2xl backdrop-blur animate-[pop_.25s_ease-out]">
          <Avatar id={t.avatar} size={46} />
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold text-marigold-300">{t.title}</div>
            <div className="text-stone-200">{t.body}</div>
          </div>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-stone-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
