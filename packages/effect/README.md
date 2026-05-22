[![npm version](https://badge.fury.io/js/orval.svg)](https://badge.fury.io/js/orval)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# @orval/effect

Generates [Effect Schema](https://effect.website/docs/schema/introduction/) validators from OpenAPI specifications.

Use it by setting `client: 'effect'` in your `orval.config`. The output mirrors what `client: 'zod'` produces, but with the `effect` package's `S.*` API instead of zod's `z.*` API.

Configuration knobs (strict, generate, useBrandedTypes, generateEachHttpStatus) are read from `override.effect.*`. If `override.effect` is not set, Orval falls back to `override.zod` for compatibility with the existing schema-validator options.

## Runtime dependency

The generated code imports `Schema` from `effect`. Consumers must install `effect` (>=3.10) in their own project — `@orval/effect` does not bundle it.
