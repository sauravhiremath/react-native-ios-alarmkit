# Live Activity Setup Guide

This guide walks you through setting up Live Activities for custom alarm countdown UI.

## Overview

When you schedule an alarm with countdown functionality, iOS displays a Live Activity on:

- Lock Screen
- Dynamic Island
- StandBy mode

By default, iOS uses a system-provided countdown UI. To customize this, you need to implement a Widget Extension in Xcode.

## Prerequisites

- iOS 26+ device or simulator
- Xcode 16+
- Understanding of SwiftUI basics

## Step 1: Add Widget Extension Target

1. Open your project in Xcode: `open ios/YourApp.xcodeproj`

2. Click **File** > **New** > **Target**

3. Select **Widget Extension**, click **Next**

4. Configure the extension:
   - Product Name: `AlarmKitWidget`
   - Include Live Activity: **Yes** (check the box)
   - Language: Swift
   - Project: YourApp
   - Embed in Application: YourApp

5. Click **Finish**

6. When prompted to activate the scheme, click **Activate**

## Step 2: Configure App Groups

Live Activities need to share data between your app and the widget extension.

1. Select your main app target

2. Go to **Signing & Capabilities**

3. Click **+ Capability** and add **App Groups**

4. Click **+** to add a new app group: `group.com.yourcompany.yourapp.alarmkit`

5. Repeat for the **AlarmKitWidget** target

## Step 3: Implement Live Activity

Replace the content of `ios/AlarmKitWidget/AlarmKitWidgetLiveActivity.swift`:

```swift
import ActivityKit
import WidgetKit
import SwiftUI
import AlarmKit

struct AlarmLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: AlarmAttributes<EmptyMetadata>.self) { context in
      lockScreenView(context)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "alarm")
            .foregroundColor(context.attributes.tintColor)
        }

        DynamicIslandExpandedRegion(.trailing) {
          Text(context.state.mode == .countdown ? "Countdown" : "Paused")
            .font(.caption)
        }

        DynamicIslandExpandedRegion(.center) {
          countdownText(context)
        }

        DynamicIslandExpandedRegion(.bottom) {
          if context.state.mode == .countdown {
            Text("Tap to pause")
              .font(.caption2)
              .foregroundColor(.secondary)
          }
        }
      } compactLeading: {
        Image(systemName: "alarm")
          .foregroundColor(context.attributes.tintColor)
      } compactTrailing: {
        Text(timeRemaining(context))
          .font(.caption2)
          .monospacedDigit()
      } minimal: {
        Image(systemName: "alarm")
          .foregroundColor(context.attributes.tintColor)
      }
    }
  }

  @ViewBuilder
  func lockScreenView(_ context: ActivityViewContext<AlarmAttributes<EmptyMetadata>>) -> some View {
    VStack(spacing: 12) {
      HStack {
        Image(systemName: "alarm")
          .foregroundColor(context.attributes.tintColor)

        Text(context.attributes.presentation.alert.title)
          .font(.headline)
          .foregroundColor(context.attributes.tintColor)
      }

      countdownText(context)
        .font(.title)
        .monospacedDigit()
        .foregroundColor(context.attributes.tintColor)

      if context.state.mode == .paused {
        Text("Paused")
          .font(.caption)
          .foregroundColor(.secondary)
      }
    }
    .padding()
  }

  @ViewBuilder
  func countdownText(_ context: ActivityViewContext<AlarmAttributes<EmptyMetadata>>) -> some View {
    if let date = context.state.date {
      Text(timerInterval: date...Date.now, countsDown: false)
        .multilineTextAlignment(.center)
    } else {
      Text("--:--")
    }
  }

  func timeRemaining(_ context: ActivityViewContext<AlarmAttributes<EmptyMetadata>>) -> String {
    guard let date = context.state.date else { return "--:--" }
    let interval = date.timeIntervalSince(Date.now)
    let minutes = Int(interval) / 60
    let seconds = Int(interval) % 60
    return String(format: "%02d:%02d", minutes, seconds)
  }
}

struct EmptyMetadata: AlarmMetadata {}
```

## Step 4: Update Info.plist

Add the following to `ios/AlarmKitWidget/Info.plist`:

```xml
<key>NSSupportsLiveActivities</key>
<true/>
<key>NSSupportsLiveActivitiesFrequentUpdates</key>
<true/>
```

## Step 5: Build and Test

1. Select the **AlarmKitWidget** scheme in Xcode

2. Run on a device or simulator (iOS 26+)

3. In your React Native app, schedule an alarm with countdown functionality

4. The countdown should appear with your custom UI on the Lock Screen and in the Dynamic Island

## Customization

### Using Custom Metadata

You can pass custom data to your Live Activity:

**TypeScript:**

```typescript
const id = crypto.randomUUID()
await AlarmKitManager.shared.schedule(id, {
  countdownDuration: {
    preAlert: 600,
    postAlert: 300,
  },
  presentation: { ... },
  metadata: {
    iconName: 'flame',
    recipeName: 'Pizza',
  },
})
```

**Swift:**

```swift
struct CookingMetadata: AlarmMetadata {
  let iconName: String
  let recipeName: String
}

struct AlarmLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: AlarmAttributes<CookingMetadata>.self) { context in
      VStack {
        Image(systemName: context.attributes.metadata?.iconName ?? "alarm")
        Text(context.attributes.metadata?.recipeName ?? "Alarm")
      }
    } dynamicIsland: {  }
  }
}
```

### Styling Tips

- Use `context.attributes.tintColor` for consistent branding
- Keep text concise for the Dynamic Island
- Test on different iPhone models (different Dynamic Island sizes)
- Use SF Symbols for icons

## Troubleshooting

### Live Activity doesn't appear

- Ensure iOS 26+ is running
- Check that App Groups are configured correctly
- Verify Widget Extension is embedded in the app
- Check Xcode console for error messages

### Device reboots

After a device restart, Live Activities cannot be shown until the device is unlocked. The system will use the default countdown presentation configured in your `AlarmConfiguration`.

## Additional Resources

- [AlarmKit Documentation](https://developer.apple.com/documentation/alarmkit)
- [ActivityKit Documentation](https://developer.apple.com/documentation/activitykit)
- [Human Interface Guidelines: Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
