const API_KEY = "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";

let selectedMood = "";

const FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v3:free",
    "deepseek/deepseek-r1:free",
    "qwen/qwen3-8b:free",
    "mistralai/mistral-small-3.2-24b-instruct:free",
    "openrouter/auto"
];

function selectMood(btn, mood) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMood = mood;
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
                content: `You are a compassionate teen mental health assistant.
A student is feeling: ${mood}
They wrote: "${journal}"
Give a warm response with:
1. Acknowledge their feeling
2. Three practical tips to feel better
3. One motivational line
Keep it short and teen-friendly.`
            }]
        })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

async function analyzeMood() {
    if (!selectedMood) {
        alert("👆 Please select a mood first!");
        return;
    }

    const journal = document.getElementById('journal').value || "Nothing additional";
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';
    document.getElementById('ai-response').innerHTML = '';

    for (let i = 0; i < FREE_MODELS.length; i++) {
        try {
            console.log("Trying model:", FREE_MODELS[i]);
            document.querySelector('.loading p').textContent = 
                `Trying AI model ${i + 1} of ${FREE_MODELS.length}...`;
            
            const aiText = await callAI(FREE_MODELS[i], selectedMood, journal);
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('result').style.display = 'block';
            document.getElementById('ai-response').innerHTML =
                aiText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            
            saveMood(selectedMood, journal, aiText);
            loadHistory();
            return; // Success! Stop trying more models

        } catch (error) {
            console.log(`Model ${FREE_MODELS[i]} failed:`, error.message);
            // Try next model
        }
    }

    // All models failed
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result').style.display = 'block';
    document.getElementById('ai-response').innerHTML = `
        <div style="color:#e74c3c; padding:12px; background:#ffeaea; border-radius:8px;">
            ❌ All AI models are busy right now.<br><br>
            Please wait <b>2 minutes</b> and try again!<br>
            <small>Free models have limited capacity</small>
        </div>`;
}

function saveMood(mood, journal, response) {
    let db = JSON.parse(localStorage.getItem('mindease_db') || '{"moods":[]}');
    db.moods.push({
        mood: mood,
        journal: journal,
        response: response,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    });
    localStorage.setItem('mindease_db', JSON.stringify(db));
}

function loadHistory() {
    let db = JSON.parse(localStorage.getItem('mindease_db') || '{"moods":[]}');
    const list = document.getElementById('history-list');
    if (db.moods.length === 0) {
        list.innerHTML = '<p style="color:#999;font-size:13px">No history yet</p>';
        return;
    }
    list.innerHTML = db.moods.slice(-5).reverse().map(item => `
        <div class="history-item">
            <span>${item.mood}</span>
            <span>${item.date}</span>
        </div>
    `).join('');
}

function emergency() {
    alert("Please reach out to:\n\n📞 iCall: 9152987821\n📞 Vandrevala: 1860-2662-345\n\nYou are not alone! 💙");
}

window.onload = loadHistory;
