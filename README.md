# react-native-ios-alarmkit

React Native wrapper for iOS AlarmKit framework. Schedule alarms, timers, and countdown alerts with Live Activities on iOS 26+.

## Features

- Simple API for quick timer/alarm scheduling
- Advanced API with 1:1 native AlarmKit mapping
- React Hooks for automatic state updates
- Event listeners for real-time alarm changes
- Custom alert presentations with buttons, colors, and SF Symbols
- Live Activities support
- Silent no-op on Android and iOS < 26

## Installation

```bash
yarn add react-native-ios-alarmkit react-native-nitro-modules
```

### iOS Setup

1. Add to `ios/YourApp/Info.plist`:

```xml
<key>NSAlarmKitUsageDescription</key>
<string>This app needs to schedule alarms to remind you at important times.</string>
```

> **Required.** If missing or empty, AlarmKit cannot schedule alarms.

2. Install pods:

```bash
cd ios && pod install
```

AlarmKit only works on iOS 26+. On older versions, `AlarmKit.isSupported` returns `false` and all methods are silent no-ops. Your app can target iOS 15.1+.

### Android

No setup required. Returns `isSupported: false`.

### Expo

Requires native code. Use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) with `npx expo prebuild`.

## WIP: Widget Extension Required for Countdown

If your alarm uses countdown presentation (timer UI before alerting), you **must** implement a Widget Extension. Without it, iOS may unexpectedly dismiss alarms and fail to alert.

See [Live Activity Setup Guide](./docs/LIVE_ACTIVITY_SETUP.md).

## Usage

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
const alarmId = crypto.randomUUID()
await AlarmKit.scheduleAlarm(alarmId, {
  hour: 7,
  minute: 0,
  weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  title: 'Wake Up!',
  snoozeEnabled: true,
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

Request permission. Returns `true` if granted. If not called, AlarmKit auto-requests on first `schedule()`.

#### `AlarmKit.scheduleTimer(id: string, config: SimpleTimerConfig): Promise<void>`

Schedule a countdown timer. `id` must be a valid UUID.

#### `AlarmKit.scheduleAlarm(id: string, config: SimpleAlarmConfig): Promise<void>`

Schedule a recurring alarm. `id` must be a valid UUID.

#### `AlarmKit.cancel(id: string): Promise<void>`

Cancel a scheduled alarm.

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

#### `AlarmKit.addAlarmsListener(callback): Subscription`

Subscribe to alarm changes.

#### `AlarmKit.addAuthorizationListener(callback): Subscription`

Subscribe to authorization changes.

### Hooks

#### `useAlarms(): UseAlarmsResult`

```typescript
interface UseAlarmsResult {
  alarms: Alarm[]
  error: Error | null
  isLoading: boolean
}
```

#### `useAuthorizationState(): UseAuthorizationResult`

```typescript
interface UseAuthorizationResult {
  state: AuthorizationState
  error: Error | null
  isLoading: boolean
}
```

### Advanced API

#### `AlarmKitManager.shared`

Singleton mirroring native `AlarmManager.shared`.

Methods: `schedule`, `cancel`, `stop`, `pause`, `resume`, `countdown`, `getAlarms`, `getAuthorizationState`, `requestAuthorization`.

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

interface SimpleTimerConfig {
  duration: number // seconds
  title: string
  snoozeEnabled?: boolean
  snoozeDuration?: number // seconds, default 300
  tintColor?: string // hex color
  sound?: string // custom sound filename
}

interface SimpleAlarmConfig {
  hour: number // 0-23
  minute: number // 0-59
  weekdays?: Weekday[] // omit for daily
  title: string
  snoozeEnabled?: boolean
  snoozeDuration?: number // seconds, default 540
  tintColor?: string
  sound?: string
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

Apache 2.0
