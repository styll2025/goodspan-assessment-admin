import { describe, expect, it } from 'vitest';
import { PRACTICES } from './matching';
import { appendPracticeAdds, applyPracticeEdits, practiceIdentity, practicePatchFrom, practiceSourceText } from './practiceBank';

describe('practice bank edits', () => {
  it('replaces wording and evidence without losing the original identity', () => {
    const original = PRACTICES.sleep.Screentime[0];
    const id = practiceIdentity('sleep', 'Screentime', original);
    const bank = applyPracticeEdits({
      [id]: {
        text: 'Create a calmer screen-free hour before bed.',
        evidence: 'Edited evidence for this practice.',
      },
    });
    expect(bank.sleep.Screentime).toHaveLength(1);
    expect(bank.sleep.Screentime[0].text).toBe('Create a calmer screen-free hour before bed.');
    expect(bank.sleep.Screentime[0].evidence).toBe('Edited evidence for this practice.');
    expect(bank.sleep.Screentime[0].effort).toBe(original.effort);
    expect(applyPracticeEdits({
      [id]: { text: 'Create a calmer screen-free hour before bed.' },
    }).sleep.Screentime[0].text).toBe('Create a calmer screen-free hour before bed.');
  });

  it('moves a practice into another category and pillar', () => {
    const original = PRACTICES.eat.Nourish[0];
    const id = practiceIdentity('eat', 'Nourish', original);
    const bank = applyPracticeEdits({
      [id]: { pillarId: 'sleep', category: 'Screentime', text: 'Moved nourish practice.' },
    });
    expect(bank.sleep.Screentime.some((practice) => practice.text === 'Moved nourish practice.')).toBe(true);
    expect(bank.eat.Nourish?.some((practice) => practice.text === original.text) ?? false).toBe(false);
  });

  it('stores only fields that actually changed', () => {
    const practice = PRACTICES.eat.Nourish[0];
    expect(practicePatchFrom(
      { pillarId: 'eat', category: 'Nourish', practice },
      { pillarId: 'eat', category: 'Nourish', practice },
    )).toBeNull();
    expect(practicePatchFrom(
      { pillarId: 'eat', category: 'Nourish', practice },
      { pillarId: 'eat', category: 'Rhythm', practice: { ...practice, why: 'Rewritten why.' } },
    )).toEqual({ category: 'Rhythm', why: 'Rewritten why.' });
  });

  it('appends a newly added practice, including a new category', () => {
    const bank = appendPracticeAdds(PRACTICES, {
      'added:1': {
        pillarId: 'eat',
        category: 'Nourish',
        practice: {
          ...PRACTICES.eat.Nourish[0],
          text: 'Admin-added nourish practice.',
        },
      },
      'added:2': {
        pillarId: 'mind',
        category: 'New circle check-in',
        practice: {
          ...PRACTICES.sleep.Screentime[0],
          text: 'Write one sentence to a Circle member.',
        },
      },
    });
    expect(bank.eat.Nourish.some((practice) => practice.text === 'Admin-added nourish practice.')).toBe(true);
    expect(bank.eat.Nourish).toHaveLength(PRACTICES.eat.Nourish.length + 1);
    expect(bank.mind['New circle check-in'][0].text).toBe('Write one sentence to a Circle member.');
  });

  it('prefers references when showing evidence copy', () => {
    expect(practiceSourceText({
      ...PRACTICES.sleep.Screentime[0],
      evidence: 'Fallback evidence.',
      references: ['First citation.', 'Second citation.'],
    })).toBe('First citation.\nSecond citation.');
    expect(practiceSourceText({
      ...PRACTICES.sleep.Screentime[0],
      evidence: 'Fallback evidence.',
      references: [],
    })).toBe('Fallback evidence.');
  });
});
