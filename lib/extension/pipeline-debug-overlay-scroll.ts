export function maxBodyScrollTop(body: HTMLElement): number {
  return Math.max(0, body.scrollHeight - body.clientHeight);
}

export function restoreBodyScroll(body: HTMLElement, scrollTop: number): void {
  body.scrollTop = Math.min(Math.max(0, scrollTop), maxBodyScrollTop(body));
}

/** Re-apply scroll after layout/paint — DOM updates often shift scroll position once. */
export function scheduleRestoreBodyScroll(body: HTMLElement, scrollTop: number): void {
  restoreBodyScroll(body, scrollTop);
  requestAnimationFrame(() => {
    restoreBodyScroll(body, scrollTop);
    requestAnimationFrame(() => restoreBodyScroll(body, scrollTop));
  });
}
