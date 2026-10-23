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
bun run specs      # Generate native bindings and the core podspec
bun run build      # Clean output, compile TypeScript, and generate native files
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

Run the local checks from the repository root:

```bash
bun run typecheck
bun run lint-ci
bun run test
bun run test:hooks
bun run test:swift
```

These commands run the Node tests, React hook tests, and strict Swift tests with an AlarmKit SDK check.
Use the [example setup](example/README.md) for native builds and device action checks.

`ios/core` contains the Swift-only alarm implementation. It does not import Nitro or React Native.
`ios/HybridAlarmKit.swift` only connects that implementation to Nitro promises and callbacks.
Keep alarm defaults, storage, and action handling in the core.

`bun run specs` generates `AlarmKitCore.podspec.json` from `package.json`.
The JSON suffix keeps React Native's podspec search focused on `NitroAlarmkit.podspec`.
Do not edit generated podspecs or Nitrogen output by hand.

Run packed consumer checks on macOS with CocoaPods available to the selected Ruby:

```sh
bun run test:ios --linkage library
bun run test:ios --linkage static
bun run test:ios --linkage dynamic
bun run test:expo
```

The iOS checks install a fresh archive in a disposable copy of the example.
They keep Pods and build output outside this checkout. Builds use Release unless `--configuration Debug` is set.
Dynamic builds add the app registration source; static builds check automatic discovery without that source.

The pull-request workflow checks Release consumers. The publish workflow checks Debug consumers from the release commit before publication.
Both use the same reusable workflow with prebuilt React Native core and dependencies.
Set `RCT_USE_RN_DEP=1` and `RCT_USE_PREBUILT_RNCORE=1` for local consumer checks to use the same mode.
The library's native code still compiles from source. Build checks do not prove device Stop or Snooze execution.
Record device results before a release. No old-alarm migration test suite is maintained for the core split.

The Expo 58 fixture uses its default native setup. Expo can keep React Native bridge pods static while `AlarmKitCore` remains dynamic.
The check verifies the embedded core, app package reference, action definitions, and linked Nitro registration class.

Keep the example's fmt workaround while React Native 0.83 needs it with current Apple Clang.
Keep the Android prefab fixes until a clean Android build proves they are unnecessary.

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
