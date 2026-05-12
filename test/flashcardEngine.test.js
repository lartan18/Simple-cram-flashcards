const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../flashcardEngine');

function buildState(content, rng = () => 0.5) {
  const cards = Engine.parseCards(content, '\\', '$');
  return Engine.createState(cards, rng);
}

test('parseCards splits by separators and preserves term/definition', () => {
  const content = 'Apple\\a red fruit$Banana\\a yellow fruit$Orange\\an orange citrus fruit';
  const cards = Engine.parseCards(content, '\\', '$');

  assert.equal(cards.length, 3);
  assert.equal(cards[0].term, 'Apple');
  assert.equal(cards[0].definition, 'a red fruit');
  assert.equal(cards[2].term, 'Orange');
  assert.equal(cards[2].definition, 'an orange citrus fruit');
});

test('parseCards keeps separator chars inside definitions', () => {
  const content = 'Key\\value\\with\\slashes$Another\\entry';
  const cards = Engine.parseCards(content, '\\', '$');

  assert.equal(cards.length, 2);
  assert.equal(cards[0].term, 'Key');
  assert.equal(cards[0].definition, 'value\\with\\slashes');
});

test('createState initializes all cards at level 1', () => {
  const content = 'A\\one$B\\two$C\\three';
  const state = buildState(content, () => 0.25);

  Object.values(state.cardStates).forEach((cardState) => {
    assert.equal(cardState.level, 1);
    assert.equal(cardState.shuffleOrder, 0.25);
  });
});

test('formatTitleFromPath formats file names for the UI title', () => {
  const title = Engine.formatTitleFromPath('c:\\cards\\my-flashcards.txt');
  assert.equal(title, 'My Flashcards');
});

test('formatTitleFromPath handles relative paths and casing', () => {
  const title = Engine.formatTitleFromPath('./WEEK-3.TXT');
  assert.equal(title, 'Week 3');
});

test('getCardsAtMinLevel returns only the lowest-level cards', () => {
  const state = buildState('A\\one$B\\two$C\\three');
  state.cardStates['card-0'].level = 2;
  state.cardStates['card-1'].level = 1;
  state.cardStates['card-2'].level = 3;

  const minCards = Engine.getCardsAtMinLevel(state);
  assert.equal(minCards.length, 1);
  assert.equal(minCards[0].card.term, 'B');
});

test('markCorrect advances without skipping the next card', () => {
  const state = buildState('A\\one$B\\two$C\\three');
  state.hasRevealedCurrent = true;

  const result = Engine.markCorrect(state);
  assert.equal(result, true);
  assert.equal(state.cardStates['card-0'].level, 2);

  const current = Engine.getCurrentCard(state);
  assert.equal(current.term, 'B');
});

test('markWrong resets level and advances', () => {
  const state = buildState('A\\one$B\\two');
  state.hasRevealedCurrent = true;

  const result = Engine.markWrong(state);
  assert.equal(result, true);
  assert.equal(state.cardStates['card-0'].level, 1);

  const current = Engine.getCurrentCard(state);
  assert.equal(current.term, 'B');
});

test('rounds move to the minimum available level', () => {
  const state = buildState('A\\one$B\\two');

  state.hasRevealedCurrent = true;
  Engine.markCorrect(state); // A -> level 2

  state.hasRevealedCurrent = true;
  Engine.markCorrect(state); // B -> level 2

  assert.equal(state.roundTransition.level, 2);
  assert.equal(state.roundTransition.count, 2);

  Engine.startNextRound(state);
  const current = Engine.getCurrentCard(state);
  assert.equal(state.cardStates[current.id].level, 2);
});

test('round transition appears after completing a round', () => {
  const state = buildState('A\\one$B\\two');

  state.hasRevealedCurrent = true;
  Engine.markCorrect(state); // A -> level 2

  state.hasRevealedCurrent = true;
  Engine.markCorrect(state); // B -> level 2 (round complete)

  assert.equal(state.roundTransition.level, 2);
  assert.equal(state.roundTransition.count, 2);
  assert.equal(Engine.getCurrentCard(state), null);

  const started = Engine.startNextRound(state);
  assert.equal(started, true);
  assert.equal(state.roundTransition, null);
  assert.equal(Engine.getCurrentCard(state).term, 'A');
});

test('startNextRound reshuffles when shuffle is enabled', () => {
  let i = 0;
  const rng = () => [0.1, 0.2, 0.3, 0.3, 0.1, 0.2, 0.9, 0.8, 0.7][i++];
  const state = buildState('A\\one$B\\two$C\\three', rng);

  Engine.toggleShuffle(state, rng);
  assert.equal(Engine.getCurrentCard(state).term, 'B');

  state.hasRevealedCurrent = true;
  Engine.markCorrect(state);
  state.hasRevealedCurrent = true;
  Engine.markCorrect(state);
  state.hasRevealedCurrent = true;
  Engine.markCorrect(state);

  assert.equal(state.roundTransition.level, 2);
  assert.equal(state.roundTransition.count, 3);

  Engine.startNextRound(state, rng);
  assert.equal(Engine.getCurrentCard(state).term, 'C');
});

test('failed cards remain in the next round at the lowest level', () => {
  const state = buildState('A\\one$B\\two$C\\three');

  state.hasRevealedCurrent = true;
  Engine.markWrong(state); // A stays level 1

  state.hasRevealedCurrent = true;
  Engine.markCorrect(state); // B -> level 2

  state.hasRevealedCurrent = true;
  Engine.markCorrect(state); // C -> level 2, round complete

  assert.equal(state.roundTransition.level, 1);
  assert.equal(state.roundTransition.count, 1);

  Engine.startNextRound(state);
  const current = Engine.getCurrentCard(state);
  assert.equal(current.term, 'A');
  assert.equal(state.round.cardIds.length, 1);
});

test('toggleShuffle uses shuffle order and resets current index', () => {
  let i = 0;
  const rng = () => [0.3, 0.1, 0.2, 0.7, 0.5, 0.9][i++];
  const state = buildState('A\\one$B\\two$C\\three', rng);

  state.currentCardIndex = 2;
  state.round.index = 2;
  Engine.toggleShuffle(state, rng);

  const filtered = Engine.getFilteredCards(state);
  assert.equal(state.currentCardIndex, 0);
  assert.equal(state.isShuffled, true);
  assert.equal(filtered[0].card.term, 'B');
});

test('removeCurrentCard deletes current card from the session', () => {
  const state = buildState('A\\one$B\\two');
  const removed = Engine.removeCurrentCard(state);

  assert.equal(removed, true);
  assert.equal(state.cards.length, 1);
  assert.equal(state.cards[0].term, 'B');
  assert.equal(Engine.getCurrentCard(state).term, 'B');
});

test('startNextRound returns false when there is no next round', () => {
  const state = buildState('A\\one');
  Engine.removeCurrentCard(state);

  assert.equal(state.roundTransition.level, null);
  assert.equal(state.roundTransition.count, 0);
  assert.equal(Engine.startNextRound(state), false);
});

test('markCorrect does nothing before first reveal', () => {
  const state = buildState('A\\one$B\\two');
  const result = Engine.markCorrect(state);

  assert.equal(result, false);
  assert.equal(state.cardStates['card-0'].level, 1);
});
