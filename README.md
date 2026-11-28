# Last Light

A daily star puzzle that a whole subreddit plays together.

> **Circle exactly one star with a triangle. Its three corners fade. Keep one star shining.**

Every night at 00:00 UTC the app posts a new sky of 13 stars, the same for everyone. Tap three stars to draw a
triangle. If exactly one other star is inside, the three corners fade out and the star inside keeps shining. Do that
four times (13 → 10 → 7 → 4 → 1). Some legal moves lead to dead ends, so Undo is part of the game.

When you finish, your last star joins **tonight's shared sky**: you see where everyone else ended, how rare your star
is, and which stars nobody has found yet.

## What players can do

- **Play tonight's sky** right in the post. The feed preview shows the stars, how many people have lit the sky
  tonight, and the community's favorite name for it.
- **The shared sky:** after solving, every player's last star on one map. The more players kept a star, the brighter
  it glows. Stars nobody has reached yet show as dark *?* rings.
- **Light the whole sky together:** *Sky lit 5 of 6* and *Routes found 29 of 74* count what the community has found
  tonight. *Light another star* restarts the sky so you can find a dark one. Each player counts once; replays only
  light new stars and routes.
- **Your star:** a badge (*Brightest*, *Bright*, *Rare* or *Lonely*) with the share of players who kept it.
- **Name the constellation:** name your solution and vote on everyone else's names (one vote each, not your own).
  Names show the Reddit username of whoever named them. The top name appears on the post and in the next night's
  recap.
- **Comment my result:** posts a spoiler-free result as a comment from your own account, after Reddit asks you to
  allow it. The comment says how you did, never where your triangles went.
- **Last night's recap**, a **nights-in-a-row streak**, all earlier skies to replay, and a **sky maker** for sharing
  skies of your own (checked by the solver before they're accepted).

## For moderators

- Installing the app posts tonight's sky. After that a new sky is posted automatically every night at 00:01 UTC.
- Subreddit menu → **Post tonight's sky** posts it by hand (or opens it if it's already up).
- The app stores only game data in the subreddit's Redis: solve counts, which players have solved a sky (so each
  counts once), streaks, constellation names and votes, and shared skies. It posts comments only when a player taps
  *Comment my result* and allows it.

## Fair play

Every solution, name and shared sky is re-checked on the server with the game's own rules before it counts. Future
skies stay locked until their night, so nobody can solve tomorrow's sky early.

## Development

```bash
npm install
npm run dev          # playtest on r/lastlightdaily_dev
npm test             # rules, all 100 skies, the shared sky, and the server's storage
npm run type-check
npm run lint
npm run deploy       # upload a new version
```

```
src/
  client/            the post: splash.tsx (feed preview), game.tsx + App.tsx (the game), components/, community/
  server/            Hono server: routes/api.ts (game API), core/community.ts (Redis storage), core/post.ts
                     (nightly posts), routes/scheduler.ts (the nightly job), menu.ts, triggers.ts
  shared/            game rules (geometry.ts), solver (analysis.ts), the 100 verified skies (boards.json),
                     the nightly schedule (daily.ts), API types (api.ts)
```

The 100 skies are generated and verified in the [LastDot](https://github.com/SaiDaadi05/LastDot) repo: each one is
built backwards from its last star (so it is always solvable), then a full solver checks that it has real choices,
real dead ends and three clearly different routes.
