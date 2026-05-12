import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import type { Side, Difficulty } from '@/types/game';
import MenuPage from '@/pages/MenuPage';
import GamePage from '@/pages/GamePage';
import RulesPage from '@/pages/RulesPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import PrivacyPage from '@/pages/PrivacyPage';
import SignInPage from '@/pages/SignInPage';
import ContactPage from '@/pages/ContactPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';

type AppView = 'menu' | 'game' | 'rules' | 'leaderboard' | 'privacy' | 'signin' | 'contact' | 'profile' | 'admin';

function getInitialView(): AppView {
  const path = window.location.pathname;
  if (path === '/privacy') return 'privacy';
  if (path === '/signin') return 'signin';
  if (path === '/contact') return 'contact';
  return 'menu';
}

function App() {
  const [view, setView] = useState<AppView>(getInitialView);
  const [gameConfig, setGameConfig] = useState<{ side: Side; difficulty: Difficulty }>({
    side: 'defenders',
    difficulty: 'karl',
  });
  const [gameKey, setGameKey] = useState(0);

  const handleStartGame = (side: Side, difficulty: Difficulty) => {
    setGameConfig({ side, difficulty });
    setGameKey(k => k + 1);
    setView('game');
  };

  return (
    <>
      {view === 'game' ? (
        <GamePage
          key={gameKey}
          playerSide={gameConfig.side}
          difficulty={gameConfig.difficulty}
          onBackToMenu={() => setView('menu')}
        />
      ) : view === 'rules' ? (
        <RulesPage onBack={() => setView('menu')} />
      ) : view === 'leaderboard' ? (
        <LeaderboardPage
          onBack={() => setView('menu')}
          onShowProfile={() => setView('profile')}
        />
      ) : view === 'privacy' ? (
        <PrivacyPage onBack={() => setView('menu')} onShowContact={() => setView('contact')} />
      ) : view === 'signin' ? (
        <SignInPage onBack={() => setView('menu')} />
      ) : view === 'contact' ? (
        <ContactPage onBack={() => setView('menu')} />
      ) : view === 'profile' ? (
        <ProfilePage onBack={() => setView('menu')} onShowAdmin={() => setView('admin')} />
      ) : view === 'admin' ? (
        <AdminPage onBack={() => setView('profile')} />
      ) : (
        <MenuPage
          onStartGame={handleStartGame}
          onShowRules={() => setView('rules')}
          onShowLeaderboard={() => setView('leaderboard')}
          onShowPrivacy={() => setView('privacy')}
          onShowSignIn={() => setView('signin')}
          onShowProfile={() => setView('profile')}
        />
      )}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#f5f0e8',
            color: '#3a2a1a',
            border: '1px solid #c4b8a8',
            fontFamily: 'Cinzel, serif',
          },
        }}
      />
    </>
  );
}

export default App;
