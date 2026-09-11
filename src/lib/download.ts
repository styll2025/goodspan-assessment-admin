export const BLOB_REVOKE_DELAY_MS = 60_000;

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  globalThis.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, BLOB_REVOKE_DELAY_MS);
}
