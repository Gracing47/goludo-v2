/**
 * MANUAL INTEGRATION TEST: Fake Room Creation Rejection
 * 
 * This script tests that the backend correctly rejects room creation
 * attempts with fake/invalid transaction hashes.
 * 
 * Prerequisites:
 * 1. Backend server running: cd backend && node server.js
 * 2. Node.js installed
 * 
 * Run: node backend/__tests__/manual-fake-room-test.js
 */

const API_URL = 'http://localhost:3333';

async function testFakeRoomCreation() {
    console.log('🧪 Testing Fake Room Creation Rejection\n');

    const fakeRequest = {
        roomId: '0xfakefakefakefakefakefakefakefakefakefakefakefakefakefakefakefake',
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        stake: 100,
        maxPlayers: 2,
        creatorName: 'Hacker',
        creatorAddress: '0x1234567890123456789012345678901234567890',
        color: 'red'
    };

    console.log('📤 Sending fake room creation request...');
    console.log('   Room ID:', fakeRequest.roomId);
    console.log('   TX Hash:', fakeRequest.txHash);
    console.log('   Creator:', fakeRequest.creatorAddress);

    try {
        const response = await fetch(`${API_URL}/api/rooms/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fakeRequest)
        });

        const data = await response.json();

        console.log('\n📥 Response Status:', response.status);
        console.log('📥 Response Body:', JSON.stringify(data, null, 2));

        if (response.status === 403) {
            console.log('\n✅ TEST PASSED: Backend correctly rejected fake transaction');
            console.log('   Error message:', data.error);
            return true;
        } else if (response.status === 200) {
            console.log('\n❌ TEST FAILED: Backend accepted fake transaction!');
            console.log('   This is a security vulnerability.');
            return false;
        } else {
            console.log('\n⚠️ UNEXPECTED RESPONSE:', response.status);
            return false;
        }

    } catch (error) {
        console.error('\n❌ TEST ERROR:', error.message);
        console.error('   Make sure backend server is running on port 3333');
        return false;
    }
}

async function testLegacyMode() {
    console.log('\n\n🧪 Testing Legacy Mode (No txHash)\n');

    const legacyRequest = {
        roomId: '0xlegacylegacylegacylegacylegacylegacylegacylegacylegacylegacylegacy',
        // No txHash provided
        stake: 50,
        maxPlayers: 2,
        creatorName: 'Legacy User',
        creatorAddress: '0x9876543210987654321098765432109876543210',
        color: 'blue'
    };

    console.log('📤 Sending legacy room creation request (no txHash)...');

    try {
        const response = await fetch(`${API_URL}/api/rooms/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(legacyRequest)
        });

        const data = await response.json();

        console.log('\n📥 Response Status:', response.status);
        console.log('📥 Response Body:', JSON.stringify(data, null, 2));

        if (response.status === 200) {
            console.log('\n⚠️ LEGACY MODE: Backend accepted request without verification');
            console.log('   This is expected in legacy mode but should be disabled in production');
            return true;
        } else {
            console.log('\n✅ STRICT MODE: Backend requires txHash');
            return true;
        }

    } catch (error) {
        console.error('\n❌ TEST ERROR:', error.message);
        return false;
    }
}

// Run tests
(async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  PHASE 5: ON-CHAIN VERIFICATION INTEGRATION TEST');
    console.log('═══════════════════════════════════════════════════════\n');

    const test1 = await testFakeRoomCreation();
    const test2 = await testLegacyMode();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Fake Room Rejection: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Legacy Mode Check:   ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(test1 && test2 ? 0 : 1);
})();
