/* Flashcard engine: pure logic for parsing and Leitner progression */
(function (global) {
  function parseCards(content, termSep, cardSep) {
    if (!termSep || !cardSep) return [];

    return content
      .split(cardSep)
      .map((text) => text.trim())
      .filter((text) => text)
      .map((cardText, index) => {
        const parts = cardText.split(termSep);
        if (parts.length < 2) return null;

        const term = parts[0].trim();
        const definition = parts.slice(1).join(termSep).trim();

        return { id: `card-${index}`, term, definition };
      })
      .filter((card) => card !== null);
  }

  function createState(cards, rng = Math.random) {
    const state = {
      cards: [...cards],
      currentCardIndex: 0,
      isRevealed: false,
      isShuffled: false,
      hasRevealedCurrent: false,
      cardStates: {},
      round: { cardIds: [], index: 0 },
      roundTransition: null,
    };

    state.cards.forEach((card) => {
      state.cardStates[card.id] = {
        level: 1,
        shuffleOrder: rng(),
      };
    });

    buildRound(state);
    return state;
  }

  function buildRound(state) {
    const filtered = getFilteredCards(state);
    state.round = {
      cardIds: filtered.map(({ card }) => card.id),
      index: 0,
    };
    state.currentCardIndex = 0;
  }

  function getRoundInfo(state) {
    const levels = Object.values(state.cardStates).map((s) => s.level);
    if (levels.length === 0) {
      return { level: null, count: 0 };
    }

    const minLevel = Math.min(...levels);
    const count = levels.filter((level) => level === minLevel).length;
    return { level: minLevel, count };
  }

  function getCardsAtMinLevel(state) {
    if (!state.cards.length || Object.keys(state.cardStates).length === 0) {
      return [];
    }

    const minLevel = Math.min(...Object.values(state.cardStates).map((s) => s.level));
    return state.cards
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => state.cardStates[card.id].level === minLevel);
  }

  function getFilteredCards(state) {
    const cardsAtMinLevel = getCardsAtMinLevel(state);

    if (state.isShuffled) {
      return cardsAtMinLevel.sort((a, b) => {
        return state.cardStates[a.card.id].shuffleOrder - state.cardStates[b.card.id].shuffleOrder;
      });
    }

    return cardsAtMinLevel.sort((a, b) => a.index - b.index);
  }

  function getCurrentCard(state) {
    if (state.roundTransition) return null;
    if (!state.round || state.round.cardIds.length === 0) return null;

    const safeIndex = Math.min(state.round.index, state.round.cardIds.length - 1);
    const cardId = state.round.cardIds[safeIndex];
    return state.cards.find((card) => card.id === cardId) || null;
  }

  function flipCard(state) {
    const card = getCurrentCard(state);
    if (!card) return false;

    state.isRevealed = !state.isRevealed;
    if (state.isRevealed) {
      state.hasRevealedCurrent = true;
    }

    return true;
  }

  function advanceAfterAnswer(state, answeredCardId) {
    if (!state.round || state.round.cardIds.length === 0) {
      state.roundTransition = getRoundInfo(state);
      return;
    }

    const indexInRound = state.round.cardIds.indexOf(answeredCardId);
    const nextIndex = indexInRound === -1 ? state.round.index : indexInRound + 1;

    if (nextIndex >= state.round.cardIds.length) {
      state.roundTransition = getRoundInfo(state);
      state.round = { cardIds: [], index: 0 };
      state.currentCardIndex = 0;
    } else {
      state.round.index = nextIndex;
      state.currentCardIndex = nextIndex;
    }

    state.hasRevealedCurrent = false;
  }

  function markWrong(state) {
    const card = getCurrentCard(state);
    if (!card || !state.hasRevealedCurrent) return false;

    state.cardStates[card.id].level = 1;
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    advanceAfterAnswer(state, card.id);
    return true;
  }

  function markCorrect(state) {
    const card = getCurrentCard(state);
    if (!card || !state.hasRevealedCurrent) return false;

    const currentLevel = state.cardStates[card.id].level;
    if (currentLevel < 5) {
      state.cardStates[card.id].level = currentLevel + 1;
    }
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    advanceAfterAnswer(state, card.id);
    return true;
  }

  function removeCurrentCard(state) {
    const card = getCurrentCard(state);
    if (!card) return false;

    const removeIndex = state.cards.indexOf(card);
    if (removeIndex === -1) return false;

    state.cards.splice(removeIndex, 1);
    delete state.cardStates[card.id];

    if (state.round) {
      const roundIndex = state.round.cardIds.indexOf(card.id);
      if (roundIndex !== -1) {
        state.round.cardIds.splice(roundIndex, 1);
        if (roundIndex < state.round.index) {
          state.round.index -= 1;
        }
      }

      if (state.round.index >= state.round.cardIds.length) {
        if (state.round.cardIds.length === 0) {
          state.roundTransition = getRoundInfo(state);
        }
        state.round.index = 0;
      }
      state.currentCardIndex = state.round.index;
    }

    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    return true;
  }

  function nextCard(state) {
    if (state.roundTransition) return false;
    if (state.round.cardIds.length > 0 && state.round.index < state.round.cardIds.length - 1) {
      state.round.index += 1;
      state.currentCardIndex = state.round.index;
      state.isRevealed = false;
      state.hasRevealedCurrent = false;
      return true;
    }
    return false;
  }

  function prevCard(state) {
    if (state.roundTransition) return false;
    if (state.round.index > 0) {
      state.round.index -= 1;
      state.currentCardIndex = state.round.index;
      state.isRevealed = false;
      state.hasRevealedCurrent = false;
      return true;
    }
    return false;
  }

  function resetState(state, rng = Math.random) {
    state.cardStates = {};
    state.cards.forEach((card) => {
      state.cardStates[card.id] = {
        level: 1,
        shuffleOrder: rng(),
      };
    });
    state.currentCardIndex = 0;
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    state.roundTransition = null;
    buildRound(state);
  }

  function toggleShuffle(state, rng = Math.random) {
    state.isShuffled = !state.isShuffled;

    if (state.isShuffled) {
      state.cards.forEach((card) => {
        state.cardStates[card.id].shuffleOrder = rng();
      });
    }

    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    if (!state.roundTransition) {
      buildRound(state);
    }
    return state.isShuffled;
  }

  function startNextRound(state) {
    if (!state.roundTransition) return false;
    if (!state.roundTransition.level || state.roundTransition.count === 0) return false;
    state.roundTransition = null;
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    buildRound(state);
    return true;
  }

  function formatTitleFromPath(filePath) {
    if (!filePath) return 'Flashcards';
    const fileName = filePath.split(/[\\/]/).pop() || '';
    const base = fileName.replace(/\.txt$/i, '').replace(/-/g, ' ').trim();
    if (!base) return 'Flashcards';
    return base
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  const api = {
    parseCards,
    createState,
    getCardsAtMinLevel,
    getFilteredCards,
    getCurrentCard,
    flipCard,
    markWrong,
    markCorrect,
    removeCurrentCard,
    nextCard,
    prevCard,
    resetState,
    toggleShuffle,
    advanceAfterAnswer,
    startNextRound,
    formatTitleFromPath,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.FlashcardEngine = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
