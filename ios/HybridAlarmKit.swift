import Foundation
import NitroModules
import SwiftUI

#if canImport(AlarmKit)
import AlarmKit
#endif

#if canImport(ActivityKit)
import ActivityKit
#endif

class HybridAlarmKit: HybridAlarmKitSpec {
  var memorySize: Int {
    return MemoryLayout<HybridAlarmKit>.size
  }
  
  var isSupported: Bool {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return true
    }
    #endif
    return false
  }
  
  func getAuthorizationState() throws -> Promise<String> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.async {
        switch AlarmManager.shared.authorizationState {
        case .notDetermined:
          return "notDetermined"
        case .authorized:
          return "authorized"
        case .denied:
          return "denied"
        @unknown default:
          return "denied"
        }
      }
    }
    #endif
    return Promise.resolved(withResult: "denied")
  }
  
  // NOTE: requestAuthorization() is an async throwing method.
  // We use Promise.async to properly await the async operation.
  func requestAuthorization() throws -> Promise<Bool> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.async {
        do {
          let _ = try await AlarmManager.shared.requestAuthorization()
          return AlarmManager.shared.authorizationState == .authorized
        } catch {
          return false
        }
      }
    }
    #endif
    return Promise.resolved(withResult: false)
  }
  
  // NOTE: schedule(id:configuration:) is an async throwing method.
  // We use Promise.async to properly await the async operation.
  func schedule(id: String, configJson: String) throws -> Promise<String> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.async { [self] in
        guard let alarmId = UUID(uuidString: id) else {
          throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
        }
        
        let config = try self.parseConfiguration(configJson)
        let alarm = try await AlarmManager.shared.schedule(id: alarmId, configuration: config)
        return self.encodeAlarmToJson(alarm)
      }
    }
    #endif
    return Promise.resolved(withResult: "")
  }
  
  // NOTE: cancel/stop/pause/resume/countdown are synchronous (not async) methods
  // that only throw. We use Promise.parallel to run them on a background queue.
  
  func cancel(id: String) throws -> Promise<Void> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.parallel {
        guard let alarmId = UUID(uuidString: id) else {
          throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
        }
        
        try AlarmManager.shared.cancel(id: alarmId)
      }
    }
    #endif
    return Promise.resolved(withResult: ())
  }
  
  func stop(id: String) throws -> Promise<Void> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.parallel {
        guard let alarmId = UUID(uuidString: id) else {
          throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
        }
        
        try AlarmManager.shared.stop(id: alarmId)
      }
    }
    #endif
    return Promise.resolved(withResult: ())
  }
  
  func pause(id: String) throws -> Promise<Void> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.parallel {
        guard let alarmId = UUID(uuidString: id) else {
          throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
        }
        
        try AlarmManager.shared.pause(id: alarmId)
      }
    }
    #endif
    return Promise.resolved(withResult: ())
  }
  
  func resume(id: String) throws -> Promise<Void> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.parallel {
        guard let alarmId = UUID(uuidString: id) else {
          throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
        }
        
        try AlarmManager.shared.resume(id: alarmId)
      }
    }
    #endif
    return Promise.resolved(withResult: ())
  }
  
  func countdown(id: String) throws -> Promise<Void> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.parallel {
        guard let alarmId = UUID(uuidString: id) else {
          throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
        }
        
        try AlarmManager.shared.countdown(id: alarmId)
      }
    }
    #endif
    return Promise.resolved(withResult: ())
  }
  
  private var alarmListenerTasks: [String: Task<Void, Never>] = [:]
  private var authListenerTasks: [String: Task<Void, Never>] = [:]
  private let listenerLock = NSLock()
  
  // NOTE: AlarmManager.shared.alarms is a synchronous throwing property getter.
  // JSON encoding is also synchronous. We use Promise.parallel to avoid blocking.
  func getAlarms() throws -> Promise<String> {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      return Promise.parallel { [self] in
        let alarms = try AlarmManager.shared.alarms
        let result = alarms.map { self.encodeAlarm($0) }
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(result)
        return String(data: data, encoding: .utf8) ?? "[]"
      }
    }
    #endif
    return Promise.resolved(withResult: "[]")
  }
  
  func addAlarmsListener(callback: @escaping (String) -> Void) throws -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      let subscriptionId = UUID().uuidString
      let task = Task {
        for await alarms in AlarmManager.shared.alarmUpdates {
          let encoded = self.encodeAlarms(alarms)
          callback(encoded)
        }
      }
      listenerLock.lock()
      alarmListenerTasks[subscriptionId] = task
      listenerLock.unlock()
      return subscriptionId
    }
    #endif
    return ""
  }
  
  func removeAlarmsListener(subscriptionId: String) throws {
    listenerLock.lock()
    let task = alarmListenerTasks.removeValue(forKey: subscriptionId)
    listenerLock.unlock()
    task?.cancel()
  }
  
  func addAuthorizationListener(callback: @escaping (String) -> Void) throws -> String {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      let subscriptionId = UUID().uuidString
      let task = Task {
        for await state in AlarmManager.shared.authorizationUpdates {
          let stateString = self.authStateToString(state)
          callback(stateString)
        }
      }
      listenerLock.lock()
      authListenerTasks[subscriptionId] = task
      listenerLock.unlock()
      return subscriptionId
    }
    #endif
    return ""
  }
  
  func removeAuthorizationListener(subscriptionId: String) throws {
    listenerLock.lock()
    let task = authListenerTasks.removeValue(forKey: subscriptionId)
    listenerLock.unlock()
    task?.cancel()
  }
  
  // MARK: - Private Helper Methods
  
  #if canImport(AlarmKit)
  @available(iOS 26.0, *)
  private func encodeAlarm(_ alarm: Alarm) -> AlarmData {
    return AlarmData(
      id: alarm.id.uuidString,
      state: alarmStateToString(alarm.state),
      countdownDuration: alarm.countdownDuration != nil ? CountdownDurationData(
        preAlert: Int(alarm.countdownDuration!.preAlert ?? 0),
        postAlert: Int(alarm.countdownDuration!.postAlert ?? 0)
      ) : nil,
      schedule: alarm.schedule != nil ? scheduleToData(alarm.schedule!) : nil
    )
  }
  
  @available(iOS 26.0, *)
  private func encodeAlarmToJson(_ alarm: Alarm) -> String {
    let encoded = encodeAlarm(alarm)
    let encoder = JSONEncoder()
    guard let data = try? encoder.encode(encoded),
          let json = String(data: data, encoding: .utf8) else {
      return ""
    }
    return json
  }
  
  @available(iOS 26.0, *)
  private func encodeAlarms(_ alarms: [Alarm]) -> String {
    let encoded = alarms.map { encodeAlarm($0) }
    let encoder = JSONEncoder()
    guard let data = try? encoder.encode(encoded),
          let json = String(data: data, encoding: .utf8) else {
      return "[]"
    }
    return json
  }
  
  @available(iOS 26.0, *)
  private func alarmStateToString(_ state: Alarm.State) -> String {
    switch state {
    case .scheduled: return "scheduled"
    case .countdown: return "countdown"
    case .paused: return "paused"
    case .alerting: return "alerting"
    @unknown default: return "scheduled"
    }
  }
  
  @available(iOS 26.0, *)
  private func authStateToString(_ state: AlarmManager.AuthorizationState) -> String {
    switch state {
    case .notDetermined: return "notDetermined"
    case .authorized: return "authorized"
    case .denied: return "denied"
    @unknown default: return "denied"
    }
  }
  
  @available(iOS 26.0, *)
  private func scheduleToData(_ schedule: Alarm.Schedule) -> AlarmScheduleData {
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
  private func weekdayToString(_ weekday: Locale.Weekday) -> String {
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
  private func parseConfiguration(_ json: String) throws -> AlarmManager.AlarmConfiguration<EmptyMetadata> {
    guard let data = json.data(using: .utf8) else {
      throw NSError(domain: "AlarmKit", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"])
    }
    
    let decoder = JSONDecoder()
    let config = try decoder.decode(AlarmConfigurationData.self, from: data)
    
    // Create countdown duration
    let countdownDuration = Alarm.CountdownDuration(
      preAlert: TimeInterval(config.countdownDuration.preAlert),
      postAlert: TimeInterval(config.countdownDuration.postAlert)
    )
    
    // Create presentation
    let alertPresentation = try createAlertPresentation(config.presentation.alert)
    var presentation = AlarmPresentation(alert: alertPresentation)
    
    if let countdown = config.presentation.countdown {
      presentation.countdown = try createCountdownPresentation(countdown)
    }
    
    if let paused = config.presentation.paused {
      presentation.paused = try createPausedPresentation(paused)
    }
    
    // Parse tint color
    let tintColor: Color = config.tintColor != nil ? parseColor(config.tintColor!) : .blue
    
    // Create attributes with empty metadata
    let attributes = AlarmAttributes<EmptyMetadata>(
      presentation: presentation,
      metadata: EmptyMetadata(),
      tintColor: tintColor
    )
    
    // Create schedule if provided
    let schedule: Alarm.Schedule? = config.schedule != nil ? try createSchedule(config.schedule!) : nil
    
    // Parse sound - explicit type required for enum inference
    let sound: AlertConfiguration.AlertSound = config.soundName != nil ? .named(config.soundName!) : .default
    
    // Create alarm configuration with all parameters
    let alarmConfig = AlarmManager.AlarmConfiguration(
      countdownDuration: countdownDuration,
      schedule: schedule,
      attributes: attributes,
      stopIntent: nil,
      secondaryIntent: nil,
      sound: sound
    )
    
    return alarmConfig
  }
  
  @available(iOS 26.0, *)
  private func createAlertPresentation(_ data: AlertPresentationData) throws -> AlarmPresentation.Alert {
    let stopButton = AlarmButton(
      text: "\(data.stopButton.text)",
      textColor: parseColor(data.stopButton.textColor),
      systemImageName: data.stopButton.systemImageName
    )
    
    var secondaryButton: AlarmButton? = nil
    var secondaryButtonBehavior: AlarmPresentation.Alert.SecondaryButtonBehavior? = nil
    
    if let secondaryButtonData = data.secondaryButton {
      secondaryButton = AlarmButton(
        text: "\(secondaryButtonData.text)",
        textColor: parseColor(secondaryButtonData.textColor),
        systemImageName: secondaryButtonData.systemImageName
      )
      
      if let behaviorStr = data.secondaryButtonBehavior {
        secondaryButtonBehavior = behaviorStr == "countdown" ? .countdown : .custom
      } else {
        secondaryButtonBehavior = .countdown
      }
    }
    
    let presentation = AlarmPresentation.Alert(
      title: "\(data.title)",
      stopButton: stopButton,
      secondaryButton: secondaryButton,
      secondaryButtonBehavior: secondaryButtonBehavior
    )
    
    return presentation
  }
  
  @available(iOS 26.0, *)
  private func createCountdownPresentation(_ data: CountdownPresentationData) throws -> AlarmPresentation.Countdown {
    let pauseButton: AlarmButton? = data.pauseButton.map { buttonData in
      AlarmButton(
        text: "\(buttonData.text)",
        textColor: parseColor(buttonData.textColor),
        systemImageName: buttonData.systemImageName
      )
    }
    
    return AlarmPresentation.Countdown(
      title: "\(data.title)",
      pauseButton: pauseButton
    )
  }
  
  @available(iOS 26.0, *)
  private func createPausedPresentation(_ data: PausedPresentationData) throws -> AlarmPresentation.Paused {
    let resumeButton: AlarmButton
    if let buttonData = data.resumeButton {
      resumeButton = AlarmButton(
        text: "\(buttonData.text)",
        textColor: parseColor(buttonData.textColor),
        systemImageName: buttonData.systemImageName
      )
    } else {
      // Default resume button when none provided
      resumeButton = AlarmButton(
        text: "Resume",
        textColor: .blue,
        systemImageName: "play.circle"
      )
    }
    
    return AlarmPresentation.Paused(
      title: "\(data.title)",
      resumeButton: resumeButton
    )
  }
  
  @available(iOS 26.0, *)
  private func createSchedule(_ data: AlarmScheduleData) throws -> Alarm.Schedule {
    if data.type == "fixed" {
      guard let timestamp = data.date else {
        throw NSError(domain: "AlarmKit", code: 3, userInfo: [NSLocalizedDescriptionKey: "Fixed schedule requires date"])
      }
      let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000.0)
      return .fixed(date)
    } else {
      guard let hour = data.hour, let minute = data.minute else {
        throw NSError(domain: "AlarmKit", code: 4, userInfo: [NSLocalizedDescriptionKey: "Relative schedule requires hour and minute"])
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

// MARK: - EmptyMetadata

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct EmptyMetadata: AlarmMetadata {
  // Empty struct - no additional metadata needed
  // Automatically conforms to Codable, Hashable, Sendable
}
#endif

// MARK: - Codable Data Structures

struct AlarmConfigurationData: Codable {
  let countdownDuration: CountdownDurationData
  let schedule: AlarmScheduleData?
  let presentation: AlarmPresentationData
  let tintColor: String?
  let soundName: String?
  let metadata: [String: String]?
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
