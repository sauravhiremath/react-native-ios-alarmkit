import Foundation

enum TestFailure: Error {
  case failed(String)
}

func expect(_ condition: Bool, _ message: String) throws {
  if !condition {
    throw TestFailure.failed(message)
  }
}

@main
struct AlarmActionEventStoreTests {
  static func main() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let fileURL = directory.appendingPathComponent("events.json")
    let store = AlarmActionEventStore(fileURL: fileURL)

    let empty = try await store.pendingEvents()
    try expect(empty.isEmpty, "A new store must be empty")
    try await store.acknowledge(eventIDs: ["unknown"])

    let before = Date().timeIntervalSince1970 * 1000
    try await store.record(alarmID: "alarm-1", action: .stop)
    try await store.record(alarmID: "alarm-1", action: .snooze)
    let events = try await store.pendingEvents()
    try expect(events.count == 2, "Stop and snooze must each create an event")
    try expect(events[0].alarmId == "alarm-1" && events[0].action == .stop, "Stop must retain the alarm ID")
    try expect(events[1].action == .snooze, "Snooze must retain its action")
    try expect(events[0].id != events[1].id, "Each event must have a unique ID")
    try expect(events[0].timestamp >= before, "Timestamps must use Unix milliseconds")
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

    let json = try JSONSerialization.jsonObject(with: Data(contentsOf: fileURL)) as! [[String: Any]]
    try expect(json[0]["alarmId"] as? String == "alarm-2", "Stored JSON must use the public event fields")
    try expect(json[0]["action"] as? String == "stop", "Actions must use their string values")

    try await store.acknowledge(eventIDs: concurrent.map(\.id))
    let cleared = try await reopened.pendingEvents()
    try expect(cleared.isEmpty, "Acknowledgement must persist across store recreation")

    try Data("invalid".utf8).write(to: fileURL)
    do {
      _ = try await store.pendingEvents()
      throw TestFailure.failed("Corrupt history must not be treated as empty")
    } catch is DecodingError {}
    do {
      try await store.record(alarmID: "alarm-3", action: .stop)
      throw TestFailure.failed("Corrupt history must not be overwritten")
    } catch is DecodingError {}
    do {
      try await store.acknowledge(eventIDs: ["unknown"])
      throw TestFailure.failed("Acknowledgement must not overwrite corrupt history")
    } catch is DecodingError {}
    let corruptData = try Data(contentsOf: fileURL)
    try expect(String(data: corruptData, encoding: .utf8) == "invalid", "Failed writes must preserve the existing file")

    let blockedURL = fileURL.appendingPathComponent("events.json")
    let blocked = AlarmActionEventStore(fileURL: blockedURL)
    do {
      try await blocked.record(alarmID: "alarm-4", action: .stop)
      throw TestFailure.failed("Storage failures must be reported")
    } catch is CocoaError {}

    print("Alarm action event store tests passed")
  }
}
