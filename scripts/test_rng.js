
import { createInitialState, rollDice } from '../src/engine/gameLogic.js';

// Mock constants needed for gameLogic
global.DICE = { MIN: 1, MAX: 6 };
global.RULES = { TRIPLE_SIX_PENALTY: true, BONUS_ON_SIX: true };
global.GAME_PHASE = { ROLL_DICE: 'ROLL_DICE' };

console.log('🎲 Testing Smart RNG "Bag System" Distribution...');

let state = createInitialState(4);
const ROLLS = 600;
const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

for (let i = 0; i < ROLLS; i++) {
    state = rollDice(state);
    const val = state.diceValue;
    if (val) counts[val]++;
}

console.log(`\nResults after ${ROLLS} rolls:`);
Object.keys(counts).forEach(key => {
    const count = counts[key];
    const percentage = ((count / ROLLS) * 100).toFixed(1);
    console.log(`Value ${key}: ${count} (${percentage}%)`);
});

const deviation = Math.abs(counts[6] - (ROLLS / 6));
console.log(`\nDeviation for '6': ${deviation} (Ideal: 0)`);

if (deviation <= 2) {
    console.log('✅ PASS: Distribution is perfectly fair (within bag limits).');
} else {
    console.log('❌ FAIL: Distribution is skewed.');
}

// Check sequence logic (should not repeat 6 more than twice without penalty logic, but bag logic doesn't prevent streaks if bag refills)
// Bag logic guarantees frequency, not sequence.
