/* App-owned player. User model and licensed SDK libraries remain outside the APK/repository. */
'use strict';
(async function () {
    const query = new URLSearchParams(location.search);
    const base = new URL(query.get('base') || './', location.href).href;
    const modelPath = query.get('model') || 'model/大肥鱼.model3.json';
    let app, model, core, active = true, state = 'idle', pose = query.get('pose') === 'standing' ? 'standing' : 'chibi';
    let clock = 0, tapStart = 0, tapUntil = 0, bounds, coreParams, hasPhysicsRig = false, settling = true;
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
        idle: {ParamMouthForm: 0.25, EyeSmile: 0.25},
        thinking: {key8: 1, Movement2: 0.85, ParamMouthForm: -0.05},
        responding: {Movement3: 0.85, ParamMouthForm: 0.65, EyeSmile: 0.55},
        searching: {key12: 1, Movement3: 1, ParamMouthForm: 0.15},
        reading: {key11: 1, Movement2: 0.8, ParamMouthForm: 0.2},
        writing: {key12: 1, Movement3: 0.8, ParamMouthForm: 0.25},
        browsing: {key12: 1, Movement3: 1, ParamMouthForm: 0.2},
        watching: {ParamMouthForm: 0.25, ParamBrowLY: 0.35, ParamBrowRY: 0.35},
        terminal: {key6: 1, key9: 0.35, Movement3: 1, ParamMouthForm: 0.4},
        tool: {key12: 1, Movement3: 1, ParamMouthForm: 0.3},
        connecting: {key8: 1, ParamMouthForm: 0.1},
        ask: {Movement3: 0.9, ParamMouthForm: 0.25, EyeSmile: 0.35, ParamBrowLY: 0.45, ParamBrowRY: 0.45},
        done: {key4: 1, key7: 0.75, Movement2: 1, ParamMouthForm: 0.85, EyeSmile: 0.7},
        ended: {key7: 0.5, Movement2: 1, ParamMouthForm: 0.55, EyeSmile: 0.5},
        error: {key5: 1, key13: 1, Movement2: 1, ParamMouthForm: -0.55, ParamBrowLY: -0.5, ParamBrowRY: -0.5},
        paused: {Movement2: 0.6, ParamEyeLOpen: 0.85, ParamEyeROpen: 0.85, ParamMouthForm: 0.1},
        sleepy: {ParamEyeLOpen: 0.3, ParamEyeROpen: 0.3, ParamMouthForm: -0.1, ParamBrowLY: -0.2, ParamBrowRY: -0.2},
        offline: {ParamEyeLOpen: 0.5, ParamEyeROpen: 0.5, key13: 0.5, ParamMouthForm: -0.2}
    };
    // Physics outputs computed by physics3.json when AngleX..PositionZ inputs exist; never stomp them.
    const physicsOutputs = new Set([
        'ParamAngleX', 'ParamAngleY', 'ParamAngleZ',
        'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ'
    ]);
    const instantParams = new Set(['Clothes2', 'Param11', 'Param140', 'SweatBurst1', 'SweatBurst2', 'SweatBurst3', 'SweatBurst4', 'ShockR', 'ShockL']);
    const controlled = new Set(Object.values(expressions).flatMap(Object.keys).concat([
        'Clothes2', 'Param11', 'Param140', 'ParamBreath', 'LeanInput',
        'AngleX', 'AngleY', 'AngleZ', 'PositionX', 'PositionY', 'PositionZ',
        'LControl', 'RControl',
        'ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ',
        'ParamMouthOpenY', 'JawOpen', 'ParamEyeLOpen', 'ParamEyeROpen', 'EyeSmile',
        'ParamEyeBallX', 'ParamEyeBallY', 'ParamBrowLY', 'ParamBrowRY', 'ParamBrowLAngle', 'ParamBrowRAngle',
        'Movement1', 'Movement2', 'Movement3',
        'key1', 'key2', 'key3', 'key4', 'key5', 'key6', 'key7', 'key8', 'key9', 'key11', 'key12', 'key13',
        'Param55', 'Param56', 'Param57', 'Param58', 'Startwinkle', 'Startwinkle2',
        'Param31', 'Param32', 'KiraA', 'KiraB', 'KiraC', 'KiraD',
        'SweatBurst1', 'SweatBurst2', 'SweatBurst3', 'SweatBurst4', 'Sweat1', 'Sweat2',
        'ShockR', 'ShockL', 'Param138', 'AniEyerolling'
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
    window.triggerLive2DTap = function () {
        tapStart = clock;
        tapUntil = clock + 1.4;
        scheduleHitMask(350);
    };
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

    function computeStateOverrides(t) {
        const o = {AngleX: 0, AngleY: 0, AngleZ: 0, PositionX: 0, PositionY: 0, PositionZ: 0, LeanInput: 0};
        // Organic gentle base motion + occasional curious ear twitch
        const twitchPhase = t % 4.6;
        const earTwitch = twitchPhase > 4.2 ? Math.sin(((twitchPhase - 4.2) / 0.4) * Math.PI) * 0.55 : 0;
        o.LControl = earTwitch;
        o.RControl = earTwitch * 0.85;

        // Soft ambient tail glow cycles (like IDLE.motion3.json Param55..58)
        const glowMul = (state === 'done' || state === 'terminal' || state === 'responding') ? 1.8 : 1.0;
        o.Param55 = (Math.sin(t * 1.1 * glowMul) + 1) * 0.5;
        o.Param56 = (Math.sin(t * 1.1 * glowMul + 1.57) + 1) * 0.5;
        o.Param58 = (Math.sin(t * 1.1 * glowMul + 3.14) + 1) * 0.5;
        o.Param57 = (Math.sin(t * 1.1 * glowMul + 4.71) + 1) * 0.5;
        o.Startwinkle = Math.sin(t * 3.8) * 0.4;
        o.Startwinkle2 = Math.cos(t * 4.4) * 0.4;
        o.Param32 = Math.sin(t * 5.2) * 0.15;

        switch (state) {
            case 'idle': {
                o.AngleX = Math.sin(t * 0.65) * 4.5 + Math.sin(t * 0.27) * 2.0;
                o.AngleY = Math.sin(t * 0.48) * 3.0;
                o.AngleZ = Math.sin(t * 0.52) * 4.2;
                o.PositionX = Math.sin(t * 0.41) * 1.6;
                o.PositionY = Math.sin(t * 0.95) * 1.1;
                const glanceCycle = t % 5.5;
                if (glanceCycle > 3.6) {
                    const g = Math.sin(((glanceCycle - 3.6) / 1.9) * Math.PI);
                    o.ParamEyeBallX = Math.sin(t * 0.7) >= 0 ? 0.35 * g : -0.35 * g;
                    o.ParamEyeBallY = 0.1 * g;
                }
                break;
            }
            case 'thinking': {
                o.AngleX = Math.sin(t * 0.85) * 4.2;
                o.AngleY = 5.0 + Math.sin(t * 0.95) * 2.8;
                o.AngleZ = -7.5 + Math.sin(t * 1.35) * 4.2;
                o.PositionX = Math.sin(t * 0.65) * 1.5;
                o.PositionY = Math.sin(t * 1.3) * 0.9;
                o.ParamEyeBallX = 0.25 + Math.sin(t * 1.15) * 0.22;
                o.ParamEyeBallY = 0.28 + Math.sin(t * 0.8) * 0.1;
                o.ParamBrowLY = -0.15 + Math.sin(t * 1.6) * 0.08;
                o.ParamBrowRY = 0.18 + Math.sin(t * 1.6) * 0.08;
                o.ParamBrowLAngle = -0.25;
                o.ParamMouthForm = -0.05 + Math.sin(t * 2.3) * 0.14;
                o.LControl = 0.22 + earTwitch * 0.7;
                o.RControl = -0.1 + earTwitch * 0.5;
                break;
            }
            case 'connecting': {
                o.LeanInput = -10.0;
                o.AngleX = Math.sin(t * 1.6) * 6.0;
                o.AngleY = 3.0 + Math.sin(t * 2.4) * 3.0;
                o.AngleZ = -3.0 + Math.sin(t * 1.4) * 3.5;
                o.PositionY = Math.sin(t * 3.0) * 1.2;
                o.ParamEyeBallX = Math.sin(t * 2.3) * 0.45;
                o.LControl = 0.35 + Math.sin(t * 3.2) * 0.2;
                o.RControl = 0.35 + Math.sin(t * 3.2) * 0.2;
                break;
            }
            case 'responding': {
                o.AngleX = Math.sin(t * 1.9) * 5.2;
                o.AngleY = Math.sin(t * 4.1) * 4.5;
                o.AngleZ = Math.sin(t * 1.45) * 4.5;
                o.PositionY = Math.abs(Math.sin(t * 2.6)) * 1.8;
                o.PositionX = Math.sin(t * 1.3) * 1.4;
                const talk = Math.max(0, 0.16 + Math.sin(t * 10.5) * 0.2 + Math.sin(t * 16.3) * 0.12);
                o.ParamMouthOpenY = talk;
                o.JawOpen = talk * 0.35;
                o.LControl = 0.25 + Math.sin(t * 2.8) * 0.25;
                o.RControl = 0.25 + Math.sin(t * 2.8 + 0.5) * 0.25;
                o.Startwinkle = Math.sin(t * 5.5) * 0.65;
                o.KiraA = 0.6;
                o.KiraB = 0.6;
                break;
            }
            case 'searching': {
                o.LeanInput = -8.0;
                o.AngleX = Math.sin(t * 2.5) * 8.5;
                o.AngleY = -2.0 + Math.sin(t * 1.4) * 2.5;
                o.AngleZ = Math.sin(t * 2.5) * 4.5;
                o.PositionX = Math.sin(t * 2.5) * 2.0;
                o.ParamEyeBallX = Math.sin(t * 2.5) * 0.55;
                o.ParamEyeBallY = Math.cos(t * 1.8) * 0.18;
                o.LControl = 0.35 + earTwitch;
                o.RControl = 0.35 + earTwitch;
                break;
            }
            case 'reading': {
                o.LeanInput = -6.0;
                const scan = (t * 0.95) % 1;
                const sweep = scan < 0.85 ? (scan / 0.85) * 2 - 1 : 1 - ((scan - 0.85) / 0.15) * 2;
                o.AngleX = sweep * 4.5;
                o.AngleY = -6.5 + Math.sin(t * 3.0) * 1.8;
                o.AngleZ = sweep * 2.0;
                o.ParamEyeBallX = sweep * 0.45;
                o.ParamEyeBallY = -0.35;
                break;
            }
            case 'writing': {
                o.LeanInput = -5.0;
                o.AngleX = Math.sin(t * 2.2) * 3.8;
                o.AngleY = -4.5 + Math.sin(t * 5.6) * 2.4;
                o.AngleZ = 4.0 + Math.sin(t * 2.0) * 3.0;
                o.PositionY = Math.sin(t * 5.6) * 1.4;
                o.ParamEyeBallX = Math.sin(t * 3.4) * 0.35;
                o.ParamEyeBallY = -0.22;
                break;
            }
            case 'browsing': {
                o.LeanInput = -7.0;
                o.AngleX = Math.sin(t * 1.4) * 5.0;
                o.AngleY = Math.cos(t * 2.2) * 3.5;
                o.AngleZ = Math.sin(t * 1.1) * 3.2;
                o.ParamEyeBallX = Math.sin(t * 1.8) * 0.4;
                o.ParamEyeBallY = Math.cos(t * 2.4) * 0.28;
                break;
            }
            case 'watching': {
                o.LeanInput = -11.0;
                o.AngleX = Math.sin(t * 1.5) * 6.0;
                o.AngleY = 2.0 + Math.cos(t * 2.1) * 3.5;
                o.AngleZ = Math.sin(t * 1.2) * 4.0;
                o.ParamEyeBallX = Math.sin(t * 1.5) * 0.45;
                o.ParamEyeBallY = Math.cos(t * 2.1) * 0.3;
                o.LControl = 0.45 + Math.sin(t * 2.2) * 0.25;
                o.RControl = 0.45 + Math.sin(t * 2.2) * 0.25;
                break;
            }
            case 'terminal': {
                o.AngleX = Math.sin(t * 2.1) * 5.5;
                o.AngleY = Math.sin(t * 4.2) * 3.2;
                o.AngleZ = -4.0 + Math.cos(t * 2.1) * 3.5;
                o.PositionY = Math.sin(t * 4.2) * 1.4;
                o.ParamMouthOpenY = 0.08 + Math.max(0, Math.sin(t * 3.4)) * 0.14;
                o.LControl = 0.3 + Math.sin(t * 4.2) * 0.2;
                o.RControl = 0.3 + Math.sin(t * 4.2) * 0.2;
                break;
            }
            case 'tool': {
                o.AngleX = Math.sin(t * 1.8) * 5.0;
                o.AngleY = Math.sin(t * 3.0) * 3.0;
                o.AngleZ = Math.sin(t * 1.4) * 4.0;
                o.PositionY = Math.sin(t * 3.0) * 1.1;
                o.LControl = 0.25 + earTwitch;
                o.RControl = 0.25 + earTwitch;
                break;
            }
            case 'ask': {
                o.LeanInput = -13.0;
                o.AngleZ = 10.5 + Math.sin(t * 1.4) * 2.5;
                o.AngleY = 3.0 + Math.sin(t * 1.9) * 2.2;
                o.AngleX = Math.sin(t * 1.0) * 3.0;
                o.PositionY = Math.abs(Math.sin(t * 2.2)) * 1.2;
                o.LControl = 0.4 + Math.sin(t * 2.4) * 0.25;
                o.RControl = -0.15 + Math.sin(t * 2.4) * 0.2;
                break;
            }
            case 'done': {
                o.AngleX = Math.cos(t * 2.2) * 6.0;
                o.AngleY = Math.sin(t * 4.5) * 4.0;
                o.AngleZ = Math.sin(t * 2.8) * 8.5;
                o.PositionY = Math.abs(Math.sin(t * 4.5)) * 2.6;
                o.LControl = 0.35 + Math.sin(t * 6.0) * 0.45;
                o.RControl = 0.35 + Math.sin(t * 6.0) * 0.45;
                o.Startwinkle = Math.sin(t * 6.5) * 0.9;
                o.Startwinkle2 = Math.cos(t * 6.5) * 0.9;
                o.Param31 = Math.sin(t * 5.0) * 0.6;
                o.Param32 = Math.sin(t * 7.0) * 0.2;
                o.KiraA = 1; o.KiraB = 1; o.KiraC = 1; o.KiraD = 1;
                break;
            }
            case 'ended': {
                o.AngleX = Math.sin(t * 0.65) * 3.2;
                o.AngleY = Math.sin(t * 1.2) * 2.5;
                o.AngleZ = -4.5 + Math.sin(t * 0.9) * 4.0;
                o.Startwinkle = Math.sin(t * 3.0) * 0.5;
                o.KiraA = 0.6; o.KiraB = 0.6;
                break;
            }
            case 'error': {
                o.AngleX = Math.sin(t * 11.0) * 5.0;
                o.AngleY = -3.0 + Math.sin(t * 7.5) * 2.0;
                o.AngleZ = -5.0 + Math.cos(t * 7.0) * 4.0;
                o.PositionX = Math.sin(t * 13.5) * 1.5;
                o.LControl = -0.7;
                o.RControl = -0.7;
                o.Param138 = (Math.sin(t * 16.0) + 1) * 0.35;
                o.ShockR = Math.sin(t * 22.0) * 0.16;
                o.ShockL = Math.sin(t * 22.0) * 0.16;
                o.SweatBurst1 = (t * 2.4) % 1;
                o.SweatBurst2 = 1;
                o.SweatBurst3 = ((t * 2.4) + 0.5) % 1;
                o.SweatBurst4 = 1;
                break;
            }
            case 'paused': {
                o.AngleX = Math.sin(t * 0.45) * 2.5;
                o.AngleY = -1.5;
                o.AngleZ = -7.0 + Math.sin(t * 0.5) * 2.2;
                o.LControl = -0.2;
                o.RControl = -0.2;
                break;
            }
            case 'sleepy': {
                const cycle = t % 6.0;
                // Slowly nod off, then softly jolt awake around cycle=4.4..5.2
                const nod = cycle < 4.3 ? (cycle / 4.3) : Math.max(0, 1 - (cycle - 4.3) / 0.5);
                o.AngleY = -3.0 - nod * 7.5;
                o.AngleZ = -6.0 - nod * 4.5 + Math.sin(t * 0.6) * 2.0;
                o.ParamEyeLOpen = 0.55 - nod * 0.45;
                o.ParamEyeROpen = 0.55 - nod * 0.45;
                o.LControl = -0.5;
                o.RControl = -0.5;
                if (cycle > 4.6 && cycle < 5.7) {
                    o.ParamMouthOpenY = Math.sin(((cycle - 4.6) / 1.1) * Math.PI) * 0.35;
                }
                break;
            }
            case 'offline': {
                o.AngleX = Math.sin(t * 0.5) * 2.0;
                o.AngleY = -3.0;
                o.AngleZ = -6.0 + Math.sin(t * 0.4) * 2.0;
                o.LControl = -0.6;
                o.RControl = -0.6;
                o.SweatBurst1 = (t * 0.8) % 1;
                o.SweatBurst2 = 0.6;
                break;
            }
        }
        return o;
    }

    function animate(delta) {
        const dt = Math.min(delta, 50);
        clock += dt / 1000;
        const smoothing = 1 - Math.exp(-dt / 130);
        // Natural double-blink cadence every ~4.5s
        const blinkCycle = clock % 4.5;
        let blink = 0;
        if (!settling) {
            if (blinkCycle > 4.25) blink = Math.max(0, 1 - Math.abs(blinkCycle - 4.35) / 0.1);
            else if (Math.floor(clock / 4.5) % 3 === 1 && blinkCycle > 4.02 && blinkCycle <= 4.22) {
                blink = Math.max(0, 1 - Math.abs(blinkCycle - 4.12) / 0.09);
            }
        }

        const fx = settling ? {AngleX: 0, AngleY: 0, AngleZ: 0, PositionX: 0, PositionY: 0, PositionZ: 0, LeanInput: 0}
            : computeStateOverrides(clock);
        const tapping = !settling && tapUntil > clock;
        const tapFrac = tapping ? Math.max(0, Math.min(1, (clock - tapStart) / 1.4)) : 0;
        const tapEnv = tapping ? Math.sin(tapFrac * Math.PI) : 0;

        for (const id of controlled) {
            if (!hasPhysicsRig && (id === 'AngleX' || id === 'AngleY' || id === 'AngleZ'
                    || id === 'PositionX' || id === 'PositionY' || id === 'PositionZ')) {
                continue;
            }
            if (hasPhysicsRig && physicsOutputs.has(id)) continue;
            const param = coreParams.get(id);
            if (!param) continue;

            let value = target[id] !== undefined ? target[id]
                : (fx[id] !== undefined ? fx[id] : param.default);

            if (id === 'Clothes2') value = pose === 'chibi' ? 1 : 0;
            else if (id === 'Param11') {
                if (target.key8) {
                    const steps = param.max >= 8 ? 8 : Math.max(1, Math.round(param.max - param.min));
                    value = param.min + (Math.floor(clock * 6) % (steps + 1));
                } else {
                    value = 0;
                }
            } else if (id === 'Param140') {
                value = target.key8 ? param.min + (param.max - param.min) * ((clock * 0.9) % 1) : 0;
            } else if (id === 'ParamBreath') {
                const rate = state === 'sleepy' || state === 'paused' ? 1.2 : 1.85;
                value = settling ? 0.5 : (Math.sin(clock * rate) + 1) / 2;
            } else if (!hasPhysicsRig && id === 'ParamAngleX') {
                value = fx.AngleX;
            } else if (!hasPhysicsRig && id === 'ParamAngleY') {
                value = fx.AngleY;
            } else if (!hasPhysicsRig && id === 'ParamAngleZ') {
                value = fx.AngleZ + (tapping ? Math.sin(tapFrac * Math.PI * 3) * 8 * (1 - tapFrac) : 0);
            } else if (!hasPhysicsRig && id === 'ParamBodyAngleZ') {
                value = fx.AngleZ * 0.5;
            } else if (id === 'ParamEyeLOpen' || id === 'ParamEyeROpen') {
                const openBase = fx[id] !== undefined ? fx[id] : value;
                value = openBase * (1 - blink);
            } else if (id === 'AniEyerolling' && target.key3) {
                value = param.min + (param.max - param.min) * ((clock * 0.8) % 1);
            }

            if (tapping) {
                if (id === 'key7') value = Math.max(value, 0.9 * tapEnv);
                else if (id === 'Movement2') value = Math.max(value, tapEnv);
                else if (id === 'EyeSmile') value = Math.max(value, 0.8 * tapEnv);
                else if (id === 'ParamMouthForm') value = Math.max(value, 0.85 * tapEnv);
                else if (id === 'PositionY') value += Math.abs(Math.sin(tapFrac * Math.PI * 2.5)) * 4.5 * (1 - tapFrac);
                else if (id === 'AngleZ') value += Math.sin(tapFrac * Math.PI * 3) * 8 * (1 - tapFrac);
                else if (id === 'LControl' || id === 'RControl') value = Math.max(value, Math.sin(tapFrac * Math.PI * 4) * 0.85 * (1 - tapFrac));
                else if (id === 'Startwinkle') value = Math.sin(clock * 9) * 0.9 * tapEnv;
                else if (id === 'KiraA' || id === 'KiraB' || id === 'KiraC' || id === 'KiraD') value = Math.max(value, tapEnv);
            }

            const next = instantParams.has(id)
                ? value
                : param.value + (value - param.value) * smoothing;
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
        hasPhysicsRig = coreParams.has('AngleX') && coreParams.has('PositionX');
        // Write physics inputs before physics.evaluate(); keep non-physics facial/effect params after pose.
        model.internalModel.on('afterMotionUpdate', () => animate(frameDelta));
        model.internalModel.on('beforeModelUpdate', () => {
            for (const id of controlled) {
                if (hasPhysicsRig && physicsOutputs.has(id)) continue;
                const p = coreParams.get(id);
                if (p) set(id, p.value);
            }
        });
        app.ticker.add(() => { frameDelta = app.ticker.deltaMS; model.update(frameDelta); });
        set('Clothes2', pose === 'chibi' ? 1 : 0);
        function settlePose() {
            // Advance the CPU rig without submitting 60 expensive GPU frames to a mobile WebView.
            settling = true;
            model.deltaTime = 0;
            for (let i = 0; i < 60; i++) model.internalModel.update(33, model.elapsedTime += 33);
            measure();
            settling = false;
            clock = 0;
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
            loadingAnimation: {
                active: !!target.key8,
                phase: coreParams.get('Param140') ? coreParams.get('Param140').value
                    : (coreParams.get('Param11') ? coreParams.get('Param11').value : 0),
                spinnerStep: coreParams.get('Param11') ? coreParams.get('Param11').value : 0
            },
            fps: app.ticker.maxFPS,
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
