import type { ComponentType } from 'react';

/**
 * Type shim for the legacy App.jsx game component.
 * App.jsx is the main game-loop component pending migration to TypeScript
 * (see docs/_internal/INSIDE-TICKET-AAA-SCALE-ECONOMY.md, P1 Foundation).
 */
declare const App: ComponentType<Record<string, never>>;
export default App;
