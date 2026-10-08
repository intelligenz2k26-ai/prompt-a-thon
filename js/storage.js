/**
 * PROMPT ESCAPE ROOM - Central Storage & Data Engine
 * Manages participant registration, rounds progress, submissions, evaluation scores, and demo data.
 */

const STORAGE_KEYS = {
    PARTICIPANTS: 'prompt_escape_participants',
    SETTINGS: 'prompt_escape_settings',
    CURRENT_USER: 'prompt_escape_current_user',
    ADMIN_SESSION: 'prompt_escape_admin_auth',
    DELETED_IDS: 'prompt_escape_deleted_ids'
};

const DEFAULT_SETTINGS = {
    r1TimeLimit: 5 * 60,  // 5 mins in seconds (Lock 1)
    r2TimeLimit: 10 * 60, // 10 mins (Lock 2)
    r3TimeLimit: 15 * 60, // 15 mins (Lock 3 - 900 seconds)
    r1CaptchaCode: '7KQ9P',
    r2ProblemStatement: 'Create an awareness poster for a college anti-drug campaign.',
    r3BadPrompt: 'Make a good college website'
};

// Initial state loader
const Storage = {
    getDeletedIds() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
            return new Set(raw ? JSON.parse(raw) : []);
        } catch (e) {
            return new Set();
        }
    },

    markAsDeleted(ids) {
        const deleted = this.getDeletedIds();
        (Array.isArray(ids) ? ids : [ids]).forEach(id => {
            if (id) deleted.add(String(id).toUpperCase().trim());
        });
        localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(Array.from(deleted)));
        return deleted;
    },

    getParticipants() {
        // One-time cleanup of old mock dataset if present
        if (!localStorage.getItem('prompt_escape_clean_v1')) {
            const existing = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
            if (existing) {
                try {
                    const parsed = JSON.parse(existing);
                    if (Array.isArray(parsed)) {
                        const isMockBatch = parsed.length >= 19 && parsed.some(p => p.id === 'P001' && p.round3 && p.round3.finalRank);
                        if (isMockBatch) {
                            localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify([]));
                        }
                    }
                } catch(e) {}
            }
            localStorage.setItem('prompt_escape_clean_v1', 'true');
        }

        const data = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
        if (!data) {
            return [];
        }
        try {
            let parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) {
                return [];
            }

            const deletedIds = this.getDeletedIds();
            parsed = parsed.filter(p => p && p.id && !deletedIds.has(String(p.id).toUpperCase().trim()));

            // Ensure every registered participant has a unique CAPTCHA code based on email/id
            let needsSave = false;
            parsed.forEach(p => {
                if (p.round1 && !p.round1.captchaCode) {
                    p.round1.captchaCode = this.generateCaptchaCode(p.email || p.id);
                    if (p.round1.aiOutput && (p.round1.aiOutput === '7KQ9P' || !p.round1.aiOutput)) {
                        p.round1.aiOutput = p.round1.captchaCode;
                    }
                    needsSave = true;
                }
            });
            if (needsSave) {
                localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(parsed));
            }
            return parsed;
        } catch (e) {
            console.error('Error parsing participants', e);
            return [];
        }
    },

    generateCaptchaCode(seedStr = '') {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        const str = (seedStr || Math.random().toString(36).substring(2)).toLowerCase().trim();
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash |= 0;
        }
        let code = '';
        let h = Math.abs(hash);
        for (let i = 0; i < 5; i++) {
            const idx = (h + i * 13 + (str.charCodeAt(i % str.length) * 7)) % chars.length;
            code += chars[Math.abs(idx)];
        }
        return code;
    },

    getCaptchaForParticipant(p) {
        if (!p) return '7KQ9P';
        if (p.round1 && p.round1.captchaCode) return p.round1.captchaCode;
        const code = this.generateCaptchaCode(p.email || p.id);
        if (p.round1) p.round1.captchaCode = code;
        return code;
    },

    CLOUD_ENDPOINT: 'https://kvdb.io/7WSqXoKQGY5BLvRnc6bmqT/participants',
    _isSyncing: false,
    _lastCloudSyncTime: 0,

    async syncFromCloud() {
        if (this._isSyncing) return this.getParticipants();
        this._isSyncing = true;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(this.CLOUD_ENDPOINT, { 
                cache: 'no-store',
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const cloudList = await res.json();
                if (Array.isArray(cloudList)) {
                    const localList = this.getParticipants();
                    const merged = this.mergeParticipants(localList, cloudList);
                    
                    const localJson = JSON.stringify(localList);
                    const mergedJson = JSON.stringify(merged);
                    
                    if (localJson !== mergedJson) {
                        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, mergedJson);
                        try {
                            window.dispatchEvent(new CustomEvent('escape_room_data_changed', { detail: { source: 'cloud' } }));
                        } catch (e) {}
                    }
                    
                    const deletedIds = this.getDeletedIds();
                    const cloudHasDeleted = cloudList.some(p => p && p.id && deletedIds.has(String(p.id).toUpperCase().trim()));
                    if (cloudHasDeleted || merged.length > cloudList.length) {
                        this.syncToCloud(merged, true);
                    }
                    
                    this._lastCloudSyncTime = Date.now();
                    return merged;
                }
            }
        } catch (e) {
            // Silently fallback to local storage
        } finally {
            this._isSyncing = false;
        }
        return this.getParticipants();
    },

    async syncToCloud(participants, isDelete = false) {
        const deletedIds = this.getDeletedIds();
        let toSend = (participants || this.getParticipants()).filter(p => !deletedIds.has(String(p.id).toUpperCase().trim()));

        try {
            if (!isDelete) {
                // If it's a regular save, fetch cloud and merge (ignoring deletedIds)
                try {
                    const checkRes = await fetch(this.CLOUD_ENDPOINT, { cache: 'no-store' });
                    if (checkRes.ok) {
                        const remoteList = await checkRes.json();
                        if (Array.isArray(remoteList) && remoteList.length > 0) {
                            toSend = this.mergeParticipants(toSend, remoteList);
                            localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(toSend));
                        }
                    }
                } catch (mergeErr) {}
            }

            await fetch(this.CLOUD_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toSend)
            });
            this._lastCloudSyncTime = Date.now();
            return toSend;
        } catch (e) {
            console.warn('Cloud sync error:', e);
            return toSend;
        }
    },

    mergeParticipants(local, remote) {
        const deletedIds = this.getDeletedIds();
        const map = new Map();

        (local || []).forEach(p => {
            if (p && p.id && !deletedIds.has(String(p.id).toUpperCase().trim())) {
                map.set(String(p.id).toUpperCase().trim(), p);
            }
        });

        (remote || []).forEach(p => {
            if (!p || !p.id || deletedIds.has(String(p.id).toUpperCase().trim())) return;
            const key = String(p.id).toUpperCase().trim();
            if (!map.has(key)) {
                map.set(key, p);
            } else {
                const existing = map.get(key);
                const t1 = new Date(existing.updatedAt || existing.registeredAt || 0).getTime();
                const t2 = new Date(p.updatedAt || p.registeredAt || 0).getTime();
                
                const p3Complete = p.round3 && p.round3.status === 'completed';
                const e3Complete = existing.round3 && existing.round3.status === 'completed';
                const p2Complete = p.round2 && p.round2.status === 'completed';
                const e2Complete = existing.round2 && existing.round2.status === 'completed';

                if (p3Complete && !e3Complete) {
                    map.set(key, p);
                } else if (p2Complete && !e2Complete) {
                    map.set(key, p);
                } else if (t2 >= t1) {
                    map.set(key, { ...existing, ...p });
                }
            }
        });

        return Array.from(map.values());
    },

    saveParticipants(participants) {
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
        try {
            window.dispatchEvent(new CustomEvent('escape_room_data_changed'));
        } catch (e) {
            console.warn('Dispatch event error', e);
        }
        // Immediately sync to global cloud so admin & all users see it
        this.syncToCloud(participants);
    },

    getParticipant(id) {
        if (!id) return null;
        const list = this.getParticipants();
        return list.find(p => p.id.toUpperCase() === id.trim().toUpperCase());
    },

    updateParticipant(id, updates) {
        if (!id) return null;
        const list = this.getParticipants();
        const idx = list.findIndex(p => p.id.toUpperCase() === id.trim().toUpperCase());
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
            this.saveParticipants(list);
            return list[idx];
        }
        return null;
    },

    async deleteParticipant(id) {
        if (!id) return;
        const normId = String(id).toUpperCase().trim();
        this.markAsDeleted(normId);

        let list = this.getParticipants();
        list = list.filter(p => p.id.toUpperCase() !== normId);
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(list));
        try {
            window.dispatchEvent(new CustomEvent('escape_room_data_changed'));
        } catch (e) {}

        await this.syncToCloud(list, true);
        return list;
    },

    async deleteParticipants(ids) {
        if (!ids || ids.length === 0) return;
        this.markAsDeleted(ids);
        const set = new Set(ids.map(i => String(i).toUpperCase().trim()));

        let list = this.getParticipants();
        list = list.filter(p => !set.has(p.id.toUpperCase()));
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(list));
        try {
            window.dispatchEvent(new CustomEvent('escape_room_data_changed'));
        } catch (e) {}

        await this.syncToCloud(list, true);
        return list;
    },

    getNextId() {
        const list = this.getParticipants();
        const deletedIds = Array.from(this.getDeletedIds());
        const allIds = [...list.map(p => p.id), ...deletedIds];
        if (allIds.length === 0) return 'P001';
        const nums = allIds.map(id => {
            const match = String(id).match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        });
        const max = Math.max(...nums, 0);
        return `P${String(max + 1).padStart(3, '0')}`;
    },

    register(data) {
        const list = this.getParticipants();
        const newId = this.getNextId();
        const newParticipant = {
            id: newId,
            name: (data.name || '').trim(),
            college: (data.college || '').trim(),
            department: (data.department || '').trim(),
            year: (data.year || 'III').trim(),
            phone: (data.phone || '').trim(),
            email: (data.email || '').trim(),
            registeredAt: new Date().toISOString(),
            status: 'Approved', // Auto-approved so participants can immediately play Round 1!
            
            // Round 1
            round1: {
                status: 'unlocked', // 'locked' | 'unlocked' | 'completed'
                captchaCode: this.generateCaptchaCode((data.email || newId).trim()),
                prompt: '',
                aiOutput: '',
                promptQualityScore: 0,
                timeTakenSec: 0,
                submittedAt: null,
                score: {
                    quality: 0,
                    correctness: 0,
                    creativity: 0,
                    time: 0,
                    total: 0
                },
                evaluated: false,
                evalStatus: 'pending' // 'pending' | 'selected' | 'rejected'
            },

            // Round 2
            round2: {
                status: 'locked', // 'locked' | 'unlocked' | 'completed'
                prompt: '',
                generatedPosterUrl: '',
                timeTakenSec: 0,
                submittedAt: null,
                score: {
                    promptQuality: 0,
                    understanding: 0,
                    creativity: 0,
                    imageQuality: 0,
                    total: 0
                },
                evaluated: false,
                evalStatus: 'pending' // 'pending' | 'selected' | 'rejected'
            },

            // Round 3
            round3: {
                status: 'locked', // 'locked' | 'unlocked' | 'completed'
                improvedPrompt: '',
                websiteUrl: '',
                promptQualityScore: 0,
                timeTakenSec: 0,
                submittedAt: null,
                score: {
                    clarity: 0,
                    specificity: 0,
                    creativity: 0,
                    improvement: 0,
                    outputQuality: 0,
                    total: 0
                },
                evaluated: false,
                evalStatus: 'pending', // 'pending' | 'winner' | 'runner' | 'third' | 'rejected'
                finalRank: null
            }
        };

        list.push(newParticipant);
        this.saveParticipants(list);
        return newParticipant;
    },

    async registerAsync(data) {
        // Sync with global cloud first to ensure latest participants list and no duplicate IDs
        try {
            await this.syncFromCloud();
        } catch (e) {}
        
        const newParticipant = this.register(data);
        
        // Immediately push to cloud and await confirmation so it reaches admin instantly
        try {
            await this.syncToCloud();
        } catch (e) {}
        
        return newParticipant;
    },

    getSettings() {
        const s = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (!s) return { ...DEFAULT_SETTINGS };
        try {
            const parsed = JSON.parse(s);
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                r1TimeLimit: DEFAULT_SETTINGS.r1TimeLimit,
                r2TimeLimit: DEFAULT_SETTINGS.r2TimeLimit,
                r3TimeLimit: DEFAULT_SETTINGS.r3TimeLimit
            };
        } catch (e) {
            return { ...DEFAULT_SETTINGS };
        }
    },

    saveSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },

    getCurrentUser() {
        return localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    },

    setCurrentUser(id) {
        if (id) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, id.toUpperCase());
        } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
    },

    isAdminLoggedIn() {
        return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
    },

    setAdminLogin(val) {
        if (val) {
            sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
        } else {
            sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
            localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
        }
    },

    resetAllData() {
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify([]));
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        try {
            window.dispatchEvent(new CustomEvent('escape_room_data_changed'));
        } catch (e) {}
        return [];
    },

    // Demo Data generation with 20 realistic participants representing various stages
    generateSampleData() {
        const raw = [
            { id: "P001", name: "bala", college: "MCE", dept: "CSE", yr: "III", ph: "9876543210", em: "bala@mce.edu" },
            { id: "P002", name: "Arun", college: "ABC College of Engg", dept: "IT", yr: "IV", ph: "9876543211", em: "arun@abc.edu" },
            { id: "P003", name: "Priya", college: "XYZ Tech Campus", dept: "AIDS", yr: "II", ph: "9876543212", em: "priya@xyz.edu" },
            { id: "P004", name: "Kavitha", college: "PSG Tech", dept: "CSE", yr: "III", ph: "9876543213", em: "kavi@psg.edu" },
            { id: "P005", name: "Dinesh", college: "CIT Coimbatore", dept: "ECE", yr: "IV", ph: "9876543214", em: "dinesh@cit.edu" },
            { id: "P006", name: "Ananya", college: "SSN College", dept: "IT", yr: "III", ph: "9876543215", em: "ananya@ssn.edu" },
            { id: "P007", name: "Vignesh", college: "CEG Anna University", dept: "CSE", yr: "IV", ph: "9876543216", em: "vignesh@ceg.edu" },
            { id: "P008", name: "Sneha", college: "Thiagarajar Engg", dept: "AIDS", yr: "II", ph: "9876543217", em: "sneha@tce.edu" },
            { id: "P009", name: "Karthik", college: "Kumaraguru College", dept: "CSE", yr: "III", ph: "9876543218", em: "karthik@kct.edu" },
            { id: "P010", name: "Meena", college: "Bannari Amman Tech", dept: "IT", yr: "IV", ph: "9876543219", em: "meena@bits.edu" },
            { id: "P011", name: "Hari", college: "SASTRA University", dept: "CSE", yr: "III", ph: "9876543220", em: "hari@sastra.edu" },
            { id: "P012", name: "Divya", college: "MCE", dept: "IT", yr: "IV", ph: "9876543221", em: "divya@mce.edu" },
            { id: "P013", name: "Gautham", college: "Loyola-ICAM", dept: "ECE", yr: "III", ph: "9876543222", em: "gautham@licet.edu" },
            { id: "P014", name: "Keerthana", college: "St. Joseph's Engg", dept: "AIDS", yr: "II", ph: "9876543223", em: "keerthana@sjce.edu" },
            { id: "P015", name: "Manoj", college: "Sona College of Tech", dept: "CSE", yr: "IV", ph: "9876543224", em: "manoj@sona.edu" },
            { id: "P016", name: "Deepak", college: "Kongu Engg", dept: "IT", yr: "III", ph: "9876543225", em: "deepak@kongu.edu" },
            { id: "P017", name: "Bhavani", college: "Sri Krishna College", dept: "CSE", yr: "IV", ph: "9876543226", em: "bhavani@skcet.edu" },
            { id: "P018", name: "Naveen", college: "Vel Tech Rangarajan", dept: "ECE", yr: "II", ph: "9876543227", em: "naveen@veltech.edu" },
            { id: "P019", name: "Revathi", college: "Rajalakshmi Engg", dept: "AIDS", yr: "III", ph: "9876543228", em: "revathi@rec.edu" },
            { id: "P020", name: "Siddharth", college: "RMK Engg College", dept: "CSE", yr: "IV", ph: "9876543229", em: "sid@rmk.edu" }
        ];

        return raw.map((item, index) => {
            const isApproved = index < 18;
            const r1Submitted = isApproved && index < 16;
            
            // Top 14 shortlisted for R2
            const isShortlistedR2 = index < 14;
            const r2Submitted = isShortlistedR2;
            
            // Top 10 shortlisted for R3
            const top10Ids = ['P012', 'P007', 'P004', 'P001', 'P002', 'P003', 'P005', 'P006', 'P008', 'P009'];
            const isTop10 = top10Ids.includes(item.id);
            const r3Submitted = isTop10;

            const r3Prompts = {
                'P012': `Design an ultra-modern, high-performance responsive web portal for a national collegiate technical symposium named 'INNOVEX 2026'. Include: Hero section with glowing countdown timer and 3D geometric canvas, interactive event schedule matrix with track filters, seamless multi-stage registration modal, guest keynote showcase, live campus coordinates, and accessible dark mode glassmorphism UI tailored for tech undergraduates.`,
                'P007': `Create a modern responsive website for a college technical symposium with event details, registration, schedule, gallery and contact sections. Use a professional neon dark theme with smooth micro-animations suitable for college students.`,
                'P004': `Develop a comprehensive college symposium web platform featuring event tracks, registration form, live announcements, speaker cards, and responsive navigation with mobile drawer.`,
                'P001': `Build a clean, high-tech college symposium portal with hackathon track descriptions, interactive schedule timetable, participant registration modal with validation, and modern cyan-accented dark UI.`,
                'P002': `Architect an intuitive web application for annual collegiate tech symposium including event agenda grid, registration portal, workshop speakers spotlight, and responsive CSS layout.`,
                'P003': `Design a responsive symposium web portal with real-time countdown timer, multi-tier event catalog, team registration flow, and dark glassmorphic styling for tech participants.`,
                'P005': `Create a full-featured college symposium portal with live schedule timeline, registration gateway, rules document viewer, and mobile-friendly dark theme.`,
                'P006': `Craft an engaging responsive symposium website featuring tech event categories, online registration form, dynamic schedule planner, and futuristic typography.`,
                'P008': `Develop an interactive web portal for engineering symposium with workshop schedule, registration pipeline, sponsor showcase, and accessible responsive UI.`,
                'P009': `Build an interactive symposium hub with event schedule breakdown, instant registration modal, keynote speakers carousel, and sleek dark aesthetic.`
            };

            const r3Scores = {
                'P012': { clarity: 10, specificity: 10, creativity: 9, improvement: 9, outputQuality: 8, total: 46 },
                'P007': { clarity: 9, specificity: 9, creativity: 8, improvement: 9, outputQuality: 8, total: 43 },
                'P004': { clarity: 8, specificity: 8, creativity: 8, improvement: 9, outputQuality: 8, total: 41 },
                'P001': { clarity: 8, specificity: 8, creativity: 8, improvement: 8, outputQuality: 8, total: 40 },
                'P002': { clarity: 8, specificity: 8, creativity: 7, improvement: 8, outputQuality: 8, total: 39 },
                'P003': { clarity: 8, specificity: 7, creativity: 8, improvement: 8, outputQuality: 7, total: 38 },
                'P005': { clarity: 7, specificity: 8, creativity: 7, improvement: 8, outputQuality: 7, total: 37 },
                'P006': { clarity: 7, specificity: 7, creativity: 8, improvement: 7, outputQuality: 7, total: 36 },
                'P008': { clarity: 7, specificity: 7, creativity: 7, improvement: 7, outputQuality: 7, total: 35 },
                'P009': { clarity: 7, specificity: 7, creativity: 7, improvement: 6, outputQuality: 7, total: 34 }
            };

            return {
                id: item.id,
                name: item.name,
                college: item.college,
                department: item.dept,
                year: item.yr,
                phone: item.ph,
                email: item.em,
                registeredAt: new Date(Date.now() - (20 - index) * 3600000).toISOString(),
                status: isApproved ? 'Approved' : (index === 18 ? 'Registered' : 'Rejected'),
                
                round1: {
                    status: !isApproved ? 'locked' : (r1Submitted ? 'completed' : 'unlocked'),
                    captchaCode: this.generateCaptchaCode(item.em),
                    prompt: r1Submitted ? `You are a precision OCR security scanner. Carefully inspect the distorted 5-character alphanumeric captcha token attached and output ONLY the verbatim characters in uppercase without commentary or punctuation.` : '',
                    aiOutput: r1Submitted ? this.generateCaptchaCode(item.em) : '',
                    promptQualityScore: r1Submitted ? (isShortlistedR2 ? 95 : 78) : 0,
                    timeTakenSec: r1Submitted ? (420 + index * 45) : 0,
                    submittedAt: r1Submitted ? new Date(Date.now() - (15 - index) * 1800000).toISOString() : null,
                    score: r1Submitted ? {
                        quality: isShortlistedR2 ? 9 : (index % 3 + 6),
                        correctness: 10,
                        creativity: isShortlistedR2 ? 9 : 7,
                        time: isShortlistedR2 ? 9 : 6,
                        total: isShortlistedR2 ? (36 + (index % 4)) : 29
                    } : { quality: 0, correctness: 0, creativity: 0, time: 0, total: 0 },
                    evaluated: r1Submitted,
                    evalStatus: isShortlistedR2 ? 'selected' : (r1Submitted ? 'rejected' : 'pending')
                },

                round2: {
                    status: isShortlistedR2 ? 'completed' : (isApproved && index < 16 ? 'locked' : 'locked'),
                    prompt: r2Submitted ? `Hyper-realistic cinematic anti-drug awareness poster for university symposium. Dark moody aesthetic contrasting a glowing vibrant graduate silhouette overcoming shattered drug vials. Headline typography: "BREAK FREE, CHOOSE REAL DREAMS", volumetric lighting, 8k octane render, emotional college youth context.` : '',
                    generatedPosterUrl: r2Submitted ? 'poster_sample_' + item.id : '',
                    timeTakenSec: r2Submitted ? (600 + index * 30) : 0,
                    submittedAt: r2Submitted ? new Date(Date.now() - 3600000).toISOString() : null,
                    score: r2Submitted ? {
                        promptQuality: isTop10 ? (8 + (item.id === 'P012' ? 2 : (index % 2))) : 6,
                        understanding: isTop10 ? 9 : 7,
                        creativity: isTop10 ? 8 : 6,
                        imageQuality: isTop10 ? 8 : 6,
                        total: isTop10 ? (33 + (item.id === 'P012' ? 6 : (10 - top10Ids.indexOf(item.id)))) : 25
                    } : { promptQuality: 0, understanding: 0, creativity: 0, imageQuality: 0, total: 0 },
                    evaluated: r2Submitted,
                    evalStatus: isTop10 ? 'selected' : (r2Submitted ? 'rejected' : 'pending')
                },

                round3: {
                    status: isTop10 ? 'completed' : 'locked',
                    improvedPrompt: isTop10 ? (r3Prompts[item.id] || '') : '',
                    timeTakenSec: isTop10 ? (500 + index * 20) : 0,
                    submittedAt: isTop10 ? new Date(Date.now() - (1200000 - index * 60000)).toISOString() : null,
                    score: isTop10 ? (r3Scores[item.id] || { clarity: 7, specificity: 7, creativity: 7, improvement: 7, outputQuality: 7, total: 35 }) : { clarity: 0, specificity: 0, creativity: 0, improvement: 0, outputQuality: 0, total: 0 },
                    evaluated: isTop10,
                    evalStatus: item.id === 'P012' ? 'winner' : (item.id === 'P007' ? 'runner' : (item.id === 'P004' ? 'third' : (isTop10 ? 'evaluated' : 'pending'))),
                    finalRank: item.id === 'P012' ? 1 : (item.id === 'P007' ? 2 : (item.id === 'P004' ? 3 : (isTop10 ? (top10Ids.indexOf(item.id) + 1) : null)))
                }
            };
        });
    }
};

window.EscapeStorage = Storage;

// Auto-sync with cloud on load so participants and admin share real-time state globally
try {
    setTimeout(() => {
        if (typeof Storage !== 'undefined' && Storage.syncFromCloud) {
            Storage.syncFromCloud();
        }
    }, 150);
} catch (e) {}

