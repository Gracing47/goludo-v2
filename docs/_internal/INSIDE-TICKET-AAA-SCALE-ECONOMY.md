# 🔒 INSIDE-TICKET — Leo Deep-Dive: AAA + 100k Player Strategy

> **⚠️ INTERN / DRAFT — NICHT Teil des formalen Ticket-Systems.**
> Companion zu [INSIDE-TICKET-AAA-AUDIT.md](./INSIDE-TICKET-AAA-AUDIT.md) (Daniels Code-Audit). Dieses Dokument ist Leos Geschäfts-/Plattform-Deep-Dive: Economy & Platform-Fees, Skalierung auf 100k concurrent, UI/UX-Kohärenz, Community-Sicherheit. Bewusst getrennt vom formalen `docs/`-Flow.
>
> **Referenz-IDs:** Deep-Dive-Risiken `LEO-R#`, offene Owner-Entscheidungen `LEO-D#`. Daniels Findings bleiben `AAA-*` und werden hier referenziert.

| Feld | Wert |
|------|------|
| **Persona** | „Leo" (Principal Game-Platform Architect + Game-Economy Designer) |
| **Datum** | 2026-06-22 |
| **Methode** | 9 Agents · 5 Deep-Dives + 3 Economy-Modelle (Judge-Panel) → integrierte Synthese |
| **Ziel** | AAA-Qualität · 100.000 concurrent · durable Profit über Platform-Fees · Modelle: free + Coins + Stake |

---

## ✅ Owner-Entscheidungen — LOCKED (2026-06-22)

| ID | Entscheidung | Gewählt |
|----|--------------|---------|
| **LEO-D1** | Stake-Rake | ✅ **Tiered 8 %** (feeBps=800: ~10 % Micro / ~8 % Mid / ~6 % High-Roller + $GO-Rakeback, Min-Fee-Floor) |
| **LEO-D3** | Free-Tier | ✅ **Volle F2P-Engine** (unbegrenztes Free-Online-Ranked, Ads/Cosmetics, per-Account/Tag gecappt, AI-Table-Fill) |
| **LEO-D4** | Provable Fairness | ◻️ offen → Default Commit-Reveal (Leo) |
| **LEO-D7** | Launch-Scope | ✅ **Geo/Age/KYC-gated Cash-Rail**, Free+Coins global |

### LEO-D2 — Coins/Cashout → **GEÄNDERT: „Make-Money"-Modell** (Owner-Direktive)

> Owner-Direktive: „wir wollen money machen — muss nicht in DE/EU gegründet sein."

**Konsequenz:** Vollwertige Real-Money-Operation über eine **offshore-lizenzierte Entity** (NICHT DE/EU). Die Firewall bleibt — aber **neu definiert**: nicht „Coins nie auszahlbar", sondern **„frei ausgegebener Wert ist nie direkt auszahlbar; eingezahlter/gewonnener Wert schon — hinter KYC + Wager-Through"**. Genau so arbeitet jede lizenzierte Plattform. Drei Balances:

1. **Bonus/GoCoins (frei ausgegeben)** — Login/Quests/Rewarded-Ads → **nicht auszahlbar**, Playthrough-gated. (tötet Bot-Farming)
2. **Cash-Balance (Einzahlung Fiat/Krypto + Gewinne)** — **auszahlbar nach KYC + Wagering-Requirement**. Das ist der Money-Rail (FLR on-chain und/oder Fiat via PSP).
3. **$GO** — Cosmetic/Loyalty/Rakeback, non-redeemable.

**Effekt:** mehr Umsatz (auch Fiat-Einzahler, nicht nur Krypto-Natives), Bot-Schutz bleibt, AML/Gambling-Last bündelt sich am Cash-Rail. **⚠️ Erfordert Gaming-Law-Spezialist** für Lizenz/Jurisdiktion (z. B. Curaçao GCB, Anjouan, Costa-Rica-Modell, Isle of Man/Malta = Premium) + Geo-Fence verbotener Märkte (US-States ohne Lizenz, UK ohne UKGC etc.). Claude ist kein Rechtsberater — Jurisdiktionswahl (Banking/PSP-Zugang, Tax, Trust) ist konsequenzenreich.

---

## 🎯 Leo Verdict

> Yes — goludo-v2 can become AAA + 100k concurrent and be durably profitable, but ONLY after a rebuild of the runtime core and a money-rail redesign; today it is a single-process prototype with a drainable vault, so it is neither safe nor scalable as written. The single biggest lever is decoupling load by money-rail: push the ~90-95% of free/soft-coin players entirely off-chain onto stateless, Redis-sharded game servers, and let ONLY the minority hard-stake rail touch Flare — because that is the one rail that carries a fat enough rake (8-10%) to pay for its own gas and settlement infra. Get that separation right and the economics scale linearly with games-played (not with anyone going broke), the chain never bottlenecks, and the rake becomes structural margin instead of a fragile hardcoded constant. But none of it is durable until the P0 fund-safety gates land first: require(amount<=room.pot) + Pausable on LudoVault, a multisig treasury, and a single source-of-truth feeBps — without those, scaling just multiplies the blast radius of a vault that is provably drainable today (LudoVault.sol:217-265 has no pot bound).

### 🌟 North Star

> A provably-fair, trust-maximizing Ludo platform where anyone can play free in seconds, climb a soft-coin ladder, and graduate to real on-chain stakes — and where the house earns a transparent, code-enforced rake on every settled game so the company profits on games played, never on players losing.

---

## 💰 Empfohlenes Modell — GoLudo Tri-Rail Economy: Free DAU engine, non-cashable GoCoins, on-chain FLR stake — dual-rake to a multisig treasury

Blend of all three models, weighted to the 'Three-Rail Funnel' for durability and the 'Cash-Game Rake' model for trust. THREE first-class money rails with a hard one-way firewall: (1) FREE online ranked + casual — server-authoritative, no escrow, monetized by rewarded ads + cosmetics + the conversion funnel; (2) COINS (GoCoins) — off-chain non-cashable soft currency in a NEW transactional double-entry ledger (row-locked, append-only, strictly separate from the display-only profileManager stats strings), bought with fiat/FLR one-way and won/lost in casual-stake games; (3) STAKE (FLR/C2FLR) — real on-chain escrow in the EXISTING hardened LudoVault, winner paid via the existing EIP-712 signature. $GO (GoToken) is REPOSITIONED to a non-redeemable cosmetic/loyalty/governance + rake-back token — its mainnet faucet (GoToken.sol:41 faucetEnabled=true, public faucet() minting 1000/hr) is disabled in prod, testnet-only, killing the farming vector. CRITICAL FIREWALL: value exits ONLY via the FLR rail where it also entered as real escrow; GoCoins and $GO never convert to withdrawable money. This single rule eliminates the entire 'farm free coins -> cash out' attack class by construction and keeps the casual tier out of the heaviest money-transmitter scope. Profit is multi-sourced and structural: FLR rake (headline margin) + GoCoin rake-and-burn (sink that makes the soft economy net-negative-sum and drives coin re-purchase) + 100%-margin ads/cosmetics/battle-pass on the huge free base. Revenue is decoupled from skill and from anyone losing — it scales with GAMES SETTLED across all rails. The mode union (Lobby.jsx 'local'|'ai'|'web3') is replaced by a data-driven match descriptor {currency:'free'|'coin'|'stake', stake, rakeBps, ruleset} so all three rails are config, not code forks.

**Currency-Design:** Tri-currency, one-way-where-it-matters. GoCoins = off-chain soft, NON-cashable, integer balance in a new double-entry row-locked ledger; earnable (daily login, first-win-of-day, quests, rewarded video) and buyable (fiat/PSP or FLR via a one-way on-ramp, fiat/FLR->Coins only, never Coins->value); spendable only on coin-entry, cosmetics, rematch tokens, tournament tickets. FLR/C2FLR = on-chain hard stake, escrowed in LudoVault, the only rail money exits. $GO = on-chain ERC-20 repurposed to non-redeemable cosmetic/governance + VIP rake-back, mainnet faucet OFF (testnet-only), minted on mainnet only from a capped earned/purchased pool with sinks — never the open faucet. Brand the play currency consistently: GoCoins is the casual coin, FLR is the cash unit; render the symbol from ONE balanceSymbol source everywhere (kills the current ETH vs C2FLR vs $GO three-story confusion in Lobby.jsx/GameBrowser.tsx/App.jsx).

**Modi:**
- Free Play — online ranked ladder + casual (currency:'free', no escrow, server-recorded results, ads/cosmetics)
- Coin Games — casual soft-stake (currency:'coin', GoCoin pot in ledger, coin rake + burn)
- FLR Cash Stake — real on-chain wager (currency:'stake', LudoVault escrow, on-chain rake, EIP-712 payout)

### 🏦 Platform-Fee-Modell (die Kernfrage: „Fees müssen sitzen")

DUAL RAKE on the SETTLED POT, taken at settlement where funds provably exist — never on deposit, never on free play — with ONE source-of-truth feeBps consumed by both contract and server. (A) STAKE rail (real revenue): on-chain in LudoVault, fee = pot*feeBps/BPS_DENOMINATOR routed to a Gnosis Safe MULTISIG treasury (NOT the deployer EOA it ships as today, deploy.js:21), at 8% default (feeBps=800), tiered ~10% micro / ~8% mid / ~6% high-roller-with-$GO-rake-back, with an ABSOLUTE MINIMUM fee floor (e.g. 0.05 FLR-equiv) so dust pots never net-negative after gas. The hardcoded server math (server.ts:448-449: betAmount*5n/100n on betAmount*2n) is DELETED and replaced by payout = pot - pot*feeBps/10000 using ACTUAL participant count, ideally derived from the emitted GameFinished(payout,fee) event rather than recomputed — fixing the 2.5%-vs-5% divergence and the broken 3-4 player accounting in one move. (B) COIN rail (sink + demand engine): same formula on the GoCoin ledger at ~10% effective, split into a small treasury cut + a BURN cut, making coin supply net-negative-sum so casual play structurally requires periodic coin purchase. (C) FREE rail: 0% entry, monetized by rewarded ads + cosmetics + battle pass (100% margin). Plus a small WAITING-room abandonment/timeout fee to deter spam-create. WHY DURABLE: the FLR rake is enforced in the contract at settlement and cannot be skipped or diverted (multisig treasury + a pre-sign assertion that potAmount==entryAmount*participants AND status==ACTIVE, as defense-in-depth on top of the new require(amount<=room.pot)); the house takes a cut of a ZERO-SUM transfer so margin is positive on 100% of settled games regardless of who wins (no inventory/book risk); and three uncorrelated streams (rake, ads/IAP, coin-burn float) de-risk any single regulatory or behavioral shock.

### 📈 Unit Economics (Back-of-Envelope)

Back-of-envelope at 100k concurrent (~1-1.5M DAU at typical 10-15x concurrent:DAU; use 1.2M DAU). Mix by daily-active: ~70% free-only (840k), ~25% coin (300k), ~5% FLR stakers (60k). STAKE RAKE (headline, near-zero marginal cost — one settlement tx, sub-cent gas on Flare): 60k stakers x ~6 games/day x ~$4 avg pot x 8% rake = ~$115k/day = ~$3.4M/mo, almost all gross margin. ADS (free tier, ~100% margin after rev-share): 840k free DAU x ~2 rewarded views/day x ~$6 blended eCPM = ~$10k/day = ~$300k/mo. IAP/COSMETICS/BATTLE-PASS: ~4% of 1.14M non-stake DAU buy, ~$6 ARPPU/mo => ~46k x $6 = ~$275k/mo at ~80% margin. COIN BURN: no direct cash but drives the IAP coin demand captured above; costs only ledger compute. Blended ~ $3.5-4M/mo gross at 1.2M DAU. Infra at 100k concurrent (15-ish stateless game nodes + Redis cluster + Postgres/PgBouncer + Flare RPC + ads/observability) realistically ~$80-200k/mo. NORMALIZED PER 100k DAU (so it scales cleanly): ~$290k/mo gross — roughly $280k stake rake + $25k ads + $23k IAP per 100k DAU under these assumptions. SENSITIVITY: even halving every revenue assumption AND tripling infra, the FLR rake alone covers infra several times over; ads+IAP are stacked margin. The model is structurally profitable because rake is taken at settlement from proven funds, free mode is hard-capped per account/day so the zero-revenue rail cannot balloon cost, and every rail is embarrassingly parallel (adding players adds independent tables).

---

## ⚖️ Die 3 evaluierten Economy-Modelle

| Modell | Philosophie | Stake-Rake | Fit 100k |
|--------|-------------|-----------|----------|
| **GoLudo Cash-Game Rake Model ("House Rake + Coin Sink")** | Real-money cash-game first, poker/Stake.com style. The product is a transparent, on-chain-… | Stake mode 3%–6% tiered (micro pots ~5–6% with an absolute floor e.g. min 0.05 FLR-equivalent so dust pots still pay; mi | "Stake settlement is the only mandatory on-chain write per game, and it happens once at pa… |
| **Three-Rail Funnel: Free DAU, Soft Coins, Hard Stake (with dual-rake treasury)** | Free-to-play is the growth engine, not a demo. The vast majority of the 100k+ concurrent p… | Cash stake: 8-10% rake (industry-standard skill-game rake; 5% is leaving money on the table for a staked product, 2.5% i | Fits 100k concurrent because the high-volume rails are CHEAP: Free and Coin games are off-… |
| **GoLudo Dual-Rail Economy: "Coins for Play, Stakes for Stakes"** | Two separate money rails that never bleed into each other. RAIL A (Coins): an off-chain, s… | FLR cash games: 5-10% rake, tiered by pot size to protect thin small pots — e.g. micro pots 10% or a minimum absolute fe | Fits because the design pushes load to the cheapest layer per mode. Free and coin modes ar… |

<details><summary>Economy-Modelle — Pros/Cons (ausklappen)</summary>

**GoLudo Cash-Game Rake Model ("House Rake + Coin Sink")**  
- Revenue: Stake-mode on-chain rake (3–6% tiered) — primary, durable, scales with cash volume; Coin-mode rake in GoChips (8–12%) plus the burn-driven float margin on the FLR backing purchased chips; Chip-purchase spread / FX margin on fiat-or-FLR -> GoChips top-ups; WAITING-room cancellation + refund anti-spam fees (minor, behavioral); VIP/high-roller subscription: reduced rake tier + $GO rake-back as a paid loyalty program; Branded/sponsored tournaments with guaranteed prize pools and an entry-fee overlay (juice) on top of rake; Optional cosmetics (boards, dice skins, table themes) — non-pay-to-win, pure margin  
- Anti-Abuse: Free farming: free/Social-Ladder uses a separate non-purchasable Bonus Chip balance with zero cash value and a hard daily free-game cap per verified account — nothing won in free mode ever touches the GoChip or FLR ledger, so there is no value to farm.; Coin farming: GoChips are one-way (fiat/FLR in, never out). Faucet-style minting is removed from mainnet (GoToken faucet stays testnet-only, faucetEnabled=false in prod). Coin rake includes a burn so even collusive chip-shuffling net-loses chips to the sink rather than minting value.; Sybil: real-money Stake withdrawals and chip purchases gate behind KYC/age/geo at the cash boundary; device + payment-instrument fingerprinting; new accounts capped on stake size and withdrawal velocity until verified. Free accounts are cheap but quarantined to the valueless Bonus rail.; Collusion / chip-dumping (intentionally losing to a partner to move value): for Coin mode, value can't leave the system anyway (non-redeemable), so dumping has no payoff. For Stake mode, the rake is taken on every settlement so colluders pay the house on each transfer; add anomaly detection on repeated same-pair tables, lopsided win patterns, and seat-collusion in 3–4 player rooms, with stake holds and clawback before signing claimPayout.; Signer/treasury integrity: server asserts status==ACTIVE && pot==entryAmount*participants and bounds amount<=pot before signing (defense-in-depth over the contract bug); treasury is a multisig distinct from signer/owner keys; payout signer key is HA and rotated.; $GO rake-back wash-trading: rake-back is computed from net rake actually paid to treasury (always positive-cost to the player), and capped/curved so self-play to harvest $GO costs more in rake than the $GO is worth.; Dead-capital/refund abuse: WAITING rooms refund after ROOM_TIMEOUT via any participant (extend emergencyWithdraw to WAITING), with a small cancellation fee to discourage spam-create churn.  
- ✅ Trust-maximizing: every cash rake is an on-chain GameFinished event a player can audit — strongest possible 'provably fair house' story for a Stake.com-style product. · House never takes inventory/book risk: rake is skimmed from a zero-sum pot, so margin is positive on 100% of settled games independent of outcomes. · Non-redeemable GoChips structurally kill coin-farming-for-value AND keep the casual rail largely out of money-transmitter/gambling-license scope, lowering legal cost. · Single-source feeBps + event-derived stats fixes the existing 2.5%-vs-5% / hardcoded-2-player divergence; one number to govern, audit, and tune. · Tiered rake lets the company undercut incumbent poker rake at the high-roller end (volume) while keeping fat margin on micro pots (floor + higher bps). · Coin burn makes chip supply net-negative-sum, so the FLR float backing chips drifts profitable over time — a second margin layer beyond rake. · Builds directly on shipped LudoVault mechanics (escrow + signed claimPayout + treasury + GameFinished); Stake mode is largely correctness fixes, not a rewrite.  
- ⚠️ Requires building two genuinely new rails: a transactional GoChip ledger (atomic, row-locked) and a coin-settlement/burn path — neither exists today (profileManager is display-only). · Real-money cash game invites gambling-regulatory and KYC/AML obligations per jurisdiction; geo-fencing, age-gating, and licensing are unavoidable operational cost the model can't dodge. · Non-redeemable chips frustrate players who expect to cash out winnings; conversion from Coin enthusiasm to Stake spend must be excellent or Coin revenue underperforms. · Thin free mode + daily caps risk hurting top-of-funnel growth and D1 retention if the 'graduate to stakes' nudge feels coercive. · On-chain rake per settled stake game means gas + signer-throughput sensitivity at 100k concurrent; needs batching/L2-style tuning and signer HA or settlement lags. · Tiered rake + rake-back + burn split is more economic surface area to model, monitor, and guard against exploit (e.g. wash-trading for $GO rake-back) than a flat fee. · $GO repurposed to loyalty kills any speculative-token fundraising narrative the team may have wanted; faucet disablement on mainnet may upset existing holders.

**Three-Rail Funnel: Free DAU, Soft Coins, Hard Stake (with dual-rake treasury)**  
- Revenue: Cash-stake rake (8-10% of FLR pot, on-chain, multisig treasury) — headline durable margin; Rewarded + interstitial ads on free/coin rails — largest volume stream, ~100% margin, scales with the massive free DAU; IAP: GoCoin packs (convenience buy of soft currency) — funds coin demand created by the burn sink; Cosmetics: dice skins, boards, tokens, avatars, emotes, win animations (coin- and cash-purchasable) — pure margin, no pay-to-win; Battle Pass: seasonal free + premium track; premium bought with cash/coins — recurring revenue + retention; Tournament entry: ticket fees (coins or cash) with platform cut of the prize pool; Coin sink/burn on coin games — not cash revenue but the economic regulator that sustains IAP value and prevents soft-coin inflation; Optional WAITING-room abandonment/refund fee — minor, deters dead-capital + spam  
- Anti-Abuse: FREE-COIN FARMING IS DEFUSED BY DESIGN: soft GoCoins and faucet $GO are NEVER cashable/withdrawable. Farming infinite coins yields zero real money; the only thing coins buy is cosmetics/entries that are themselves sinks. This removes the entire economic incentive behind sybil coin-farming.; Disable GoToken faucet on mainnet (faucetEnabled=false / no faucet in prod token); keep the 1000/hr faucet strictly testnet. Any future spendable $GO comes only from capped earned/purchased pools with sinks, never open mint.; Coin economy is net-negative-sum (entry burn + rake > coin emission), so even a successful farm dilutes nothing the company must honor and self-drains via sinks.; Sybil resistance on FREE rewards: cap coin/ad/login earnings per account per day, gate meaningful earn behind device-attestation + (for cash rail) wallet-funding history; rewarded-ad coins capped and rate-limited per device/IP, with diminishing returns curve.; COLLUSION (chip-dumping) defense, esp. cash + coin: detect repeated head-to-head pairings, asymmetric win-transfer patterns, and unnatural folding/loss flows; flag/limit accounts that consistently lose to the same counterpart; randomized matchmaking that resists hand-picking opponents; hold/clawback window on suspicious large stake payouts before withdraw.; Cash-rail KYC/limits scaled to stake size (micro = light, high = full KYC) to satisfy gambling/AML and block sybil cash-out farms; one verified identity per high-stake withdraw path.; Treasury hardening (anti-insider-theft): multisig treasury distinct from owner + payout signer; documented rotation runbook; scheduled sweep to cold storage; alerting on treasury outflows.; Revenue-path integrity: server asserts status==ACTIVE and potAmount==entryAmount*participants before EIP-712 signing; reject mismatches; bound signer amount <= room.pot as defense-in-depth against the unbounded-amount contract bug.; Keep the spendable coin ledger atomic and transactional (row-level locks / append-only), fully separate from the display-only stats table, so balances can't be inflated via the observer stats path.; WAITING-room timeout enforcement + small abandonment fee to deter spam-create-and-abandon that locks capital and farms refunds.  
- ✅ Free-first funnel maximizes DAU and liquidity (always a table) — the AAA feel that retention and virality depend on, while still monetizing the free base via ads. · Revenue is decoupled from skill and from players losing: it scales with games played across all rails, so we profit whether or not the cash rail is big — far more durable than a thin pass-through rake alone. · Builds directly on the REAL LudoVault mechanics (payable escrow + EIP-712 + feeBps + treasury) rather than contradicting them; the cash rail is the existing code, hardened. · Free-coin farming and the $GO faucet risk are neutralized BY DESIGN (soft/faucet currency never cashes out), not just by detection heuristics — the strongest possible defense. · Fixes the grounded fragilities head-on: single-source feeBps, real-pot fee math (not 2-player hardcode / not signer amount), multisig treasury, pre-sign pot cross-check. · Coin burn makes the soft economy net-negative-sum, so the company never prints value it must later honor; the economy self-regulates. · Multiple uncorrelated streams (rake, ads, IAP, pass, cosmetics) de-risk regulatory or behavioral shocks to any single one. · Mostly-soft + minority-cash posture reduces gambling/regulatory surface vs an all-cash product, while still serving real-money demand.  
- ⚠️ Largest engineering lift: free-mode (no-escrow) path and the entire off-chain GoCoin ledger + coin-rail are NET-NEW from scratch — months of work plus the LudoVault fee/treasury fixes before anything is durable. · Ads-heavy revenue depends on real fill rates and eCPM that only materialize at genuine scale; pre-scale, ad revenue is thin and the model leans on IAP/rake. · Cash rail still carries gambling/AML/KYC regulatory burden by jurisdiction — needs legal gating, geo-blocking, and KYC tiers, which add cost and friction. · Three currencies + three rails is real product/UX complexity; the UI must make the soft/hard boundary unmistakable or users get confused (or feel baited) — high UX-design bar. · Net-negative-sum coin economy can feel punishing if burn/rake is tuned too high; mis-tuning kills the coin loop and the IAP demand it drives. · Collusion/chip-dumping detection on the cash + coin rails is an ongoing arms race requiring continuous tuning and a trust-and-safety function, not a one-time build. · Repositioning $GO (dead today) to cosmetic/loyalty risks community pushback if holders expected it to be the stake/cashout token; messaging matters. · Heavy reliance on cosmetics/pass demands continuous AAA art content pipeline — a recurring production cost, not a build-once.

**GoLudo Dual-Rail Economy: "Coins for Play, Stakes for Stakes"**  
- Revenue: On-chain FLR rake on cash games (5-10% tiered, to treasury multisig) — primary profit engine; Coin-purchase gross margin (one-way fiat/FLR -> GoCoins on-ramp, sold above in-game utility cost); Coin sinks beyond rake: cosmetics (boards, dice skins, token sets, emotes), rematch tokens, tournament entry tickets — pure margin, no payout liability; Rewarded-video and interstitial ads in the free tier (eCPM on a high-DAU funnel); Battle-pass / season pass sold for fiat or coins (cosmetic + coin-reward track, net-positive to us); Abandonment/timeout fee on unfilled staked rooms (1-2%); Optional later: white-label/B2B Ludo rooms and branded tournaments  
- Anti-Abuse: Free-coin farming: GoCoins are non-cashable by hard rule, so farming yields no real value — the entire incentive is removed at the root. Earned-coin emission is rate-capped (energy/ticket regen on free play, daily-diminishing quest rewards) and reward-video coins are capped per device/day. The GoToken faucet is disabled on mainnet (faucetEnabled=false, testnet only) so no fresh unbounded supply can ever back a spendable coin.; Coin-mode net-negative-sum: the 8-12% coin rake is BURNED, so colluders cannot pump coins among themselves — every coin game destroys coins. Coin balances live in an atomic double-entry ledger with row-level locks; no balance can be created except via earned (capped) or bought (paid) entries, making coins un-counterfeitable off the ledger.; Sybil: phone/device-fingerprint + optional KYC threshold for FLR cash-out paths and for buying above a daily coin cap; new accounts get a probation window with reduced earn rates and no high-stake access; rewarded-ad and daily-bonus emission keyed to device+IP+payment-instrument, not just account, so multi-accounting yields diminishing returns. Real-money (FLR) tier inherits the wallet's on-chain cost-to-create as natural Sybil friction.; Collusion / dumping (intentional losing to move funds): seat assignment in public matchmade rooms is server-controlled and randomized — colluders cannot reliably get into the same room. Private/invite rooms are flagged: repeated same-cohort pairings with lopsided win/loss flow trigger rake-and-review (winnings held), velocity limits, and graph-based collusion detection on the win-flow graph. The rake itself is a tax on every transfer attempt, making fund-shuttling via dumping unprofitable.; Result integrity: outcomes are server-authoritative (the engine decides the winner; the EIP-712 payout signature is server-issued), so a client cannot forge a win. Server asserts contractRoom.status==ACTIVE and pot==entryAmount*participants before signing, capping payout to the real escrow and closing the unbounded-amount/2-player-hardcode hole as defense-in-depth.; Abandonment abuse: WAITING rooms that never fill are refundable after ROOM_TIMEOUT (extend emergencyWithdraw to WAITING), with a small 1-2% abandonment fee to deter spam-create-and-cancel and to recover dead-capital cost; refunds are per-participant and idempotent.  
- ✅ Owner's flexibility requirement is met literally: free, coin-stake, and FLR-stake all exist as first-class modes with their own rails. · Profit is multi-sourced and structural (contract-enforced rake + coin burn + ads + cosmetics), so no single mode failing kills the business — durable by construction. · Even 100%-free players generate margin (ads + energy-gated funnel + coin upsell), satisfying 'free players still generate margin'. · Builds on the REAL LudoVault fee math rather than contradicting it; the on-chain rake already works — we harden, not rewrite. · Non-cashable coins sidestep the heaviest gambling/money-transmitter regulation on the casual tier and remove the farming-for-cash incentive at the root. · Net-negative-sum coin design makes casual-tier revenue self-sustaining instead of growth-dependent. · Clean separation of soft/hard rails contains risk: a coin-ledger bug can never drain real FLR, and vice versa.  
- ⚠️ Large build: two new money rails (off-chain coin ledger + coin-mode escrow/burn) plus a coin-mode LudoVault variant or generic-token param — none of which exist today; this is months of work before coin mode ships. · Operating a non-cashable purchasable currency still carries regulatory/consumer-protection exposure (loot-box/coin-purchase rules vary by jurisdiction) and PSP/chargeback risk on the fiat on-ramp. · FLR-stake real-money tier is gambling/skill-gaming and faces jurisdictional licensing, KYC/AML, and geo-restriction obligations that gate which markets can access it. · Ad revenue and coin-conversion assumptions are sensitive to eCPM and conversion rates that can swing 2-3x with market conditions; pessimistic mixes thin the casual margin significantly. · Anti-collusion and Sybil systems (seat randomization, win-graph analysis, device fingerprinting) are non-trivial to build and tune, and false positives risk angering legit players. · Two-currency UX must be taught carefully — confusing coins with cashable value, or players feeling the coin rake is a 'rip-off', can hurt trust if messaging is sloppy. · Treasury/multisig, fee-config single-source-of-truth, and pot cross-check are prerequisites that must land before the rake can honestly be called durable.

</details>

---

## 🔬 Deep-Dive-Scoreboard

| Area | Health | Krit. Risiken |
|------|:------:|---------------|
| game-logic-token-flexibility | 🔴 38 | 6 |
| token-economy-and-fees | 🔴 31 | 5 |
| scalability-to-100k | 🔴 22 | 6 |
| ux-ui-coherence | 🔴 41 | 5 |
| community-security-fairness | 🔴 31 | 9 |

### 🔴 Critical / 🟠 High Deep-Dive-Risiken

| ID | Area | Sev | Risiko | Datei | Fix |
|----|------|:---:|--------|-------|-----|
| LEO-R1 | game-logic-token-flexibility | 🔴 | Three rule systems disagree on payout win-condition | `—` | one rule source, read winCondition |
| LEO-R2 | game-logic-token-flexibility | 🟠 | IGameRules/getRulesForMode strategy layer is dead code | `—` | wire it in or delete rules/ |
| LEO-R3 | game-logic-token-flexibility | 🟠 | Engine has zero economic primitives | `—` | emit typed Settlement on WIN, per-tier rake |
| LEO-R4 | game-logic-token-flexibility | 🟠 | playerCount ignored; counts emergent not config | `—` | build tokens only for activeColors |
| LEO-R5 | game-logic-token-flexibility | 🟠 | Bonus reuses dice channel as literal step count (=20) | `—` | model captureBonus as EXTRA_ROLL |
| LEO-R6 | game-logic-token-flexibility | 🟠 | Partial determinism: Math.random(), no replay log | `—` | seeded RNG + journal + replay() |
| LEO-R7 | token-economy-and-fees | 🟠 | Two contradictory fee rates: on-chain 2.5% vs off-chain 5%, and the stats fee assumes a 2-player pot | `backend/server.ts:lines 448-449 vs smart-contracts/scripts/deploy.js:22 and LudoVault.sol:253` | Make fee bps a single config value read by both contract (already feeBps) and server. Replace server.ts:448-449 with pay |
| LEO-R8 | token-economy-and-fees | 🟠 | Treasury (fee recipient) is the deployer EOA, not a treasury/multisig — single point of theft for all rake | `smart-contracts/scripts/deploy.js:line 21 const treasuryAddress = deployer.address` | Deploy with treasury set to a Gnosis Safe / multisig the company controls, distinct from the owner key and the payout si |
| LEO-R9 | token-economy-and-fees | 🟠 | No fee can ever be charged on FREE or COIN games because those rails do not exist | `src/hooks/useLudoWeb3.ts:lines 61-71, 101-139; LudoVault.sol:152; src/store/useLobbyStore.ts:57` | Introduce an explicit economy tier (free|coin|stake) as first-class data. For coin mode add an ERC-20 staking variant (L |
| LEO-R10 | token-economy-and-fees | 🟠 | GoToken open faucet mints unlimited fresh supply per address — free-coin farming if $GO ever becomes spendable | `smart-contracts/contracts/GoToken.sol:lines 74-89 faucet(); 122-125 mint()` | Before any coin mode ships: disable the faucet on mainnet (faucetEnabled=false / remove faucet from the prod token), gat |
| LEO-R11 | token-economy-and-fees | 🟠 | Server signs the full contract pot with no upper-bound cross-check, compounding the unbounded-amount contract bug | `backend/server.ts:lines 903-907 signPayout(roomId, winner, potAmount)` | Before signing, assert contractRoom.status==ACTIVE and potAmount == entryAmount*participants for the off-chain room; rej |
| LEO-R12 | scalability-to-100k | 🔴 | Authoritative state is a single in-process array scanned O(n) on every game event — hard cap at one Node process | `backend/server.ts:server.ts:106; find sites 300/579/649/709/877/938/994; forEach 782` | Make Redis (or a sharded in-memory store keyed by hash(roomId)) the authoritative store accessed by O(1) key, not array  |
| LEO-R13 | scalability-to-100k | 🔴 | No Socket.IO Redis adapter and no sticky sessions — multi-node fan-out is impossible | `backend/server.ts:server.ts:95-103; broadcastState server.ts:189` | Add @socket.io/redis-adapter (or cluster adapter) with a dedicated pub/sub Redis, and configure sticky sessions (cookie/ |
| LEO-R14 | scalability-to-100k | 🔴 | Turn timers are per-process setTimeout and not re-armed on recovery — rolling deploys freeze staked pots at scale | `backend/server.ts:server.ts:215; 330-357; recovery 1098-1118` | Externalize deadlines: store turnExpiresAt in Redis and drive timeouts from a single Redis ZSET sweeper or BullMQ delaye |
| LEO-R15 | scalability-to-100k | 🟠 | Health endpoint creates a new Postgres connection pool per request — LB probes will exhaust Postgres | `backend/routes/health.ts:health.ts:30-45` | Use a single shared PrismaClient, or report DB health from a cached background check; skip building a pool inside the ha |
| LEO-R16 | scalability-to-100k | 🟠 | Redis writes are blind full-state setex with no concurrency control — lost-update races the moment you shard | `backend/services/stateManager.ts:stateManager.ts:66-74; caller server.ts:199-203` | Add optimistic concurrency (version field + WATCH or Lua CAS) and write deltas/checkpoints rather than the whole state e |
| LEO-R17 | scalability-to-100k | 🟠 | Matchmaking is REST create/join with no queue or presence fan-out, and GET /api/rooms returns the whole array | `backend/server.ts:server.ts:915/917/990; limiters 145-159` | Build a matchmaking service: players enqueue by (mode, stake bucket); a matcher forms rooms and pushes assignments over  |
| LEO-R18 | ux-ui-coherence | 🔴 | Platform fee/rake is invisible to players — pot and victory UI show GROSS winnings, the company's revenue model is never disclosed | `—:App.jsx:684-693 + 717-743; VictoryCelebration.jsx:153` | Make the rake a first-class, data-driven UI value sourced from the contract feeBps. Before stake: show 'Entry X, Winner  |
| LEO-R19 | ux-ui-coherence | 🟠 | No free/coin economy exists — 'flexible free vs coin vs stake' is unbuildable without a rewrite, and free players have zero retention loop | `—:Lobby.jsx:67,118-138,255-292; LudoLobby.tsx:32-70` | Introduce a data-driven match descriptor {currency: 'none'|'coin'|'native', stake, ruleset} instead of the mode union. A |
| LEO-R20 | ux-ui-coherence | 🟠 | Three conflicting currency stories across the funnel (ETH vs C2FLR vs $GO) confuse the player about what they are staking | `—:GameBrowser.tsx:31; Lobby.jsx:406,448,489,491; App.jsx:691` | Pick one canonical currency model and render its symbol from a single source (balanceSymbol) everywhere; delete the ETH  |
| LEO-R21 | ux-ui-coherence | 🟠 | Web3 game refresh / shared link drops a staking player into a config-null room with no resume — real money on the table, no recovery UI | `—:GameRoom.tsx:50-72; App.jsx:212-213,224-232,504-541` | Persist a minimal web3 resume record {roomId,address,color,index,stake} and/or rehydrate from the server by wallet addre |
| LEO-R22 | ux-ui-coherence | 🟠 | Lobby/Web3 error handling is window.alert() with no recovery, classification, or money-context — fails the AAA bar at the exact moment funds move | `—:Lobby.jsx:120,199,215,247-251; App.jsx:473` | Replace alert() with a classified, non-blocking toast/inline system that maps web3 error codes to human copy (user rejec |
| LEO-R23 | community-security-fairness | 🔴 | Server controls BOTH dice and payout signature with one hot key — no provable fairness for paid games | `backend/server.ts:roll_dice handler line 675; signer.js:41` | Make dice provably fair: per-turn commit-reveal where the server publishes H(serverSeed,roomId,turnNonce) before the rol |
| LEO-R24 | community-security-fairness | 🔴 | claimPayout pays an unbounded signer-supplied amount — entire vault drainable (confirms AAA-C3, adds: fee is also unbounded) | `smart-contracts/contracts/LudoVault.sol:claimPayout lines 253-262` | At the top of claimPayout add require(amount <= room.pot) (ideally amount == room.pot) and pay both fee and payout out o |
| LEO-R25 | community-security-fairness | 🔴 | No Pausable / circuit breaker on the fund contract — an active drain or signer leak cannot be stopped | `smart-contracts/contracts/LudoVault.sol:whole contract (no OZ Pausable; createRoom 147, joinRoom 169, claimPayout 217 ungated)` | Add OpenZeppelin Pausable; gate createRoom/joinRoom (and optionally claimPayout) with whenNotPaused; add a fast guardian |
| LEO-R26 | community-security-fairness | 🟠 | Two-player collusion can farm a pot with zero detection; no anti-collusion or sybil controls exist | `backend/server.ts:matchmaking/join (rooms/create 917, rooms/join 990); no account model` | Introduce a real account layer (wallet + optional KYC tier for high stakes), collusion signals (repeated pairings of the |
| LEO-R27 | community-security-fairness | 🟠 | Socket.IO game events are unauthenticated and unthrottled; join_match leaks opponent state and enables collusion side-channel | `backend/server.ts:join_match line 569/576; roll_dice 646; move_token 706` | Authenticate sockets (signed nonce / session token bound to wallet) on connect; in join_match verify the address is a pa |
| LEO-R28 | community-security-fairness | 🟠 | On-chain verification silently degrades to trust-the-client; txHash optional for staked rooms | `backend/services/contractVerifier.js:lines 57-100, 119-125, 206-214; validation.js:28; server.ts:922-936` | In production hard-fail (process.exit) if RPC/vault are unconfigured instead of degrading to true. Make txHash REQUIRED  |
| LEO-R29 | community-security-fairness | 🟠 | Single hot signer key, 24h payout deadline, no rotation/HSM — large replay/exposure window | `backend/services/signer.js:lines 19,29-31,46` | Move signing into a KMS/HSM accessed via API (no raw key in process). Shorten claim deadlines to minutes. Separate testn |
| LEO-R30 | community-security-fairness | 🟠 | Hardcoded 2-player, 5% payout math in the server diverges from the contract fee and breaks 3-4 player rake accounting | `backend/server.ts:declareWinner lines 447-449` | Derive payout/fee from one authoritative source (the on-chain pot and contract feeBps) for ALL accounting; remove the ha |
| LEO-R31 | community-security-fairness | 🟠 | WAITING rooms that never fill lock joiners' funds; emergencyWithdraw only covers ACTIVE | `smart-contracts/contracts/LudoVault.sol:cancelRoom 191-211; emergencyWithdraw 267-286` | Allow ANY participant to trigger a refund on a WAITING room after ROOM_TIMEOUT (use the declared constant), or extend em |

<details><summary>Deep-Dive-Risiken — Evidenz &amp; Impact (ausklappen)</summary>

**LEO-R1 — Three rule systems disagree on payout win-condition** `critical`  
- Evidenz: rapid wins on ANY token (some) vs every vs ALL_TOKENS_HOME across constants.ts/GameMode.ts/fastRules  
- Impact: staked rapid wins on first-token-home while docs say all-home  
- Fix: one rule source, read winCondition _(Aufwand L)_

**LEO-R2 — IGameRules/getRulesForMode strategy layer is dead code** `high`  
- Evidenz: referenced only in README/docs/rules folder; engine imports ./constants only  
- Impact: adding an IGameRules class changes nothing  
- Fix: wire it in or delete rules/ _(Aufwand L)_

**LEO-R3 — Engine has zero economic primitives** `high`  
- Evidenz: GameState has no stake/pot/fee; fee only in LudoVault.sol  
- Impact: free/paid cannot share a settlement path; rake outside engine  
- Fix: emit typed Settlement on WIN, per-tier rake _(Aufwand XL)_

**LEO-R4 — playerCount ignored; counts emergent not config** `high`  
- Evidenz: _playerCount unused; server always passes 4  
- Impact: ghost tokens for inactive colors persist  
- Fix: build tokens only for activeColors _(Aufwand M)_

**LEO-R5 — Bonus reuses dice channel as literal step count (=20)** `high`  
- Evidenz: bonusMoves=CAPTURE_BONUS(20) fed as diceValue/steps  
- Impact: impossible moves forfeited; capturing 6 double-rewards  
- Fix: model captureBonus as EXTRA_ROLL _(Aufwand M)_

**LEO-R6 — Partial determinism: Math.random(), no replay log** `high`  
- Evidenz: rollDice + aiEngine use Math.random(); no seed/journal  
- Impact: disputed paid outcomes cannot be replayed/proven  
- Fix: seeded RNG + journal + replay() _(Aufwand L)_

**LEO-R7 — Two contradictory fee rates: on-chain 2.5% vs off-chain 5%, and the stats fee assumes a 2-player pot** `high`  
- Evidenz: Contract deploys feeBps=250 (2.5%) and claimPayout pays fee=(amount*feeBps)/10000 to treasury. But the server stats path computes feeAmount=(betAmount*5n)/100n (5%) and payoutAmount=betAmount*2n-feeAmount — a different rate AND a hardcoded 2-player pot (betAmount*2n), even though createRoom allows maxPlayers up to 4 (LudoVault.sol:153).  
- Impact: Recorded revenue/payout stats diverge from actual on-chain settlement: leaderboards and totalWon are wrong, and for 3-4 player rooms the recorded payout is grossly understated. There is no single source of truth for 'the rake', so financial reporting can never be reconciled against the chain — fatal for a product claiming durable profit.  
- Fix: Make fee bps a single config value read by both contract (already feeBps) and server. Replace server.ts:448-449 with payout = pot - (pot*feeBps/10000) using the actual participant count and the same feeBps the contract uses; ideally derive stats from the emitted GameFinished(payout, fee) event rather than recomputing. _(Aufwand M)_

**LEO-R8 — Treasury (fee recipient) is the deployer EOA, not a treasury/multisig — single point of theft for all rake** `high`  
- Evidenz: deploy.js:21 sets treasury = deployer.address; the same deployer is contract owner (Ownable(msg.sender)). All fees route to this single EOA via LudoVault.sol:258. setTreasury exists (LudoVault.sol:306) but the deployed value is an EOA.  
- Impact: Every platform fee from every paid game accumulates in one externally-owned key controlled by the deployer. A leak of that key drains 100% of accumulated company revenue, and there is no separation between owner, signer, and treasury — the entire monetization upside sits behind one private key.  
- Fix: Deploy with treasury set to a Gnosis Safe / multisig the company controls, distinct from the owner key and the payout signer. Document a rotation runbook and sweep treasury to cold storage on a schedule. _(Aufwand S)_

**LEO-R9 — No fee can ever be charged on FREE or COIN games because those rails do not exist** `high`  
- Evidenz: All entry flows send native value (value: amountInWei) and createRoom reverts on msg.value==0 (LudoVault.sol:152). There is no zero-stake branch, no ERC-20 stake path, and GoToken is never referenced in any staking call. betAmount defaults to '0.1' with no free tier.  
- Impact: The owner's flexibility goal (some games free, some coin, some stake) is unbuildable on the current rails, and there is no mechanism to monetize coin or free games — no entry fee skim, no coin sink, no rake on anything except a native-currency wager. The durable-profit requirement has no surface to attach to outside one stake mode.  
- Fix: Introduce an explicit economy tier (free|coin|stake) as first-class data. For coin mode add an ERC-20 staking variant (LudoVault holding GoToken via approve/transferFrom, fee in GoToken to treasury). For free mode record results without escrow. Define where the fee sits per mode (coin rake + a coin sink for entry). _(Aufwand XL)_

**LEO-R10 — GoToken open faucet mints unlimited fresh supply per address — free-coin farming if $GO ever becomes spendable** `high`  
- Evidenz: faucet() mints FAUCET_AMOUNT=1000e18 to msg.sender every FAUCET_COOLDOWN=1h with no per-wallet lifetime cap and no sybil resistance, up to MAX_SUPPLY 1e9. faucetEnabled defaults true. Any number of fresh wallets can each drip 24k/day.  
- Impact: If a future coin mode uses $GO as the stakeable coin (the obvious intent given GoToken exists), the faucet is an infinite free-coin printer: an attacker spins up wallets, farms coins, and floods coin-stake games or, if winnings are ever redeemable, mints money directly. Classic free-coin-economy collapse vector.  
- Fix: Before any coin mode ships: disable the faucet on mainnet (faucetEnabled=false / remove faucet from the prod token), gate coin issuance behind earned/purchased flows with sinks, and never make faucet-minted coins redeemable for value. Keep faucet strictly testnet. _(Aufwand M)_

**LEO-R11 — Server signs the full contract pot with no upper-bound cross-check, compounding the unbounded-amount contract bug** `high`  
- Evidenz: The server reads contractRoom.pot and signs exactly that amount (server.ts:904-907). It never asserts pot == expected stake * participants, nor that contractRoom.status is ACTIVE. Combined with LudoVault.claimPayout having no require(amount <= room.pot) (AAA-C3), the signer is the only thing between a correct payout and an over-payout.  
- Impact: A roomId collision, stale RPC read, or any bug returning an inflated pot causes the signer to authorize an over-sized claim the contract will honor (it does not bound amount to room.pot), draining other rooms' funds. The fee is computed off that same inflated amount, corrupting treasury accounting. This is the economic blast-radius of AAA-C3 on the server side.  
- Fix: Before signing, assert contractRoom.status==ACTIVE and potAmount == entryAmount*participants for the off-chain room; reject mismatches. Necessary even after the contract gets require(amount<=room.pot), as defense in depth on the revenue path. _(Aufwand S)_

**LEO-R12 — Authoritative state is a single in-process array scanned O(n) on every game event — hard cap at one Node process** `critical`  
- Evidenz: server.ts:106 `let activeRooms: BackendRoom[] = [];` is the live source of truth; every roll_dice/move_token/join_match/payout does `activeRooms.find(r => r.id...)` (server.ts:300/579/649/709/877/938/994), and disconnect does `activeRooms.forEach(...)` (server.ts:782). Redis (stateManager) is only a write-through backup with no locking.  
- Impact: Concurrency is capped at one process. At tens of thousands of rooms the linear scans (especially the per-disconnect forEach during a reconnect storm) saturate the event loop; a second instance would split rooms and desync. Central blocker to 100k CCU.  
- Fix: Make Redis (or a sharded in-memory store keyed by hash(roomId)) the authoritative store accessed by O(1) key, not array scan. Index rooms by id in a Map at minimum today; for scale, shard rooms across stateless game-nodes and read-modify-write per-room Redis keys under optimistic lock (WATCH/Lua). _(Aufwand XL)_

**LEO-R13 — No Socket.IO Redis adapter and no sticky sessions — multi-node fan-out is impossible** `critical`  
- Evidenz: server.ts:95-103 `new Server(server, {cors, pingInterval, pingTimeout})` configures no adapter; `@socket.io/redis-adapter` is absent from backend/package.json. broadcastState (server.ts:189) calls `io.to(room.id).emit(...)`. Client uses websocket+polling transports (useGameSocket.ts:62) which needs sticky routing.  
- Impact: With >1 instance, io.to(room) only reaches sockets on the same process, so opponents on different nodes never receive state_update — games silently desync. Polling fallback also breaks without sticky LB. Effectively un-shardable as built.  
- Fix: Add @socket.io/redis-adapter (or cluster adapter) with a dedicated pub/sub Redis, and configure sticky sessions (cookie/IP-hash) on the load balancer so a socket's handshake+upgrade stays on one node. Do this BEFORE any horizontal scale test. _(Aufwand M)_

**LEO-R14 — Turn timers are per-process setTimeout and not re-armed on recovery — rolling deploys freeze staked pots at scale** `critical`  
- Evidenz: Timers are in-memory setTimeout handles in `activeTurnTimers` (server.ts:215, startTurnTimer 330-357). The boot recovery block (server.ts:1098-1118) rebuilds activeRooms from Redis/chain but never calls handleNextTurn/startTurnTimer for ACTIVE rooms (builds on prior AAA-C2).  
- Impact: Every deploy/crash drops all timers. At 25k concurrent rooms a single rolling deploy abandons thousands of in-flight turns with no AFK/forfeit enforcement; if the active player never returns, the pot locks forever and no payout signature is issued. Scales linearly with CCU and makes zero-downtime deploys impossible.  
- Fix: Externalize deadlines: store turnExpiresAt in Redis and drive timeouts from a single Redis ZSET sweeper or BullMQ delayed jobs, decoupled from any one process. On boot, re-arm/resume every ACTIVE room from remaining time. Never rely on setTimeout for money-critical deadlines across deploys. _(Aufwand L)_

**LEO-R15 — Health endpoint creates a new Postgres connection pool per request — LB probes will exhaust Postgres** `high`  
- Evidenz: health.ts:30-45 each GET /health does `new PrismaClient({ adapter: new PrismaPg({connectionString}) })`, runs SELECT 1, then $disconnect(). PrismaPg owns a pool per instance.  
- Impact: With N game-nodes each probed every few seconds (plus container healthchecks), this churns Postgres connections continuously and risks max_connections exhaustion — a self-inflicted DB outage that worsens as you scale out.  
- Fix: Use a single shared PrismaClient, or report DB health from a cached background check; skip building a pool inside the handler. Front Postgres with PgBouncer and cap pool size. _(Aufwand S)_

**LEO-R16 — Redis writes are blind full-state setex with no concurrency control — lost-update races the moment you shard** `high`  
- Evidenz: stateManager.ts:66-74 saveRoom does `redis.setex(key, TTL, JSON.stringify(room))` + sadd with no WATCH/MULTI/Lua/version check; called on every broadcast (server.ts:199-203). The whole room object is serialized each time.  
- Impact: While one node owns a room it's fine, but any horizontal split (or a reconnect handled on another node) yields read-modify-write races that silently corrupt or roll back game/pot state — unacceptable for staked games. Full-object writes also waste Redis bandwidth (25k rooms * many moves/min).  
- Fix: Add optimistic concurrency (version field + WATCH or Lua CAS) and write deltas/checkpoints rather than the whole state every broadcast. Ensure exactly one writer per room (sharding) or serialize via per-room lock. _(Aufwand M)_

**LEO-R17 — Matchmaking is REST create/join with no queue or presence fan-out, and GET /api/rooms returns the whole array** `high`  
- Evidenz: server.ts:917 (/api/rooms/create) and 990 (/api/rooms/join) mutate the in-memory array; per-IP limits are 5 creates/10 joins per minute (server.ts:145-159); `GET /api/rooms` returns the entire activeRooms array (server.ts:915); lobby presence is HTTP-polled (prior AAA-H10).  
- Impact: No real matchmaking throughput model (no skill/stake bucketing, no fair queue, no socket-pushed lobby deltas). At 25k rooms with thousands of lobby clients polling, the full-list GET is a multi-MB/sec firehose and CPU sink independent of gameplay.  
- Fix: Build a matchmaking service: players enqueue by (mode, stake bucket); a matcher forms rooms and pushes assignments over Socket.IO. Replace polling + full-list GET with paginated/filtered queries and event-pushed room:updated deltas via the Redis adapter. _(Aufwand L)_

**LEO-R18 — Platform fee/rake is invisible to players — pot and victory UI show GROSS winnings, the company's revenue model is never disclosed** `critical`  
- Evidenz: LudoVault charges feeBps (abi/LudoVault.json:20,623; prior audit confirms fee=(amount*feeBps)/BPS in claimPayout). The UI never shows it: pot-display renders `(parseFloat(gameConfig.stake) * gameConfig.playerCount).toFixed(1) C2FLR` (App.jsx:688-691) and the win screen claims `You won ${potAmount} C2FLR!` (VictoryCelebration.jsx:153) where potAmount is the same gross stake*playerCount (App.jsx:725-727). No 'fee', 'rake', or 'net payout' string exists anywhere in src.  
- Impact: The winner is told they won X but the contract pays X-minus-rake, so the actual wallet credit is LESS than the celebrated number. For a real-money product this reads as the house silently skimming — the single fastest way to destroy trust and trigger chargeback/fraud complaints. It also means the rake is undisclosed pre-stake, a legal/consumer-protection exposure.  
- Fix: Make the rake a first-class, data-driven UI value sourced from the contract feeBps. Before stake: show 'Entry X, Winner takes Y (after Z% platform fee)'. On the pot display: show net-to-winner. On victory: show 'You won {net}' with an itemized 'pot {gross} − fee {fee}'. This is also the lever to communicate the business model honestly while keeping it profitable. _(Aufwand M)_

**LEO-R19 — No free/coin economy exists — 'flexible free vs coin vs stake' is unbuildable without a rewrite, and free players have zero retention loop** `high`  
- Evidenz: Modes are 'local'|'ai'|'web3' (Lobby.jsx:67). Local/AI generate an offline room id (LudoLobby.tsx:67 `Math.random().toString(36)`) with no server, no currency, no reward, no XP. The only online/rewarded path is web3 paid C2FLR (handleStart 255-292). There is no soft-currency balance, no daily reward, no ranked/free-online queue, no leaderboard surfaced in any read file.  
- Impact: A non-paying player can only play silent offline matches against AI — nothing is earned, ranked, or social, so there is no reason to return tomorrow and no on-ramp that converts a free player into a coin player and then a staking player. The owner's core flexibility + retention goal is not just unmet, it has no scaffolding.  
- Fix: Introduce a data-driven match descriptor {currency: 'none'|'coin'|'native', stake, ruleset} instead of the mode union. Add a free ONLINE ranked queue (server-backed, no funds) and a soft-coin currency (the existing $GO/GoToken) earned by free play and spendable on coin-stake rooms, with native C2FLR as the top tier. This is the conversion ladder: free->coin->paid. _(Aufwand XL)_

**LEO-R20 — Three conflicting currency stories across the funnel (ETH vs C2FLR vs $GO) confuse the player about what they are staking** `high`  
- Evidenz: GameBrowser.tsx:31 advertises Ludo stakes as '0.01 - 1 ETH'. Lobby stake selector uses unlabeled literals ['0.1','1','10','25'] (Lobby.jsx:491) rendered as C2FLR (489) or fallback '$GO' (406) or 'C2FLR' (448). App.jsx:691 hardcodes 'C2FLR'. The brand/landing is '$GOLudo' (LandingPage.tsx:179) implying a $GO coin that is not the actual play currency (native C2FLR, useLudoWeb3.ts:28).  
- Impact: Players cannot tell whether they are staking ETH, C2FLR, or $GO. On a real-money product, ambiguity about the asset being risked is both a trust and a compliance problem, and it makes the displayed stake numbers meaningless ('0.1' of what?).  
- Fix: Pick one canonical currency model and render its symbol from a single source (balanceSymbol) everywhere; delete the ETH string and the '$GO' fallback. Always show the unit next to every amount. If $GO is the intended coin, wire it as the play token; if C2FLR is, rename the brand currency messaging. _(Aufwand M)_

**LEO-R21 — Web3 game refresh / shared link drops a staking player into a config-null room with no resume — real money on the table, no recovery UI** `high`  
- Evidenz: GameRoom.tsx:50-72: localStorage resume is only written for non-web3 modes (App.jsx:224-225 explicitly excludes web3 from the auto-save). For a web3 roomId (length>20) GameRoom just setAppState('game') and lets App.jsx guess config via `if (!gameConfig) setGameConfig({ mode:'web3', roomId })` (App.jsx:212-213), losing player color/index/name/stake. The loading view (App.jsx:504-541) shows a generic 'Establishing Connection' with debug fields, never a 'rejoin your match' state.  
- Impact: A staked player who refreshes or opens the /game/:id link re-enters unable to identify their tokens, see their stake, or know if their funds are safe — in a game where the pot is real. This is the prior AAA-H11 confirmed from the UI side: the highest-anxiety moment (my money, blank screen) has the weakest UX.  
- Fix: Persist a minimal web3 resume record {roomId,address,color,index,stake} and/or rehydrate from the server by wallet address on reconnect; render an explicit 'Reconnecting to your match — your stake is safe' state with the pot shown, not a debug panel. _(Aufwand M)_

**LEO-R22 — Lobby/Web3 error handling is window.alert() with no recovery, classification, or money-context — fails the AAA bar at the exact moment funds move** `high`  
- Evidenz: Every failure path is a raw alert: wallet-not-connected (Lobby.jsx:120), room-gone (199), room-full (215), join failure (247-251), and claim failure in App.jsx:473 `alert('Claim failed: '+...)`. No toast system, no retry, no distinction between user-rejected-tx, insufficient-funds, RPC error, or contract revert (prior AAA-M21/M31).  
- Impact: At the two moments real money is involved (pay-to-join and claim-payout), a blocking browser alert with a raw error string is the entire UX. Players cannot tell a recoverable RPC blip from 'my stake is gone', and there is no retry — they may abandon mid-payment or panic over a claim.  
- Fix: Replace alert() with a classified, non-blocking toast/inline system that maps web3 error codes to human copy (user rejected / insufficient balance / network / contract revert reason) and offers a retry on the recoverable ones. Treat the claim path especially carefully — show tx status and a 'your funds are safe in the vault, retry claim' reassurance. _(Aufwand M)_

**LEO-R23 — Server controls BOTH dice and payout signature with one hot key — no provable fairness for paid games** `critical`  
- Evidenz: secureDiceValue = randomInt(1,7) (server.ts:675) is generated by the same process that calls signPayout (server.ts:907) using a single private key (signer.js:19,29-31). There is no commit-reveal and no Flare VRF anywhere. crypto.randomInt is unpredictable to OUTSIDERS but gives zero guarantee against the server itself.  
- Impact: A compromised, malicious, or buggy backend can bias rolls toward a chosen/colluding address and then sign that address's payout. For strangers wagering against each other this is the core trust failure: the platform cannot prove to a losing player that the dice were fair. This is the single biggest blocker to a credible real-money community.  
- Fix: Make dice provably fair: per-turn commit-reveal where the server publishes H(serverSeed,roomId,turnNonce) before the roll and reveals serverSeed after, with dice = H(serverSeed, clientSeed, nonce) verifiable by any client and by a dispute contract; or adopt Flare's Secure Random / RNG oracle for staked rooms. Persist the per-roll seed chain so a full game is auditable post-hoc. Keep crypto.randomInt only for free games. _(Aufwand XL)_

**LEO-R24 — claimPayout pays an unbounded signer-supplied amount — entire vault drainable (confirms AAA-C3, adds: fee is also unbounded)** `critical`  
- Evidenz: uint256 fee=(amount*feeBps)/BPS_DENOMINATOR; uint256 payout=amount-fee; room.pot=0; ... call{value:payout}. `amount` comes from the signed message and is never checked against room.pot (set to 0 at line 255 but the transfer uses `amount`). The off-chain signer reads pot from chain (server.ts:904-905) but nothing on-chain enforces it.  
- Impact: One leaked/buggy signer key drains funds across ALL rooms, not just one — total-loss vector. The rake is computed off this same unbounded amount, so company fee accounting is also corrupted by any over-sign. Disqualifying for mainnet real money.  
- Fix: At the top of claimPayout add require(amount <= room.pot) (ideally amount == room.pot) and pay both fee and payout out of room.pot. This caps a signer compromise to a single room's pot. Pair with a per-room solvency invariant test. _(Aufwand S)_

**LEO-R25 — No Pausable / circuit breaker on the fund contract — an active drain or signer leak cannot be stopped** `critical`  
- Evidenz: Contract imports ReentrancyGuard, Ownable2Step, ECDSA, EIP712 but NOT Pausable. createRoom/joinRoom/claimPayout have no whenNotPaused gate. setSigner exists (line 292) but rotation does not stop in-flight exploitation.  
- Impact: During an incident (drain bug exploited, key leaked) the owner cannot halt deposits/payouts while migrating funds. Standard audit-blocker for money-holding mainnet contracts; at community scale a single bad hour drains the whole pooled balance.  
- Fix: Add OpenZeppelin Pausable; gate createRoom/joinRoom (and optionally claimPayout) with whenNotPaused; add a fast guardian role separate from owner that can pause. Document a pause -> rotate signer -> resume runbook. _(Aufwand M)_

**LEO-R26 — Two-player collusion can farm a pot with zero detection; no anti-collusion or sybil controls exist** `high`  
- Evidenz: Rooms are joined by any wallet that paid (joinRoom, LudoVault.sol:169) with no check that participants are distinct humans, no IP/device correlation, no account identity beyond a wallet address (validation.js EthAddress). The fee is taken from the winner's payout (LudoVault.sol:253), but in a 2-player room two colluding wallets owned by one person can deterministically move funds between themselves minus rake — and combined with the dice-trust gap above, a colluding insider can guarantee the outcome.  
- Impact: Classic real-money abuse: sybil rings launder/redistribute coins, multi-accounting farms rewards, and chip-dumping defeats any leaderboard or rake-share economy. Without detection the rake is the only thing the house keeps and even that erodes via free-coin farming.  
- Fix: Introduce a real account layer (wallet + optional KYC tier for high stakes), collusion signals (repeated pairings of the same address set, lopsided capture/payout patterns, shared IP/device fingerprints), velocity limits per account, and hold/clawback on flagged payouts. Gate free-coin economies behind proof-of-uniqueness (e.g. captcha + device + rate caps). _(Aufwand XL)_

**LEO-R27 — Socket.IO game events are unauthenticated and unthrottled; join_match leaks opponent state and enables collusion side-channel** `high`  
- Evidenz: socket.join(roomId) (line 576) runs BEFORE any participant check, so any socket can subscribe to any room's state_update broadcasts (opponent token positions). None of join_match/roll_dice/move_token have rate limiting — limiters are Express-only (server.ts:133-159). Payloads are not validated with the zod schemas used on HTTP.  
- Impact: Information leak (opponents' positions in a staked game), an event-loop DoS surface at scale, and a collusion side-channel: two colluders can both subscribe to a victim's room channel to share hidden info. Undermines fairness even when dice are fixed.  
- Fix: Authenticate sockets (signed nonce / session token bound to wallet) on connect; in join_match verify the address is a participant BEFORE socket.join and reject otherwise; add a per-socket and per-account token-bucket limiter on every game event; validate socket payloads with the same zod schemas. _(Aufwand M)_

**LEO-R28 — On-chain verification silently degrades to trust-the-client; txHash optional for staked rooms** `high`  
- Evidenz: Missing FLARE_RPC_URL or VAULT_ADDRESS sets VERIFICATION_ENABLED=false (lines 62,70) and only WARNS in production (lines 59-61,67-69) — it does not exit. With verification disabled, verifyRoomCreation/Join return true unconditionally (lines 124,213). txHash is .optional() (validation.js:28), and rooms/create accepts rooms with no txHash in 'legacy mode' (server.ts:934-936).  
- Impact: A misconfigured prod deploy, or any room created without a txHash, registers a 'paid' room that was never funded on-chain — pairing a paying stranger against a non-paying one, or letting an attacker pollute matchmaking. Breaks the deposit guarantee the whole escrow relies on.  
- Fix: In production hard-fail (process.exit) if RPC/vault are unconfigured instead of degrading to true. Make txHash REQUIRED for any staked room in createRoomSchema/joinRoomSchema. Never return true from a verifier that could not actually verify in production. Keep the 'free' path explicit and separate, not an unverified staked path. _(Aufwand M)_

**LEO-R29 — Single hot signer key, 24h payout deadline, no rotation/HSM — large replay/exposure window** `high`  
- Evidenz: SIGNER_PRIVATE_KEY is read from raw env (line 19) and an ethers.Wallet is constructed in-process (line 30). signPayout sets deadline = now + 86400 (24h, line 46) and a random 32-byte nonce. The on-chain nonce is only consumed on a successful claim (LudoVault.sol:250), so a signed-but-unclaimed proof is replayable for a full day.  
- Impact: Leaking this one env var, combined with the unbounded-amount bug, drains the vault. A 24h deadline means an intercepted proof stays valid for a day. No separation of testnet/mainnet keys, no rotation runbook.  
- Fix: Move signing into a KMS/HSM accessed via API (no raw key in process). Shorten claim deadlines to minutes. Separate testnet/mainnet keys. Move toward a 2-of-3 multisig oracle for mainnet payout authorization so no single compromise authorizes funds. _(Aufwand L)_

**LEO-R30 — Hardcoded 2-player, 5% payout math in the server diverges from the contract fee and breaks 3-4 player rake accounting** `high`  
- Evidenz: betAmount = stake*1e18; feeAmount = betAmount*5n/100n; payoutAmount = betAmount*2n - feeAmount. This assumes exactly 2 players and a fixed 5% fee, while the contract computes fee from feeBps (settable, LudoVault.sol:299) on the on-chain pot. The two fee sources are independent and can disagree; the formula is simply wrong for 3- or 4-player rooms (which the contract and schema allow, maxPlayers 2-4).  
- Impact: In multiplayer paid games the profile/leaderboard/accounting layer records incorrect wagered/won/rake figures, and any business reporting built on it is wrong. If this formula ever feeds a payout amount, players are mis-paid. The rake — the company's profit thesis — is not a single source of truth.  
- Fix: Derive payout/fee from one authoritative source (the on-chain pot and contract feeBps) for ALL accounting; remove the hardcoded *2 and 5%. Make rake a config (rakeBps per mode) consumed by both server and contract. Add tests asserting fee+payout == pot for 2/3/4-player rooms. _(Aufwand M)_

**LEO-R31 — WAITING rooms that never fill lock joiners' funds; emergencyWithdraw only covers ACTIVE** `high`  
- Evidenz: cancelRoom requires status==WAITING AND msg.sender==creator (lines 193-194). emergencyWithdraw requires status==ACTIVE (line 269). ROOM_TIMEOUT=3 minutes is declared (line 26) but never enforced. A 3/4-player room that never reaches maxPlayers stays WAITING forever and a non-creator joiner cannot recover their stake.  
- Impact: At community scale, partially-filled paid rooms are common; their joiners' stakes can lock permanently if the creator disappears. Direct fund-loss / 'where is my stake' class of complaint that destroys trust.  
- Fix: Allow ANY participant to trigger a refund on a WAITING room after ROOM_TIMEOUT (use the declared constant), or extend emergencyWithdraw to handle WAITING. Add a test for a partially-filled room that times out. _(Aufwand M)_

</details>

---

## 📈 Skalierungs-Architektur → 100k concurrent

**Target:** 100,000 concurrent players (~25-30k concurrent 4-player rooms); ~0.3 game-msgs/player/sec => ~30k inbound msgs/sec and, with 4-way fan-out, ~100-120k outbound emits/sec. Crash-safe and deploy-safe so no staked pot ever freezes.

1. AUTHORITATIVE STATE OFF THE PROCESS (fixes AAA-C3/C1-state): delete the in-memory `let activeRooms: BackendRoom[]` (server.ts:106) as source of truth. Authoritative per-room state lives in Redis keyed by roomId for O(1) access (no more O(n) .find() on every roll/move/join at server.ts:300/579/649/709/877/938/994, no O(rooms) .forEach on disconnect at server.ts:782). Each room is owned by exactly one shard via hash(roomId); writes are read-modify-write under optimistic lock (WATCH/Lua CAS, version field) so sharding never loses updates. Postgres is the durable record-of-result (game end + ledger), fronted by ONE shared PgBouncer pool — and the per-request `new PrismaClient` in health.ts is replaced by a single shared client / cached background health check so LB probes can't exhaust connections.
2. STATELESS SHARDED GAME NODES behind a WS GATEWAY: ~12-15 stateless Node game nodes (a tuned node holds ~8-10k sockets), rooms sharded by hash(roomId). A thin WS gateway / load balancer terminates sockets with STICKY SESSIONS (cookie/IP-hash) — mandatory because useGameSocket.ts:62 enables polling fallback which requires sticky routing. Nodes are interchangeable; any node can serve any player because state is in Redis.
3. SOCKET.IO REDIS ADAPTER (fixes the multi-node fan-out blocker): add @socket.io/redis-adapter (currently ABSENT from backend/package.json; only ioredis is present) wired into `new Server(...)` at server.ts:95 with a DEDICATED pub/sub Redis, so io.to(roomId).emit() fans out across all nodes. Without this you are physically pinned to one process.
4. EXTERNALIZED, RE-ARMED TURN TIMERS (fixes AAA-C2-timers — money-critical): replace per-process setTimeout in activeTurnTimers (server.ts:215/330) with turnExpiresAt stored in Redis, driven by a single Redis ZSET sweeper or BullMQ delayed jobs decoupled from any one process. On boot/deploy, re-arm EVERY ACTIVE room from remaining time. Never let a rolling deploy freeze a staked pot again (the current recovery at server.ts:1098-1118 rebuilds rooms but never restarts timers).
5. MATCHMAKING SERVICE + PUSH LOBBY (kills the lobby meltdown): replace REST create/join + 3s/1.5s HTTP polling of `GET /api/rooms` (which returns the ENTIRE array, server.ts:915, and is double-fetched per join at Lobby.jsx:194) with a queue: players enqueue by (mode, stake-bucket); a matcher forms rooms and PUSHES assignments over Socket.IO room events with a minimal projection (room:updated deltas via the Redis adapter). Paginated/filtered room queries only. This removes the tens-of-thousands-of-full-list-fetches/sec that melt the lobby before any game starts.
6. SETTLEMENT WORKER POOL + HA SIGNER (fixes the single hot-signer revenue bottleneck): move EIP-712 signing behind a queued, nonce-managed worker pool reading from a KMS/HSM (no raw key in process), with batching and short claim deadlines (minutes, not 24h). Cache the per-room on-chain read (getRoomStateFromContract at server.ts:904) instead of a synchronous Flare RPC hit per game-end; add a small RPC read-cache / fallback provider so contractVerifier's retried receipt lookups don't rate-limit the create/join/settle pipeline at scale.
7. AUTOSCALING + OBSERVABILITY: autoscale game nodes on sockets-per-node + event-loop-lag + Redis CPU; multi-region gateways (current single-region CORS at server.ts:83 = transcontinental RTT) with region-local matchmaking and AI table-fill so a match is always instant. Per-broadcast writes become deltas/checkpoints, not full-room JSON (server.ts:199), to cut Redis bandwidth.

---

## 🎨 UX North-Star

**Prinzipien:**
- Honesty about money is the brand: the rake is the revenue model, so SHOW it. Before staking: 'Entry X — Winner takes Y (after Z% platform fee)'. On the pot: show NET-to-winner, not gross. On victory: 'You won {net}' with an itemized 'pot {gross} − fee {fee}'. The current UI advertises GROSS everywhere (App.jsx:684-693 pot, VictoryCelebration.jsx:153 'You won {potAmount} C2FLR'), which short-changes the winner and is a trust-killer for real money. Fix this and the rake becomes a feature, not a surprise.
- Provable fairness as a marketed surface: expose the commit-reveal dice (show the pre-committed hash before the roll, the revealed seed after) and a 'verify this game' link for staked rooms. Turn the security control into a reason to trust the house.
- One currency story, rendered from one source: every amount shows its unit from a single balanceSymbol; delete the ETH string and the '$GO' fallback. Never make the player guess what they are staking.
- Non-crypto-first onboarding: social/email login (already wired in GlobalHeader) must reach a PLAYABLE free game and a coin balance WITHOUT a wallet. A wallet is required only at the moment of a real FLR stake — progressive, just-in-time, never an upfront alert('connect your wallet') gate (Lobby.jsx:119-121).
- The soft/hard boundary must be unmistakable: GoCoins (casual, never cash out) and FLR (real, cashes out) are visually and copy-distinct so no one feels baited. Every 'free coin' surface states it is non-cashable.
- Money is always safe and always recoverable: a refresh/shared-link into a staked game shows 'Reconnecting to your match — your stake is safe' with the pot, never a config-null debug room. Errors on the funds path are classified, non-blocking, human-readable (user rejected / insufficient balance / network / contract revert), with retry on recoverable ones — replacing window.alert().
- Push, not poll: the lobby/presence/'waiting for players'/color-availability update live via socket events, so the funnel feels instant and never shows stale state.

**Kritische Flows (müssen makellos sein):**
- Non-crypto onboarding -> first free game: social/email login -> playable free ranked match in seconds, earning GoCoins, with ZERO wallet friction.
- Free -> coin -> paid conversion ladder: free play earns GoCoins -> coin-stake games create the 'real stakes feel' -> a clear, honest upgrade to FLR cash stake with the rake disclosed; this ladder IS the monetization engine and must feel like progression, not a paywall.
- Join/stake a real-money room: see entry, net-to-winner, and fee BEFORE confirming; balance-vs-stake validation (betAmount<=balance, missing today); on-chain deposit with clear tx status.
- Payout / claim: tx status, provably-fair verification link, itemized net vs gross vs fee, and a 'your funds are safe in the vault — retry claim' reassurance on any failure.
- Reconnect / resume on a live staked game: durable resume record {roomId,address,color,index,stake}, rehydrate by wallet on reconnect, explicit 'stake is safe' state — real money on the table must never drop into a broken room.
- Buy/earn GoCoins (one-way on-ramp): fiat/FLR -> GoCoins with the non-cashable nature stated plainly, so the firewall is understood, not discovered.

---

## 🛡️ Security at Scale — Must-Haves

- FUND SAFETY P0 (fixes AAA-C1, confirmed in code — LudoVault.sol:217-265 has NO pot bound): add require(amount <= room.pot) (ideally amount == room.pot) at the top of claimPayout so a signer compromise is capped to a single room's pot instead of draining the whole vault; pay BOTH fee and payout from room.pot. Pair with a per-room solvency invariant test (fee+payout==pot for 2/3/4 players).
- CIRCUIT BREAKER P0 (fixes AAA-C2 — no Pausable exists): add OpenZeppelin Pausable; gate createRoom/joinRoom (and optionally claimPayout) with whenNotPaused; add a fast GUARDIAN role distinct from owner that can pause. Ship a documented runbook: pause -> rotate signer -> resume.
- TREASURY + SIGNER SEPARATION P0: deploy treasury as a Gnosis Safe MULTISIG (not the deployer EOA it ships as), distinct from the owner key AND the payout signer key; sweep to cold storage on a schedule. Move signing into KMS/HSM (no raw key in process), short claim deadlines (minutes), separate testnet/mainnet keys, and move toward a 2-of-3 oracle for mainnet payout authorization.
- PROVABLE FAIRNESS for staked games (fixes the same-entity-rolls-dice-AND-signs-payout risk): per-turn commit-reveal where the server publishes H(serverSeed,roomId,turnNonce) BEFORE the roll and reveals serverSeed after, dice = H(serverSeed, clientSeed, nonce) verifiable by any client and by a dispute path; persist the per-roll seed chain so a full game is auditable post-hoc. Adopt Flare Secure Random / VRF for the highest tiers. Keep crypto.randomInt only for free games.
- SERVER AUTHORITY + AUTHENTICATED SOCKETS (fixes unauthenticated/unthrottled events leaking opponent state): authenticate sockets (signed nonce / session token bound to wallet) on connect; in join_match verify the address IS a participant BEFORE socket.join (currently leaks opponent positions, server.ts:576); validate every socket payload with the same zod schemas used on REST.
- PRE-SIGN CROSS-CHECK ON THE REVENUE PATH: before signing a payout, assert off-chain room status==ACTIVE and potAmount == entryAmount*participants; reject mismatches. Defense-in-depth on top of the contract bound, protecting fee integrity at scale.
- PER-ACCOUNT (WALLET) RATE LIMITING, not just per-IP: add a per-socket AND per-account token-bucket limiter on every game event (none exists today, server.ts:569/646/706); per-IP alone (server.ts:133) is trivially bypassed by a sybil farm behind many IPs and makes event-loop DoS easy.
- ANTI-SYBIL / ANTI-COLLUSION / ANTI-BOT layer purpose-built for stranger-vs-stranger wagering: proof-of-uniqueness on free-coin issuance (captcha + device fingerprint + rate caps); collusion signals on paid rails (repeated pairings of the same address set, lopsided capture/payout patterns, shared IP/device); velocity limits per account; hold/clawback on flagged payouts; KYC tier-gating for high stakes; geo-fencing + age-gating for the cash rail.
- CLOSE THE FREE-MODE TRUST HOLE: make 'free' an EXPLICIT first-class room type, never an unverified staked path. txHash must be REQUIRED for any staked room (currently .optional(), making a free room indistinguishable from a staked room whose deposit was skipped); in production HARD-FAIL if RPC/vault are unconfigured instead of contractVerifier silently returning true.
- FUND-LOCK FIXES: extend emergencyWithdraw (or add a participant-triggered refund) so WAITING rooms that never fill can be refunded by ANY participant after ROOM_TIMEOUT — today joiners' stakes can lock permanently because emergencyWithdraw only covers ACTIVE rooms and a never-filled WAITING room is creator-cancel-only. Add a test for a partially-filled room that times out.
- DISABLE THE MAINNET FAUCET before any coin economy ships: GoToken.sol ships faucetEnabled=true with a public faucet() minting 1000 fresh tokens/hour against a 1B cap — a free-coin farming vector the instant $GO or any soft coin becomes spendable. Faucet strictly testnet-only; mainnet soft-currency issuance behind earned/purchased flows with sinks, never redeemable for value.

---

## 🗺️ Leo-Roadmap (AAA + 100k)

### Phase 0 — Fund-safety & integrity gates (P0, BLOCKS all real-money scale; ~2-4 wks)

**Ziel:** Make the vault un-drainable, halt-able, and the rake honest BEFORE anything scales — scaling a drainable vault just multiplies blast radius.

1. P0 GATE AAA-C1: add require(amount<=room.pot) (ideally ==) to LudoVault.claimPayout; pay fee+payout from room.pot; solvency invariant tests for 2/3/4 players.
2. P0 GATE AAA-C2: add OpenZeppelin Pausable + a guardian role separate from owner; whenNotPaused on createRoom/joinRoom; pause->rotate->resume runbook.
3. P0: deploy treasury as a Gnosis Safe multisig (not deployer EOA); move payout signing to KMS/HSM; shorten claim deadline to minutes; separate testnet/mainnet keys.
4. P0: single source-of-truth feeBps consumed by contract AND server; DELETE the hardcoded betAmount*5n/100n on betAmount*2n (server.ts:448-449); derive payout/fee from GameFinished(payout,fee) with real participant count; pre-sign cross-check potAmount==entryAmount*participants.
5. P0: extend emergencyWithdraw / add participant-triggered WAITING-room refund after ROOM_TIMEOUT so joiner funds can't lock permanently.
6. P0: revive the dead-on-arrival backend tests; add contract + settlement invariant tests as the regression net before any other work lands.
7. Audit gate: independent smart-contract security review sign-off before mainnet stake re-opens.

### Phase 1 — Horizontally scalable, crash-safe core (P0 for 100k; ~4-8 wks)

**Ziel:** Break the single-process ceiling and guarantee no staked pot ever freezes on deploy/crash.

1. P0 GATE AAA-C3: move authoritative room state to Redis keyed by roomId (O(1)); shard rooms by hash(roomId); optimistic lock (WATCH/Lua CAS) per room; delete activeRooms as source of truth.
2. P0: add @socket.io/redis-adapter with dedicated pub/sub Redis (currently absent) + sticky sessions on the gateway so multi-node fan-out works.
3. P0: externalize turn deadlines to Redis ZSET sweeper / BullMQ; re-arm every ACTIVE room on boot so rolling deploys never freeze pots (current recovery rebuilds rooms but not timers).
4. P0: replace per-request PrismaClient in health.ts with a shared client / cached check; front Postgres with PgBouncer.
5. Stand up stateless game nodes behind a WS gateway; load-test to a fraction of 100k before opening scale.
6. Authenticate sockets (wallet-bound nonce) + zod-validate every socket payload; fix join_match participant check that leaks opponent state.

### Phase 2 — Economy rails: free + non-cashable GoCoins + hardened stake (~6-10 wks)

**Ziel:** Build the three first-class money rails and the dual-rake, replacing the hardcoded mode/stake forks.

1. Build the transactional double-entry GoCoin ledger (append-only, row-locked, partitioned by user), STRICTLY separate from profileManager stats strings.
2. Replace the 'local'|'ai'|'web3' mode union with a data-driven match descriptor {currency:'free'|'coin'|'stake', stake, rakeBps, ruleset}; stakes/tiers become config, not literals.
3. Build the FREE online ranked rail (no escrow, server-recorded results) and the COIN rail (coin pot in ledger, coin rake + BURN sink).
4. One-way coin on-ramp (fiat/PSP + FLR->Coins), non-cashable by construction; coin sinks (cosmetics, rematch, tournament tickets).
5. Reposition $GO to non-redeemable cosmetic/loyalty/rake-back; DISABLE mainnet faucet (testnet-only); add balance-vs-stake validation (betAmount<=balance).
6. Settlement worker pool + nonce queue + cached on-chain reads to remove the single-hot-signer bottleneck at scale.

### Phase 3 — AAA UX coherence & honest rake (~4-6 wks, overlaps P2)

**Ziel:** Make every money surface honest, recoverable, and non-crypto-friendly.

1. Show the rake everywhere: entry/net-to-winner/fee before stake, net on the pot, itemized net-vs-gross-vs-fee on victory (replace gross-only App.jsx/VictoryCelebration).
2. One balanceSymbol source across the funnel; delete ETH and '$GO' fallback strings.
3. Non-crypto onboarding: social/email login -> playable free game + coin balance with no wallet; wallet required only at real-stake moment (remove the upfront alert gate).
4. Durable staked-game resume {roomId,address,color,index,stake} + 'your stake is safe' reconnect state.
5. Classified non-blocking error/toast system mapping web3 error codes to human copy with retry on recoverable ones; tx-status on claim.
6. Push-based projected lobby (socket room:updated deltas) replacing 3s polling + full /api/rooms list; real live-player counts replacing MOCK_STATS.

### Phase 4 — Provable fairness, anti-abuse, monetization scale (~6-10 wks)

**Ziel:** Earn stranger-vs-stranger trust at volume and turn the free base into durable margin.

1. Commit-reveal dice for staked games (pre-committed hash shown, seed revealed, full seed-chain persisted + verify link); Flare VRF for top tiers; keep crypto.randomInt for free only.
2. Per-account (wallet) token-bucket rate limiting on every game event; sybil proof-of-uniqueness on free-coin issuance.
3. Trust-and-safety: collusion detection (repeat pairings, lopsided payout graphs, shared device/IP), velocity limits, hold/clawback, KYC tier-gating for high stakes, geo/age gating on the cash rail.
4. Monetization scale: rewarded ads on free/coin tiers, cosmetics + battle pass content pipeline, $GO rake-back for VIP volume, coin-burn tuning to keep the soft economy net-negative-sum.
5. Capacity observability + autoscaling signals; multi-region gateways with AI table-fill so a match is always instant.

---

## ❓ Offene Owner-Entscheidungen (Produkt-Weichen)

> Das sind die echten Entscheidungen, die nur **du** treffen kannst. Leos Empfehlung jeweils dabei.

### LEO-D1 — Real-money (FLR cash stake) rake percentage — the headline durable margin. The contract ships at 2.5% (feeBps=250); the deep-dives split between 'undercut poker (3-6%) to win volume' and 'industry skill-game norm (8-10%), 2.5% is far too thin to be durable'.

- Flat 2.5% (current) — cheapest for players, likely too thin to fund 100k-grade infra + trust-and-safety
- Tiered 5-10% (default 8%, feeBps=800) with a min-fee floor on dust pots — industry-standard, durable
- Tiered 3-6% with $GO rake-back at the top — aggressive volume play, thinner margin

> **Leo empfiehlt:** Tiered 8% default (feeBps=800): ~10% micro / ~8% mid / ~6% high-roller-with-$GO-rake-back, plus an absolute min-fee floor so dust pots aren't gas-negative. 2.5% cannot durably fund the infra + trust-and-safety a real-money 100k product requires; 8% sits squarely in accepted skill-gaming rake norms, Ludo's social low-friction nature absorbs it, and the high-roller taper + rake-back protects whale volume. Tune down later if competition demands — it's a single config value now, not a code change.

### LEO-D2 — Should GoCoins be cashable (redeemable for FLR/fiat) or strictly one-way non-cashable?

- Non-cashable, one-way (fiat/FLR->Coins only) — firewall by construction
- Cashable — coins convert back to value

> **Leo empfiehlt:** Strictly NON-cashable, one-way. This is the single rule that eliminates the entire 'farm free coins -> cash out' attack class by construction, neutralizes the GoToken faucet-farming risk, and keeps the casual tier largely out of money-transmitter/gambling-payout scope in most regimes — a massive legal-cost reduction. The trade-off (players can't cash out coin winnings) is solved by the free->coin->FLR conversion ladder, not by making coins redeemable. Non-negotiable for durability and legal posture.

### LEO-D3 — Free-tier posture: thin demo funnel (Cash-Game model) or full free-to-play growth engine (Three-Rail model)?

- Thin demo (local/AI + capped daily P2P) whose only job is funneling to stakes
- Full F2P growth engine: unlimited free ONLINE ranked, monetized by ads/cosmetics, as the DAU/liquidity base

> **Leo empfiehlt:** Full F2P growth engine. Liquidity ('always a table waiting') is the AAA feel that retention and virality depend on, and the free base monetizes via ~100%-margin ads + cosmetics even if it never stakes — revenue scales with games played, not with anyone losing. A thin demo starves top-of-funnel and gives free players zero retention loop (today local/AI earns nothing, so they never return). Hard-cap free per account/day to bound the zero-revenue infra cost, and add AI table-fill so matches are instant in thin regions.

### LEO-D4 — What to do with the $GO token (dead/decorative today, open-faucet farming risk)?

- Retire it entirely
- Reposition as non-redeemable cosmetic/loyalty/governance + VIP rake-back, mainnet faucet OFF
- Make it the spendable stake/cashout currency

> **Leo empfiehlt:** Reposition as non-redeemable cosmetic/loyalty/governance + VIP rake-back, with the mainnet faucet DISABLED (testnet-only) and mainnet issuance only from a capped earned/purchased pool with sinks. Never make faucet-minted $GO spendable for value (that's the farming vector). This salvages community goodwill and gives $GO real first-party utility (rake discounts) without it ever becoming a free-coin value leak. Messaging matters — communicate the repositioning to existing holders early to avoid pushback.

### LEO-D5 — Provable-fairness mechanism for staked dice — the trust moat for stranger-vs-stranger real money.

- Status quo: server-trusted crypto.randomInt (same entity rolls AND signs payout — unprovable)
- Commit-reveal seed chain (server commits H(seed) before roll, reveals after, client-verifiable + auditable)
- Flare VRF / Secure Random oracle for staked rooms

> **Leo empfiehlt:** Commit-reveal seed chain for ALL staked games as the baseline (cheap, fully client-verifiable, persists an auditable per-roll chain, and is marketable as a feature), and adopt Flare VRF/Secure Random for the highest stake tiers where the extra trust premium justifies the oracle cost/latency. Keep crypto.randomInt only for free play. Today one entity controls both dice and payout — no amount of UI polish overcomes that for a suspicious stranger wagering real money; provable fairness is the moat.

### LEO-D6 — Coin-mode escrow implementation: a dedicated ERC-20 LudoVault variant on-chain, or pure off-chain ledger?

- On-chain ERC-20 coin vault (approve/transferFrom, fee in token)
- Pure off-chain double-entry ledger, coins never touch chain

> **Leo empfiehlt:** Pure off-chain double-entry ledger. Since GoCoins are non-cashable soft currency, on-chain escrow buys no extra trust but adds gas, throughput limits, and audit surface for the very rail that carries 90-95% of traffic. Keep coins entirely off-chain (row-locked, append-only, partitioned by user) so the coin rail is embarrassingly parallel and cheap at 100k; reserve the chain strictly for the FLR rail that can afford per-tx cost. This is exactly the load-decoupling that makes 100k tractable.

### LEO-D7 — Cash-rail regulatory/market scope at launch — how aggressively to gate real-money play?

- Global open (fastest growth, highest legal risk)
- Geo-fenced + age-gated + KYC-tiered cash rail, free/coin rails broadly available
- Defer the cash rail; launch free+coin first, add FLR stake post-licensing

> **Leo empfiehlt:** Geo-fenced + age-gated + KYC-tiered cash rail, with free+coin broadly available globally. The non-cashable coin firewall lets you grow DAU worldwide while confining the heavy gambling/AML/licensing burden to the minority FLR rail behind geo/age/KYC gates. If legal timelines slip, fall back to launching free+coin first and switching on FLR stake per-jurisdiction as licensing lands — the data-driven match descriptor makes the stake rail a config flip, not a rebuild. Get jurisdiction-specific legal counsel before opening real-money play in any market.

---

## 🧭 Provenance

- **Quelle:** Multi-Agent-Workflow `leo-aaa-scale-economy` (Run `wf_7a4e0370-70e`, 9 Agents, ~787k Tokens). Roh-Output + Extract (`C:/tmp/leo-extract.json`) sind die Belege.
- **Aufbauend auf:** Daniels Code-Audit (`AAA-*`-IDs) in der Schwester-Datei.
- **Schlüssel-Insight:** Last nach Money-Rail entkoppeln — 90-95% Free/Coin off-chain auf stateless Redis-Servern, nur der Stake-Rail (8-10% Rake) berührt Flare. So skaliert Revenue linear mit gespielten Games, nicht mit Verlusten.

