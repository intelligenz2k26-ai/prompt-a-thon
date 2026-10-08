/**
 * PROMPT ESCAPE ROOM - Security CAPTCHA Engine
 * Renders an authentic distorted cyber-security token on an HTML5 canvas
 * with security noise, grid lines, wave distortion, and character rotation.
 */

class CaptchaEngine {
    constructor(canvasId, code = '7KQ9P') {
        this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
        this.code = code;
    }

    setCode(newCode) {
        this.code = newCode;
        this.render();
    }

    render() {
        if (!this.canvas) return;
        const ctx = this.canvas.getContext('2d');
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Background
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, width, height);

        // Security grid lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 1;
        const gridSize = 14;
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Random noise dots
        for (let i = 0; i < 90; i++) {
            const rx = Math.random() * width;
            const ry = Math.random() * height;
            const radius = Math.random() * 1.5 + 0.5;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 128, 0.3)';
            ctx.beginPath();
            ctx.arc(rx, ry, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Distortion wavy strike-through curves
        for (let c = 0; c < 3; c++) {
            ctx.strokeStyle = c === 0 ? 'rgba(0, 255, 136, 0.6)' : (c === 1 ? 'rgba(255, 0, 110, 0.5)' : 'rgba(0, 240, 255, 0.7)');
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(0, height * (0.3 + c * 0.2));
            const cp1x = width * 0.25;
            const cp1y = height * (0.1 + Math.random() * 0.8);
            const cp2x = width * 0.75;
            const cp2y = height * (0.1 + Math.random() * 0.8);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, width, height * (0.4 + c * 0.15));
            ctx.stroke();
        }

        // Render characters with distortion & angles
        const chars = this.code.split('');
        const charSpacing = (width - 60) / chars.length;
        ctx.font = 'bold 36px "Courier New", "Orbitron", monospace';
        ctx.textBaseline = 'middle';

        chars.forEach((char, i) => {
            ctx.save();
            const x = 35 + i * charSpacing + (Math.random() * 6 - 3);
            const y = height / 2 + (Math.random() * 8 - 4);
            const angle = (Math.random() * 28 - 14) * (Math.PI / 180);

            ctx.translate(x, y);
            ctx.rotate(angle);

            // Glow effect
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(char, 0, 0);

            // Subtle colored offset for chromatic aberration
            ctx.fillStyle = 'rgba(255, 0, 85, 0.7)';
            ctx.shadowBlur = 0;
            ctx.fillText(char, -1.5, 0.8);

            ctx.restore();
        });

        // Scanline overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        for (let y = 0; y < height; y += 4) {
            ctx.fillRect(0, y, width, 2);
        }

        // Cyber corner borders
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, width - 8, height - 8);
    }
}

window.CaptchaEngine = CaptchaEngine;
