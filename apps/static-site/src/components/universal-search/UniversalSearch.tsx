import "./styles.css";

export function UniversalSearch() {
  return (
    <div className="universal-search w-full bg-white my-8 p-4 overflow-hidden z-50">
      <div className="border border-red-800 min-h-0 overflow-y-auto">
        <div className="h-[200%] w-full">
          {Array.from({ length: 200 }).map((_, i) => (
            <div key={i}>Text</div>
          ))}
        </div>
      </div>
      <div className="border border-green-800 h-full max-w-96 min-h-0 overflow-y-auto">Facets</div>
      <div className="col-span-2">
        <input type="text" placeholder="Search..." className="search-input w-full border-2 p-2" />
      </div>
    </div>
  );
}
