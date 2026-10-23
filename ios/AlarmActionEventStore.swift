import Foundation
import os

enum AlarmAction: String, Codable, Sendable {
  case stop
  case snooze
}

struct AlarmActionEventData: Codable, Equatable, Sendable {
  let id: String
  let alarmId: String
  let action: AlarmAction
  let timestamp: Int64
}

extension Logger {
  static let alarmActionEvents = Logger(subsystem: "react-native-ios-alarmkit", category: "AlarmActionEvents")
}

actor AlarmActionEventStore {
  static let shared = AlarmActionEventStore()

  private static let fileVersion = 1

  private struct FileHeader: Decodable {
    let version: Int
  }

  private struct EventFile: Codable {
    let version: Int
    let events: [AlarmActionEventData]
  }

  private struct UnsupportedVersionError: Error, CustomStringConvertible {
    let version: Int

    var description: String { "Unsupported action event file version \(version)" }
  }

  private var fileURL: URL?

  init(fileURL: URL? = nil) {
    self.fileURL = fileURL
  }

  func pendingEvents() throws -> [AlarmActionEventData] {
    let url = try storageURL()
    let data: Data
    do {
      data = try Data(contentsOf: url)
    } catch CocoaError.fileReadNoSuchFile {
      return []
    }
    do {
      return try Self.decodeEvents(from: data)
    } catch {
      try moveUnreadableFile(at: url, reason: error)
      return []
    }
  }

  func record(alarmID: String, action: AlarmAction) throws {
    var events = try pendingEvents()
    events.append(AlarmActionEventData(
      id: UUID().uuidString,
      alarmId: alarmID,
      action: action,
      timestamp: Self.unixMilliseconds()
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

  private static func unixMilliseconds(_ date: Date = Date()) -> Int64 {
    Int64((date.timeIntervalSince1970 * 1000).rounded())
  }

  private static func decodeEvents(from data: Data) throws -> [AlarmActionEventData] {
    let decoder = JSONDecoder()
    let header = try decoder.decode(FileHeader.self, from: data)
    guard header.version == fileVersion else {
      throw UnsupportedVersionError(version: header.version)
    }
    return try decoder.decode(EventFile.self, from: data).events
  }

  private func moveUnreadableFile(at url: URL, reason: Error) throws {
    let name = "\(url.deletingPathExtension().lastPathComponent).corrupt-\(Self.unixMilliseconds()).\(url.pathExtension)"
    let destination = url.deletingLastPathComponent().appendingPathComponent(name)
    try FileManager.default.moveItem(at: url, to: destination)
    Logger.alarmActionEvents.error(
      "Moved unreadable action event file to \(name, privacy: .public): \(String(describing: reason), privacy: .public)"
    )
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
    let url = directory.appendingPathComponent("action-events.json")
    fileURL = url
    return url
  }

  private func save(_ events: [AlarmActionEventData]) throws {
    let data = try JSONEncoder().encode(EventFile(version: Self.fileVersion, events: events))
    let url = try storageURL()
    #if os(iOS)
    try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    #else
    try data.write(to: url, options: .atomic)
    #endif
  }
}
