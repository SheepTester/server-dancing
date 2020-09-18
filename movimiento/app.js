const express = require('express')
const app = express()
const port = 10068

const nodePath = require('path')
const staticFileOptions = {
  root: nodePath.join(__dirname, 'public')
}

app.get('/', (req, res) => {
  res.sendFile('index.html', staticFileOptions)
})

app.get('/style.css', (req, res) => {
  res.sendFile('main.js', staticFileOptions)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

const WebSocket = require('ws')
const wss = new WebSocket.Server({
  port: 10070
})
const players = new Map()
function sentToAll (data) {
  const json = JSON.stringify(data)
  for (const ws of players.keys()) {
    ws.send(json)
  }
}
wss.on('connection', ws => {
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
    const data = JSON.parse(msg)
    switch (data.type) {
      case 'init': {
        playerId = data.id
        playerData = data.player
        break
      }
      case 'join': {
        players.set(data.id, data.player)
        break
      }
      case 'update': {
        const { x, y, name, colour, message } = data.changes
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
  })
  ws.on('close', () => {
    players.delete(ws)
    sentToAll({ type: 'leave', id })
  })
})
