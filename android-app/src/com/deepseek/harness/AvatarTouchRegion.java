package com.deepseek.harness;

import android.graphics.Region;
import android.util.Log;
import android.view.View;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import org.json.JSONArray;

/** Limit the input window to rendered alpha; rejecting View touch events alone cannot pass through. */
final class AvatarTouchRegion {
    private final View root;
    private int[][] rectangles;
    private Object listener;
    private Class<?> listenerType;
    private Method setInsets;
    private Field regionField;
    private boolean callbackFailed;

    AvatarTouchRegion(final View root) {
        this.root = root;
        root.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            @Override public void onViewAttachedToWindow(View v) { install(); }
            @Override public void onViewDetachedFromWindow(View v) { listener = null; }
        });
        if (root.isAttachedToWindow()) install();
    }

    private void install() {
        if (listener != null) return;
        try {
            // This framework hook is available to the app's targetSdk 28 on supported Androids.
            // Keep it isolated rather than depending on SDK-internal classes at compile time.
            listenerType = Class.forName("android.view.ViewTreeObserver$OnComputeInternalInsetsListener");
            Class<?> infoType = Class.forName("android.view.ViewTreeObserver$InternalInsetsInfo");
            setInsets = infoType.getMethod("setTouchableInsets", int.class);
            regionField = infoType.getField("touchableRegion");
            listener = Proxy.newProxyInstance(listenerType.getClassLoader(), new Class<?>[]{listenerType},
                    new InvocationHandler() {
                @Override public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
                    if ("hashCode".equals(method.getName())) return System.identityHashCode(proxy);
                    if ("equals".equals(method.getName())) return args != null && proxy == args[0];
                    if ("toString".equals(method.getName())) return "AvatarTouchRegion";
                    if ("onComputeInternalInsets".equals(method.getName()) && rectangles != null && !callbackFailed) {
                        try {
                        Object info = args[0];
                        Region region = (Region) regionField.get(info);
                        region.setEmpty();
                        int w = root.getWidth(), h = root.getHeight();
                        for (int[] r : rectangles) {
                            int left = r[0] * w / 1024, top = r[1] * h / 1024;
                            int right = (r[2] * w + 1023) / 1024, bottom = (r[3] * h + 1023) / 1024;
                            if (right > left && bottom > top) region.op(left, top, right, bottom, Region.Op.UNION);
                        }
                        setInsets.invoke(info, 3); // TOUCHABLE_INSETS_REGION, window-local coordinates.
                        } catch (Throwable unavailable) {
                            callbackFailed = true;
                            Log.w("DSHOverlay", "Silhouette input callback unavailable", unavailable);
                        }
                    }
                    return null;
                }
            });
            root.getViewTreeObserver().getClass().getMethod("addOnComputeInternalInsetsListener", listenerType)
                    .invoke(root.getViewTreeObserver(), listener);
            Log.i("DSHOverlay", "Avatar silhouette input region installed");
            root.requestLayout();
        } catch (Throwable failure) {
            listener = null;
            Log.w("DSHOverlay", "Silhouette input region unavailable", failure);
        }
    }

    void update(String json) {
        if (json == null || json.length() > 65536) return;
        try {
            JSONArray data = new JSONArray(json);
            if (data.length() == 0 || data.length() > 2048) return;
            int[][] parsed = new int[data.length()][4];
            for (int i = 0; i < data.length(); i++) {
                JSONArray r = data.getJSONArray(i);
                if (r.length() != 4) return;
                for (int j = 0; j < 4; j++) {
                    parsed[i][j] = r.getInt(j);
                    if (parsed[i][j] < 0 || parsed[i][j] > 1024) return;
                }
                if (parsed[i][2] <= parsed[i][0] || parsed[i][3] <= parsed[i][1]) return;
            }
            rectangles = parsed;
            root.requestLayout();
        } catch (Exception malformed) { Log.w("DSHOverlay", "Invalid avatar alpha mask", malformed); }
    }

    void reset() { rectangles = null; root.requestLayout(); }
    int rectangleCount() { return rectangles == null ? 0 : rectangles.length; }
    boolean isAvailable() { return listener != null && !callbackFailed; }
}
