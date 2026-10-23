import AlarmKitCore
import NitroModules

final class HybridAlarmKit: HybridAlarmKitSpec {
  private let core = AlarmKitClient()

  var memorySize: Int { MemoryLayout<HybridAlarmKit>.size }
  var isSupported: Bool { core.isSupported }

  func getAuthorizationState() throws -> Promise<String> {
    Promise.async { @MainActor [core] in core.getAuthorizationState() }
  }

  func requestAuthorization() throws -> Promise<Bool> {
    Promise.async { @MainActor [core] in try await core.requestAuthorization() }
  }

  func schedule(id: String, configJson: String) throws -> Promise<String> {
    Promise.async { [core] in try await core.schedule(id: id, configJson: configJson) }
  }

  func cancel(id: String) throws -> Promise<Bool> {
    Promise.parallel { [core] in try core.cancel(id: id) }
  }

  func stop(id: String) throws -> Promise<Void> {
    Promise.parallel { [core] in try core.stop(id: id) }
  }

  func pause(id: String) throws -> Promise<Void> {
    Promise.parallel { [core] in try core.pause(id: id) }
  }

  func resume(id: String) throws -> Promise<Void> {
    Promise.parallel { [core] in try core.resume(id: id) }
  }

  func countdown(id: String) throws -> Promise<Void> {
    Promise.parallel { [core] in try core.countdown(id: id) }
  }

  func getAlarms() throws -> Promise<String> {
    Promise.parallel { [core] in try core.getAlarms() }
  }

  func getPendingActionEvents() throws -> Promise<String> {
    Promise.async { [core] in try await core.getPendingActionEvents() }
  }

  func acknowledgeActionEvents(eventIds: [String]) throws -> Promise<Void> {
    Promise.async { [core] in try await core.acknowledgeActionEvents(eventIds: eventIds) }
  }

  func addAlarmsListener(callback: @escaping (String) -> Void) throws -> String {
    core.addAlarmsListener(callback: callback)
  }

  func removeAlarmsListener(subscriptionId: String) throws {
    core.removeAlarmsListener(subscriptionId: subscriptionId)
  }

  func addAuthorizationListener(callback: @escaping (String) -> Void) throws -> String {
    core.addAuthorizationListener(callback: callback)
  }

  func removeAuthorizationListener(subscriptionId: String) throws {
    core.removeAuthorizationListener(subscriptionId: subscriptionId)
  }
}
