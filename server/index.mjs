import http from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const cache = new Map()
const CACHE_TTL = 180000

const isValidHost = (host) => {
  if (!host || typeof host !== 'string') return false
  if (host.length > 253) return false
  if (/^[a-zA-Z0-9.-]+$/.test(host) && !host.includes('..')) return true
  return false
}

const pingHost = (host) => {
  return new Promise((resolve) => {
    const proc = spawn('ping', ['-c', '1', '-W', '2', host], { stdio: ['ignore', 'ignore', 'ignore'] })
    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      resolve(false)
    }, 5000)
    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0)
    })
    proc.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

const getStatus = async (host) => {
  const key = host.toLowerCase()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { ok: true, alive: cached.alive, cached: true, host }
  }
  const alive = await pingHost(host)
  cache.set(key, { alive, ts: Date.now() })
  return { ok: true, alive, cached: false, host }
}

const mime = (p) => {
  const ext = extname(p).toLowerCase()
  if (ext === '.html') return 'text/html; charset=utf-8'
  if (ext === '.js') return 'text/javascript; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.json' || ext === '.map') return 'application/json; charset=utf-8'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.ico') return 'image/x-icon'
  if (ext === '.woff2') return 'font/woff2'
  if (ext === '.woff') return 'font/woff'
  return 'text/plain; charset=utf-8'
}

const serveStatic = (req, res) => {
  let url = req.url.split('?')[0]
  if (url === '/') url = '/index.html'
  const safe = normalize(url).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(distDir, safe)
  if (!existsSync(filePath) || !filePath.startsWith(distDir)) {
    filePath = join(distDir, 'index.html')
  }
  try {
    const data = readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': mime(filePath), 'Cache-Control': url.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end()
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/ping')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    const url = new URL(req.url, 'http://localhost')
    const host = url.searchParams.get('host')?.trim()
    if (!isValidHost(host)) {
      res.writeHead(400)
      res.end(JSON.stringify({ ok: false, error: 'invalid_host' }))
      return
    }
    try {
      const result = await getStatus(host)
      res.writeHead(200)
      res.end(JSON.stringify(result))
    } catch (e) {
      res.writeHead(500)
      res.end(JSON.stringify({ ok: false, error: 'ping_failed' }))
    }
    return
  }
  serveStatic(req, res)
})

const port = process.env.PORT || 8080
server.listen(port, () => {
  console.log(`homelab-diagramm server listening on :${port}`)
})
