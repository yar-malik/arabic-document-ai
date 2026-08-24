/**
 * Read a Saudi document into structured fields.
 *
 * No dependencies and no build step — Node 18 or newer.
 *
 *   export VOHO_API_KEY=voho_sk_live_...   # app.voho.ai -> API Tokens
 *   npm start
 *
 * New accounts start with $25 of credit, so this costs nothing to try.
 */
const KEY = process.env.VOHO_API_KEY
const BASE = process.env.VOHO_BASE_URL ?? 'https://app.voho.ai'

if (!KEY) {
  console.error('Set VOHO_API_KEY first — create one at https://app.voho.ai/tokens')
  process.exit(1)
}

async function voho(path, body, raw = false) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    console.error(`${detail.error?.code ?? res.status}: ${detail.error?.message ?? 'request failed'}`)
    process.exit(1)
  }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json()
}

function spent(cents) {
  console.log(`\nCharged $${(cents / 100).toFixed(2)} from your Voho balance.`)
}

const { readFile } = await import('node:fs/promises')

const path = process.argv[2]
const sample = `${BASE}/samples/sample-invoice.pdf`

let data, mime
if (path) {
  data = (await readFile(path)).toString('base64')
  mime = path.endsWith('.png') ? 'image/png' : path.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
} else {
  console.log(`No file given — reading the sample invoice at ${sample}`)
  data = Buffer.from(await (await fetch(sample)).arrayBuffer()).toString('base64')
  mime = 'application/pdf'
}

const out = await voho('/v1/documents/extract', { file: data, mime_type: mime })

console.log(`\n${out.document_type}\n${out.summary}\n`)
for (const f of out.fields) {
  const flag = f.confidence === 'high' ? '   ' : ` ${f.confidence[0]} `
  console.log(`${flag}${f.label}: ${f.value}`)
}
if (out.warnings.length) console.log('\nWorth a look:', out.warnings.join(' · '))
spent(out.cost_cents)
