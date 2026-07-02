/**
 * Determine whether the Coach bot should reply.
 *
 * Rules:
 * 1. If the user @mentions Coach in the message → always reply (100%)
 * 2. Otherwise → 30% random chance
 *
 * @param {string} lastUserMessage - The most recent user message text
 * @returns {{ triggered: boolean, reason: string }}
 */
export function shouldCoachReply(lastUserMessage) {
  const mentioned = /@Coach\b/i.test(lastUserMessage);

  if (mentioned) {
    console.log('[Coach Trigger] @Coach mention detected in message:', lastUserMessage);
    return { triggered: true, reason: '@mention' };
  }

  const roll = Math.random();
  const triggered = roll < 0.3;
  console.log(`[Coach Trigger] No @mention. Random roll: ${roll.toFixed(3)} (threshold: 0.3) → ${triggered ? 'TRIGGERED' : 'skipped'}`);
  return { triggered, reason: triggered ? `random (${roll.toFixed(3)})` : 'not this time' };
}
