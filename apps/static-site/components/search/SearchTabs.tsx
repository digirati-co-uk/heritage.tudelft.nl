import { useMenu } from "react-instantsearch";
import { twMerge } from "tailwind-merge";

export function SearchTabs() {
  const { items, refine, createURL } = useMenu({
    attribute: "type",
    sortBy: ["name:asc"],
  });

  const current = items.find((item) => item.isRefined);

  return (
    <ul className="mb-8 flex gap-4">
      <li className={twMerge("border-b-2", !current && "border-blue-500")}>
        <a
          className="flex items-center gap-2 p-2"
          href={current ? createURL(current.value) : "#"}
          onClick={(event) => {
            event.preventDefault();
            if (current) {
              refine(current.value);
            }
          }}
        >
          <span>All</span>
        </a>
      </li>

      {items.map((item) => (
        <li key={item.label} className={twMerge("border-b-2", item.isRefined && "border-blue-500")}>
          <a
            className="flex items-center gap-2 p-2"
            href={createURL(item.value)}
            onClick={(event) => {
              event.preventDefault();

              refine(item.value);
            }}
          >
            <span>{item.label}</span>
            <span className="rounded-full bg-slate-400 px-3 py-0.5 text-xs font-bold text-slate-100">{item.count}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
