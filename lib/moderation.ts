// Lightweight output filter: generated posts that hit these patterns are replaced with "[filtered]".
// Extend BLOCKED (or swap in a moderation model) before any public deploy.
const BLOCKED: RegExp[] = [
  /\bkys\b/i,
  /\bkill (yo)?urself\b/i,
  /\b(go )?die in a fire\b/i,
  /\b(subhuman|vermin|untermensch)\b/i,
  /\b(should|deserve to) (all )?(be )?(shot|hanged|gassed|exterminated)\b/i,
  /\bf[a@]gg?[o0]ts?\b/i,
  /\bn[i1]gg(er|a)s?\b/i,
  /\br[e3]t[a@]rds?\b/i,
  /\btr[a@]nn(y|ies)\b/i,
];

export function moderate(text: string): string {
  return BLOCKED.some((re) => re.test(text)) ? "[filtered]" : text;
}
