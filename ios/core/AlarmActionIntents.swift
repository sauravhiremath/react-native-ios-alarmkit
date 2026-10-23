#if canImport(AlarmKit) && canImport(AppIntents)
import AppIntents
import Foundation
import os

@available(iOS 26.0, *)
public struct AlarmKitIntentsPackage: AppIntentsPackage {}

@available(iOS 26.0, *)
public struct AlarmKitStopIntent: LiveActivityIntent {
  public static let title: LocalizedStringResource = "Record alarm stop"
  public static let isDiscoverable = false
  public static let openAppWhenRun = false

  @Parameter(title: "Alarm ID")
  public var alarmID: String

  public init() {}

  init(alarmID: String) {
    self.alarmID = alarmID
  }

  public func perform() async throws -> some IntentResult {
    await recordAlarmAction(.stop, alarmID: alarmID)
    return .result()
  }
}

@available(iOS 26.0, *)
public struct AlarmKitSnoozeIntent: LiveActivityIntent {
  public static let title: LocalizedStringResource = "Record alarm snooze"
  public static let isDiscoverable = false
  public static let openAppWhenRun = false

  @Parameter(title: "Alarm ID")
  public var alarmID: String

  public init() {}

  init(alarmID: String) {
    self.alarmID = alarmID
  }

  public func perform() async throws -> some IntentResult {
    await recordAlarmAction(.snooze, alarmID: alarmID)
    return .result()
  }
}

private func recordAlarmAction(_ action: AlarmAction, alarmID: String) async {
  do {
    try await AlarmActionEventStore.shared.record(alarmID: alarmID, action: action)
  } catch {
    Logger.alarmActionEvents.error(
      "Could not record \(action.rawValue, privacy: .public) for alarm \(alarmID, privacy: .private(mask: .hash)): \(String(describing: error), privacy: .public)"
    )
  }
}
#endif
