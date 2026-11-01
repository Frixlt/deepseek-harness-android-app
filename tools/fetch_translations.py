import json, urllib.request, urllib.parse, os, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from curated_dict import CURATED_EN, CURATED_RU

with open("/tmp/true_zh_literals.json", "r", encoding="utf-8") as f:
    lits = json.load(f)

with open("/tmp/t_pairs.json", "r", encoding="utf-8") as f:
    tp = json.load(f)

all_targets = set()
for k, v in tp.items():
    all_targets.add(v)
for s in lits:
    all_targets.add(s)

all_targets = sorted(all_targets)

db = {"en": dict(CURATED_EN), "ru": dict(CURATED_RU)}
if os.path.exists("tools/translations_db.json"):
    try:
        with open("tools/translations_db.json", "r", encoding="utf-8") as f:
            old_db = json.load(f)
            db["en"].update(old_db.get("en", {}))
            db["ru"].update(old_db.get("ru", {}))
    except Exception:
        pass

db["en"].update(CURATED_EN)
db["ru"].update(CURATED_RU)

def translate_chunk(chunk_idx, chunk, tl):
    # Replace internal \n and \\n with a safe token
    safe_chunk = [s.replace("\\n", " __NL__ ").replace("\n", " __RNL__ ") for s in chunk]
    joined = "\n".join(safe_chunk)
    url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=' + tl + '&dt=t&q=' + urllib.parse.quote(joined)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        res = urllib.request.urlopen(req, timeout=10)
        data = json.loads(res.read().decode('utf-8'))
        full_res = ''.join([x[0] for x in data[0] if x[0]])
        lines = full_res.split("\n")
        if len(lines) == len(chunk):
            out = {}
            for orig, tr in zip(chunk, lines):
                clean = tr.replace("__NL__", "\\n").replace("__nl__", "\\n").replace("__RNL__", "\n").replace("__rnl__", "\n").strip()
                # Preserve leading/trailing spaces from orig
                if orig.startswith(" ") and not clean.startswith(" "):
                    clean = " " + clean
                if orig.endswith(" ") and not clean.endswith(" "):
                    clean = clean + " "
                out[orig] = clean
            return out
    except Exception:
        pass

    # Fallback: parallel or fast individual within chunk
    out = {}
    for orig in chunk:
        s_safe = orig.replace("\\n", " __NL__ ").replace("\n", " __RNL__ ")
        u = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=' + tl + '&dt=t&q=' + urllib.parse.quote(s_safe)
        r = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            resp = urllib.request.urlopen(r, timeout=8)
            d = json.loads(resp.read().decode('utf-8'))
            tr = ''.join([x[0] for x in d[0] if x[0]]).strip()
            clean = tr.replace("__NL__", "\\n").replace("__nl__", "\\n").replace("__RNL__", "\n").replace("__rnl__", "\n")
            if orig.startswith(" ") and not clean.startswith(" "):
                clean = " " + clean
            if orig.endswith(" ") and not clean.endswith(" "):
                clean = clean + " "
            out[orig] = clean
        except Exception:
            out[orig] = orig
    return out

for lang in ["en", "ru"]:
    missing = [s for s in all_targets if s not in db[lang]]
    print(f"[{lang}] Remaining to translate: {len(missing)}", flush=True)
    if not missing:
        continue
    batch_size = 25
    chunks = [missing[i:i+batch_size] for i in range(0, len(missing), batch_size)]
    completed = 0
    with ThreadPoolExecutor(max_workers=24) as pool:
        futures = {pool.submit(translate_chunk, idx, ch, lang): idx for idx, ch in enumerate(chunks)}
        for fut in as_completed(futures):
            res = fut.result()
            db[lang].update(res)
            completed += len(res)
            if completed % 250 < batch_size or completed == len(missing):
                print(f"[{lang}] Progress: {completed}/{len(missing)}", flush=True)

# Re-apply curated to guarantee priority
db["en"].update(CURATED_EN)
db["ru"].update(CURATED_RU)

# Also map all t_pairs keys directly in db
for k, v in tp.items():
    if v in db["en"]:
        db["en"][k] = db["en"][v]
    if v in db["ru"]:
        db["ru"][k] = db["ru"][v]

with open("tools/translations_db.json", "w", encoding="utf-8") as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

print("ALL DONE! EN total:", len(db["en"]), "RU total:", len(db["ru"]))
