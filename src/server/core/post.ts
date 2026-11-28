import { context, reddit } from '@devvit/web/server';
import type { JsonObject } from '@devvit/web/shared';
import { boardIndexForNight, nightNumber } from '../../shared/game/daily';
import { DIFFICULTY_LABEL, PUZZLES } from '../../shared/game/puzzles';
import { nightPostId, setNightPost } from './community';

/** The night stored on a post, if it is a nightly post. */
export function postNight(data: JsonObject | undefined): number | null {
  const n = data?.night;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * The post for a night. Creates it if it doesn't exist yet, so the nightly
 * job, the install trigger and the moderator menu can all call this safely.
 */
export async function postNightSky(night: number = nightNumber()): Promise<{ id: string; created: boolean }> {
  const existing = await nightPostId(night);
  if (existing) return { id: existing, created: false };
  const p = PUZZLES[boardIndexForNight(night)];
  const level = p ? DIFFICULTY_LABEL[p.difficulty] : 'Medium';
  const post = await reddit.submitCustomPost({
    title: `Night ${night} · ${level} · Keep one star shining`,
    postData: { night },
    textFallback: {
      text: `Last Light, night ${night}: tonight's star puzzle. Open this post on new Reddit or in the app to play.`,
    },
  });
  await setNightPost(night, post.id);
  console.log(`Posted night ${night} in r/${context.subredditName}: ${post.id}`);
  return { id: post.id, created: true };
}
