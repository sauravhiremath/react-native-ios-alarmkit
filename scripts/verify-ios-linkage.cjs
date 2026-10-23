const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { parseArgs } = require('node:util')
const { packConsumer } = require('./pack-consumer.cjs')

const root = path.resolve(__dirname, '..')
const { values: options } = parseArgs({ options: {
  linkage: { type: 'string', default: 'library' },
  configuration: { type: 'string', default: 'Release' },
} })
if (!['library', 'static', 'dynamic'].includes(options.linkage) ||
    !['Debug', 'Release'].includes(options.configuration)) {
  throw new Error('Invalid linkage or configuration')
}

const temp = process.env.RUNNER_TEMP || path.join(os.tmpdir(), 'opencode')
fs.mkdirSync(temp, { recursive: true })
const work = fs.realpathSync(fs.mkdtempSync(path.join(temp, 'alarmkit-linkage-')))
const consumer = path.join(work, 'consumer')
const run = (command, args, cwd = consumer) => execFileSync(command, args, {
  cwd, stdio: 'inherit',
})
console.log(`Consumer and logs: ${work}`)
fs.mkdirSync(consumer)
fs.cpSync(path.join(root, 'example'), consumer, {
  recursive: true,
  filter: (entry) => !['node_modules', 'Pods', 'build', 'vendor', '.gradle', '.cxx', '.xcode.env.local', 'local.xcconfig'].includes(path.basename(entry)),
})
const archive = packConsumer(root, work)
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
if (options.linkage === 'dynamic') {
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
console.log(`PASS: ${options.linkage} ${options.configuration}`)
