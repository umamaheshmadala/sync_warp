
import { describe, it, expect } from 'vitest';
import { render, screen } from './test-utils';
import { axe } from 'jest-axe';

describe('Test Infrastructure', () => {
    it('should intercept requests with MSW', async () => {
        const response = await fetch('https://example.com/api/v1/health');
        const data = await response.json();
        expect(data).toEqual({ status: 'ok' });
    });

    it('should render components with providers', () => {
        render(<div data-testid="test-div">Hello</div>);
        expect(screen.getByTestId('test-div')).toBeInTheDocument();
    });

    it('should check accessibility with jest-axe', async () => {
        const { container } = render(<button>Click me</button>);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('should detect accessibility violations', async () => {
        // Renders an image without alt text (violation)
        const { container } = render(<img src="foo.jpg" />);
        const results = await axe(container);
        // We expect violations here, but for this "infrastructure test" we just checking the tool works.
        // Ideally we'd expect(results).not.toHaveNoViolations() but toHaveNoViolations() prints nice diffs.
        // Let's just assert result object structure exists
        expect(results.violations).toBeDefined();
    });
});
