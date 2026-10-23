import Foundation

enum AlarmActionEventStoreTests {
  static func run() async throws {
    try await withTemporaryDirectory(lifecycle)
    try await withTemporaryDirectory(corruptFile)
    try await withTemporaryDirectory(unsupportedVersion)
    try await withTemporaryDirectory(unreadableFile)
    try await withTemporaryDirectory(writeFailure)
  }

  private static func lifecycle(in directory: URL) async throws {
    let fileURL = directory.appendingPathComponent("events.json")
    let store = AlarmActionEventStore(fileURL: fileURL)

    let empty = try await store.pendingEvents()
    try expect(empty.isEmpty, "A new store must be empty")
    try await store.acknowledge(eventIDs: ["unknown"])

    let before = Int64((Date().timeIntervalSince1970 * 1000).rounded(.down))
    try await store.record(alarmID: "alarm-1", action: .stop)
    try await store.record(alarmID: "alarm-1", action: .snooze)
    let after = Int64((Date().timeIntervalSince1970 * 1000).rounded(.up))
    let events = try await store.pendingEvents()
    try expect(events.count == 2, "Stop and snooze must each create an event")
    try expect(events[0].alarmId == "alarm-1" && events[0].action == .stop, "Stop must retain the alarm ID")
    try expect(events[1].action == .snooze, "Snooze must retain its action")
    try expect(events[0].id != events[1].id, "Each event must have a unique ID")
    try expect(
      events.allSatisfy { (before...after).contains($0.timestamp) },
      "Timestamps must use Unix milliseconds"
    )
    let text = String(decoding: try Data(contentsOf: fileURL), as: UTF8.self)
    let timestampCount = try matchCount(of: "\"timestamp\":", in: text)
    let integerTimestampCount = try matchCount(of: "\"timestamp\":[0-9]+[,}]", in: text)
    try expect(
      timestampCount == 2 && integerTimestampCount == timestampCount,
      "Timestamps must be stored as integers"
    )
    let repeatedRead = try await store.pendingEvents()
    try expect(repeatedRead == events, "Reads must not consume events")

    let reopened = AlarmActionEventStore(fileURL: fileURL)
    let persisted = try await reopened.pendingEvents()
    try expect(persisted == events, "Events must survive store recreation")

    try await store.record(alarmID: "alarm-2", action: .stop)
    try await store.acknowledge(eventIDs: [events[0].id, "unknown", events[0].id])
    try await store.acknowledge(eventIDs: [events[0].id])
    let remaining = try await store.pendingEvents()
    try expect(remaining.count == 2, "Acknowledgement must preserve other and newer events")
    try expect(remaining[0].id == events[1].id, "Acknowledgement must remove only the requested IDs")
    try await store.acknowledge(eventIDs: [])
    let afterEmptyAcknowledgement = try await store.pendingEvents()
    try expect(afterEmptyAcknowledgement == remaining, "Empty acknowledgement must not clear history")

    try await withThrowingTaskGroup(of: Void.self) { group in
      for index in 0..<50 {
        group.addTask {
          try await store.record(alarmID: "concurrent-\(index)", action: .stop)
        }
      }
      group.addTask {
        try await store.acknowledge(eventIDs: [remaining[0].id])
      }
      try await group.waitForAll()
    }
    let concurrent = try await store.pendingEvents()
    try expect(concurrent.count == 51, "Concurrent writes and acknowledgement must not lose events")
    try expect(Set(concurrent.map(\.id)).count == 51, "Concurrent events must have unique IDs")

    let json = try JSONSerialization.jsonObject(with: Data(contentsOf: fileURL)) as? [String: Any]
    try expect(json?["version"] as? Int == 1, "Stored JSON must use a versioned envelope")
    let storedEvents = json?["events"] as? [[String: Any]]
    try expect(storedEvents?.first?["alarmId"] as? String == "alarm-2", "Stored JSON must use the public event fields")
    try expect(storedEvents?.first?["action"] as? String == "stop", "Actions must use their string values")

    try await store.acknowledge(eventIDs: concurrent.map(\.id))
    let cleared = try await reopened.pendingEvents()
    try expect(cleared.isEmpty, "Acknowledgement must persist across store recreation")
  }

  private static func corruptFile(in directory: URL) async throws {
    let fileURL = directory.appendingPathComponent("events.json")
    let corruptData = Data("invalid".utf8)
    try corruptData.write(to: fileURL)
    let store = AlarmActionEventStore(fileURL: fileURL)

    try await store.record(alarmID: "alarm-3", action: .stop)
    let events = try await store.pendingEvents()
    try expect(events.count == 1 && events[0].alarmId == "alarm-3", "A corrupt file must be replaced by new events only")

    let moved = try movedFiles(in: directory, base: "events")
    try expect(moved.count == 1, "A corrupt file must be moved aside, not deleted")
    try expect(try Data(contentsOf: moved[0]) == corruptData, "A moved corrupt file must keep its original bytes")

    try await store.acknowledge(eventIDs: [events[0].id])
    let cleared = try await store.pendingEvents()
    try expect(cleared.isEmpty, "Acknowledgement must work after recovery")
  }

  private static func unsupportedVersion(in directory: URL) async throws {
    let fileURL = directory.appendingPathComponent("events.json")
    let futureData = Data(#"{"version":2,"events":[]}"#.utf8)
    try futureData.write(to: fileURL)
    let store = AlarmActionEventStore(fileURL: fileURL)

    let events = try await store.pendingEvents()
    try expect(events.isEmpty, "An unknown file version must read as an empty list")
    try expect(!FileManager.default.fileExists(atPath: fileURL.path), "An unknown file version must be moved aside")
    let moved = try movedFiles(in: directory, base: "events")
    try expect(moved.count == 1, "An unknown file version must be kept")
    try expect(try Data(contentsOf: moved[0]) == futureData, "A moved file must keep its original bytes")
  }

  private static func unreadableFile(in directory: URL) async throws {
    let fileURL = directory.appendingPathComponent("events.json")
    let store = AlarmActionEventStore(fileURL: fileURL)
    try await store.record(alarmID: "alarm-4", action: .stop)
    let original = try Data(contentsOf: fileURL)
    try FileManager.default.setAttributes([.posixPermissions: 0o000], ofItemAtPath: fileURL.path)
    defer { try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path) }

    do {
      _ = try await store.pendingEvents()
      throw TestFailure.failed("Read failures must be reported")
    } catch is CocoaError {}
    do {
      try await store.record(alarmID: "alarm-5", action: .stop)
      throw TestFailure.failed("Read failures must stop a record")
    } catch is CocoaError {}
    do {
      try await store.acknowledge(eventIDs: ["unknown"])
      throw TestFailure.failed("Read failures must stop an acknowledgement")
    } catch is CocoaError {}

    try expect(try movedFiles(in: directory, base: "events").isEmpty, "Read failures must not move the file")
    try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path)
    try expect(try Data(contentsOf: fileURL) == original, "Read failures must keep the file unchanged")
  }

  private static func writeFailure(in directory: URL) async throws {
    let blocker = directory.appendingPathComponent("blocker")
    try Data().write(to: blocker)
    let blocked = AlarmActionEventStore(fileURL: blocker.appendingPathComponent("events.json"))
    do {
      try await blocked.record(alarmID: "alarm-6", action: .stop)
      throw TestFailure.failed("Storage failures must be reported")
    } catch is CocoaError {}
  }

  private static func withTemporaryDirectory(_ body: (URL) async throws -> Void) async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    try await body(directory)
  }

  private static func movedFiles(in directory: URL, base: String) throws -> [URL] {
    try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
      .filter { $0.lastPathComponent.range(of: "^\(base)\\.corrupt-[0-9]+\\.json$", options: .regularExpression) != nil }
  }

  private static func matchCount(of pattern: String, in text: String) throws -> Int {
    let regex = try NSRegularExpression(pattern: pattern)
    return regex.numberOfMatches(in: text, range: NSRange(text.startIndex..., in: text))
  }
}
