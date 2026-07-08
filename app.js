const API_KEY = "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";

let selectedMood = "";

const FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v3:free",
    "qwen/qwen3-8b:free",
    "mistralai/mistral-small-3.2-24b-instruct:free",
    "deepseek/deepseek-r1:free",
    "openrouter/auto"
];

const MOOD_COLORS = {
    Happy: "#22c55e", Anxious: "#f59e0b",
    Sad: "#3b82f6", Stressed: "#ef4444", Numb: "#8b5cf6"
};

function selectMood(btn, mood) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMood = mood;
    document.getElementById('mood-badge').textContent = mood;
    document.getElementById('mood-badge').style.background = MOOD_COLORS[mood] + "20";
    document.getElementById('mood-badge').style.color = MOOD_COLORS[mood];
}

function updateCharCount(textarea) {
    const count = textarea.value.length;
    document.getElementById('char-count').textContent = count;
    if (count > 280) textarea.value = textarea.value.substring(0, 300);
}

function toggleDark() {
    document.body.classList.toggle('dark');
    const btn = document.querySelector('.dark-toggle');
    btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
}

async function callAI(model, mood, journal) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`,
            "HTTP-Referer": "http://localhost:8383",
            "X-Title": "MindEase"
        },
        body: JSON.stringify({
            model: model,
            messages: [{
                role: "user",
                content: `You are a compassionate teen mental health assistant named MindEase.
A student is feeling: ${mood}
They wrote: "${journal}"

Respond warmly with:
1. A genuine acknowledgment of their feeling (1-2 sentences)
2. **Three practical tips** to feel better right now (format as **Tip:** description)
3. One short motivational closing line

Keep it friendly, warm, and teen-appropriate. Use some emojis naturally.`
            }]
        })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

async function analyzeMood() {
    if (!selectedMood) {
        // Shake the mood card to prompt selection
        const card = document.querySelector('.mood-grid');
        card.style.animation = 'none';
        card.offsetHeight;
        card.style.animation = 'shake 0.4s ease';
        setTimeout(() => card.style.animation = '', 500);
        alert("👆 Please select how you're feeling first!");
        return;
    }

    const journal = document.getElementById('journal').value || "I just selected my mood";
    const btn = document.getElementById('analyze-btn');

    btn.disabled = true;
    btn.textContent = '⏳ Analyzing...';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';

    let aiText = null;

    for (let i = 0; i < FREE_MODELS.length; i++) {
        try {
            document.getElementById('loading-model').textContent =
                `Trying AI model ${i + 1} of ${FREE_MODELS.length}...`;
            aiText = await callAI(FREE_MODELS[i], selectedMood, journal);
            break;
        } catch (e) {
            console.log(`Model ${i+1} failed:`, e.message);
        }
    }

    btn.disabled = false;
    btn.textContent = '🔍 Analyze My Mood';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result').style.display = 'block';

    if (aiText) {
        const formatted = aiText
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>');
        document.getElementById('ai-response').innerHTML = formatted;
        document.getElementById('mood-badge').textContent = selectedMood + ' mood';
        saveMood(selectedMood, journal, aiText);
        loadHistory();
        document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        document.getElementById('ai-response').innerHTML = `
            <div style="color:#ef4444; padding:12px; background:#fef2f2; border-radius:10px;">
                ❌ All AI models are busy. Please wait a minute and try again!
            </div>`;
    }
}

function saveMood(mood, journal, response) {
    let db = JSON.parse(localStorage.getItem('mindease_db') || '{"moods":[]}');
    db.moods.push({
        mood, journal, response,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now()
    });
    // Keep only last 20 entries
    if (db.moods.length > 20) db.moods = db.moods.slice(-20);
    localStorage.setItem('mindease_db', JSON.stringify(db));
}

function loadHistory() {
    let db = JSON.parse(localStorage.getItem('mindease_db') || '{"moods":[]}');
    const list = document.getElementById('history-list');

    if (db.moods.length === 0) {
        list.innerHTML = '<div class="history-empty">No mood entries yet — start by analyzing your mood! 💙</div>';
        return;
    }

    const moodEmojis = { Happy: '😊', Anxious: '😟', Sad: '😔', Stressed: '😤', Numb: '😐', General: '💭' };

    list.innerHTML = db.moods.slice(-7).reverse().map(item => `
        <div class="history-item">
            <span class="history-mood">${moodEmojis[item.mood] || '💭'} ${item.mood}</span>
            <span class="history-date">${item.date} · ${item.time}</span>
        </div>
    `).join('');
}

function clearHistory() {
    if (confirm('Clear all mood history?')) {
        localStorage.removeItem('mindease_db');
        loadHistory();
    }
}

function emergency() {
    alert("You're not alone 💙\n\nReach out to:\n\n📞 iCall (India): 9152987821\n📞 Vandrevala Foundation: 1860-2662-345\n📞 AASRA: 9820466627\n\nYou matter. Help is available 24/7.");
}

// Init
window.onload = () => {
    loadHistory();
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        document.querySelector('.dark-toggle').textContent = '☀️';
    }
};

// Add shake animation
const style = document.createElement('style');
style.textContent = `@keyframes shake {
    0%,100%{transform:translateX(0)}
    25%{transform:translateX(-8px)}
    75%{transform:translateX(8px)}
}`;
document.head.appendChild(style);
