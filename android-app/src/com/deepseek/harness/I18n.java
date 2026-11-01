package com.deepseek.harness;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Internationalization (i18n) and Localization (l10n) manager for DeepSeek Harness Android.
 * Supports English (en), Russian (ru), Chinese (zh), and System Default (auto).
 */
public final class I18n {

    public static final String PREFS_NAME = "dsh_prefs";
    public static final String PREF_LANG = "app_language";

    public static final String LANG_AUTO = "auto";
    public static final String LANG_EN = "en";
    public static final String LANG_RU = "ru";
    public static final String LANG_ZH = "zh";

    private static volatile String userPref = LANG_AUTO;
    private static volatile String activeLang = LANG_EN;

    private static final Map<String, String> EN_MAP = new HashMap<String, String>(2600);
    private static final Map<String, String> RU_MAP = new HashMap<String, String>(2600);

    // Dynamic regex patterns for composite runtime strings
    private static final Pattern PAT_STEP = Pattern.compile("^第\\s*(\\d+)\\s*/\\s*(\\d+)\\s*步$");
    private static final Pattern PAT_PORT_RUN = Pattern.compile("^端口\\s*(\\d+)\\s*·\\s*已运行\\s*(\\d+)\\s*分\\s*·\\s*通知\\s*(\\d+)$");
    private static final Pattern PAT_PORT_WAIT = Pattern.compile("^端口\\s*(\\d+)\\s*·\\s*启动中…\\s*已等待\\s*(\\d+)\\s*秒$");
    private static final Pattern PAT_PORT_READY = Pattern.compile("^点「启动引擎」开始\\s*·\\s*端口\\s*(\\d+)$");
    private static final Pattern PAT_PORT_EXTRACT = Pattern.compile("^解压完成后可启动\\s*·\\s*端口\\s*(\\d+)$");
    private static final Pattern PAT_SESSIONS_RUNNING = Pattern.compile("^(\\d+)\\s*个会话运行中…$");
    private static final Pattern PAT_CALLING_TOOL = Pattern.compile("^正在调用\\s*(.+?)…$");
    private static final Pattern PAT_ENGINE_STATUS_NOTIF = Pattern.compile("^引擎状态：(运行中（端口\\s*(\\d+)）|未运行)$");
    private static final Pattern PAT_SELFCHECK_SUMMARY = Pattern.compile("^清单文件\\s*(\\d+)\\s*·\\s*树上文件\\s*(\\d+)\\s*·\\s*已校验内容\\s*(\\d+)\\s*·\\s*用时\\s*(\\d+)s(.*)$");
    private static final Pattern PAT_SELFCHECK_DONE = Pattern.compile("^自检完成：(.+?)（缺失\\s*(\\d+)\\s*/\\s*不符\\s*(\\d+)）$");
    private static final Pattern PAT_WORKSPACE_SET = Pattern.compile("^已设置：(.+?)（点此更改或恢复默认）$");
    private static final Pattern PAT_SAVED_THEMES = Pattern.compile("^(我保存过的主题|Saved Themes|Сохраненные темы|Сохранённые темы)（(\\d+)）$");
    private static final Pattern PAT_TRASH_COUNT = Pattern.compile("^(回收站|Trash|Корзина)（(\\d+)）$");
    private static final Pattern PAT_SESSION_TOTAL = Pattern.compile("^共\\s*(\\d+)\\s*条会话\\s*·\\s*(.+)$");
    private static final Pattern PAT_TRASH_SUMMARY = Pattern.compile("^回收站\\s*(\\d+)\\s*条\\s*·\\s*(.+)$");
    private static final Pattern PAT_BAD_REFS_WARN = Pattern.compile("^⚠\\s*(\\d+)\\s*处坏附件引用（共\\s*(\\d+)\\s*处附件）$");
    private static final Pattern PAT_REFS_OK = Pattern.compile("^正常（(\\d+)\\s*处附件引用，无损坏）$");
    private static final Pattern PAT_HEAL_SUMMARY = Pattern.compile("^会话\\s*(\\d+)\\s*条\\s*·\\s*其中\\s*(\\d+)\\s*条有坏附件（共\\s*(\\d+)\\s*处）$");
    private static final Pattern PAT_PLUGIN_ENABLED = Pattern.compile("^插件列表\\s*·\\s*已启用\\s*(\\d+)\\s*/\\s*(\\d+)$");
    private static final Pattern PAT_EVENT_NO = Pattern.compile("^第\\s*(\\d+)\\s*号事件\\s*·\\s*(.+)$");

    static {
        resolveActiveLang();
        try {
            I18nEn.load(EN_MAP);
        } catch (Throwable ignored) {}
        try {
            I18nRu.load(RU_MAP);
        } catch (Throwable ignored) {}
    }

    private I18n() {}

    public static synchronized void init(Context ctx) {
        if (ctx == null) return;
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String saved = sp.getString(PREF_LANG, LANG_AUTO);
            if (saved != null && !saved.isEmpty()) {
                userPref = saved;
            }
        } catch (Throwable ignored) {}
        resolveActiveLang();
    }

    public static String getLanguagePref() {
        return userPref;
    }

    public static String getActiveLang() {
        return activeLang;
    }

    public static synchronized void setLanguage(Context ctx, String lang) {
        if (lang == null || lang.isEmpty()) lang = LANG_AUTO;
        userPref = lang;
        if (ctx != null) {
            try {
                SharedPreferences sp = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                sp.edit().putString(PREF_LANG, lang).apply();
            } catch (Throwable ignored) {}
        }
        resolveActiveLang();
    }

    private static void resolveActiveLang() {
        if (LANG_RU.equals(userPref)) {
            activeLang = LANG_RU;
        } else if (LANG_EN.equals(userPref)) {
            activeLang = LANG_EN;
        } else if (LANG_ZH.equals(userPref)) {
            activeLang = LANG_ZH;
        } else {
            String sys = "";
            try {
                Locale loc = Locale.getDefault();
                if (loc != null && loc.getLanguage() != null) {
                    sys = loc.getLanguage().toLowerCase(Locale.US);
                }
            } catch (Throwable ignored) {}
            if (sys.startsWith("ru") || sys.startsWith("uk") || sys.startsWith("be") || sys.startsWith("kk")) {
                activeLang = LANG_RU;
            } else if (sys.startsWith("zh")) {
                activeLang = LANG_ZH;
            } else {
                activeLang = LANG_EN;
            }
        }
    }

    public static boolean isZh() {
        return LANG_ZH.equals(activeLang);
    }

    public static boolean isRu() {
        return LANG_RU.equals(activeLang);
    }

    public static boolean isEn() {
        return LANG_EN.equals(activeLang);
    }

    /**
     * Key-based lookup with fallback string.
     */
    public static String t(String key, String def) {
        if (isZh()) return def != null ? def : (key != null ? key : "");
        String val = null;
        if (isRu()) {
            if (key != null) val = RU_MAP.get(key);
            if (val == null && def != null) val = RU_MAP.get(def);
        }
        if (val == null) {
            if (key != null) val = EN_MAP.get(key);
            if (val == null && def != null) val = EN_MAP.get(def);
        }
        if (val != null) return val;
        if (def != null) return tr(def);
        return key != null ? key : "";
    }

    /**
     * Direct string lookup + dynamic pattern translation.
     */
    public static String tr(String s) {
        if (s == null || s.isEmpty()) return s == null ? "" : s;
        if (isZh()) return s;

        String exact = isRu() ? RU_MAP.get(s) : EN_MAP.get(s);
        if (exact == null && isRu()) {
            exact = EN_MAP.get(s);
        }
        if (exact != null) return exact;

        String trimmed = s.trim();
        if (!trimmed.equals(s) && !trimmed.isEmpty()) {
            String trTrimmed = isRu() ? RU_MAP.get(trimmed) : EN_MAP.get(trimmed);
            if (trTrimmed == null && isRu()) trTrimmed = EN_MAP.get(trimmed);
            if (trTrimmed != null) {
                int start = s.indexOf(trimmed);
                return s.substring(0, start) + trTrimmed + s.substring(start + trimmed.length());
            }
        }

        return translateDynamic(s);
    }

    public static String trFormatted(String fmt, Object... args) {
        String trFmt = tr(fmt);
        try {
            return String.format(Locale.US, trFmt, args);
        } catch (Throwable t) {
            return trFmt;
        }
    }

    private static String translateDynamic(String s) {
        boolean ru = isRu();
        Matcher m;

        m = PAT_STEP.matcher(s);
        if (m.matches()) {
            return ru ? ("Шаг " + m.group(1) + " из " + m.group(2))
                      : ("Step " + m.group(1) + " of " + m.group(2));
        }

        m = PAT_PORT_RUN.matcher(s);
        if (m.matches()) {
            return ru ? ("Порт " + m.group(1) + " · Работает " + m.group(2) + " мин · Уведомления " + m.group(3))
                      : ("Port " + m.group(1) + " · Running " + m.group(2) + " min · Notify " + m.group(3));
        }

        m = PAT_PORT_WAIT.matcher(s);
        if (m.matches()) {
            return ru ? ("Порт " + m.group(1) + " · Запуск… Ожидание " + m.group(2) + " с")
                      : ("Port " + m.group(1) + " · Starting… Waited " + m.group(2) + " s");
        }

        m = PAT_PORT_READY.matcher(s);
        if (m.matches()) {
            return ru ? ("Нажмите «Запустить» для старта · Порт " + m.group(1))
                      : ("Tap 'Start' to begin · Port " + m.group(1));
        }

        m = PAT_PORT_EXTRACT.matcher(s);
        if (m.matches()) {
            return ru ? ("Запуск возможен после распаковки · Порт " + m.group(1))
                      : ("Can start after extraction · Port " + m.group(1));
        }

        m = PAT_SESSIONS_RUNNING.matcher(s);
        if (m.matches()) {
            int n = 1;
            try { n = Integer.parseInt(m.group(1)); } catch (Throwable ignored) {}
            if (ru) {
                String word = (n % 10 == 1 && n % 100 != 11) ? "сессия выполняется…"
                        : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? "сессии выполняются…" : "сессий выполняется…");
                return n + " " + word;
            } else {
                return n + (n == 1 ? " session running…" : " sessions running…");
            }
        }

        m = PAT_CALLING_TOOL.matcher(s);
        if (m.matches()) {
            return ru ? ("Вызов " + m.group(1) + "…") : ("Calling " + m.group(1) + "…");
        }

        m = PAT_ENGINE_STATUS_NOTIF.matcher(s);
        if (m.matches()) {
            if (m.group(2) != null) {
                return ru ? ("Состояние движка: выполняется (порт " + m.group(2) + ")")
                          : ("Engine status: running (port " + m.group(2) + ")");
            } else {
                return ru ? "Состояние движка: не запущен" : "Engine status: not running";
            }
        }

        m = PAT_SELFCHECK_SUMMARY.matcher(s);
        if (m.matches()) {
            String tail = m.group(5);
            if ("（快速：只比大小）".equals(tail)) {
                tail = ru ? " (Быстрая: только размер)" : " (Quick: size only)";
            } else if ("（全量：大小 + sha256）".equals(tail)) {
                tail = ru ? " (Полная: размер + sha256)" : " (Full: size + sha256)";
            }
            return ru ? ("Манифест " + m.group(1) + " · В каталоге " + m.group(2) + " · Проверено " + m.group(3) + " · Затрачено " + m.group(4) + " с" + tail)
                      : ("Manifest " + m.group(1) + " · Tree " + m.group(2) + " · Verified " + m.group(3) + " · Elapsed " + m.group(4) + "s" + tail);
        }

        m = PAT_SELFCHECK_DONE.matcher(s);
        if (m.matches()) {
            return ru ? ("Самодиагностика завершена: " + tr(m.group(1)) + " (отсутствует " + m.group(2) + " / не совпадает " + m.group(3) + ")")
                      : ("Self-check complete: " + tr(m.group(1)) + " (missing " + m.group(2) + " / mismatch " + m.group(3) + ")");
        }

        m = PAT_WORKSPACE_SET.matcher(s);
        if (m.matches()) {
            return ru ? ("Задано: " + m.group(1) + " (нажмите для изменения или сброса)")
                      : ("Set: " + m.group(1) + " (tap to change or reset)");
        }

        m = PAT_SAVED_THEMES.matcher(s);
        if (m.matches()) {
            return (ru ? "Сохранённые темы (" : "Saved Themes (") + m.group(2) + ")";
        }

        m = PAT_TRASH_COUNT.matcher(s);
        if (m.matches()) {
            return (ru ? "Корзина (" : "Trash (") + m.group(2) + ")";
        }

        m = PAT_SESSION_TOTAL.matcher(s);
        if (m.matches()) {
            return ru ? ("Всего сессий: " + m.group(1) + " · " + m.group(2))
                      : ("Total " + m.group(1) + " sessions · " + m.group(2));
        }

        m = PAT_TRASH_SUMMARY.matcher(s);
        if (m.matches()) {
            return ru ? ("Корзина: " + m.group(1) + " шт. · " + m.group(2))
                      : ("Trash: " + m.group(1) + " items · " + m.group(2));
        }

        m = PAT_BAD_REFS_WARN.matcher(s);
        if (m.matches()) {
            return ru ? ("⚠ Повреждённых ссылок на вложения: " + m.group(1) + " (всего вложений: " + m.group(2) + ")")
                      : ("⚠ " + m.group(1) + " broken attachment refs (" + m.group(2) + " attachments total)");
        }

        m = PAT_REFS_OK.matcher(s);
        if (m.matches()) {
            return ru ? ("В норме (ссылок на вложения: " + m.group(1) + ", без повреждений)")
                      : ("OK (" + m.group(1) + " attachment refs, no corruption)");
        }

        m = PAT_HEAL_SUMMARY.matcher(s);
        if (m.matches()) {
            return ru ? ("Сессий: " + m.group(1) + " · С повреждёнными вложениями: " + m.group(2) + " (всего ссылок: " + m.group(3) + ")")
                      : ("Sessions: " + m.group(1) + " · With broken attachments: " + m.group(2) + " (" + m.group(3) + " refs total)");
        }

        m = PAT_PLUGIN_ENABLED.matcher(s);
        if (m.matches()) {
            return ru ? ("Список плагинов · Включено " + m.group(1) + " / " + m.group(2))
                      : ("Plugin list · Enabled " + m.group(1) + " / " + m.group(2));
        }

        m = PAT_EVENT_NO.matcher(s);
        if (m.matches()) {
            return ru ? ("Событие №" + m.group(1) + " · " + tr(m.group(2)))
                      : ("Event #" + m.group(1) + " · " + tr(m.group(2)));
        }

        // Substring replacements for common composite status strings
        String out = s;
        if (out.contains("运行环境与内核树已就绪")) {
            out = out.replace("运行环境与内核树已就绪", ru ? "Среда выполнения и ядро готовы" : "Runtime environment and kernel tree ready");
        }
        if (out.contains(" · ⚠ 完整性异常")) {
            out = out.replace(" · ⚠ 完整性异常", ru ? " · ⚠ Нарушение целостности" : " · ⚠ Integrity Warning");
        }
        if (out.contains(" · 完整性 OK")) {
            out = out.replace(" · 完整性 OK", ru ? " · Целостность в норме" : " · Integrity OK");
        }
        if (out.contains(" · 正在核对完整性…")) {
            out = out.replace(" · 正在核对完整性…", ru ? " · Проверка целостности…" : " · Checking integrity…");
        }
        if (out.startsWith("下一步：\n")) {
            out = (ru ? "Следующие шаги:\n" : "Next steps:\n") + out.substring("下一步：\n".length());
        }
        if (out.startsWith("另有 ") && out.contains(" 个会话完全正常")) {
            out = out.replace("另有 ", ru ? "Еще " : "Another ")
                     .replace(" 个会话完全正常（未在下面列出）。", ru ? " сессий полностью в порядке (не показаны ниже)." : " sessions are completely normal (not listed below).")
                     .replace(" 个会话完全正常", ru ? " сессий в порядке" : " sessions are normal");
        }
        if (out.startsWith("（无标题）会话 ")) {
            out = (ru ? "(Без названия) Сессия " : "(Untitled) Session ") + out.substring("（无标题）会话 ".length());
        } else if (out.startsWith("（无标题）")) {
            out = (ru ? "(Без названия) " : "(Untitled) ") + out.substring("（无标题）".length());
        }
        if (out.startsWith("内核树与随包清单完全一致（")) {
            out = out.replace("内核树与随包清单完全一致（", ru ? "Дерево ядра полностью совпадает с манифестом (" : "Kernel tree matches package manifest (")
                     .replace(" 个文件", ru ? " файлов" : " files");
        }
        if (out.startsWith("内核树与清单不一致：缺失 ")) {
            out = out.replace("内核树与清单不一致：缺失 ", ru ? "Несоответствие манифесту: отсутствует " : "Mismatch with manifest: missing ")
                     .replace(" · 内容/大小不符 ", ru ? " · Не совпадает размер/содержимое " : " · Size/content mismatch ");
        }
        if (out.startsWith("已取消（处理了 ")) {
            out = out.replace("已取消（处理了 ", ru ? "Отменено (обработано " : "Cancelled (processed ")
                     .replace(" 个文件就停了）", ru ? " файлов)" : " files)");
        }
        if (out.startsWith("找不到内核树：")) {
            out = (ru ? "Дерево ядра не найдено: " : "Kernel tree not found: ") + out.substring("找不到内核树：".length());
        }

        if (hasChinese(out)) {
            out = greedySegmentTranslate(out, ru ? RU_MAP : EN_MAP, EN_MAP);
        }

        return out;
    }

    private static boolean isChineseChar(char c) {
        return c >= '\u4e00' && c <= '\u9fff';
    }

    private static boolean hasChinese(String s) {
        if (s == null) return false;
        int n = s.length();
        for (int i = 0; i < n; i++) {
            if (isChineseChar(s.charAt(i))) return true;
        }
        return false;
    }

    private static int nextChineseIndex(String s, int from) {
        int n = s.length();
        for (int i = from; i < n; i++) {
            if (isChineseChar(s.charAt(i))) return i;
        }
        return -1;
    }

    /**
     * Universal fallback for runtime-concatenated strings ("Lit1" + var1 + "Lit2" + var2).
     * Scans left-to-right and replaces the longest matching substrings found in the translation map.
     */
    private static String greedySegmentTranslate(String s, Map<String, String> primaryMap, Map<String, String> fallbackMap) {
        int n = s.length();
        StringBuilder sb = new StringBuilder(n + 32);
        int i = 0;
        while (i < n) {
            int nextZh = nextChineseIndex(s, i);
            if (nextZh < 0) {
                sb.append(s, i, n);
                break;
            }
            if (nextZh - i > 60) {
                sb.append(s, i, nextZh - 60);
                i = nextZh - 60;
            }
            int maxEnd = Math.min(n, i + 400);
            boolean matched = false;
            if (maxEnd > nextZh) {
                for (int j = maxEnd; j > nextZh; j--) {
                    String sub = s.substring(i, j);
                    String trSub = primaryMap.get(sub);
                    if (trSub == null && primaryMap != fallbackMap) {
                        trSub = fallbackMap.get(sub);
                    }
                    if (trSub != null) {
                        sb.append(trSub);
                        i = j;
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) {
                sb.append(s.charAt(i));
                i++;
            }
        }
        return sb.toString();
    }
}
