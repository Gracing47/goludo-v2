import { io as ioc } from 'socket.io-client';
import { server, io } from '../server.ts';

describe('Stress Test - Multiple Connections', () => {
    const port = 3400 + Math.floor(Math.random() * 100);
    const clientCount = 20; // Test with 20 concurrent connections
    let clients = [];

    beforeAll(async () => {
        await new Promise(resolve => server.listen(port, resolve));
    });

    afterAll(async () => {
        clients.forEach(c => c.disconnect());
        await new Promise(resolve => io.close(() => resolve()));
        await new Promise(resolve => server.close(resolve));
    });

    test(`should handle ${clientCount} concurrent connections`, async () => {
        await new Promise((resolve, reject) => {
            let connectedCount = 0;
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 8000);

            for (let i = 0; i < clientCount; i++) {
                const client = ioc(`http://localhost:${port}`, {
                    transports: ['websocket'],
                    forceNew: true
                });

                client.on('connect', () => {
                    connectedCount++;
                    if (connectedCount === clientCount) {
                        clearTimeout(timeout);
                        expect(connectedCount).toBe(clientCount);
                        resolve();
                    }
                });

                clients.push(client);
            }
        });
    }, 10000);
});
