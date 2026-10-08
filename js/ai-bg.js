/**
 * AI LOGOS ANIMATED BACKGROUND  v3
 * Draws real logo-accurate shapes on canvas:
 *   ✦ Gemini 4-pointed star (rainbow gradient)
 *   🐋 Claude whale (blue)
 *   🤖 Robot square face (orange-brown)
 *   ⬡ ChatGPT woven knot (white/cyan)
 *   ✳ Anthropic asterisk (orange-red)
 *   + Binary 0/1 digits drifting down
 */

(function () {
    'use strict';

    const CFG = {
        numLogos : 16,   // total floating logo particles
        numBits  : 50,   // binary digit particles
        speed    : 0.38,
    };

    /* ── LOGO DRAW FUNCTIONS ─────────────────────────────────
       draw(ctx, r) draws the logo centred at origin, radius r
    ────────────────────────────────────────────────────────── */

    /* 1. GEMINI — rainbow 4-pointed bezier star */
    function drawGemini(ctx, r) {
        const off = r * 0.30; // pinch amount
        ctx.save();
        // gradient fill
        const grd = ctx.createLinearGradient(-r, -r, r, r);
        grd.addColorStop(0,   '#4285F4');
        grd.addColorStop(0.33,'#EA4335');
        grd.addColorStop(0.66,'#FBBC05');
        grd.addColorStop(1,   '#34A853');
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo( off, -off,  off, -off,  r,  0);
        ctx.bezierCurveTo( off,  off,  off,  off,  0,  r);
        ctx.bezierCurveTo(-off,  off, -off,  off, -r,  0);
        ctx.bezierCurveTo(-off, -off, -off, -off,  0, -r);
        ctx.closePath();
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();
    }

    /* 2. CLAUDE — whale/dolphin silhouette */
    function drawClaude(ctx, r) {
        ctx.save();
        const s = r / 28; // scale factor
        ctx.scale(s, s);
        ctx.fillStyle = '#6B7FF0'; // Claude blue-purple
        ctx.beginPath();
        // body
        ctx.ellipse(0, 4, 22, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        // head bump
        ctx.beginPath();
        ctx.ellipse(-14, -2, 10, 9, -0.4, 0, Math.PI * 2);
        ctx.fill();
        // tail fin
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.bezierCurveTo(26, -12, 30, -10, 28, -4);
        ctx.bezierCurveTo(24, 0, 26, 8, 28, 12);
        ctx.bezierCurveTo(30, 18, 26, 16, 18, 8);
        ctx.closePath();
        ctx.fill();
        // top fin
        ctx.beginPath();
        ctx.moveTo(4, -8);
        ctx.bezierCurveTo(8, -22, 14, -20, 10, -8);
        ctx.closePath();
        ctx.fill();
        // eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-16, -4, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(-16, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /* 3. ROBOT — square pixelated face (like the image) */
    function drawRobot(ctx, r) {
        ctx.save();
        const s = r / 28;
        ctx.scale(s, s);
        // head (rounded square)
        ctx.fillStyle = '#C4754A';
        roundRectFill(ctx, -22, -20, 44, 38, 5);
        // eyes
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-14, -8, 9, 10);
        ctx.fillRect(5,   -8, 9, 10);
        // legs
        ctx.fillStyle = '#C4754A';
        ctx.fillRect(-16, 18, 9, 14);
        ctx.fillRect(7,   18, 9, 14);
        // arms (small stubs on sides)
        ctx.fillRect(-28, -4, 8, 10);
        ctx.fillRect( 20, -4, 8, 10);
        ctx.restore();
    }

    /* 4. CHATGPT — woven hexagonal knot */
    function drawChatGPT(ctx, r) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = r * 0.13;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Draw 6 overlapping petal curves (like the OpenAI logo)
        const petals = 6;
        for (let i = 0; i < petals; i++) {
            const a = (i / petals) * Math.PI * 2;
            const a2 = a + Math.PI / petals;
            ctx.beginPath();
            const x1 = Math.cos(a) * r * 0.55;
            const y1 = Math.sin(a) * r * 0.55;
            const x2 = Math.cos(a2) * r * 0.55;
            const y2 = Math.sin(a2) * r * 0.55;
            // outer arc
            const midA = a + Math.PI / petals;
            const cx = Math.cos(midA) * r;
            const cy = Math.sin(midA) * r;
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cx, cy, x2, y2);
            ctx.stroke();
        }
        // inner connecting ring
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /* 5. ANTHROPIC ASTERISK — spiky starburst */
    function drawAsterisk(ctx, r) {
        ctx.save();
        ctx.fillStyle = '#E05A38';
        const spokes = 10;
        ctx.beginPath();
        for (let i = 0; i < spokes * 2; i++) {
            const angle = (i / (spokes * 2)) * Math.PI * 2 - Math.PI / 2;
            const rad   = i % 2 === 0 ? r : r * 0.38;
            if (i === 0) ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
            else         ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /* 6. AI BRAIN — circuit left + organic right, purple→blue→orange gradient */
    function drawAIBrain(ctx, r) {
        ctx.save();
        const s = r / 32;
        ctx.scale(s, s);

        // gradient fill (purple top-left → blue center → orange bottom-right)
        const grd = ctx.createRadialGradient(-8, -10, 4, 0, 0, 50);
        grd.addColorStop(0,    '#9B59B6');
        grd.addColorStop(0.35, '#8B5CF6');
        grd.addColorStop(0.65, '#3B82F6');
        grd.addColorStop(1,    '#F97316');

        // ── LEFT HEMISPHERE (circuit-style) ──────────────────
        ctx.save();
        ctx.beginPath();
        // outer lobe shape, left side only
        ctx.moveTo(0, -28);
        ctx.bezierCurveTo(-4, -32, -14, -32, -22, -24);
        ctx.bezierCurveTo(-32, -14, -32, -4,  -30, 4);
        ctx.bezierCurveTo(-28, 14,  -20, 22,  -10, 26);
        ctx.bezierCurveTo(-4,  28,   0,  26,   0,  24);
        ctx.closePath();
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();

        // circuit lines on left half (white)
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth   = 2.2;
        ctx.lineCap     = 'round';
        // 3 horizontal branches
        const branches = [
            { y: -14, x1: -26, x2: -8,  dots: [-26, -17, -8] },
            { y:  -2, x1: -28, x2: -6,  dots: [-28, -16, -6] },
            { y:  12, x1: -24, x2: -8,  dots: [-24, -14, -8] },
        ];
        branches.forEach(({ y, x1, x2, dots }) => {
            ctx.beginPath();
            ctx.moveTo(x1, y); ctx.lineTo(x2, y);
            ctx.stroke();
            // vertical connector to centre spine
            ctx.beginPath();
            ctx.moveTo(x2, y); ctx.lineTo(-2, y);
            ctx.stroke();
            // dot endpoints
            dots.forEach(dx => {
                ctx.beginPath();
                ctx.arc(dx, y, 2.8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fill();
            });
        });
        // vertical spine on left
        ctx.beginPath();
        ctx.moveTo(-2, -20); ctx.lineTo(-2, 18);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth   = 1.4;
        ctx.stroke();
        ctx.restore();

        // ── RIGHT HEMISPHERE (organic folds) ─────────────────
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.bezierCurveTo( 4, -32,  14, -32,  22, -24);
        ctx.bezierCurveTo( 32, -14,  32,  -4,  30,  4);
        ctx.bezierCurveTo( 28,  14,  20,  22,  10,  26);
        ctx.bezierCurveTo(  4,  28,   0,  26,   0,  24);
        ctx.closePath();
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();

        // brain fold strokes on right
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.82)';
        ctx.lineWidth   = 2.4;
        ctx.lineCap     = 'round';
        // top fold
        ctx.beginPath();
        ctx.moveTo(6,  -18);
        ctx.bezierCurveTo(14, -24, 24, -18, 20, -10);
        ctx.stroke();
        // middle fold
        ctx.beginPath();
        ctx.moveTo(4,  -4);
        ctx.bezierCurveTo(14, -10, 26, -4,  22,  4);
        ctx.stroke();
        // bottom fold
        ctx.beginPath();
        ctx.moveTo(6,  10);
        ctx.bezierCurveTo(14,  4,  24, 10,  18, 18);
        ctx.stroke();
        ctx.restore();

        // centre dividing line
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(0, -28); ctx.lineTo(0, 24);
        ctx.stroke();
        ctx.restore();

        ctx.restore(); // scale
    }

    /* 7. COPILOT goggle face */
    function drawCopilot(ctx, r) {
        ctx.save();
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = r * 0.1;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(129,140,248,0.65)';
        ctx.beginPath(); ctx.ellipse(-r*0.28, -r*0.06, r*0.26, r*0.22, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( r*0.28, -r*0.06, r*0.26, r*0.22, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath();
        ctx.arc(0, r*0.22, r*0.32, 0.15, Math.PI - 0.15);
        ctx.strokeStyle = '#818cf8'; ctx.stroke();
        ctx.restore();
    }

    /* 8. LLAMA meta "M" */
    function drawLlama(ctx, r) {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = r * 0.14;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r, r * 0.6);
        ctx.lineTo(-r, -r * 0.6);
        ctx.lineTo(0, r * 0.15);
        ctx.lineTo(r, -r * 0.6);
        ctx.lineTo(r, r * 0.6);
        ctx.stroke();
        ctx.restore();
    }

    /* ── Helper: filled rounded rect ────────────────────────── */
    function roundRectFill(ctx, x, y, w, h, rad) {
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.lineTo(x + w - rad, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+rad);
        ctx.lineTo(x+w, y+h-rad);
        ctx.quadraticCurveTo(x+w, y+h, x+w-rad, y+h);
        ctx.lineTo(x+rad, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-rad);
        ctx.lineTo(x, y+rad);
        ctx.quadraticCurveTo(x, y, x+rad, y);
        ctx.closePath();
        ctx.fill();
    }

    /* ── LOGO CATALOGUE ─────────────────────────────────────── */
    const LOGOS = [
        { draw: drawGemini,   glow: '#4285F4', size: 22 },
        { draw: drawChatGPT,  glow: '#10b981', size: 22 },
        { draw: drawClaude,   glow: '#6B7FF0', size: 26 },
        { draw: drawRobot,    glow: '#C4754A', size: 26 },
        { draw: drawAsterisk, glow: '#E05A38', size: 22 },
        { draw: drawAIBrain,  glow: '#8B5CF6', size: 28 },
        { draw: drawGemini,   glow: '#EA4335', size: 18 },
        { draw: drawCopilot,  glow: '#818cf8', size: 20 },
        { draw: drawLlama,    glow: '#fbbf24', size: 20 },
        { draw: drawChatGPT,  glow: '#38bdf8', size: 18 },
        { draw: drawAsterisk, glow: '#ff6b35', size: 18 },
        { draw: drawClaude,   glow: '#93c5fd', size: 22 },
        { draw: drawAIBrain,  glow: '#F97316', size: 24 },
        { draw: drawRobot,    glow: '#fb923c', size: 20 },
        { draw: drawGemini,   glow: '#34A853', size: 26 },
        { draw: drawCopilot,  glow: '#a78bfa', size: 18 },
        { draw: drawAIBrain,  glow: '#a855f7', size: 22 },
        { draw: drawAsterisk, glow: '#ef4444', size: 20 },
    ];

    /* ── PARTICLE ───────────────────────────────────────────── */
    class LogoParticle {
        constructor(W, H, idx) {
            this.W = W; this.H = H;
            this.logo = LOGOS[idx % LOGOS.length];
            this.reset(true);
        }

        reset(initial) {
            this.x      = Math.random() * this.W;
            this.y      = initial ? Math.random() * this.H : -60;
            this.vy     = CFG.speed * (0.28 + Math.random() * 0.6);
            this.amp    = 30 + Math.random() * 70;
            this.freq   = 0.008 + Math.random() * 0.016;
            this.phase  = Math.random() * Math.PI * 2;
            this.alpha  = 0.18 + Math.random() * 0.28;
            this.r      = this.logo.size * (0.6 + Math.random() * 0.9);
            this.rot    = Math.random() * Math.PI * 2;
            this.drot   = (Math.random() - 0.5) * 0.006;
            this.tick   = 0;
            this.pulseT = Math.random() * Math.PI * 2;
        }

        update() {
            this.tick++;
            this.pulseT += 0.032;
            this.rot    += this.drot;
            // zigzag x
            this.x = this.x + Math.sin(this.tick * this.freq + this.phase) * 1.6;
            this.y += this.vy;
            if (this.y > this.H + 70) this.reset(false);
            if (this.x < -80) this.x = this.W + 30;
            if (this.x > this.W + 80) this.x = -30;
        }

        draw(ctx) {
            const pulse = 0.75 + 0.25 * Math.sin(this.pulseT);
            const a     = this.alpha * pulse;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rot);
            // outer glow pass
            ctx.shadowColor = this.logo.glow;
            ctx.shadowBlur  = 20 * pulse;
            ctx.globalAlpha = a * 0.35;
            this.logo.draw(ctx, this.r * 1.18);
            // crisp draw
            ctx.shadowBlur  = 10 * pulse;
            ctx.globalAlpha = a;
            this.logo.draw(ctx, this.r);
            ctx.restore();
        }
    }

    /* ── BINARY DIGIT PARTICLE ──────────────────────────────── */
    class BitParticle {
        constructor(W, H) {
            this.W = W; this.H = H;
            this.reset(true);
        }

        reset(initial) {
            this.x     = Math.random() * this.W;
            this.y     = initial ? Math.random() * this.H : -20;
            this.char  = Math.random() < 0.5 ? '0' : '1';
            this.vy    = CFG.speed * (0.6 + Math.random() * 1.1);
            this.freq  = 0.015 + Math.random() * 0.025;
            this.phase = Math.random() * Math.PI * 2;
            this.alpha = 0.08 + Math.random() * 0.18;
            this.size  = 10 + Math.random() * 9;
            this.tick  = 0;
            this.swapT = Math.floor(50 + Math.random() * 110);
        }

        update() {
            this.tick++;
            if (this.tick % this.swapT === 0) this.char = this.char === '0' ? '1' : '0';
            this.x = this.x + Math.sin(this.tick * this.freq + this.phase) * 0.9;
            this.y += this.vy;
            if (this.y > this.H + 30) this.reset(false);
        }

        draw(ctx) {
            ctx.save();
            ctx.font = `600 ${Math.round(this.size)}px 'JetBrains Mono',monospace`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha  = this.alpha;
            ctx.shadowColor  = '#38bdf8';
            ctx.shadowBlur   = 5;
            ctx.fillStyle    = '#7dd3fc';
            ctx.fillText(this.char, this.x, this.y);
            ctx.restore();
        }
    }

    /* ── CANVAS SETUP ───────────────────────────────────────── */
    function createCanvas() {
        let c = document.getElementById('ai-bg-canvas');
        if (c) return c;
        c = document.createElement('canvas');
        c.id = 'ai-bg-canvas';
        Object.assign(c.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh',
            pointerEvents: 'none', zIndex: '0',
        });
        document.body.insertBefore(c, document.body.firstChild);
        return c;
    }

    /* ── MAIN ───────────────────────────────────────────────── */
    function init() {
        const canvas = createCanvas();
        const ctx    = canvas.getContext('2d');
        let W = 0, H = 0, logos = [], bits = [];

        function resize() {
            W = canvas.width  = window.innerWidth;
            H = canvas.height = window.innerHeight;
            logos = Array.from({ length: CFG.numLogos }, (_, i) => new LogoParticle(W, H, i));
            bits  = Array.from({ length: CFG.numBits  }, ()    => new BitParticle(W, H));
        }

        function frame() {
            ctx.clearRect(0, 0, W, H);

            // subtle dot grid
            ctx.save();
            ctx.fillStyle = 'rgba(56,189,248,0.055)';
            for (let x = 0; x < W; x += 55) {
                for (let y = 0; y < H; y += 55) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();

            bits.forEach(b  => { b.update(); b.draw(ctx); });
            logos.forEach(l => { l.update(); l.draw(ctx); });

            requestAnimationFrame(frame);
        }

        window.addEventListener('resize', resize);
        resize();
        frame();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
