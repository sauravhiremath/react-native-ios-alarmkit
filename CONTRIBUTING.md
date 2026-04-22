# Contributing

We welcome contributions! Here's how to get started.

## Setup

```bash
git clone https://github.com/sauravhiremath/react-native-ios-alarmkit.git
cd react-native-ios-alarmkit
nvm use
bun install
bun run specs
```

## Development

```bash
bun run typecheck  # Type checking
bun run lint       # ESLint
bun run specs      # Regenerate native specs after *.nitro.ts
```

## Making Changes

1. **Fork** the repo
2. **Create** a feature branch (`git checkout -b feature/awesome-feature`)
3. **Make** your changes
4. **Run** checks: `bun run typecheck && bun run lint`
5. **Commit** with clear messages
6. **Push** and open a PR

## Code Style

- Use TypeScript strict mode
- Follow existing patterns (Simple + Advanced API)
- No emojis in code
- Run `bun run lint --fix` before committing

## Testing

Test on iOS 26+ device/simulator:

```bash
cd example
bun install
cd ios && pod install && cd ..
bun run ios
```

Test on earlier versions of iOS (< 26):

- Build should not fail
- The api calls should be a no-op, w/o failures

## Pull Requests

- Keep PRs focused and small
- Update README if adding features
- Add CHANGELOG entry
- Ensure all checks pass

## Publishing package

Order matters — the tag must point at the commit that already carries the new version, otherwise CI publishes the old version number.

1. Update `version` in `package.json` and promote the `[Unreleased]` CHANGELOG section to `[X.Y.Z] - YYYY-MM-DD`
2. `git commit -am "vX.Y.Z"`
3. `git push origin master`
4. `git tag vX.Y.Z`
5. `git push origin vX.Y.Z` — this triggers `.github/workflows/publish.yml`

Or use the `/publish-release` CLAUDE skill which runs all of the above with preflight checks.

## Questions?

Open an issue or discussion.

## License

By contributing, you agree your contributions will be licensed as per the repo LICENSE
