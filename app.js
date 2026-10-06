const orbWrapper = document.getElementById('orbWrapper');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');

const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let state = 'idle';

function setState(next) {
  state = next;
  orbWrapper.classList.remove('listening', 'thinking', 'speaking');
  if (next !== 'idle') orbWrapper.classList.add(next);
}

const statusText = {
  idle: 'Jarvis wird aktiviert...',
  listening: 'Ich höre zu...',
  thinking: 'Analysiere...',
  speaking: 'Jarvis antwortet...'
};

function setStatus(text) {
  statusEl.textContent = text;
}

const intents = [
  {
    pattern: /verdien\w*.*?(\d+)\s*euro|(\d+)\s*euro.*verdien/i,
    respond: (match) => {
      const amount = match[1] || match[2] || '500';
      return `Verstanden. Um ${amount} Euro zu erreichen, schlage ich drei Wege vor: erstens kurzfristige Freelance-Aufträge auf Plattformen wie Fiverr oder Upwork, zweitens den Verkauf ungenutzter Gegenstände, und drittens kleinere Gigs wie Nachhilfe oder Lieferdienste. Das ist eine Simulation – ich habe noch nichts real ausgeführt.`;
    }
  },
  {
    pattern: /wer bist du|dein name/i,
    respond: () => `Ich bin Jarvis, dein persönlicher Assistent. Ich befinde mich derzeit im Simulationsmodus.`
  },
  {
    pattern: /wetter/i,
    respond: () => `Ich habe aktuell keinen Zugriff auf echte Wetterdaten. Das ist eine simulierte Antwort.`
  },
  {
    pattern: /hallo jarvis|hey jarvis|hallo|guten tag/i,
    respond: () => `Hallo. Wie kann ich dir helfen?`
  }
];

function generateResponse(text) {
  for (const intent of intents) {
    const match = text.match(intent.pattern);
    if (match) return intent.respond(match);
  }
  return `Das habe ich nicht ganz verstanden. Ich bin noch ein einfacher Prototyp und kenne nur wenige Befehle, zum Beispiel "Verdiene 500 Euro für uns".`;
}

let cachedVoices = [];
window.speechSynthesis.addEventListener('voiceschanged', () => {
  cachedVoices = window.speechSynthesis.getVoices();
});
cachedVoices = window.speechSynthesis.getVoices();

function pickMaleVoice() {
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  const deVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
  const pool = deVoices.length ? deVoices : voices;
  const maleNames = ['stefan', 'david', 'male', 'markus', 'yannick', 'conrad', 'daniel'];
  const femaleNames = ['female', 'katja', 'helena', 'anna', 'zira', 'petra', 'frau'];
  let match = pool.find(v => maleNames.some(n => v.name.toLowerCase().includes(n)));
  if (!match) match = pool.find(v => !femaleNames.some(n => v.name.toLowerCase().includes(n)));
  return match || pool[0];
}

function speak(text) {
  setState('speaking');
  setStatus(statusText.speaking);
  transcriptEl.textContent = text;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  utterance.rate = 1.5;
  const voice = pickMaleVoice();
  if (voice) utterance.voice = voice;
  utterance.onend = () => {
    setState('idle');
    startListening();
  };
  utterance.onerror = () => {
    setState('idle');
    startListening();
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function handleTranscript(text) {
  transcriptEl.textContent = `Du: "${text}"`;
  setState('thinking');
  setStatus(statusText.thinking);

  setTimeout(() => {
    const response = generateResponse(text);
    speak(response);
  }, 900);
}

let restartTimer = null;

function startListening() {
  if (!SpeechRecognitionImpl) {
    setStatus('Spracherkennung wird von diesem Browser nicht unterstützt. Bitte Chrome verwenden.');
    return;
  }
  if (state === 'listening' || state === 'thinking' || state === 'speaking') return;
  clearTimeout(restartTimer);

  recognition = new SpeechRecognitionImpl();
  recognition.lang = 'de-DE';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    setState('listening');
    setStatus(statusText.listening);
    transcriptEl.textContent = '';
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    handleTranscript(text);
  };

  recognition.onerror = (event) => {
    setState('idle');
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      setStatus('Kein Mikrofonzugriff. Bitte erlauben und den Orb klicken.');
      return;
    }
    restartTimer = setTimeout(startListening, 500);
  };

  recognition.onend = () => {
    if (state === 'listening') {
      setState('idle');
      restartTimer = setTimeout(startListening, 300);
    }
  };

  recognition.start();
}

orbWrapper.addEventListener('click', () => {
  if (state === 'idle') {
    startListening();
  }
});

startListening();
