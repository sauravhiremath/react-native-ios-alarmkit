const fs = require('node:fs')
const path = require('node:path')

for (const output of ['lib', 'nitrogen/generated', 'tsconfig.tsbuildinfo', 'AlarmKitCore.podspec.json']) {
  fs.rmSync(path.join(__dirname, '..', output), { recursive: true, force: true })
}
