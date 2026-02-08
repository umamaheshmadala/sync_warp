
import { describe, it, expect } from 'vitest';
import { isSensitiveField, SENSITIVE_FIELDS, INSTANT_UPDATE_FIELDS } from './businessEditService';

describe('businessEditService', () => {
    describe('isSensitiveField', () => {
        it('should return true for sensitive fields', () => {
            SENSITIVE_FIELDS.forEach(field => {
                expect(isSensitiveField(field)).toBe(true);
            });
        });

        it('should return false for instant update fields', () => {
            INSTANT_UPDATE_FIELDS.forEach(field => {
                expect(isSensitiveField(field)).toBe(false);
            });
        });

        it('should return false for unknown fields', () => {
            expect(isSensitiveField('random_field')).toBe(false);
            expect(isSensitiveField('')).toBe(false);
        });
    });
});
