#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TEMP="${RUNNER_TEMP:-${TMPDIR:-/tmp}/opencode}"
mkdir -p "$TEMP"
OUTPUT="$(mktemp -d "$TEMP/alarmkit-swift-XXXXXX")"
trap 'rm -rf "$OUTPUT"' EXIT
swiftc -parse-as-library -strict-concurrency=complete -warnings-as-errors \
  ios/core/AlarmKitError.swift ios/core/AlarmKitListenerTasks.swift \
  ios/core/AlarmActionEventStore.swift ios/core/AlarmActionTracking.swift \
  tests/swift/TestRunner.swift tests/swift/AlarmKitErrorTests.swift \
  tests/swift/AlarmKitListenerTasksTests.swift tests/swift/AlarmActionTrackingTests.swift \
  tests/swift/AlarmActionEventStoreTests.swift -o "$OUTPUT/tests"
"$OUTPUT/tests"
xcrun swiftc -typecheck -strict-concurrency=complete -warnings-as-errors \
  -sdk "$(xcrun --sdk iphonesimulator --show-sdk-path)" -target arm64-apple-ios15.1-simulator \
  ios/core/*.swift
