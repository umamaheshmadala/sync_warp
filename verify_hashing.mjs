// Verify JS hashing matches Postgres hashing
import { webcrypto } from 'node:crypto';

// Polyfill for Node.js environment
if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}

async function hashPhone(phone) {
    // Normalize: remove non-digits
    const normalized = phone.replace(/\D/g, '');

    // Hash: SHA-256
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
        original: phone,
        normalized,
        hash: hashHex
    };
}

async function run() {
    console.log('🔐 Verifying Hashing Logic...\n');

    const phones = [
        '+917000000001', // From your DB
        '917000000001',  // Normalized version
        '7000000001',    // Without country code
        '07000000001'    // With leading zero
    ];

    for (const p of phones) {
        const result = await hashPhone(p);
        console.log(`Phone: ${result.original}`);
        console.log(`Norm:  ${result.normalized}`);
        console.log(`Hash:  ${result.hash}`);
        console.log('---');
    }

    console.log('\n👉 Please compare these hashes with the "phone_hash" column in your database.');
}

run().catch(console.error);
