// File configuration (edit these three values)
// const FILE_PATH = 'c:\\Users\\Lars\\Personlig IT\\cram-replacement\\sample-flashcards.txt';
const FILE_PATH = "./week-3.txt"
const TERM_SEPARATOR = '\\';
const CARD_SEPARATOR = '$';

// State
let state = FlashcardEngine.createState([]);

// DOM Elements
const loadError = document.getElementById('loadError');

const flashcard = document.getElementById('flashcard');
const cardContent = document.getElementById('cardContent');
const cardCounter = document.getElementById('cardCounter');
const cardLevel = document.getElementById('cardLevel');
const progressBar = document.getElementById('progressBar');

const flipBtn = document.getElementById('flipBtn');
const wrongBtn = document.getElementById('wrongBtn');
const correctBtn = document.getElementById('correctBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const removeBtn = document.getElementById('removeBtn');

const prevCardBtn = document.getElementById('prevCardBtn');
const nextCardBtn = document.getElementById('nextCardBtn');
const startOverBtn = document.getElementById('startOverBtn');

// Event Listeners
flipBtn.addEventListener('click', flipCard);
wrongBtn.addEventListener('click', markWrong);
correctBtn.addEventListener('click', markCorrect);
shuffleBtn.addEventListener('click', toggleShuffle);
removeBtn.addEventListener('click', removeCurrentCard);
prevCardBtn.addEventListener('click', prevCard);
nextCardBtn.addEventListener('click', nextCard);
startOverBtn.addEventListener('click', startOver);
flashcard.addEventListener('click', flipCard);

document.addEventListener('keydown', handleKeyPress);
document.addEventListener('DOMContentLoaded', loadFlashcards);

// Load Flashcards
function loadFlashcards() {
  const path = FILE_PATH.trim();
  const termSep = TERM_SEPARATOR;
  const cardSep = CARD_SEPARATOR;

  if (!path) {
    loadError.textContent = 'Please set FILE_PATH in app.js';
    return;
  }

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

  if (!card) {
    cardContent.textContent = 'No cards available';
    cardCounter.textContent = 'Card 0 of 0';
    cardLevel.textContent = 'Level: -';
    flipBtn.disabled = true;
    wrongBtn.disabled = true;
    correctBtn.disabled = true;
    removeBtn.disabled = true;
    return;
  }

  const filteredCards = getFilteredCards();
  cardCounter.textContent = `Card ${state.currentCardIndex + 1} of ${filteredCards.length}`;

  const level = state.cardStates[card.id].level;
  cardLevel.textContent = `Level: ${level}/5`;
  wrongBtn.disabled = !state.hasRevealedCurrent;
  correctBtn.disabled = !state.hasRevealedCurrent;
  removeBtn.disabled = false;

  if (state.isRevealed) {
    cardContent.textContent = card.definition;
    cardContent.className = 'card-content definition revealed';
  } else {
    cardContent.textContent = card.term;
    cardContent.className = 'card-content';
  }
}

function flipCard() {
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

function nextCard() {
  if (!FlashcardEngine.nextCard(state)) return;
  updateCardDisplay();
}

function prevCard() {
  if (!FlashcardEngine.prevCard(state)) return;
  updateCardDisplay();
}

function startOver() {
  FlashcardEngine.resetState(state);
  updateCardDisplay();
  updateProgressBar();
}

// Shuffle
function toggleShuffle() {
  FlashcardEngine.toggleShuffle(state);
  shuffleBtn.textContent = state.isShuffled ? '🔀 Shuffle All Rounds (ON)' : '🔀 Shuffle All Rounds';
  updateCardDisplay();
}

// Progress Bar
function updateProgressBar() {
  const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  Object.values(state.cardStates).forEach((cardState) => {
    levelCounts[cardState.level]++;
  });

  progressBar.innerHTML = Object.keys(levelCounts)
    .map((level) => {
      const count = levelCounts[level];
      const isActive = count > 0 ? 'active' : '';
      return `
        <div class="level-item ${isActive}">
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

  const canAnswer = state.hasRevealedCurrent;

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    flipCard();
  } else if (e.key === 'ArrowLeft' && canAnswer) {
    markWrong();
  } else if (e.key === 'ArrowRight' && canAnswer) {
    markCorrect();
  }
}
