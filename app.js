// File configuration (edit these three values)
// const FILE_PATH = 'c:\\Users\\Lars\\Personlig IT\\cram-replacement\\sample-flashcards.txt';
const FILE_PATH = "./sample-flashcards.txt"
const TERM_SEPARATOR = '\\';
const CARD_SEPARATOR = '$';

// State
const state = {
  cards: [],
  currentCardIndex: 0,
  isRevealed: false,
  isShuffled: false,
  hasRevealedCurrent: false,
  cardStates: {}, // { cardId: { level: 1, shuffleOrder: 3 } }
};

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

      const hasCards = parseCards(data.content, termSep, cardSep);
      if (!hasCards) {
        return;
      }
      initializeGame();
      loadError.textContent = '';
    })
    .catch((err) => {
      loadError.textContent = `Error: ${err.message}`;
    });
}

function parseCards(content, termSep, cardSep) {
  if (!cardSep) {
    loadError.textContent = 'CARD_SEPARATOR must not be empty.';
    return false;
  }

  if (!termSep) {
    loadError.textContent = 'TERM_SEPARATOR must not be empty.';
    return false;
  }

  const cardTexts = content.split(cardSep).map((text) => text.trim()).filter((text) => text);

  state.cards = cardTexts.map((cardText, index) => {
    const parts = cardText.split(termSep);
    if (parts.length < 2) return null;

    const term = parts[0].trim();
    const definition = parts.slice(1).join(termSep).trim();

    return {
      id: `card-${index}`,
      term,
      definition,
    };
  }).filter((card) => card !== null);

  if (state.cards.length === 0) {
    loadError.textContent = 'No valid cards found. Check separators.';
    return false;
  }

  return true;
}

function initializeGame() {
  state.cardStates = {};
  state.cards.forEach((card) => {
    state.cardStates[card.id] = {
      level: 1,
      shuffleOrder: Math.random(),
    };
  });

  state.currentCardIndex = 0;
  state.isRevealed = false;
  state.hasRevealedCurrent = false;
  state.isShuffled = false;
  updateCardDisplay();
  updateProgressBar();
}

// Card Navigation & Display
function getCardsAtMinLevel() {
  if (!state.cards.length || Object.keys(state.cardStates).length === 0) {
    return [];
  }

  const minLevel = Math.min(...Object.values(state.cardStates).map((s) => s.level));
  return state.cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => state.cardStates[card.id].level === minLevel);
}

function getFilteredCards() {
  const cardsAtMinLevel = getCardsAtMinLevel();

  if (state.isShuffled) {
    return cardsAtMinLevel.sort((a, b) => {
      return state.cardStates[a.card.id].shuffleOrder - state.cardStates[b.card.id].shuffleOrder;
    });
  }

  return cardsAtMinLevel.sort((a, b) => a.index - b.index);
}

function getCurrentCard() {
  const filteredCards = getFilteredCards();
  if (filteredCards.length === 0) return null;

  const actualIndex = state.cards.indexOf(filteredCards[state.currentCardIndex].card);
  return state.cards[actualIndex];
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
  const card = getCurrentCard();
  if (!card) return;

  state.isRevealed = !state.isRevealed;
  if (state.isRevealed) {
    state.hasRevealedCurrent = true;
  }
  updateCardDisplay();
}

function markWrong() {
  const card = getCurrentCard();
  if (card) {
    if (!state.hasRevealedCurrent) return;
    state.cardStates[card.id].level = 1;
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    updateProgressBar();
    advanceAfterAnswer(card.id);
  }
}

function markCorrect() {
  const card = getCurrentCard();
  if (card) {
    if (!state.hasRevealedCurrent) return;
    const currentLevel = state.cardStates[card.id].level;
    if (currentLevel < 5) {
      state.cardStates[card.id].level = currentLevel + 1;
    }
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    updateProgressBar();
    advanceAfterAnswer(card.id);
  }
}

function removeCurrentCard() {
  const card = getCurrentCard();
  if (!card) return;

  const removeIndex = state.cards.indexOf(card);
  if (removeIndex === -1) return;

  state.cards.splice(removeIndex, 1);
  delete state.cardStates[card.id];

  const filteredCards = getFilteredCards();
  if (state.currentCardIndex >= filteredCards.length) {
    state.currentCardIndex = Math.max(0, filteredCards.length - 1);
  }

  state.isRevealed = false;
  state.hasRevealedCurrent = false;
  updateProgressBar();
  updateCardDisplay();
}

function advanceAfterAnswer(answeredCardId) {
  const filteredCards = getFilteredCards();
  if (filteredCards.length === 0) {
    state.currentCardIndex = 0;
    updateCardDisplay();
    return;
  }

  const indexInFiltered = filteredCards.findIndex(({ card }) => card.id === answeredCardId);

  if (indexInFiltered === -1) {
    if (state.currentCardIndex >= filteredCards.length) {
      state.currentCardIndex = 0;
    }
  } else if (indexInFiltered >= filteredCards.length - 1) {
    state.currentCardIndex = 0;
  } else {
    state.currentCardIndex = indexInFiltered + 1;
  }

  state.hasRevealedCurrent = false;
  updateCardDisplay();
}

function nextCard() {
  const filteredCards = getFilteredCards();
  if (filteredCards.length > 0 && state.currentCardIndex < filteredCards.length - 1) {
    state.currentCardIndex += 1;
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    updateCardDisplay();
  }
}

function prevCard() {
  if (state.currentCardIndex > 0) {
    state.currentCardIndex -= 1;
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    updateCardDisplay();
  }
}

function startOver() {
  state.cardStates = {};
  state.cards.forEach((card) => {
    state.cardStates[card.id] = {
      level: 1,
      shuffleOrder: Math.random(),
    };
  });

  state.currentCardIndex = 0;
  state.isRevealed = false;
  state.hasRevealedCurrent = false;
  updateCardDisplay();
  updateProgressBar();
}

// Shuffle
function toggleShuffle() {
  state.isShuffled = !state.isShuffled;

  if (state.isShuffled) {
    // Regenerate shuffle order for all cards
    state.cards.forEach((card) => {
      state.cardStates[card.id].shuffleOrder = Math.random();
    });
    shuffleBtn.textContent = '🔀 Shuffle All Rounds (ON)';
  } else {
    shuffleBtn.textContent = '🔀 Shuffle All Rounds';
  }

  state.currentCardIndex = 0;
  state.isRevealed = false;
  state.hasRevealedCurrent = false;
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
