import { readFileSync, writeFileSync } from 'fs'

const filePath = '/vercel/share/v0-project/data/channels/all-channels.ts'
let content = readFileSync(filePath, 'utf-8')

// Find all channel id: entries in order and inject channelNumber after id
let counter = 0
content = content.replace(/(\s+id:\s+"[^"]+",\n)/g, (match) => {
  counter++
  // Insert channelNumber right after the id line
  return match + `    channelNumber: ${counter},\n`
})

writeFileSync(filePath, content, 'utf-8')
console.log(`Added channelNumber to ${counter} channels.`)
