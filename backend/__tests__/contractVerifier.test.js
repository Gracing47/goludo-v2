import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { verifyRoomCreation, verifyRoomJoin, getRoomStateFromContract } from '../contractVerifier.js';

/**
 * CONTRACT VERIFIER TESTS
 * 
 * Tests blockchain verification functions against Coston2 testnet.
 * Requires deployed LudoVault contract and valid transaction hashes.
 * 
 * Run: node --test backend/__tests__/contractVerifier.test.js
 */

describe('Contract Verifier', () => {
    // Test data - replace with actual transaction hashes from Coston2
    const TEST_ROOM_ID = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const TEST_TX_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const TEST_CREATOR = '0x0000000000000000000000000000000000000000';
    const TEST_STAKE = 100;

    describe('verifyRoomCreation', () => {
        it('should reject fake transaction hash', async () => {
            await assert.rejects(
                async () => {
                    await verifyRoomCreation(
                        TEST_ROOM_ID,
                        '0xfakefakefakefakefakefakefakefakefakefakefakefakefakefakefakefake',
                        TEST_CREATOR,
                        TEST_STAKE
                    );
                },
                {
                    message: /Transaction not found on blockchain/
                }
            );
        });

        it('should reject mismatched creator address', async () => {
            // This test requires a real transaction hash
            // Skip if TEST_TX_HASH is placeholder
            if (TEST_TX_HASH === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                console.log('⚠️ Skipping test - requires real transaction hash');
                return;
            }

            await assert.rejects(
                async () => {
                    await verifyRoomCreation(
                        TEST_ROOM_ID,
                        TEST_TX_HASH,
                        '0x1111111111111111111111111111111111111111', // Wrong address
                        TEST_STAKE
                    );
                },
                {
                    message: /Creator mismatch/
                }
            );
        });

        it('should reject mismatched stake amount', async () => {
            // This test requires a real transaction hash
            if (TEST_TX_HASH === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                console.log('⚠️ Skipping test - requires real transaction hash');
                return;
            }

            await assert.rejects(
                async () => {
                    await verifyRoomCreation(
                        TEST_ROOM_ID,
                        TEST_TX_HASH,
                        TEST_CREATOR,
                        999 // Wrong stake
                    );
                },
                {
                    message: /Stake amount mismatch/
                }
            );
        });
    });

    describe('getRoomStateFromContract', () => {
        it('should return EMPTY status for non-existent room', async () => {
            const fakeRoomId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
            const roomState = await getRoomStateFromContract(fakeRoomId);

            assert.strictEqual(roomState.status, 0, 'Room should be EMPTY');
            assert.strictEqual(roomState.creator, '0x0000000000000000000000000000000000000000', 'Creator should be zero address');
        });
    });

    describe('verifyRoomJoin', () => {
        it('should reject fake join transaction', async () => {
            await assert.rejects(
                async () => {
                    await verifyRoomJoin(
                        TEST_ROOM_ID,
                        '0xfakefakefakefakefakefakefakefakefakefakefakefakefakefakefakefake',
                        TEST_CREATOR,
                        TEST_STAKE
                    );
                },
                {
                    message: /Transaction not found on blockchain/
                }
            );
        });
    });
});

console.log(`
📝 Test Instructions:
1. Create a Web3 room on Coston2 testnet via the frontend
2. Copy the transaction hash from the console
3. Update TEST_ROOM_ID, TEST_TX_HASH, TEST_CREATOR, and TEST_STAKE in this file
4. Run: node --test backend/__tests__/contractVerifier.test.js

For now, only fake transaction tests will run.
`);
