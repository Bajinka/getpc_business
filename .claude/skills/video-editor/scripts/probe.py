#!/usr/bin/env python3
"""Print a compact summary of one or more video files.

Usage: probe.py FILE [FILE ...] [--json]
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import probe  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()
    infos = [probe(f) for f in args.files]
    if args.json:
        print(json.dumps(infos if len(infos) > 1 else infos[0], indent=2))
        return
    for i in infos:
        m, s = divmod(i["duration"], 60)
        line = f"{i['path']}: {int(m)}:{s:05.2f} | {i['size_mb']} MB"
        if i["has_video"]:
            line += (f" | {i['width']}x{i['height']} {i['orientation']} @ {i['fps']}fps "
                     f"{i['vcodec']}/{i['pix_fmt']}")
            if i["rotation"]:
                line += f" (rotation {i['rotation']})"
        else:
            line += " | NO VIDEO"
        line += (f" | audio {i['acodec']} {i['sample_rate']}Hz {i['channels']}ch" if i["has_audio"]
                 else " | NO AUDIO")
        print(line)


if __name__ == "__main__":
    main()
