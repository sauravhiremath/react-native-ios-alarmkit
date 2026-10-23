import Foundation
import SwiftUI

#if canImport(AlarmKit)
import AlarmKit
#endif

#if canImport(ActivityKit)
import ActivityKit
#endif

public final class AlarmKitClient: Sendable {
  public init() {}

  public var isSupported: Bool {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return true
    }
    #endif
    return false
  }

  @MainActor
  public func getAuthorizationState() -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Self.authStateToString(AlarmManager.shared.authorizationState)
    }
    #endif
    return "denied"
  }

  @MainActor
  public func requestAuthorization() async throws -> Bool {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      do {
        return try await AlarmManager.shared.requestAuthorization() == .authorized
      } catch {
        throw wrapError(error)
      }
    }
    #endif
    return false
  }

  public func schedule(id: String, configJson: String) async throws -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      let alarmId = try parseAlarmID(id)

      do {
        let config = try parseConfiguration(configJson, alarmID: id)
        let alarm = try await AlarmManager.shared.schedule(id: alarmId, configuration: config)
        return encodeAlarmToJson(alarm)
      } catch {
        throw wrapError(error)
      }
    }
    #endif
    return ""
  }

  // Idempotent cancel: pre-check via AlarmManager.shared.alarms to avoid Apple's
  // unstable "not found" native error (domain=com.apple.AlarmKit.Alarm code=0).
  // The catch block is a backstop for the TOCTOU race between pre-check and cancel.
  public func cancel(id: String) throws -> Bool {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      let alarmId = try parseAlarmID(id)

      if let alarms = try? AlarmManager.shared.alarms,
         !alarms.contains(where: { $0.id == alarmId }) {
        return false
      }

      do {
        try AlarmManager.shared.cancel(id: alarmId)
        return true
      } catch {
        let wrapped = wrapError(error)
        if AlarmKitErrors.isAlarmNotFound(wrapped) {
          return false
        }
        throw wrapped
      }
    }
    #endif
    return false
  }

  public func stop(id: String) throws {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      try performOperation(id: id) { try $0.stop(id: $1) }
    }
    #endif
  }

  public func pause(id: String) throws {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      try performOperation(id: id) { try $0.pause(id: $1) }
    }
    #endif
  }

  public func resume(id: String) throws {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      try performOperation(id: id) { try $0.resume(id: $1) }
    }
    #endif
  }

  public func countdown(id: String) throws {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      try performOperation(id: id) { try $0.countdown(id: $1) }
    }
    #endif
  }

  private let alarmListenerTasks = AlarmKitListenerTasks()
  private let authListenerTasks = AlarmKitListenerTasks()

  public func getAlarms() throws -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      do {
        let alarms = try AlarmManager.shared.alarms
        return try Self.encodeJSON(alarms.map { Self.encodeAlarm($0) })
      } catch {
        throw wrapError(error)
      }
    }
    #endif
    return "[]"
  }

  public func addAlarmsListener(callback: @escaping (String) -> Void) -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      let subscriptionId = UUID().uuidString
      let task = Task {
        for await alarms in AlarmManager.shared.alarmUpdates {
          guard !Task.isCancelled else { break }
          let encoded = AlarmKitClient.encodeAlarms(alarms)
          callback(encoded)
        }
      }
      alarmListenerTasks.insert(task, for: subscriptionId)
      return subscriptionId
    }
    #endif
    return ""
  }

  public func getPendingActionEvents() async throws -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      do {
        return try Self.encodeJSON(await AlarmActionEventStore.shared.pendingEvents())
      } catch {
        throw wrapError(error)
      }
    }
    #endif
    return "[]"
  }

  public func acknowledgeActionEvents(eventIds: [String]) async throws {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      do {
        try await AlarmActionEventStore.shared.acknowledge(eventIDs: eventIds)
      } catch {
        throw wrapError(error)
      }
    }
    #endif
  }

  public func removeAlarmsListener(subscriptionId: String) {
    alarmListenerTasks.remove(subscriptionId)
  }

  public func addAuthorizationListener(callback: @escaping (String) -> Void) -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      let subscriptionId = UUID().uuidString
      let task = Task {
        for await state in AlarmManager.shared.authorizationUpdates {
          guard !Task.isCancelled else { break }
          let stateString = AlarmKitClient.authStateToString(state)
          callback(stateString)
        }
      }
      authListenerTasks.insert(task, for: subscriptionId)
      return subscriptionId
    }
    #endif
    return ""
  }

  public func removeAuthorizationListener(subscriptionId: String) {
    authListenerTasks.remove(subscriptionId)
  }

  private func wrapError(_ error: Error, code: AlarmKitErrorCode? = nil) -> NSError {
    AlarmKitErrors.wrap(error, code: code)
  }

  #if canImport(AlarmKit)
  @available(iOS 26.0, *)
  private func performOperation(id: String, operation: (AlarmManager, UUID) throws -> Void) throws {
    let alarmID = try parseAlarmID(id)
    do {
      try operation(AlarmManager.shared, alarmID)
    } catch {
      throw wrapError(error)
    }
  }

  private func parseAlarmID(_ id: String) throws -> UUID {
    guard let value = UUID(uuidString: id) else {
      throw wrapError(
        NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"]),
        code: .invalidUUID
      )
    }
    return value
  }

  private static func encodeJSON<T: Encodable>(_ value: T) throws -> String {
    String(decoding: try JSONEncoder().encode(value), as: UTF8.self)
  }

  @available(iOS 26.0, *)
  private static func encodeAlarm(_ alarm: Alarm) -> AlarmData {
    return AlarmData(
      id: alarm.id.uuidString,
      state: alarmStateToString(alarm.state),
      countdownDuration: alarm.countdownDuration.map {
        CountdownDurationData(preAlert: Int($0.preAlert ?? 0), postAlert: Int($0.postAlert ?? 0))
      },
      schedule: alarm.schedule.map { scheduleToData($0) }
    )
  }

  @available(iOS 26.0, *)
  private func encodeAlarmToJson(_ alarm: Alarm) -> String {
    (try? Self.encodeJSON(Self.encodeAlarm(alarm))) ?? ""
  }

  @available(iOS 26.0, *)
  private static func encodeAlarms(_ alarms: [Alarm]) -> String {
    (try? encodeJSON(alarms.map { encodeAlarm($0) })) ?? "[]"
  }

  @available(iOS 26.0, *)
  private static func alarmStateToString(_ state: Alarm.State) -> String {
    switch state {
    case .scheduled: return "scheduled"
    case .countdown: return "countdown"
    case .paused: return "paused"
    case .alerting: return "alerting"
    @unknown default: return "scheduled"
    }
  }

  @available(iOS 26.0, *)
  private static func authStateToString(_ state: AlarmManager.AuthorizationState) -> String {
    switch state {
    case .notDetermined: return "notDetermined"
    case .authorized: return "authorized"
    case .denied: return "denied"
    @unknown default: return "denied"
    }
  }

  @available(iOS 26.0, *)
  private static func scheduleToData(_ schedule: Alarm.Schedule) -> AlarmScheduleData {
    switch schedule {
    case .fixed(let date):
      return AlarmScheduleData(
        type: "fixed",
        date: Int(date.timeIntervalSince1970 * 1000),
        hour: nil,
        minute: nil,
        weekdays: nil
      )
    case .relative(let relative):
      let weekdays: [String]?
      switch relative.repeats {
      case .never:
        weekdays = nil
      case .weekly(let days):
        weekdays = days.map { weekdayToString($0) }
      @unknown default:
        weekdays = nil
      }
      return AlarmScheduleData(
        type: "relative",
        date: nil,
        hour: relative.time.hour,
        minute: relative.time.minute,
        weekdays: weekdays
      )
    @unknown default:
      return AlarmScheduleData(type: "fixed", date: nil, hour: nil, minute: nil, weekdays: nil)
    }
  }

  @available(iOS 26.0, *)
  private static func weekdayToString(_ weekday: Locale.Weekday) -> String {
    switch weekday {
    case .sunday: return "sunday"
    case .monday: return "monday"
    case .tuesday: return "tuesday"
    case .wednesday: return "wednesday"
    case .thursday: return "thursday"
    case .friday: return "friday"
    case .saturday: return "saturday"
    @unknown default: return "sunday"
    }
  }

  @available(iOS 26.0, *)
  private func parseConfiguration(_ json: String, alarmID: String) throws -> AlarmManager.AlarmConfiguration<AlarmKitMetadata> {
    guard let data = json.data(using: .utf8) else {
      throw wrapError(
        NSError(domain: "AlarmKit", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"]),
        code: .invalidJSON
      )
    }

    do {
      let decoder = JSONDecoder()
      let config = try decoder.decode(AlarmConfigurationData.self, from: data)

      let preAlertValue = config.countdownDuration.preAlert > 0 ? TimeInterval(config.countdownDuration.preAlert) : nil
      let postAlertValue = config.countdownDuration.postAlert > 0 ? TimeInterval(config.countdownDuration.postAlert) : nil

      let countdownDuration: Alarm.CountdownDuration? = (preAlertValue != nil || postAlertValue != nil)
        ? Alarm.CountdownDuration(preAlert: preAlertValue, postAlert: postAlertValue)
        : nil

      let alertPresentation = createAlertPresentation(config.presentation.alert)
      var presentation = AlarmPresentation(alert: alertPresentation)

      if let countdown = config.presentation.countdown {
        presentation.countdown = createCountdownPresentation(countdown)
      }

      if let paused = config.presentation.paused {
        presentation.paused = createPausedPresentation(paused)
      }

      let tintColor = config.tintColor.map { parseColor($0) } ?? .blue

      let attributes = AlarmAttributes<AlarmKitMetadata>(
        presentation: presentation,
        metadata: AlarmKitMetadata(),
        tintColor: tintColor
      )

      let schedule = try config.schedule.map { try createSchedule($0) }

      let sound: AlertConfiguration.AlertSound = config.soundName.map { .named($0) } ?? .default

      let tracking = AlarmActionTracking.resolve(
        trackActions: config.trackActions,
        hasSecondaryButton: config.presentation.alert.secondaryButton != nil,
        secondaryButtonBehavior: config.presentation.alert.secondaryButtonBehavior
      )

      return AlarmManager.AlarmConfiguration(
        countdownDuration: countdownDuration,
        schedule: schedule,
        attributes: attributes,
        stopIntent: tracking.tracksStop ? AlarmKitStopIntent(alarmID: alarmID) : nil,
        secondaryIntent: tracking.tracksSnooze ? AlarmKitSnoozeIntent(alarmID: alarmID) : nil,
        sound: sound
      )
    } catch {
      throw wrapError(error, code: .invalidConfiguration)
    }
  }

  @available(iOS 26.0, *)
  private func createAlertPresentation(_ data: AlertPresentationData) -> AlarmPresentation.Alert {
    let secondaryButton = data.secondaryButton.map { createButton($0) }
    var secondaryButtonBehavior: AlarmPresentation.Alert.SecondaryButtonBehavior? = nil

    if secondaryButton != nil {
      secondaryButtonBehavior = data.secondaryButtonBehavior.map { $0 == "countdown" ? .countdown : .custom } ?? .countdown
    }

    return AlarmPresentation.Alert(
      title: "\(data.title)",
      stopButton: createButton(data.stopButton),
      secondaryButton: secondaryButton,
      secondaryButtonBehavior: secondaryButtonBehavior
    )
  }

  @available(iOS 26.0, *)
  private func createCountdownPresentation(_ data: CountdownPresentationData) -> AlarmPresentation.Countdown {
    return AlarmPresentation.Countdown(
      title: "\(data.title)",
      pauseButton: data.pauseButton.map { createButton($0) }
    )
  }

  @available(iOS 26.0, *)
  private func createPausedPresentation(_ data: PausedPresentationData) -> AlarmPresentation.Paused {
    let resumeButton = data.resumeButton.map { createButton($0) }
      ?? AlarmButton(
        text: "Resume",
        textColor: .blue,
        systemImageName: "play.circle"
      )

    return AlarmPresentation.Paused(
      title: "\(data.title)",
      resumeButton: resumeButton
    )
  }

  @available(iOS 26.0, *)
  private func createButton(_ data: AlarmButtonData) -> AlarmButton {
    AlarmButton(text: "\(data.text)", textColor: parseColor(data.textColor), systemImageName: data.systemImageName)
  }

  @available(iOS 26.0, *)
  private func createSchedule(_ data: AlarmScheduleData) throws -> Alarm.Schedule {
    if data.type == "fixed" {
      guard let timestamp = data.date else {
        throw wrapError(
          NSError(domain: "AlarmKit", code: 3, userInfo: [NSLocalizedDescriptionKey: "Fixed schedule requires date"]),
          code: .invalidConfiguration
        )
      }
      let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000.0)
      return .fixed(date)
    } else {
      guard let hour = data.hour, let minute = data.minute else {
        throw wrapError(
          NSError(domain: "AlarmKit", code: 4, userInfo: [NSLocalizedDescriptionKey: "Relative schedule requires hour and minute"]),
          code: .invalidConfiguration
        )
      }

      let time = Alarm.Schedule.Relative.Time(hour: hour, minute: minute)

      if let weekdays = data.weekdays, !weekdays.isEmpty {
        let days = weekdays.compactMap { weekdayFromString($0) }
        let recurrence = Alarm.Schedule.Relative.Recurrence.weekly(days)
        return .relative(Alarm.Schedule.Relative(time: time, repeats: recurrence))
      } else {
        return .relative(Alarm.Schedule.Relative(time: time, repeats: .never))
      }
    }
  }

  @available(iOS 26.0, *)
  private func weekdayFromString(_ string: String) -> Locale.Weekday? {
    switch string.lowercased() {
    case "sunday": return .sunday
    case "monday": return .monday
    case "tuesday": return .tuesday
    case "wednesday": return .wednesday
    case "thursday": return .thursday
    case "friday": return .friday
    case "saturday": return .saturday
    default: return nil
    }
  }
  #endif

  private func parseColor(_ hex: String) -> Color {
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

    var rgb: UInt64 = 0
    Scanner(string: hexSanitized).scanHexInt64(&rgb)

    let r = Double((rgb & 0xFF0000) >> 16) / 255.0
    let g = Double((rgb & 0x00FF00) >> 8) / 255.0
    let b = Double(rgb & 0x0000FF) / 255.0

    return Color(red: r, green: g, blue: b)
  }
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
public struct AlarmKitMetadata: AlarmMetadata {
  public init() {}
}
#endif

struct AlarmConfigurationData: Codable {
  let countdownDuration: CountdownDurationData
  let schedule: AlarmScheduleData?
  let presentation: AlarmPresentationData
  let tintColor: String?
  let soundName: String?
  let trackActions: Bool?
}

struct CountdownDurationData: Codable {
  let preAlert: Int
  let postAlert: Int
}

struct AlarmScheduleData: Codable {
  let type: String
  let date: Int?
  let hour: Int?
  let minute: Int?
  let weekdays: [String]?
}

struct AlarmPresentationData: Codable {
  let alert: AlertPresentationData
  let countdown: CountdownPresentationData?
  let paused: PausedPresentationData?
}

struct AlertPresentationData: Codable {
  let title: String
  let stopButton: AlarmButtonData
  let secondaryButton: AlarmButtonData?
  let secondaryButtonBehavior: String?
}

struct CountdownPresentationData: Codable {
  let title: String
  let pauseButton: AlarmButtonData?
}

struct PausedPresentationData: Codable {
  let title: String
  let resumeButton: AlarmButtonData?
}

struct AlarmButtonData: Codable {
  let text: String
  let textColor: String
  let systemImageName: String
}

struct AlarmData: Codable {
  let id: String
  let state: String
  let countdownDuration: CountdownDurationData?
  let schedule: AlarmScheduleData?
}
