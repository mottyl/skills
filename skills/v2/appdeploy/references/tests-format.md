# `tests/tests.txt` Format

Use a single file at `tests/tests.txt`.

## Required Structure

- Start with `# Tests`
- Each test starts with `## Test N - <name>`
- Exactly one test must include `[sanity]`
- Each test must include:
  - `Viewport:`
  - `Description:`
  - `Steps:`
  - `Expected:`

## Example Skeleton

```text
# Tests

## Test 1 - App loads [sanity]
Viewport: desktop
Description: Verify the app loads and shows the primary UI.

Steps:
1. Navigate to the app
2. Wait for the main screen

Expected: The main heading and primary action are visible.

## Test 2 - Primary workflow
Viewport: mobile
Description: Verify the main user workflow succeeds.

Steps:
1. Open the app
2. Perform the primary action

Expected: The expected result appears without errors.
```

## Rules

- New apps: write `tests/tests.txt` before implementation code (TDD).
- New apps: write 3-7 tests.
- Keep tests stateless.
- Exactly one test must be marked `[sanity]`.
- Use unique test data where collisions are possible.
- Prefer visible UI assertions over browser-tab title assertions.
- Updates that change visible behavior should update `tests/tests.txt`, preferably via `diffs[]`.
