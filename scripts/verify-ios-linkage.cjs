const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const options = { linkage: 'library', configuration: 'Release', registration: 'auto', profile: 'standard' }
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index].replace(/^--/, '')
  if (!(key in options) || !process.argv[index + 1]) {
    throw new Error('Use --linkage library|static|dynamic --configuration Debug|Release --registration auto|none|explicit --profile standard|firebase')
  }
  options[key] = process.argv[index + 1]
}
if (!['library', 'static', 'dynamic'].includes(options.linkage) ||
    !['Debug', 'Release'].includes(options.configuration) ||
    !['auto', 'none', 'explicit'].includes(options.registration) ||
    !['standard', 'firebase'].includes(options.profile)) {
  throw new Error('Invalid linkage, configuration, or registration')
}
if (options.profile === 'firebase' && options.linkage !== 'dynamic') {
  throw new Error('The Firebase 27 profile requires --linkage dynamic')
}

const temp = process.env.RUNNER_TEMP || path.join(os.tmpdir(), 'opencode')
fs.mkdirSync(temp, { recursive: true })
const work = fs.realpathSync(fs.mkdtempSync(path.join(temp, 'alarmkit-linkage-')))
const consumer = path.join(work, 'consumer')
const run = (command, args, cwd = consumer, extra = {}) => execFileSync(command, args, {
  cwd, stdio: 'inherit', env: { ...process.env, ...extra },
})
console.log(`Consumer and logs: ${work}`)
fs.mkdirSync(consumer)
fs.cpSync(path.join(root, 'example'), consumer, {
  recursive: true,
  filter: (entry) => !['node_modules', 'Pods', 'build', 'vendor', '.gradle', '.cxx', '.xcode.env.local', 'local.xcconfig'].includes(path.basename(entry)),
})
const archive = require('./pack-consumer.cjs')(root, work)
run('npm', ['install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', path.join(work, archive)])
const library = path.join(consumer, 'node_modules', 'react-native-ios-alarmkit')
fs.writeFileSync(path.join(consumer, 'react-native.config.js'), `module.exports = {
  assets: ['./assets/fonts'],
  dependencies: { 'react-native-ios-alarmkit': { root: ${JSON.stringify(library)}, platforms: { ios: {}, android: {} } } }
}\n`)
fs.writeFileSync(path.join(consumer, 'metro.config.js'), `module.exports = require('@react-native/metro-config').getDefaultConfig(__dirname);\n`)
fs.writeFileSync(path.join(consumer, 'babel.config.js'), `module.exports = { presets: ['module:@react-native/babel-preset'] };\n`)
const podfile = path.join(consumer, 'ios', 'Podfile')
fs.writeFileSync(podfile, fs.readFileSync(podfile, 'utf8').replace("alarmkit_path = '../..'", `alarmkit_path = ${JSON.stringify(library)}`))
if (options.profile === 'firebase') {
  run('npm', ['install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund',
    '@react-native-firebase/app@27.0.0', '@react-native-firebase/remote-config@27.0.0'])
  const delegate = path.join(consumer, 'ios', 'AlarmKitExample', 'AppDelegate.swift')
  const delegateSource = 'import FirebaseCore\n' + fs.readFileSync(delegate, 'utf8').replace(
    /(\bfunc application\([\s\S]*?\) -> Bool \{)/,
    '$1\n    FirebaseApp.configure()'
  )
  if (!delegateSource.includes('FirebaseApp.configure()')) {
    throw new Error('Cannot add Firebase initialization to the example AppDelegate')
  }
  fs.writeFileSync(delegate, delegateSource)
  const appSource = path.join(consumer, 'App.tsx')
  fs.writeFileSync(appSource, fs.readFileSync(appSource, 'utf8').replace('export default function App()', 'function App()') + `
import { Button as FirebaseCheckButton } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { fetchAndActivate, getRemoteConfig } from '@react-native-firebase/remote-config';

export default function FirebaseConsumer() {
  const [status, setStatus] = React.useState('Check Firebase 27');
  return <>
    <FirebaseCheckButton title={status} onPress={async () => {
      try {
        await fetchAndActivate(getRemoteConfig(getApp()));
        setStatus('Firebase 27 service call passed');
      } catch (error) {
        setStatus('Firebase 27 service call failed');
        Alert.alert('Firebase', String(error));
      }
    }} />
    <App />
  </>;
}
`)
  if (process.env.FIREBASE_IOS_CONFIG) {
    fs.copyFileSync(process.env.FIREBASE_IOS_CONFIG, path.join(consumer, 'ios', 'AlarmKitExample', 'GoogleService-Info.plist'))
    run('ruby', ['-rxcodeproj', '-e', `
      project = Xcodeproj::Project.open(ARGV[0])
      target = project.targets.find { |item| item.product_type == 'com.apple.product-type.application' }
      file = project.main_group.new_file('AlarmKitExample/GoogleService-Info.plist')
      target.resources_build_phase.add_file_reference(file)
      project.save
    `, path.join(consumer, 'ios', 'AlarmKitExample.xcodeproj')])
  }
}
const explicit = options.registration === 'explicit' ||
  (options.registration === 'auto' && options.linkage === 'dynamic')
if (explicit) {
  fs.copyFileSync(path.join(library, 'plugin', 'AlarmKitAppIntents.swift'), path.join(consumer, 'ios', 'AlarmKitExample', 'AlarmKitAppIntents.swift'))
  run('ruby', ['-rxcodeproj', '-e', `
    project = Xcodeproj::Project.open(ARGV[0])
    target = project.targets.find { |item| item.product_type == 'com.apple.product-type.application' }
    group = project.main_group.find_subpath('AlarmKitExample', false)
    file = group.new_file('AlarmKitExample/AlarmKitAppIntents.swift')
    target.source_build_phase.add_file_reference(file)
    project.save
  `, path.join(consumer, 'ios', 'AlarmKitExample.xcodeproj')])
}
require('./build-ios-consumer.cjs')({
  work, consumer, linkage: options.linkage, configuration: options.configuration, appName: 'AlarmKitExample',
})
console.log(`PASS: ${options.profile} ${options.linkage} ${options.configuration}; explicit registration: ${explicit}`)
if (options.profile === 'firebase') {
  console.log('Build only. Use a private Firebase iOS config and a device to check the Firebase button and alarm actions.')
}
