import { describe, expect, it } from 'vitest';
import { PRACTICES } from './matching';
import { memberFacingCopy } from './memberFacingCopy';

describe('memberFacingCopy', () => {
  it('keeps the public why and drops the cited-study hedge', () => {
    const why =
      'Awe walks are associated with greater daily awe and modestly greater daily prosocial behaviour, such as helping others. The cited study does not establish that two 15-minute walks per week is an optimal dose.';
    expect(memberFacingCopy(why)).toBe(
      'Awe walks are associated with greater daily awe and modestly greater daily prosocial behaviour, such as helping others.',
    );
  });

  it('keeps what the research supports from a compound cited sentence', () => {
    expect(
      memberFacingCopy(
        'The cited study supports reappraisal as a strategy but does not establish that a daily three-step journal is necessary or optimal.',
      ),
    ).toBe('Research supports reappraisal as a strategy.');
  });

  it('rewrites a cited support sentence instead of dropping it', () => {
    expect(memberFacingCopy('The cited reviews support exposure to light as a circadian signal.')).toBe(
      'Research supports exposure to light as a circadian signal.',
    );
  });

  it('drops copy that only says what the research does not support', () => {
    expect(
      memberFacingCopy(
        'The cited study used a 21-day protocol. Good Span should not present that exact limit as a universally optimal dose.',
      ),
    ).toBe('');
  });

  it('keeps the supporting clause before a semicolon limitation', () => {
    const evidence =
      'Research indicates that regular stretch training produces a significant, moderate improvement in joint range of motion compared with no stretching; the evidence does not show that a higher weekly frequency produces a significantly larger effect than a lower one.';
    expect(memberFacingCopy(evidence)).toBe(
      'Research indicates that regular stretch training produces a significant, moderate improvement in joint range of motion compared with no stretching.',
    );
  });

  it('keeps research findings that use "rather than" as the comparison', () => {
    const evidence =
      'Research indicates that sustained attention to a current activity, rather than mind-wandering, is associated with greater momentary happiness.';
    expect(memberFacingCopy(evidence)).toBe(evidence);
  });

  it('drops practical-translation hedges from evidence notes', () => {
    const evidence =
      'Bai et al. (2021) found that a 15-minute weekly awe walk was associated with greater daily awe. This is a practical translation of that evidence into a 30-day practice, not a claim that two 15-minute walks is an optimal dose.';
    expect(memberFacingCopy(evidence)).toBe(
      'Bai et al. (2021) found that a 15-minute weekly awe walk was associated with greater daily awe.',
    );
  });

  it('leaves ordinary Library copy unchanged', () => {
    const why =
      'Slow nasal breathing can increase heart-rate variability and support a calmer physiological state.';
    expect(memberFacingCopy(why)).toBe(why);
  });

  it('does not split scientific decimals into broken sentences', () => {
    const evidence =
      'Research indicates that dietary protein supplementation significantly increases gains in strength, fat-free mass, and muscle fibre size during resistance training lasting six weeks or longer, with the benefit diminishing above a total protein intake of about 1.6 g/kg/day. Evidence also suggests that higher vegetable intake is associated with a dose-dependent reduction in cardiovascular disease, cancer, and all-cause mortality risk.';
    expect(memberFacingCopy(evidence)).toBe(evidence);
  });
});

describe('memberFacingCopy on the practice bank', () => {
  it('keeps support and removes what-the-research-does-not notes from every why and evidence', () => {
    const leftovers: string[] = [];
    for (const pillar of Object.values(PRACTICES)) {
      for (const practices of Object.values(pillar)) {
        for (const practice of practices) {
          for (const field of [practice.why, practice.evidence]) {
            const copy = memberFacingCopy(field);
            if (
              /\bthe cited\b/i.test(copy) ||
              /\bdoes not establish\b/i.test(copy) ||
              /\bdoes not (directly )?test\b/i.test(copy) ||
              /\bdid not (directly )?test\b/i.test(copy) ||
              /\bGood Span should not\b/i.test(copy) ||
              /\bdoes not isolate\b/i.test(copy)
            ) {
              leftovers.push(copy);
            }
          }
        }
      }
    }
    expect(leftovers).toEqual([]);
  });
});
