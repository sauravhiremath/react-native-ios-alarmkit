const {
  createRunOncePlugin,
  withPodfile,
  withXcodeProject,
} = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')
const { name, version } = require('./package.json')

const unquote = (value) => String(value || '').replace(/^"|"$/g, '')
const filename = 'AlarmKitAppIntents.swift'

function sourcePaths(project, directory) {
  const result = new Map()
  const groups = project.hash.project.objects.PBXGroup || {}
  const files = project.pbxFileReferenceSection()
  function visit(id, parent, seen = new Set()) {
    if (seen.has(id)) return
    const group = groups[id]
    if (!group) return
    const base =
      unquote(group.sourceTree) === 'SOURCE_ROOT' ? directory : parent
    const current = path.resolve(base, unquote(group.path))
    for (const child of group.children || []) {
      const file = files[child.value]
      if (file) {
        const fileBase =
          unquote(file.sourceTree) === 'SOURCE_ROOT' ? directory : current
        result.set(child.value, path.resolve(fileBase, unquote(file.path)))
      } else {
        visit(child.value, current, new Set([...seen, id]))
      }
    }
  }
  visit(project.getFirstProject().firstProject.mainGroup, directory)
  return result
}

function withAlarmKit(config) {
  config = withPodfile(config, (mod) => {
    if (
      !/^[ \t]*pod[ \t]+['"]AlarmKitCore['"]/m.test(mod.modResults.contents)
    ) {
      const anchor = /^(\s*)use_expo_modules!/m
      if (!anchor.test(mod.modResults.contents)) {
        throw new Error(
          `${name}: Cannot find use_expo_modules! in the iOS Podfile. Add the AlarmKitCore pod inside the application target.`
        )
      }
      mod.modResults.contents = mod.modResults.contents.replace(
        anchor,
        (_match, indent) =>
          `${indent}pod 'AlarmKitCore', :path => File.dirname(Pod::Executable.execute_command('node', ['-p', "require.resolve('react-native-ios-alarmkit/package.json')"]).strip)\n${indent}use_expo_modules!`
      )
    }
    return mod
  })
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults
    const { platformProjectRoot, projectName } = mod.modRequest
    if (
      !projectName ||
      path.basename(projectName) !== projectName ||
      ['.', '..'].includes(projectName)
    ) {
      throw new Error(
        `${name}: Invalid iOS application target name: ${projectName}`
      )
    }
    const targets = Object.entries(project.pbxNativeTargetSection()).filter(
      ([, target]) =>
        typeof target === 'object' &&
        unquote(target.productType) === 'com.apple.product-type.application' &&
        unquote(target.name) === projectName
    )
    if (targets.length !== 1) {
      throw new Error(
        `${name}: Expected one application target named ${projectName}. Check the iOS Xcode project.`
      )
    }
    const [, target] = targets[0]
    const phases = target.buildPhases
      .map(
        (phase) =>
          project.hash.project.objects.PBXSourcesBuildPhase?.[phase.value]
      )
      .filter(Boolean)
    if (phases.length !== 1) {
      throw new Error(
        `${name}: Application target ${projectName} needs one Sources build phase.`
      )
    }
    const relative = `${projectName}/${filename}`
    const destination = path.join(platformProjectRoot, relative)
    const content = fs.readFileSync(
      path.join(__dirname, 'plugin', filename),
      'utf8'
    )
    if (
      fs.existsSync(destination) &&
      (fs.lstatSync(destination).isSymbolicLink() ||
        fs.readFileSync(destination, 'utf8') !== content)
    ) {
      throw new Error(
        `${name}: ${destination} conflicts with the plugin source. Rename your file before prebuild.`
      )
    }
    const references = Object.entries(project.pbxFileReferenceSection()).filter(
      ([, file]) =>
        typeof file === 'object' &&
        path.basename(unquote(file.path)) === filename
    )
    const resolved = sourcePaths(project, platformProjectRoot)
    if (
      references.length > 1 ||
      references.some(([id]) => resolved.get(id) !== destination)
    ) {
      throw new Error(
        `${name}: ${filename} conflicts with existing Xcode references in ${projectName}. Remove the conflicting reference before prebuild.`
      )
    }
    let fileID = references[0]?.[0]
    if (!fileID) {
      const file = project.addFile(
        relative,
        project.getFirstProject().firstProject.mainGroup
      )
      fileID = file.fileRef
    }
    const builds = project.pbxBuildFileSection()
    const inSources = phases[0].files.some(
      (entry) => builds[entry.value]?.fileRef === fileID
    )
    if (!inSources) {
      const id = project.generateUuid()
      builds[id] = {
        isa: 'PBXBuildFile',
        fileRef: fileID,
        fileRef_comment: filename,
      }
      builds[`${id}_comment`] = `${filename} in Sources`
      phases[0].files.push({ value: id, comment: `${filename} in Sources` })
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.writeFileSync(destination, content)
    return mod
  })
}

module.exports = createRunOncePlugin(withAlarmKit, name, version)
