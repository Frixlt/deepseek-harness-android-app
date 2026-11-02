/* App-owned player. User model and licensed SDK libraries remain outside the APK/repository. */
'use strict';
(async function () {
    const query = new URLSearchParams(location.search);
    const base = new URL(query.get('base') || './', location.href).href;
    const modelPath = query.get('model') || 'model/大肥鱼.model3.json';
    let app, model, core, active = true, state = 'idle', pose = query.get('pose') === 'standing' ? 'standing' : 'chibi';
    let clock = 0, tapUntil = 0, bounds, coreParams;
    let frameDelta = 33;
    let quality = Math.max(0, Math.min(3, Number(query.get('quality') ?? 2) || 0));
    let hitMaskTimer, hitMaskDirty = true, hitRectangles = [];
    function scheduleHitMask(delay = 120) {
        hitMaskDirty = true;
        clearTimeout(hitMaskTimer);
        if (!app || !model || !bounds || !active || document.hidden) return;
        hitMaskTimer = setTimeout(publishHitMask, delay);
    }
    function publishHitMask() {
        if (!app || !model || !bounds || !active || document.hidden) return;
        const size = 128;
        const saved = {x: model.x, y: model.y, sx: model.scale.x, sy: model.scale.y};
        const viewportW = app.screen.width, viewportH = app.screen.height;
        const rt = PIXI.RenderTexture.create({width: size, height: size, resolution: 1});
        try {
            model.scale.set(saved.sx * size / viewportW, saved.sy * size / viewportH);
            model.position.set(saved.x * size / viewportW, saved.y * size / viewportH);
            app.renderer.render(model, {renderTexture: rt});
            hitRectangles = AvatarRendering.alphaRectangles(app.renderer.extract.pixels(rt), size);
            if (hitRectangles.length) console.log('AVATAR_MASK:' + JSON.stringify(hitRectangles));
            hitMaskDirty = false;
        } finally {
            model.position.set(saved.x, saved.y);
            model.scale.set(saved.sx, saved.sy);
            rt.destroy(true);
        }
    }
    window.setAvatarQuality = function (next) {
        next = Math.max(0, Math.min(3, Math.round(Number(next) || 0)));
        if (quality === next) return;
        quality = next;
        if (app && bounds) fit();
    };

    const expressions = {
        idle: {ParamMouthForm: 0.2},
        thinking: {key8: 1, ParamAngleZ: -6, ParamEyeBallX: 0.3, Movement2: 0.7},
        responding: {ParamMouthForm: 0.7, Movement3: 0.8},
        searching: {key12: 1, ParamAngleZ: -4, Movement3: 1},
        reading: {key11: 1, ParamEyeBallY: -0.3, Movement2: 0.7},
        writing: {key12: 1, ParamAngleZ: 4, Movement3: 0.7},
        browsing: {key12: 1, ParamEyeBallX: -0.25, Movement3: 1},
        watching: {ParamEyeBallY: 0.25, Movement2: 0.7},
        terminal: {key6: 1, Movement3: 1, ParamMouthForm: 0.35},
        tool: {key12: 1, Movement3: 1},
        connecting: {key8: 1, ParamAngleZ: -3},
        ask: {ParamAngleZ: 9, Movement3: 1, ParamMouthForm: 0.2},
        done: {key4: 1, key7: 0.65, Movement2: 1, ParamMouthForm: 0.8},
        ended: {key7: 0.5, Movement2: 1, ParamAngleZ: -5, ParamMouthForm: 0.5},
        error: {key5: 1, key13: 1, Movement2: 1, ParamMouthForm: -0.5},
        paused: {ParamAngleZ: -7, Movement2: 0.6},
        sleepy: {ParamEyeLOpen: 0.35, ParamEyeROpen: 0.35, ParamAngleZ: -8},
        offline: {ParamEyeLOpen: 0.55, ParamEyeROpen: 0.55, key13: 0.5, ParamMouthForm: -0.2}
    };
    const controlled = new Set(Object.values(expressions).flatMap(Object.keys).concat([
        'Clothes2', 'Param140', 'ParamBreath', 'ParamAngleX', 'ParamBodyAngleZ', 'ParamMouthOpenY',
        'ParamEyeLOpen', 'ParamEyeROpen', 'Movement1', 'Movement2', 'Movement3', 'key7'
    ]));
    let target = expressions.idle;
    function set(id, value) {
        const p = coreParams.get(id);
        if (p) core.setParameterValueById(id, Math.max(p.min, Math.min(p.max, value)));
    }
    // APIs exist before async loading: native updates cannot get lost during startup.
    window.setLive2DEmotion = function (next) {
        const changed = next !== state;
        state = Object.hasOwn(expressions, next) ? next : 'idle';
        target = expressions[state];
        if (changed) scheduleHitMask(450);
    };
    window.triggerLive2DTap = function () { tapUntil = clock + 1.2; scheduleHitMask(350); };
    window.setAvatarVisible = function (visible) {
        active = !!visible;
        clearTimeout(hitMaskTimer);
        if (active && hitMaskDirty) scheduleHitMask();
        if (app) { if (active && !document.hidden) app.start(); else app.stop(); }
    };
    document.addEventListener('visibilitychange', () => window.setAvatarVisible(active));
    function loadScript(name) {
        return new Promise((resolve, reject) => {
            const el = document.createElement('script');
            el.src = new URL(name, base).href;
            el.onload = resolve;
            el.onerror = () => reject(new Error('Cannot load ' + name));
            document.head.appendChild(el);
        });
    }
    function fit(width, height) {
        if (!bounds || !app) return;
        const w = typeof width === "number" ? width : innerWidth;
        const h = typeof height === "number" ? height : innerHeight;
        if (w < 1 || h < 1) return;
        app.renderer.resolution = AvatarRendering.qualityResolution(quality, devicePixelRatio, w, h);
        app.renderer.resize(w, h);
        // Fit visible pixels with space for hats, fingers and secondary physics.
        const scale = Math.min(w * 0.90 / bounds.width, h * 0.90 / bounds.height);
        model.scale.set(scale);
        model.position.set(w / 2 - bounds.cx * scale, h / 2 - bounds.cy * scale);
        scheduleHitMask();
    }
    function measure() {
        // Read alpha ONCE per pose, at a bounded resolution. No GPU readback per frame.
        const size = 512, internal = model.internalModel;
        const scale = Math.min(size / internal.originalWidth, size / internal.originalHeight) * 0.8;
        model.anchor.set(0);
        model.scale.set(scale);
        model.position.set((size - internal.originalWidth * scale) / 2,
            (size - internal.originalHeight * scale) / 2);
        const origin = {x: model.x, y: model.y};
        const rt = PIXI.RenderTexture.create({width: size, height: size, resolution: 1});
        try {
            app.renderer.render(model, {renderTexture: rt});
            const pixels = app.renderer.extract.pixels(rt);
            let left = size, top = size, right = -1, bottom = -1;
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                if (pixels[(y * size + x) * 4 + 3] > 12) {
                    left = Math.min(left, x); right = Math.max(right, x);
                    top = Math.min(top, y); bottom = Math.max(bottom, y);
                }
            }
            if (right < left || bottom < top) throw new Error('Model rendered no visible pixels');
            if (left === 0 || top === 0 || right === size - 1 || bottom === size - 1)
                throw new Error('Model exceeds calibration canvas');
            bounds = {width: (right - left + 3) / scale, height: (bottom - top + 3) / scale,
                cx: ((left + right) / 2 - origin.x) / scale,
                cy: ((top + bottom) / 2 - origin.y) / scale};
        } finally { rt.destroy(true); }
        console.log('AVATAR_ASPECT:' + (bounds.width / bounds.height));
        fit();
    }
    function animate(delta) {
        clock += Math.min(delta, 50) / 1000;
        const smoothing = 1 - Math.exp(-Math.min(delta, 50) / 140);
        const blink = Math.max(0, 1 - Math.abs((clock % 4.7) - 4.45) / 0.11);
        for (const id of controlled) {
            const param = coreParams.get(id);
            if (!param) continue;
            let value = target[id] === undefined ? param.default : target[id];
            if (id === 'Clothes2') value = pose === 'chibi' ? 1 : 0;
            if (id === 'Param140' && target.key8) value = param.min + (param.max - param.min) * ((clock * 0.9) % 1);
            if (id === 'ParamBreath') value = (Math.sin(clock * 1.7) + 1) / 2;
            if (id === 'ParamAngleX') value += Math.sin(clock * 0.8) * 2;
            if (id === 'ParamBodyAngleZ') value += Math.sin(clock * 1.1) * 1.2;
            if (id === 'ParamEyeLOpen' || id === 'ParamEyeROpen') value *= 1 - blink;
            if (id === 'ParamMouthOpenY' && state === 'responding') value = 0.15 + (Math.sin(clock * 9) + 1) * 0.15;
            if (tapUntil > clock) {
                if (id === 'key7') value = 0.85;
                if (id === 'Movement2') value = 1;
                if (id === 'ParamMouthForm') value = 0.8;
            }
            const next = (id === 'Clothes2' || id === 'Param140') ? value : param.value + (value - param.value) * smoothing;
            param.value = next;
            set(id, next);
        }
    }
    try {
        await loadScript('live2dcubismcore.min.js');
        await loadScript('pixi.min.js');
        await loadScript('cubism4.min.js');
        app = new PIXI.Application({view: document.getElementById('canvas'), transparent: true,
            backgroundAlpha: 0, autoDensity: true, resolution: AvatarRendering.qualityResolution(quality, devicePixelRatio, innerWidth, innerHeight),
            autoStart: false, antialias: true});
        app.ticker.maxFPS = 30;
        model = await PIXI.live2d.Live2DModel.from(new URL(modelPath, base).href,
            {autoInteract: false, autoUpdate: false});
        app.stage.addChild(model);
        core = model.internalModel.coreModel;
        const params = core._model.parameters;
        coreParams = new Map(Array.from(params.ids, (id, i) => [id, {
            min: params.minimumValues[i], max: params.maximumValues[i],
            default: params.defaultValues[i], value: params.defaultValues[i]
        }]));
        // Persist controls before physics; facial controls are applied again before drawing.
        model.internalModel.on('afterMotionUpdate', () => animate(frameDelta));
        model.internalModel.on('beforeModelUpdate', () => {
            for (const id of controlled) { const p = coreParams.get(id); if (p) set(id, p.value); }
        });
        app.ticker.add(() => { frameDelta = app.ticker.deltaMS; model.update(frameDelta); });
        set('Clothes2', pose === 'chibi' ? 1 : 0);
        function settlePose() {
            // Advance the CPU rig without submitting 60 expensive GPU frames to a mobile WebView.
            model.deltaTime = 0;
            for (let i = 0; i < 60; i++) model.internalModel.update(33, model.elapsedTime += 33);
            measure();
        }
        settlePose();
        window.addEventListener('resize', fit);
        window.resizeAvatar = fit;
        window.setAvatarPose = function (next) {
            if (next === pose) return;
            pose = next === 'chibi' ? 'chibi' : 'standing';
            set('Clothes2', pose === 'chibi' ? 1 : 0);
            settlePose();
        };
        // Compact diagnostics used by offline rendering regression tests.
        window.avatarDiagnostics = () => ({state, pose, quality, hitRectangles, bounds,
            loadingAnimation: {active: !!target.key8, phase: coreParams.get('Param140') ? coreParams.get('Param140').value : 0}, fps: app.ticker.maxFPS,
            viewport: {width: app.screen.width, height: app.screen.height},
            running: app.ticker.started, resolution: app.renderer.resolution});
        window.setAvatarVisible(active);
        console.log('AVATAR_READY');
    } catch (error) {
        if (app) app.stop();
        console.error('AVATAR_ERROR:' + error.message);
    }
    window.addEventListener('pagehide', () => {
        clearTimeout(hitMaskTimer);
        if (app) { app.stop(); app.destroy(false, {children: true, texture: true, baseTexture: true}); }
    }, {once: true});
})();
