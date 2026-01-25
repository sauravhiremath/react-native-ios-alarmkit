# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-25

### Added

- Complete 1-1 API mapping with native iOS AlarmKit
- Two-tier API architecture (Simple + Advanced)
- Simple API methods for common use cases (scheduleTimer, scheduleAlarm)
- Advanced AlarmKitManager.shared class mirroring native AlarmManager.shared
- AlarmConfigurationFactory with timer/alarm/create factory methods
- Event listener support for real-time updates (addAlarmsListener, addAuthorizationListener)
- React hooks (useAlarms, useAuthorizationState) for automatic state management
- getAlarms() method to retrieve all active alarms with their state
- countdown(id) method to start countdown for scheduled alarms
- AlarmKitError typed error class
- Comprehensive example app demonstrating simple API, advanced API, and hooks

### Changed

- Fixed AlarmState enum (removed invalid 'stopped' state)
- Updated types.ts with Alarm interface, Subscription type, and simple config types
- Completely rewrote index.ts with new simple API
- Updated README.md with comprehensive documentation and examples
- Lowered minimum iOS deployment target to 15.1 (from 26.0) for broader compatibility
- Library now compiles on iOS 15.1+ but AlarmKit features only work on iOS 26+

### Technical

- Implemented AsyncSequence listener pattern for alarms and authorization updates
- Added Task-based subscription management in Swift
- Updated Nitro spec with new methods (getAlarms, countdown, listeners)
- Added AlarmData struct for encoding native Alarm objects to JSON
- Updated Android implementation with no-op methods for new APIs

## [0.1.0] - 2026-01-25

### Added

- Initial release of react-native-alarmkit
- iOS 26+ AlarmKit wrapper with full API support
- Schedule alarms with fixed dates or recurring schedules
- Countdown timers with custom durations
- Custom alert presentations with buttons, colors, and SF Symbols
- Live Activities support for countdown UI
- Android no-op implementation for cross-platform compatibility
- Authorization management (request, check status)
- Alarm lifecycle management (schedule, cancel, stop, pause, resume)
- TypeScript types for all AlarmKit features
- Comprehensive documentation and Live Activity setup guide
- Example React Native app demonstrating all features
- Built with Nitro Modules for optimal performance

