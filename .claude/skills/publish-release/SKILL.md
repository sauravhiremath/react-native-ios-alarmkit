---
name: publish-release
description: Publish a new version of react-native-ios-alarmkit. Bumps package.json + CHANGELOG, tags, pushes — CI does the npm publish. Use on "publish", "release", "ship vX.Y.Z", "cut a new version".
---

# Publish release

CI (`.github/workflows/publish.yml`) publishes on `v*` tag push. This skill handles everything up to that push. Once the tag lands on origin, the publish is irreversible.

## Preflight — STOP on any failure, don't auto-fix

- `cwd` contains `package.json` + `.github/workflows/publish.yml`
- Branch is `master`
- `git status --porcelain` is empty
- `git fetch origin master && git rev-list --count HEAD..origin/master` returns `0`
- `gh run list --branch master --limit 1 --json conclusion` is `success` (warn + let user override)

## Steps

### 1. Pick version

Read `version` from `package.json`. Offer patch / minor / major bumps via `AskUserQuestion`.

Validate the answer:
- Matches `^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$`
- Strictly greater than current (semver compare, not string)
- `git rev-parse -q --verify refs/tags/v<VERSION>` fails AND `git ls-remote --tags origin v<VERSION>` is empty

On failure, re-ask. Never silently correct.

### 2. CHANGELOG.md

- `[Unreleased]` exists → rename to `[<VERSION>] - <YYYY-MM-DD>` (today's date). Happy path.
- `[<VERSION>]` already exists → confirm contents with user, skip edit.
- Neither → STOP. User must add an `[Unreleased]` section first. Never invent content.

Use Edit, not Write.

### 3. package.json

Edit the `version` line only. Preserve formatting.

### 4. Sanity checks (parallel)

- `bun run lint`
- `bun run typecheck`

Both must pass. Don't commit if either fails.

### 5. Commit

```
git add package.json CHANGELOG.md
git commit -m "v<VERSION>"
```

Never `git add -A`. Message matches repo convention (see `git log --oneline -5`).

### 6. Confirm before push

Show `git log -1 --oneline` + the tag name + the triggered workflow. `AskUserQuestion`: **Publish now** / **Cancel**. Last reversible moment.

### 7. Push — 3 separate calls, no chaining

```
git push origin master
git tag v<VERSION>
git push origin v<VERSION>
```

Hard rules: no `--force`, no `--no-verify`. If `push origin master` is rejected, STOP — someone raced you.

### 8. Report

- Tag: `https://github.com/sauravhiremath/react-native-ios-alarmkit/releases/tag/v<VERSION>`
- Actions: `https://github.com/sauravhiremath/react-native-ios-alarmkit/actions`

Say "tag pushed, CI is publishing" — not "published". CI can still fail at `npm publish`.

## Recovery

CI failed after tag push? Delete tag both sides only if user asks:

```
git push origin :refs/tags/v<VERSION>
git tag -d v<VERSION>
```

Then fix forward with a new patch version. npm rejects republishing the same version.
