import { usePathname, useRouter } from "@/i18n/navigation";

interface NextPaginationProps {
  pageSize?: number | null;
  total: number;
  page?: number;
  search?: Record<string, undefined | string | number>;
  customPagingFn?: (page: number) => void;
  totalPages?: number;
}

export function NextPagination(props: NextPaginationProps) {
  const router = useRouter();
  const routerPathname = usePathname();

  const { total, page = 1, totalPages = 1 } = props;
  const pageSize = props.pageSize || 25;

  const prevDisabled = page === 1;
  const nextDisabled = page === totalPages || totalPages < 1;

  const totalItems = total && total < pageSize ? total : pageSize;

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastMax =
    total === 0 ? 0 : page === totalPages ? total : total && total < pageSize ? total : first + totalItems - 1;

  const last = Math.min(lastMax, total) || 0;

  const ariaLabel = `Showing ${first} - ${last} of ${total} results`;

  return (
    <>
      <div className="flex items-center justify-between border-t border-gray-200 bg-white py-3">
        <div className="flex flex-1 items-center justify-between">
          <p className="text-sm text-gray-700" aria-label={ariaLabel}>
            Showing{" "}
            <>
              <span className="font-medium">{first}</span> - <span className="font-medium">{last}</span>
            </>{" "}
            of <span className="font-medium">{total}</span> results
          </p>

          <nav className="flex items-center gap-3 rounded-md" aria-label="Pagination">
            <button
              type="button"
              onClick={() =>
                props.customPagingFn
                  ? props.customPagingFn(page - 1)
                  : router.push({
                      pathname: routerPathname,
                      query: { ...(props.search || {}), page: page - 1 },
                    })
              }
              aria-disabled={prevDisabled}
              disabled={prevDisabled}
              className="relative inline-flex items-center rounded px-1 py-1 text-black hover:underline focus:z-20 focus:outline-offset-0 disabled:text-grey-dark disabled:hover:bg-white"
            >
              <span className="sr-only">Previous</span>
              Previous
            </button>

            <div className={"inline-block"}>
              {" "}
              Page <b className="text-black">{page}</b> of{" "}
              <b className="text-black">{totalPages === 0 ? 1 : totalPages}</b>
            </div>

            <button
              type="button"
              onClick={() =>
                props.customPagingFn
                  ? props.customPagingFn(page + 1)
                  : router.push({
                      pathname: routerPathname,
                      query: { ...(props.search || {}), page: page + 1 },
                    })
              }
              disabled={nextDisabled}
              aria-disabled={nextDisabled}
              className="relative inline-flex items-center rounded px-1 py-1 text-black hover:underline focus:z-20 focus:outline-offset-0 disabled:text-grey-dark disabled:hover:bg-white"
            >
              <span className="sr-only">Next</span>
              Next
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
