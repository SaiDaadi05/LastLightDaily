import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { postNightSky } from '../core/post';

export const triggers = new Hono();

/** Post tonight's sky as soon as the app is installed. */
triggers.post('/on-app-install', async (c) => {
  try {
    const { id } = await postNightSky();
    return c.json<TriggerResponse>({ status: 'success', message: `Tonight's sky: ${id}` }, 200);
  } catch (error) {
    console.error(`Error posting tonight's sky: ${error}`);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to post tonight’s sky' }, 400);
  }
});
