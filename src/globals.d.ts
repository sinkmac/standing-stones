// Build-time flags injected by vite.config.ts (see `define`).
/** PUBLIC_SW_ENABLED baked in at build time: false means the service-worker
 *  registration branch is dead-code-eliminated from the bundle entirely. */
declare const __SW_ENABLED__: boolean;
