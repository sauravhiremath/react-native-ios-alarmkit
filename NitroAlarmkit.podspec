require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroAlarmkit"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "https://github.com/sauravhiremath/react-native-ios-alarmkit.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/HybridAlarmKit.swift",
  ]

  load 'nitrogen/generated/ios/NitroAlarmkit+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  s.dependency 'AlarmKitCore', s.version.to_s
  install_modules_dependencies(s)
end
