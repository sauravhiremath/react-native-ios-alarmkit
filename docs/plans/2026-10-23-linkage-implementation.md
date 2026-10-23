# Linkage implementation checks

This file tracks execution of `2026-10-23-linkage-and-code-cleanup.md`.
Unchecked tasks are not complete. Build checks do not prove device action execution.

## Approved changes to the plan

- Move all native alarm logic to the Swift-only `AlarmKitCore` pod. Keep a thin Nitro adapter.
- Do not add old intent-ID aliases, alarm migration code, or an upgrade compatibility test suite.
- Use focused checks with normal app settings. Do not add app-target C++ flags or dependency header patches.
- Bare apps add one local core pod entry. The Expo plugin adds that entry and the app registration source.
- Generate `AlarmKitCore.podspec.json` from the package version. Keep `NitroAlarmkit.podspec` as the only Ruby podspec for autolinking.
- Check dynamic metadata in both locations: the app package reference and the embedded core's action definitions.
- Keep Expo 58's normal bridge linkage. Its core framework is dynamic; Expo can keep React Native bridge pods static.

## Tasks

- [x] 1. Produce fresh package output.
- [x] 2. Register intents in a real dynamic consumer. Static-library Debug discovery also passes.
- [x] 3. Make Expo registration repeatable. Clean and repeated prebuilds and a Release build pass.
- [x] 4. Simplify native operations and preserve errors.
- [x] 5. Release listeners and prevent stale hook updates.
- [x] 6. Remove duplicate configuration mapping.
- [ ] 7. Example widget and controls are implemented and build. Device actions remain unchecked.
- [ ] 8. CI checks and publication dependencies are implemented. Remote workflow runs remain unchecked.
- [x] 9. Finish setup guidance and the removal review. Remaining device and workflow checks are listed below.

## Results

### Passed

- Frozen Bun install, TypeScript check, and ESLint. Browserslist reports old data; no lint annotations remain.
- All 18 Node tests. Archive checks build twice after removing a source file.
- All 14 React hook tests.
- Strict Swift error, listener-task, tracking, and event-store tests.
- Full Swift core type checking against the iOS 15.1 simulator deployment target, using Xcode 27.
- Packed React Native 0.83 consumer: static-library Debug, without app-target registration.
- Packed React Native 0.83 consumer: dynamic-framework Debug, with app-target registration.
- Packed React Native 0.83 consumer: static-framework Release, without app-target registration.
- These consumers embed the widget. The dynamic consumer embeds the core and Nitro frameworks.
- Firebase 27.0.0 with Remote Config: dynamic Debug build, native initialization call, action metadata, and Nitro registration class all compile or link successfully.
- Expo 58.0.17, React Native 0.88.0, React 19.3.0, Nitro 0.37.1: Android-only prebuild writes no iOS directory.
- The Expo consumer passes two clean iOS prebuilds, two `--no-clean` prebuilds, and a Release build.
- The Expo build contains both action definitions, the core package reference, and the Nitro registration class.
- Example `pod install` and workflow YAML parsing.
- Final dry-run archive: 71 files. Core sources, both podspecs, plugin source, declarations, and generated bindings are present. Removed-source output is absent.
- Isolated archive creation with `scripts/pack-consumer.cjs` passes. Consumer builds do not modify package output in this checkout.
- Repeated example `pod install` does not rewrite an already-patched fmt header.

### Pending or blocked

- Device Stop, Snooze, locked-state behavior, and a Firebase service call have not run.
- Android build is blocked: no Android SDK is configured.
- Xcode 26 and older iOS runtime checks have not run.
- The complete Debug/Release linkage matrix has not run locally. Focused builds passed as listed above.
- GitHub workflow runs have not run. No commit, tag, release, or publication was made.

### Removed and retained

- Removed the unused `Bridge.h`, handwritten `cpp` paths, duplicate TypeScript build, and dependency-directory cleanup.
- Removed repeated native UUID, button, authorization, and encoding work. Distinct failure policies and scheduling defaults remain.
- Removed strong listener ownership cycles and stale hook-result updates.
- Removed the widget guide's custom-metadata, App Group, and frequent-update claims.
- Removed the example's empty location permission and global C++ setting loop.
- Retained the fmt workaround for React Native 0.83 and current Apple Clang. It writes the header only when a patch is required.
- Retained Android prefab fixes because a clean Android build is blocked.
- Retained Bob because Babel still uses it.

The JavaScript API, event storage path, and event JSON format are unchanged.
Native handler and metadata type identities change with the core split. No old-alarm migration layer is included, as requested.
