# Mobile Store Privacy Declarations — Data Mapping (Apple App Privacy / Google Play Data Safety)

**Purpose** — §7 of the cahier des charges requires PIPEDA compliance; `docs/requirements-specification-audit.md` already flagged this as the weakest area of the project (40% at audit time, `main`-scoped). Both app stores now gate submission on an accurate data-collection declaration filled in their own consoles — App Store Connect's "App Privacy" nutrition label, and Google Play Console's "Data safety" form. Neither can be filled from a file in this repo; this document is the mapping to paste into them, built from actually reading what the mobile app collects and sends (not guessed), so the declaration matches the code instead of being copied from a template.

**Not legal advice.** This is an engineering-side data inventory to save you the archaeology, not a compliance sign-off — verify against Apple's/Google's current console before submitting, and against a PIPEDA/Law 25 review for the actual privacy policy wording (`apps/web/messages/{en,fr}.json` → `Privacy` section already covers most of this in user-facing language).

---

## 1. What the mobile app actually collects (verified in code, Sept 2026)

| Data | Where in the code | Notes |
|---|---|---|
| Name, email, phone | `lib/auth-client.ts` (better-auth), `app/(tabs)/compte.tsx` | Standard account fields. Phone via `phoneNumberClient` (typed, no OTP UI on mobile yet). |
| Precise location | `hooks/useLiveLocationShare.ts` | **Foreground-only** — `Location.requestForegroundPermissionsAsync()` + `watchPositionAsync`. No background location, no `expo-location` "Always" permission requested anywhere. Only sent while the driver has live-sharing on for one specific trip; a confirmed passenger on that trip reads it back via `lib/tracking.ts`. |
| Driver's licence (photo/PDF), name, licence number, date of birth | `packages/schemas/src/document.ts` (`DriverDocumentSchema`, `EligibilityDeclarationSchema`), uploaded via `components/account/AvatarCard.tsx`-style `expo-document-picker` flow | Only `permis` is actually required (`REQUIRED_DRIVER_DOCUMENT_TYPES`) — insurance/registration are self-declared booleans/text on `Vehicle`, not uploaded files. This is the one government-ID-shaped data type in the app. |
| Profile photo | `lib/avatar.ts` | Picked via `expo-document-picker` (Files/Document provider) — **not** `expo-image-picker`/camera, so there's no camera-roll or camera permission surface to declare for it. |
| Payment info | `@stripe/stripe-react-native` (card entry sheet, saved cards), PayPal (web redirect) | Card numbers never reach this app's own code or the API — Stripe's SDK handles PCI-scoped entry directly. The API still stores transaction records (amounts, status) — see `packages/schemas/src/booking-money.ts` / `payment.ts`. |
| Messages | `lib/message-read.ts`, booking chat screens | Tied to a specific booking, between the two counterparts. |
| Push token | `lib/push-notifications.ts` (new — see `docs/mobile-best-practices-2026.md` §3) | An Expo push token, not itself personal data, but linked 1:1 to the account server-side (`push_token` table). |
| Vehicle info | `lib/vehicles.ts` | Model, plate, seats — self-declared, not a document upload. |

**Not present** — worth stating explicitly since their absence changes several console answers: no analytics/ads SDK, no crash-reporting SDK on mobile (Sentry is API-side only, `SENTRY_DSN` in `apps/api/src/env.ts` — never shipped to the mobile bundle), no camera permission, no contacts access, no background location, no advertising identifier usage. That means **no App Tracking Transparency (ATT) prompt is needed on iOS** — nothing here constitutes "tracking" under Apple's definition (no cross-app/cross-site correlation, no data sharing with ad networks/data brokers).

---

## 2. Apple App Privacy label — suggested mapping

Fill this in App Store Connect → your app → App Privacy. Apple's categories: Contact Info, Health & Fitness, Financial Info, Location, Sensitive Info, Contacts, User Content, Browsing/Search History, Identifiers, Purchases, Usage Data, Diagnostics, Other Data.

| Apple category | Collected? | Linked to user? | Used to track? | Suggested purpose |
|---|---|---|---|---|
| Contact Info (name, email, phone) | Yes | Yes | No | App Functionality (account, communication) |
| Location — Precise Location | Yes | Yes | No | App Functionality (live trip sharing, driver ↔ confirmed passenger only) |
| Financial Info (payment info) | Yes | Yes | No | App Functionality (booking payment) — declare even though Stripe's SDK handles the card entry, since the app initiates and the API records transactions |
| User Content (photos, other) | Yes — the driver's licence scan + profile photo | Yes | No | App Functionality (identity verification, profile) |
| Identifiers (user ID) | Yes | Yes | No | App Functionality |
| Other Data | Consider declaring the push token here if App Store Connect's UI doesn't have a cleaner fit | Yes | No | App Functionality (push notifications) |
| Sensitive Info | **No** | — | — | A licence scan is a government ID, not Apple's narrow "Sensitive Info" definition (race/ethnicity, sexual orientation, religion, union membership, etc.) — don't over-declare here |
| Contacts, Browsing History, Search History, Health & Fitness, Purchases | No | — | — | Not collected |
| Usage Data, Diagnostics | No (no analytics/crash SDK ships in the mobile bundle today) | — | — | Revisit if you ever add Sentry/analytics to `apps/mobile` — that would flip this to "Yes" |
| **Data Used to Track You** | **None** | — | — | No ATT prompt needed |

## 3. Google Play Data Safety — suggested mapping

Fill this in Play Console → App content → Data safety. Google's form asks, per data type: collected?, shared with third parties?, purpose, optional or required, encrypted in transit, user-deletable.

| Google data type | Collected | Shared with 3rd parties | Purpose | Optional? | Notes |
|---|---|---|---|---|---|
| Name, Email address, Phone number | Yes | No | Account management, App functionality | Required (account creation) | |
| Precise location | Yes | No | App functionality | Optional (driver opts in per trip) | Foreground only — say so in the form's free-text description |
| Photos (ID document, profile photo) | Yes | No | Account management (identity verification) | Required for `permis` to get verified status; profile photo optional | Google's "Photos and videos" category is the closest fit for the licence scan — there's no dedicated "government ID" checkbox |
| Financial info (purchase history) | Yes | Yes — Stripe / PayPal are payment processors, which counts as sharing under Google's definition | App functionality (payments) | Required to book/pay | Card numbers themselves aren't collected by this app — only transaction records |
| Messages | Yes | No | App functionality | Required to coordinate a trip | |
| App activity / Device or other IDs (push token) | Yes | No | App functionality (notifications) | Optional (permission-gated) | |
| Any other category (approximate location, contacts, audio, personal identifiers beyond the above) | No | — | — | — |

**Data deletion**: link to the account-deletion flow already on the web (`apps/web/src/components/parametres/parametres-form.tsx` → `deleteAccount`) — both consoles ask for a data-deletion path, and this project already has one; just point to it (or the mobile equivalent once/if it's built — check before submitting whether mobile has its own account-deletion screen or relies on directing users to the web settings page).

---

## 4. In-app disclosure consistency check

Both stores increasingly cross-check the declared label against what the app actually shows the user at runtime. Checked against the current code:

- ✅ The `expo-location` permission string in `apps/mobile/app.json` ("Carpool utilise votre position pour partager votre trajet en direct avec vos passagers pendant que vous conduisez.") accurately describes foreground-only, trip-scoped sharing — matches the mapping above, nothing to fix.
- ✅ No camera/photo-library permission string exists — consistent with `expo-document-picker` being the only file-selection mechanism used (§1).
- 🟡 **Action needed**: the driver's licence upload screen and the profile-photo upload screen should each carry a short "why we ask for this" line consistent with §2/§3's declared purpose (identity verification / profile display) if they don't already — worth a quick check against the live screens (`app/mes-documents`-equivalent, `components/account/AvatarCard.tsx`) before submission, since this doc audits the data contracts, not every screen's copy.

---

## 5. What's still on you

- Both forms are filled in the respective developer consoles, not in this repo — nothing here can be automated further from the codebase side.
- Cross-check §2/§3 against the actual current App Store Connect / Play Console UI at submission time — Apple and Google both revise these forms periodically, and the category list above reflects Sept 2026 documentation, not a live fetch of the form.
- If PayPal's flow is app-to-app (not just a web redirect) by the time you submit, double check whether that changes the "shared with third parties" answer on Google's form.
