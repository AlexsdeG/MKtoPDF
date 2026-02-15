// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderMathInContainer } from '../lib/markdownEngine';

// Mock everything that is not JSDOM supported if needed
// Katex auto-render might need some globals

describe('renderMathInContainer', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container); // attach to document for some selectors to work if needed
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('should render inline math from code.math-inline', async () => {
        // Setup mock structure from remark-math
        const code = document.createElement('code');
        code.className = 'language-math math-inline';
        code.textContent = 'E=mc^2';
        container.appendChild(code);

        // Run
        await renderMathInContainer(container);

        // Check if code block is replaced by span with katex class
        const span = container.querySelector('span.katex');
        expect(span).toBeTruthy();
        expect(span?.textContent).toContain('E'); // Katex renders accessibly with text content
    });

    it('should render display math from code.math-display', async () => {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.className = 'language-math math-display';
        code.textContent = '\\sum i';
        pre.appendChild(code);
        container.appendChild(pre);

        await renderMathInContainer(container);

        const div = container.querySelector('div.katex-display');
        expect(div).toBeTruthy();
    });

    it('should handle auto-render delimiters in text', async () => {
        container.innerHTML = "Hello $x^2$ world";
        await renderMathInContainer(container);

        // Auto-render should replace $x^2$ with katex span
        const span = container.querySelector('span.katex');
        expect(span).toBeTruthy();
    });
});
