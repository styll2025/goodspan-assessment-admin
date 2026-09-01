import { describe, expect, it } from 'vitest';
import { buildXlsx } from './xlsx';

describe('buildXlsx', () => {
  it('writes a zip workbook that contains the exported cells', () => {
    const bytes = buildXlsx(['Pillar', 'Practice'], [['Mind', 'Once this week, write <one> sentence & rest']]);
    const text = new TextDecoder().decode(bytes);
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
    expect(text).toContain('Once this week, write &lt;one&gt; sentence &amp; rest');
    expect(text).toContain('Practices');
  });
});
