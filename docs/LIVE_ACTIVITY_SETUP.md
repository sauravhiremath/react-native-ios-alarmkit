# Live Activity setup

AlarmKit requires a widget extension when an app provides a countdown presentation.
Without the extension, iOS can dismiss the countdown and fail to alert.
Timers and snooze countdowns need this setup.

## Requirements

- Build with an SDK that provides AlarmKit. Apple introduced it in Xcode 26.
- Use an iOS 26 or later device for action checks.
- Follow the core pod and action registration steps in the repository README.

The local build checks use Xcode 27. Xcode 26 and physical-device behavior need separate checks.

## Add the widget target

1. Open your app's Xcode workspace.
2. Add a Widget Extension target with Live Activity support.
3. Set the extension deployment target to iOS 26.
4. Embed the extension in the application target.
5. Remove the template widget code.
6. Copy `example/ios/AlarmKitCountdown/AlarmKitCountdown.swift` into the extension target.
7. Use `example/ios/AlarmKitCountdown/Info.plist` as the extension property list.

The example uses `AlarmAttributes<AlarmKitMetadata>` from `AlarmKitCore`.
Both the scheduler and widget use the same empty metadata type.
Do not create a second metadata type in the widget.

## Link the Swift core

Add the core pod inside the widget target in your Podfile:

```ruby
target 'YourAlarmWidget' do
  pod 'AlarmKitCore', :path => File.dirname(
    Pod::Executable.execute_command('node', ['-p', "require.resolve('react-native-ios-alarmkit/package.json')"]).strip
  )
end
```

Run `pod install` from the iOS directory.
The widget imports `AlarmKitCore`. It does not need Nitro or React Native.
Use the same CocoaPods linkage for the app and widget targets.

## Configure the app

Add these keys to the application target's property list:

```xml
<key>NSAlarmKitUsageDescription</key>
<string>Schedule alarms you create in this app.</string>
<key>NSSupportsLiveActivities</key>
<true/>
```

The widget property list declares `com.apple.widgetkit-extension` as its extension point.
This implementation does not need App Groups or frequent-update permission.
AlarmKit provides the presentation data. The widget does not read the action event file.

## Metadata limits

JavaScript still accepts the `metadata` field.
The native scheduler uses empty `AlarmKitMetadata` and does not send custom fields to the widget.
Changing the JavaScript field alone does not add native metadata support.

## Check the app

1. Build and run the application scheme, not only the widget scheme.
2. Grant alarm permission.
3. Schedule the example's five-second timer and press Stop.
4. Schedule the ten-second alarm and press Snooze.
5. Check the countdown on the Lock Screen and Dynamic Island.
6. Return to the app and read the saved actions.
7. Use **Acknowledge first** to remove one event.

Repeat the action checks with the app in the background, terminated, and locked.
A successful simulator build does not prove that iOS executes the handlers on a device.
Some system dismissal paths do not run an intent.

## References

- [Apple AlarmKit scheduling and widget requirements](https://sosumi.ai/documentation/alarmkit/scheduling-an-alarm-with-alarmkit)
- [Apple App Intents package registration](https://sosumi.ai/documentation/appintents/appintentspackage)
