# react-native-ios-alarmkit

React Native wrapper for iOS AlarmKit framework. Create and manage alarms, timers, and countdown alerts with Live Activities on iOS 26+.

## Features

- **Simple API** for quick timer/alarm scheduling
- **Advanced API** with 1-1 native AlarmKit mapping
- **React Hooks** for automatic state updates
- **Event Listeners** for real-time alarm changes
- Schedule alarms with fixed dates or recurring schedules
- Countdown timers with custom durations
- Custom alert presentations with buttons, colors, and SF Symbols
- Live Activities support for countdown UI
- Silent no-op on Android and iOS < 26

## Installation

```bash
yarn add react-native-ios-alarmkit react-native-nitro-modules
```

### iOS Setup

1. Add the AlarmKit usage description to your `ios/YourApp/Info.plist`:

```xml
<key>NSAlarmKitUsageDescription</key>
<string>This app needs to schedule alarms to remind you at important times.</string>
```

2. Install pods:

```bash
cd ios && pod install
```

**Note:** AlarmKit features only work on iOS 26+. On older iOS versions, `AlarmKit.isSupported` returns `false` and all methods are silent no-ops. Your app can target any iOS version (iOS 15.1+) - the library handles version detection automatically.

### Android

No additional setup required. The library will return `isSupported: false` on Android.

## Usage

### Simple API (Recommended for Most Users)

The simple API provides easy-to-use methods for common use cases:

```typescript
import AlarmKit from 'react-native-ios-alarmkit'

if (!AlarmKit.isSupported) {
  console.log('AlarmKit not supported on this platform')
}

const authorized = await AlarmKit.requestAuthorization()

await AlarmKit.scheduleTimer('my-timer', {
  duration: 300,
  title: 'Timer Done!',
  snoozeEnabled: true,
  snoozeDuration: 60,
  tintColor: '#FF6B6B',
})

await AlarmKit.scheduleAlarm('wake-up', {
  hour: 7,
  minute: 0,
  weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  title: 'Wake Up!',
  snoozeEnabled: true,
  tintColor: '#4A90D9',
})

const alarms = await AlarmKit.getAlarms()

await AlarmKit.cancel('my-timer')
await AlarmKit.pause('my-timer')
await AlarmKit.resume('my-timer')
```

### React Hooks

Use hooks for automatic state updates:

```typescript
import { useAlarms, useAuthorizationState } from 'react-native-ios-alarmkit'

function MyComponent() {
  const authState = useAuthorizationState()
  const alarms = useAlarms()

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

Subscribe to alarm and authorization changes:

```typescript
const alarmsSub = AlarmKit.addAlarmsListener((alarms) => {
  console.log('Alarms updated:', alarms)
})

const authSub = AlarmKit.addAuthorizationListener((state) => {
  console.log('Authorization changed:', state)
})

alarmsSub.remove()
authSub.remove()
```

### Advanced API (Full Native Mapping)

For power users who need full control, use the advanced API that mirrors native AlarmKit exactly:

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

await AlarmKitManager.shared.schedule('my-alarm', config)
await AlarmKitManager.shared.countdown('my-alarm')

const alarms = await AlarmKitManager.shared.getAlarms()

const sub = AlarmKitManager.shared.addAlarmUpdatesListener((alarms) => {
  console.log('Alarms updated:', alarms)
})
sub.remove()
```

## API Reference

### Simple API

#### `AlarmKit.isSupported: boolean`

Returns `true` if AlarmKit is supported on the current device (iOS 26+).

#### `AlarmKit.getAuthorizationState(): Promise<AuthorizationState>`

Returns the current authorization state: `'notDetermined'`, `'authorized'`, or `'denied'`.

#### `AlarmKit.requestAuthorization(): Promise<boolean>`

Requests user authorization to schedule alarms. Returns `true` if granted.

#### `AlarmKit.scheduleTimer(id: string, config: SimpleTimerConfig): Promise<void>`

Schedules a countdown timer.

**SimpleTimerConfig:**

- `duration: number` - Duration in seconds
- `title: string` - Title shown when timer fires
- `snoozeEnabled?: boolean` - Enable snooze button
- `snoozeDuration?: number` - Snooze duration in seconds (default: 300)
- `tintColor?: string` - Hex color for UI
- `sound?: string` - Custom sound filename

#### `AlarmKit.scheduleAlarm(id: string, config: SimpleAlarmConfig): Promise<void>`

Schedules a recurring alarm.

**SimpleAlarmConfig:**

- `hour: number` - Hour (0-23)
- `minute: number` - Minute (0-59)
- `weekdays?: Weekday[]` - Days to repeat (omit for daily)
- `title: string` - Title shown when alarm fires
- `snoozeEnabled?: boolean` - Enable snooze button
- `snoozeDuration?: number` - Snooze duration in seconds (default: 540)
- `tintColor?: string` - Hex color for UI
- `sound?: string` - Custom sound filename

#### `AlarmKit.cancel(id: string): Promise<void>`

Cancels a scheduled alarm.

#### `AlarmKit.stop(id: string): Promise<void>`

Stops an alerting alarm.

#### `AlarmKit.pause(id: string): Promise<void>`

Pauses an alarm countdown.

#### `AlarmKit.resume(id: string): Promise<void>`

Resumes a paused alarm countdown.

#### `AlarmKit.countdown(id: string): Promise<void>`

Starts countdown for a scheduled alarm.

#### `AlarmKit.getAlarms(): Promise<Alarm[]>`

Returns all active alarms with their current state.

#### `AlarmKit.addAlarmsListener(callback: (alarms: Alarm[]) => void): Subscription`

Subscribes to alarm changes. Returns subscription with `remove()` method.

#### `AlarmKit.addAuthorizationListener(callback: (state: AuthorizationState) => void): Subscription`

Subscribes to authorization state changes.

### Advanced API

#### `AlarmKitManager.shared`

Singleton instance mirroring native `AlarmManager.shared`.

All methods from Simple API are available, plus:

#### `AlarmKitManager.shared.addAlarmUpdatesListener(callback: (alarms: Alarm[]) => void): Subscription`

Stream of alarm updates (mirrors native `alarmUpdates` AsyncSequence).

#### `AlarmKitManager.shared.addAuthorizationUpdatesListener(callback: (state: AuthorizationState) => void): Subscription`

Stream of authorization updates (mirrors native `authorizationUpdates` AsyncSequence).

### Factory Methods

#### `AlarmConfigurationFactory.timer(options: TimerOptions): AlarmConfiguration`

Creates a timer-only configuration.

#### `AlarmConfigurationFactory.alarm(options: AlarmOptions): AlarmConfiguration`

Creates an alarm-only configuration.

#### `AlarmConfigurationFactory.create(options: FullOptions): AlarmConfiguration`

Creates a full configuration with both countdown and schedule.

### Types

```typescript
type AlarmState = 'scheduled' | 'countdown' | 'paused' | 'alerting'

interface Alarm {
  id: string
  state: AlarmState
  countdownDuration: CountdownDuration | null
  schedule: AlarmSchedule | null
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

type Weekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
```

## Live Activities

To display custom countdown UI with Live Activities, you need to implement a Widget Extension in Xcode. See the [Live Activity Setup Guide](./docs/LIVE_ACTIVITY_SETUP.md) for detailed instructions.

## Error Handling

All methods may throw `AlarmKitError`:

```typescript
import { AlarmKitError } from 'react-native-ios-alarmkit'

try {
  await AlarmKit.scheduleTimer('id', config)
} catch (error) {
  if (error instanceof AlarmKitError) {
    console.error('AlarmKit error:', error.message)
  }
}
```

## Platform Support

| Platform    | Support                      | Notes                                       |
| ----------- | ---------------------------- | ------------------------------------------- |
| iOS 26+     | Full support                 | All AlarmKit features available             |
| iOS 15.1-25 | Compiles successfully        | Returns `isSupported: false`, methods no-op |
| iOS < 15.1  | Not supported                | Library requires iOS 15.1+                  |
| Android     | Returns `isSupported: false` | Methods no-op, no crashes                   |

**Your app does not need iOS 26 as minimum deployment target.** The library uses runtime checks (`@available(iOS 26.0, *)`) to gracefully handle older iOS versions.

## Example

See the [example](./example) directory for a complete demo app showcasing:

- Simple and advanced APIs
- React hooks
- Event listeners
- Live alarm management

## License

MIT
