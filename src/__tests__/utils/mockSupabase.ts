import { vi } from 'vitest';

/**
 * Mock Supabase Client Factory
 * Creates a fully mocked Supabase client for unit testing
 */
export function createMockSupabase() {
    return {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            like: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            contains: vi.fn().mockReturnThis(),
            containedBy: vi.fn().mockReturnThis(),
            rangeGt: vi.fn().mockReturnThis(),
            rangeGte: vi.fn().mockReturnThis(),
            rangeLt: vi.fn().mockReturnThis(),
            rangeLte: vi.fn().mockReturnThis(),
            rangeAdjacent: vi.fn().mockReturnThis(),
            overlaps: vi.fn().mockReturnThis(),
            textSearch: vi.fn().mockReturnThis(),
            match: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            filter: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            abortSignal: vi.fn().mockReturnThis(),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            csv: vi.fn(),
            geojson: vi.fn(),
            explain: vi.fn(),
            rollback: vi.fn(),
            returns: vi.fn(),
        })),

        rpc: vi.fn(),

        auth: {
            getUser: vi.fn(),
            getSession: vi.fn(),
            signUp: vi.fn(),
            signInWithPassword: vi.fn(),
            signInWithOAuth: vi.fn(),
            signOut: vi.fn(),
            resetPasswordForEmail: vi.fn(),
            updateUser: vi.fn(),
            setSession: vi.fn(),
            refreshSession: vi.fn(),
            onAuthStateChange: vi.fn(),
        },

        storage: {
            from: vi.fn(() => ({
                upload: vi.fn(),
                download: vi.fn(),
                list: vi.fn(),
                remove: vi.fn(),
                createSignedUrl: vi.fn(),
                createSignedUrls: vi.fn(),
                getPublicUrl: vi.fn(),
                move: vi.fn(),
                copy: vi.fn(),
            })),
        },

        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            send: vi.fn(),
        })),

        removeChannel: vi.fn(),
        removeAllChannels: vi.fn(),
        getChannels: vi.fn(),
    };
}

/**
 * Mock Supabase Response
 * Helper to create consistent mock responses
 */
export function mockSupabaseResponse<T>(data: T, error: any = null) {
    return {
        data,
        error,
        count: null,
        status: error ? 400 : 200,
        statusText: error ? 'Bad Request' : 'OK',
    };
}

/**
 * Mock Supabase Error
 * Helper to create consistent error responses
 */
export function mockSupabaseError(message: string, code?: string) {
    return {
        message,
        code: code || 'PGRST000',
        details: null,
        hint: null,
    };
}

/**
 * Mock Auth User
 * Helper to create mock authenticated user
 */
export function mockAuthUser(id: string = 'test-user-id', email: string = 'test@example.com') {
    return {
        id,
        email,
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        phone: null,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}
