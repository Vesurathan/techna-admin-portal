"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  itemName?: string;
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

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (lastPage <= maxVisible) {
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(lastPage - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = Math.min(4, lastPage - 1);
      }

      if (currentPage >= lastPage - 2) {
        start = Math.max(2, lastPage - 3);
      }

      if (start > 2) {
        pages.push("ellipsis-start");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < lastPage - 1) {
        pages.push("ellipsis-end");
      }

      if (lastPage > 1) {
        pages.push(lastPage);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="whitespace-nowrap text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{from}</span> to{" "}
          <span className="font-semibold text-foreground">{to}</span> of{" "}
          <span className="font-semibold text-foreground">{total}</span> {itemName}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            title="First page"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="hidden sm:inline">First</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === "ellipsis-start" || page === "ellipsis-end") {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 font-semibold text-muted-foreground">
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = currentPage === pageNum;

              return (
                <Button
                  key={pageNum}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn("min-w-[2.5rem]", isActive && "pointer-events-none")}
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  aria-label={`Page ${pageNum}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === lastPage || loading}
            title="Next page"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(lastPage)}
            disabled={currentPage === lastPage || loading}
            title="Last page"
            aria-label="Last page"
          >
            <span className="hidden sm:inline">Last</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
