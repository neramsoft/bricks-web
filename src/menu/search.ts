// The menu search is one function for the server (which writes each item's search text into the
// page) and the browser (which folds what the visitor types): so "zilavka" finds "Žilavka".

/** Lower case, without accents; `đ` is `dj` the way people type it. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whether an item's folded text holds every word of a query. An empty query holds everything. */
export function matches(haystack: string, query: string): boolean {
  const words = fold(query).split(" ").filter(Boolean);
  return words.every((word) => haystack.includes(word));
}
