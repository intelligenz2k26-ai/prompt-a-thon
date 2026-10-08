/**
 * PROMPT ESCAPE ROOM - Admin Command Console & Evaluation Controller
 * Manages participant approvals, Round 1/2/3 evaluations, scoring rubrics,
 * shortlisting (Top 10), and Final Leaderboard / Winners podium.
 */

class AdminController {
    constructor() {
        this.currentRoute = 'registrations';
        this.selectedParticipantId = null;
        this.filterQuery = '';
        this.selectedRegIds = new Set();
        this.selectedR1Ids = new Set();
        this.selectedR2Ids = new Set();
        this.selectedR3Ids = new Set();
        this.selectedIds = this.selectedRegIds; // legacy compatibility
        this.showDuplicatesOnly = false;
        
        this.initElements();
        this.bindEvents();
        this.initRouting();
        this.renderStats();
    }

    initElements() {
        // Stats badges
        this.statRegistered = document.getElementById('stat-registered-count');
        this.statR1 = document.getElementById('stat-r1-count');
        this.statR2 = document.getElementById('stat-r2-count');
        this.statR3 = document.getElementById('stat-r3-count');

        // Navigation links
        this.navLinks = document.querySelectorAll('.sidebar-link');
        this.viewContainers = {
            'registrations': document.getElementById('view-registrations'),
            'round-1': document.getElementById('view-round-1'),
            'round-1-eval': document.getElementById('view-round-1-eval'),
            'round-2': document.getElementById('view-round-2'),
            'round-2-eval': document.getElementById('view-round-2-eval'),
            'round-3': document.getElementById('view-round-3'),
            'round-3-eval': document.getElementById('view-round-3-eval'),
            'results': document.getElementById('view-results')
        };

        // Search inputs
        this.searchInputs = document.querySelectorAll('.table-search-input');
    }

    bindEvents() {
        // Nav link routing
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.dataset.route;
                this.navigate(route);
            });
        });

        // Live Instant Search across all tabs
        this.searchInputs = document.querySelectorAll('.table-search-input');
        this.searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.filterQuery = e.target.value.trim().toLowerCase();
                // Synchronize input value across all route search boxes
                this.searchInputs.forEach(other => {
                    if (other !== e.target) other.value = e.target.value;
                });
                this.renderCurrentView();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });
        });

        // Demo data reset & reload buttons
        const resetBtn = document.getElementById('admin-reset-demo-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Clear all participant data and start with a clean database?')) {
                    window.EscapeStorage.resetAllData();
                    this.showToast('✅ All data cleared successfully!', 'green');
                    this.renderStats();
                    this.renderCurrentView();
                }
            });
        }

        // Export data button
        const exportBtn = document.getElementById('admin-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCsv());
        }

        // Global data updates
        window.addEventListener('escape_room_data_changed', () => {
            this.renderStats();
            this.renderCurrentView();
        });
    }

    initRouting() {
        const hash = window.location.hash.replace('#/', '').replace('#', '');
        if (hash && this.viewContainers[hash]) {
            this.navigate(hash);
        } else {
            this.navigate('registrations');
        }

        window.addEventListener('hashchange', () => {
            const h = window.location.hash.replace('#/', '').replace('#', '');
            if (h && this.viewContainers[h]) {
                this.navigate(h, false);
            }
        });
    }

    navigate(route, updateHash = true) {
        if (!this.viewContainers[route]) return;
        this.currentRoute = route;

        if (updateHash) {
            window.location.hash = `#/${route}`;
        }

        // Update nav active classes
        this.navLinks.forEach(link => {
            if (link.dataset.route === route || (route.includes('eval') && link.dataset.route === route.replace('-eval', ''))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Show view
        Object.keys(this.viewContainers).forEach(key => {
            if (this.viewContainers[key]) {
                this.viewContainers[key].classList.add('hidden');
            }
        });
        this.viewContainers[route].classList.remove('hidden');

        this.renderStats();
        this.renderCurrentView();
    }

    renderCurrentView() {
        switch (this.currentRoute) {
            case 'registrations':
                this.renderRegistrations();
                break;
            case 'round-1':
                this.renderRound1List();
                break;
            case 'round-1-eval':
                this.renderRound1Eval();
                break;
            case 'round-2':
                this.renderRound2List();
                break;
            case 'round-2-eval':
                this.renderRound2Eval();
                break;
            case 'round-3':
                this.renderRound3List();
                break;
            case 'round-3-eval':
                this.renderRound3Eval();
                break;
            case 'results':
                this.renderResults();
                break;
        }
    }

    renderStats() {
        const list = window.EscapeStorage.getParticipants();
        const registered = list.length;
        const r1Count = list.filter(p => p.status === 'Approved').length;
        const r2Count = list.filter(p => p.round1.evalStatus === 'selected').length;
        const r3Count = list.filter(p => p.round2.evalStatus === 'selected').length;

        if (this.statRegistered) this.statRegistered.textContent = registered;
        if (this.statR1) this.statR1.textContent = r1Count;
        if (this.statR2) this.statR2.textContent = r2Count;
        if (this.statR3) this.statR3.textContent = r3Count;
    }

    matchesSearch(p) {
        if (!this.filterQuery) return true;
        const q = this.filterQuery.trim().toLowerCase();
        if (!q) return true;

        const fields = [
            p.id,
            p.name,
            p.college,
            p.department,
            p.year,
            p.phone,
            p.email,
            p.status,
            p.round1?.evalStatus,
            p.round2?.evalStatus,
            p.round3?.evalStatus,
            p.round1?.prompt,
            p.round1?.aiOutput,
            p.round2?.prompt,
            p.round3?.improvedPrompt,
            p.round1?.score?.total != null ? `${p.round1.score.total}` : '',
            p.round2?.score?.total != null ? `${p.round2.score.total}` : '',
            p.round3?.score?.total != null ? `${p.round3.score.total}` : ''
        ];

        return fields.some(val => val && String(val).toLowerCase().includes(q));
    }

    clearSearch() {
        this.filterQuery = '';
        this.searchInputs.forEach(input => { input.value = ''; });
        this.renderCurrentView();
    }

    // ==========================================
    // 1. REGISTRATIONS VIEW
    // ==========================================
    renderRegistrations() {
        const tbody = document.getElementById('reg-table-body');
        if (!tbody) return;

        let allList = window.EscapeStorage.getParticipants();
        
        // Duplicate detection by phone, email, or name
        const phoneCounts = {};
        const emailCounts = {};
        const nameCounts = {};
        allList.forEach(p => {
            if (p.phone) phoneCounts[p.phone] = (phoneCounts[p.phone] || 0) + 1;
            if (p.email) emailCounts[p.email.toLowerCase()] = (emailCounts[p.email.toLowerCase()] || 0) + 1;
            if (p.name) nameCounts[p.name.toLowerCase()] = (nameCounts[p.name.toLowerCase()] || 0) + 1;
        });

        let list = allList;

        if (this.showDuplicatesOnly) {
            list = list.filter(p => 
                (p.phone && phoneCounts[p.phone] > 1) ||
                (p.email && emailCounts[p.email.toLowerCase()] > 1) ||
                (p.name && nameCounts[p.name.toLowerCase()] > 1)
            );
        }

        if (this.filterQuery) {
            list = list.filter(p => this.matchesSearch(p));
        }

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                        <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔍</div>
                        <div style="font-size: 1rem; color: #fff;">No participants found matching current filters.</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.35rem;">
                            ${this.showDuplicatesOnly ? 'No duplicate entries detected.' : 'Try clearing your search or duplicate filter.'}
                        </div>
                        <button class="btn btn-sm btn-outline" style="margin-top: 1rem;" onclick="adminApp.clearSearch(); adminApp.showDuplicatesOnly = false; adminApp.renderRegistrations();">Reset Filter</button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(p => {
            const isDup = (p.phone && phoneCounts[p.phone] > 1) ||
                          (p.email && emailCounts[p.email.toLowerCase()] > 1) ||
                          (p.name && nameCounts[p.name.toLowerCase()] > 1);

            let statusBadge = `<span class="badge badge-amber">Registered</span>`;
            if (p.status === 'Approved') statusBadge = `<span class="badge badge-green">Approved</span>`;
            if (p.status === 'Rejected') statusBadge = `<span class="badge badge-red">Rejected</span>`;

            const isChecked = this.selectedRegIds.has(p.id);

            return `
                <tr class="${isChecked ? 'row-selected' : ''}" style="${isDup ? 'background: rgba(255, 183, 3, 0.04);' : ''}">
                    <td style="text-align: center;">
                        <input type="checkbox" class="reg-checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="adminApp.toggleSelectOne('reg', '${p.id}', this)" style="cursor: pointer; width: 16px; height: 16px;">
                    </td>
                    <td>
                        <span class="id-badge">${p.id}</span>
                        ${isDup ? `<span class="badge badge-amber" style="margin-left: 0.35rem;" title="Duplicate name/contact detected">⚠️ Dup</span>` : ''}
                    </td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.college}</td>
                    <td>${p.department} (${p.year})</td>
                    <td>${p.phone}<br><span style="color:var(--text-muted); font-size:0.8rem;">${p.email}</span></td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display:flex; gap:0.4rem; align-items: center;">
                            <button class="btn btn-sm btn-green" onclick="adminApp.setParticipantStatus('${p.id}', 'Approved')" ${p.status === 'Approved' ? 'disabled' : ''}>
                                Approve
                            </button>
                            <button class="btn btn-sm btn-red" onclick="adminApp.setParticipantStatus('${p.id}', 'Rejected')" ${p.status === 'Rejected' ? 'disabled' : ''}>
                                Reject
                            </button>
                            <button class="btn btn-sm btn-outline" style="color: #ff5252; border-color: rgba(255,23,68,0.4); padding: 0.35rem 0.6rem;" onclick="adminApp.deleteSingleParticipant('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Delete participant">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateSelectedCount('reg');
    }

    getConfig(level) {
        if (level === 'reg') {
            return {
                set: this.selectedRegIds,
                checkboxClass: '.reg-checkbox',
                masterId: 'select-all-reg',
                batchBarId: 'reg-batch-actions',
                countId: 'reg-selected-count',
                singularLabel: 'PARTICIPANT',
                pluralLabel: 'PARTICIPANTS'
            };
        } else if (level === 1 || level === '1' || level === 'r1') {
            return {
                set: this.selectedR1Ids,
                checkboxClass: '.r1-checkbox',
                masterId: 'select-all-r1',
                batchBarId: 'r1-batch-actions',
                countId: 'r1-selected-count',
                singularLabel: 'CANDIDATE',
                pluralLabel: 'CANDIDATES'
            };
        } else if (level === 2 || level === '2' || level === 'r2') {
            return {
                set: this.selectedR2Ids,
                checkboxClass: '.r2-checkbox',
                masterId: 'select-all-r2',
                batchBarId: 'r2-batch-actions',
                countId: 'r2-selected-count',
                singularLabel: 'CANDIDATE',
                pluralLabel: 'CANDIDATES'
            };
        } else if (level === 3 || level === '3' || level === 'r3') {
            return {
                set: this.selectedR3Ids,
                checkboxClass: '.r3-checkbox',
                masterId: 'select-all-r3',
                batchBarId: 'r3-batch-actions',
                countId: 'r3-selected-count',
                singularLabel: 'FINALIST',
                pluralLabel: 'FINALISTS'
            };
        }
        return {
            set: this.selectedRegIds,
            checkboxClass: '.reg-checkbox',
            masterId: 'select-all-reg',
            batchBarId: 'reg-batch-actions',
            countId: 'reg-selected-count',
            singularLabel: 'PARTICIPANT',
            pluralLabel: 'PARTICIPANTS'
        };
    }

    toggleSelectAll(level, masterEl) {
        if (typeof level === 'object') {
            masterEl = level;
            level = 'reg';
        }
        const config = this.getConfig(level);
        if (!config) return;
        const checkboxes = document.querySelectorAll(config.checkboxClass);
        checkboxes.forEach(cb => {
            cb.checked = masterEl.checked;
            const tr = cb.closest('tr');
            if (masterEl.checked) {
                config.set.add(cb.value);
                if (tr) tr.classList.add('row-selected');
            } else {
                config.set.delete(cb.value);
                if (tr) tr.classList.remove('row-selected');
            }
        });
        this.updateSelectedCount(level);
    }

    toggleSelectOne(level, id, cb) {
        if (typeof id === 'object') {
            cb = id;
            id = level;
            level = 'reg';
        }
        const config = this.getConfig(level);
        if (!config) return;
        const tr = cb.closest('tr');
        if (cb.checked) {
            config.set.add(id);
            if (tr) tr.classList.add('row-selected');
        } else {
            config.set.delete(id);
            if (tr) tr.classList.remove('row-selected');
        }
        
        const allCbs = document.querySelectorAll(config.checkboxClass);
        const master = document.getElementById(config.masterId);
        if (master && allCbs.length > 0) {
            master.checked = Array.from(allCbs).every(c => c.checked);
        }
        this.updateSelectedCount(level);
    }

    updateSelectedCount(level = 'reg') {
        const config = this.getConfig(level);
        if (!config) return;
        const count = config.set.size;
        const bar = document.getElementById(config.batchBarId);
        const countEl = document.getElementById(config.countId);
        
        if (bar && countEl) {
            if (count > 0) {
                bar.classList.remove('hidden');
                countEl.textContent = `${count} ${count > 1 ? config.pluralLabel : config.singularLabel} SELECTED`;
            } else {
                bar.classList.add('hidden');
            }
        }
    }

    clearSelection(level = 'reg') {
        const config = this.getConfig(level);
        if (!config) return;
        config.set.clear();
        const master = document.getElementById(config.masterId);
        if (master) master.checked = false;
        const checkboxes = document.querySelectorAll(config.checkboxClass);
        checkboxes.forEach(cb => {
            cb.checked = false;
            const tr = cb.closest('tr');
            if (tr) tr.classList.remove('row-selected');
        });
        this.updateSelectedCount(level);
    }

    deleteSelected(level = 'reg') {
        const config = this.getConfig(level);
        if (!config) return;
        const count = config.set.size;
        if (count === 0) {
            this.showToast('⚠️ Please select at least one participant using checkboxes first.', 'amber');
            return;
        }

        if (confirm(`⚠️ Are you sure you want to permanently delete the ${count} selected participant(s)? This action cannot be undone.`)) {
            window.EscapeStorage.deleteParticipants(Array.from(config.set));
            this.selectedRegIds.clear();
            this.selectedR1Ids.clear();
            this.selectedR2Ids.clear();
            this.selectedR3Ids.clear();
            this.showToast(`🗑️ Deleted ${count} participant(s) successfully!`, 'green');
            this.clearSelection(level);
            this.renderStats();
            this.renderCurrentView();
        }
    }

    deleteSelectedRegistrations() {
        this.deleteSelected('reg');
    }

    approveSelected(level = 'reg') {
        const config = this.getConfig(level);
        if (!config) return;
        const count = config.set.size;
        if (count === 0) {
            this.showToast('⚠️ Please select at least one participant using checkboxes first.', 'amber');
            return;
        }

        if (level === 'reg') {
            config.set.forEach(id => {
                const p = window.EscapeStorage.getParticipant(id);
                if (p) {
                    window.EscapeStorage.updateParticipant(id, {
                        status: 'Approved',
                        round1: { ...p.round1, status: 'unlocked' }
                    });
                }
            });
            this.showToast(`✓ Approved ${count} participant(s)! Round 1 unlocked.`, 'green');
            this.clearSelection('reg');
            this.renderStats();
            this.renderRegistrations();
        } else if (level === 1 || level === '1' || level === 'r1') {
            config.set.forEach(id => {
                const p = window.EscapeStorage.getParticipant(id);
                if (p) {
                    const existingTotal = p.round1?.score?.total || 0;
                    const defaultScore = existingTotal > 0 ? p.round1.score : {
                        quality: 9, correctness: 10, creativity: 10, time: 9, total: 38
                    };
                    window.EscapeStorage.updateParticipant(id, {
                        round1: {
                            ...p.round1,
                            score: defaultScore,
                            evaluated: true,
                            evalStatus: 'selected'
                        },
                        round2: {
                            ...p.round2,
                            status: 'unlocked'
                        }
                    });
                }
            });
            this.showToast(`✓ Approved & shortlisted ${count} participant(s) into Top 5 for Round 2!`, 'green');
            this.clearSelection(1);
            this.renderStats();
            this.renderRound1List();
        } else if (level === 2 || level === '2' || level === 'r2') {
            config.set.forEach(id => {
                const p = window.EscapeStorage.getParticipant(id);
                if (p) {
                    const existingTotal = p.round2?.score?.total || 0;
                    const defaultScore = existingTotal > 0 ? p.round2.score : {
                        promptQuality: 9, understanding: 10, creativity: 9, imageQuality: 10, total: 38
                    };
                    window.EscapeStorage.updateParticipant(id, {
                        round2: {
                            ...p.round2,
                            score: defaultScore,
                            evaluated: true,
                            evalStatus: 'selected'
                        },
                        round3: {
                            ...p.round3,
                            status: 'unlocked'
                        }
                    });
                }
            });
            this.showToast(`✓ Approved & shortlisted ${count} candidate(s) into Top 10 for Round 3!`, 'green');
            this.clearSelection(2);
            this.renderStats();
            this.renderRound2List();
        } else if (level === 3 || level === '3' || level === 'r3') {
            const sortedIds = Array.from(config.set);
            sortedIds.forEach((id, index) => {
                const p = window.EscapeStorage.getParticipant(id);
                if (p) {
                    const existingTotal = p.round3?.score?.total || 0;
                    const defaultScore = existingTotal > 0 ? p.round3.score : {
                        clarity: 10, specificity: 10, creativity: 10, improvement: 10, outputQuality: 10, total: Math.max(45, 50 - index)
                    };
                    let status = 'winner';
                    let rank = index + 1;
                    if (index === 1) status = 'runner';
                    else if (index === 2) status = 'third';

                    window.EscapeStorage.updateParticipant(id, {
                        round3: {
                            ...p.round3,
                            score: defaultScore,
                            evaluated: true,
                            evalStatus: status,
                            finalRank: rank
                        }
                    });
                }
            });
            this.showToast(`🏆 Approved ${count} finalist(s) as Winners / Podium!`, 'green');
            this.clearSelection(3);
            this.renderStats();
            this.renderRound3List();
        }
    }

    approveSelectedRegistrations() {
        this.approveSelected('reg');
    }

    approveSelectedRound(round) {
        this.approveSelected(round);
    }

    deleteSelectedRound(round) {
        this.deleteSelected(round);
    }

    approveSelectedRound1() { this.approveSelected(1); }
    deleteSelectedRound1() { this.deleteSelected(1); }
    approveSelectedRound2() { this.approveSelected(2); }
    deleteSelectedRound2() { this.deleteSelected(2); }
    approveSelectedRound3() { this.approveSelected(3); }
    deleteSelectedRound3() { this.deleteSelected(3); }

    deleteSingleParticipant(id, name) {
        if (confirm(`🗑️ Delete participant "${name}" (${id})?`)) {
            window.EscapeStorage.deleteParticipant(id);
            this.selectedRegIds.delete(id);
            this.selectedR1Ids.delete(id);
            this.selectedR2Ids.delete(id);
            this.selectedR3Ids.delete(id);
            this.showToast(`Deleted ${name} (${id})`, 'green');
            this.renderStats();
            this.renderCurrentView();
        }
    }

    toggleFilterDuplicates() {
        this.showDuplicatesOnly = !this.showDuplicatesOnly;
        const btn = document.getElementById('btn-find-duplicates');
        if (btn) {
            if (this.showDuplicatesOnly) {
                btn.classList.add('btn-red');
                btn.classList.remove('btn-amber');
                btn.textContent = '✕ Show All Registrations';
            } else {
                btn.classList.add('btn-amber');
                btn.classList.remove('btn-red');
                btn.textContent = '⚠️ Highlight Duplicates';
            }
        }
        this.renderRegistrations();
    }

    setParticipantStatus(id, newStatus) {
        const updates = { status: newStatus };
        if (newStatus === 'Approved') {
            updates.round1 = {
                ...window.EscapeStorage.getParticipant(id).round1,
                status: 'unlocked'
            };
        }
        window.EscapeStorage.updateParticipant(id, updates);
        this.showToast(`Updated status for ${id} to ${newStatus}`, newStatus === 'Approved' ? 'green' : 'red');
        this.renderStats();
        this.renderRegistrations();
    }

    // ==========================================
    // 2. ROUND 1 VIEW & EVALUATION
    // ==========================================
    renderRound1List() {
        const tbody = document.getElementById('r1-table-body');
        if (!tbody) return;

        let list = window.EscapeStorage.getParticipants().filter(p => p.status === 'Approved');
        
        // Sort score-wise descending (highest score first)
        list.sort((a, b) => (b.round1.score.total || 0) - (a.round1.score.total || 0));

        if (this.filterQuery) {
            list = list.filter(p => this.matchesSearch(p));
        }

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                        <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔍</div>
                        <div style="font-size: 1rem; color: #fff;">No Round 1 participants matching "<strong>${this.filterQuery}</strong>"</div>
                        <button class="btn btn-sm btn-outline" style="margin-top: 1rem;" onclick="adminApp.clearSearch()">Clear Search</button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(p => {
            const hasSubmitted = p.round1.prompt !== '';
            let evalTag = `<span class="badge badge-amber">Pending</span>`;
            if (p.round1.evalStatus === 'selected') evalTag = `<span class="badge badge-green">Selected (Top 5)</span>`;
            if (p.round1.evalStatus === 'rejected') evalTag = `<span class="badge badge-red">Rejected</span>`;

            const isChecked = this.selectedR1Ids.has(p.id);

            return `
                <tr class="${isChecked ? 'row-selected' : ''}">
                    <td style="text-align: center;">
                        <input type="checkbox" class="r1-checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="adminApp.toggleSelectOne(1, '${p.id}', this)" style="cursor: pointer; width: 16px; height: 16px;">
                    </td>
                    <td><span class="id-badge">${p.id}</span></td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.college}</td>
                    <td>
                        ${hasSubmitted 
                            ? `<span style="color: var(--green-glow);">Submitted (${Math.floor(p.round1.timeTakenSec/60)}m ${p.round1.timeTakenSec%60}s)</span>` 
                            : `<span style="color: var(--text-muted);">In Progress</span>`}
                    </td>
                    <td>
                        <strong style="color: var(--cyan-glow); font-family: var(--font-mono); font-size:1.1rem;">
                            ${p.round1.score.total > 0 ? `${p.round1.score.total}/40` : '-'}
                        </strong>
                        ${p.round1.promptQualityScore ? `<br><span class="badge badge-green" style="font-size:0.72rem; padding: 2px 6px; margin-top: 3px; display: inline-block;">${p.round1.promptQualityScore}% Quality</span>` : ''}
                    </td>
                    <td>${evalTag}</td>
                    <td>
                        <div style="display:flex; gap:0.4rem; align-items:center;">
                            <button class="btn btn-sm btn-cyan" onclick="adminApp.openRound1Eval('${p.id}')">
                                📝 Evaluate
                            </button>
                            <button class="btn btn-sm btn-outline" style="color: #ff5252; border-color: rgba(255,23,68,0.4); padding: 0.35rem 0.6rem;" onclick="adminApp.deleteSingleParticipant('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Delete candidate">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateSelectedCount(1);
    }

    openRound1Eval(id) {
        this.selectedParticipantId = id;
        this.navigate('round-1-eval');
    }

    renderRound1Eval() {
        const container = document.getElementById('r1-eval-container');
        if (!container) return;

        const p = window.EscapeStorage.getParticipant(this.selectedParticipantId);
        if (!p) {
            container.innerHTML = `<div class="text-center" style="padding: 2rem;">No participant selected. Please return to Round 1 list.</div>`;
            return;
        }

        const score = p.round1.score;

        container.innerHTML = `
            <div class="evaluation-card">
                <div class="flex-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <span class="id-badge" style="font-size: 1rem;">${p.id}</span>
                        <h2 style="display:inline; margin-left: 0.75rem; font-size: 1.3rem;">${p.name}</h2>
                        <span style="color: var(--text-secondary); margin-left: 0.5rem;">(${p.college} • ${p.department})</span>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="adminApp.navigate('round-1')">← Back to R1 List</button>
                    </div>
                </div>

                <div class="eval-grid">
                    <div>
                        <div class="eval-prompt-display">
                            <div class="eval-prompt-title">SUBMITTED PROMPT:</div>
                            <div class="eval-prompt-body">${p.round1.prompt || 'Participant has not submitted a prompt yet.'}</div>
                        </div>

                        <div style="margin-top: 1.25rem; background: rgba(5, 9, 18, 0.85); padding: 1.2rem; border-radius: var(--radius-md); border: 1px solid rgba(0, 240, 255, 0.15);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="font-size: 0.8rem; color: var(--text-cyan); font-family: var(--font-tech); text-transform: uppercase; letter-spacing: 0.05em;">Participant's Unique Target CAPTCHA Token:</span>
                                ${p.round1.promptQualityScore ? `<span class="badge badge-green" style="font-size: 0.75rem;">Quality: ${p.round1.promptQualityScore}% (Gate ≥50% Passed)</span>` : ''}
                            </div>
                            <div style="font-family: var(--font-mono); font-size: 1.4rem; color: var(--green-glow); font-weight: 700; letter-spacing: 0.15em;">
                                ${p.round1.captchaCode || p.round1.aiOutput || window.EscapeStorage.getCaptchaForParticipant(p)}
                            </div>
                            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.6rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                                <span>Email: <code style="color: #fff;">${p.email}</code></span>
                                <span>Time Recorded: <strong style="color: #fff;">${Math.floor((p.round1.timeTakenSec || 0)/60)}m ${(p.round1.timeTakenSec || 0)%60}s</strong></span>
                                <span>Verified Marks: <strong style="color: var(--cyan-glow);">${p.round1.score.total > 0 ? `${p.round1.score.total}/40` : 'Not yet evaluated'}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div class="rubric-box">
                        <h3 style="font-size: 1rem; color: var(--cyan-glow); margin-bottom: 1rem;">ROUND 1 SCORE RUBRIC</h3>
                        
                        <div class="rubric-item">
                            <span class="rubric-label">Prompt Quality</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r1-score-quality" class="rubric-input" min="0" max="10" value="${score.quality}" oninput="adminApp.calcR1Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Correctness</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r1-score-correctness" class="rubric-input" min="0" max="10" value="${score.correctness}" oninput="adminApp.calcR1Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Creativity</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r1-score-creativity" class="rubric-input" min="0" max="10" value="${score.creativity}" oninput="adminApp.calcR1Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Time</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r1-score-time" class="rubric-input" min="0" max="10" value="${score.time}" oninput="adminApp.calcR1Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-total-bar">
                            <span class="rubric-total-title">TOTAL</span>
                            <span id="r1-score-total" class="rubric-total-score">${score.total || 0} / 40</span>
                        </div>

                        <div class="eval-actions-bar">
                            <button class="btn btn-cyan" onclick="adminApp.saveR1Score('${p.id}')">💾 SAVE SCORE</button>
                            <button class="btn btn-green" onclick="adminApp.selectR1Candidate('${p.id}')">⭐ SHORTLIST FOR R2</button>
                            <button class="btn btn-red" onclick="adminApp.rejectR1Candidate('${p.id}')">❌ REJECT</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calcR1Total() {
        const q = parseInt(document.getElementById('r1-score-quality').value || 0, 10);
        const c = parseInt(document.getElementById('r1-score-correctness').value || 0, 10);
        const cr = parseInt(document.getElementById('r1-score-creativity').value || 0, 10);
        const t = parseInt(document.getElementById('r1-score-time').value || 0, 10);
        const total = Math.min(40, q + c + cr + t);
        document.getElementById('r1-score-total').textContent = `${total} / 40`;
        return { quality: q, correctness: c, creativity: cr, time: t, total };
    }

    saveR1Score(id) {
        const scores = this.calcR1Total();
        const p = window.EscapeStorage.getParticipant(id);
        window.EscapeStorage.updateParticipant(id, {
            round1: {
                ...p.round1,
                score: scores,
                evaluated: true
            }
        });
        this.showToast(`Saved Round 1 score (${scores.total}/40) for ${id}`, 'green');
    }

    selectR1Candidate(id) {
        this.saveR1Score(id);
        const p = window.EscapeStorage.getParticipant(id);
        window.EscapeStorage.updateParticipant(id, {
            round1: {
                ...p.round1,
                evalStatus: 'selected'
            },
            round2: {
                ...p.round2,
                status: 'unlocked'
            }
        });
        this.showToast(`🌟 ${id} Shortlisted into Top 5! Round 2 unlocked for participant.`, 'green');
        this.renderStats();
    }

    rejectR1Candidate(id) {
        this.saveR1Score(id);
        const p = window.EscapeStorage.getParticipant(id);
        window.EscapeStorage.updateParticipant(id, {
            round1: {
                ...p.round1,
                evalStatus: 'rejected'
            }
        });
        this.showToast(`Candidate ${id} marked rejected for Round 1.`, 'red');
        this.renderStats();
    }

    // ==========================================
    // 3. ROUND 2 VIEW & EVALUATION (PS -> IMAGE)
    // ==========================================
    renderRound2List() {
        const tbody = document.getElementById('r2-table-body');
        if (!tbody) return;

        // Round 2 candidates are those shortlisted from Round 1
        let list = window.EscapeStorage.getParticipants().filter(p => p.round1.evalStatus === 'selected');
        
        // Sort score-wise descending (highest score first)
        list.sort((a, b) => (b.round2.score.total || 0) - (a.round2.score.total || 0));

        if (this.filterQuery) {
            list = list.filter(p => this.matchesSearch(p));
        }

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                        <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔍</div>
                        <div style="font-size: 1rem; color: #fff;">No Round 2 participants matching "<strong>${this.filterQuery}</strong>"</div>
                        <button class="btn btn-sm btn-outline" style="margin-top: 1rem;" onclick="adminApp.clearSearch()">Clear Search</button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(p => {
            const hasSubmitted = p.round2.prompt !== '';
            let evalTag = `<span class="badge badge-amber">Pending</span>`;
            if (p.round2.evalStatus === 'selected') evalTag = `<span class="badge badge-green">Selected (Top 10)</span>`;
            if (p.round2.evalStatus === 'rejected') evalTag = `<span class="badge badge-red">Rejected</span>`;

            const isChecked = this.selectedR2Ids.has(p.id);

            return `
                <tr class="${isChecked ? 'row-selected' : ''}">
                    <td style="text-align: center;">
                        <input type="checkbox" class="r2-checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="adminApp.toggleSelectOne(2, '${p.id}', this)" style="cursor: pointer; width: 16px; height: 16px;">
                    </td>
                    <td><span class="id-badge">${p.id}</span></td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.college}</td>
                    <td>
                        ${hasSubmitted 
                            ? `<span style="color: var(--green-glow);">Submitted (${Math.floor(p.round2.timeTakenSec/60)}m ${p.round2.timeTakenSec%60}s)</span>` 
                            : `<span style="color: var(--text-muted);">In Progress</span>`}
                    </td>
                    <td>
                        <strong style="color: var(--cyan-glow); font-family: var(--font-mono); font-size:1.1rem;">
                            ${p.round2.score.total > 0 ? `${p.round2.score.total}/40` : '-'}
                        </strong>
                        ${p.round2.promptQualityScore ? `<div style="font-size: 0.72rem; color: var(--amber-glow);">Quality: ${p.round2.promptQualityScore}%</div>` : ''}
                    </td>
                    <td>${evalTag}</td>
                    <td>
                        <div style="display:flex; gap:0.4rem; align-items:center;">
                            <button class="btn btn-sm btn-cyan" onclick="adminApp.openRound2Eval('${p.id}')">
                                🖼️ Evaluate Poster
                            </button>
                            <button class="btn btn-sm btn-outline" style="color: #ff5252; border-color: rgba(255,23,68,0.4); padding: 0.35rem 0.6rem;" onclick="adminApp.deleteSingleParticipant('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Delete candidate">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateSelectedCount(2);
    }

    openRound2Eval(id) {
        this.selectedParticipantId = id;
        this.navigate('round-2-eval');
    }

    renderRound2Eval() {
        const container = document.getElementById('r2-eval-container');
        if (!container) return;

        const p = window.EscapeStorage.getParticipant(this.selectedParticipantId);
        if (!p) {
            container.innerHTML = `<div class="text-center" style="padding: 2rem;">No participant selected. Please return to Round 2 list.</div>`;
            return;
        }

        const score = p.round2.score;

        container.innerHTML = `
            <div class="evaluation-card">
                <div class="flex-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <span class="id-badge" style="font-size: 1rem;">${p.id}</span>
                        <h2 style="display:inline; margin-left: 0.75rem; font-size: 1.3rem;">${p.name}</h2>
                        <span style="color: var(--text-secondary); margin-left: 0.5rem;">(${p.college})</span>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="adminApp.navigate('round-2')">← Back to R2 List</button>
                    </div>
                </div>

                <div class="problem-statement-card" style="margin-bottom: 1.5rem;">
                    <div class="ps-label">PROBLEM STATEMENT GIVEN:</div>
                    <div class="ps-text">“Create an awareness poster for a college anti-drug campaign.”</div>
                </div>

                <div class="eval-grid">
                    <div>
                        <div class="eval-prompt-display">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <div class="eval-prompt-title">PARTICIPANT'S IMAGE PROMPT:</div>
                                ${p.round2.promptQualityScore ? `<span class="badge badge-amber" style="font-size: 0.75rem;">Quality: ${p.round2.promptQualityScore}% (Gate ≥50% Passed)</span>` : ''}
                            </div>
                            <div class="eval-prompt-body">${p.round2.prompt || 'No image prompt submitted yet.'}</div>
                        </div>

                        <div style="margin-top: 1.5rem; text-align: center;">
                            <canvas id="eval-r2-canvas" width="450" height="630" style="width: 100%; max-width: 320px; border-radius: var(--radius-sm); box-shadow: 0 10px 30px rgba(0,0,0,0.8);"></canvas>
                        </div>
                    </div>

                    <div class="rubric-box">
                        <h3 style="font-size: 1rem; color: var(--amber-glow); margin-bottom: 1rem;">ROUND 2 EVALUATION (/40)</h3>
                        
                        <div class="rubric-item">
                            <span class="rubric-label">Image Prompt</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r2-score-prompt" class="rubric-input" min="0" max="10" value="${score.promptQuality}" oninput="adminApp.calcR2Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Problem Understanding</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r2-score-understanding" class="rubric-input" min="0" max="10" value="${score.understanding}" oninput="adminApp.calcR2Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Creativity</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r2-score-creativity" class="rubric-input" min="0" max="10" value="${score.creativity}" oninput="adminApp.calcR2Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Image Quality</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r2-score-quality" class="rubric-input" min="0" max="10" value="${score.imageQuality}" oninput="adminApp.calcR2Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-total-bar">
                            <span class="rubric-total-title">TOTAL</span>
                            <span id="r2-score-total" class="rubric-total-score">${score.total || 0} / 40</span>
                        </div>

                        <div class="eval-actions-bar">
                            <button class="btn btn-cyan" onclick="adminApp.saveR2Score('${p.id}')">💾 SAVE</button>
                            <button class="btn btn-green" onclick="adminApp.selectR2Candidate('${p.id}')">⭐ SELECT (TOP 10)</button>
                            <button class="btn btn-red" onclick="adminApp.rejectR2Candidate('${p.id}')">❌ REJECT</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render poster preview
        setTimeout(() => {
            const canvas = document.getElementById('eval-r2-canvas');
            if (canvas) {
                window.PosterEngine.renderPoster(canvas, p.round2.prompt);
            }
        }, 50);
    }

    calcR2Total() {
        const pr = parseInt(document.getElementById('r2-score-prompt').value || 0, 10);
        const und = parseInt(document.getElementById('r2-score-understanding').value || 0, 10);
        const cr = parseInt(document.getElementById('r2-score-creativity').value || 0, 10);
        const q = parseInt(document.getElementById('r2-score-quality').value || 0, 10);
        const total = Math.min(40, pr + und + cr + q);
        document.getElementById('r2-score-total').textContent = `${total} / 40`;
        return { promptQuality: pr, understanding: und, creativity: cr, imageQuality: q, total };
    }

    saveR2Score(id) {
        const scores = this.calcR2Total();
        const p = window.EscapeStorage.getParticipant(id);
        window.EscapeStorage.updateParticipant(id, {
            round2: {
                ...p.round2,
                score: scores,
                evaluated: true
            }
        });
        this.showToast(`Saved Round 2 score (${scores.total}/40) for ${id}`, 'green');
    }

    selectR2Candidate(id) {
        this.saveR2Score(id);
        const p = window.EscapeStorage.getParticipant(id);
        window.EscapeStorage.updateParticipant(id, {
            round2: {
                ...p.round2,
                evalStatus: 'selected'
            },
            round3: {
                ...p.round3,
                status: 'unlocked'
            }
        });
        this.showToast(`🏆 ${id} Shortlisted into Finalists (Top 10)! Round 3 unlocked.`, 'green');
        this.renderStats();
    }

    rejectR2Candidate(id) {
        this.saveR2Score(id);
        const p = window.EscapeStorage.getParticipant(id);
        window.EscapeStorage.updateParticipant(id, {
            round2: {
                ...p.round2,
                evalStatus: 'rejected'
            }
        });
        this.showToast(`Candidate ${id} marked rejected for Round 2.`, 'red');
        this.renderStats();
    }

    // ==========================================
    // 4. ROUND 3 VIEW & FINAL EVALUATION (FIX PROMPT)
    // ==========================================
    renderRound3List() {
        const tbody = document.getElementById('r3-table-body');
        if (!tbody) return;

        // Finalists shortlisted from Round 2
        let list = window.EscapeStorage.getParticipants().filter(p => p.round2.evalStatus === 'selected');
        
        // Sort score-wise descending (highest score first)
        list.sort((a, b) => (b.round3.score.total || 0) - (a.round3.score.total || 0));

        if (this.filterQuery) {
            list = list.filter(p => this.matchesSearch(p));
        }

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                        <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔍</div>
                        <div style="font-size: 1rem; color: #fff;">No Round 3 finalists matching "<strong>${this.filterQuery}</strong>"</div>
                        <button class="btn btn-sm btn-outline" style="margin-top: 1rem;" onclick="adminApp.clearSearch()">Clear Search</button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(p => {
            const hasSubmitted = p.round3.improvedPrompt !== '';
            let rankBadge = `<span class="badge badge-amber">Under Review</span>`;
            if (p.round3.evalStatus === 'winner') rankBadge = `<span class="badge badge-green">🥇 1st - WINNER</span>`;
            if (p.round3.evalStatus === 'runner') rankBadge = `<span class="badge badge-cyan">🥈 2nd - RUNNER</span>`;
            if (p.round3.evalStatus === 'third') rankBadge = `<span class="badge badge-amber">🥉 3rd - THIRD</span>`;

            const isChecked = this.selectedR3Ids.has(p.id);

            return `
                <tr class="${isChecked ? 'row-selected' : ''}">
                    <td style="text-align: center;">
                        <input type="checkbox" class="r3-checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="adminApp.toggleSelectOne(3, '${p.id}', this)" style="cursor: pointer; width: 16px; height: 16px;">
                    </td>
                    <td><span class="id-badge">${p.id}</span></td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.college}</td>
                    <td>
                        ${hasSubmitted 
                            ? `<span style="color: var(--green-glow);">Submitted (${Math.floor(p.round3.timeTakenSec/60)}m ${p.round3.timeTakenSec%60}s)</span>` 
                            : `<span style="color: var(--text-muted);">In Progress</span>`}
                    </td>
                    <td>
                        <strong style="color: var(--green-glow); font-family: var(--font-mono); font-size:1.15rem;">
                            ${p.round3.score.total > 0 ? `${p.round3.score.total}/50` : '-'}
                        </strong>
                        ${p.round3.promptQualityScore ? `<div style="font-size: 0.72rem; color: var(--green-glow);">Quality: ${p.round3.promptQualityScore}%</div>` : ''}
                    </td>
                    <td>${rankBadge}</td>
                    <td>
                        <div style="display:flex; gap:0.4rem; align-items:center;">
                            <button class="btn btn-sm btn-cyan" onclick="adminApp.openRound3Eval('${p.id}')">
                                ⚖️ Final Evaluate
                            </button>
                            <button class="btn btn-sm btn-outline" style="color: #ff5252; border-color: rgba(255,23,68,0.4); padding: 0.35rem 0.6rem;" onclick="adminApp.deleteSingleParticipant('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Delete finalist">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateSelectedCount(3);
    }

    openRound3Eval(id) {
        this.selectedParticipantId = id;
        this.navigate('round-3-eval');
    }

    renderRound3Eval() {
        const container = document.getElementById('r3-eval-container');
        if (!container) return;

        const p = window.EscapeStorage.getParticipant(this.selectedParticipantId);
        if (!p) {
            container.innerHTML = `<div class="text-center" style="padding: 2rem;">No finalist selected. Please return to Round 3 list.</div>`;
            return;
        }

        const score = p.round3.score;

        container.innerHTML = `
            <div class="evaluation-card">
                <div class="flex-between" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <span class="id-badge" style="font-size: 1rem;">${p.id}</span>
                        <h2 style="display:inline; margin-left: 0.75rem; font-size: 1.3rem;">${p.name}</h2>
                        <span style="color: var(--text-secondary); margin-left: 0.5rem;">(${p.college})</span>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="adminApp.navigate('round-3')">← Back to R3 List</button>
                    </div>
                </div>

                <div class="eval-grid">
                    <div>
                        <div class="bad-prompt-box" style="margin-bottom: 1.25rem;">
                            <div class="prompt-box-header" style="color: #ff5252;">
                                ❌ ORIGINAL BAD PROMPT
                            </div>
                            <div style="font-family: var(--font-mono); font-size: 0.95rem; color: #f87171;">
                                "Make a good college website"
                            </div>
                        </div>

                        <div class="fixed-prompt-box">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <div class="prompt-box-header" style="color: var(--green-glow); margin-bottom: 0;">
                                    ✅ PARTICIPANT'S RE-ENGINEERED PROMPT
                                </div>
                                ${p.round3.promptQualityScore ? `<span class="badge badge-green" style="font-size: 0.75rem;">Quality: ${p.round3.promptQualityScore}% (Gate ≥50% Passed)</span>` : ''}
                            </div>
                            <div style="font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.6; color: #f1f5f9; white-space: pre-wrap;">
                                ${p.round3.improvedPrompt || 'No improved prompt submitted yet.'}
                            </div>
                        </div>
                    </div>

                    <div class="rubric-box">
                        <h3 style="font-size: 1rem; color: #ff3377; margin-bottom: 1rem;">ROUND 3 – FINAL EVALUATION (/50)</h3>
                        
                        <div class="rubric-item">
                            <span class="rubric-label">Clarity</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r3-score-clarity" class="rubric-input" min="0" max="10" value="${score.clarity}" oninput="adminApp.calcR3Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Specificity</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r3-score-specificity" class="rubric-input" min="0" max="10" value="${score.specificity}" oninput="adminApp.calcR3Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Creativity</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r3-score-creativity" class="rubric-input" min="0" max="10" value="${score.creativity}" oninput="adminApp.calcR3Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Improvement</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r3-score-improvement" class="rubric-input" min="0" max="10" value="${score.improvement}" oninput="adminApp.calcR3Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-item">
                            <span class="rubric-label">Output Quality</span>
                            <div class="rubric-input-wrap">
                                <input type="number" id="r3-score-output" class="rubric-input" min="0" max="10" value="${score.outputQuality}" oninput="adminApp.calcR3Total()">
                                <span>/ 10</span>
                            </div>
                        </div>

                        <div class="rubric-total-bar">
                            <span class="rubric-total-title">TOTAL</span>
                            <span id="r3-score-total" class="rubric-total-score">${score.total || 0} / 50</span>
                        </div>

                        <div style="margin-top: 1.5rem;">
                            <div style="font-family: var(--font-tech); font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem;">
                                AWARD FINAL STATUS:
                            </div>
                            <div class="eval-actions-bar">
                                <button class="btn btn-green" onclick="adminApp.setFinalRank('${p.id}', 'winner', 1)">🥇 WINNER</button>
                                <button class="btn btn-cyan" onclick="adminApp.setFinalRank('${p.id}', 'runner', 2)">🥈 RUNNER</button>
                                <button class="btn btn-amber" onclick="adminApp.setFinalRank('${p.id}', 'third', 3)">🥉 THIRD</button>
                                <button class="btn btn-red" onclick="adminApp.setFinalRank('${p.id}', 'rejected', null)">REJECT</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calcR3Total() {
        const cl = parseInt(document.getElementById('r3-score-clarity').value || 0, 10);
        const sp = parseInt(document.getElementById('r3-score-specificity').value || 0, 10);
        const cr = parseInt(document.getElementById('r3-score-creativity').value || 0, 10);
        const im = parseInt(document.getElementById('r3-score-improvement').value || 0, 10);
        const op = parseInt(document.getElementById('r3-score-output').value || 0, 10);
        const total = Math.min(50, cl + sp + cr + im + op);
        document.getElementById('r3-score-total').textContent = `${total} / 50`;
        return { clarity: cl, specificity: sp, creativity: cr, improvement: im, outputQuality: op, total };
    }

    setFinalRank(id, status, rank) {
        const scores = this.calcR3Total();
        const p = window.EscapeStorage.getParticipant(id);
        window.EscapeStorage.updateParticipant(id, {
            round3: {
                ...p.round3,
                score: scores,
                evaluated: true,
                evalStatus: status,
                finalRank: rank
            }
        });
        this.showToast(`Final status for ${id} recorded as ${status.toUpperCase()}!`, 'green');
        this.renderStats();
    }

    // ==========================================
    // 5. FINAL LEADERBOARD & RESULTS (ADMIN ONLY)
    // ==========================================
    renderResults() {
        const podiumContainer = document.getElementById('results-podium');
        const tableBody = document.getElementById('results-table-body');
        if (!podiumContainer || !tableBody) return;

        const all = window.EscapeStorage.getParticipants();
        
        // Find 1st, 2nd, 3rd winners
        const winner = all.find(p => p.round3.evalStatus === 'winner' || p.round3.finalRank === 1);
        const runner = all.find(p => p.round3.evalStatus === 'runner' || p.round3.finalRank === 2);
        const third = all.find(p => p.round3.evalStatus === 'third' || p.round3.finalRank === 3);

        podiumContainer.innerHTML = `
            ${winner ? `
                <div class="podium-card winner">
                    <div class="podium-medal">🥇</div>
                    <div class="podium-id">${winner.id}</div>
                    <div class="podium-name">${winner.name}</div>
                    <div class="podium-college">${winner.college}</div>
                    <div class="podium-score">${winner.round3.score.total}/50</div>
                    <span class="badge badge-green" style="margin-top:0.5rem;">FIRST PLACE • WINNER</span>
                </div>
            ` : `<div class="podium-card winner"><div class="podium-medal">🥇</div><div>Winner pending</div></div>`}

            ${runner ? `
                <div class="podium-card runner">
                    <div class="podium-medal">🥈</div>
                    <div class="podium-id">${runner.id}</div>
                    <div class="podium-name">${runner.name}</div>
                    <div class="podium-college">${runner.college}</div>
                    <div class="podium-score">${runner.round3.score.total}/50</div>
                    <span class="badge badge-cyan" style="margin-top:0.5rem;">SECOND PLACE • RUNNER</span>
                </div>
            ` : `<div class="podium-card runner"><div class="podium-medal">🥈</div><div>Runner pending</div></div>`}

            ${third ? `
                <div class="podium-card third">
                    <div class="podium-medal">🥉</div>
                    <div class="podium-id">${third.id}</div>
                    <div class="podium-name">${third.name}</div>
                    <div class="podium-college">${third.college}</div>
                    <div class="podium-score">${third.round3.score.total}/50</div>
                    <span class="badge badge-amber" style="margin-top:0.5rem;">THIRD PLACE</span>
                </div>
            ` : `<div class="podium-card third"><div class="podium-medal">🥉</div><div>Third pending</div></div>`}
        `;

        // Sort all evaluated candidates by aggregate score
        let sorted = [...all]
            .filter(p => p.status === 'Approved')
            .sort((a, b) => {
                const totalA = (a.round1.score.total || 0) + (a.round2.score.total || 0) + (a.round3.score.total || 0);
                const totalB = (b.round1.score.total || 0) + (b.round2.score.total || 0) + (b.round3.score.total || 0);
                return totalB - totalA;
            });

        if (this.filterQuery) {
            sorted = sorted.filter(p => this.matchesSearch(p));
        }

        if (sorted.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                        <div style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔍</div>
                        <div style="font-size: 1rem; color: #fff;">No leaderboard records matching "<strong>${this.filterQuery}</strong>"</div>
                        <button class="btn btn-sm btn-outline" style="margin-top: 1rem;" onclick="adminApp.clearSearch()">Clear Search</button>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = sorted.map((p, idx) => {
            const r1 = p.round1.score.total || 0;
            const r2 = p.round2.score.total || 0;
            const r3 = p.round3.score.total || 0;
            const total = r1 + r2 + r3;

            let rankLabel = `${idx + 1}`;
            if (p.round3.finalRank === 1) rankLabel = `🥇 1st`;
            if (p.round3.finalRank === 2) rankLabel = `🥈 2nd`;
            if (p.round3.finalRank === 3) rankLabel = `🥉 3rd`;

            return `
                <tr>
                    <td><strong>${rankLabel}</strong></td>
                    <td><span class="id-badge">${p.id}</span></td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.college}</td>
                    <td>${r1}/40</td>
                    <td>${r2}/40</td>
                    <td>${r3}/50</td>
                    <td>
                        <strong style="color: var(--green-glow); font-family: var(--font-mono); font-size: 1.15rem;">
                            ${total}
                        </strong>
                    </td>
                </tr>
            `;
        }).join('');
    }

    exportCsv() {
        const list = window.EscapeStorage.getParticipants();
        const headers = ["ID", "Name", "College", "Dept", "Year", "Phone", "Email", "Status", "R1_Score", "R2_Score", "R3_Score", "Total_Score", "Final_Status"];
        
        const rows = list.map(p => {
            const r1 = p.round1.score.total || 0;
            const r2 = p.round2.score.total || 0;
            const r3 = p.round3.score.total || 0;
            const tot = r1 + r2 + r3;
            return [
                p.id,
                `"${p.name}"`,
                `"${p.college}"`,
                `"${p.department}"`,
                p.year,
                p.phone,
                p.email,
                p.status,
                r1,
                r2,
                r3,
                tot,
                p.round3.evalStatus || 'None'
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `prompt_escape_room_results_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        this.showToast('📊 Exported results to CSV file', 'green');
    }

    showToast(message, type = 'cyan') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>⚡</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminController();
});
