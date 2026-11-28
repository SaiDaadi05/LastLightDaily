import { Hono } from 'hono';
import { postNightSky } from '../core/post';

export const scheduler = new Hono();

/** Runs a minute after 00:00 UTC: a new sky every night. */
scheduler.post('/nightly-sky', async (c) => {
  try {
    const { id, created } = await postNightSky();
    return c.json({ status: 'success', message: created ? `Posted ${id}` : `Already posted ${id}` }, 200);
  } catch (error) {
    console.error(`Nightly post failed: ${error}`);
    return c.json({ status: 'error', message: 'Nightly post failed' }, 500);
  }
});
