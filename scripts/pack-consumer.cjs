const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

function stagePackage(root, work) {
  const source = path.join(work, 'package-source')
  fs.mkdirSync(source)
  for (const entry of [
    'src', 'ios', 'android', 'nitro.json', 'NitroAlarmkit.podspec',
    'package.json', 'tsconfig.json', 'README.md', 'LICENSE',
    'app.plugin.js', 'plugin',
    'scripts/clean.cjs', 'scripts/generate-core-podspec.cjs',
  ]) {
    const destination = path.join(source, entry)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.cpSync(path.join(root, entry), destination, { recursive: true })
  }
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(source, 'node_modules'), 'dir')
  return source
}

function packConsumer(root, work) {
  const source = stagePackage(root, work)
  return JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', work], {
    cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
  }))[0].filename
}

module.exports = { packConsumer, stagePackage }
