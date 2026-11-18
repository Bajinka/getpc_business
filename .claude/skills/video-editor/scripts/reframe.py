#!/usr/bin/env python3
"""Reframe a video to another aspect ratio (9:16 shorts, 1:1, 4:5, 16:9).

Modes:
  crop  - fill the frame by cropping. --x/--y (0..1) choose the centre of the crop,
          e.g. --x 0.3 keeps the left-of-centre subject. Best for talking-heads.
  blur  - fit the whole video, fill the empty space with a blurred, zoomed copy.
          Best for screen recordings and wide product shots.
  pad   - fit the whole video on a solid colour (--color, default black).

Usage:
  reframe.py in.mp4 out.mp4 --aspect 9:16 --mode crop --x 0.5
  reframe.py demo.mp4 demo_vertical.mp4 --aspect 9:16 --mode blur
  reframe.py in.mp4 out.mp4 --aspect 1:1 --mode pad --color white --height 1080
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import DELIVERY, even, ffmpeg_base, probe, run  # noqa: E402

DEFAULT_SIZE = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080), "4:5": (1080, 1350)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--aspect", default="9:16", help="W:H, e.g. 9:16, 1:1, 4:5, 16:9")
    ap.add_argument("--mode", choices=["crop", "blur", "pad"], default="crop")
    ap.add_argument("--x", type=float, default=0.5, help="crop centre, 0=left 1=right")
    ap.add_argument("--y", type=float, default=0.5, help="crop centre, 0=top 1=bottom")
    ap.add_argument("--height", type=int, help="output height (width follows aspect)")
    ap.add_argument("--color", default="black", help="pad colour")
    ap.add_argument("--fps", help="force output fps, e.g. 30")
    ap.add_argument("--crf", default="20")
    a = ap.parse_args()

    info = probe(a.input)
    aw, ah = (float(p) for p in a.aspect.split(":"))
    if a.height:
        W, H = even(a.height * aw / ah), even(a.height)
    else:
        W, H = DEFAULT_SIZE.get(a.aspect, (even(1080 * aw / ah), 1080))

    if a.mode == "crop":
        # crop the largest region of the target aspect, centred on (x, y), then scale.
        cw = f"min(iw,ih*{aw}/{ah})"
        ch = f"min(ih,iw*{ah}/{aw})"
        cx = f"max(0,min(iw-{cw},iw*{a.x}-{cw}/2))"
        cy = f"max(0,min(ih-{ch},ih*{a.y}-{ch}/2))"
        fc = (f"[0:v]crop=w='trunc({cw}/2)*2':h='trunc({ch}/2)*2':x='{cx}':y='{cy}',"
              f"scale={W}:{H},setsar=1[v]")
    elif a.mode == "blur":
        fc = (f"[0:v]split[bg][fg];"
              f"[bg]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:2,eq=brightness=-0.05[b];"
              f"[fg]scale={W}:{H}:force_original_aspect_ratio=decrease[f];"
              f"[b][f]overlay=(W-w)/2:(H-h)/2,setsar=1[v]")
    else:
        fc = (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
              f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={a.color},setsar=1[v]")
    if a.fps:
        fc = fc[:-3] + f",fps={a.fps}[v]"

    delivery = list(DELIVERY)
    delivery[delivery.index("-crf") + 1] = a.crf
    cmd = ffmpeg_base() + ["-i", a.input, "-filter_complex", fc, "-map", "[v]"]
    cmd += ["-map", "0:a:0"] if info["has_audio"] else ["-an"]
    run(cmd + delivery + [a.output])
    print(f"Wrote {a.output} ({W}x{H}, mode={a.mode})", file=sys.stderr)


if __name__ == "__main__":
    main()
