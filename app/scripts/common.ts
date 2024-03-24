export async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url);
  return res.text();
}

export function isInViewport(elem: HTMLElement): boolean {
  const rect = elem.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (self.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (self.innerWidth || document.documentElement.clientWidth)
  );
}
