---
source: Official docs
library: vitest
package: vitest
topic: running tests with verbose output options
fetched: 2026-03-22T00:00:00Z
official_docs: https://vitest.dev/guide/cli
---

# Running Tests with Verbose Output Options

## Commands to Run Tests

### `vitest`

Start Vitest in the current directory. Will enter the watch mode in development environment and run mode in CI (or non-interactive terminal) automatically.

You can pass an additional argument as the filter of the test files to run. For example:

```bash
vitest foobar
```

### `vitest run`

Perform a single run without watch mode.

### `vitest watch`

Run all test suites but watch for changes and rerun tests when they change. Same as calling `vitest` without an argument. Will fallback to `vitest run` in CI or when stdin is not a TTY (non-interactive environment).

## Options for Verbose Output

### reporters

- **CLI:** `--reporter <name>`

Specify reporters (default, agent, blob, verbose, dot, json, tap, tap-flat, junit, tree, hanging-process, github-actions)

To get verbose output, use `--reporter verbose`.

### silent

- **CLI:** `--silent [value]`

Silent console output from tests. Use `'passed-only'` to see logs from failing tests only.

### printConsoleTrace

- **CLI:** `--printConsoleTrace`

Always print console stack traces

### includeTaskLocation

- **CLI:** `--includeTaskLocation`

Collect test and suite locations in the `location` property

### run

- **CLI:** `--run`

Disable watch mode

Example: `vitest run --reporter verbose`

This will run tests once with verbose reporter for detailed output.