import { defineConfig } from 'tsdown';

import { baseConfig } from '../tsdown.base';

export default defineConfig({
  ...baseConfig,
  entry: ['src/bin/orval.ts', 'src/index.ts'],
  exports: {
    ...baseConfig.exports,
    inlinedDependencies: false,
  },
  deps: {
    ...baseConfig.deps,
    alwaysBundle: [/^@orval\//],
  },
});
