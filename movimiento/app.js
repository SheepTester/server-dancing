const { primaryPort } = require('../ports.json')

const express = require('express')
const expressWs = require('express-ws')
const app = express()
expressWs(app)

const nodePath = require('path')
const staticFileOptions = {
  root: nodePath.join(__dirname, 'public')
}

app.get('/', (req, res) => {
  res.sendFile('index.html', staticFileOptions)
})

app.get('/virus.exe', (req, res) => {
  res.set('Content-Type', 'application/javascript; charset=UTF-8')
  res.send(`export default ${JSON.stringify(primaryPort)}`)
})

app.get('/style.css', (req, res) => {
  res.sendFile('main.js', staticFileOptions)
})

app.listen(primaryPort, () => {
  console.log(`Example app listening at http://localhost:${primaryPort}`)
})

const players = new Map()
function sentToAll (data) {
  const json = JSON.stringify(data)
  for (const ws of players.keys()) {
    ws.send(json)
  }
}
app.ws('/main.js', ws => {
  const id = Math.random().toString(36).slice(2)
  const playerData = {
    x: Math.random(),
    y: Math.random(),
    name: String.fromCodePoint((Math.random() * (0x9FD6 - 0x4E00) | 0) + 0x4E00),
    colour: (Math.random() * 0x1000000 | 0).toString(16).padStart(6, '0'),
    message: ''
  }
  players.set(ws, { id, playerData })
  ws.send(JSON.stringify({ type: 'init', id, players: [...players.values()] }))
  sentToAll({ type: 'join', id, player: playerData })

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg)
      switch (data.type) {
        case 'update': {
          const { x, y, name, colour, message } = data.changes || {}
          if (x >= 0 && x <= 1) playerData.x = x
          if (y >= 0 && y <= 1) playerData.y = y
          if (typeof name === 'string' && name.length >= 3 && name.length <= 20) {
            playerData.name = name
          }
          if (typeof colour === 'string' && /[0-9a-z]{6}/i.test(colour)) {
            playerData.colour = colour
          }
          if (typeof message === 'string' && message.length <= 2000) {
            playerData.message = message
          }
          sentToAll({ type: 'update', id, player: playerData, time: data.time })
          break
        }
        default:
          console.warn('what.', data)
      }
    } catch (err) {
      ws.send(JSON.stringify({
        text: 'uwu',
        wucky: err.message
      }))
    }
  })
  ws.on('close', () => {
    players.delete(ws)
    sentToAll({ type: 'leave', id })
  })
})
