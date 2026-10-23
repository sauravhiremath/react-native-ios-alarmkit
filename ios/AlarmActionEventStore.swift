import Foundation

enum AlarmAction: String, Codable, Sendable {
  case stop
  case snooze
}

struct AlarmActionEventData: Codable, Equatable, Sendable {
  let id: String
  let alarmId: String
  let action: AlarmAction
  let timestamp: Double
}

actor AlarmActionEventStore {
  static let shared = AlarmActionEventStore()

  private let fileURL: URL?

  init(fileURL: URL? = nil) {
    self.fileURL = fileURL
  }

  func pendingEvents() throws -> [AlarmActionEventData] {
    let url = try storageURL()
    do {
      return try JSONDecoder().decode([AlarmActionEventData].self, from: Data(contentsOf: url))
    } catch CocoaError.fileReadNoSuchFile {
      return []
    }
  }

  func record(alarmID: String, action: AlarmAction) throws {
    var events = try pendingEvents()
    events.append(AlarmActionEventData(
      id: UUID().uuidString,
      alarmId: alarmID,
      action: action,
      timestamp: Date().timeIntervalSince1970 * 1000
    ))
    try save(events)
  }

  func acknowledge(eventIDs: [String]) throws {
    guard !eventIDs.isEmpty else { return }
    let ids = Set(eventIDs)
    let events = try pendingEvents()
    let remaining = events.filter { !ids.contains($0.id) }
    guard remaining.count != events.count else { return }
    try save(remaining)
  }

  private func storageURL() throws -> URL {
    if let fileURL { return fileURL }
    let support = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    var directory = support.appendingPathComponent("react-native-ios-alarmkit", isDirectory: true)
    #if os(iOS)
    let attributes: [FileAttributeKey: Any] = [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
    #else
    let attributes: [FileAttributeKey: Any] = [:]
    #endif
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: attributes)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try directory.setResourceValues(values)
    return directory.appendingPathComponent("action-events.json")
  }

  private func save(_ events: [AlarmActionEventData]) throws {
    let data = try JSONEncoder().encode(events)
    let url = try storageURL()
    #if os(iOS)
    try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    #else
    try data.write(to: url, options: .atomic)
    #endif
  }
}
