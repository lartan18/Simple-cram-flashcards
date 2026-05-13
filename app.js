// File configuration (edit these values)
const FILE_OPTIONS = {
  'Week 1': './week-1.txt',
  'Week 2': './week-2.txt',
  'Week 3': './week-3.txt',
  'Week 4': './week-4.txt',
  'Week 5': './week-5.txt',
  'Week 6': './week-6.txt',
  'Week 7': './week-7.txt',
  'Week 8': './week-8.txt',
  'Week 9': './week-9.txt',
  'Week 10': './week-10.txt',
  'Week 11': './week-11.txt',
};
const DEFAULT_FILE_KEY = 'Week 1';
const TERM_SEPARATOR = '\\';
const CARD_SEPARATOR = '$';

// State
let state = FlashcardEngine.createState([]);

// DOM Elements
const loadError = document.getElementById('loadError');
const appTitle = document.getElementById('appTitle');

const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');
const cardCounter = document.getElementById('cardCounter');
const progressBar = document.getElementById('progressBar');

const flipBtn = document.getElementById('flipBtn');
const wrongBtn = document.getElementById('wrongBtn');
const correctBtn = document.getElementById('correctBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const removeBtn = document.getElementById('removeBtn');
const deckSelect = document.getElementById('deckSelect');

// Event Listeners
flipBtn.addEventListener('click', flipCard);
wrongBtn.addEventListener('click', markWrong);
correctBtn.addEventListener('click', markCorrect);
shuffleBtn.addEventListener('click', toggleShuffle);
removeBtn.addEventListener('click', removeCurrentCard);
flashcard.addEventListener('click', flipCard);
deckSelect.addEventListener('change', () => {
  loadFlashcards(deckSelect.value);
});

document.addEventListener('keydown', handleKeyPress);
document.addEventListener('DOMContentLoaded', () => {
  deckSelect.value = FILE_OPTIONS[DEFAULT_FILE_KEY];
  loadFlashcards(deckSelect.value);
});

// Load Flashcards
function loadFlashcards(filePath) {
  const path = (filePath || '').trim();
  const termSep = TERM_SEPARATOR;
  const cardSep = CARD_SEPARATOR;

  if (!path) {
    loadError.textContent = 'Please select a deck';
    return;
  }

  appTitle.textContent = FlashcardEngine.formatTitleFromPath(path);
  document.title = appTitle.textContent;
  loadError.textContent = 'Loading...';

  fetch('/api/load-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: path }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        loadError.textContent = `Error: ${data.error}`;
        return;
      }

      const cards = parseCards(data.content, termSep, cardSep);
      if (cards.length === 0) {
        return;
      }
      state = FlashcardEngine.createState(cards);
      loadError.textContent = '';
      shuffleBtn.classList.remove('is-active');
      shuffleBtn.title = 'Shuffle rounds';
      shuffleBtn.setAttribute('aria-label', shuffleBtn.title);
      updateCardDisplay();
      updateProgressBar();
    })
    .catch((err) => {
      loadError.textContent = `Error: ${err.message}`;
    });
}

function parseCards(content, termSep, cardSep) {
  if (!cardSep) {
    loadError.textContent = 'CARD_SEPARATOR must not be empty.';
    return [];
  }

  if (!termSep) {
    loadError.textContent = 'TERM_SEPARATOR must not be empty.';
    return [];
  }

  const cards = FlashcardEngine.parseCards(content, termSep, cardSep);

  if (cards.length === 0) {
    loadError.textContent = 'No valid cards found. Check separators.';
    return [];
  }

  return cards;
}

// Card Navigation & Display
function getCardsAtMinLevel() {
  return FlashcardEngine.getCardsAtMinLevel(state);
}

function getFilteredCards() {
  return FlashcardEngine.getFilteredCards(state);
}

function getCurrentCard() {
  return FlashcardEngine.getCurrentCard(state);
}

function updateCardDisplay() {
  const card = getCurrentCard();

  if (state.roundTransition) {
    const info = state.roundTransition;
    const count = info.count || 0;
    if (count === 0 || !info.level) {
      cardContent.textContent = 'All cards complete';
      flipBtn.textContent = 'Flip card';
      flipBtn.disabled = true;
      flashcard.classList.remove('round-transition');
    } else {
      const levelText = `Level ${info.level}`;
      const cardText = count === 1 ? '1 card' : `${count} cards`;
      cardContent.textContent = `Next round\n${levelText} · ${cardText}`;
      flipBtn.textContent = 'Start round';
      flipBtn.disabled = false;
      flashcard.classList.add('round-transition');
    }
    cardContent.className = 'card-content';
    cardCounter.textContent = 'Next round';
    wrongBtn.disabled = true;
    correctBtn.disabled = true;
    removeBtn.disabled = true;
    return;
  }

  if (!card) {
    cardContent.textContent = 'No cards available';
    cardCounter.textContent = 'Card 0 of 0';
    flipBtn.textContent = 'Flip card';
    flipBtn.disabled = true;
    wrongBtn.disabled = true;
    correctBtn.disabled = true;
    removeBtn.disabled = true;
    flashcard.classList.remove('round-transition');
    return;
  }

  const roundSize = state.round ? state.round.cardIds.length : 0;
  const roundIndex = state.round ? state.round.index : 0;
  cardCounter.textContent = `Card ${roundIndex + 1} of ${roundSize}`;

  flipBtn.textContent = 'Flip card';
  wrongBtn.disabled = !state.hasRevealedCurrent;
  correctBtn.disabled = !state.hasRevealedCurrent;
  removeBtn.disabled = false;
  flashcard.classList.remove('round-transition');

  if (state.isRevealed) {
    cardContent.textContent = card.definition;
    cardContent.className = 'card-content definition revealed';
  } else {
    cardContent.textContent = card.term;
    cardContent.className = 'card-content';
  }
}

function flipCard() {
  if (state.roundTransition) {
    if (FlashcardEngine.startNextRound(state)) {
      updateProgressBar();
      updateCardDisplay();
    }
    return;
  }

  if (!FlashcardEngine.flipCard(state)) return;
  updateCardDisplay();
}

function markWrong() {
  if (!FlashcardEngine.markWrong(state)) return;
  updateProgressBar();
  updateCardDisplay();
}

function markCorrect() {
  if (!FlashcardEngine.markCorrect(state)) return;
  updateProgressBar();
  updateCardDisplay();
}

function removeCurrentCard() {
  if (!FlashcardEngine.removeCurrentCard(state)) return;
  updateProgressBar();
  updateCardDisplay();
}

// Shuffle
function toggleShuffle() {
  FlashcardEngine.toggleShuffle(state);
  shuffleBtn.classList.toggle('is-active', state.isShuffled);
  shuffleBtn.title = state.isShuffled ? 'Shuffle rounds (on)' : 'Shuffle rounds';
  shuffleBtn.setAttribute('aria-label', shuffleBtn.title);
  updateCardDisplay();
  updateProgressBar();
}

// Progress Bar
function updateProgressBar() {
  const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const currentCard = getCurrentCard();
  const currentLevel = state.roundTransition
    ? state.roundTransition.level
    : currentCard
      ? state.cardStates[currentCard.id].level
      : null;

  Object.values(state.cardStates).forEach((cardState) => {
    levelCounts[cardState.level]++;
  });

  progressBar.innerHTML = Object.keys(levelCounts)
    .sort((a, b) => Number(b) - Number(a))
    .map((level) => {
      const count = levelCounts[level];
      const isActive = count > 0 ? 'active' : '';
      const isCurrent = currentLevel && Number(level) === currentLevel ? 'current' : '';
      return `
        <div class="level-item ${isActive} ${isCurrent}">
          <span class="level-badge">L${level}</span>
          <span class="level-count">${count}</span>
        </div>
      `;
    })
    .join('');
}

// Keyboard Shortcuts
function handleKeyPress(e) {
  if (!state.cards || state.cards.length === 0) return;

  if (state.roundTransition) {
    if (e.key === 'ArrowRight') {
      if (FlashcardEngine.startNextRound(state)) {
        updateProgressBar();
        updateCardDisplay();
      }
    }
    return;
  }

  const canAnswer = state.hasRevealedCurrent;

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    flipCard();
  } else if (e.key === 'ArrowLeft' && canAnswer) {
    markWrong();
  } else if (e.key === 'ArrowRight' && canAnswer) {
    markCorrect();
  }
}
