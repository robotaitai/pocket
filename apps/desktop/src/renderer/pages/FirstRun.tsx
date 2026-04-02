interface Props {
  onComplete: () => Promise<void>;
}

export function FirstRun({ onComplete }: Props) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome to Pocket</h1>
        <p style={styles.body}>
          Pocket is a local-first personal finance app for Israeli bank accounts.
          Your data stays on this device — nothing is uploaded.
        </p>
        <ul style={styles.list}>
          <li>Connect your Israeli bank and credit card accounts</li>
          <li>Transactions are imported and stored locally</li>
          <li>Your credentials are stored in the OS keychain</li>
        </ul>
        <button style={styles.button} onClick={onComplete}>
          Get started
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#f5f5f5',
    fontFamily: 'system-ui, sans-serif',
  } satisfies React.CSSProperties,
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '48px 56px',
    maxWidth: 480,
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  } satisfies React.CSSProperties,
  title: {
    margin: '0 0 16px',
    fontSize: 28,
    fontWeight: 700,
    color: '#111',
  } satisfies React.CSSProperties,
  body: {
    margin: '0 0 20px',
    color: '#444',
    lineHeight: 1.6,
  } satisfies React.CSSProperties,
  list: {
    margin: '0 0 32px',
    paddingLeft: 20,
    color: '#444',
    lineHeight: 2,
  } satisfies React.CSSProperties,
  button: {
    display: 'block',
    width: '100%',
    padding: '14px 0',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  } satisfies React.CSSProperties,
};
