// Floating sakura petals
const canvas = document.getElementById('petals');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener('resize', resize);
const PETAL_COUNT = 28;
const petals = [];

function randomPetal() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    size: 4 + Math.random() * 7,
    speedY: 0.4 + Math.random() * 0.8,
    speedX: (Math.random() - 0.5) * 0.5,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02,
    opacity: 0.3 + Math.random() * 0.5,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.005 + Math.random() * 0.01,
  };
}

for (let i = 0; i < PETAL_COUNT; i++) {
  const p = randomPetal();
  p.y = Math.random() * canvas.height; // scatter on load
  petals.push(p);
}

function drawPetal(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.opacity;
  // simple 5-petal flower shape scaled down as a single petal
  ctx.beginPath();
  ctx.ellipse(0, -p.size * 0.6, p.size * 0.35, p.size * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${330 + Math.random() * 20}, 90%, 78%)`;
  ctx.shadowColor = 'rgba(255,110,180,0.6)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of petals) {
    p.sway += p.swaySpeed;
    p.x += p.speedX + Math.sin(p.sway) * 0.4;
    p.y += p.speedY;
    p.rotation += p.rotSpeed;
    if (p.y > canvas.height + 20) {
      Object.assign(p, randomPetal());
    }
    drawPetal(p);
  }
  requestAnimationFrame(animate);
}

animate();