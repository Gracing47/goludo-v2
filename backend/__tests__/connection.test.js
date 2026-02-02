import { io as ioc } from 'socket.io-client';
import { server, io } from '../server.ts';

describe('Socket Connection & Match Flow', () => {
    let clientSocket;
    const port = 3300 + Math.floor(Math.random() * 100);

    beforeAll(async () => {
        await new Promise(resolve => server.listen(port, resolve));
    });

    afterAll(async () => {
        await new Promise(resolve => io.close(() => resolve()));
        await new Promise(resolve => server.close(resolve));
    });

    beforeEach(async () => {
        clientSocket = ioc(`http://localhost:${port}`);
        await new Promise((resolve) => {
            clientSocket.on('connect', resolve);
        });
    });

    afterEach(() => {
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
    });

    test('should connect and join a match', async () => {
        const testData = {
            roomId: 'test_room_' + Date.now(),
            playerAddress: '0x1234567890123456789012345678901234567890'
        };

        clientSocket.emit('join_match', testData);

        // Give it a moment to process and check state
        await new Promise(resolve => setTimeout(resolve, 500));

        expect(clientSocket.connected).toBe(true);
    });
});
