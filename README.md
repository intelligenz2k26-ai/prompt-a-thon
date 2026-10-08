# 🔐 PROMPT ESCAPE ROOM — College Technical Symposium Web App

An immersive cyberpunk-themed Prompt Engineering competition application designed for collegiate hackathons and symposiums.

---

## 🚀 Overall Flow & Architecture

```
Registration ──> Round 1 ──> Evaluation ──> Shortlist ──> Round 2 ──> Evaluation ──> Shortlist (Top 10) ──> Round 3 ──> Final Evaluation ──> 🏆 Winners
```

---

## 📁 Project Structure

```
├── index.html            # Participant Escape Vault (Registration & Levels 1-3)
├── admin.html            # Admin Command Console (Routes, Rubrics & Secret Podium)
├── css/
│   ├── main.css          # Design system tokens, buttons, glass panels, HUD styling
│   ├── participant.css   # Lock tumblers, countdown timers, CAPTCHA & poster layouts
│   └── admin.css        # Admin navigation routes, rubrics, metrics, and leaderboards
├── js/
│   ├── storage.js        # LocalStorage engine, state tracking, and 20 demo participants
│   ├── sound.js          # Web Audio API synthesizer (tumbler clicks, lock fanfare)
│   ├── captcha.js        # HTML5 Canvas distorted security token engine (7KQ9P)
│   ├── poster-gen.js     # Neural Canvas AI poster rendering simulator (Anti-Drug)
│   ├── app.js            # Participant application logic & chamber unlock transitions
│   └── admin.js          # Admin controller for scoring rubrics, shortlisting & CSV export
└── README.md
```

---

## 🎮 Chambers & Challenges

### 1. 📝 Registration
- **Public URL**: `index.html`
- **Fields**: Name, College Name, Department, Year, Phone Number, Email.
- **Auto-Generated ID**: Automatically assigns IDs such as `P001`, `P002`, `P003`...
- **Admin Approval**: Submissions queue in `/admin/registrations` where the Admin approves or rejects. Approved participants unlock Chamber 1.

### 2. 🟢 Level 01 (Easy) 🔐 — CAPTCHA + PROMPT
- **Target Lock**: Security Token `7KQ9P` rendered with realistic canvas noise, grid distortion, and chromatic aberration.
- **Task**: *"Read the code and create a prompt that asks AI to identify the code correctly."*
- **Time**: 5-minute countdown with warning states.
- **Unlock**: On prompt submission, the AI decryptor verifies the prompt, outputs the unique security code, plays mechanical unlock audio, and unlocks Lock 1.
- **Evaluation Rubric (/40)**:
  - Prompt Quality: `/10`
  - Correctness: `/10`
  - Creativity: `/10`
  - Time: `/10`
  - **Action**: Save Score, **Shortlist Candidate**, Reject.

### 3. 🟡 Level 02 (Medium) 🔐 — PS → IMAGE CREATION
- **Eligibility**: Shortlisted candidates from Round 1.
- **Problem Statement (PS)**: *“Create an awareness poster for a college anti-drug campaign.”*
- **Task**: Participant drafts an AI image generation prompt (Midjourney/DALL-E style) addressing theme, college context, and visuals.
- **Time**: 10-minute countdown.
- **Interactive Visual**: Synthesizes the poster in real time onto an HTML5 canvas based on prompt keywords!
- **Evaluation Rubric (/40)**:
  - Image Prompt: `/10`
  - Problem Understanding: `/10`
  - Creativity: `/10`
  - Image Quality: `/10`
  - **Action**: Save, **Select (Top 10)**, Reject.

### 4. 🔴 Level 03 (Hard) 🔐 — FIX THE PROMPT
- **Eligibility**: Shortlisted **Top 10 finalists** only.
- **Bad Prompt**: ❌ *"Make a good college website"*
- **Task**: Re-engineer this vague prompt into an expert, context-rich specification for a modern symposium website.
- **Time**: 10-minute countdown.
- **Vault Clearance**: Submits improved prompt, clearing the final vault chamber.
- **Final Evaluation Rubric (/50)**:
  - Clarity: `/10`
  - Specificity: `/10`
  - Creativity: `/10`
  - Improvement: `/10`
  - Output Quality: `/10`
  - **Designations**: 🥇 **WINNER**, 🥈 **RUNNER**, 🥉 **THIRD**, REJECT.

---

## 🛡️ Admin Command Console (`admin.html`)

Access dedicated routes without page reloads:
- `admin.html#/registrations` — View participants, Approve / Reject.
- `admin.html#/round-1` — View Round 1 submissions and status.
- `admin.html#/round-1-eval` — Score Round 1 (/40) and shortlist candidates.
- `admin.html#/round-2` — View Round 2 submissions.
- `admin.html#/round-2-eval` — Score posters (/40) with visual preview and shortlist Top 10 finalists.
- `admin.html#/round-3` — View Round 3 submissions (Top 10 finalists).
- `admin.html#/round-3-eval` — Score re-engineered prompts (/50) and award Winner/Runner/3rd.
- `admin.html#/results` — **Secret Jury Leaderboard** featuring Winner Podium (🥇, 🥈, 🥉) and consolidated scores (Participant marks strictly hidden from public view).

### Additional Features:
- **Instant Live Search**: Real-time filtering across all participant fields (ID, Name, College, Department, Year, Phone, Email, Status).
- **Export CSV Button**: Downloads complete symposium performance matrix.
- **Audio Synthesizer**: Web Audio API lock clicks, gear rotations, and unlock fanfares (toggleable ON/OFF).
- **Zero External Dependencies**: Pure Vanilla HTML5, CSS3, and modern JavaScript. Runs instantly in any modern web browser.

---

## ⚡ How to Run the Application

### Method 1: Run with `npx serve` (Recommended)

Open a terminal inside the project directory and run:

```bash
npx -y serve -p 5000 .
```

Then access the portals in your web browser:
- 🎮 **Participant Escape Room**: [`http://localhost:5000`](http://localhost:5000)
- 🛡️ **Admin Command Console**: [`http://localhost:5000/admin.html`](http://localhost:5000/admin.html)

---

### Method 2: Open Directly Without a Server

Because this project uses 100% Vanilla HTML, CSS, and JavaScript with zero build steps or package dependencies, you can also open the files directly:

1. Navigate to the project directory in your file explorer.
2. Double-click [`index.html`](file:///c:/Users/RSM_F/OneDrive/Documents/GitHub/sympo%20prompt-a-than/index.html) to open the Participant Portal.
3. Double-click [`admin.html`](file:///c:/Users/RSM_F/OneDrive/Documents/GitHub/sympo%20prompt-a-than/admin.html) to open the Admin Portal.
