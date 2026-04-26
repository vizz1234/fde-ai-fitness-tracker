/**
 * Aura - AI Fitness Tracker
 * State Management, Routing, and AI Integration
 */

// --- State Management ---
const STATE_KEY = 'aura_state';

let state = {
  profile: null, // { name, age, goal, apiKey }
  workouts: [] // { id, date, type, duration, feeling, aiFeedback }
};

function loadState() {
  const saved = localStorage.getItem(STATE_KEY);
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// --- DOM Elements ---
const views = {
  setup: document.getElementById('view-setup'),
  dashboard: document.getElementById('view-dashboard'),
  log: document.getElementById('view-log')
};

// Forms
const setupForm = document.getElementById('setup-form');
const logForm = document.getElementById('log-form');

// Dashboard Elements
const greetName = document.getElementById('greet-name');
const displayGoal = document.getElementById('display-goal');
const workoutList = document.getElementById('workout-list');

// Buttons
const btnAddWorkout = document.getElementById('btn-add-workout');
const btnBackLog = document.getElementById('btn-back-log');
const btnSettings = document.getElementById('btn-settings');
const btnSubmitLog = document.getElementById('btn-submit-log');

// AI Modal Elements
const modalFeedback = document.getElementById('modal-feedback');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnModalDone = document.getElementById('btn-modal-done');
const aiFeedbackContent = document.getElementById('ai-feedback-content');
const aiLoading = document.getElementById('ai-loading');

// Reset Modal Elements
const btnResetInit = document.getElementById('btn-reset-init');
const modalReset = document.getElementById('modal-reset');
const btnCancelReset = document.getElementById('btn-cancel-reset');
const btnConfirmReset = document.getElementById('btn-confirm-reset');

// --- Routing ---
function switchView(viewName) {
  Object.values(views).forEach(view => view.classList.add('hidden'));
  views[viewName].classList.remove('hidden');
  
  if (viewName === 'dashboard') {
    renderDashboard();
  }
}

// --- Initialization ---
function init() {
  loadState();
  if (state.profile && state.profile.name) {
    switchView('dashboard');
  } else {
    switchView('setup');
  }
}

// --- Setup Form ---
setupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = document.getElementById('setup-name').value.trim();
  const age = document.getElementById('setup-age').value.trim();
  const weight = document.getElementById('setup-weight').value.trim();
  const height = document.getElementById('setup-height').value.trim();
  const goal = document.getElementById('setup-goal').value.trim();
  const apiKey = document.getElementById('setup-api-key').value.trim();
  
  state.profile = { name, age, weight, height, goal, apiKey };
  saveState();
  
  switchView('dashboard');
});

// Settings button resets back to setup
btnSettings.addEventListener('click', () => {
  // Pre-fill
  if (state.profile) {
    document.getElementById('setup-name').value = state.profile.name || '';
    document.getElementById('setup-age').value = state.profile.age || '';
    document.getElementById('setup-weight').value = state.profile.weight || '';
    document.getElementById('setup-height').value = state.profile.height || '';
    document.getElementById('setup-goal').value = state.profile.goal || '';
    document.getElementById('setup-api-key').value = state.profile.apiKey || '';
  }
  switchView('setup');
});

// Reset App Flow (using custom modal instead of browser confirm)
btnResetInit.addEventListener('click', () => {
  modalReset.classList.remove('hidden');
});

btnCancelReset.addEventListener('click', () => {
  modalReset.classList.add('hidden');
});

btnConfirmReset.addEventListener('click', () => {
  // 1. Clear LocalStorage
  localStorage.removeItem(STATE_KEY);
  
  // 2. Clear state variables
  state = {
    profile: null,
    workouts: []
  };
  
  // 3. Clear HTML Forms manually
  setupForm.reset();
  logForm.reset();
  
  // 4. Force hard reload from server
  window.location.reload(true);
});

// --- Dashboard Render ---
function renderDashboard() {
  if (!state.profile) return;
  
  greetName.textContent = `Hello, ${state.profile.name}`;
  displayGoal.textContent = `Goal: ${state.profile.goal}`;
  
  renderWorkoutList();
}

function renderWorkoutList() {
  workoutList.innerHTML = '';
  
  if (state.workouts.length === 0) {
    workoutList.innerHTML = `
      <div class="empty-state">
        <p>No workouts logged yet. Start your journey today!</p>
      </div>
    `;
    return;
  }
  
  // Sort by newest first
  const sorted = [...state.workouts].sort((a, b) => b.id - a.id);
  
  sorted.forEach(w => {
    const el = document.createElement('div');
    el.className = 'workout-item slide-up';
    
    const dateObj = new Date(w.id);
    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    
    let tagsHtml = '';
    if (w.calories || w.muscles || w.calories_to_eat) {
      tagsHtml = '<div class="workout-tags">';
      if (w.calories && w.calories !== 'N/A') tagsHtml += `<span class="tag tag-calories">🔥 Burned ~${w.calories} kcal</span>`;
      if (w.muscles && w.muscles !== 'N/A') tagsHtml += `<span class="tag tag-muscles">💪 ${w.muscles}</span>`;
      if (w.calories_to_eat && w.calories_to_eat !== 'N/A') tagsHtml += `<span class="tag tag-diet">🍽️ Eat ~${w.calories_to_eat} kcal</span>`;
      tagsHtml += '</div>';
    }

    el.innerHTML = `
      <div class="workout-header">
        <div class="workout-type">${w.type}</div>
        <div class="workout-date">${dateStr}</div>
      </div>
      <div class="workout-duration">${w.duration} minutes</div>
      ${tagsHtml}
      <div class="workout-feeling">"${w.feeling}"</div>
      <div class="ai-feedback-preview" data-id="${w.id}">
        <strong>Aura says:</strong> Click to read insight...
      </div>
    `;
    
    workoutList.appendChild(el);
  });

  // Attach listeners to feedback previews
  document.querySelectorAll('.ai-feedback-preview').forEach(preview => {
    preview.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      const workout = state.workouts.find(w => w.id === id);
      if (workout) {
        showModal(workout.aiFeedback);
      }
    });
  });
}

// --- Log Workout Flow ---
btnAddWorkout.addEventListener('click', () => switchView('log'));
btnBackLog.addEventListener('click', () => {
  logForm.reset();
  switchView('dashboard');
});

logForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const type = document.getElementById('log-type').value.trim();
  const duration = document.getElementById('log-duration').value.trim();
  const feeling = document.getElementById('log-feeling').value.trim();
  
  // Show Loading state
  btnSubmitLog.disabled = true;
  aiLoading.classList.remove('hidden');
  
  // Call AI
  const aiResult = await getAIRecommendations(type, duration, feeling);
  
  // Save Workout
  const workout = {
    id: Date.now(),
    type,
    duration,
    feeling,
    aiFeedback: aiResult.feedback,
    calories: aiResult.calories,
    muscles: aiResult.muscles,
    calories_to_eat: aiResult.calories_to_eat
  };
  
  state.workouts.push(workout);
  saveState();
  
  // Reset and Return
  btnSubmitLog.disabled = false;
  aiLoading.classList.add('hidden');
  logForm.reset();
  
  switchView('dashboard');
  showModal(aiResult.feedback);
});

// --- Modal Functions ---
function showModal(markdownText) {
  aiFeedbackContent.innerHTML = marked.parse(markdownText);
  modalFeedback.classList.remove('hidden');
}

function hideModal() {
  modalFeedback.classList.add('hidden');
}

btnCloseModal.addEventListener('click', hideModal);
btnModalDone.addEventListener('click', hideModal);

// --- AI Integration (Direct to Gemini) ---
/**
 * Calls the Gemini API directly from the browser.
 */
async function getAIRecommendations(type, duration, feeling) {
  const { name, age, weight, height, goal, apiKey } = state.profile;
  
  // Default mock if no key
  if (!apiKey) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          feedback: `Great job on your ${duration}-minute ${type} session, ${name}! \n\nSince your goal is to "${goal}", keep building on this momentum. *(Note: This is a simulated response since no API key was provided).*`,
          calories: "300",
          muscles: "Various",
          calories_to_eat: "2200"
        });
      }, 1500);
    });
  }

  const systemPrompt = `You are Aura, an intelligent and encouraging fitness AI.
The user is ${age} years old, ${weight} kg, and ${height} cm tall. 
Their primary fitness goal is: "${goal}".

You MUST return your response as a valid JSON object with EXACTLY four keys:
1. "feedback": Your encouraging advice and safety checks (Use Markdown). Keep it under 150 words.
2. "calories": An integer representing the rough estimate of calories burned during the workout.
3. "muscles": A string listing the primary muscles targeted (e.g., "Chest, Triceps").
4. "calories_to_eat": An integer representing the daily total calories the person should eat to reach their goal based on their stats and activity.

CRITICAL SAFETY GUARDRAILS:
- DO NOT provide medical advice. If they mention pain or injury, advise consulting a professional.
- Dietary Guardrail: NEVER suggest eating less than 1200 calories a day. If their goal requires extreme calorie restriction, push back gently and suggest a minimum safe target (e.g., 1500 kcal). Ensure the calorie recommendation is healthy and sustainable.
- Return ONLY the JSON object, with no markdown formatting around it.`;

  const userPrompt = `Workout Activity: ${type}
Duration: ${duration} minutes
How it felt: "${feeling}"

Please provide the JSON analysis.`;

  // Real API Call to Gemini
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let jsonStr = data.candidates[0].content.parts[0].text;
    
    // Parse JSON
    try {
      const finalData = JSON.parse(jsonStr.trim());
      return {
        feedback: finalData.feedback || "Good job!",
        calories: finalData.calories || "N/A",
        muscles: finalData.muscles || "N/A",
        calories_to_eat: finalData.calories_to_eat || "N/A"
      };
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", e, jsonStr);
      return {
        feedback: jsonStr, // fallback to raw text if parsing fails
        calories: "N/A",
        muscles: "N/A",
        calories_to_eat: "N/A"
      };
    }
    
  } catch (error) {
    console.error("AI Generation Error:", error);
    return {
      feedback: `**Oops!** There was an issue connecting to the AI backend. \n\nError: ${error.message}\n\nPlease check your API key.`,
      calories: "N/A",
      muscles: "N/A",
      calories_to_eat: "N/A"
    };
  }
}

// Start App
init();
