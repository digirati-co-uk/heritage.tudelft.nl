export function Navigation({ debugBase }: { debugBase: string }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-semibold">IIIF Dev Server</h1>
        <p className="text-slate-500 mt-1">
          Debug-friendly browse and inspection UI
        </p>
      </div>
      <nav className="flex gap-2">
        <a
          className="border border-gray-200 rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50"
          href={`${debugBase}/`}
        >
          Home
        </a>
        <a
          className="border border-gray-200 rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50"
          href={`${debugBase}/trace`}
        >
          Trace
        </a>
      </nav>
    </header>
  );
}
