#!/usr/bin/env python3
"""Cut silences / dead air out of a video (jump-cut style).

Detects quiet stretches with ffmpeg's silencedetect, keeps the rest (plus a little
padding so words aren't clipped) and renders them back-to-back in one encode.

Usage:
  remove_silence.py in.mp4 out.mp4                    # sensible defaults
  remove_silence.py in.mp4 out.mp4 --threshold -35 --min-silence 0.4 --pad 0.12
  remove_silence.py in.mp4 out.mp4 --dry-run          # just print what would be cut

Tuning: louder room / music bed -> raise threshold (e.g. -30). Clipping word endings ->
raise --pad. Cuts feel too choppy -> raise --min-silence (e.g. 0.7).
"""
import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import DELIVERY, ffmpeg_base, probe, run  # noqa: E402


def detect(path, threshold, min_sil):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af",
                        f"silencedetect=noise={threshold}dB:d={min_sil}", "-vn", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return starts, ends


def keep_segments(duration, starts, ends, pad):
    if len(ends) < len(starts):  # trailing silence runs to the end
        ends.append(duration)
    silences = [(max(0.0, s + pad), e - pad) for s, e in zip(starts, ends) if (e - pad) > (s + pad)]
    keep, cur = [], 0.0
    for s, e in silences:
        if s > cur:
            keep.append((cur, s))
        cur = max(cur, e)
    if cur < duration:
        keep.append((cur, duration))
    return [(a, b) for a, b in keep if b - a > 0.05]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--threshold", type=float, default=-35, help="dB below which counts as silence (default -35)")
    ap.add_argument("--min-silence", type=float, default=0.5, help="shortest pause to cut, seconds (default 0.5)")
    ap.add_argument("--pad", type=float, default=0.12, help="seconds of breathing room kept around speech")
    ap.add_argument("--crf", default="20")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    info = probe(a.input)
    if not info["has_audio"]:
        sys.exit("Input has no audio track, so there is nothing to detect silence in.")
    starts, ends = detect(a.input, a.threshold, a.min_silence)
    segs = keep_segments(info["duration"], starts, ends, a.pad)
    kept = sum(b - x for x, b in segs)
    print(f"{len(segs)} segments kept: {kept:.1f}s of {info['duration']:.1f}s "
          f"(removing {info['duration'] - kept:.1f}s)", file=sys.stderr)
    if a.dry_run:
        for x, b in segs:
            print(f"keep {x:8.2f} -> {b:8.2f}")
        return
    if not segs:
        sys.exit("Everything is below the threshold; try a lower --threshold (e.g. -45).")

    # Build a select-based filter: one encode, frame accurate, A/V stay in sync.
    expr = "+".join(f"between(t,{x:.3f},{b:.3f})" for x, b in segs)
    vf = f"select='{expr}',setpts=N/FRAME_RATE/TB"
    af = f"aselect='{expr}',asetpts=N/SR/TB"
    script = a.output + ".filter.txt"
    with open(script, "w") as f:
        f.write(f"[0:v]{vf}[v];[0:a]{af}[a]")
    delivery = list(DELIVERY)
    delivery[delivery.index("-crf") + 1] = a.crf
    try:
        run(ffmpeg_base() + ["-i", a.input, "-filter_complex_script", script, "-map", "[v]", "-map", "[a]"]
            + delivery + [a.output])
    finally:
        os.remove(script)
    print(f"Wrote {a.output} ({probe(a.output)['duration']:.1f}s)", file=sys.stderr)


if __name__ == "__main__":
    main()
