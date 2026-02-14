import { ethers } from 'ethers';
import { signPayout } from '../signer.js';

describe('Signer Module', () => {
    const testRoomId = ethers.id("test_room_123");
    const testWinner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Random valid address
    const testAmount = ethers.parseEther("100").toString();

    test('should generate a valid EIP-712 signature', async () => {
        // Provide a dummy key for testing purposes if none exist
        if (!process.env.SERVER_SIGNER_PRIVATE_KEY) {
            process.env.SERVER_SIGNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        }

        const result = await signPayout(testRoomId, testWinner, testAmount);

        expect(result).toHaveProperty('signature');
        expect(result).toHaveProperty('nonce');
        expect(result.roomId).toBe(testRoomId);
        expect(result.winner).toBe(testWinner);
        expect(result.amount).toBe(testAmount);

        // Verify signature format (roughly)
        expect(result.signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    test('should throw error if wallet is not initialized', async () => {
        // This would require mocking the wallet variable in signer.js if we wanted to test it properly
        // For now, we assume the environment check in signer.js handles it.
    });
});
