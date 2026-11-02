const assert = require('node:assert/strict');
const {qualityResolution, alphaRectangles} = require('../../android-app/overlay-player/rendering.js');
assert.equal(qualityResolution(0, 3.5, 115, 115), 1);
assert.equal(qualityResolution(1, 3.5, 115, 115), 2);
assert.equal(qualityResolution(2, 3.5, 115, 115), 3.5);
assert.equal(qualityResolution(3, 3.5, 115, 115), 7);
assert(qualityResolution(3, 4, 360, 360) * 360 <= 2048);
const size = 16, pixels = new Uint8Array(size * size * 4);
// Two opaque limbs separated by a transparent gap. A rectangular window would catch the gap.
for (let y = 3; y < 13; y++) for (const x of [4, 5, 10, 11]) pixels[(y * size + x) * 4 + 3] = 255;
const rects = alphaRectangles(pixels, size);
const hit = (x, y) => rects.some(r => x * 1024 / size >= r[0] && y * 1024 / size >= r[1]
    && x * 1024 / size < r[2] && y * 1024 / size < r[3]);
assert(hit(4, 6)); assert(hit(11, 6));
assert(!hit(8, 6), 'Transparent gaps must pass touches through');
assert(!hit(0, 0)); assert(!hit(15, 15));
assert.deepEqual(alphaRectangles(new Uint8Array(size * size * 4), size), []);
console.log('Avatar quality and silhouette regions: PASS');
