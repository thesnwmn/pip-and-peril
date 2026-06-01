const canvas = document.createElement('canvas')
canvas.width = 390
canvas.height = 844
canvas.style.display = 'block'
canvas.style.margin = '0 auto'
document.body.style.margin = '0'
document.body.style.padding = '0'
document.body.style.backgroundColor = '#0d0d1a'
document.body.appendChild(canvas)

const ctx = canvas.getContext('2d')
if (ctx) {
  ctx.fillStyle = '#c8941e'
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Pip & Peril', canvas.width / 2, canvas.height / 2)
}
