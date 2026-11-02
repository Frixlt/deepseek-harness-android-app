package com.deepseek.harness;

/** Run with the source AvatarState.java; no Android SDK or device needed. */
public final class AvatarStateTest {
    private static void state(String input, String tool, String expected) {
        String actual = AvatarState.resolve(input, tool);
        if (!expected.equals(actual)) throw new AssertionError(input + "/" + tool + ": " + actual);
    }
    public static void main(String[] args) {
        state("tool", "functions.request_user_input", "ask");
        state("tool", "web_search", "searching");
        state("tool", "android_vscreen_see", "watching");
        state("tool", "browser_read", "browsing");
        state("tool", "apply_patch", "writing");
        state("tool", "read_file", "reading");
        state("tool", "shizuku_shell", "terminal");
        state("tool", "unknown", "tool");
        state("waiting-for-input", null, "ask");
        state("cancelled", null, "paused");
        state("ended", null, "ended");
        state("responding", "'\\\n", "responding");
        state("UNRECOGNIZED", null, "idle");
        for (String s : new String[]{"ask", "error", "done", "paused", "sleepy", "offline"})
            if (AvatarState.isWorking(s)) throw new AssertionError("Not working: " + s);
        for (String s : new String[]{"reading", "searching", "terminal", "responding"})
            if (!AvatarState.isWorking(s)) throw new AssertionError("Working: " + s);
        System.out.println("AvatarState: PASS");
    }
}
