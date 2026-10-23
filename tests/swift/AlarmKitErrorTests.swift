import Foundation

enum AlarmKitErrorTests {
  static func run() throws {
    let native = NSError(domain: "OriginalDomain", code: 42, userInfo: [NSLocalizedDescriptionKey: "Native failure"])
    let wrapped = AlarmKitErrors.wrap(native, code: .invalidConfiguration)
    let info = try JSONDecoder().decode(AlarmKitErrorInfo.self, from: Data(wrapped.localizedDescription.utf8))
    try expect(info.code == "INVALID_CONFIGURATION", "Explicit error code must survive")
    try expect(info.domain == "OriginalDomain" && info.nativeCode == 42, "Native details must survive")
    try expect(info.message == "Native failure", "Native message must survive")
    try expect(AlarmKitErrors.wrap(wrapped) === wrapped, "Structured errors must not be wrapped twice")
    try expect(AlarmKitErrors.wrap(wrapped, code: .unknown) === wrapped, "Outer conversion must not replace a structured code")
    let malformed = NSError(domain: "AlarmKit", code: 1000, userInfo: [NSLocalizedDescriptionKey: "{}"])
    let fallback = AlarmKitErrors.wrap(malformed)
    let fallbackInfo = try JSONDecoder().decode(AlarmKitErrorInfo.self, from: Data(fallback.localizedDescription.utf8))
    try expect(fallbackInfo.code == "UNKNOWN" && fallbackInfo.message == "{}", "Malformed JSON needs ordinary error conversion")
    let missing = AlarmKitErrors.wrap(native, code: .alarmNotFound)
    try expect(AlarmKitErrors.isAlarmNotFound(missing), "Cancel must recognize a not-found error")
    try expect(!AlarmKitErrors.isAlarmNotFound(wrapped), "Cancel must not hide other failures")
  }
}
