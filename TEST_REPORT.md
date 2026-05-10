# Flashcard Test Coverage Report

## Overview
Comprehensive test suite covering **11 test cases** across core game logic, Leitner progression, parsing, and UI state management.

## Test Cases

### 1. **Parsing & Data Handling**

#### `parseCards splits by separators and preserves term/definition`
- **What**: Verifies that flashcard text is correctly split into term and definition
- **Why**: Core functionality—if parsing fails, the entire app breaks
- **Scenario**: Three flashcards separated by `$`, terms and definitions separated by `\`
- **Validates**: Correct card count, term/definition extraction

#### `parseCards keeps separator chars inside definitions`
- **What**: Ensures definitions can contain the separator character
- **Why**: Real flashcards often have special characters in answers (e.g., "value\with\slashes")
- **Scenario**: Definition contains multiple `\` characters
- **Validates**: Only splits on the first separator, joins the rest

### 2. **State Initialization**

#### `createState initializes all cards at level 1`
- **What**: All new cards start at Leitner level 1
- **Why**: Essential for Leitner system—learners practice all cards first
- **Scenario**: Parse 3 cards and initialize state
- **Validates**: All `cardStates[id].level === 1`, shuffle order assigned

### 3. **Leitner System Core Logic**

#### `getCardsAtMinLevel returns only the lowest-level cards`
- **What**: Only cards at the minimum current level are shown
- **Why**: Leitner key principle—master lower levels before advancing
- **Scenario**: Cards at levels 2, 1, 3 → only level 1 card returned
- **Validates**: Filters correctly, ignores higher-level cards

#### `rounds move to the minimum available level`
- **What**: When all cards in a round advance, the next level becomes active
- **Why**: Progression—can't advance permanently until current level is cleared
- **Scenario**: Mark 2 cards correct → both move to level 2 → next round shows level 2
- **Validates**: Automatic round progression

### 4. **Answer Processing & Advance Logic**

#### `markCorrect advances without skipping the next card`
- **What**: Correct answer moves card up and advances to next card in sequence
- **Why**: The original bug was skipping cards. This prevents regression.
- **Scenario**: Current card is first of 3 → mark correct → should show second card, not third
- **Validates**: Correct index advancement, card-skipping bug is gone

#### `markWrong resets level and advances`
- **What**: Wrong answer resets card to level 1 and moves forward
- **Why**: Leitner rule—failures demote cards, no exception
- **Scenario**: Mark card wrong → level becomes 1 → advance to next card
- **Validates**: Demotion + advance in one action

#### `markCorrect does nothing before first reveal`
- **What**: Can't mark correct/wrong without seeing the answer
- **Why**: Prevents accidental button clicks; gating logic
- **Scenario**: Click correct without flipping first
- **Validates**: `hasRevealedCurrent` guard works

### 5. **Session Management**

#### `removeCurrentCard deletes current card from the session`
- **What**: Card removed from memory (not file) for current walkthrough
- **Why**: User feature to skip cards they don't want to practice
- **Scenario**: Remove first card from 2-card deck
- **Validates**: Deletion + state cleanup, cards.length decreased

### 6. **Shuffle & Randomization**

#### `toggleShuffle uses shuffle order and resets current index`
- **What**: Shuffle randomizes card order for all future rounds
- **Why**: User request—can shuffle all later rounds, not just current level
- **Scenario**: Set cards with fixed shuffle orders, toggle shuffle, verify order changes
- **Validates**: Shuffle order applied, current index reset to 0

## Coverage Summary

| Area | Test Count | Purpose |
|------|-----------|---------|
| **Parsing** | 2 | Verify file format handling |
| **Initialization** | 1 | Ensure state startup is correct |
| **Leitner Logic** | 3 | Core progression and level selection |
| **Answer Flow** | 4 | Correct/wrong processing and advance |
| **Features** | 2 | Removal and shuffle |

**Total: 11 tests**

## Critical Bug Prevention

1. **Card Skipping** — `markCorrect advances` test prevents regression of the original skipping bug
2. **Premature Answers** — `markCorrect before reveal` ensures gating works
3. **Level Overflow** — Implicit in `markCorrect` (stops at level 5)
4. **Index Out-of-Bounds** — Tested after removal and shuffle

## What's NOT Tested (DOM/Integration)

- Button clicks and keyboard input (requires browser/jsdom)
- UI updates (DOM text content, disabled states)
- File loading and server communication
- Visual shuffle confirmation

These are better suited for Playwright or end-to-end tests running against the live app.
