import { useCallback, useMemo, useRef } from "react";

export type PaginatedActions = ReturnType<typeof usePaginateArray>[1];

export function usePaginateArray<T>(
  inputArray: T[],
  {
    filter,
    setPage,
    page = 1,
    pageSize = 10,
  }: {
    filter?: (item: T) => boolean;
    setPage?: (page: number) => void;
    page?: number;
    pageSize?: number;
  },
) {
  const array = useMemo(() => {
    if (!filter) return inputArray;
    return inputArray.filter(filter);
  }, [inputArray, filter]);
  const topRef = useRef<HTMLDivElement | null>(null);
  const currentPage = page;
  const totalPages = Math.ceil(array.length / pageSize);

  const setCurrentPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setPage?.(page);
        topRef.current?.scrollIntoView({ behavior: "instant" });
      }
    },
    [setPage, totalPages],
  );

  const paginatedArray = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return array.slice(startIndex, endIndex);
  }, [array, currentPage, pageSize]);

  const actions = useMemo(() => {
    // Actions.
    function nextPage() {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    }

    function prevPage() {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }

    function goToPage(page: number) {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    }

    function goToFirstPage() {
      setCurrentPage(1);
    }

    function goToLastPage() {
      setCurrentPage(totalPages);
    }

    return {
      currentPage,
      totalPages,
      nextPage,
      prevPage,
      pageSize,
      goToPage,
      goToFirstPage,
      goToLastPage,
      topRef,
      totalItems: array.length,
    };
  }, [array, currentPage, pageSize, totalPages, setCurrentPage]);

  return [paginatedArray, actions] as const;
}
