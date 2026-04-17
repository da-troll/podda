import { useState, useEffect } from 'react';
import { usePlayerContext } from '../../hooks/usePlayer';
import { MiniPlayer } from './MiniPlayer';
import { ExpandedPlayer } from './ExpandedPlayer';
import { triggerHint } from '../../hints/HintManager';
import type { Page } from '../../types';

interface Props {
  onNavigate: (page: Page) => void;
}

export function Player({ onNavigate }: Props) {
  const player = usePlayerContext();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (player.episode) triggerHint('player-open');
  }, [player.episode?.id]);

  useEffect(() => {
    if (!player.episode && expanded) setExpanded(false);
  }, [player.episode, expanded]);

  const handleNavigate = (p: Page) => {
    setExpanded(false);
    onNavigate(p);
  };

  return (
    <>
      <audio ref={player.audioRef} />
      {player.episode && <MiniPlayer onExpand={() => setExpanded(true)} />}
      {player.episode && expanded && <ExpandedPlayer onCollapse={() => setExpanded(false)} onNavigate={handleNavigate} />}
    </>
  );
}
