const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')

const root = path.resolve(__dirname, '..')
const script = path.join(root, 'scripts/verify-ios-linkage.cjs')
const source = fs.readFileSync(script, 'utf8')

function checkConsumer(args) {
  const commands = []
  const writes = []
  const copies = []
  const builds = []
  const archives = []
  const work = path.join(root, 'consumer-fixture')
  const mockFs = {
    mkdirSync() {},
    realpathSync: (file) => file,
    mkdtempSync: () => work,
    cpSync: (...args) => copies.push(args),
    copyFileSync: (...args) => copies.push(args),
    readFileSync: (file) => {
      assert.equal(file, path.join(work, 'consumer/ios/Podfile'))
      return "alarmkit_path = '../..'\n"
    },
    writeFileSync: (...args) => writes.push(args),
  }
  const load = (name) => {
    if (name === 'node:fs') return mockFs
    if (name === 'node:child_process') return {
      execFileSync: (...args) => commands.push(args),
    }
    if (name === './pack-consumer.cjs') return {
      packConsumer: (...args) => {
        archives.push(args)
        return 'alarmkit.tgz'
      },
    }
    if (name === './build-ios-consumer.cjs') return (options) => builds.push(options)
    return require(name)
  }
  vm.runInThisContext(`(function(require, process, __dirname, console) { ${source}\n})`, { filename: script })(
    load, { argv: [process.execPath, script, ...args], env: { RUNNER_TEMP: root } },
    path.dirname(script), { log() {} }
  )
  return { commands, writes, copies, builds, archives, work }
}

for (const linkage of ['library', 'static', 'dynamic']) {
  for (const configuration of ['Debug', 'Release']) {
    test(`${linkage} ${configuration} uses only library setup and the selected registration`, () => {
      for (const registration of ['auto', 'none', 'explicit']) {
        const result = checkConsumer(['--linkage', linkage, '--configuration', configuration, '--registration', registration])
        const { commands, writes, copies, builds, archives, work } = result
        const consumer = path.join(work, 'consumer')
        const explicit = registration === 'explicit' || (registration === 'auto' && linkage === 'dynamic')
        assert.deepEqual(archives, [[root, work]])
        assert.deepEqual(builds, [{ work, consumer, linkage, configuration, appName: 'AlarmKitExample' }])
        assert.deepEqual(commands[0].slice(0, 2), ['npm', [
          'install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', path.join(work, 'alarmkit.tgz'),
        ]])
        assert.deepEqual(commands.map(([command]) => command), explicit ? ['npm', 'ruby'] : ['npm'])
        assert.deepEqual(writes.map(([file]) => path.relative(consumer, file)), [
          'react-native.config.js', 'metro.config.js', 'babel.config.js', 'ios/Podfile',
        ])
        assert.equal(copies.length, explicit ? 2 : 1)
        if (explicit) {
          assert.deepEqual(copies[1], [
            path.join(consumer, 'node_modules/react-native-ios-alarmkit/plugin/AlarmKitAppIntents.swift'),
            path.join(consumer, 'ios/AlarmKitExample/AlarmKitAppIntents.swift'),
          ])
        }
      }
    })
  }
}

test('invalid and unrelated consumer options fail before setup', () => {
  for (const args of [
    ['--linkage', 'other'], ['--configuration', 'other'], ['--registration', 'other'],
    ['--profile', 'standard'], ['--linkage'],
  ]) {
    assert.throws(() => checkConsumer(args), /Use --linkage|Invalid linkage/)
  }
})
