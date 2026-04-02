import { useEffect, useState } from 'react';
import { FirstRun } from './pages/FirstRun.js';
import { Dashboard } from './pages/Dashboard.js';

type View = 'loading' | 'first-run' | 'dashboard';

export function App() {
  const [view, setView] = useState<View>('loading');

  useEffect(() => {
    void window.pocket.settings.get('firstRunComplete').then((val) => {
      setView(val === 'true' ? 'dashboard' : 'first-run');
    });
  }, []);

  const handleFirstRunComplete = async () => {
    await window.pocket.settings.set('firstRunComplete', 'true');
    setView('dashboard');
  };

  if (view === 'loading') {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>Loading...</p>
      </div>
    );
  }

  if (view === 'first-run') {
    return <FirstRun onComplete={handleFirstRunComplete} />;
  }

  return <Dashboard />;
}

const styles = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: 'system-ui, sans-serif',
  } satisfies React.CSSProperties,
  muted: {
    color: '#666',
  } satisfies React.CSSProperties,
};
