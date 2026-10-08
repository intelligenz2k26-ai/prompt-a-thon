/**
 * PROMPT ESCAPE ROOM - Neural Poster Rendering Engine
 * Simulates high-end AI image generation for Round 2 anti-drug campaign posters.
 * Dynamically synthesizes visual graphics, gradients, silhouettes, neon elements,
 * and typographic headlines based on the participant's prompt.
 */

class PosterEngine {
    static renderPoster(canvas, promptText, options = {}) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width || 600;
        const h = canvas.height || 840;

        const p = (promptText || '').toLowerCase();

        // 1. Dramatic Dark Ambient Background
        const bgGrad = ctx.createLinearGradient(0, 0, w * 0.4, h);
        if (p.includes('neon') || p.includes('cyber') || p.includes('future')) {
            bgGrad.addColorStop(0, '#0a0915');
            bgGrad.addColorStop(0.5, '#120d2c');
            bgGrad.addColorStop(1, '#051b2a');
        } else if (p.includes('light') || p.includes('hope') || p.includes('bright')) {
            bgGrad.addColorStop(0, '#0c1b29');
            bgGrad.addColorStop(0.6, '#1a2744');
            bgGrad.addColorStop(1, '#0f4c5c');
        } else {
            bgGrad.addColorStop(0, '#08080c');
            bgGrad.addColorStop(0.5, '#14121e');
            bgGrad.addColorStop(1, '#090d16');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Volumetric Glow & Light Beams
        const glow = ctx.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, w * 0.7);
        glow.addColorStop(0, 'rgba(0, 240, 255, 0.28)');
        glow.addColorStop(0.4, 'rgba(138, 43, 226, 0.18)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);

        // 3. Grid / Neural Lattice Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 30) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, h);
            ctx.stroke();
        }

        // 4. Central Graphic Symbolism (Shattered Drug / Chain vs Graduation / Wings / Shield)
        ctx.save();
        ctx.translate(w / 2, h * 0.44);

        // Halo / Aura of Hope
        ctx.beginPath();
        ctx.arc(0, -20, 110, 0, Math.PI * 2);
        const aura = ctx.createRadialGradient(0, -20, 20, 0, -20, 120);
        aura.addColorStop(0, 'rgba(0, 255, 136, 0.35)');
        aura.addColorStop(0.7, 'rgba(0, 240, 255, 0.15)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.fill();

        // Shattered Syringe / Addiction Symbol (Left side broken red)
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;

        // Broken pieces
        ctx.beginPath();
        ctx.moveTo(-110, 60);
        ctx.lineTo(-60, 10);
        ctx.lineTo(-40, 45);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-130, -30);
        ctx.lineTo(-80, -60);
        ctx.stroke();

        // Cross / Warning slash
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(-80, 0, 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-105, -25);
        ctx.lineTo(-55, 25);
        ctx.stroke();

        // Victorious Student Silhouette / Shield (Center-Right in Neon Cyan/Gold)
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';

        // Student Head & Graduation Cap
        ctx.beginPath();
        ctx.arc(30, -70, 24, 0, Math.PI * 2);
        ctx.fill();

        // Mortarboard cap
        ctx.beginPath();
        ctx.moveTo(30, -112);
        ctx.lineTo(65, -95);
        ctx.lineTo(30, -82);
        ctx.lineTo(-5, -95);
        ctx.closePath();
        ctx.fillStyle = '#00f0ff';
        ctx.fill();

        // Tassel
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(30, -97);
        ctx.lineTo(15, -80);
        ctx.stroke();

        // Silhouette Body rising forward
        ctx.beginPath();
        ctx.moveTo(30, -42);
        ctx.quadraticCurveTo(70, -25, 75, 70);
        ctx.lineTo(-15, 70);
        ctx.quadraticCurveTo(-10, -25, 30, -42);
        ctx.closePath();
        const bodyGrad = ctx.createLinearGradient(0, -40, 0, 70);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.5, '#00f0ff');
        bodyGrad.addColorStop(1, '#051329');
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Glowing Shield / Protective Energy Barrier
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, -120);
        ctx.lineTo(110, -90);
        ctx.quadraticCurveTo(120, 20, 0, 110);
        ctx.quadraticCurveTo(-120, 20, -110, -90);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();

        // 5. Poster Top Header: College Campaign Badge
        ctx.textAlign = 'center';
        ctx.font = '700 13px "Inter", "Rajdhani", sans-serif';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
        ctx.letterSpacing = '4px';
        ctx.fillText('COLLEGE YOUTH AWARENESS INITIATIVE • CAMPUS FOR LIFE', w / 2, 42);

        // Header Divider
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.15, 54);
        ctx.lineTo(w * 0.85, 54);
        ctx.stroke();

        // 6. Impactful Headline
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 20;
        ctx.font = '900 42px "Orbitron", "Outfit", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('BREAK THE CHAIN', w / 2, 115);

        ctx.font = '800 28px "Outfit", sans-serif';
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 14;
        ctx.fillText('CHOOSE YOUR FUTURE, NOT ADDICTION', w / 2, 155);

        // Subtitle bar
        ctx.shadowBlur = 0;
        ctx.font = '500 13px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText('Say NO to Drugs • Empower Your Potential • Lead With Purpose', w / 2, 185);

        // 7. Poster Lower Section / Call To Action Cards
        const cardY = h * 0.74;
        const cardW = w * 0.84;
        const cardH = 92;
        const cardX = (w - cardW) / 2;

        ctx.fillStyle = 'rgba(10, 15, 30, 0.75)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, cardX, cardY, cardW, cardH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.font = '700 14px "Rajdhani", sans-serif';
        ctx.fillStyle = '#ffb703';
        ctx.fillText('🛡️ STUDENT SUPPORT HELPLINE & PEER COUNSELING', cardX + 24, cardY + 30);

        ctx.font = '400 12px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('Strictly Confidential • 24/7 Wellness Desk • Zero Stigma Support Zone', cardX + 24, cardY + 54);
        ctx.fillText('Toll Free: 1800-CAMPUS-CARE | Room 204 Student Affairs Block', cardX + 24, cardY + 74);

        // 8. Footer Brand bar
        ctx.textAlign = 'center';
        ctx.font = '600 11px "Inter", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText('AI GENERATED POSTER PROMPT ENTRY • PROMPT ESCAPE ROOM 2026', w / 2, h - 30);

        // Outer Cyber Framing border
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, w - 20, h - 20);

        // Corner Cyber Brackets
        const len = 30;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 5;
        // Top Left
        ctx.beginPath(); ctx.moveTo(8, 8 + len); ctx.lineTo(8, 8); ctx.lineTo(8 + len, 8); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.moveTo(w - 8 - len, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8, 8 + len); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(8, h - 8 - len); ctx.lineTo(8, h - 8); ctx.lineTo(8 + len, h - 8); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(w - 8 - len, h - 8); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8, h - 8 - len); ctx.stroke();
    }

    static roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

window.PosterEngine = PosterEngine;
