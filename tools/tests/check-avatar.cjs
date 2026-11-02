// Requires Playwright in NODE_PATH and a private model package prepared by prepare-avatar.py.
// Usage: node tools/tests/check-avatar.cjs /path/to/private/package [/path/to/screenshots]
const {chromium} = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
(async () => {
    const modelDir = path.resolve(process.argv[2]);
    const output = process.argv[3] || await fs.mkdtemp(path.join(os.tmpdir(), 'avatar-check-'));
    await fs.mkdir(output, {recursive: true});
    const playerDir = path.resolve(__dirname, '../../android-app/overlay-player');
    const server = http.createServer(async (req, res) => {
        try {
            const route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
            const privateFile = route.startsWith('/private/');
            const root = privateFile ? modelDir : playerDir;
            const filename = path.resolve(root, '.' + (privateFile ? route.slice('/private'.length) : route));
            if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
            const data = await fs.readFile(filename);
            res.setHeader('Content-Type', filename.endsWith('.js') ? 'application/javascript' : filename.endsWith('.html') ? 'text/html' : 'application/octet-stream');
            res.end(data);
        } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({headless: true, executablePath: process.env.AVATAR_BROWSER || undefined,
            args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
        const page = await browser.newPage({viewport: {width: 512, height: 512}, deviceScaleFactor: 3.5});
        const failures = [];
        page.on('pageerror', e => failures.push(e.message));
        page.on('console', m => { if (m.text().startsWith('AVATAR_ERROR:')) failures.push(m.text()); });
        const base = `http://127.0.0.1:${server.address().port}/`;
        const model = (await fs.readdir(path.join(modelDir, 'model'))).find(n => n.endsWith('.model3.json'));
        await page.goto(base + 'index.html?base=' + encodeURIComponent(base + 'private/') + '&model=' + encodeURIComponent('model/' + model));
        await page.waitForFunction(() => window.avatarDiagnostics, {timeout: 60000});
        const diagnostics = await page.evaluate(() => avatarDiagnostics());
        if (diagnostics.resolution !== 3.5 || diagnostics.fps > 30) throw new Error('Invalid model/performance settings');
        for (const pose of ['chibi', 'standing']) {
            await page.evaluate(v => setAvatarPose(v), pose);
            const shape = await page.evaluate(() => avatarDiagnostics().bounds);
            await page.setViewportSize({width: Math.round(512 * shape.width / shape.height), height: 512});
            await page.waitForTimeout(450);
            await page.screenshot({path: path.join(output, pose + '.png'), omitBackground: true});
        }
        await page.evaluate(() => setAvatarPose('chibi'));
        await page.setViewportSize({width:512,height:512});
        for (const [quality, expected] of [[0, 1], [1, 2], [2, 3.5], [3, 4]]) {
            await page.evaluate(v => setAvatarQuality(v), quality);
            const d = await page.evaluate(() => avatarDiagnostics());
            // 512 css pixels: the maximum level is bounded by the 2048px buffer limit.
            if (d.resolution !== expected) throw new Error('Quality resolution mismatch: ' + JSON.stringify(d));
        }
        await page.evaluate(() => setAvatarQuality(2));
        await page.waitForTimeout(500);
        const mask = await page.evaluate(() => avatarDiagnostics().hitRectangles);
        if (!mask.length) throw new Error('Missing alpha touch mask');
        const hit = (x,y) => mask.some(r => x >= r[0] && y >= r[1] && x < r[2] && y < r[3]);
        if (hit(0,0) || hit(1023,1023) || !hit(512,400)) throw new Error('Invalid silhouette mask');

        for (const state of ['idle', 'thinking', 'responding', 'searching', 'reading', 'writing', 'browsing',
            'watching', 'terminal', 'ask', 'done', 'error', 'paused', 'sleepy', 'ended', 'offline']) {
            await page.evaluate(v => setLive2DEmotion(v), state);
            await page.waitForTimeout(450);
            await page.screenshot({path: path.join(output, 'state-' + state + '.png'), omitBackground: true});
            if (await page.evaluate(() => avatarDiagnostics().state) !== state) throw new Error('Lost state: ' + state);
            if (state === 'thinking') {
                const before = await page.evaluate(() => avatarDiagnostics().loadingAnimation.phase);
                await page.waitForTimeout(180);
                const after = await page.evaluate(() => avatarDiagnostics().loadingAnimation.phase);
                if (before === after) throw new Error('Thinking indicator is static');
            }

        }
        await page.evaluate(() => { setLive2DEmotion('thinking'); triggerLive2DTap(); });
        await page.waitForTimeout(1400);
        if (await page.evaluate(() => avatarDiagnostics().state) !== 'thinking') throw new Error('Tap lost working state');
        await page.evaluate(() => setLive2DEmotion('idle'));
        for (const size of [40, 80, 140, 160, 240, 360]) {
            await page.setViewportSize({width: size, height: size});
            await page.waitForTimeout(200);
            await page.screenshot({path: path.join(output, 'size-' + size + '.png'), omitBackground: true});
        }
        await page.evaluate(() => setAvatarVisible(false));
        if (await page.evaluate(() => avatarDiagnostics().running)) throw new Error('Hidden player still animates');
        await page.evaluate(() => { setLive2DEmotion('error'); setAvatarVisible(true); });
        if (!await page.evaluate(() => avatarDiagnostics().running)) throw new Error('Player did not resume');
        if (failures.length) throw new Error(failures.join('\n'));
        console.log('PASS: 2 native body modes, 16 states, 6 sizes at DPR 3.5, 4 quality levels, alpha hit regions, animated thinking, tap, pause/resume. Screenshots: ' + output);
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
