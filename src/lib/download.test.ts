import { afterEach, describe, expect, it, vi } from 'vitest';
import { BLOB_REVOKE_DELAY_MS, triggerBrowserDownload } from './download';

describe('triggerBrowserDownload', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the blob URL alive long enough for Safari to finish the download', () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:safari-download');
    const revokeObjectURL = vi.fn();
    const link = {
      href: '',
      download: '',
      rel: '',
      style: { display: '' },
      click,
      remove,
    };

    vi.stubGlobal('document', {
      createElement: () => link,
      body: { appendChild },
    });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    triggerBrowserDownload(new Blob(['sheet']), 'GoodSpan.xlsx');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.download).toBe('GoodSpan.xlsx');
    expect(link.href).toBe('blob:safari-download');
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(BLOB_REVOKE_DELAY_MS - 1);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:safari-download');
  });
});
