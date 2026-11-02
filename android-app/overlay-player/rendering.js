/* Rendering choices and compact alpha regions, shared with offline regression tests. */
(function (root) {
    'use strict';
    function qualityResolution(quality, dpr, width, height) {
        const native = Math.max(1, Number(dpr) || 1);
        const wanted = [1, Math.min(2, native), native, native * 2][quality] || native;
        // Bound color-buffer memory independently of the phone's display density.
        return Math.min(wanted, 2048 / Math.max(1, width, height));
    }
    function alphaRectangles(pixels, size) {
        const occupied = new Uint8Array(size * size), padded = new Uint8Array(size * size);
        for (let i = 0; i < occupied.length; i++) occupied[i] = pixels[i * 4 + 3] >= 24 ? 1 : 0;
        // One sample of tolerance accommodates breathing/hair without making a square touch target.
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            if (!occupied[y * size + x]) continue;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const px = x + dx, py = y + dy;
                if (px >= 0 && px < size && py >= 0 && py < size) padded[py * size + px] = 1;
            }
        }
        const result = []; let previous = new Map();
        for (let y = 0; y < size; y++) {
            const current = new Map();
            for (let x = 0; x < size;) {
                if (!padded[y * size + x]) { x++; continue; }
                const left = x;
                while (x < size && padded[y * size + x]) x++;
                const key = left + ':' + x;
                let rect = previous.get(key);
                if (rect) rect[3] = y + 1;
                else { rect = [left, y, x, y + 1]; result.push(rect); }
                current.set(key, rect);
            }
            previous = current;
        }
        return result.map(rect => rect.map(v => Math.round(v * 1024 / size)));
    }
    const api = {qualityResolution, alphaRectangles};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.AvatarRendering = api;
})(globalThis);
