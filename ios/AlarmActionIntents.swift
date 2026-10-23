#if canImport(AlarmKit) && canImport(AppIntents)
import AppIntents
import Foundation

@available(iOS 26.0, *)
public struct AlarmKitAppIntents: AppIntentsPackage {}

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
    try await AlarmActionEventStore.shared.record(alarmID: alarmID, action: .stop)
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
    try await AlarmActionEventStore.shared.record(alarmID: alarmID, action: .snooze)
    return .result()
  }
}
#endif
