export function JsonPanel({
  title,
  value,
  href,
}: {
  title: string;
  value: any;
  href?: string | null;
}) {
  return (
    <details className="bg-white border border-gray-200 rounded-xl mb-3 p-3">
      <summary className="cursor-pointer font-semibold">
        <span>{title}</span>
        {href ? (
          <a
            className="ml-2 text-xs font-normal text-blue-700 underline"
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            Open file
          </a>
        ) : null}
      </summary>
      <pre className="mt-3 bg-slate-50 border border-gray-200 rounded-lg p-3 overflow-auto text-xs">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </details>
  );
}
