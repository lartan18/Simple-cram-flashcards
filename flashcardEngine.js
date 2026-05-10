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
    };

    state.cards.forEach((card) => {
      state.cardStates[card.id] = {
        level: 1,
        shuffleOrder: rng(),
      };
    });

    return state;
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
    const filteredCards = getFilteredCards(state);
    if (filteredCards.length === 0) return null;

    const actualIndex = state.cards.indexOf(filteredCards[state.currentCardIndex].card);
    return state.cards[actualIndex];
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
    const filteredCards = getFilteredCards(state);
    if (filteredCards.length === 0) {
      state.currentCardIndex = 0;
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

    const filteredCards = getFilteredCards(state);
    if (state.currentCardIndex >= filteredCards.length) {
      state.currentCardIndex = Math.max(0, filteredCards.length - 1);
    }

    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    return true;
  }

  function nextCard(state) {
    const filteredCards = getFilteredCards(state);
    if (filteredCards.length > 0 && state.currentCardIndex < filteredCards.length - 1) {
      state.currentCardIndex += 1;
      state.isRevealed = false;
      state.hasRevealedCurrent = false;
      return true;
    }
    return false;
  }

  function prevCard(state) {
    if (state.currentCardIndex > 0) {
      state.currentCardIndex -= 1;
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
  }

  function toggleShuffle(state, rng = Math.random) {
    state.isShuffled = !state.isShuffled;

    if (state.isShuffled) {
      state.cards.forEach((card) => {
        state.cardStates[card.id].shuffleOrder = rng();
      });
    }

    state.currentCardIndex = 0;
    state.isRevealed = false;
    state.hasRevealedCurrent = false;
    return state.isShuffled;
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
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.FlashcardEngine = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
