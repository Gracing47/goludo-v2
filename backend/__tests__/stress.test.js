import { io as ioc } from 'socket.io-client';
import { server, io } from '../server.js';

describe('Stress Test - Multiple Connections', () => {
    const port = 3400 + Math.floor(Math.random() * 100);
    const clientCount = 20; // Test with 20 concurrent connections
    let clients = [];

    beforeAll((done) => {
        server.listen(port, () => {
            done();
        });
    });

    afterAll((done) => {
        clients.forEach(c => c.disconnect());
        io.close();
        server.close(() => {
            done();
        });
    });

    test(`should handle ${clientCount} concurrent connections`, (done) => {
        let connectedCount = 0;

        for (let i = 0; i < clientCount; i++) {
            const client = ioc(`http://localhost:${port}`, {
                transports: ['websocket'],
                forceNew: true
            });

            client.on('connect', () => {
                connectedCount++;
                if (connectedCount === clientCount) {
                    expect(connectedCount).toBe(clientCount);
                    done();
                }
            });

            clients.push(client);
        }
    }, 10000); // 10s timeout for stress test
});
