const API_KEY = "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";
let selectedMood = "";
let breathingActive = false;
let breathPhase = 0;
let breathTimer = null;
let breathInterval = null;
let breathCount = 0;

const FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v3:free",
    "qwen/qwen3-8b:free",
    "mistralai/mistral-small-3.2-24b-instruct:free",
    "deepseek/deepseek-r1:free",
    "openrouter/auto"
];

const MOOD_COLORS = { Happy:"#22c55e", Anxious:"#f59e0b", Sad:"#3b82f6", Stressed:"#ef4444", Numb:"#8b5cf6" };
const MOOD_HEIGHTS = { Happy:90, Anxious:55, Sad:45, Stressed:70, Numb:35 };

const MODAL_CONTENT = {
    meditate: {
        title: "🧘 5-Minute Meditation",
        body: "Find a comfortable position. Close your eyes.\n\n1. Take 3 deep breaths slowly.\n2. Focus only on your breathing.\n3. When thoughts come, gently return to your breath.\n4. Repeat for 5 minutes.\n\nEven 2 minutes helps! 💙"
    },
    journal: {
        title: "📔 Journaling Tips",
        body: "Try these prompts:\n\n• 'Right now I feel... because...'\n• 'Today was hard because...'\n• 'One thing I am grateful for is...'\n• 'Tomorrow I want to feel...'\n\nWrite honestly, for your eyes only. 💙"
    },
    talk: {
        title: "💬 Talk It Out",
        body: "You can:\n\n• Select your mood and write in the journal box — our AI responds warmly.\n• Call a friend or family member you trust.\n• Talk to a school counselor.\n• Call iCall: 9152987821 (free helpline).\n\nYou are not alone. 💙"
    }
};

// ── MOOD ────────────────────────────────────────────────
function selectMood(btn, mood) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMood = mood;
    document.getElementById('mood-badge').textContent = mood + ' mood';
}

function updateCharCount(el) {
    document.getElementById('char-count').textContent = el.value.length;
}

// ── AI ───────────────────────────────────────────────────
async function callAI(model, mood, journal) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`,
            "HTTP-Referer": "http://localhost:8383",
            "X-Title": "MindEase"
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content:
`You are MindEase, a compassionate teen mental health AI.
Student mood: ${mood}
They wrote: "${journal}"
Respond with:
1. Warm acknowledgment (1-2 sentences)
2. **Tip 1:** practical action
3. **Tip 2:** practical action
4. **Tip 3:** practical action
5. Short motivational closing with an emoji
Be warm, friendly, teen-appropriate.`
            }]
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

async function analyzeMood() {
    if (!selectedMood) {
        alert("👆 Please select how you're feeling first!");
        return;
    }
    const journal = document.getElementById('journal').value || "I just wanted to check in.";
    const btn = document.getElementById('analyze-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Analyzing...';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';

    let aiText = null;
    for (let i = 0; i < FREE_MODELS.length; i++) {
        try {
            document.getElementById('loading-model').textContent = `Trying model ${i+1} of ${FREE_MODELS.length}...`;
            aiText = await callAI(FREE_MODELS[i], selectedMood, journal);
            break;
        } catch(e) { console.log(`Model ${i+1} failed`, e.message); }
    }

    btn.disabled = false;
    btn.textContent = '🔍 Analyze My Mood';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result').style.display = 'block';

    if (aiText) {
        document.getElementById('ai-response').innerHTML = aiText
            .replace(/\n/g,'<br>')
            .replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')
            .replace(/\*(.*?)\*/g,'<i>$1</i>');
        saveMood(selectedMood, journal, aiText);
        loadHistory();
        document.getElementById('result').scrollIntoView({ behavior:'smooth', block:'nearest' });
    } else {
        document.getElementById('ai-response').innerHTML =
            `<div style="color:#ef4444;padding:12px;background:#fef2f2;border-radius:10px;">
            ❌ All AI models are busy. Please wait a minute and try again!</div>`;
    }
}

// ── BREATHING EXERCISE (FIXED) ───────────────────────────
const PHASES = [
    { label: "Inhale... 🌬️", phase: "Breathe IN", seconds: 4, scale: "scale(1.4)" },
    { label: "Hold... 🤫",   phase: "Hold",        seconds: 7, scale: "scale(1.4)" },
    { label: "Exhale... 😮‍💨", phase: "Breathe OUT", seconds: 8, scale: "scale(1.0)" },
];

function toggleBreathing() {
    if (breathingActive) {
        stopBreathing();
    } else {
        startBreathing();
    }
}

function startBreathing() {
    breathingActive = true;
    breathPhase = 0;
    breathCount = 0;
    document.getElementById('breath-btn').textContent = '⏹ Stop';
    runPhase();
}

function stopBreathing() {
    breathingActive = false;
    clearTimeout(breathTimer);
    clearInterval(breathInterval);

    const circle = document.getElementById('breath-circle');
    const counter = document.getElementById('breath-counter');
    circle.style.transition = 'transform 0.5s ease';
    circle.style.transform = 'scale(1)';
    circle.style.background = 'rgba(255,255,255,0.25)';

    document.getElementById('breath-label').textContent = 'Tap to Start';
    document.getElementById('breath-phase').textContent = '4-7-8 Breathing';
    if (counter) counter.textContent = '';
    document.getElementById('breath-btn').textContent = '▶ Start';
}

function runPhase() {
    if (!breathingActive) return;

    const p = PHASES[breathPhase];
    const circle = document.getElementById('breath-circle');
    const counter = document.getElementById('breath-counter');

    // Update labels
    document.getElementById('breath-label').textContent = p.label;
    document.getElementById('breath-phase').textContent = p.phase;

    // Animate circle
    circle.style.transition = `transform ${p.seconds}s ease-in-out, background ${p.seconds}s ease`;
    circle.style.transform = p.scale;
    circle.style.background = breathPhase === 0
        ? 'rgba(255,255,255,0.45)'
        : breathPhase === 1
        ? 'rgba(255,220,100,0.4)'
        : 'rgba(100,200,255,0.35)';

    // Countdown
    let remaining = p.seconds;
    if (counter) counter.textContent = remaining + 's';
    clearInterval(breathInterval);
    breathInterval = setInterval(() => {
        remaining--;
        if (counter) counter.textContent = remaining > 0 ? remaining + 's' : '';
        if (remaining <= 0) clearInterval(breathInterval);
    }, 1000);

    // Next phase
    breathTimer = setTimeout(() => {
        if (!breathingActive) return;
        breathPhase = (breathPhase + 1) % 3;
        if (breathPhase === 0) breathCount++;
        runPhase();
    }, p.seconds * 1000);
}

// ── QUICK ACTIONS ────────────────────────────────────────
function showModal(type) {
    const c = MODAL_CONTENT[type];
    document.getElementById('modal-title').textContent = c.title;
    document.getElementById('modal-body').innerHTML = c.body.replace(/\n/g,'<br>');
    document.getElementById('modal').classList.add('active');
}

function closeModal(e) {
    if (e.target.id === 'modal') document.getElementById('modal').classList.remove('active');
}

// ── HISTORY ──────────────────────────────────────────────
function saveMood(mood, journal, response) {
    let db = JSON.parse(localStorage.getItem('mindease_db') || '{"moods":[]}');
    db.moods.push({ mood, journal, response, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() });
    if (db.moods.length > 20) db.moods = db.moods.slice(-20);
    localStorage.setItem('mindease_db', JSON.stringify(db));
}

function loadHistory() {
    let db = JSON.parse(localStorage.getItem('mindease_db') || '{"moods":[]}');
    const EMOJI = { Happy:'😊', Anxious:'😟', Sad:'😔', Stressed:'😤', Numb:'😐' };
    const recent = db.moods.slice(-7);
    const bars = document.getElementById('chart-bars');
    const labels = document.getElementById('chart-labels');

    if (recent.length > 0) {
        bars.innerHTML = recent.map(m =>
            `<div class="chart-bar" style="height:${MOOD_HEIGHTS[m.mood]||40}%;background:${MOOD_COLORS[m.mood]||'rgba(255,255,255,0.4)'}90;" title="${m.mood}"></div>`
        ).join('');
        labels.innerHTML = recent.map(m =>
            `<div class="chart-label">${EMOJI[m.mood]||'💭'}</div>`
        ).join('');
    } else {
        bars.innerHTML = '<div style="color:rgba(255,255,255,0.5);font-size:12px;padding:8px;">No data yet</div>';
        labels.innerHTML = '';
    }

    const list = document.getElementById('history-list');
    if (db.moods.length === 0) {
        list.innerHTML = '<div class="history-empty">No entries yet — analyze your mood to start! 💙</div>';
        return;
    }
    list.innerHTML = db.moods.slice(-6).reverse().map(m =>
        `<div class="history-item">
            <span class="history-mood">${EMOJI[m.mood]||'💭'} ${m.mood}</span>
            <span class="history-date">${m.date} · ${m.time}</span>
        </div>`
    ).join('');
}

function clearHistory() {
    if (confirm('Clear all mood history?')) {
        localStorage.removeItem('mindease_db');
        loadHistory();
    }
}

// ── DARK MODE ─────────────────────────────────────────────
function toggleDark() {
    document.body.classList.toggle('dark');
    document.querySelector('.dark-toggle').textContent =
        document.body.classList.contains('dark') ? '☀️' : '🌙';
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
}

function emergency() {
    alert("You're not alone 💙\n\nReach out anytime:\n\n📞 iCall: 9152987821\n📞 Vandrevala: 1860-2662-345\n📞 AASRA: 9820466627\n\nHelp is available 24/7 💙");
}

window.onload = () => {
    loadHistory();
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        document.querySelector('.dark-toggle').textContent = '☀️';
    }
};
