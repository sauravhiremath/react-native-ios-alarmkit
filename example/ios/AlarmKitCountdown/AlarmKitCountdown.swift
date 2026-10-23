import ActivityKit
import AlarmKit
import AlarmKitCore
import SwiftUI
import WidgetKit

@main
struct AlarmKitCountdown: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: AlarmAttributes<AlarmKitMetadata>.self) { context in
      VStack {
        Text(context.attributes.presentation.alert.title)
        countdown(context.state)
      }
      .padding()
      .activityBackgroundTint(context.attributes.tintColor)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          countdown(context.state)
        }
      } compactLeading: {
        Image(systemName: "alarm")
      } compactTrailing: {
        countdown(context.state)
      } minimal: {
        Image(systemName: "alarm")
      }
    }
  }

  @ViewBuilder
  private func countdown(_ state: AlarmPresentationState) -> some View {
    switch state.mode {
    case .countdown(let value):
      Text(timerInterval: Date.now...max(Date.now, value.fireDate), countsDown: true)
        .monospacedDigit()
    case .paused:
      Text("Paused")
    case .alert:
      Text("Alarm")
    @unknown default:
      Text("Alarm")
    }
  }
}
