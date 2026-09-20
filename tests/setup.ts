import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library's automatic cleanup only fires when a global afterEach
// exists, which it does not with `globals: false`. Without this, each render
// leaks into the next test and queries start matching stale nodes.
afterEach(() => {
  cleanup();
});
