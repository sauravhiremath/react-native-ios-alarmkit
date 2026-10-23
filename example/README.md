# AlarmKit example

This app uses React Native 0.83 and the local library source.
It includes the `AlarmKitCountdown` widget extension and uses the bare React Native setup.

## Setup

From the repository root:

```sh
bun install --frozen-lockfile
bun run specs
```

From `example/ios`, run `pod install` with a Ruby installation that provides CocoaPods.
The Podfile links the bundled Swift core into the app and widget.

From `example`, start Metro with `bun run start`.
Open `ios/AlarmKitExample.xcworkspace`, select the application scheme, and run it on your device.
Set your development team for both targets before a device build.

## Action checks

1. Grant alarm permission.
2. Schedule the five-second timer, then press its system Stop button.
3. Schedule the ten-second alarm, then press its system Snooze button.
4. Return to the app and refresh the action list.
5. Refresh again. Existing events must retain their IDs.
6. Press **Acknowledge first**. Only the first event must disappear.

Use physical devices to check background, terminated, and locked states.
The app reads events when it returns to the foreground. It does not receive immediate background JavaScript callbacks.

## Local checks

Run test commands from the repository root.
See [Testing](../CONTRIBUTING.md#testing) for JavaScript, hook, Swift, and packed consumer checks.

## Android

With an Android SDK configured, run `bun run android` from `example`.
AlarmKit remains unsupported. The public methods retain their no-op results.
