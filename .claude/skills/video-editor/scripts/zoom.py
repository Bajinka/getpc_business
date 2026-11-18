#!/usr/bin/env python3
"""Zoom effects: punch-ins, smooth zooms to a point or region, and Ken Burns moves.

Each --at event is  START-END:ZOOM[@X,Y]  or  START-END:rect=X,Y,W,H
  START/END  seconds or m:ss
  ZOOM       1.0 = no zoom, 1.3 = 30% punch-in, 2 = double
  @X,Y       focus point as fractions of the frame (0..1), default centre 0.5,0.5
  rect=...   a region in source pixels (e.g. a button in a screen recording); the zoom
             level and focus are worked out so that region fills the frame.

--ease is the ramp time in seconds (default 0.4, smooth in and out).
--ease 0 gives hard jump-cut punch-ins, the classic talking-head style.

Examples:
  zoom.py talk.mp4 out.mp4 --at 3-6:1.3 --at 12.5-15:1.25@0.5,0.35 --ease 0
  zoom.py screen.mp4 out.mp4 --at 0:04-0:09:rect=1200,80,500,300
  zoom.py product.mp4 out.mp4 --kenburns 1.0 1.15 --focus 0.5,0.4     # slow push-in for the whole clip
Do not overlap events; leave at least 2x ease between them.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import DELIVERY, ffmpeg_base, parse_time, probe, run  # noqa: E402


def parse_event(spec, W, H):
    m = re.match(r"^([\d:.]+)-([\d:.]+):(.+)$", spec)
    if not m:
        sys.exit(f"Bad --at '{spec}'. Use START-END:ZOOM[@X,Y] or START-END:rect=X,Y,W,H")
    s, e, rest = parse_time(m.group(1)), parse_time(m.group(2)), m.group(3)
    if rest.startswith("rect="):
        x, y, w, h = (float(v) for v in rest[5:].split(","))
        z = min(W / w, H / h)
        fx, fy = (x + w / 2) / W, (y + h / 2) / H
    else:
        z, _, focus = rest.partition("@")
        z = float(z)
        fx, fy = (float(v) for v in focus.split(",")) if focus else (0.5, 0.5)
    if e <= s:
        sys.exit(f"Event '{spec}' ends before it starts.")
    return s, e, max(1.0, z), fx, fy


def envelope(s, e, ease):
    if ease <= 0:
        return f"between(t,{s:.3f},{e:.3f})"
    r = min(ease, (e - s) / 2)
    lin = f"clip((t-{s:.3f})/{r:.3f},0,1)*clip(({e:.3f}-t)/{r:.3f},0,1)"
    return f"(({lin})*({lin})*(3-2*({lin})))"  # smoothstep


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--at", action="append", default=[], help="zoom event (repeatable)")
    ap.add_argument("--ease", type=float, default=0.4)
    ap.add_argument("--kenburns", nargs=2, type=float, metavar=("FROM", "TO"),
                    help="zoom linearly from FROM to TO over the whole clip")
    ap.add_argument("--focus", default="0.5,0.5", help="focus point for --kenburns")
    ap.add_argument("--crf", default="20")
    a = ap.parse_args()

    info = probe(a.input)
    W, H, D = info["width"], info["height"], info["duration"]
    if not a.at and not a.kenburns:
        sys.exit("Give at least one --at event or --kenburns.")

    if a.kenburns:
        z0, z1 = a.kenburns
        fx, fy = (float(v) for v in a.focus.split(","))
        z = f"({z0}+({z1}-{z0})*t/{D:.3f})"
        cx, cy = str(fx), str(fy)
    else:
        events = [parse_event(s, W, H) for s in a.at]
        zt, xt, yt = ["1"], ["0.5"], ["0.5"]
        for s, e, zz, fx, fy in events:
            env = envelope(s, e, a.ease)
            zt.append(f"{zz - 1:.4f}*{env}")
            xt.append(f"{fx - 0.5:.4f}*{env}")
            yt.append(f"{fy - 0.5:.4f}*{env}")
        z, cx, cy = "+".join(zt), "+".join(xt), "+".join(yt)

    # Upscale per frame by z, then place it on a fixed W x H canvas so the focus point is
    # centred. (crop can't be used here: it doesn't follow per-frame input size changes.)
    fps = info["fps"] or 30
    fc = (f"color=black:s={W}x{H}:r={fps}[c];"
          f"[0:v]scale=w='trunc(iw*({z})/2)*2':h='trunc(ih*({z})/2)*2':eval=frame:flags=bicubic[s];"
          f"[c][s]overlay=x='-clip(w*({cx})-W/2,0,w-W)':y='-clip(h*({cy})-H/2,0,h-H)':shortest=1,"
          f"setsar=1[v]")
    delivery = list(DELIVERY)
    delivery[delivery.index("-crf") + 1] = a.crf
    cmd = ffmpeg_base() + ["-i", a.input, "-filter_complex", fc, "-map", "[v]"]
    cmd += ["-map", "0:a:0"] if info["has_audio"] else ["-an"]
    run(cmd + delivery + [a.output])
    print(f"Wrote {a.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
