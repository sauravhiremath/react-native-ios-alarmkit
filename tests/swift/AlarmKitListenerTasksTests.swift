import Foundation

enum AlarmKitListenerTasksTests {
  static func run() async throws {
    let stream = AsyncStream<Void> { _ in }
    var owner: AlarmKitListenerTasks? = AlarmKitListenerTasks()
    weak var weakOwner = owner
    for index in 0..<20 {
      let task = Task { for await _ in stream {} }
      owner?.insert(task, for: "\(index)")
      owner?.remove("\(index)")
      try expect(task.isCancelled, "Listener removal must cancel its task")
      owner?.remove("\(index)")
      await task.value
    }
    let pendingStream = AsyncStream<Void> { _ in }
    let task = Task { for await _ in pendingStream {} }
    owner?.insert(task, for: "pending")
    owner = nil
    try expect(weakOwner == nil, "Listener storage must release its owner")
    weakOwner = nil
    try expect(task.isCancelled, "Owner release must cancel remaining tasks")
    await task.value
  }
}
