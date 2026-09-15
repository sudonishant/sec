/*
  ================================================================
  SEC SUPAUL TECHNICAL CLUB - INTERACTIVE CANVAS BACKGROUND
  Cyber Particle Network & Node Matrix Visualizer
  ================================================================
*/

class CyberCanvas {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 150 };
    this.particleCount = 65;
    
    this.init();
    this.animate();
    this.addListeners();
  }

  init() {
    this.resize();
    this.particles = [];
    
    // Create random particles
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: Math.random() * 2.5 + 1.5,
        color: Math.random() > 0.5 ? '#00f2fe' : '#7928ca'
      });
    }
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Handle Retina / HiDPI crispness
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  addListeners() {
    window.addEventListener('resize', () => this.resize());
    
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Update and draw particles
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Bounce on edges
      if (p.x < 0 || p.x > this.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.height) p.vy *= -1;

      // Mouse attraction / interaction
      if (this.mouse.x !== null) {
        let dx = this.mouse.x - p.x;
        let dy = this.mouse.y - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.mouse.radius) {
          let angle = Math.atan2(dy, dx);
          let force = (this.mouse.radius - dist) / this.mouse.radius;
          p.x -= Math.cos(angle) * force * 2;
          p.y -= Math.sin(angle) * force * 2;
        }
      }

      // Draw particle dot
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        let p2 = this.particles[j];
        let dx = p.x - p2.x;
        let dy = p.y - p2.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          let alpha = (1 - dist / 130) * 0.25;
          this.ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
          this.ctx.lineWidth = 0.8;
          this.ctx.stroke();
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CyberCanvas();
});
