const wsHost = window.location.origin
  .replace('10068', '10070')
  .replace('http', 'ws')
const ws = new WebSocket(wsHost)

const players = new Map()
let playerId = null
let lastChangeTime = null
ws.addEventListener('open', () => {
  console.log('connected.')
})
ws.addEventListener('message', e => {
  const data = JSON.parse(e.data)
  console.log(data)
  switch (data.type) {
    case 'init': {
      playerId = data.id
      for (const { id, playerData } of data.players) {
        players.set(id, playerData)
      }
      redraw()
      break
    }
    case 'join': {
      players.set(data.id, data.player)
      redraw()
      break
    }
    case 'leave': {
      players.delete(data.id)
      redraw()
      break
    }
    case 'update': {
      if (data.id !== playerId || data.time >= lastChangeTime) {
        players.set(data.id, data.player)
      }
      redraw()
      break
    }
    default:
      console.warn('what.', data)
  }
})

window.addEventListener('keydown', e => {
  const playerData = players.get(playerId)
  if (!playerData) return
  switch (e.key) {
    case 'ArrowLeft':
      playerData.x -= 0.05
      break
    case 'ArrowRight':
      playerData.x += 0.05
      break
    case 'ArrowUp':
      playerData.y -= 0.05
      break
    case 'ArrowDown':
      playerData.y += 0.05
      break
    default: return
  }
  lastChangeTime = Date.now()
  ws.send(JSON.stringify({
    type: 'update',
    changes: {
      x: playerData.x,
      y: playerData.y
    },
    time: lastChangeTime
  }))
  e.preventDefault()
})

const name = document.getElementById('name')
const input = document.getElementById('input')
const canvas = document.getElementById('canvas')
const c = canvas.getContext('2d')
let width, height

const commands = /\/colour #([0-9a-z]{6})|\/name (.+)/
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const match = commands.exec(input.value)
    const playerData = players.get(playerId)
    if (!playerData) return
    if (match) {
      const [, setColour, setName] = match
      let changes = {}
      if (setColour) {
        playerData.colour = setColour
        changes = { colour: setColour }
      }
      if (setName) {
        playerData.name = setName
        changes = { name: setName }
      }
      lastChangeTime = Date.now()
      ws.send(JSON.stringify({
        type: 'update',
        changes,
        time: lastChangeTime
      }))
    } else {
      ws.send(JSON.stringify({
        type: 'update',
        changes: {
          message: input.value
        },
        time: lastChangeTime
      }))
    }
    input.value = ''
    e.preventDefault()
  }
})

function resize () {
  width = window.innerWidth
  height = window.innerHeight
  const dpr = window.devicePixelRatio
  canvas.width = dpr * width
  canvas.height = dpr * height
  c.scale(dpr, dpr)
  redraw()
}
resize()

const radius = 20

function redraw () {
  c.clearRect(0, 0, width, height)
  for (const { x, y, name, colour, message } of players.values()) {
    const visX = x * (width - radius * 2) + radius
    const visY = y * (height - radius * 2) + radius
    c.fillStyle = '#' + colour
    c.beginPath()
    c.arc(visX, visY, radius, 0, 2 * Math.PI)
    c.fill()
    c.fillStyle = 'black'
    c.font = 'bold 12px serif'
    c.textBaseline = 'bottom'
    c.fillText(name, visX, visY)
    c.font = '12px serif'
    c.textBaseline = 'top'
    c.fillText(message, visX, visY)
  }
  const playerData = players.get(playerId)
  if (playerData) name.textContent = playerData.name
}

export { playerId, players }
