import pkg from "pg"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const { Client } = pkg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const postgresUrl = process.env.POSTGRES_URL
if (!postgresUrl) {
  console.error("Missing POSTGRES_URL")
  process.exit(1)
}

const client = new Client({
  connectionString: postgresUrl,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120000,
})

// Canonical execution order. 00-fresh-setup.sql is run by setup-fresh.js separately.
const order = [
  "01-create-tables.sql",
  "001-create-user-ratings-table.sql",
  "003_create_phcorner_usernames.sql",
  "02-insert-permanent-token.sql",
  "03-add-permanent-tokens.sql",
  "04-create-increment-function.sql",
  "05-create-admin-tables.sql",
  "06-create-admin-functions.sql",
  "07-insert-default-data.sql",
  "08-enable-rls.sql",
  "09-fix-onn-overlay.sql",
  "10-delete-welcome-onn-announcement.sql",
  "11-delete-welcome-onn-banner.sql",
  "13-remove-stream-status-add-new-features.sql",
  "14-update-analytics-function.sql",
  "15-create-admin-panel-tables.sql",
  "16-fix-usage-tracking.sql",
  "17-add-auto-dismiss-column.sql",
  "17-fix-channel-analytics-schema.sql",
  "18-create-active-sessions-table.sql",
  "19-create-session-functions.sql",
  "20-fix-session-functions.sql",
  "21-add-viewers-column.sql",
  "21-replace-usage-with-viewers.sql",
  "22-create-maintenance-mode-table.sql",
  "22-create-viewer-functions.sql",
  "23-fix-viewer-tracking-system.sql",
  "24-fix-viewer-analytics-functions.sql",
  "25-create-video-positions-table.sql",
  "26-add-password-to-phcorner.sql",
  "27-migrate-phcorner-to-passwords.sql",
  "28-create-user-preferences-table.sql",
  "29-add-token-security-features.sql",
  "29-create-user-accounts.sql",
  "30-create-playlist-tables.sql",
  "31-create-playlist-tables-fixed.sql",
  "32-create-channel-requests-table.sql",
  "33-create-shared-folders-collections.sql",
  "create-folders-favorites.sql",
  "add-channel-number-column.sql",
]

await client.connect()

let ok = 0
let fail = 0
const failures = []

for (const file of order) {
  const filePath = path.join(__dirname, file)
  if (!fs.existsSync(filePath)) {
    console.log(`-- skip (missing): ${file}`)
    continue
  }
  const sql = fs.readFileSync(filePath, "utf-8")
  try {
    await client.query(sql)
    console.log(`OK  ${file}`)
    ok++
  } catch (err) {
    const msg = err.message || String(err)
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate key") ||
      msg.includes("does not exist") // tolerate dependent missing relations
    ) {
      console.log(`OK* ${file} (tolerated: ${msg.split("\n")[0]})`)
      ok++
    } else {
      console.log(`ERR ${file}: ${msg.split("\n")[0]}`)
      failures.push({ file, msg: msg.split("\n")[0] })
      fail++
    }
  }
}

console.log(`\nResults: ${ok} ok, ${fail} failed`)
if (failures.length) {
  console.log("Failures:")
  for (const f of failures) console.log(` - ${f.file}: ${f.msg}`)
}

await client.end()
