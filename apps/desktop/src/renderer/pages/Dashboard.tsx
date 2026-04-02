export function Dashboard() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Pocket</h1>
      </header>
      <main style={styles.main}>
        <p style={styles.placeholder}>
          No accounts connected yet. Use the connector to import transactions.
        </p>
      </main>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: 'system-ui, sans-serif',
    background: '#f9f9f9',
  } satisfies React.CSSProperties,
  header: {
    padding: '16px 32px',
    background: '#fff',
    borderBottom: '1px solid #eee',
  } satisfies React.CSSProperties,
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#111',
  } satisfies React.CSSProperties,
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies React.CSSProperties,
  placeholder: {
    color: '#888',
  } satisfies React.CSSProperties,
};
