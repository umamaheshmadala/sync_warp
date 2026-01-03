/**
 * Error Handling Utilities
 * Story 9.4.5: Error Handling & Retry Logic
 * 
 * Provides retry logic with exponential backoff, circuit breaker pattern,
 * and user-friendly error messages for robust error handling.
 */

/**
 * Custom error class for errors that should be retried
 */
export class RetryableError extends Error {
    constructor(message: string, public retryAfter?: number) {
        super(message);
        this.name = 'RetryableError';
    }
}

/**
 * Retry options configuration
 */
interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
}

/**
 * Execute a function with automatic retry on failure
 * Uses exponential backoff with jitter to prevent thundering herd
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000,
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't retry if this is the last attempt
            if (attempt === maxRetries) break;

            // Exponential backoff with jitter
            // delay = baseDelay * 2^attempt + random(0-1000ms)
            const exponentialDelay = baseDelay * Math.pow(2, attempt);
            const jitter = Math.random() * 1000;
            const delay = Math.min(exponentialDelay + jitter, maxDelay);

            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying after ${Math.round(delay)}ms...`);
            console.error(`[Retry] Error:`, error);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    console.error(`[Retry] All ${maxRetries + 1} attempts failed`);
    throw lastError!;
}

/**
 * Circuit breaker states
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by stopping requests to failing services
 */
class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private state: CircuitState = 'CLOSED';

    constructor(
        private threshold = 5,
        private timeout = 60000 // 60 seconds
    ) { }

    /**
     * Execute a function through the circuit breaker
     * 
     * @param fn - The async function to execute
     * @returns Promise resolving to the function result
     * @throws Error if circuit is open or function fails
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if circuit is open
        if (this.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;

            if (timeSinceLastFailure > this.timeout) {
                // Try to recover - move to half-open state
                console.log('[CircuitBreaker] Moving to HALF_OPEN state, attempting recovery...');
                this.state = 'HALF_OPEN';
            } else {
                const waitTime = Math.round((this.timeout - timeSinceLastFailure) / 1000);
                throw new Error(`Circuit breaker is OPEN. Service unavailable. Try again in ${waitTime}s.`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Handle successful execution
     */
    private onSuccess() {
        if (this.state === 'HALF_OPEN') {
            console.log('[CircuitBreaker] Recovery successful, moving to CLOSED state');
        }
        this.failures = 0;
        this.state = 'CLOSED';
    }

    /**
     * Handle failed execution
     */
    private onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            console.error(`[CircuitBreaker] Threshold reached (${this.failures}/${this.threshold}). Opening circuit.`);
            this.state = 'OPEN';
        } else {
            console.warn(`[CircuitBreaker] Failure ${this.failures}/${this.threshold}`);
        }
    }

    /**
     * Get current circuit breaker state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Reset the circuit breaker to closed state
     */
    reset() {
        this.failures = 0;
        this.lastFailureTime = 0;
        this.state = 'CLOSED';
        console.log('[CircuitBreaker] Circuit breaker reset to CLOSED state');
    }
}

/**
 * Circuit breaker instance for friend operations
 */
export const friendsCircuitBreaker = new CircuitBreaker(5, 60000);

/**
 * Map technical errors to user-friendly messages
 */
export function getUserFriendlyErrorMessage(error: any): string {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code;

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch failed')) {
        return 'Connection issue. Please check your internet connection and try again.';
    }

    // Rate limiting
    if (errorCode === '429' || errorMessage.includes('rate limit')) {
        return 'Too many requests. Please wait a moment and try again.';
    }

    // Authentication errors
    if (errorCode === '401' || errorMessage.includes('unauthorized')) {
        return 'Session expired. Please log in again.';
    }

    // Permission errors
    if (errorCode === '403' || errorMessage.includes('forbidden')) {
        return 'You don\'t have permission to perform this action.';
    }

    // Not found errors
    if (errorCode === '404' || errorMessage.includes('not found')) {
        return 'The requested resource was not found.';
    }

    // Server errors
    if (errorCode?.toString().startsWith('5') || errorMessage.includes('server error')) {
        return 'Service temporarily unavailable. Please try again in a moment.';
    }

    // Circuit breaker
    if (errorMessage.includes('circuit breaker')) {
        return 'Service is temporarily unavailable. We\'re working to restore it.';
    }

    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('postgres')) {
        return 'Unable to complete the request. Please try again.';
    }

    // Timeout errors
    if (errorMessage.includes('timeout')) {
        return 'Request timed out. Please check your connection and try again.';
    }

    // Default fallback
    return 'Something went wrong. Please try again.';
}

/**
 * Log error with context for debugging
 */
export function logError(context: string, error: any, additionalData?: any) {
    console.error(`[Error] ${context}:`, {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        ...additionalData,
    });
}
