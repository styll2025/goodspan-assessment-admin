/** Keep what the research supports; drop Library-only notes about what it does not. */

const LIMITATION = [
  /\bthe cited\b/i,
  /\bdoes not establish\b/i,
  /\bdid not establish\b/i,
  /\bdo not establish\b/i,
  /\bis not established\b/i,
  /\bdoes not (directly )?test\b/i,
  /\bdid not (directly )?test\b/i,
  /\bdo not (directly )?test\b/i,
  /\bdoes not show\b/i,
  /\bhas not shown\b/i,
  /\bdoes not isolate\b/i,
  /\bdid not isolate\b/i,
  /\bdid not separately test\b/i,
  /\bdid not examine\b/i,
  /\bdid not find\b/i,
  /\bshould not present\b/i,
  /\bdon't mention\b/i,
  /\bGood Span should not\b/i,
  /\bshould be framed\b/i,
  /\bpractical translation\b/i,
  /\bpractical social extension\b/i,
  /\brather than an evidence-established\b/i,
  /\brather than a tested\b/i,
  /\brather than a variable\b/i,
  /\brather than a dose\b/i,
  /\brather than tracking\b/i,
  /\brather than the carry\b/i,
  /\brather than a directly tested\b/i,
  /\bnot a claim\b/i,
  /\bbecause this is observational\b/i,
  /\bbecause the study is observational\b/i,
  /\bthis is observational\b/i,
  /\bnot statistically significant\b/i,
  /\bnot statistically strong\b/i,
  /\bnot strongly statistically significant\b/i,
  /\bdid not reach statistical significance\b/i,
  /\bthis study did not\b/i,
  /\bthe study did not\b/i,
  /\bthe studies do not\b/i,
  /\bthe review did not\b/i,
  /\bthis specific meta-analysis did not\b/i,
  /\bScientific rationale\b/i,
  /\bused a \d+-day protocol\b/i,
  /\btested a specific (limit|interval)\b/i,
  /\btested structured gamification\b/i,
  /\bnot a single informal\b/i,
];

const CLAUSE_SPLIT =
  /(?:;\s+)|(?:\s*,\s+(?=but\b|although\b|though\b|separately\b|and research\b))|(?:\s+but\s+(?=does\b|did\b|not\b|it\b|this\b|research\b))/i;

function rewriteCitedPhrases(text: string): string {
  return text
    .replace(/\bScientific rationale\s*\([^)]*\):\s*/gi, '')
    .replace(/\bthe cited guideline and pilot trial\b/gi, 'research')
    .replace(/\bthe cited pilot (?:trial|evidence)\b/gi, 'research')
    .replace(/\bthe cited observational (?:study|evidence)\b/gi, 'research')
    .replace(
      /\bthe cited (?:study|studies|evidence|reviews?|trials?|meta-analysis|literature|intervention)\b/gi,
      'research',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s*(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitClauses(sentence: string): string[] {
  return sentence
    .split(CLAUSE_SPLIT)
    .map((part) => part.trim().replace(/^(?:but|although|though|separately|and)\s+/i, ''))
    .filter(Boolean);
}

function polishClause(clause: string): string {
  let text = clause.trim();
  text = text.replace(/^research\b/, 'Research');
  text = text.replace(/^Research support\b/, 'Research supports');
  text = text.replace(/^Research provide\b/, 'Research provides');
  text = text.replace(/^Research find\b/, 'Research found');
  text = text.replace(/^Research link\b/, 'Research links');
  text = text.replace(/^Research indicate\b/, 'Research indicates');
  text = text.replace(/^Research suggest\b/, 'Research suggests');
  return text.replace(/[,;:\s]+$/, '').trim();
}

function isLimitation(clause: string): boolean {
  const text = clause.trim();
  if (LIMITATION.some((pattern) => pattern.test(text))) return true;
  if (/^not a (claim|specific|universal|single)\b/i.test(text)) return true;
  if (/^(?:it|this) (?:does|did) not\b/i.test(text)) return true;
  return false;
}

function finishSentence(text: string): string {
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function memberFacingCopy(text: string | undefined): string {
  if (!text?.trim()) return '';
  return splitSentences(text)
    .map((sentence) => {
      const kept = splitClauses(rewriteCitedPhrases(sentence))
        .map(polishClause)
        .filter((clause) => clause && !isLimitation(clause));
      if (!kept.length) return '';
      return finishSentence(kept.join('. '));
    })
    .filter(Boolean)
    .join(' ')
    .trim();
}
