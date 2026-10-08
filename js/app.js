/**
 * PROMPT ESCAPE ROOM - Participant Application Engine
 * Handles participant registration, authentication, round timers,
 * interactive challenges, AI simulations, and vault lock animations.
 */

class ParticipantApp {
    constructor() {
        this.currentParticipant = null;
        this.activeRound = 1;
        this.timerInterval = null;
        this.remainingSeconds = 0;
        this.captchaEngine = null;
        
        this.initElements();
        this.bindEvents();
        this.checkExistingSession();
    }

    initElements() {
        // Sections
        this.authSection = document.getElementById('auth-section');
        this.escapeSection = document.getElementById('escape-section');
        
        // Forms & Tabs
        this.regForm = document.getElementById('registration-form');
        this.loginForm = document.getElementById('login-form');
        this.tabReg = document.getElementById('tab-reg-btn');
        this.tabLogin = document.getElementById('tab-login-btn');
        this.regBox = document.getElementById('reg-box');
        this.loginBox = document.getElementById('login-box');
        
        // Header HUD
        this.participantIdDisplay = document.getElementById('participant-id-display');
        this.participantNameDisplay = document.getElementById('participant-name-display');
        this.participantCollegeDisplay = document.getElementById('participant-college-display');
        this.timerDisplay = document.getElementById('vault-timer');
        this.lockVisual = document.getElementById('lock-dial-visual');
        this.lockGlyph = document.getElementById('lock-icon-glyph');
        this.progressBar = document.getElementById('level-progress-fill');
        this.levelProgressText = document.getElementById('progress-percentage-text');
        
        // Level Cards
        this.levelCards = {
            1: document.getElementById('level-card-1'),
            2: document.getElementById('level-card-2'),
            3: document.getElementById('level-card-3')
        };
        
        // Chambers
        this.chambers = {
            1: document.getElementById('chamber-round-1'),
            2: document.getElementById('chamber-round-2'),
            3: document.getElementById('chamber-round-3')
        };
        
        // Round 1 elements
        this.r1Canvas = document.getElementById('r1-captcha-canvas');
        this.r1PromptInput = document.getElementById('r1-prompt-input');
        this.r1SubmitBtn = document.getElementById('r1-submit-btn');
        this.r1AiTerminal = document.getElementById('r1-ai-terminal');
        this.r1TerminalOutput = document.getElementById('r1-terminal-output');
        this.r1QualityPct = document.getElementById('r1-quality-pct');
        this.r1QualityBadge = document.getElementById('r1-quality-badge');
        
        // Round 2 elements
        this.r2PromptInput = document.getElementById('r2-prompt-input');
        this.r2SubmitBtn = document.getElementById('r2-submit-btn');
        this.r2PosterCanvas = document.getElementById('r2-poster-canvas');
        this.r2GenerationOverlay = document.getElementById('r2-gen-overlay');
        this.r2QualityPct = document.getElementById('r2-quality-pct');
        this.r2QualityBadge = document.getElementById('r2-quality-badge');
        this.r2TerminalOutput = document.getElementById('r2-terminal-output');
        
        // Round 3 elements
        this.r3PromptInput = document.getElementById('r3-prompt-input');
        this.r3SubmitBtn = document.getElementById('r3-submit-btn');
        this.r3QualityPct = document.getElementById('r3-quality-pct');
        this.r3QualityBadge = document.getElementById('r3-quality-badge');
        this.r3TerminalOutput = document.getElementById('r3-terminal-output');
        
        // Celebration modal
        this.celebrationModal = document.getElementById('unlock-celebration-modal');
        this.celebrationTitle = document.getElementById('celebration-title');
        this.celebrationMsg = document.getElementById('celebration-msg');
        this.celebrationNextBtn = document.getElementById('celebration-next-btn');

        // Audio toggle
        this.audioBtn = document.getElementById('audio-toggle-btn');
    }

    bindEvents() {
        // Auth Tabs
        this.tabReg.addEventListener('click', () => this.switchAuthTab('reg'));
        this.tabLogin.addEventListener('click', () => this.switchAuthTab('login'));

        // Registration Submit
        this.regForm.addEventListener('submit', (e) => this.handleRegistration(e));

        // Login / Agent ID verify
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Level navigation clicks
        Object.keys(this.levelCards).forEach(roundNum => {
            const num = parseInt(roundNum, 10);
            this.levelCards[num].addEventListener('click', () => this.switchRound(num));
        });

        // Round Submissions
        this.r1SubmitBtn.addEventListener('click', () => this.submitRound1());
        this.r2SubmitBtn.addEventListener('click', () => this.submitRound2());
        this.r3SubmitBtn.addEventListener('click', () => this.submitRound3());

        // Live Prompt Quality Meters for all 3 Locks
        if (this.r1PromptInput) {
            this.r1PromptInput.addEventListener('input', () => this.updateR1QualityMeter());
        }
        if (this.r2PromptInput) {
            this.r2PromptInput.addEventListener('input', () => this.updateR2QualityMeter());
        }
        if (this.r3PromptInput) {
            this.r3PromptInput.addEventListener('input', () => this.updateR3QualityMeter());
        }

        // Modal Continue
        this.celebrationNextBtn.addEventListener('click', () => {
            this.celebrationModal.classList.add('hidden');
        });

        // Audio Toggle
        if (this.audioBtn) {
            this.audioBtn.addEventListener('click', () => {
                const muted = window.escapeSound.toggleMute();
                this.updateAudioButtonState(muted);
            });
            this.updateAudioButtonState(window.escapeSound.isMuted());
        }

        // Window resize / storage sync
        window.addEventListener('escape_room_data_changed', () => {
            if (this.currentParticipant) {
                const fresh = window.EscapeStorage.getParticipant(this.currentParticipant.id);
                if (fresh) {
                    this.currentParticipant = fresh;
                    this.renderParticipantState();
                }
            }
        });
    }

    updateAudioButtonState(muted) {
        if (!this.audioBtn) return;
        if (muted) {
            this.audioBtn.classList.add('muted');
            this.audioBtn.innerHTML = '🔇 <span class="hide-mobile">Audio: OFF</span>';
        } else {
            this.audioBtn.classList.remove('muted');
            this.audioBtn.innerHTML = '🔊 <span class="hide-mobile">Audio: ON</span>';
        }
    }

    switchAuthTab(type) {
        window.escapeSound.click();
        if (type === 'reg') {
            this.tabReg.classList.add('active');
            this.tabLogin.classList.remove('active');
            this.regBox.classList.remove('hidden');
            this.loginBox.classList.add('hidden');
        } else {
            this.tabLogin.classList.add('active');
            this.tabReg.classList.remove('active');
            this.loginBox.classList.remove('hidden');
            this.regBox.classList.add('hidden');
        }
    }

    handleRegistration(e) {
        e.preventDefault();
        window.escapeSound.click();

        const formData = {
            name: document.getElementById('reg-name').value,
            college: document.getElementById('reg-college').value,
            department: document.getElementById('reg-department').value,
            year: document.getElementById('reg-year').value,
            phone: document.getElementById('reg-phone').value,
            email: document.getElementById('reg-email').value
        };

        const participant = window.EscapeStorage.register(formData);
        window.escapeSound.unlock();

        this.showToast(`🎉 Registration Successful! Agent ID: ${participant.id}`, 'green');
        
        // Open the dedicated clearance pass page in a new window/tab for taking screenshot (SS)
        try {
            window.open(`pass.html?id=${encodeURIComponent(participant.id)}`, '_blank');
        } catch (err) {
            console.warn('Window open error', err);
        }

        // Show prominent success banner with direct button to view/screenshot pass and enter vault
        const successBox = document.getElementById('reg-success-banner');
        if (successBox) {
            successBox.innerHTML = `
                <div style="background: rgba(0, 255, 136, 0.12); border: 2px solid var(--green-glow); padding: 1.5rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; text-align: center; box-shadow: 0 0 25px rgba(0,255,136,0.25);">
                    <div style="font-size: 0.85rem; color: var(--green-glow); font-family: var(--font-tech); text-transform: uppercase; letter-spacing: 0.1em;">
                        AGENT CLEARANCE ISSUED
                    </div>
                    <div style="font-family: var(--font-mono); font-size: 2.2rem; font-weight: 800; color: #ffffff; margin: 0.35rem 0;">
                        ${participant.id}
                    </div>
                    <div style="font-size: 0.95rem; color: #cbd5e1; margin-bottom: 1.25rem;">
                        Welcome Agent <strong>${participant.name}</strong>! Your clearance pass has been generated.
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <a href="pass.html?id=${encodeURIComponent(participant.id)}" target="_blank" class="btn btn-outline" style="border-color: var(--amber-glow); color: #fff; font-weight: 700; width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: rgba(255,183,3,0.15);">
                            📸 OPEN & SCREENSHOT CLEARANCE PASS (SS) ↗
                        </a>
                        <button type="button" id="reg-auto-enter-btn" class="btn btn-green" style="width: 100%;">
                            🔓 ENTER ESCAPE VAULT NOW →
                        </button>
                    </div>
                </div>
            `;
            successBox.classList.remove('hidden');

            const autoEnterBtn = document.getElementById('reg-auto-enter-btn');
            if (autoEnterBtn) {
                autoEnterBtn.addEventListener('click', () => {
                    this.loginUser(participant);
                });
            }
        }

        // Fill login input as well
        document.getElementById('login-participant-id').value = participant.id;
    }

    handleLogin(e) {
        e.preventDefault();
        const idInput = document.getElementById('login-participant-id').value.trim();
        if (!idInput) return;

        const participant = window.EscapeStorage.getParticipant(idInput);
        if (!participant) {
            window.escapeSound.error();
            this.showToast('❌ Participant ID not found. Please register first!', 'red');
            return;
        }

        if (participant.status === 'Rejected') {
            window.escapeSound.error();
            this.showToast('⛔ Registration rejected by Admin.', 'red');
            return;
        }

        window.escapeSound.unlock();
        this.loginUser(participant);
    }

    loginUser(participant) {
        this.currentParticipant = participant;
        window.EscapeStorage.setCurrentUser(participant.id);
        
        this.authSection.classList.add('hidden');
        this.escapeSection.classList.remove('hidden');

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        
        this.renderParticipantState();
        
        // Select appropriate round
        if (participant.round3.status !== 'locked') {
            this.switchRound(3);
        } else if (participant.round2.status !== 'locked') {
            this.switchRound(2);
        } else {
            this.switchRound(1);
        }
    }

    checkExistingSession() {
        const storedId = window.EscapeStorage.getCurrentUser();
        if (storedId) {
            const p = window.EscapeStorage.getParticipant(storedId);
            if (p && p.status === 'Approved') {
                this.loginUser(p);
                return;
            }
        }
    }

    logout() {
        window.EscapeStorage.setCurrentUser(null);
        this.currentParticipant = null;
        clearInterval(this.timerInterval);
        this.escapeSection.classList.add('hidden');
        this.authSection.classList.remove('hidden');
        this.showToast('Logged out of Escape Vault', 'cyan');
    }

    renderParticipantState() {
        if (!this.currentParticipant) return;
        const p = this.currentParticipant;

        // HUD Info
        this.participantIdDisplay.textContent = p.id;
        this.participantNameDisplay.textContent = p.name;
        this.participantCollegeDisplay.textContent = `${p.college} • ${p.department} (${p.year})`;

        // Level Cards states
        this.updateLevelCardState(1, p.round1);
        this.updateLevelCardState(2, p.round2);
        this.updateLevelCardState(3, p.round3);

        // Calculate progress percentage
        let progress = 0;
        if (p.round1.status === 'completed') progress += 33.3;
        if (p.round2.status === 'completed') progress += 33.3;
        if (p.round3.status === 'completed') progress += 33.4;
        
        this.progressBar.style.width = `${progress}%`;
        this.levelProgressText.textContent = `${Math.round(progress)}% VAULT CLEARED`;

        // Render CAPTCHA for Round 1
        const userCode = window.EscapeStorage.getCaptchaForParticipant(p);
        if (this.r1Canvas) {
            if (!this.captchaEngine) {
                this.captchaEngine = new window.CaptchaEngine(this.r1Canvas, userCode);
            } else {
                this.captchaEngine.setCode(userCode);
            }
            this.captchaEngine.render();
        }

        // Populate Round 1 if submitted
        if (p.round1.prompt) {
            this.r1PromptInput.value = p.round1.prompt;
            this.r1PromptInput.disabled = true;
            this.r1SubmitBtn.disabled = true;
            this.r1SubmitBtn.textContent = '🔒 LOCK 1 CLEARED';
            const displayScore = p.round1.score && p.round1.score.total > 0 ? `${p.round1.score.total}/40` : '';
            this.r1TerminalOutput.innerHTML = `
                <div style="color: var(--green-glow);">✓ SCAN MATCH VERIFIED: <strong>${p.round1.aiOutput || userCode}</strong></div>
                <div style="color: var(--cyan-glow); font-size: 0.85rem; margin-top: 4px;">Verified Score: <strong>${displayScore}</strong> (Prompt Quality: ${p.round1.promptQualityScore || Math.round(((p.round1.score?.total || 38)/40)*100)}%)</div>
                <div style="color: var(--text-secondary); margin-top: 4px;">Time taken: ${Math.floor(p.round1.timeTakenSec / 60)}m ${p.round1.timeTakenSec % 60}s</div>
            `;
            if (this.r1QualityPct && this.r1QualityBadge) {
                this.r1QualityPct.textContent = `${p.round1.promptQualityScore || 85}%`;
                this.r1QualityPct.style.color = 'var(--green-glow)';
                this.r1QualityBadge.className = 'badge badge-green';
                this.r1QualityBadge.textContent = '✓ VERIFIED (≥ 75%)';
            }
        } else {
            this.updateR1QualityMeter();
        }

        // Populate Round 2 if submitted
        if (p.round2.prompt) {
            this.r2PromptInput.value = p.round2.prompt;
            this.r2PromptInput.disabled = true;
            this.r2SubmitBtn.disabled = true;
            this.r2SubmitBtn.textContent = '🔒 LEVEL 02 POSTER SUBMITTED';
            // Render poster on canvas
            if (this.r2PosterCanvas) {
                window.PosterEngine.renderPoster(this.r2PosterCanvas, p.round2.prompt);
            }
        }

        // Populate Round 3 if submitted
        if (p.round3.improvedPrompt) {
            this.r3PromptInput.value = p.round3.improvedPrompt;
            this.r3PromptInput.disabled = true;
            this.r3SubmitBtn.disabled = true;
            this.r3SubmitBtn.textContent = '🔒 FINAL PROMPT SUBMITTED';
            this.r3TerminalOutput.innerHTML = `
                <div style="color: var(--green-glow);">✓ PROMPT ENGINEERING VERIFIED & SUBMITTED FOR JURY REVIEW.</div>
                <div style="color: #cbd5e1; margin-top: 6px;">Evaluation criteria: Clarity, Specificity, Creativity, Improvement, and Output Quality (/50).</div>
            `;
        }
    }

    updateLevelCardState(levelNum, roundData) {
        const card = this.levelCards[levelNum];
        const statusEl = document.getElementById(`level-${levelNum}-status-tag`);
        if (!card || !statusEl) return;

        card.classList.remove('active', 'locked-card', 'unlocked-cleared');

        if (roundData.status === 'completed') {
            card.classList.add('unlocked-cleared');
            statusEl.innerHTML = '🔓 <span style="color: var(--green-glow);">CLEARED</span>';
        } else if (roundData.status === 'unlocked') {
            statusEl.innerHTML = '⚡ <span style="color: var(--cyan-glow);">ACTIVE CHAMBER</span>';
        } else {
            card.classList.add('locked-card');
            statusEl.innerHTML = '🔒 <span style="color: var(--text-muted);">LOCKED</span>';
        }
    }

    switchRound(roundNum) {
        if (!this.currentParticipant) return;
        const p = this.currentParticipant;
        const roundData = p[`round${roundNum}`];

        // Check if locked
        if (roundData.status === 'locked') {
            window.escapeSound.error();
            if (roundNum === 2) {
                this.showToast('🔒 Chamber 2 is locked! Only Top 5 candidates selected from Round 1 unlock this.', 'amber');
            } else if (roundNum === 3) {
                this.showToast('🔒 Chamber 3 is locked! Only Top 10 finalists selected from Round 2 unlock this.', 'amber');
            }
            return;
        }

        window.escapeSound.gearTurn();
        this.activeRound = roundNum;

        // Update cards highlight
        Object.keys(this.levelCards).forEach(num => {
            this.levelCards[num].classList.remove('active');
        });
        this.levelCards[roundNum].classList.add('active');

        // Toggle chambers visibility
        Object.keys(this.chambers).forEach(num => {
            this.chambers[num].classList.add('hidden');
        });
        this.chambers[roundNum].classList.remove('hidden');

        // Render appropriate canvas & refresh quality meters
        if (roundNum === 1) {
            this.updateR1QualityMeter();
            setTimeout(() => {
                const userCode = window.EscapeStorage.getCaptchaForParticipant(this.currentParticipant);
                if (this.captchaEngine) {
                    this.captchaEngine.setCode(userCode);
                    this.captchaEngine.render();
                } else if (this.r1Canvas) {
                    this.captchaEngine = new window.CaptchaEngine(this.r1Canvas, userCode);
                    this.captchaEngine.render();
                }
            }, 50);
        } else if (roundNum === 2) {
            this.updateR2QualityMeter();
            setTimeout(() => {
                if (this.r2PosterCanvas) {
                    window.PosterEngine.renderPoster(this.r2PosterCanvas, roundData.prompt || 'anti-drug college awareness poster');
                }
            }, 50);
        } else if (roundNum === 3) {
            this.updateR3QualityMeter();
        }

        // Start countdown timer for this round if not completed
        this.setupRoundTimer(roundNum, roundData);
    }

    setupRoundTimer(roundNum, roundData) {
        clearInterval(this.timerInterval);

        if (roundData.status === 'completed') {
            this.timerDisplay.textContent = 'COMPLETED';
            this.timerDisplay.classList.remove('danger');
            this.lockVisual.classList.add('unlocked');
            this.lockGlyph.textContent = '🔓';
            return;
        }

        this.lockVisual.classList.remove('unlocked');
        this.lockGlyph.textContent = '🔐';

        const settings = window.EscapeStorage.getSettings();
        let limit = settings[`r${roundNum}TimeLimit`] || (roundNum === 1 ? 5 * 60 : 10 * 60);

        // If timeTakenSec was partially recorded or fresh
        this.remainingSeconds = limit - (roundData.timeTakenSec || 0);
        if (this.remainingSeconds <= 0) this.remainingSeconds = limit;

        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.remainingSeconds--;
            if (this.remainingSeconds <= 0) {
                clearInterval(this.timerInterval);
                this.remainingSeconds = 0;
                this.timerDisplay.textContent = '00:00';
                this.timerDisplay.classList.add('danger');
                window.escapeSound.error();
                this.showToast('⚠️ Time Expired! Auto-submitting chamber prompt...', 'red');
                if (roundNum === 1) this.submitRound1();
                else if (roundNum === 2) this.submitRound2();
                else if (roundNum === 3) this.submitRound3();
            } else {
                this.updateTimerDisplay();
                // Audio tick on last 30 seconds
                if (this.remainingSeconds <= 30) {
                    window.escapeSound.tick();
                }
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const m = Math.floor(this.remainingSeconds / 60);
        const s = this.remainingSeconds % 60;
        this.timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        
        if (this.remainingSeconds < 120) {
            this.timerDisplay.classList.add('danger');
        } else {
            this.timerDisplay.classList.remove('danger');
        }
    }

    // ==========================================
    // ROUND 1: CAPTCHA PROMPT SUBMISSION & 75% QUALITY EVALUATION
    // ==========================================
    evaluateRound1Prompt(promptText) {
        const text = (promptText || '').trim();
        if (!text) {
            return {
                percentage: 0,
                passed: false,
                breakdown: { persona: 0, directive: 0, context: 0, format: 0, depth: 0 },
                feedback: ['Please write an engineered AI prompt to identify the distorted security token.']
            };
        }

        const lower = text.toLowerCase();
        const words = text.split(/\s+/).filter(Boolean);
        const wordCount = words.length;

        // 1. Role / Persona (up to 20%)
        let personaScore = 0;
        const personaStrong = ['optical character recognition', 'ocr expert', 'ocr specialist', 'computer vision', 'vision model', 'image analyst', 'image recognition', 'expert transcriber'];
        const personaGeneral = ['ocr', 'expert', 'specialist', 'ai', 'model', 'assistant', 'system', 'agent', 'analyst', 'you are', 'act as'];
        if (personaStrong.some(k => lower.includes(k))) {
            personaScore = 20;
        } else if (personaGeneral.some(k => lower.includes(k))) {
            personaScore = 12;
        }

        // 2. Task Directive & Action Verbs (up to 20%)
        let directiveScore = 0;
        const actionStrong = ['extract', 'transcribe', 'decode', 'identify', 'recognize', 'read', 'parse', 'detect', 'inspect', 'analyze'];
        const actionMatches = actionStrong.filter(k => lower.includes(k)).length;
        if (actionMatches >= 2) directiveScore = 20;
        else if (actionMatches === 1) directiveScore = 14;

        // 3. Target Context & Description (up to 20%)
        let contextScore = 0;
        const contextKeywords = ['captcha', 'distort', 'security', 'token', 'noise', 'code', '5-character', '5 character', 'character', 'letter', 'digit', 'alphanumeric', 'badge', 'image'];
        const contextMatches = contextKeywords.filter(k => lower.includes(k)).length;
        if (contextMatches >= 3) contextScore = 20;
        else if (contextMatches >= 2) contextScore = 14;
        else if (contextMatches >= 1) contextScore = 8;

        // 4. Formatting Constraints & Output Rules (up to 20%)
        let formatScore = 0;
        const formatKeywords = ['only', 'uppercase', 'verbatim', 'exact', 'no space', 'without explanation', 'format', 'raw', 'just the', 'do not include', 'single line', 'output', 'return'];
        const formatMatches = formatKeywords.filter(k => lower.includes(k)).length;
        if (formatMatches >= 3) formatScore = 20;
        else if (formatMatches >= 2) formatScore = 15;
        else if (formatMatches >= 1) formatScore = 10;

        // 5. Structure, Length & Depth (up to 20%)
        // Casual phrases like "hii", "hello" score 0
        let depthScore = 0;
        if (wordCount >= 22) depthScore = 20;
        else if (wordCount >= 16) depthScore = 14;
        else if (wordCount >= 9) depthScore = 8;
        else depthScore = 0;

        const totalPercentage = personaScore + directiveScore + contextScore + formatScore + depthScore;
        const passed = totalPercentage >= 50;

        const feedback = [];
        if (personaScore < 12) feedback.push('Define an expert persona (e.g. "You are an optical character recognition expert...")');
        if (directiveScore < 14) feedback.push('Include clear action verbs (e.g. "Carefully inspect, read, and extract...")');
        if (contextScore < 14) feedback.push('Describe the target image context (e.g. "the distorted 5-character CAPTCHA security token...")');
        if (formatScore < 14) feedback.push('Add output format constraints (e.g. "Output ONLY the exact uppercase characters with no spaces or explanation")');
        if (depthScore < 14) feedback.push('Provide a structured prompt with sufficient depth (avoid casual 1-2 word inputs like "hii")');

        return {
            percentage: totalPercentage,
            passed: passed,
            breakdown: {
                persona: personaScore,
                directive: directiveScore,
                context: contextScore,
                format: formatScore,
                depth: depthScore
            },
            feedback: feedback
        };
    }

    updateR1QualityMeter() {
        if (!this.r1PromptInput || !this.r1QualityPct || !this.r1QualityBadge) return;
        const text = this.r1PromptInput.value.trim();
        const evalResult = this.evaluateRound1Prompt(text);
        
        this.r1QualityPct.textContent = `${evalResult.percentage}%`;
        if (evalResult.passed) {
            this.r1QualityPct.style.color = 'var(--green-glow)';
            this.r1QualityBadge.className = 'badge badge-green';
            this.r1QualityBadge.textContent = `✓ VERIFIED (${evalResult.percentage}% ≥ 50%)`;
        } else if (evalResult.percentage >= 30) {
            this.r1QualityPct.style.color = 'var(--amber-glow)';
            this.r1QualityBadge.className = 'badge badge-amber';
            this.r1QualityBadge.textContent = `⚠️ ${evalResult.percentage}% (NEED ≥ 50%)`;
        } else {
            this.r1QualityPct.style.color = '#ff5252';
            this.r1QualityBadge.className = 'badge badge-red';
            this.r1QualityBadge.textContent = `❌ ${evalResult.percentage}% (NEED ≥ 50%)`;
        }
    }

    submitRound1() {
        const promptVal = this.r1PromptInput.value.trim();
        if (!promptVal) {
            window.escapeSound.error();
            this.showToast('⚠️ Please write an AI prompt to decrypt the CAPTCHA code!', 'amber');
            return;
        }

        const evalResult = this.evaluateRound1Prompt(promptVal);
        const userCode = window.EscapeStorage.getCaptchaForParticipant(this.currentParticipant);

        // Strict 50% quality gate check (50% to 100% allowed, casual 'hii' blocked)
        if (!evalResult.passed) {
            window.escapeSound.error();
            const feedbackHtml = evalResult.feedback.map(f => `<div style="color: #fca5a5;">• ${f}</div>`).join('');
            
            this.r1TerminalOutput.innerHTML = `
                <div style="color: var(--red-alert); font-weight: 700; font-size: 0.95rem;">
                    ⛔ PROMPT QUALITY: ${evalResult.percentage}% (MINIMUM 50% REQUIRED)
                </div>
                <div style="color: #f87171; margin: 4px 0; font-size: 0.85rem;">
                    [ERROR: PROMPT FAILED QUALITY VERIFICATION]
                </div>
                <div style="color: #cbd5e1; font-size: 0.82rem; margin-top: 6px;">
                    Lock remains sealed! Basic inputs like "hii" or casual text cannot unlock the system. Prompt must reach between <strong>50% – 100%</strong> engineering quality.
                </div>
                <div style="margin-top: 8px; font-size: 0.8rem; background: rgba(0,0,0,0.5); padding: 0.6rem; border-radius: 4px; border-left: 3px solid var(--red-alert);">
                    <div style="color: var(--amber-glow); font-weight: 700; margin-bottom: 3px;">CHECKLIST TO REACH 50%:</div>
                    ${feedbackHtml}
                </div>
            `;
            this.showToast(`⛔ Prompt Score: ${evalResult.percentage}% — Minimum 50% required to submit!`, 'red');
            return;
        }

        window.escapeSound.gearTurn();
        this.r1SubmitBtn.disabled = true;
        this.r1SubmitBtn.innerHTML = '⚡ DECRYPTING IMAGE WITH AI...';

        const settings = window.EscapeStorage.getSettings();

        // Simulate AI terminal decryption
        this.r1TerminalOutput.innerHTML = `
            <div style="color: var(--cyan-glow);">Connecting to Neural Vision Core...</div>
            <div style="color: var(--text-secondary); margin: 4px 0;">Analyzing security image contours & distortion filters...</div>
            <div style="color: var(--green-glow); font-size: 0.85rem; margin-top: 4px;">✓ Prompt engineering verification: ${evalResult.percentage}% (PASSED ≥ 50%)</div>
        `;

        setTimeout(() => {
            window.escapeSound.unlock();
            const timeTaken = Math.max(15, settings.r1TimeLimit - this.remainingSeconds);

            // Compute exact rubric scores out of 40:
            const b = evalResult.breakdown;
            const scoreQuality = Math.min(10, Math.round((b.persona + b.depth) / 4));
            const scoreCorrectness = Math.min(10, Math.round((b.directive + b.context) / 4));
            const scoreCreativity = Math.min(10, Math.round((b.format + b.directive) / 4));
            const scoreTime = timeTaken < 120 ? 10 : (timeTaken < 240 ? 9 : 8);
            const scoreTotal = Math.min(40, scoreQuality + scoreCorrectness + scoreCreativity + scoreTime);

            this.r1TerminalOutput.innerHTML = `
                <div style="color: var(--green-glow); font-weight: 700; font-size: 1rem;">
                    🔓 LOCK UNLOCKED! AI OUTPUT: <span style="font-family: var(--font-mono); color: #fff;">${userCode}</span>
                </div>
                <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 4px;">
                    Target token accurately identified! Quality Score: <strong style="color: var(--cyan-glow);">${evalResult.percentage}%</strong> | Marks: <strong style="color: var(--green-glow);">${scoreTotal}/40</strong>
                </div>
            `;

            // Update participant record with verified score and unique captcha code
            this.currentParticipant = window.EscapeStorage.updateParticipant(this.currentParticipant.id, {
                round1: {
                    ...this.currentParticipant.round1,
                    status: 'completed',
                    captchaCode: userCode,
                    prompt: promptVal,
                    aiOutput: userCode,
                    promptQualityScore: evalResult.percentage,
                    timeTakenSec: timeTaken,
                    submittedAt: new Date().toISOString(),
                    score: {
                        quality: scoreQuality,
                        correctness: scoreCorrectness,
                        creativity: scoreCreativity,
                        time: scoreTime,
                        total: scoreTotal
                    },
                    evaluated: true,
                    evalStatus: scoreTotal >= 36 ? 'selected' : 'pending'
                }
            });

            this.showCelebration(
                '🎉 LOCK 1 UNLOCKED!',
                `Awesome job Agent! Your engineered prompt scored ${evalResult.percentage}% (Marks: ${scoreTotal}/40) and cracked your security lock (Output: ${userCode}). Your score is recorded on the Admin Matrix!`,
                'PROCEED TO NEXT CHAMBER'
            );

            this.renderParticipantState();
            clearInterval(this.timerInterval);
        }, 1400);
    }

    // ==========================================
    // ROUND 2: PROBLEM STATEMENT -> POSTER PROMPT QUALITY EVALUATION (≥ 50%)
    // ==========================================
    evaluateRound2Prompt(promptText) {
        const text = (promptText || '').trim();
        if (!text) {
            return {
                percentage: 0,
                passed: false,
                breakdown: { theme: 0, audience: 0, composition: 0, style: 0, depth: 0 },
                feedback: ['Please enter an engineered image generation prompt for the anti-drug awareness poster.']
            };
        }

        const lower = text.toLowerCase();
        const words = text.split(/\s+/).filter(Boolean);
        const wordCount = words.length;

        // 1. Anti-Drug Campaign Theme & Core Message (up to 20%)
        let themeScore = 0;
        const themeKeywords = [
            'anti-drug', 'drug', 'addiction', 'substance', 'narcotic', 'say no', 'break the chain', 
            'awareness', 'recovery', 'clean', 'sober', 'healthy', 'future', 'dreams', 'choice', 
            'prevention', 'harmful', 'life', 'rehab', 'hope', 'overcome'
        ];
        const themeMatches = themeKeywords.filter(k => lower.includes(k)).length;
        if (themeMatches >= 2) themeScore = 20;
        else if (themeMatches === 1) themeScore = 12;

        // 2. Target Audience & Campus Context (up to 20%)
        let audienceScore = 0;
        const audienceKeywords = [
            'college', 'campus', 'student', 'youth', 'university', 'teen', 'young', 
            'peers', 'classroom', 'generation', 'academic', 'education'
        ];
        const audienceMatches = audienceKeywords.filter(k => lower.includes(k)).length;
        if (audienceMatches >= 2) audienceScore = 20;
        else if (audienceMatches === 1) audienceScore = 12;

        // 3. Visual Subject & Metaphorical Contrast (up to 20%)
        let compScore = 0;
        const compKeywords = [
            'silhouette', 'contrast', 'shadow', 'light', 'split', 'hands', 'chain', 'broken', 
            'face', 'figure', 'path', 'isolated', 'darkness', 'horizon', 'metaphor', 'expression',
            'crossroad', 'symbol', 'reflection'
        ];
        const compMatches = compKeywords.filter(k => lower.includes(k)).length;
        if (compMatches >= 2) compScore = 20;
        else if (compMatches === 1) compScore = 12;

        // 4. Artistic Style, Rendering & Typography (up to 20%)
        let styleScore = 0;
        const styleKeywords = [
            'poster', 'cinematic', 'octane render', 'dramatic lighting', 'hyperrealistic', 
            'graphic design', 'typography', 'headline', 'minimalist', 'bold', 'neon', 
            'photorealistic', '8k', 'illustration', 'vector', 'visual', 'composition', 
            'color palette', 'vibrant', 'textured'
        ];
        const styleMatches = styleKeywords.filter(k => lower.includes(k)).length;
        if (styleMatches >= 2) styleScore = 20;
        else if (styleMatches === 1) styleScore = 12;

        // 5. Structure, Length & Depth (up to 20%)
        // Casual phrases like "hii", "make poster" score 0
        let depthScore = 0;
        if (wordCount >= 25) depthScore = 20;
        else if (wordCount >= 18) depthScore = 14;
        else if (wordCount >= 10) depthScore = 8;
        else depthScore = 0;

        const totalPercentage = themeScore + audienceScore + compScore + styleScore + depthScore;
        const passed = totalPercentage >= 50;

        const feedback = [];
        if (themeScore < 12) feedback.push('Emphasize the Anti-Drug theme & message (e.g. "anti-drug campaign, break the chain, say no to drugs...")');
        if (audienceScore < 12) feedback.push('Target college campus youth (e.g. "college students, campus youth, vibrant future...")');
        if (compScore < 12) feedback.push('Describe the visual composition (e.g. "dark silhouette with breaking chains transitioning into bright light...")');
        if (styleScore < 12) feedback.push('Specify art style and typography (e.g. "cinematic octane render, dramatic volumetric lighting, bold typography...")');
        if (depthScore < 14) feedback.push('Provide descriptive prompt depth (avoid short 1-2 word phrases like "hii")');

        return {
            percentage: totalPercentage,
            passed: passed,
            breakdown: {
                theme: themeScore,
                audience: audienceScore,
                composition: compScore,
                style: styleScore,
                depth: depthScore
            },
            feedback: feedback
        };
    }

    updateR2QualityMeter() {
        if (!this.r2PromptInput || !this.r2QualityPct || !this.r2QualityBadge) return;
        const text = this.r2PromptInput.value.trim();
        const evalResult = this.evaluateRound2Prompt(text);
        
        this.r2QualityPct.textContent = `${evalResult.percentage}%`;
        if (evalResult.passed) {
            this.r2QualityPct.style.color = 'var(--green-glow)';
            this.r2QualityBadge.className = 'badge badge-green';
            this.r2QualityBadge.textContent = `✓ VERIFIED (${evalResult.percentage}% ≥ 50%)`;
        } else if (evalResult.percentage >= 30) {
            this.r2QualityPct.style.color = 'var(--amber-glow)';
            this.r2QualityBadge.className = 'badge badge-amber';
            this.r2QualityBadge.textContent = `⚠️ ${evalResult.percentage}% (NEED ≥ 50%)`;
        } else {
            this.r2QualityPct.style.color = '#ff5252';
            this.r2QualityBadge.className = 'badge badge-red';
            this.r2QualityBadge.textContent = `❌ ${evalResult.percentage}% (NEED ≥ 50%)`;
        }
    }

    submitRound2() {
        const promptVal = this.r2PromptInput.value.trim();
        if (!promptVal) {
            window.escapeSound.error();
            this.showToast('⚠️ Please enter an AI image generation prompt for the anti-drug awareness poster!', 'amber');
            return;
        }

        const evalResult = this.evaluateRound2Prompt(promptVal);

        // Strict 50% quality gate check (50% to 100% allowed, casual 'hii' blocked)
        if (!evalResult.passed) {
            window.escapeSound.error();
            const feedbackHtml = evalResult.feedback.map(f => `<div style="color: #fca5a5;">• ${f}</div>`).join('');
            
            if (this.r2TerminalOutput) {
                this.r2TerminalOutput.innerHTML = `
                    <div style="color: var(--red-alert); font-weight: 700; font-size: 0.95rem;">
                        ⛔ PROMPT QUALITY: ${evalResult.percentage}% (MINIMUM 50% REQUIRED)
                    </div>
                    <div style="color: #f87171; margin: 4px 0; font-size: 0.85rem;">
                        [ERROR: PROMPT FAILED QUALITY VERIFICATION]
                    </div>
                    <div style="color: #cbd5e1; font-size: 0.82rem; margin-top: 6px;">
                        Lock remains sealed! Casual inputs like "hii" or off-topic prompts cannot unlock Chamber 2. Prompt must reach between <strong>50% – 100%</strong> quality targeting the anti-drug campus campaign poster.
                    </div>
                    <div style="margin-top: 8px; font-size: 0.8rem; background: rgba(0,0,0,0.5); padding: 0.6rem; border-radius: 4px; border-left: 3px solid var(--red-alert);">
                        <div style="color: var(--amber-glow); font-weight: 700; margin-bottom: 3px;">CHECKLIST TO REACH 50%:</div>
                        ${feedbackHtml}
                    </div>
                `;
            }
            this.showToast(`⛔ Prompt Score: ${evalResult.percentage}% — Minimum 50% required to submit!`, 'red');
            return;
        }

        window.escapeSound.gearTurn();
        this.r2SubmitBtn.disabled = true;
        this.r2SubmitBtn.innerHTML = '🎨 RENDERING POSTER WITH AI...';
        
        // Show generation animation overlay on canvas
        if (this.r2GenerationOverlay) {
            this.r2GenerationOverlay.classList.remove('hidden');
        }

        if (this.r2TerminalOutput) {
            this.r2TerminalOutput.innerHTML = `
                <div style="color: var(--amber-glow);">Synthesizing poster prompt through AI Neural Diffusion...</div>
                <div style="color: var(--text-secondary); margin: 4px 0;">Evaluating campaign theme, dramatic contrast & college visual metaphors...</div>
                <div style="color: var(--green-glow); font-size: 0.85rem; margin-top: 4px;">✓ Prompt engineering verification: ${evalResult.percentage}% (PASSED ≥ 50%)</div>
            `;
        }

        setTimeout(() => {
            // Render poster on canvas
            if (this.r2PosterCanvas) {
                window.PosterEngine.renderPoster(this.r2PosterCanvas, promptVal);
            }
            if (this.r2GenerationOverlay) {
                this.r2GenerationOverlay.classList.add('hidden');
            }

            window.escapeSound.unlock();
            const settings = window.EscapeStorage.getSettings();
            const timeTaken = Math.max(15, settings.r2TimeLimit - this.remainingSeconds);

            // Compute rubric scores out of 40:
            const b = evalResult.breakdown;
            const scorePromptQuality = Math.min(10, Math.round((b.theme + b.depth) / 4));
            const scoreUnderstanding = Math.min(10, Math.round((b.theme + b.audience) / 4));
            const scoreCreativity = Math.min(10, Math.round((b.composition + b.style) / 4));
            const scoreImageQuality = Math.min(10, Math.round((b.style + b.depth) / 4));
            const scoreTotal = Math.min(40, scorePromptQuality + scoreUnderstanding + scoreCreativity + scoreImageQuality);

            if (this.r2TerminalOutput) {
                this.r2TerminalOutput.innerHTML = `
                    <div style="color: var(--green-glow); font-weight: 700; font-size: 1rem;">
                        🔓 CHAMBER 2 UNLOCKED! POSTER SYNTHESIZED
                    </div>
                    <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 4px;">
                        Poster generated! Quality Score: <strong style="color: var(--amber-glow);">${evalResult.percentage}%</strong> | Marks: <strong style="color: var(--green-glow);">${scoreTotal}/40</strong>
                    </div>
                `;
            }

            this.currentParticipant = window.EscapeStorage.updateParticipant(this.currentParticipant.id, {
                round2: {
                    ...this.currentParticipant.round2,
                    status: 'completed',
                    prompt: promptVal,
                    promptQualityScore: evalResult.percentage,
                    timeTakenSec: timeTaken,
                    submittedAt: new Date().toISOString(),
                    score: {
                        promptQuality: scorePromptQuality,
                        understanding: scoreUnderstanding,
                        creativity: scoreCreativity,
                        imageQuality: scoreImageQuality,
                        total: scoreTotal
                    },
                    evaluated: true,
                    evalStatus: scoreTotal >= 34 ? 'selected' : 'pending'
                }
            });

            this.showCelebration(
                '🎉 LEVEL 02 UNLOCKED!',
                `Poster synthesized and submitted! Your engineered prompt scored ${evalResult.percentage}% (Marks: ${scoreTotal}/40). The Admin jury is reviewing your poster. Shortlisted candidates unlock Chamber 3!`,
                'CONTINUE'
            );

            this.renderParticipantState();
            clearInterval(this.timerInterval);
        }, 1600);
    }

    // ==========================================
    // ROUND 3: FIX THE BAD PROMPT QUALITY EVALUATION (≥ 50%)
    // ==========================================
    evaluateRound3Prompt(promptText) {
        const text = (promptText || '').trim();
        if (!text) {
            return {
                percentage: 0,
                passed: false,
                breakdown: { persona: 0, features: 0, design: 0, tech: 0, depth: 0 },
                feedback: ['Please engineer a detailed prompt to replace "Make a good college website".']
            };
        }

        const lower = text.toLowerCase();
        const words = text.split(/\s+/).filter(Boolean);
        const wordCount = words.length;

        // 1. Role / Persona & Task Directive (up to 20%)
        let personaScore = 0;
        const personaKeywords = [
            'senior web developer', 'ui/ux designer', 'software architect', 'frontend engineer', 
            'expert developer', 'act as', 'expert', 'create', 'develop', 'build', 'design', 
            'engineer', 'code', 'generate', 'professional'
        ];
        const personaMatches = personaKeywords.filter(k => lower.includes(k)).length;
        if (personaMatches >= 2) personaScore = 20;
        else if (personaMatches === 1) personaScore = 12;

        // 2. Core Symposium Features & Sections (up to 20%)
        let featuresScore = 0;
        const featuresKeywords = [
            'registration', 'register', 'events', 'schedule', 'timeline', 'gallery', 
            'contact', 'sponsors', 'rules', 'faq', 'about', 'leaderboard', 'coordinator', 
            'prizes', 'speakers', 'countdown', 'section'
        ];
        const featuresMatches = featuresKeywords.filter(k => lower.includes(k)).length;
        if (featuresMatches >= 3) featuresScore = 20;
        else if (featuresMatches >= 2) featuresScore = 15;
        else if (featuresMatches >= 1) featuresScore = 8;

        // 3. UI/UX Design Aesthetics & Theme (up to 20%)
        let designScore = 0;
        const designKeywords = [
            'responsive', 'mobile-friendly', 'dark mode', 'glassmorphism', 'cyberpunk', 
            'modern', 'minimalist', 'animations', 'interactive', 'navbar', 'hero section', 
            'footer', 'color palette', 'typography', 'gradient', 'card', 'layout'
        ];
        const designMatches = designKeywords.filter(k => lower.includes(k)).length;
        if (designMatches >= 2) designScore = 20;
        else if (designMatches === 1) designScore = 12;

        // 4. Technical Stack & Implementation Constraints (up to 20%)
        let techScore = 0;
        const techKeywords = [
            'html', 'css', 'javascript', 'semantic html5', 'form validation', 'seo', 
            'accessible', 'wcag', 'clean code', 'performance', 'fast loading', 'grid', 
            'flexbox', 'component', 'vanilla', 'framework', 'production'
        ];
        const techMatches = techKeywords.filter(k => lower.includes(k)).length;
        if (techMatches >= 2) techScore = 20;
        else if (techMatches === 1) techScore = 12;

        // 5. Re-Engineering Depth & Specificity (up to 20%)
        // Casual phrases like "hii", "make website" score 0
        let depthScore = 0;
        if (wordCount >= 30) depthScore = 20;
        else if (wordCount >= 20) depthScore = 14;
        else if (wordCount >= 10) depthScore = 8;
        else depthScore = 0;

        const totalPercentage = personaScore + featuresScore + designScore + techScore + depthScore;
        const passed = totalPercentage >= 50;

        const feedback = [];
        if (personaScore < 12) feedback.push('Assign an expert role (e.g. "Act as a Senior UI/UX Frontend Architect...")');
        if (featuresScore < 15) feedback.push('Specify essential symposium sections (e.g. "registration form, event schedule, rules, contact...")');
        if (designScore < 12) feedback.push('Define modern styling & layout (e.g. "responsive design, dark mode cyberpunk aesthetic, glassmorphism cards...")');
        if (techScore < 12) feedback.push('Provide technical constraints (e.g. "semantic HTML5, responsive CSS grid, JavaScript form validation...")');
        if (depthScore < 14) feedback.push('Provide comprehensive prompt depth (avoid basic inputs like "hii")');

        return {
            percentage: totalPercentage,
            passed: passed,
            breakdown: {
                persona: personaScore,
                features: featuresScore,
                design: designScore,
                tech: techScore,
                depth: depthScore
            },
            feedback: feedback
        };
    }

    updateR3QualityMeter() {
        if (!this.r3PromptInput || !this.r3QualityPct || !this.r3QualityBadge) return;
        const text = this.r3PromptInput.value.trim();
        const evalResult = this.evaluateRound3Prompt(text);
        
        this.r3QualityPct.textContent = `${evalResult.percentage}%`;
        if (evalResult.passed) {
            this.r3QualityPct.style.color = 'var(--green-glow)';
            this.r3QualityBadge.className = 'badge badge-green';
            this.r3QualityBadge.textContent = `✓ VERIFIED (${evalResult.percentage}% ≥ 50%)`;
        } else if (evalResult.percentage >= 30) {
            this.r3QualityPct.style.color = 'var(--amber-glow)';
            this.r3QualityBadge.className = 'badge badge-amber';
            this.r3QualityBadge.textContent = `⚠️ ${evalResult.percentage}% (NEED ≥ 50%)`;
        } else {
            this.r3QualityPct.style.color = '#ff5252';
            this.r3QualityBadge.className = 'badge badge-red';
            this.r3QualityBadge.textContent = `❌ ${evalResult.percentage}% (NEED ≥ 50%)`;
        }
    }

    submitRound3() {
        const promptVal = this.r3PromptInput.value.trim();
        if (!promptVal) {
            window.escapeSound.error();
            this.showToast('⚠️ Please engineer a detailed prompt to fix the original bad prompt!', 'amber');
            return;
        }

        const evalResult = this.evaluateRound3Prompt(promptVal);

        // Strict 50% quality gate check (50% to 100% allowed, casual 'hii' blocked)
        if (!evalResult.passed) {
            window.escapeSound.error();
            const feedbackHtml = evalResult.feedback.map(f => `<div style="color: #fca5a5;">• ${f}</div>`).join('');
            
            if (this.r3TerminalOutput) {
                this.r3TerminalOutput.innerHTML = `
                    <div style="color: var(--red-alert); font-weight: 700; font-size: 0.95rem;">
                        ⛔ PROMPT QUALITY: ${evalResult.percentage}% (MINIMUM 50% REQUIRED)
                    </div>
                    <div style="color: #f87171; margin: 4px 0; font-size: 0.85rem;">
                        [ERROR: PROMPT FAILED QUALITY VERIFICATION]
                    </div>
                    <div style="color: #cbd5e1; font-size: 0.82rem; margin-top: 6px;">
                        Lock remains sealed! Basic inputs like "hii" or casual phrases cannot clear the Master Vault. You must engineer a comprehensive prompt to replace "Make a good college website" with specific sections, tech specs, and UX requirements.
                    </div>
                    <div style="margin-top: 8px; font-size: 0.8rem; background: rgba(0,0,0,0.5); padding: 0.6rem; border-radius: 4px; border-left: 3px solid var(--red-alert);">
                        <div style="color: var(--amber-glow); font-weight: 700; margin-bottom: 3px;">CHECKLIST TO REACH 50%:</div>
                        ${feedbackHtml}
                    </div>
                `;
            }
            this.showToast(`⛔ Prompt Score: ${evalResult.percentage}% — Minimum 50% required to submit!`, 'red');
            return;
        }

        window.escapeSound.gearTurn();
        this.r3SubmitBtn.disabled = true;
        this.r3SubmitBtn.innerHTML = '⚙️ VALIDATING RE-ENGINEERED PROMPT...';

        if (this.r3TerminalOutput) {
            this.r3TerminalOutput.innerHTML = `
                <div style="color: var(--green-glow);">Analyzing re-engineered prompt architectural depth...</div>
                <div style="color: var(--text-secondary); margin: 4px 0;">Evaluating technical constraints, symposium sections & UI styling...</div>
                <div style="color: var(--green-glow); font-size: 0.85rem; margin-top: 4px;">✓ Prompt engineering verification: ${evalResult.percentage}% (PASSED ≥ 50%)</div>
            `;
        }

        setTimeout(() => {
            window.escapeSound.unlock();
            const settings = window.EscapeStorage.getSettings();
            const timeTaken = Math.max(20, settings.r3TimeLimit - this.remainingSeconds);

            // Compute rubric scores out of 50:
            const b = evalResult.breakdown;
            const scoreClarity = Math.min(10, Math.round((b.persona + b.depth) / 4));
            const scoreSpecificity = Math.min(10, Math.round((b.features + b.tech) / 4));
            const scoreCreativity = Math.min(10, Math.round((b.design + b.features) / 4));
            const scoreImprovement = Math.min(10, Math.round((b.tech + b.depth) / 4));
            const scoreOutputQuality = Math.min(10, Math.round((b.persona + b.design) / 4));
            const scoreTotal = Math.min(50, scoreClarity + scoreSpecificity + scoreCreativity + scoreImprovement + scoreOutputQuality);

            if (this.r3TerminalOutput) {
                this.r3TerminalOutput.innerHTML = `
                    <div style="color: var(--green-glow); font-weight: 700; font-size: 1rem;">
                        🏆 MASTER VAULT CLEARED! PROMPT VERIFIED
                    </div>
                    <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 4px;">
                        Master Prompt successfully evaluated! Quality Score: <strong style="color: var(--green-glow);">${evalResult.percentage}%</strong> | Marks: <strong style="color: #fff;">${scoreTotal}/50</strong>
                    </div>
                `;
            }

            this.currentParticipant = window.EscapeStorage.updateParticipant(this.currentParticipant.id, {
                round3: {
                    ...this.currentParticipant.round3,
                    status: 'completed',
                    improvedPrompt: promptVal,
                    promptQualityScore: evalResult.percentage,
                    timeTakenSec: timeTaken,
                    submittedAt: new Date().toISOString(),
                    score: {
                        clarity: scoreClarity,
                        specificity: scoreSpecificity,
                        creativity: scoreCreativity,
                        improvement: scoreImprovement,
                        outputQuality: scoreOutputQuality,
                        total: scoreTotal
                    },
                    evaluated: true,
                    evalStatus: scoreTotal >= 42 ? 'winner' : 'pending'
                }
            });

            this.showCelebration(
                '🏆 MASTER VAULT CLEARED!',
                `Incredible work! Your re-engineered prompt scored ${evalResult.percentage}% (Marks: ${scoreTotal}/50). You have successfully cleared all 3 Escape Chambers of PROMPT ESCAPE ROOM!`,
                'VIEW VAULT CLEARANCE'
            );

            this.renderParticipantState();
            clearInterval(this.timerInterval);
        }, 1500);
    }

    showCelebration(title, msg, btnText) {
        this.celebrationTitle.textContent = title;
        this.celebrationMsg.textContent = msg;
        this.celebrationNextBtn.textContent = btnText;
        this.celebrationModal.classList.remove('hidden');
    }

    showToast(message, type = 'cyan') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'green') icon = '✅';
        if (type === 'red') icon = '⛔';
        if (type === 'amber') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.participantApp = new ParticipantApp();
});
