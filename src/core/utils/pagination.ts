/**
 * Pure pagination helpers shared by every paged list in the admin site.
 */

export type PageItem = number | "ellipsis";

/** Items on a 1-based page. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getPageCount(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

/** 1-based inclusive range of items shown on a page, e.g. { from: 1, to: 10 }. */
export function getPageRange(
  page: number,
  pageSize: number,
  totalCount: number,
): { from: number; to: number } {
  if (totalCount === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(page * pageSize, totalCount) };
}

/**
 * Page buttons to show: the first and last page, the current page and its
 * neighbours, with ellipses for gaps. E.g. page 1 of 16 → 1 2 3 … 16.
 */
export function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 2) pages.add(3);
  if (page >= pageCount - 1) pages.add(pageCount - 2);

  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) items.push("ellipsis");
    items.push(value);
  });
  return items;
}
