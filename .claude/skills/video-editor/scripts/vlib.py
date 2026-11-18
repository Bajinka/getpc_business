"""Shared helpers for the video-editor scripts."""
import json
import shutil
import subprocess
import sys

DELIVERY = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart"]


def need_ffmpeg():
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"{tool} not found. Install ffmpeg first (apt-get install -y ffmpeg / brew install ffmpeg).")


def probe(path):
    """Return a compact dict describing the file."""
    need_ffmpeg()
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
        capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"ffprobe failed on {path}: {out.stderr.strip()}")
    data = json.loads(out.stdout)
    v = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in data["streams"] if s["codec_type"] == "audio"), None)
    info = {"path": path, "duration": float(data["format"].get("duration", 0) or 0),
            "size_mb": round(int(data["format"].get("size", 0)) / 1e6, 2),
            "has_video": v is not None, "has_audio": a is not None}
    if v:
        w, h = int(v["width"]), int(v["height"])
        rot = 0
        for sd in v.get("side_data_list", []) or []:
            if "rotation" in sd:
                rot = int(sd["rotation"])
        rot = rot or int((v.get("tags") or {}).get("rotate", 0))
        if abs(rot) in (90, 270):
            w, h = h, w  # displayed size
        num, den = (v.get("avg_frame_rate") or "0/1").split("/")
        fps = round(float(num) / float(den), 3) if float(den) else 0
        info.update({"width": w, "height": h, "rotation": rot, "fps": fps,
                     "vcodec": v.get("codec_name"), "pix_fmt": v.get("pix_fmt"),
                     "orientation": "vertical" if h > w else "horizontal" if w > h else "square"})
    if a:
        info.update({"acodec": a.get("codec_name"), "sample_rate": a.get("sample_rate"),
                     "channels": a.get("channels")})
    return info


def run(cmd, quiet=False):
    """Run ffmpeg, exit with its error if it fails."""
    if not quiet:
        print("+ " + " ".join(f'"{c}"' if " " in c else c for c in cmd), file=sys.stderr)
    r = subprocess.run(cmd, capture_output=quiet, text=True)
    if r.returncode != 0:
        sys.exit(f"ffmpeg failed ({r.returncode}).\n{(r.stderr or '')[-2000:]}")
    return r


def ffmpeg_base():
    return ["ffmpeg", "-hide_banner", "-loglevel", "error", "-stats", "-y"]


def filter_path(path):
    """Escape a path for use inside a filtergraph option (subtitles=, fontfile=)."""
    return path.replace("\\", "/").replace(":", "\\:").replace("'", "\\'").replace(",", "\\,")


def parse_time(t):
    """Accept 12.5, '1:02', '00:01:02.5' and return seconds."""
    if isinstance(t, (int, float)):
        return float(t)
    parts = [float(p) for p in str(t).split(":")]
    sec = 0.0
    for p in parts:
        sec = sec * 60 + p
    return sec


def even(n):
    return int(n) // 2 * 2
