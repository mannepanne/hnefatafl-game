// ABOUT: Top-level React component — state-machine SPA router.
// ABOUT: Navigation is a single AppView union; no router library needed.

import { useState } from 'react';
import type { Side, Difficulty } from '@/shared/game/types';
import { type AppView, isPlaceholderView } from '@/client/state/appView';
import MenuPage from '@/client/pages/MenuPage';
import GamePage from '@/client/pages/GamePage';
import RulesPage from '@/client/pages/RulesPage';
import PrivacyPage from '@/client/pages/PrivacyPage';
import PlaceholderPage from '@/client/pages/PlaceholderPage';

interface GameConfig {
  side: Side;
  difficulty: Difficulty;
}

function getInitialView(): AppView {
  const path = window.location.pathname;
  if (path === '/privacy') return 'privacy';
  return 'menu';
}

export function App() {
  const [view, setView] = useState<AppView>(getInitialView);
  const [gameConfig, setGameConfig] = useState<GameConfig>({ side: 'defenders', difficulty: 'karl' });
  const [gameKey, setGameKey] = useState(0);

  const handleStartGame = (side: Side, difficulty: Difficulty) => {
    setGameConfig({ side, difficulty });
    setGameKey(k => k + 1);
    setView('game');
  };

  if (view === 'game') {
    return (
      <GamePage
        key={gameKey}
        playerSide={gameConfig.side}
        difficulty={gameConfig.difficulty}
        onBackToMenu={() => setView('menu')}
      />
    );
  }

  if (view === 'rules') {
    return <RulesPage onBack={() => setView('menu')} />;
  }

  if (view === 'privacy') {
    return <PrivacyPage onBack={() => setView('menu')} />;
  }

  if (isPlaceholderView(view)) {
    return <PlaceholderPage onBack={() => setView('menu')} />;
  }

  return (
    <MenuPage
      onStartGame={handleStartGame}
      onShowRules={() => setView('rules')}
      onShowPrivacy={() => setView('privacy')}
    />
  );
}
