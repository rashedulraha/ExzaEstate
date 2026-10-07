import { useRef, type MouseEvent, type ReactNode } from 'react';
import { t } from '@exzaestate/shared';
import { ExzaLogoIcon } from '@exzaestate/ui';

/* ------------------------------------------------------------------ */
/* Sample data (UI illustration only)                                  */
/* ------------------------------------------------------------------ */

type PlotStatus = 'sold' | 'booked' | 'open';

const PLOTS: PlotStatus[] = [
  'sold',
  'sold',
  'booked',
  'open',
  'sold',
  'open',
  'booked',
  'sold',
  'sold',
  'open',
  'open',
  'sold',
  'open',
  'booked',
  'sold',
  'sold',
  'booked',
  'open',
  'sold',
  'open',
  'open',
  'booked',
  'sold',
  'sold',
];
const SELECTED_PLOT = 9;

const PLOT_STYLE: Record<PlotStatus, string> = {
  sold: 'bg-accent text-primary',
  booked: 'border border-border-strong bg-surface-sunken/60 text-text-muted',
  open: 'border border-accent/50 bg-accent/12 text-accent',
};

const LEDGER = [
  { side: 'Dr', account: 'Cash at Bank', amount: '12,50,000.00' },
  { side: 'Cr', account: 'Plot Sales, Mouza 14', amount: '12,50,000.00' },
];

const BARS = [38, 52, 44, 68, 60, 82, 74, 94];

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** Places a child at a fixed depth (translateZ) and gives it a slow float. */
function Layer({
  z,
  delay = 0,
  className = '',
  children,
}: {
  z: number;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute ${className}`}
      style={{ transform: `translateZ(${z}px)`, transformStyle: 'preserve-3d' }}
    >
      <div className="exza-float" style={{ animationDelay: `${delay}s` }}>
        {children}
      </div>
    </div>
  );
}

function GlassCard({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden rounded-card border border-border-strong bg-surface-dark/85 shadow-2xl shadow-black/50 backdrop-blur-md ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Showcase                                                            */
/* ------------------------------------------------------------------ */

export interface LoginShowcaseProps {
  /** Desktop position of the showcase. The login form takes the opposite side. */
  side?: 'left' | 'right';
}

export function LoginShowcase({ side = 'left' }: LoginShowcaseProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  // Mouse-driven tilt. Writes CSS variables directly so React never re-renders.
  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    stage.style.setProperty('--ry', `${-12 + x * 16}deg`);
    stage.style.setProperty('--rx', `${6 - y * 12}deg`);
  };

  const handleLeave = () => {
    stageRef.current?.style.removeProperty('--ry');
    stageRef.current?.style.removeProperty('--rx');
  };

  return (
    <div
      className={`relative hidden flex-col justify-between overflow-hidden border-border-subtle bg-surface-dark/70 p-10 lg:col-span-7 lg:flex xl:p-16 ${
        side === 'left' ? 'border-r lg:order-1' : 'border-l lg:order-2'
      }`}
    >
      <style>{`
        @keyframes exza-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .exza-float { animation: exza-float 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .exza-float { animation: none; }
        }
      `}</style>

      {/* Ambient light behind the stage */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/12 blur-3xl" />

      {/* Brand + headline */}
      <div className="relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-button bg-primary-deep border border-accent/40 shadow-lg shadow-black/40">
            <ExzaLogoIcon size={30} variant="gold" />
          </div>
          <div>
            <span className="text-h2 font-bold tracking-tight text-text-inverse">
              {t('app.name')}
            </span>
            <span className="ml-2.5 rounded-full border border-accent/30 bg-accent/12 px-2.5 py-0.5 text-caption font-medium text-accent">
              Enterprise ERP
            </span>
          </div>
        </div>

        <h2 className="mt-10 max-w-xl text-display font-bold leading-tight tracking-tight text-text-inverse">
          Property management and real estate accounting, in one place.
        </h2>
        <p className="mt-3 max-w-lg text-body text-text-muted">
          Built for land subdivision, multistoried developments and high-volume installment
          collections across Bangladesh.
        </p>
      </div>

      {/* 3D stage */}
      <div
        className="relative z-10 my-6 flex flex-1 items-center"
        style={{ perspective: '1400px' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <div
          ref={stageRef}
          className="relative mx-auto h-[clamp(340px,46vh,470px)] w-full max-w-[620px] transition-transform duration-300 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(var(--rx, 6deg)) rotateY(var(--ry, -12deg))',
          }}
        >
          {/* Blueprint grid floor */}
          <div
            className="absolute inset-0"
            style={{
              transform: 'translateZ(-90px) scale(1.15)',
              backgroundImage:
                'linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              WebkitMaskImage: 'radial-gradient(closest-side, #000 35%, transparent 100%)',
              maskImage: 'radial-gradient(closest-side, #000 35%, transparent 100%)',
            }}
          />

          {/* Land cadastre map (back layer) */}
          <Layer z={20} className="left-0 top-4 w-[62%]">
            <GlassCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-h3 font-semibold text-text-inverse">Native Land Cadastre</h3>
                  <p className="mt-0.5 text-caption text-text-muted">
                    Mouza 14, RS Khatian 2281, Daag 907
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent/12 px-2 py-0.5 text-caption text-accent">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  Live
                </span>
              </div>

              <div className="mt-3 grid grid-cols-6 gap-1.5">
                {PLOTS.map((status, i) => (
                  <div
                    key={i}
                    className={`flex h-8 items-center justify-center rounded-button font-mono text-caption ${PLOT_STYLE[status]} ${
                      i === SELECTED_PLOT
                        ? 'animate-pulse ring-2 ring-border-focus ring-offset-2 ring-offset-surface-dark'
                        : ''
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-4 text-caption text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" /> Sold
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-border" /> Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full border border-accent/60" /> Available
                </span>
              </div>
            </GlassCard>
          </Layer>

          {/* Double-entry ledger (middle layer) */}
          <Layer z={90} delay={1.2} className="right-0 top-[36%] w-[56%]">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-h3 font-semibold text-text-inverse">Immutable Double-Entry</h3>
                <span className="rounded-full border border-accent/30 bg-accent/12 px-2 py-0.5 text-caption text-accent">
                  Balanced
                </span>
              </div>

              <div className="mt-3 divide-y divide-border-subtle rounded-button border border-border-subtle bg-surface-sunken/50">
                {LEDGER.map((row) => (
                  <div key={row.side} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 font-mono text-caption font-semibold text-accent">
                        {row.side}
                      </span>
                      <span className="text-caption text-text-inverse">{row.account}</span>
                    </div>
                    <span className="font-mono text-caption text-text-inverse">
                      BDT {row.amount}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-caption text-text-muted">
                Paisa-exact amounts. Posting sealed{' '}
                <span className="font-mono text-text-inverse-muted">#A94F21C</span>
              </p>
            </GlassCard>
          </Layer>

          {/* Collections chart (front-left) */}
          <Layer z={150} delay={2.4} className="bottom-0 left-[4%] w-[44%]">
            <GlassCard className="p-4">
              <p className="text-caption text-text-muted">Installments collected</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-h2 font-bold text-text-inverse">BDT 4.82 Cr</span>
                <span className="text-caption font-medium text-accent">+12.4%</span>
              </div>
              <div className="mt-3 flex h-14 items-end gap-1.5">
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-button ${i === BARS.length - 1 ? 'bg-accent' : 'bg-accent/30'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </GlassCard>
          </Layer>

          {/* Area converter chip (top-right, closest to the viewer) */}
          <Layer z={190} delay={0.6} className="right-[2%] top-0">
            <GlassCard className="px-3.5 py-2.5">
              <p className="text-caption text-text-muted">Katha to Decimal</p>
              <p className="font-mono text-caption font-semibold text-text-inverse">
                5 Katha = 8.26 Decimal
              </p>
            </GlassCard>
          </Layer>

          {/* Tenant isolation chip (bottom-right) */}
          <Layer z={170} delay={1.8} className="bottom-2 right-[4%]">
            <GlassCard className="px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px] shadow-accent" />
                <div>
                  <p className="text-caption font-semibold text-text-inverse">
                    PostgreSQL RLS enforced
                  </p>
                  <p className="text-caption text-text-muted">
                    Every tenant isolated at the database
                  </p>
                </div>
              </div>
            </GlassCard>
          </Layer>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="relative z-10 border-t border-border-subtle pt-6">
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span>Cloud and standalone modes</span>
          <span>Asia/Dhaka fiscal standard</span>
          <span>Hardware-bound security</span>
        </div>
      </div>
    </div>
  );
}
