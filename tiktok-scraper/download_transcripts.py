#!/usr/bin/env python3
"""
Download WebVTT subtitles for all videos in khairulaming_100k_saves.csv.
Falls back to yt-dlp + mlx-whisper for videos with no subtitle URL.
"""

import csv, glob, json, os, re, sys, time, urllib.request

RAW_DIR        = os.path.join(os.path.dirname(__file__), 'raw')
TRANS_DIR      = os.path.join(os.path.dirname(__file__), 'transcripts')
CSV_PATH       = os.path.join(os.path.dirname(__file__), 'khairulaming_100k_saves.csv')
TIKTOK_USER    = 'khairulaming'

os.makedirs(TRANS_DIR, exist_ok=True)

# ── build id → item map from all raw files ────────────────────────────────────
id_map: dict = {}
for fpath in sorted(glob.glob(os.path.join(RAW_DIR, '*.json'))):
    with open(fpath) as f:
        data = json.load(f)
    items = data.get('itemList', data.get('data', {}).get('itemList', []))
    for item in items:
        vid = str(item.get('id', ''))
        if vid and vid not in id_map:
            id_map[vid] = item

print(f'Loaded {len(id_map)} unique items from raw files.\n')

# ── read CSV ──────────────────────────────────────────────────────────────────
with open(CSV_PATH, encoding='utf-8-sig') as f:
    csv_rows = list(csv.DictReader(f))

video_ids = [r['link'].split('/')[-1] for r in csv_rows]
captions  = {r['link'].split('/')[-1]: r['caption'] for r in csv_rows}

# ── WebVTT → plain text ───────────────────────────────────────────────────────
def vtt_to_text(vtt: str) -> str:
    """Strip timestamps, deduplicate consecutive identical lines."""
    lines = []
    prev  = ''
    for line in vtt.splitlines():
        line = line.strip()
        if not line or line == 'WEBVTT':
            continue
        if re.match(r'\d{2}:\d{2}:\d{2}', line):   # timestamp
            continue
        if re.match(r'^\d+$', line):                  # cue number
            continue
        if line != prev:
            lines.append(line)
            prev = line
    return '\n'.join(lines)

# ── download one VTT ──────────────────────────────────────────────────────────
HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}

def download_vtt(url: str) -> str | None:
    try:
        req  = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=20)
        return resp.read().decode('utf-8')
    except Exception as e:
        print(f'    ⚠️  HTTP error: {e}')
        return None

# ── get subtitle url (prefer msa-MY, fall back to any) ───────────────────────
def get_sub_url(item: dict) -> tuple[str | None, str]:
    caps = item.get('video', {}).get('claInfo', {}).get('captionInfos', [])
    # prefer msa-MY
    for c in caps:
        if 'msa' in c.get('language', '').lower():
            return c['url'], c.get('language', 'msa-MY')
    # fall back to any available
    if caps:
        c = caps[0]
        return c['url'], c.get('language', 'unknown')
    return None, 'none'

# ── whisper fallback ──────────────────────────────────────────────────────────
def whisper_transcribe(video_id: str) -> str | None:
    """Download audio via yt-dlp and transcribe with mlx-whisper."""
    try:
        import subprocess, tempfile, shutil
        url  = f'https://www.tiktok.com/@{TIKTOK_USER}/video/{video_id}'
        tmpd = tempfile.mkdtemp()
        audio_path = os.path.join(tmpd, 'audio.mp3')
        # download audio
        r = subprocess.run(
            ['yt-dlp', '-x', '--audio-format', 'mp3', '-o', audio_path, url],
            capture_output=True, text=True, timeout=120,
        )
        if r.returncode != 0:
            print(f'    yt-dlp error: {r.stderr[:200]}')
            shutil.rmtree(tmpd, ignore_errors=True)
            return None
        # transcribe
        r2 = subprocess.run(
            ['mlx_whisper', '--model', 'mlx-community/whisper-large-v3-mlx',
             '--language', 'ms', audio_path],
            capture_output=True, text=True, cwd=tmpd, timeout=300,
        )
        shutil.rmtree(tmpd, ignore_errors=True)
        if r2.returncode != 0:
            print(f'    mlx-whisper error: {r2.stderr[:200]}')
            return None
        return r2.stdout.strip()
    except Exception as e:
        print(f'    Whisper exception: {e}')
        return None

# ── main loop ─────────────────────────────────────────────────────────────────
n_sub = 0; n_whisper = 0; n_fail = 0

for idx, vid in enumerate(video_ids, 1):
    vtt_path = os.path.join(TRANS_DIR, f'{vid}.vtt')
    txt_path = os.path.join(TRANS_DIR, f'{vid}.txt')

    if os.path.exists(txt_path):
        print(f'[{idx:2}/{len(video_ids)}] {vid}  ✓ already done')
        n_sub += 1
        continue

    print(f'[{idx:2}/{len(video_ids)}] {vid}', end='  ')

    item = id_map.get(vid)
    if not item:
        print('⚠️  not found in raw files')
        n_fail += 1
        continue

    url, lang = get_sub_url(item)

    if url:
        print(f'subtitle ({lang})', end=' ... ')
        vtt = download_vtt(url)
        if vtt:
            with open(vtt_path, 'w', encoding='utf-8') as f:
                f.write(vtt)
            txt = vtt_to_text(vtt)
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(txt)
            print(f'✓  ({len(txt.splitlines())} lines)')
            n_sub += 1
        else:
            print('failed — trying Whisper fallback')
            txt = whisper_transcribe(vid)
            if txt:
                with open(txt_path, 'w', encoding='utf-8') as f:
                    f.write(txt)
                print('    ✓ Whisper done')
                n_whisper += 1
            else:
                print('    ✗ failed')
                n_fail += 1
    else:
        print('no subtitle — trying Whisper fallback')
        txt = whisper_transcribe(vid)
        if txt:
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(txt)
            print('    ✓ Whisper done')
            n_whisper += 1
        else:
            print('    ✗ failed')
            n_fail += 1

    time.sleep(0.3)  # polite rate limit

print(f'\n─────────────────────────────────────────────')
print(f'  From subtitles : {n_sub}')
print(f'  From Whisper   : {n_whisper}')
print(f'  Failed         : {n_fail}')
print(f'─────────────────────────────────────────────')
