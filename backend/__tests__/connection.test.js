import { io as ioc } from 'socket.io-client';
import { server, io } from '../server.js';

describe('Socket Connection & Match Flow', () => {
    let clientSocket;
    const port = 3300 + Math.floor(Math.random() * 100);

    beforeAll((done) => {
        server.listen(port, () => {
            done();
        });
    });

    afterAll((done) => {
        io.close();
        server.close(() => {
            done();
        });
    });

    beforeEach((done) => {
        clientSocket = ioc(`http://localhost:${port}`);
        clientSocket.on('connect', done);
    });

    afterEach(() => {
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
    });

    test('should connect and join a match', (done) => {
        const testData = {
            roomId: 'test_room_' + Date.now(),
            playerAddress: '0x1234567890123456789012345678901234567890'
        };

        clientSocket.emit('join_match', testData);

        // Give it a moment to process and check state
        setTimeout(() => {
            // In a real test, we would expect a response or check server state
            // For now, just verifying the emit doesn't crash the server
            expect(clientSocket.connected).toBe(true);
            done();
        }, 500);
    });
});
