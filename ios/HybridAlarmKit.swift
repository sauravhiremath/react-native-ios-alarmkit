import Foundation
import NitroModules

@available(iOS 26.0, *)
import AlarmKit

class HybridAlarmKit: HybridAlarmKitSpec {
  var hybridContext = margelo.nitro.HybridContext()
  
  var memorySize: Int {
    return getSizeOf(self)
  }
  
  var isSupported: Bool {
    if #available(iOS 26.0, *) {
      return true
    }
    return false
  }
  
  func getAuthorizationState() async throws -> String {
    guard #available(iOS 26.0, *) else {
      return "denied"
    }
    
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
  
  func requestAuthorization() async throws -> Bool {
    guard #available(iOS 26.0, *) else {
      return false
    }
    
    do {
      try await AlarmManager.shared.requestAuthorization()
      return AlarmManager.shared.authorizationState == .authorized
    } catch {
      return false
    }
  }
  
  func schedule(id: String, configJson: String) async throws {
    guard #available(iOS 26.0, *) else { return }
    
    guard let alarmId = UUID(uuidString: id) else {
      throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
    }
    
    let config = try parseConfiguration(configJson)
    try await AlarmManager.shared.schedule(id: alarmId, configuration: config)
  }
  
  func cancel(id: String) async throws {
    guard #available(iOS 26.0, *) else { return }
    
    guard let alarmId = UUID(uuidString: id) else {
      throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
    }
    
    try await AlarmManager.shared.cancel(id: alarmId)
  }
  
  func stop(id: String) async throws {
    guard #available(iOS 26.0, *) else { return }
    
    guard let alarmId = UUID(uuidString: id) else {
      throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
    }
    
    try await AlarmManager.shared.stop(id: alarmId)
  }
  
  func pause(id: String) async throws {
    guard #available(iOS 26.0, *) else { return }
    
    guard let alarmId = UUID(uuidString: id) else {
      throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
    }
    
    try await AlarmManager.shared.pause(id: alarmId)
  }
  
  func resume(id: String) async throws {
    guard #available(iOS 26.0, *) else { return }
    
    guard let alarmId = UUID(uuidString: id) else {
      throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
    }
    
    try await AlarmManager.shared.resume(id: alarmId)
  }
  
  func countdown(id: String) async throws {
    guard #available(iOS 26.0, *) else { return }
    
    guard let alarmId = UUID(uuidString: id) else {
      throw NSError(domain: "AlarmKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])
    }
    
    try await AlarmManager.shared.countdown(id: alarmId)
  }
  
  private var alarmListenerTasks: [String: Task<Void, Never>] = [:]
  private var authListenerTasks: [String: Task<Void, Never>] = [:]
  
  func getAlarms() async throws -> String {
    guard #available(iOS 26.0, *) else { return "[]" }
    
    var result: [AlarmData] = []
    for await alarm in AlarmManager.shared.alarms {
      result.append(encodeAlarm(alarm))
    }
    
    let encoder = JSONEncoder()
    let data = try encoder.encode(result)
    return String(data: data, encoding: .utf8) ?? "[]"
  }
  
  func addAlarmsListener(callback: @escaping (String) -> Void) -> String {
    guard #available(iOS 26.0, *) else { return "" }
    
    let subscriptionId = UUID().uuidString
    let task = Task {
      for await alarms in AlarmManager.shared.alarmUpdates {
        let encoded = encodeAlarms(alarms)
        callback(encoded)
      }
    }
    alarmListenerTasks[subscriptionId] = task
    return subscriptionId
  }
  
  func removeAlarmsListener(subscriptionId: String) {
    alarmListenerTasks[subscriptionId]?.cancel()
    alarmListenerTasks.removeValue(forKey: subscriptionId)
  }
  
  func addAuthorizationListener(callback: @escaping (String) -> Void) -> String {
    guard #available(iOS 26.0, *) else { return "" }
    
    let subscriptionId = UUID().uuidString
    let task = Task {
      for await state in AlarmManager.shared.authorizationUpdates {
        let stateString = authStateToString(state)
        callback(stateString)
      }
    }
    authListenerTasks[subscriptionId] = task
    return subscriptionId
  }
  
  func removeAuthorizationListener(subscriptionId: String) {
    authListenerTasks[subscriptionId]?.cancel()
    authListenerTasks.removeValue(forKey: subscriptionId)
  }
  
  @available(iOS 26.0, *)
  private func encodeAlarm(_ alarm: Alarm) -> AlarmData {
    return AlarmData(
      id: alarm.id.uuidString,
      state: alarmStateToString(alarm.state),
      countdownDuration: alarm.countdownDuration != nil ? CountdownDurationData(
        preAlert: Int(alarm.countdownDuration!.preAlert),
        postAlert: Int(alarm.countdownDuration!.postAlert)
      ) : nil,
      schedule: alarm.schedule != nil ? scheduleToData(alarm.schedule!) : nil
    )
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
      case .daily:
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
  private func weekdayToString(_ weekday: Alarm.Schedule.Relative.Recurrence.Weekday) -> String {
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
    
    let countdownDuration = Alarm.CountdownDuration(
      preAlert: TimeInterval(config.countdownDuration.preAlert),
      postAlert: TimeInterval(config.countdownDuration.postAlert)
    )
    
    let alertPresentation = try createAlertPresentation(config.presentation.alert)
    var presentation = AlarmPresentation(alert: alertPresentation)
    
    if let countdown = config.presentation.countdown {
      presentation.countdown = try createCountdownPresentation(countdown)
    }
    
    if let paused = config.presentation.paused {
      presentation.paused = try createPausedPresentation(paused)
    }
    
    let tintColor: Color? = config.tintColor != nil ? parseColor(config.tintColor!) : nil
    
    var attributes = AlarmAttributes<EmptyMetadata>(
      presentation: presentation,
      tintColor: tintColor ?? .blue
    )
    
    if let metadata = config.metadata {
      attributes.metadata = EmptyMetadata(metadata: metadata)
    }
    
    var alarmConfig = AlarmManager.AlarmConfiguration(
      countdownDuration: countdownDuration,
      attributes: attributes
    )
    
    if let schedule = config.schedule {
      alarmConfig.schedule = try createSchedule(schedule)
    }
    
    if let soundName = config.soundName {
      alarmConfig.sound = .named(soundName)
    }
    
    return alarmConfig
  }
  
  @available(iOS 26.0, *)
  private func createAlertPresentation(_ data: AlertPresentationData) throws -> AlarmPresentation.Alert {
    let stopButton = AlarmButton(
      text: data.stopButton.text,
      textColor: parseColor(data.stopButton.textColor),
      systemImageName: data.stopButton.systemImageName
    )
    
    var presentation = AlarmPresentation.Alert(
      title: data.title,
      stopButton: stopButton
    )
    
    if let secondaryButton = data.secondaryButton {
      let button = AlarmButton(
        text: secondaryButton.text,
        textColor: parseColor(secondaryButton.textColor),
        systemImageName: secondaryButton.systemImageName
      )
      
      let behavior: AlarmPresentation.Alert.SecondaryButtonBehavior
      if let behaviorStr = data.secondaryButtonBehavior {
        behavior = behaviorStr == "countdown" ? .countdown : .custom
      } else {
        behavior = .countdown
      }
      
      presentation.secondaryButton = button
      presentation.secondaryButtonBehavior = behavior
    }
    
    return presentation
  }
  
  @available(iOS 26.0, *)
  private func createCountdownPresentation(_ data: CountdownPresentationData) throws -> AlarmPresentation.Countdown {
    var presentation = AlarmPresentation.Countdown(title: data.title)
    
    if let pauseButton = data.pauseButton {
      presentation.pauseButton = AlarmButton(
        text: pauseButton.text,
        textColor: parseColor(pauseButton.textColor),
        systemImageName: pauseButton.systemImageName
      )
    }
    
    return presentation
  }
  
  @available(iOS 26.0, *)
  private func createPausedPresentation(_ data: PausedPresentationData) throws -> AlarmPresentation.Paused {
    var presentation = AlarmPresentation.Paused(title: data.title)
    
    if let resumeButton = data.resumeButton {
      presentation.resumeButton = AlarmButton(
        text: resumeButton.text,
        textColor: parseColor(resumeButton.textColor),
        systemImageName: resumeButton.systemImageName
      )
    }
    
    return presentation
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
      
      if let weekdays = data.weekdays {
        let days = weekdays.compactMap { weekdayString(from: $0) }
        let recurrence = Alarm.Schedule.Relative.Recurrence.weekly(days)
        return .relative(Alarm.Schedule.Relative(time: time, repeats: recurrence))
      } else {
        return .relative(Alarm.Schedule.Relative(time: time, repeats: .daily))
      }
    }
  }
  
  private func weekdayString(from string: String) -> Alarm.Schedule.Relative.Recurrence.Weekday? {
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

@available(iOS 26.0, *)
struct EmptyMetadata: AlarmMetadata {
  var metadata: [String: String]
  
  init(metadata: [String: String] = [:]) {
    self.metadata = metadata
  }
}

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

