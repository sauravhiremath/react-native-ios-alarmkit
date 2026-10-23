import Foundation

final class AlarmKitListenerTasks: @unchecked Sendable {
  private let lock = NSLock()
  private var tasks: [String: Task<Void, Never>] = [:]

  deinit { cancelAll() }

  func insert(_ task: Task<Void, Never>, for id: String) {
    lock.lock()
    let previous = tasks.updateValue(task, forKey: id)
    lock.unlock()
    previous?.cancel()
  }

  func remove(_ id: String) {
    lock.lock()
    let task = tasks.removeValue(forKey: id)
    lock.unlock()
    task?.cancel()
  }

  func cancelAll() {
    lock.lock()
    let pending = Array(tasks.values)
    tasks.removeAll()
    lock.unlock()
    for task in pending { task.cancel() }
  }
}
