import { PrismaClient } from '@prisma/client';

async function main() {
    console.log('--- DIAGNOSTIC START ---');
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

    try {
        console.log('Attempting standard init: new PrismaClient()');
        const p1 = new PrismaClient();
        console.log('p1 created successfully');
        await p1.$connect();
        console.log('p1 connected successfully');
    } catch (e: any) {
        console.error('p1 failed:', e.message);
    }

    try {
        console.log('Attempting v7 datasourceUrl init');
        // @ts-ignore
        const p2 = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
        console.log('p2 created successfully');
    } catch (e: any) {
        console.error('p2 failed:', e.message);
    }

    console.log('--- DIAGNOSTIC END ---');
}

main();
