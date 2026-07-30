import { readdir, readFile } from 'node:fs/promises'
import { extname, join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'

const pagesDirectory = fileURLToPath(new URL('../src/pages/', import.meta.url))
const files = await readdir(pagesDirectory)
const fileNames = new Set(files)
const errors = []

for (const file of files.filter((name) => extname(name) === '.tsx')) {
  const { name } = parse(file)
  const stylesheet = `${name}.css`

  if (!fileNames.has(stylesheet)) {
    errors.push(`${file} is missing ${stylesheet}`)
    continue
  }

  const source = await readFile(join(pagesDirectory, file), 'utf8')
  const cssImport = new RegExp(`import\\s+['\"]\\./${stylesheet.replace('.', '\\.')}['\"]`)

  if (!cssImport.test(source)) {
    errors.push(`${file} must import './${stylesheet}'`)
  }
}

if (errors.length > 0) {
  console.error('Invalid page organization:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(`Page organization valid: ${files.filter((name) => extname(name) === '.tsx').length} TSX/CSS pairs.`)
}
