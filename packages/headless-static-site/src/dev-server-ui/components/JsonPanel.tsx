export function JsonPanel({ title, value }: { title: string; value: any }) {
  return (
    <details className="bg-white border border-gray-200 rounded-xl mb-3 p-3">
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <pre className="mt-3 bg-slate-50 border border-gray-200 rounded-lg p-3 overflow-auto text-xs">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </details>
  );
}
