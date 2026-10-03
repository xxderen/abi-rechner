import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages veröffentlicht Projektseiten unter https://<name>.github.io/<repo>/.
// Im GitHub-Actions-Build ist GITHUB_REPOSITORY = "<name>/<repo>" gesetzt; daraus
// ergibt sich der base-Pfad automatisch, egal wie das Repo heißt. Lokal gilt "/".
function pagesBase(): string {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (!repo || repo.toLowerCase().endsWith('.github.io')) return '/'
  return `/${repo}/`
}

export default defineConfig({
  base: pagesBase(),
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
