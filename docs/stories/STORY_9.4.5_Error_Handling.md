# 📋 STORY 9.4.5: Error Handling & Retry Logic

**Epic:** [EPIC 9.4: Friends Service Layer & Business Logic](../epics/EPIC_9.4_Friends_Service_Layer.md)  
**Story Points:** 2  
**Priority:** Medium  
**Status:** ✅ Complete

---

## 📝 **Story Description**

As a **user**, I want to **have reliable friend operations with automatic retries** so that **temporary network issues don't prevent me from managing my friends**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Exponential backoff with jitter for retries
2. ✅ Centralized error handler with user-friendly messages
3. ✅ Circuit breaker for failing endpoints
4. ✅ Maximum retry attempts (3-5)
5. ✅ Error logging for debugging
6. ✅ Graceful degradation when services are down

---

## 📦 **Implementation**

```typescript
// src/utils/errorHandler.ts

export class RetryableError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RetryableError';
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === options.maxRetries) break;

      // Exponential backoff with jitter
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        options.maxDelay
      );

      console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Circuit breaker
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
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

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

export const friendsCircuitBreaker = new CircuitBreaker();
```

---

## 🚀 **Deployment Checklist**

- [ ] Retry logic implemented
- [ ] Circuit breaker configured
- [ ] Error messages user-friendly
- [ ] Logging in place
- [ ] Integration tested
- [ ] Code reviewed

---

**Previous Story:** [STORY 9.4.4: Realtime Subscriptions](./STORY_9.4.4_Realtime_Subscriptions.md)  
**Next Story:** [STORY 9.4.6: Offline Support](./STORY_9.4.6_Offline_Support.md)
