# Maestro E2E flows

Smoke-test flows for `apps/mobile`'s core paths, added to close the "no mobile test coverage" gap flagged in `docs/mobile-best-practices-2026.md` §7. **These flows have not been run against a real device or emulator from this environment** — there was no Maestro CLI, no Android/iOS emulator, and no seeded test backend available here. They're written against the actual screen structure and copy (verified by reading the code, not guessed), but treat them as a starting point to run and fix up, not as a passing suite.

## What's covered

- `sign-in.yaml` — email/password sign-in, lands on the search tab.
- `search-and-view-trajet.yaml` — search a route, open the first result.
- `book-a-ride.yaml` — pick seats + a payment method, submit a booking request. Stops before an actual Stripe payment (see the comment in the file for why).
- `live-location-share.yaml` — driver signs in, opens one of their own trajets, starts live location sharing.

Not covered yet: messaging, reviews, document upload, account settings, sign-up. Add flows for those the same way — find the screen, add a `testID` to the elements you need to drive (see the pattern already in `app/(auth)/index.tsx`, `app/(tabs)/recherche.tsx`, `app/trajets/[id].tsx`), write the flow against it.

## Why `testID`, not visible text

Maestro can select by visible text, but this app's copy is bilingual (`lib/i18n`, defaults to French, follows device locale) — a text selector silently breaks the moment the flow runs on an English-locale device/simulator. Every flow here selects by `testID` wherever one exists; visible-text selectors (`tapOn: 'Mes trajets'`, the permission-dialog line in `live-location-share.yaml`) are only used where there was no reasonable way to add a `testID` (a tab bar label, an OS-level permission dialog) — those are the parts most likely to need adjusting if they fail.

## Prerequisites to actually run these

1. Install the Maestro CLI (`curl -Ls "https://get.maestro.mobile.dev" | bash` on macOS/Linux; Windows needs WSL — Maestro has no native Windows build as of this writing).
2. A **development build** of the app, not Expo Go — `expo-notifications` and other native modules mean Expo Go won't have everything the app now uses. Build one via `pnpm build:dev` (see `eas.json`, added alongside the EAS pipeline in `docs/mobile-best-practices-2026.md` §4) once `eas init` has been run, or a local `expo run:android` / `expo run:ios`.
3. A running API + seeded database reachable from the emulator/device, with:
   - A passenger test account and a driver test account.
   - At least one published, non-cancelled trajet between two known cities for the driver account, with `seatsAvailable > 0`.
4. Run with credentials passed as env vars (never commit real ones):

```sh
maestro test .maestro/flows/sign-in.yaml \
  --env MAESTRO_TEST_EMAIL=passenger@example.test \
  --env MAESTRO_TEST_PASSWORD=change-me

maestro test .maestro/flows/search-and-view-trajet.yaml \
  --env MAESTRO_TEST_EMAIL=passenger@example.test \
  --env MAESTRO_TEST_PASSWORD=change-me \
  --env MAESTRO_SEARCH_DEPARTURE_CITY=Montréal \
  --env MAESTRO_SEARCH_DESTINATION_CITY=Québec

# live-location-share.yaml reuses sign-in.yaml — pass the DRIVER account here, not the passenger one
maestro test .maestro/flows/live-location-share.yaml \
  --env MAESTRO_TEST_EMAIL=driver@example.test \
  --env MAESTRO_TEST_PASSWORD=change-me
```

Or run the whole suite: `maestro test .maestro/flows` (still needs every env var above set for the flows that use them).
