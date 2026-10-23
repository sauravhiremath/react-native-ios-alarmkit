import Foundation

#if canImport(AlarmKit)
import AlarmKit
#endif

enum AlarmKitErrorCode: String {
  case invalidUUID = "INVALID_UUID"
  case invalidJSON = "INVALID_JSON"
  case invalidConfiguration = "INVALID_CONFIGURATION"
  case alarmNotFound = "ALARM_NOT_FOUND"
  case maximumLimitReached = "MAXIMUM_LIMIT_REACHED"
  case unauthorized = "UNAUTHORIZED"
  case alarmExists = "ALARM_EXISTS"
  case unknown = "UNKNOWN"
}

struct AlarmKitErrorInfo: Codable {
  let code: String
  let message: String
  let domain: String?
  let nativeCode: Int?
}

enum AlarmKitErrors {
  static func wrap(_ error: Error, code: AlarmKitErrorCode? = nil) -> NSError {
    let native = error as NSError
    if native.domain == "AlarmKit", native.code == 1000,
       let info = try? JSONDecoder().decode(AlarmKitErrorInfo.self, from: Data(native.localizedDescription.utf8)),
       AlarmKitErrorCode(rawValue: info.code) != nil {
      return native
    }
    let info = AlarmKitErrorInfo(
      code: (code ?? detectCode(native)).rawValue,
      message: native.localizedDescription.isEmpty ? native.description : native.localizedDescription,
      domain: native.domain,
      nativeCode: native.code
    )
    let message = (try? JSONEncoder().encode(info)).map { String(decoding: $0, as: UTF8.self) }
      ?? error.localizedDescription
    return NSError(domain: "AlarmKit", code: 1000, userInfo: [NSLocalizedDescriptionKey: message])
  }

  static func isAlarmNotFound(_ error: NSError) -> Bool {
    guard let data = error.localizedDescription.data(using: .utf8),
          let info = try? JSONDecoder().decode(AlarmKitErrorInfo.self, from: data) else { return false }
    return info.code == AlarmKitErrorCode.alarmNotFound.rawValue
  }

  private static func detectCode(_ error: NSError) -> AlarmKitErrorCode {
    #if canImport(AlarmKit)
    if #available(iOS 26.0, *) {
      if error.domain.contains("AlarmKit") {
        if let alarmError = error as? AlarmManager.AlarmError {
          switch alarmError {
          case .maximumLimitReached: return .maximumLimitReached
          @unknown default: return .unknown
          }
        }
        switch error.code {
        case 1: return .invalidUUID
        case 2: return .invalidJSON
        case 3, 4: return .invalidConfiguration
        default:
          if error.localizedDescription.contains("not found") || error.localizedDescription.contains("does not exist") {
            return .alarmNotFound
          }
        }
      }
    }
    #endif
    return .unknown
  }
}
