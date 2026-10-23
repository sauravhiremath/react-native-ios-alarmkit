# Static and dynamic linkage support with code cleanup

> Language: ASD-STE100 style.

## Goal

Support static libraries, static frameworks, and dynamic frameworks without duplicate alarm implementations.
Make action tracking work with React Native Firebase 27.
Remove confirmed dead code, duplicate work, and incorrect setup instructions across the repository.
Keep changes small enough to test and maintain.

A consumer is an app that installs this library.
Linkage is how CocoaPods links library code into an app.
App Intents metadata is build data that lets iOS find an action handler.

This document is a plan, not an implementation.
Do not publish, commit, or change product code during planning.

## Acceptance criteria

1. **AC1:** All three linkage types build in Debug and Release with the same native action handlers.
2. **AC2:** Existing static apps need no new app-target registration to retain action tracking.
3. **AC3:** Dynamic apps register both handlers through Apple's supported `AppIntentsPackage` mechanism.
4. **AC4:** A consumer app runs Firebase 27 and records stop and snooze actions with dynamic frameworks.
5. **AC5:** Expo registration is repeatable and survives a clean prebuild without duplicate source references or build entries.
6. **AC6:** JavaScript exports, alarm defaults, event IDs, storage paths, and storage format remain compatible.
7. **AC7:** Native errors retain their code and native details. Listeners and hooks release resources and reject stale initial results.
8. **AC8:** A clean package build contains all required files, no removed-source output, and no missing plugin entry.
9. **AC9:** Each cleanup has a test, a verified unused reference, or a demonstrated reduction in duplicate work.
10. **AC10:** CI tests built consumers and package contents. Documentation describes only verified behavior.

Complete AC4 on physical devices. A successful simulator build does not prove action execution.
Report blocked checks as blocked. Do not count them as passed.

## Existing behavior

### Repository facts

- `package.json` reports version `0.8.0`.
- `NitroAlarmkit.podspec` does not force static linkage.
- `example/ios/Podfile` already accepts `USE_FRAMEWORKS=static` and `USE_FRAMEWORKS=dynamic`.
- `ios/AlarmActionIntents.swift` defines `AlarmKitStopIntent` and `AlarmKitSnoozeIntent`.
- Neither the library nor the example declares an `AppIntentsPackage`.
- `AlarmActionTracking.resolve` enables stop tracking and the supported countdown secondary intent.
- `AlarmActionEventStore` serializes access through one actor and writes a versioned JSON file.
- Action handlers log storage failures. They do not fail the alarm action because recording failed.
- Both JavaScript APIs use the same native module through `AlarmKitManager`.
- The pod supports iOS 15.1 builds. AlarmKit calls require iOS 26 or later.
- Android implements the unsupported-platform contract. It is not unused code.

### Confirmed cleanup targets

| Target | Evidence | Planned action |
| --- | --- | --- |
| Missing plugin | `package.json` lists `app.plugin.js`, but the file does not exist. | Supply the tested plugin in Task 3. |
| Stale build output | The package preview includes `lib/AlarmKitError.js` and its declaration. No matching source exists. | Rebuild from empty package-owned output directories. |
| Duplicate compilation | `prepublishOnly` runs `typescript`; `specs` invokes TypeScript again. | Use one package build path. |
| Empty header | `ios/Bridge.h` contains only a pragma and template text. Git reference search found no caller. | Remove after clean native builds confirm no dependency. |
| Missing C++ directory | The podspec and Android CMake file reference `cpp`, but no handwritten `cpp` directory exists. | Remove these unused source and include paths. Keep generated C++ bindings. |
| Native repetition | UUID validation, synchronous operations, authorization conversion, button creation, and JSON encoding repeat. | Share local code where behavior is identical. |
| Native error handling | Every Swift `Error` bridges to `NSError`; `wrapError` still has a separate fallback branch. Nested calls can wrap structured errors again. | Simplify bridging and preserve already-encoded errors. |
| Listener lifetime | Tasks retain `self`; `self` stores those tasks. No instance shutdown cancels all tasks. | Remove the ownership cycle and cancel stored tasks. |
| Hook ordering | Initial reads can overwrite later listener updates. Pending reads remain active after effect cleanup. | Add request-lifetime and update-order guards. |
| Factory repetition | Three option interfaces repeat attributes. Three factory methods repeat the same field mapping. | Use one internal option shape and one mapping. |
| Incomplete example test | `example/package.json` has a Jest command, but Jest and the renderer used by its test are not installed. | Replace the template smoke test with focused hook tests and declare test dependencies. |
| Invalid snooze test setup | The example enables countdown and snooze but has no widget extension target. | Add the smallest valid countdown test target. |
| Incorrect guide | The Live Activity guide says Xcode 16+, assumes App Groups, and claims custom metadata reaches widgets. | Correct requirements and remove unsupported claims. |

`metadata` is public input, but native configuration currently uses `EmptyMetadata`.
Do not remove public input fields during cleanup.
Do not advertise custom metadata delivery that the native implementation does not provide.

### Checks run during planning

- `bun run typecheck`: passed.
- `bun run lint-ci`: passed. The installed Browserslist data produced an age warning.
- `node --test tests/alarm-action-events.test.cjs`: passed, seven tests.
- Swift event-store and tracking tests: passed with complete concurrency checks and warnings as errors.
- iOS action-intent type checking: passed against the simulator SDK with deployment target iOS 15.1.
- Existing static-library Debug simulator build: passed with the installed Pods and Xcode 27.
- Extracted app data at `AlarmKitExample.app/Metadata.appintents/extract.actionsdata` contains both `NitroAlarmkit` action types.
- `npm pack --dry-run --ignore-scripts --json`: passed and exposed stale compiled files.
- `bun run test --runInBand` in `example`: failed because Jest is not installed.
- Android Debug build: blocked because this machine has no configured Android SDK.
- Xcode reports `27.0`, build `27A266a`. This does not establish Xcode 26 compatibility.

No dynamic consumer, Expo prebuild, Firebase consumer, or physical-device action test ran during planning.
The simulator build used a new output directory, but it did not reinstall Pods from a clean checkout.

## Decisions

### Native registration

1. Keep one pair of intent types and one event store for all linkage types.
2. Add public `AlarmKitIntentsPackage: AppIntentsPackage` beside the existing intent types.
3. Guard the declaration with the existing SDK checks and iOS 26 availability.
4. Give dynamic consumers one small app-target package declaration that includes `AlarmKitIntentsPackage.self`.
5. Keep this declaration outside `AppDelegate.swift`.
6. Store its canonical source at `plugin/AlarmKitAppIntents.swift`.
7. Reuse that source for manual setup, the Expo plugin, and integration tests.
8. Do not force `s.static_framework`, switch the consumer's linkage, or copy intent implementations into the app.

The app declaration imports `NitroAlarmkit`.
Nitro uses Swift/C++ interoperability.
The first consumer build must check the required app-target settings before plugin work starts.
Add only settings demonstrated necessary by that build.
Do not apply interoperability settings to all pods or all app targets.

Keep existing static discovery without app-target registration as a separate regression test.
Also test static linkage with explicit registration. This checks that optional plugin use does not duplicate intent metadata.

### Expo setup

- Use one CommonJS `app.plugin.js` entry. Do not add a separate plugin build system.
- Use Expo's Xcode project mod to add the canonical source to the application target.
- Write only the plugin-owned source file. Preserve unrelated files and targets.
- Use `createRunOncePlugin`, plus checks for existing Xcode references and source membership.
- Fail with an actionable setup error if a conflicting source file prevents safe changes.
- Require explicit plugin use for dynamic action tracking. Static users retain their existing setup.
- Do not set Firebase flags, permissions, signing, App Groups, or linkage from this plugin.
- Do not add Firebase or Expo as required runtime dependencies of the library.

### Package build

- Make `specs` generate native bindings only.
- Add one `build` command: clean package output, compile TypeScript, then generate native bindings.
- Use `prepack` to run `build` for both `npm pack` and `npm publish`.
- Remove the duplicate build from `prepublishOnly`. Do not add a second build through `prepare`.
- Keep tests outside package lifecycle scripts to prevent recursive archive tests.
- Clean `lib`, `nitrogen/generated`, and the matching TypeScript build information. Do not clean dependency directories.
- Test that a second clean build emits declarations even when an old TypeScript build-information file exists.

### Cleanup limits

- Review all handwritten code, build files, package contents, tests, and setup documents.
- Fix confirmed defects and duplicate work. Do not use line-count reduction as the success measure.
- Keep small helpers beside their callers unless a separate file provides a useful test boundary.
- Keep readable public forwarding methods. Do not build a generic dispatcher to remove simple `try/catch` blocks.
- Keep separate stop and snooze intent types. The system needs distinct actions.
- Keep the event store, tracking rules, and unsupported-platform implementations.
- Remove comments that repeat code. Keep comments that explain a real platform constraint or race.
- Never edit generated Nitrogen files by hand.
- Keep Bob while Babel uses its presets. It is not an unused dependency.
- Remove an existing build workaround only after a clean build succeeds without it.
- Do not replace the project architecture or run a repository-wide formatter.

### Version selection

Check the current upstream stable release when adding or updating a dependency or action.
Use readable release versions or ranges. Preserve lockfile integrity records.
Keep current dependency versions when this work does not require an update.
State compatibility constraints when the latest stable release cannot be used.

Registry checks during planning returned Firebase `27.0.0`, Expo `58.0.17`, and config plugins `58.0.10`.
These are observations, not permanent version pins.
Keep new consumer fixtures isolated from the existing React Native `0.83.0` example.
Match any renderer dependency to the example's React version rather than installing an incompatible renderer.

## Out of scope

- A dynamic-only release or a required migration for existing static consumers.
- New alarm APIs, automatic backend uploads, immediate background JavaScript callbacks, or broader action coverage.
- Custom metadata support, shared widget event storage, or a storage format migration.
- A Firebase dependency in the published library or the default example.
- A React Native, Android Gradle, or Ruby version migration without a demonstrated requirement.
- Removing Android support because AlarmKit itself is iOS-only.
- New service containers, base classes, generic event systems, or a separate intent pod without a proven need.
- Release publication, tagging, or automatic acceptance of untested device behavior.

## Interfaces and data flow

### Existing interfaces

Keep these contracts unchanged:

- `trackActions?: boolean`, default disabled.
- `AlarmKit.getPendingActionEvents()` and the corresponding manager method.
- `acknowledgeActionEvents(eventIds)` and acknowledgement by event ID only.
- Event fields: `id`, `alarmId`, `action`, and integer Unix `timestamp` in milliseconds.
- Action values: `stop` and `snooze`.
- `cancel(id): Promise<boolean>` and its idempotent behavior.
- Existing public option interfaces and exports.
- Existing timer, alarm, factory, and snooze defaults. Different defaults are not duplicate behavior.

The only new native consumer interface is `AlarmKitIntentsPackage`.
The only new Expo interface is the explicit package plugin entry. No plugin options are required initially.

### Action flow

1. The app schedules through either existing JavaScript API.
2. `AlarmActionTracking.resolve` selects the existing action intents.
3. Xcode exports their metadata through static discovery or explicit framework registration.
4. iOS runs the selected `LiveActivityIntent` without requiring JavaScript.
5. The existing actor saves the event in the app's existing storage location.
6. JavaScript reads pending events when the app runs again.
7. JavaScript acknowledges only processed event IDs.

No plugin code participates in event recording at runtime.

## Error behavior

- Preserve structured native errors instead of wrapping JSON error messages inside another JSON error.
- Preserve the original native domain and code when an operation fails.
- Return `INVALID_UUID` for invalid IDs and retain `INVALID_CONFIGURATION` for rejected configuration decoding.
- Keep the public `INVALID_JSON` constant. Do not redefine input classification as part of cleanup.
- Keep the existing cancel-not-found behavior and race check.
- Remove unreachable `NSError` conversion branches after adding error tests.
- Preserve pending-event read and acknowledgement failures as rejected JavaScript promises.
- Preserve intent recording failures as native logs without an action failure.
- Preserve corrupt-file recovery, unknown-file-version recovery, and pre-first-unlock limits.
- Missing dynamic registration is a setup failure. Do not claim runtime detection unless tests prove a reliable check.
- Plugin setup errors must identify the affected target or file. Do not silently skip registration.

## Test strategy

### Fast tests

Keep Node's existing test runner for API, factory, plugin, and package tests.
Extend the existing Swift runner for pure native code.
Use the example's Jest setup only for React hook lifecycle tests. Do not add another JavaScript test framework.

Add tests before each behavior change:

- Public defaults and equivalent factory output.
- Structured error preservation and malformed error fallback.
- Listener removal, instance release, repeated subscribe/unsubscribe, and cancellation.
- Hook unmount, late reads, late errors, and listener updates before initial reads finish.
- Plugin repeat execution, existing references, target selection, conflicting files, and Android-only prebuild.
- Package output after deleting a source, rebuilding twice, and regenerating from a clean checkout.
- Existing event persistence, acknowledgement, corruption recovery, and concurrent actor calls.

Use real built consumers to test metadata extraction and native module imports.
Mock tests cannot prove those properties.

### Consumer matrix

| Consumer | Linkage | Required checks |
| --- | --- | --- |
| Existing example, no explicit registration | Static library | Debug and Release builds; both intent definitions; action tests. |
| Disposable example copy, no explicit registration | Static framework | Debug and Release builds; both intent definitions; action tests. |
| Disposable example copy, explicit registration | Dynamic framework | Debug and Release builds; framework embedding; metadata; action tests. |
| Static consumer with explicit registration | Static framework | No duplicate definitions or duplicate action execution. |
| Disposable Firebase consumer | Dynamic framework | Firebase 27 initialization, an actual Firebase service call, stop and snooze persistence. |
| Disposable Expo consumer | Dynamic framework | Plugin twice; clean prebuild twice; native build; action tests. |

Use the built package archive in consumer tests, not only a source checkout.
Reuse the example and the canonical app-registration source. Do not maintain one example app per linkage type.
Use separate Pods and build-output directories for each linkage type.

Inspect the extracted App Intents metadata, not merely the presence of strings in a binary.
Check that both original intent types remain available and are not duplicated.

Test Xcode 26 and the latest stable Xcode before claiming both toolchains are supported.
Keep the iOS 15.1 compilation check. Test unsupported iOS behavior on an available older runtime.
Use a physical device if that runtime is not available locally.

### Device release gate

Test supported iOS 26 versions and the latest stable iOS with static and dynamic builds.
Cover foreground, background, terminated, and locked app states.
Test stop, supported system dismissal, snooze, repeated reads, partial acknowledgement, and app restart.
Check that one intent execution creates one event. Do not assume every dismissal path invokes an intent.
Record platform limits instead of broadening the support claim.

Use a real widget extension for countdown and snooze cases.
Do not count results from the current widget-free example as proof of reliable snooze behavior.

## Implementation tasks

Execute these tasks in order. Keep cleanup separate from linkage changes where possible.
Run the relevant tests after each task.

### Task 1: Produce fresh package output

**Result:** Package output depends only on current sources and builds once per package operation.

**Files and symbols:** `package.json`, `tsconfig.json`, `NitroAlarmkit.podspec`, `ios/Bridge.h`, `android/CMakeLists.txt`, `.gitignore`, `.npmignore`; new `tests/package.test.cjs`.

**Contract:** Preserve entry paths and generated native bindings. Do not ship tests, build caches, or missing-file entries.

**TDD:** required — reproduce stale output and missing-file references before changing package scripts.

**Test seam:** A package built in a disposable directory, including a simulated removed source file.

**Steps:**
1. Add tests for required archive files and stale compiled output.
2. Make `specs` generate native bindings without a second TypeScript compilation.
3. Add the `build` command defined above and call it from `prepack`.
4. Clean only package-owned output directories and their TypeScript build information before rebuilding.
5. Keep `clean` from deleting arbitrary files under dependency directories.
6. Remove duplicate `prepublishOnly` compilation. Do not run a second build through `prepare`.
7. Remove the empty header and nonexistent handwritten C++ paths after reference and build checks.
8. Consolidate repeated ignore entries only where their package behavior is unchanged.
9. Reserve the plugin archive checks for the real files added in Tasks 2 and 3.

**Verification:** `node --test tests/package.test.cjs`; `bun run specs`; `bun run typecheck`; `npm pack --dry-run --json`.

**Depends on:** none.

### Task 2: Register intents in a real dynamic consumer

**Result:** A dynamic consumer exposes both existing action intents. Static discovery remains automatic.

**Files and symbols:** `ios/AlarmActionIntents.swift`, `NitroAlarmkit.podspec`; new `plugin/AlarmKitAppIntents.swift`; new `scripts/verify-ios-linkage.sh`.

**Contract:** Public `AlarmKitIntentsPackage`; unchanged intent names, parameters, storage, and JavaScript APIs.

**TDD:** required — the dynamic consumer and metadata check must fail before registration is added.

**Test seam:** Built consumers with static-library, static-framework, and dynamic-framework linkage.

**Steps:**
1. Add one verification script that uses disposable consumer copies and isolated build directories.
2. Give it explicit linkage and configuration inputs. Return nonzero when a build or metadata check fails.
3. Add the library package declaration beside the existing intent types.
4. Add the canonical app-target declaration that includes the library package.
5. Compile the host import with Nitro's generated module and public headers.
6. Determine the minimum app-target interoperability settings from compiler results.
7. Keep required settings target-scoped. Do not patch generated bindings or dependency headers.
8. Verify metadata extraction in Release as well as Debug.
9. Verify static builds without the app declaration and a static build with explicit registration.
10. Stop and revise this design if direct package import cannot work without broad dependency patches.

**Verification:** `bash scripts/verify-ios-linkage.sh --linkage library --configuration Release`; repeat with `static` and `dynamic`, then all three in Debug.

**Depends on:** Task 1.

### Task 3: Make Expo registration repeatable

**Result:** An Expo user gets the same app declaration as a bare user without manual Xcode changes.

**Files and symbols:** New `app.plugin.js`, existing `plugin/AlarmKitAppIntents.swift`, `package.json`; new `tests/expo-plugin.test.cjs`.

**Contract:** The plugin changes only its application-target registration and proven required settings. Linkage remains consumer-owned.

**TDD:** required — test repeated execution, conflicting files, and target selection before adding writes.

**Test seam:** Plugin output, real Xcode project parsing, and a disposable Expo application's generated native project.

**Steps:**
1. Add the CommonJS plugin through `expo/config-plugins` and `createRunOncePlugin`.
2. Add the canonical Swift source once to the application target.
3. Apply only the app-target settings established in Task 2.
4. Keep unrelated source files, extensions, signing, permissions, and linkage unchanged.
5. Add explicit error messages for unsafe file conflicts or an absent application target.
6. Package the entry file and canonical Swift source.
7. Test two plugin executions and two prebuilds without clean generation.
8. Test clean prebuild twice in a disposable Expo application.
9. Build the generated dynamic app and inspect its intent metadata.
10. Confirm Android-only prebuild does not write iOS files.

**Verification:** `node --test tests/expo-plugin.test.cjs`; `npx expo prebuild --platform ios --clean --no-install` twice inside the disposable Expo consumer; dynamic consumer build and metadata inspection.

**Depends on:** Task 2.

### Task 4: Simplify native operations and preserve errors

**Result:** Repeated native operations use shared local code without changing their public results or execution queues.

**Files and symbols:** `ios/HybridAlarmKit.swift`: `wrapError`, `detectErrorCode`, `isAlarmNotFoundError`, UUID guards, authorization conversion, encoding, and presentation builders; `src/types.ts`; Swift and API tests.

**Contract:** Preserve public error codes, native details, cancel behavior, availability guards, and asynchronous execution choices.

**TDD:** required — add cases for structured errors, repeated wrapping, invalid input, and cancellation before refactoring.

**Test seam:** Pure error conversion through the Swift runner; built-consumer calls for native operations.

**Steps:**
1. Give native error conversion a narrow test boundary. Extract one internal file only if required for direct compilation.
2. Preserve already-encoded errors and remove the unreachable `NSError` fallback branch.
3. Share UUID parsing and synchronous operation handling within the native class.
4. Keep authorization on the main actor and scheduling asynchronous.
5. Keep cancel's not-found and race behavior separate from ordinary void operations.
6. Share identical authorization, button, and JSON conversion work without merging different failure policies.
7. Replace guarded force unwraps with optional binding or mapping.
8. Remove redundant temporaries and comments that only describe the next statement.
9. Remove the unused internal metadata decode field while retaining public metadata input compatibility.
10. Do not remove public error constants because native code does not currently emit them.

**Verification:** Existing Swift runner plus new error tests; `node --test tests/*.test.cjs`; built-consumer invalid UUID, malformed configuration, cancellation, and valid scheduling scenarios.

**Depends on:** Task 2.

### Task 5: Release listeners and prevent stale hook updates

**Result:** Listener removal and object cleanup stop tasks. Initial reads cannot overwrite newer updates or update an unmounted hook.

**Files and symbols:** `ios/HybridAlarmKit.swift`: listener tasks, task closures, removal methods, and instance cleanup; `src/hooks.ts`; `example/package.json`, `example/jest.config.js`; replace `example/__tests__/App.test.tsx` with focused hook tests.

**Contract:** Keep existing subscription and hook interfaces. Do not add runtime dependencies or a generic subscription framework.

**TDD:** required — use delayed initial reads and listener updates to reproduce ordering and cleanup defects.

**Test seam:** Real React hook tests with a controlled native-module boundary; native task cancellation and instance release tests.

**Steps:**
1. Declare the test dependencies required by the existing example test setup.
2. Add hook tests for both completion orders, late errors, cleanup, unsupported platforms, and repeated effect setup.
3. Add a small effect-lifetime and update-order guard to each hook.
4. Keep simple hook implementations unless a shared helper makes their behavior easier to read.
5. Remove strong ownership cycles from native listener tasks.
6. Cancel all remaining tasks during native instance cleanup.
7. Keep task dictionary access locked and cancel tasks outside the lock.
8. Test subscription removal without depending on immediate completion of an already-running callback.
9. Test instance release without an active stream retaining the native object.

**Verification:** `bun run test --runInBand` in `example`; native subscribe/remove/release scenarios; `bun run typecheck`; `bun run lint-ci`.

**Depends on:** Task 4.

### Task 6: Remove duplicate configuration mapping

**Result:** Configuration fields have one internal mapping while exported option names and scheduling defaults remain unchanged.

**Files and symbols:** `src/AlarmConfiguration.ts`, `src/index.ts`, `tests/alarm-action-events.test.cjs`; add factory and scheduling cases to the existing test suite.

**Contract:** Preserve factory exports, optional fields, detached method use, timer defaults, alarm defaults, and `trackActions` opt-in behavior.

**TDD:** required — snapshot field-level behavior for each factory and simple scheduling method before changing mapping.

**Test seam:** Existing transpiled-module tests and captured native configuration JSON.

**Steps:**
1. Cover sound, tint, metadata, schedule, weekdays, snooze, and tracking fields.
2. Cover disabled tracking, omitted snooze duration, and the different existing countdown defaults.
3. Define one internal attributes/options shape for the exported option interfaces.
4. Route factory field mapping through one small internal function.
5. Share simple-API alert/button construction without merging timer and alarm rules.
6. Keep readable manager forwarding methods rather than adding a generic invocation helper.
7. Confirm public declaration output does not remove or rename existing interfaces.

**Verification:** `node --test tests/alarm-action-events.test.cjs`; `bun run typecheck`; package declaration comparison.

**Depends on:** Task 1.

### Task 7: Make the example a valid action test app

**Result:** The example can demonstrate stop and snooze with the required native countdown setup.

**Files and symbols:** `example/App.tsx`, `example/ios/AlarmKitExample.xcodeproj/project.pbxproj`, application and extension property lists; new minimal widget extension files; `example/ios/Podfile`; Android build files only for proven unused settings or paths.

**Contract:** Keep the default example free of Firebase and Expo. Do not redesign its screens.

**TDD:** required for action behavior; not applicable to removal of a verified unused build entry.

**Test seam:** Real countdown presentation, stop and snooze events, clean native builds, and unsupported Android behavior.

**Steps:**
1. Add the smallest widget extension that matches the library's current empty metadata schema.
2. Use one shared widget implementation in all disposable consumers.
3. Enable only the capabilities and property-list keys required by the actual implementation.
4. Do not add App Groups when no cross-process storage is used.
5. Make the example's action controls exercise a tracked stop and a tracked snooze.
6. Verify event IDs remain stable across reads and acknowledgement removes only selected IDs.
7. Remove unused template permission entries after reference checks.
8. Check redundant global C++ settings against Nitrogen's generated settings.
9. Keep the fmt workaround while the current React Native build requires it.
10. Keep Android prefab fixes unless a clean Android build succeeds without them.
11. Build Android and confirm the unchanged unsupported-platform result contracts.

**Verification:** Consumer matrix builds; physical-device countdown/stop/snooze scenarios; `./gradlew :app:assembleDebug --console=plain` in `example/android` with a configured SDK.

**Depends on:** Tasks 2, 4, 5, and 6.

### Task 8: Enforce consumer and archive checks in CI

**Result:** CI catches metadata, package, plugin, and compatibility failures before publication.

**Files and symbols:** `.github/workflows/lint.yml`, `.github/workflows/publish.yml`, `scripts/verify-ios-linkage.sh`, package tests, and existing test commands.

**Contract:** Keep GitHub Actions as the npm publication path. Do not change package versions or publish during implementation verification.

**TDD:** required — confirm checks fail when registration or a required archive file is omitted.

**Test seam:** Fresh CI checkouts and consumers installed from the generated archive.

**Steps:**
1. Run all Node tests, focused hook tests, and strict Swift tests.
2. Build a fresh archive and install it in the integration consumers.
3. Run the three-linkage Release matrix on pull requests.
4. Run the Debug matrix before release. Inspect metadata in both configurations.
5. Add a Firebase 27 dynamic consumer profile without adding Firebase to the default example.
6. Initialize Firebase and make a real service call in its device test.
7. Test the Expo plugin's clean prebuild and generated app build.
8. Keep Firebase configuration files and credentials outside the package and logs.
9. Gate publication on archive checks and automated compatibility checks from the same release commit.
10. Reuse verification commands instead of copying build logic into multiple workflow steps.
11. Record manual device results for the release commit. Do not claim CI proves background intent execution.

**Verification:** Run the pull-request workflow and the non-publishing release checks against the same commit; complete the consumer and device matrices.

**Depends on:** Tasks 1 through 7.

### Task 9: Finish setup guidance and the removal review

**Result:** The repository contains one clear setup path per consumer type and no unexplained cleanup leftovers.

**Files and symbols:** `README.md`, `docs/LIVE_ACTIVITY_SETUP.md`, `CONTRIBUTING.md`, `example/README.md`, `CHANGELOG.md`; all changed handwritten files.

**Contract:** Documentation must match verified behavior. Historical release notes remain historical.

**TDD:** not applicable — validate instructions by following them in clean consumers.

**Test seam:** A reader installs the packed library and follows manual or Expo instructions without unpublished knowledge.

**Steps:**
1. Read each document's outline and full target section before editing.
2. Replace the static-only instructions with a short linkage/setup table.
3. Document the canonical app-registration source and proven target settings for dynamic consumers.
4. Keep the no-extra-registration path for existing static consumers.
5. Document Expo plugin use and clean prebuild behavior.
6. Correct Xcode requirements, widget requirements, and unsupported custom metadata claims.
7. Remove unnecessary App Group and frequent-update instructions when the tested example does not require them.
8. Replace generic example setup text with tested project commands and action-test steps.
9. Add an Unreleased note. Keep the original `0.8.0` restriction unchanged.
10. Search all handwritten files for unused imports, unreachable branches, duplicate helpers, stale paths, and template-only code.
11. Remove only items supported by tests or reference checks. Retest affected platforms.
12. Review the complete files, not only the diff. Remove duplicate explanations and new code with no required caller.
13. List retained workarounds with their current reason. Do not add a broad cleanup backlog to source files.

**Verification:** Clean manual and Expo setup walkthroughs; `git diff --check`; complete final verification below.

**Depends on:** Task 8.

## Final verification

### Commands

Run existing commands from the repository root unless another directory is specified:

```sh
bun install --frozen-lockfile
bun run specs
bun run typecheck
bun run lint-ci
node --test tests/*.test.cjs
npm pack --dry-run --json
git diff --check
git status --short
```

Run `bun run test --runInBand` from `example` after Task 5 repairs its test setup.
Run `./gradlew :app:assembleDebug --console=plain` from `example/android` with the Android SDK configured.

Keep the strict Swift compilation and simulator type-check commands already present in `.github/workflows/lint.yml`.
Update their source lists only for actual new native files and tests.

Task 2 introduces this verification command. It does not exist in the baseline repository:

```sh
bash scripts/verify-ios-linkage.sh --linkage library --configuration Release
bash scripts/verify-ios-linkage.sh --linkage static --configuration Release
bash scripts/verify-ios-linkage.sh --linkage dynamic --configuration Release
```

Repeat these commands with `--configuration Debug` before release.
Run the Firebase and Expo consumer scenarios from the test strategy.
Run real archive creation and consumer installation, not only dry-run packaging.

### Acceptance mapping

| Criteria | Tasks |
| --- | --- |
| AC1, AC2, AC3 | 2, 7, 8 |
| AC4 | 7, 8 |
| AC5 | 3, 8 |
| AC6 | 1, 4, 6, 7 |
| AC7 | 4, 5 |
| AC8 | 1, 3, 8 |
| AC9 | 1, 4, 5, 6, 7, 9 |
| AC10 | 8, 9 |

### Completion report

Report the following facts at implementation completion:

1. Which linkage, toolchain, configuration, and device combinations passed.
2. Which checks remain blocked and why.
3. Which files, dependencies, duplicate paths, and workarounds were removed.
4. Which workarounds remain and which current build requires them.
5. Whether archive contents match the current sources.
6. Whether static consumers need any setup changes.
7. Whether any public behavior changed beyond dynamic support and the tested correctness fixes.

Do not call this work complete while required consumer or device checks remain unverified.

### Reference sources

- [Issue 6](https://github.com/sauravhiremath/react-native-ios-alarmkit/issues/6).
- [Apple AppIntentsPackage documentation](https://sosumi.ai/documentation/appintents/appintentspackage).
- [Apple AlarmKit scheduling and widget requirements](https://sosumi.ai/documentation/alarmkit/scheduling-an-alarm-with-alarmkit).
- [React Native Firebase 27 migration](https://github.com/invertase/react-native-firebase/blob/main/docs/migrating-to-v27.mdx).
- [React Native Firebase SPM requirements](https://github.com/invertase/react-native-firebase/blob/main/docs/ios-spm.mdx).
- [Expo config-plugin development](https://github.com/expo/expo/blob/main/docs/pages/config-plugins/development-for-libraries.mdx).
- [Expo config-plugin repeat execution](https://github.com/expo/expo/blob/main/docs/pages/config-plugins/development-and-debugging.mdx).
- [Nitro generated pod settings](https://github.com/margelo/nitro/blob/main/packages/nitrogen/src/autolinking/ios/createPodspecRubyExtension.ts).
- [npm package lifecycle](https://github.com/npm/cli/blob/latest/docs/lib/content/using-npm/scripts.md).
