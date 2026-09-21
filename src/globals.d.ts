// Build-time flags injected by vite.config.ts (see `define`).
/** PUBLIC_SW_ENABLED baked in at build time: false means the service-worker
 *  registration branch is dead-code-eliminated from the bundle entirely. */
declare const __SW_ENABLED__: boolean;
/** Per-build id injected by vite.config.ts; versions the service worker URL so a
 *  new worker reaches the device on every deploy. */
declare const __BUILD_ID__: string;
/** INCLUDE_DEV_SITE baked in at build time: true when the dev-only test site is
 *  part of this build. Gates dev-test material out of production bundles. */
declare const __INCLUDE_DEV_SITE__: boolean;
