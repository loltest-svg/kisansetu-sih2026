"use client";

/**
 * Initializes the UX4G interactive runtime (Dropdown, Modal, Tooltip,
 * Popover, Accordion, Tab, Carousel, Drawer, Mega Menu, Alert behaviours).
 *
 * Must run in a Client Component: the runtime binds via DOM event
 * delegation and no-ops during server rendering (see
 * ux4g-web-components/dist/runtime/bootstrap — `isBrowser` guard). A
 * side-effect import placed only in a Server Component would execute on
 * the server and never ship to the browser, so this file exists solely to
 * pull the import into the client bundle. Mount once, near the root.
 *
 * See docs/UX4G.md — "Next.js client/server considerations".
 */
import "ux4g-web-components/design-system";

export default function Ux4gRuntime() {
  return null;
}
