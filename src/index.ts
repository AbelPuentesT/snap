import { createApp } from './server.js'
import { config } from './config.js'
import { initDb } from './shared/db.js'

initDb()

const app = createApp()

app.listen(config.port, () => {
  console.log(`Snap running on http://localhost:${config.port} [${config.env}]`)
})
