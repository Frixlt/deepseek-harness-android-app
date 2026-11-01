import json

with open("tools/translations_db.json", "r", encoding="utf-8") as f:
    db = json.load(f)

def java_escape(s):
    out = []
    for ch in s:
        if ch == '\\':
            out.append('\\\\')
        elif ch == '"':
            out.append('\\"')
        elif ch == '\n':
            out.append('\\n')
        elif ch == '\r':
            out.append('\\r')
        elif ch == '\t':
            out.append('\\t')
        elif ord(ch) < 32:
            out.append(f'\\u{ord(ch):04x}')
        else:
            out.append(ch)
    return ''.join(out)

def unescape_literal(s):
    # In true_zh_literals.json, strings were extracted from Java code where \n was \\n and \" was \\"
    # Wait! When Java runtime has the string in memory, \n is actual newline (char 10), \" is char 34!
    # So we must store BOTH the unescaped version (actual runtime string) AND raw version if different!
    try:
        res = []
        i = 0
        n = len(s)
        while i < n:
            if s[i] == '\\' and i + 1 < n:
                nxt = s[i+1]
                if nxt == 'n':
                    res.append('\n')
                    i += 2
                    continue
                elif nxt == 'r':
                    res.append('\r')
                    i += 2
                    continue
                elif nxt == 't':
                    res.append('\t')
                    i += 2
                    continue
                elif nxt == '"':
                    res.append('"')
                    i += 2
                    continue
                elif nxt == "'":
                    res.append("'")
                    i += 2
                    continue
                elif nxt == '\\':
                    res.append('\\')
                    i += 2
                    continue
            res.append(s[i])
            i += 1
        return ''.join(res)
    except Exception:
        return s

def write_java_dict(class_name, lang_map, out_path):
    # Expand map so both raw and unescaped runtime strings are present,
    # always preferring canonical unescaped keys over raw escaped keys.
    expanded = {}
    for k, v in lang_map.items():
        uk = unescape_literal(k)
        uv = unescape_literal(v)
        if k != uk:
            expanded[uk] = uv
            expanded[k] = v
    for k, v in lang_map.items():
        uk = unescape_literal(k)
        uv = unescape_literal(v)
        if k == uk:
            expanded[uk] = uv

    items = sorted(expanded.items(), key=lambda x: x[0])
    chunk_size = 100
    chunks = [items[i:i+chunk_size] for i in range(0, len(items), chunk_size)]

    lines = [
        "package com.deepseek.harness;",
        "",
        "import java.util.Map;",
        "",
        f"final class {class_name} {{",
        f"    private {class_name}() {{}}",
        "",
        "    static void load(Map<String, String> m) {"
    ]
    for idx in range(len(chunks)):
        lines.append(f"        load{idx}(m);")
    lines.append("    }")
    lines.append("")

    for idx, ch in enumerate(chunks):
        lines.append(f"    private static void load{idx}(Map<String, String> m) {{")
        for k, v in ch:
            ek = java_escape(k)
            ev = java_escape(v)
            lines.append(f'        m.put("{ek}", "{ev}");')
        lines.append("    }")
        lines.append("")

    lines.append("}")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Wrote {out_path} with {len(items)} entries in {len(chunks)} chunks.")

write_java_dict("I18nEn", db["en"], "android-app/src/com/deepseek/harness/I18nEn.java")
write_java_dict("I18nRu", db["ru"], "android-app/src/com/deepseek/harness/I18nRu.java")
