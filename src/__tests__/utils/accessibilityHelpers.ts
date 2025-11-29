/**
 * Accessibility Testing Utilities
 * Story 9.8.3: Component Tests - Friends UI
 * 
 * Utilities for accessibility testing with jest-axe
 */

import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

// Extend Vitest matchers with jest-axe
expect.extend(toHaveNoViolations);

/**
 * Run accessibility tests on a container
 */
export async function testAccessibility(container: HTMLElement) {
    const results = await axe(container);
    expect(results).toHaveNoViolations();
}

/**
 * Run accessibility tests with custom rules
 */
export async function testAccessibilityWithRules(
    container: HTMLElement,
    rules: Record<string, { enabled: boolean }>
) {
    const results = await axe(container, { rules });
    expect(results).toHaveNoViolations();
}

/**
 * Test keyboard navigation
 */
export function testKeyboardNavigation(element: HTMLElement, key: string) {
    const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
    });
    element.dispatchEvent(event);
}

/**
 * Test focus management
 */
export function testFocusManagement(element: HTMLElement) {
    element.focus();
    expect(document.activeElement).toBe(element);
}

/**
 * Test ARIA attributes
 */
export function testAriaAttributes(
    element: HTMLElement,
    attributes: Record<string, string>
) {
    Object.entries(attributes).forEach(([attr, value]) => {
        expect(element.getAttribute(attr)).toBe(value);
    });
}

/**
 * Test role attribute
 */
export function testRole(element: HTMLElement, role: string) {
    expect(element.getAttribute('role')).toBe(role);
}

/**
 * Common accessibility test suite
 */
export async function runCommonA11yTests(container: HTMLElement) {
    // Test for violations
    await testAccessibility(container);

    // Test for proper heading structure
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
        // Ensure headings are in order
        let lastLevel = 0;
        headings.forEach((heading) => {
            const level = parseInt(heading.tagName[1]);
            if (lastLevel > 0) {
                expect(level).toBeLessThanOrEqual(lastLevel + 1);
            }
            lastLevel = level;
        });
    }

    // Test for alt text on images
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
        expect(img.getAttribute('alt')).toBeDefined();
    });

    // Test for labels on inputs
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
        const id = input.getAttribute('id');
        if (id) {
            const label = container.querySelector(`label[for="${id}"]`);
            const ariaLabel = input.getAttribute('aria-label');
            const ariaLabelledBy = input.getAttribute('aria-labelledby');
            
            expect(
                label || ariaLabel || ariaLabelledBy
            ).toBeTruthy();
        }
    });
}
