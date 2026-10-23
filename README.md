# react-native-ios-alarmkit

React Native wrapper for iOS AlarmKit framework. Schedule alarms, timers, and countdown alerts with Live Activities on iOS 26+.

## Features

- Simple API for quick timer/alarm scheduling
- Advanced API with 1:1 native AlarmKit mapping
- React Hooks for automatic state updates
- Event listeners for real-time alarm changes
- Opt-in, saved stop/dismiss and snooze action events for analytics
- Custom alert presentations with buttons, colors, and SF Symbols
- Live Activities support
- Silent no-op on Android and iOS < 26

## Installation

```bash
# Using bun
bun add react-native-ios-alarmkit react-native-nitro-modules

# Using npm
npm add react-native-ios-alarmkit react-native-nitro-modules

# Using yarn
yarn add react-native-ios-alarmkit react-native-nitro-modules
```

## Demo

https://github.com/user-attachments/assets/82fa33c4-2010-416b-b385-ec9be773f7aa

## ⚙️ Configuration

> [!IMPORTANT]
>
> - Supported for both Expo & Bare (Non Expo) React Native projects.
> - AlarmKit introduced in iOS 26. On older versions, `AlarmKit.isSupported` returns `false` and all methods are silent no-ops. Your app can target iOS 15.1+.
> - **Requires physical device** - Simulator has limited support.

### iOS Setup

1. Add to `ios/YourApp/Info.plist`:

```xml
<key>NSAlarmKitUsageDescription</key>
<string>This app needs to schedule alarms to remind you at important times.</string>
```

> **Required.** If missing or empty, AlarmKit cannot schedule alarms.

2. Add the bundled Swift core inside your application target in `ios/Podfile`:

```ruby
pod 'AlarmKitCore', :path => File.dirname(
  Pod::Executable.execute_command('node', ['-p', "require.resolve('react-native-ios-alarmkit/package.json')"]).strip
)
```

React Native links `NitroAlarmkit` automatically. The core contains the alarm logic and has no Nitro dependency.
Both pods come from this npm package. No separate CocoaPods release is required.

3. Select action registration for your linkage type:

| CocoaPods linkage | App-target action registration |
| --- | --- |
| Default static libraries | No extra source file |
| Static frameworks | No extra source file |
| Dynamic frameworks | Add `plugin/AlarmKitAppIntents.swift` from the installed package to your application target |

For dynamic frameworks, copy the canonical source into your app and add it to the app's **Compile Sources** phase.
The file imports `AlarmKitCore`, not `NitroAlarmkit`. It needs no app-target C++ settings or header patches.
Do not copy the Stop or Snooze handler implementations into your app.

4. Install pods:

```bash
cd ios && pod install
```

### Android

No setup required. Returns `isSupported: false`.

### Expo

Requires native code. Use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) with `npx expo prebuild`.

Add the explicit plugin to your app configuration:

```json
{
  "expo": {
    "plugins": ["react-native-ios-alarmkit"],
    "ios": {
      "infoPlist": {
        "NSAlarmKitUsageDescription": "Schedule alarms you create in this app."
      }
    }
  }
}
```

The plugin adds the core pod and the app registration file. It does not select linkage, add permissions, or create a widget extension.
Select dynamic linkage through your app's `expo-build-properties` configuration when needed.
With Expo 58, `npx expo prebuild --platform ios` recreates native folders by default.
Use `--no-clean` to update an existing generated project. Earlier Expo versions use `--clean` for clean generation.
Preserve manual native changes before a clean prebuild.

## ⚙️ Usage

### Simple API

```typescript
import AlarmKit from 'react-native-ios-alarmkit'

// Check support
if (!AlarmKit.isSupported) {
  console.log('AlarmKit not supported')
}

// Request authorization
const authorized = await AlarmKit.requestAuthorization()

// Schedule a timer (5 minutes)
const timerId = crypto.randomUUID()
await AlarmKit.scheduleTimer(timerId, {
  duration: 300,
  title: 'Timer Done!',
  snoozeEnabled: true,
  snoozeDuration: 60,
  tintColor: '#FF6B6B',
})

// Schedule a recurring alarm
// Scheduling with same ID again - the lib first calls delete() and then creates a new one
const alarmId = crypto.randomUUID()
await AlarmKit.scheduleAlarm(alarmId, {
  hour: 7,
  minute: 0,
  weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  title: 'Wake Up!',
  snoozeEnabled: false,
  tintColor: '#4A90D9',
})

// Get all alarms
const alarms = await AlarmKit.getAlarms()

// Control alarms
await AlarmKit.cancel(timerId)
await AlarmKit.pause(timerId)
await AlarmKit.resume(timerId)
```

### React Hooks

Hooks return objects with `error` and `isLoading` states:

```typescript
import { useAlarms, useAuthorizationState } from 'react-native-ios-alarmkit'

function MyComponent() {
  const { state: authState, error: authError, isLoading: authLoading } = useAuthorizationState()
  const { alarms, error: alarmsError, isLoading: alarmsLoading } = useAlarms()

  if (authLoading || alarmsLoading) {
    return <Text>Loading...</Text>
  }

  if (authError || alarmsError) {
    return <Text>Error: {authError?.message || alarmsError?.message}</Text>
  }

  return (
    <View>
      <Text>Authorization: {authState}</Text>
      <Text>Active Alarms: {alarms.length}</Text>
      {alarms.map((alarm) => (
        <Text key={alarm.id}>
          {alarm.id} - {alarm.state}
        </Text>
      ))}
    </View>
  )
}
```

### Event Listeners

```typescript
const alarmsSub = AlarmKit.addAlarmsListener((alarms) => {
  console.log('Alarms updated:', alarms)
})

const authSub = AlarmKit.addAuthorizationListener((state) => {
  console.log('Authorization changed:', state)
})

// Cleanup
alarmsSub.remove()
authSub.remove()
```

### Alarm Action Events

Set `trackActions: true` to record stop/dismiss and snooze actions. Tracking is off by default; reschedule existing alarms to enable it. Both APIs and all configuration factories support this option.

```typescript
await AlarmKit.scheduleAlarm(alarmId, {
  hour: 7,
  minute: 0,
  title: 'Wake Up!',
  trackActions: true,
})

const events = await AlarmKit.getPendingActionEvents()
const savedIds: string[] = []
for (const event of events) {
  await saveActionToYourBackend(event)
  savedIds.push(event.id)
}
await AlarmKit.acknowledgeActionEvents(savedIds)
```

**Setup:** Build with an SDK that provides AlarmKit, introduced in Xcode 26. Follow the linkage table above.
Dynamic apps register `AlarmKitIntentsPackage` through the canonical app source. Expo apps use the explicit plugin.
Do not import `NitroAlarmkit` in `AppDelegate.swift`.

React Native Firebase 27 uses dynamic frameworks with Swift Package Manager. Keep Firebase configuration in the consuming app.
This library does not add Firebase, change Firebase flags, or select linkage.

Replace `saveActionToYourBackend` with your storage or analytics call. Read events at app start and on return to the foreground. Use `event.id` to prevent duplicate processing, and acknowledge only saved IDs. Other events remain stored until acknowledged or app data is removed; process them regularly to limit storage use.

Each event contains a unique `id`, `alarmId`, `action` (`'stop'` or `'snooze'`), and Unix `timestamp` in milliseconds. `alarmId` preserves your original string; compare it case-insensitively with the uppercase IDs from `getAlarms()`.

**Limits:**

- Stop and dismiss share `'stop'`, including stopped countdowns. An event does not prove that an alarm rang.
- Snooze requires iOS to run the countdown button's intent. Custom buttons, JavaScript control calls, and alarm state changes do not create action events.
- Native intents save events without JavaScript. Background or terminated apps get no immediate callback, and some system dismissal paths may not be recorded.
- Storage is local to the app, not shared with widgets. Before the first unlock after a restart, actions still run but are not recorded. Recording failures go to `os.Logger`, not JavaScript.
- Files with invalid data or unknown format versions are kept as `action-events.corrupt-<unix-ms>.json`. The library starts an empty event list.

Test stop/dismiss, snooze, and saved event IDs on physical devices across supported iOS versions. Cover foreground, background, terminated, and locked states, plus Apple Watch if used.

See [Apple's action intent documentation](https://sosumi.ai/documentation/alarmkit/scheduling-an-alarm-with-alarmkit).

## Widget Extension / Live Activities Requirements

A Widget Extension is **required** for the following features:

| Feature                         | Widget Extension Required? | Notes                                                                                              |
| ------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| `AlarmKit.scheduleAlarm()`      | **No**                     | Works without Widget Extension - basic alarm functionality                                         |
| `AlarmKit.scheduleTimer()`      | **Yes**                    | Timers show countdown UI in Dynamic Island, Lock Screen, and StandBy                               |
| Snooze with countdown UI        | **Yes**                    | Snooze starts a countdown; test it with an embedded widget extension                               |
| Advanced configs with countdown | **Yes**                    | Custom alarms using `AlarmKitManager.shared.schedule()` with `countdown` or `paused` presentations |

**What happens without Widget Extension:**

- `scheduleAlarm()`: Works correctly - alarms alert at scheduled time
- `scheduleTimer()`: iOS may unexpectedly dismiss timers and fail to alert
- Countdown presentations: System may not show Live Activity and dismiss alarms ([reference](https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit#Create-a-Widget-Extension-for-Live-Activities))

**For advanced configurations** with countdown presentations (pre-alert countdown, custom timers, etc.), use `AlarmKitManager.shared.schedule()` directly with full `AlarmConfiguration` and ensure your app has a Widget Extension.

See the [Live Activity Setup Guide](https://github.com/sauravhiremath/react-native-ios-alarmkit/blob/master/docs/LIVE_ACTIVITY_SETUP.md) and the example's `AlarmKitCountdown` target.
The public `metadata` input remains accepted, but the native implementation uses empty `AlarmKitMetadata`. It does not deliver custom metadata to widgets.

### Advanced API

Full control with 1:1 native AlarmKit mapping:

```typescript
import {
  AlarmKitManager,
  AlarmConfigurationFactory,
} from 'react-native-ios-alarmkit'

const config = AlarmConfigurationFactory.timer({
  duration: 300,
  attributes: {
    presentation: {
      alert: {
        title: 'Timer Done!',
        stopButton: {
          text: 'Stop',
          textColor: '#FFFFFF',
          systemImageName: 'stop.circle',
        },
        secondaryButton: {
          text: 'Snooze',
          textColor: '#FFFFFF',
          systemImageName: 'zzz',
        },
        secondaryButtonBehavior: 'countdown',
      },
      countdown: {
        title: 'Time Remaining',
        pauseButton: {
          text: 'Cancel',
          textColor: '#FF6B6B',
          systemImageName: 'xmark.circle',
        },
      },
      paused: {
        title: 'Paused',
        resumeButton: {
          text: 'Resume',
          textColor: '#4A90D9',
          systemImageName: 'play.circle',
        },
      },
    },
    tintColor: '#FF6B6B',
    metadata: {
      customKey: 'customValue',
    },
  },
  sound: 'custom-sound',
})

const id = crypto.randomUUID()
await AlarmKitManager.shared.schedule(id, config)
await AlarmKitManager.shared.countdown(id)

const alarms = await AlarmKitManager.shared.getAlarms()

// Listeners (note: method names differ from Simple API)
const sub = AlarmKitManager.shared.addAlarmUpdatesListener((alarms) => {
  console.log('Alarms updated:', alarms)
})
sub.remove()
```

## API Reference

### Simple API

#### `AlarmKit.isSupported: boolean`

`true` if AlarmKit is available (iOS 26+).

#### `AlarmKit.getAuthorizationState(): Promise<AuthorizationState>`

Returns `'notDetermined'`, `'authorized'`, or `'denied'`.

#### `AlarmKit.requestAuthorization(): Promise<boolean>`

Request permission. Returns `true` if authorized, `false` if the user denied. Throws `AlarmKitError` if the OS rejects the request (e.g. missing `NSAlarmKitUsageDescription`). Use `useAuthorizationState` hook to reactively observe the result.

#### `AlarmKit.scheduleTimer(id: string, config: SimpleTimerConfig): Promise<Alarm | null>`

Schedule a countdown timer. `id` must be a valid UUID.

#### `AlarmKit.scheduleAlarm(id: string, config: SimpleAlarmConfig): Promise<Alarm | null>`

Schedule a recurring alarm. `id` must be a valid UUID.

#### `AlarmKit.cancel(id: string): Promise<boolean>`

Cancel a scheduled alarm. **Idempotent** — cancelling an id that doesn't exist is a silent success, not an error.

- Resolves `true` if an alarm with that id existed and was cancelled.
- Resolves `false` if no alarm with that id existed (never registered, already cancelled, or removed by the OS).
- Rejects with `INVALID_UUID` if `id` is not a valid UUID.
- Rejects with a wrapped `AlarmKitError` on genuine native failures (e.g. authorization revoked mid-call).

Most consumers can ignore the return value — `await AlarmKit.cancel(id)` is safe fire-and-forget.

#### `AlarmKit.stop(id: string): Promise<void>`

Stop an alerting alarm.

#### `AlarmKit.pause(id: string): Promise<void>`

Pause a countdown.

#### `AlarmKit.resume(id: string): Promise<void>`

Resume a paused countdown.

#### `AlarmKit.countdown(id: string): Promise<void>`

Start countdown for a scheduled alarm.

#### `AlarmKit.getAlarms(): Promise<Alarm[]>`

Get all active alarms.

#### `AlarmKit.getPendingActionEvents(): Promise<AlarmActionEvent[]>`

Read saved action events without removing them. Returns `[]` on unsupported platforms. See [Alarm Action Events](#alarm-action-events) for required setup and limits.

#### `AlarmKit.acknowledgeActionEvents(eventIds: string[]): Promise<void>`

Remove only the listed event IDs after processing. Unknown IDs and empty arrays are safe no-ops. Unsupported platforms also return without changes. Storage read and write failures (for example, before the first unlock after a restart) reject with `AlarmKitError`. An event file that cannot be decoded does not cause a rejection. See the limits in [Alarm Action Events](#alarm-action-events).

#### `AlarmKit.addAlarmsListener(callback): Subscription`

Subscribe to alarm changes.

#### `AlarmKit.addAuthorizationListener(callback): Subscription`

Subscribe to authorization changes.

### Hooks

#### `useAlarms(): UseAlarmsResult`

```typescript
interface UseAlarmsResult {
  alarms: Alarm[]
  error: AlarmKitError | null
  isLoading: boolean
}
```

#### `useAuthorizationState(): UseAuthorizationResult`

```typescript
interface UseAuthorizationResult {
  state: AuthorizationState
  error: AlarmKitError | null
  isLoading: boolean
}
```

### Advanced API

#### `AlarmKitManager.shared`

Singleton mirroring native `AlarmManager.shared`.

Methods: `schedule`, `cancel`, `stop`, `pause`, `resume`, `countdown`, `getAlarms`, `getPendingActionEvents`, `acknowledgeActionEvents`, `getAuthorizationState`, `requestAuthorization`.

Convenience methods:

- `scheduleOrReschedule(id, config)` — cancels an existing alarm with the same ID (if any) then schedules a new one. Safe to call even if the alarm doesn't exist yet.

Listeners:

- `addAlarmUpdatesListener(callback)` - alarm changes
- `addAuthorizationUpdatesListener(callback)` - auth changes

### Factory Methods

#### `AlarmConfigurationFactory.timer(options): AlarmConfiguration`

Timer-only configuration.

#### `AlarmConfigurationFactory.alarm(options): AlarmConfiguration`

Alarm-only configuration.

#### `AlarmConfigurationFactory.create(options): AlarmConfiguration`

Full configuration with both countdown and schedule.

### Types

```typescript
type AuthorizationState = 'notDetermined' | 'authorized' | 'denied'

type AlarmState = 'scheduled' | 'countdown' | 'paused' | 'alerting'

type Weekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

interface Alarm {
  id: string // UUID
  state: AlarmState
  countdownDuration: CountdownDuration | null
  schedule: AlarmSchedule | null
}

type AlarmAction = 'stop' | 'snooze'

interface AlarmActionEvent {
  id: string
  alarmId: string
  action: AlarmAction
  timestamp: number
}

interface SimpleTimerConfig {
  duration: number // seconds
  title: string
  snoozeEnabled?: boolean
  snoozeDuration?: number // seconds, default 300
  tintColor?: string // hex color
  sound?: string // custom sound filename
  trackActions?: boolean
}

interface SimpleAlarmConfig {
  hour: number // 0-23
  minute: number // 0-59
  weekdays?: Weekday[] // omit for a non-repeating alarm
  title: string
  snoozeEnabled?: boolean
  snoozeDuration?: number // seconds; omitted duration maps to 0 in the Simple API
  tintColor?: string
  sound?: string
  trackActions?: boolean
}

interface AlarmButton {
  text: string
  textColor: string
  systemImageName: string
}

interface AlarmPresentation {
  alert: AlertPresentation
  countdown?: CountdownPresentation
  paused?: PausedPresentation
}

interface Subscription {
  remove: () => void
}
```

## Errors

All AlarmKit methods throw `AlarmKitError` on failure, with structured error codes for programmatic handling:

```typescript
import {
  AlarmKit,
  AlarmKitError,
  AlarmKitErrorCode,
} from 'react-native-ios-alarmkit'

try {
  await AlarmKit.scheduleTimer(id, config)
} catch (error) {
  if (error instanceof AlarmKitError) {
    console.log('Error code:', error.code)
    console.log('Error message:', error.message)
    console.log('Native error:', error.nativeError)

    if (error.code === AlarmKitErrorCode.MAXIMUM_LIMIT_REACHED) {
      console.log('Too many alarms scheduled')
    } else if (error.code === AlarmKitErrorCode.UNAUTHORIZED) {
      console.log('Permission not granted')
    }
  }
}
```

### Error Codes

| Code                    | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `INVALID_UUID`          | The alarm ID is not a valid UUID               |
| `INVALID_JSON`          | Public constant; decoding reports `INVALID_CONFIGURATION` |
| `INVALID_CONFIGURATION` | Configuration validation failed                |
| `ALARM_NOT_FOUND`       | Alarm doesn't exist (stop/pause/resume)        |
| `MAXIMUM_LIMIT_REACHED` | iOS alarm limit reached                        |
| `UNAUTHORIZED`          | User denied alarm permission                   |
| `ALARM_EXISTS`          | Alarm with this ID already exists              |
| `UNKNOWN`               | Unrecognized error from iOS                    |

### `maximumLimitReached`

iOS limits the number of scheduled alarms per app. If you hit this limit, `schedule()` throws. Cancel unused alarms before scheduling new ones.

### `Invalid UUID`

The `id` parameter must be a valid UUID string. Use `crypto.randomUUID()`.

## Platform Support

| Platform    | Support              | Notes                       |
| ----------- | -------------------- | --------------------------- |
| iOS 26+     | Full                 | All features available      |
| iOS 15.1-25 | Compiles             | `isSupported: false`, no-op |
| iOS < 15.1  | Not supported        | Library requires iOS 15.1+  |
| Android     | `isSupported: false` | No-op, no crashes           |

Your app does not need iOS 26 as minimum target. Runtime checks handle older versions.

## Example

See [example](./example) for a complete demo.

## License

MIT © [**Saurav M Hiremath**](https://sauravmh.com)
