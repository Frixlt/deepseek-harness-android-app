package com.deepseek.harness;

import java.util.Locale;

/** Structured avatar states; independent of translated/custom bubble text. */
final class AvatarState {
    private AvatarState() {}

    static String resolve(String state, String tool) {
        String s = state == null ? "idle" : state.toLowerCase(Locale.ROOT);
        if ("tool".equals(s)) {
            String t = tool == null ? "" : tool.toLowerCase(Locale.ROOT);
            if (t.matches(".*(ask.*question|request.*input).*")) return "ask";
            if (t.matches(".*(search|find|grep).*")) return "searching";
            if (t.matches(".*(screenshot|screen_see|vscreen_see|accessibility_see).*")) return "watching";
            if (t.matches(".*(browser|web_|fetch|browse).*")) return "browsing";
            if (t.matches(".*(edit|write|patch|create_file).*")) return "writing";
            if (t.matches(".*(read|list|inspect|cat_file).*")) return "reading";
            if (t.matches(".*(shell|exec|terminal|command).*")) return "terminal";
            return "tool";
        }
        if ("waiting-input".equals(s) || "waiting-for-input".equals(s)) return "ask";
        if ("running".equals(s)) return "thinking";
        if ("stopped".equals(s) || "cancelled".equals(s)) return "paused";
        switch (s) {
            case "idle": case "thinking": case "responding": case "searching":
            case "reading": case "writing": case "browsing": case "watching":
            case "terminal": case "connecting": case "ask": case "done":
            case "ended": case "error": case "paused": case "sleepy": case "offline":
                return s;
            default: return "idle";
        }
    }

    static boolean isWorking(String s) {
        return !("idle".equals(s) || "done".equals(s) || "ended".equals(s)
                || "ask".equals(s) || "error".equals(s) || "paused".equals(s)
                || "sleepy".equals(s) || "offline".equals(s));
    }
}
