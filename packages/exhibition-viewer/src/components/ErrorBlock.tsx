export function ErrorBlock({ error }: { error: Error }) {
  return (
    <div
      className="block cutcorners w-4 h-4"
      style={{ background: '#861c1c', color: '#fff', width: '100%', padding: '1em' }}
    >
      <h3>Block error</h3>
      <pre>{error.message}</pre>
      <pre>{error.stack}</pre>
    </div>
  );
}
