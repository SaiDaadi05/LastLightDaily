import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { postNightSky } from '../core/post';

export const menu = new Hono();

/** Moderators: post tonight's sky now (or open it if it's already up). */
menu.post('/post-tonight', async (c) => {
  try {
    const { id, created } = await postNightSky();
    return c.json<UiResponse>(
      {
        showToast: created ? 'Tonight’s sky is up.' : 'Tonight’s sky was already posted.',
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${id.replace(/^t3_/, '')}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error posting tonight's sky: ${error}`);
    return c.json<UiResponse>({ showToast: 'Could not post tonight’s sky.' }, 400);
  }
});
