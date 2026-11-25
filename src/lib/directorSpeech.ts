export const DIRECTOR_SPEECH_RESERVE_SECONDS = 1.5;
export const DIRECTOR_SPEECH_WORDS_PER_SECOND = 1.8;

export function directorDialogueWordLimit(durationSeconds: number): number {
  const speechSeconds = Math.max(0, durationSeconds - DIRECTOR_SPEECH_RESERVE_SECONDS);
  return Math.max(1, Math.floor(speechSeconds * DIRECTOR_SPEECH_WORDS_PER_SECOND));
}

export function countDirectorDialogueWords(text: string): number {
  return text.trim().match(/\S+/g)?.length ?? 0;
}

export function fitDirectorDialogue(text: string, maxWords: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const words = normalized.match(/\S+/g) ?? [];
  if (words.length <= maxWords) return normalized;

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  const kept: string[] = [];
  for (const sentence of sentences) {
    const candidate = [...kept, sentence.trim()].filter(Boolean).join(' ');
    if (countDirectorDialogueWords(candidate) > maxWords) break;
    kept.push(sentence.trim());
  }
  if (kept.length) return kept.join(' ');

  return words.slice(0, maxWords).join(' ').replace(/[,:;–-]+$/, '') + '.';
}
