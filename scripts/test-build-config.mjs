import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfigFromFile } from 'vite'

test('Vite uses a canonical root and local aliases, including Windows junction paths', async () => {
  const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
  const loaded=await loadConfigFromFile({command:'build',mode:'production'}, path.join(root,'vite.config.js'))
  assert.ok(loaded)
  assert.equal(loaded.config.root, root)
  assert.equal(loaded.config.resolve.alias['@'], path.join(root,'src'))
  assert.equal(loaded.config.resolve.alias['~'], root)
})
