const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { test } = require('node:test')
const { stagePackage } = require('../scripts/pack-consumer.cjs')

const root = path.resolve(__dirname, '..')

test('a clean archive contains current declarations and native bindings only', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'alarmkit-package-'))
  try {
    const fixture = stagePackage(root, work)
    const run = (...args) => execFileSync('npm', args, { cwd: fixture, encoding: 'utf8' })
    fs.writeFileSync(path.join(fixture, 'src', 'RemovedSource.ts'), 'export const removed = true\n')
    run('run', 'typescript')
    assert.ok(fs.existsSync(path.join(fixture, 'lib', 'RemovedSource.js')))
    fs.unlinkSync(path.join(fixture, 'src', 'RemovedSource.ts'))
    for (let index = 0; index < 2; index += 1) {
      const output = JSON.parse(run('pack', '--json'))[0]
      const files = output.files.map((file) => file.path)
      for (const required of [
        'lib/index.js', 'lib/index.d.ts', 'lib/AlarmConfiguration.d.ts',
        'src/index.ts', 'ios/core/AlarmActionIntents.swift', 'ios/core/AlarmKitClient.swift',
        'nitrogen/generated/ios/NitroAlarmkit+autolinking.rb',
        'nitrogen/generated/android/NitroAlarmkit+autolinking.cmake',
        'android/src/main/cpp/cpp-adapter.cpp', 'NitroAlarmkit.podspec', 'AlarmKitCore.podspec.json',
        'app.plugin.js', 'plugin/AlarmKitAppIntents.swift', 'scripts/clean.cjs',
      ]) {
        assert.ok(files.includes(required), `Missing archive file: ${required}`)
      }
      assert.equal(files.some((file) => /RemovedSource|AlarmKitError\.(js|d\.ts)|tsbuildinfo|^tests\/|ios\/Bridge\.h/.test(file)), false)
      fs.unlinkSync(path.join(fixture, output.filename))
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
})
