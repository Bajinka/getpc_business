#!/usr/bin/env python3
"""Transcribe speech and burn styled captions into a video, or just write an .srt.

Styles:
  shorts   - big bold words, 1-3 at a time, current word highlighted (Reels/TikTok look).
  classic  - normal two-line subtitles near the bottom.

Usage:
  captions.py in.mp4 out.mp4                         # transcribe + burn, shorts style
  captions.py in.mp4 out.mp4 --style classic
  captions.py in.mp4 --srt-only subs.srt             # just transcribe to .srt
  captions.py in.mp4 out.mp4 --srt existing.srt      # burn an existing .srt (no transcription)
  captions.py in.mp4 out.mp4 --highlight "#FFD400" --position 0.70 --font "Inter" --upper

Transcription uses faster-whisper (installed automatically if missing). --model tiny|base|
small|medium|large-v3: small is a good default; use medium or larger for accents or noisy audio.
Always skim the .srt it saves next to the output for misheard product names; fix and re-run with --srt.
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import DELIVERY, ffmpeg_base, filter_path, probe, run  # noqa: E402


# ---------- transcription ----------
def transcribe(path, model_name, language):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("Installing faster-whisper...", file=sys.stderr)
        r = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "faster-whisper"])
        if r.returncode != 0:
            r = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "--user",
                                "--break-system-packages", "faster-whisper"])
        if r.returncode != 0:
            sys.exit("Could not install faster-whisper (no network?). Supply captions with --srt instead.")
        from faster_whisper import WhisperModel
    try:
        model = WhisperModel(model_name, device="auto", compute_type="auto")
    except Exception as e:  # usually: no access to huggingface.co to download the model
        sys.exit(f"Could not load the Whisper model '{model_name}' ({type(e).__name__}: {e}).\n"
                 "The first run downloads it from huggingface.co, so this needs internet access. "
                 "Alternatively, burn captions from an existing file with --srt subs.srt.")
    segments, info = model.transcribe(path, language=language, word_timestamps=True, vad_filter=True)
    words = []
    for seg in segments:
        for w in seg.words or []:
            if w.word.strip():
                words.append((w.start, w.end, w.word.strip()))
    print(f"Transcribed {len(words)} words (language: {info.language})", file=sys.stderr)
    return words


# ---------- srt ----------
def ts_srt(t):
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)) % 1000:03}"


def read_srt(path):
    """Return a list of (start, end, text) cues."""
    txt = open(path, encoding="utf-8-sig").read().replace("\r", "")
    cues = []
    for block in re.split(r"\n\s*\n", txt.strip()):
        lines = block.split("\n")
        for i, line in enumerate(lines):
            m = re.match(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)", line)
            if m:
                g = [int(x) for x in m.groups()]
                s = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
                e = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
                cues.append((s, e, " ".join(lines[i + 1:]).strip()))
                break
    return cues


def cues_from_words(words, max_chars=32, max_gap=0.6):
    """Group words into subtitle cues of at most ~2 lines."""
    cues, cur = [], []
    for w in words:
        text = " ".join(x[2] for x in cur + [w])
        if cur and (len(text) > max_chars * 2 or w[0] - cur[-1][1] > max_gap
                    or cur[-1][2][-1:] in ".?!"):
            cues.append((cur[0][0], cur[-1][1], " ".join(x[2] for x in cur)))
            cur = []
        cur.append(w)
    if cur:
        cues.append((cur[0][0], cur[-1][1], " ".join(x[2] for x in cur)))
    return cues


def write_srt(cues, path):
    with open(path, "w", encoding="utf-8") as f:
        for i, (s, e, t) in enumerate(cues, 1):
            f.write(f"{i}\n{ts_srt(s)} --> {ts_srt(e)}\n{wrap(t)}\n\n")


def wrap(text, max_chars=32):
    if len(text) <= max_chars:
        return text
    words, best = text.split(), None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        score = max(len(a), len(b))
        if best is None or score < best[0]:
            best = (score, a + "\n" + b)
    return best[1] if best else text


# ---------- ass ----------
def ts_ass(t):
    h, r = divmod(max(t, 0), 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02}:{s:05.2f}"


def ass_color(hexcol):
    h = hexcol.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H00{b}{g}{r}".upper()


def esc(t):
    return t.replace("\\", "\\\\").replace("{", "(").replace("}", ")")


def build_ass(W, H, events, a):
    portrait = H > W
    if a.style == "shorts":
        size = a.size or int(H * (0.055 if portrait else 0.075))
        outline, bold = max(2, size // 10), -1
    else:
        size = a.size or int(H * (0.038 if portrait else 0.05))
        outline, bold = max(2, size // 14), 0
    margin_v = int(H * (1 - a.position)) if a.position else (int(H * 0.30) if a.style == "shorts" else int(H * 0.06))
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{a.font},{size},{ass_color(a.color)},&H000000FF,&H00000000,&H80000000,{bold},0,0,0,100,100,0,0,1,{outline},{max(1, outline // 2)},2,{int(W * 0.08)},{int(W * 0.08)},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for s, e, text in events:
        lines.append(f"Dialogue: 0,{ts_ass(s)},{ts_ass(e)},Default,,0,0,0,,{text}")
    return header + "\n".join(lines) + "\n"


def shorts_events(words, a):
    """Chunks of up to N words; one event per word with that word highlighted."""
    hl = ass_color(a.highlight)
    chunks, cur = [], []
    for w in words:
        if cur and (len(cur) >= a.words or w[0] - cur[-1][1] > 0.5 or cur[-1][2][-1:] in ".?!,"):
            chunks.append(cur)
            cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    events = []
    for ci, chunk in enumerate(chunks):
        nxt = chunks[ci + 1][0][0] if ci + 1 < len(chunks) else chunk[-1][1] + 0.3
        for wi, (s, e, _) in enumerate(chunk):
            end = chunk[wi + 1][0] if wi + 1 < len(chunk) else min(nxt, e + 0.3)
            parts = []
            for wj, (_, _, t) in enumerate(chunk):
                t = esc(t.upper() if a.upper else t)
                parts.append(f"{{\\c{hl}}}{t}{{\\r}}" if wj == wi else t)
            events.append((s, max(end, s + 0.05), " ".join(parts)))
    return events


def words_from_cues(cues):
    """Spread each cue's duration over its words (for --srt input in shorts style)."""
    words = []
    for s, e, text in cues:
        toks = text.split()
        if not toks:
            continue
        step = (e - s) / len(toks)
        words += [(s + i * step, s + (i + 1) * step, t) for i, t in enumerate(toks)]
    return words


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("output", nargs="?")
    ap.add_argument("--srt", help="burn this existing .srt instead of transcribing")
    ap.add_argument("--srt-only", metavar="PATH", help="only transcribe and write an .srt")
    ap.add_argument("--style", choices=["shorts", "classic"], default="shorts")
    ap.add_argument("--model", default="small")
    ap.add_argument("--language", help="e.g. en, hi, es (auto-detected if omitted)")
    ap.add_argument("--font", default="Inter", help="installed font family name")
    ap.add_argument("--fonts-dir", help="folder with extra .ttf/.otf fonts")
    ap.add_argument("--size", type=int, help="font size in px (auto from height)")
    ap.add_argument("--color", default="#FFFFFF")
    ap.add_argument("--highlight", default="#FFD400", help="current-word colour (shorts)")
    ap.add_argument("--words", type=int, default=3, help="words on screen at once (shorts)")
    ap.add_argument("--position", type=float, help="vertical position of caption bottom, 0=top 1=bottom")
    ap.add_argument("--upper", action="store_true", help="UPPERCASE captions")
    ap.add_argument("--crf", default="20")
    a = ap.parse_args()

    if not a.output and not a.srt_only:
        ap.error("give an output video path, or --srt-only PATH")
    info = probe(a.input)

    if a.srt:
        cues = read_srt(a.srt)
        words = words_from_cues(cues)
    else:
        if not info["has_audio"]:
            sys.exit("No audio track to transcribe.")
        words = transcribe(a.input, a.model, a.language)
        cues = cues_from_words(words)
        srt_path = a.srt_only or os.path.splitext(a.output)[0] + ".srt"
        write_srt(cues, srt_path)
        print(f"Wrote transcript {srt_path}", file=sys.stderr)
        if a.srt_only:
            return
    if not cues:
        sys.exit("No speech found, so there are no captions to burn.")

    if a.style == "shorts":
        events = shorts_events(words, a)
    else:
        events = [(s, e, esc(wrap(t.upper() if a.upper else t)).replace("\n", "\\N")) for s, e, t in cues]

    tmp = tempfile.mkdtemp()
    ass_path = os.path.join(tmp, "captions.ass")
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(build_ass(info["width"], info["height"], events, a))
    vf = f"ass='{filter_path(ass_path)}'"
    if a.fonts_dir:
        vf += f":fontsdir='{filter_path(a.fonts_dir)}'"
    delivery = list(DELIVERY)
    delivery[delivery.index("-crf") + 1] = a.crf
    cmd = ffmpeg_base() + ["-i", a.input, "-vf", vf]
    cmd += ["-map", "0:v:0", "-map", "0:a:0?"]
    run(cmd + delivery + [a.output])
    print(f"Wrote {a.output} ({len(events)} caption events, style={a.style})", file=sys.stderr)


if __name__ == "__main__":
    main()
