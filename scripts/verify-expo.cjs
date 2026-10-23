const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const temp = process.env.RUNNER_TEMP || path.join(os.tmpdir(), 'opencode')
fs.mkdirSync(temp, { recursive: true })
const work = fs.realpathSync(fs.mkdtempSync(path.join(temp, 'alarmkit-expo-')))
const consumer = path.join(work, 'consumer')
fs.mkdirSync(consumer)
console.log(`Expo consumer and logs: ${work}`)
const run = (command, args) => execFileSync(command, args, {
  cwd: consumer, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
})
const archive = require('./pack-consumer.cjs')(root, work)
fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({
  name: 'alarmkit-expo-consumer', version: '1.0.0', private: true, main: 'index.js',
  dependencies: {
    expo: '58.0.17', 'expo-build-properties': '58.0.11',
    react: '19.3.0', 'react-native': '0.88.0',
    'react-native-nitro-modules': '0.37.1',
    'react-native-ios-alarmkit': `file:${path.join(work, archive)}`,
  },
}, null, 2))
fs.writeFileSync(path.join(consumer, 'app.json'), JSON.stringify({ expo: {
  name: 'AlarmKitExpo', slug: 'alarmkit-expo',
  ios: { bundleIdentifier: 'org.reactjs.native.example.AlarmKitExpo', infoPlist: {
    NSAlarmKitUsageDescription: 'Schedule test alarms.',
  } },
  android: { package: 'org.reactjs.native.example.alarmkitexpo' },
  plugins: ['react-native-ios-alarmkit', ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }]],
} }, null, 2))
fs.writeFileSync(path.join(consumer, 'index.js'), `const {registerRootComponent} = require('expo');
const React = require('react');
const {Button} = require('react-native');
const {AlarmKit} = require('react-native-ios-alarmkit');
registerRootComponent(() => React.createElement(Button, {title: 'Check alarm permission', onPress: () => AlarmKit.requestAuthorization()}));\n`)
run('npm', ['install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund'])
const expo = path.join(consumer, 'node_modules', 'expo', 'bin', 'cli')
run(process.execPath, [expo, 'prebuild', '--platform', 'android', '--no-install'])
assert.equal(fs.existsSync(path.join(consumer, 'ios')), false, 'Android prebuild must not write iOS files')
for (const clean of [true, true, false, false]) {
  run(process.execPath, [expo, 'prebuild', '--platform', 'ios', '--no-install', ...(clean ? [] : ['--no-clean'])])
  const registration = path.join(consumer, 'ios', 'AlarmKitExpo', 'AlarmKitAppIntents.swift')
  assert.equal(fs.readFileSync(registration, 'utf8'), fs.readFileSync(path.join(root, 'plugin', 'AlarmKitAppIntents.swift'), 'utf8'))
  const podfile = fs.readFileSync(path.join(consumer, 'ios', 'Podfile'), 'utf8')
  assert.equal((podfile.match(/pod 'AlarmKitCore'/g) || []).length, 1)
}
require('./build-ios-consumer.cjs')({ work, consumer, linkage: 'dynamic', configuration: 'Release', appName: 'AlarmKitExpo', dynamicBridge: false })
console.log('PASS: Expo clean and repeated prebuilds, Android-only prebuild, dynamic core Release metadata and linked Nitro adapter')
