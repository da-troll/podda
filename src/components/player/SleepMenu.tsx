import { useState } from 'react';
import { Moon } from 'lucide-react';
import { usePlayerContext } from '../../hooks/usePlayer';
import { hapticImpact } from './haptics';

const PRESETS_MIN = [5, 15, 30, 45, 60];

function formatRemaining(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function SleepMenu() {
  const player = usePlayerContext();
  const [open, setOpen] = useState(false);

  const active = player.sleepTimer != null;
  const label = player.sleepTimer?.type === 'end-of-episode'
    ? 'End'
    : player.sleepTimerRemaining != null
      ? formatRemaining(player.sleepTimerRemaining)
      : null;

  const setTimer = (mode: Parameters<typeof player.setSleepTimer>[0]) => {
    player.setSleepTimer(mode);
    setOpen(false);
    if (mode) hapticImpact('MEDIUM');
  };

  return (
    <div className="player-sleep-wrap">
      <button
        className={`player-sleep-btn ${active ? 'active' : ''}`}
        title={active ? `Sleep timer: ${label}` : 'Sleep timer'}
        onClick={() => setOpen(o => !o)}
      >
        <Moon size={18} />
        {label && <span className="player-sleep-label">{label}</span>}
      </button>
      {open && (
        <>
          <div className="player-sleep-backdrop" onClick={() => setOpen(false)} />
          <div className="player-sleep-menu" role="menu">
            {PRESETS_MIN.map(m => (
              <button
                key={m}
                onClick={() => setTimer({ type: 'duration', endsAt: Date.now() + m * 60_000 })}
              >{m} min</button>
            ))}
            <button onClick={() => setTimer({ type: 'end-of-episode' })}>End of episode</button>
            {active && (
              <button className="player-sleep-cancel" onClick={() => setTimer(null)}>Cancel timer</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
