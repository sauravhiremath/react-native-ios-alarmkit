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
struct TestRunner {
  static func main() async throws {
    try AlarmActionTrackingTests.run()
    print("Alarm action tracking tests passed")
    try await AlarmActionEventStoreTests.run()
    print("Alarm action event store tests passed")
  }
}
