"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  itemName?: string; // e.g., "timetables", "modules", "students"
}

export default function Pagination({
  currentPage,
  lastPage,
  total,
  from,
  to,
  loading = false,
  onPageChange,
  itemName = "items",
}: PaginationProps) {
  if (lastPage <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // Maximum visible page numbers

    if (lastPage <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of visible range
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(lastPage - 1, currentPage + 1);

      // Adjust if we're near the start
      if (currentPage <= 3) {
        end = Math.min(4, lastPage - 1);
      }

      // Adjust if we're near the end
      if (currentPage >= lastPage - 2) {
        start = Math.max(2, lastPage - 3);
      }

      // Add ellipsis before if needed
      if (start > 2) {
        pages.push("ellipsis-start");
      }

      // Add visible page numbers
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis after if needed
      if (end < lastPage - 1) {
        pages.push("ellipsis-end");
      }

      // Always show last page
      if (lastPage > 1) {
        pages.push(lastPage);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="card-body border-t border-base-300 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Results Info */}
        <div className="text-sm text-base-content/70 whitespace-nowrap">
          Showing <span className="font-semibold text-base-content">{from}</span> to{" "}
          <span className="font-semibold text-base-content">{to}</span> of{" "}
          <span className="font-semibold text-base-content">{total}</span> {itemName}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          {/* First Page Button */}
          <button
            className="btn btn-sm btn-outline border-base-300 hover:border-primary hover:bg-primary hover:text-primary-content disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            title="First page"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="hidden sm:inline">First</span>
          </button>

          {/* Previous Page Button */}
          <button
            className="btn btn-sm btn-outline border-base-300 hover:border-primary hover:bg-primary hover:text-primary-content disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === "ellipsis-start" || page === "ellipsis-end") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 text-base-content/50 font-semibold"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = currentPage === pageNum;

              return (
                <button
                  key={pageNum}
                  className={`btn btn-sm min-w-[2.5rem] ${
                    isActive
                      ? "btn-primary text-primary-content"
                      : "btn-outline border-base-300 hover:border-primary hover:bg-primary hover:text-primary-content"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  aria-label={`Page ${pageNum}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            className="btn btn-sm btn-outline border-base-300 hover:border-primary hover:bg-primary hover:text-primary-content disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === lastPage || loading}
            title="Next page"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last Page Button */}
          <button
            className="btn btn-sm btn-outline border-base-300 hover:border-primary hover:bg-primary hover:text-primary-content disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(lastPage)}
            disabled={currentPage === lastPage || loading}
            title="Last page"
            aria-label="Last page"
          >
            <span className="hidden sm:inline">Last</span>
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
