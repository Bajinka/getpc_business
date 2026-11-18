---
name: video-editor
description: Edit videos with ffmpeg and bundled helper scripts — trim and cut, remove silences and dead air, join clips, zoom/punch-in and Ken Burns moves, zoom into a region of a screen recording, reframe to 9:16 / 1:1 / 16:9 for Reels, TikTok, Shorts and YouTube, auto-transcribe and burn in styled captions, add logo watermarks, text overlays, lower thirds, intros/outros, background music with ducking, loudness fixes, speed changes, GIFs, and compressed platform-ready exports. Use this skill whenever the user hands over or mentions a video file (.mp4, .mov, .mkv, .webm, screen recording, phone clip) and wants anything changed about it, or asks to make a short, reel, TikTok, product video, demo, tutorial or talking-head edit — even if they never say "ffmpeg" or "edit".
compatibility: Requires ffmpeg and ffprobe, and Python 3. Captions additionally need faster-whisper (pip install faster-whisper), installed on demand.
---

# Video Editor

You edit real video files with ffmpeg. The bundled scripts in `scripts/` handle the fiddly jobs (silence removal, captions, reframing, zooms) so you don't rebuild them each time; for everything else, `references/recipes.md` has tested ffmpeg commands.

Paths below are relative to this skill's folder. Run scripts as `python3 <skill-dir>/scripts/<name>.py --help` to see every option.

## Workflow

1. **Check the tools.** Run `ffmpeg -version`. If it is missing, install it (`apt-get install -y ffmpeg`, `brew install ffmpeg`, or `winget install ffmpeg`) or ask the user to.

2. **Probe the input first.** Run `python3 scripts/probe.py <file>`. It reports duration, resolution, orientation, fps, codecs, audio presence and rotation. Every later decision depends on this. A phone clip that "looks vertical" may be 1920x1080 with a rotation flag, and a file may have no audio track, which breaks audio filters.

3. **Plan, then confirm when it matters.** For a simple, clear request ("trim the first 5 seconds"), just do it. For multi-step edits, or when you'd be guessing at something subjective (where to zoom, which parts to cut, caption style), state the plan in a few lines and ask before doing a long render. Timestamps are cheap to confirm and renders are expensive to redo.

4. **Never overwrite the original.** Write to a new file named after what changed, such as `clip_trimmed.mp4` or `clip_9x16_captions.mp4`. Keep intermediate files in a temporary folder, and delete them at the end unless the user wants them.

5. **Work in as few encodes as possible.** Every re-encode loses quality. Chain filters in one ffmpeg command where you can, and use `-c copy` for pure cuts that don't need frame accuracy. When a pipeline needs several steps (for example reframe, then captions), it's fine to make the intermediates high quality (`-crf 16`) and let only the final export use the delivery settings.

6. **Verify the output.** Probe the result and check that the duration, resolution and audio are what you expect. Grab a frame at an interesting moment (`ffmpeg -ss <t> -i out.mp4 -frames:v 1 check.jpg`) and look at it whenever the edit is visual (captions, overlays, zoom, crop). Wrong caption placement or a cropped-off face is obvious in one frame and invisible in the ffprobe output.

7. **Report back briefly.** Give the output path, its duration and resolution, and what was done. Note any judgement calls you made, such as the silence threshold you used or where you centred the crop, so the user can ask for a tweak.

## Choosing the right tool

| The user wants… | Use |
|---|---|
| Info about a file | `scripts/probe.py` |
| Trim, cut out a section, split, join clips | `references/recipes.md` → Cutting |
| Remove pauses, dead air or silences ("tighten it up") | `scripts/remove_silence.py` |
| Punch-in zoom, slow zoom, zoom into part of a screen recording | `scripts/zoom.py` |
| Vertical, square or widescreen version | `scripts/reframe.py` |
| Subtitles or captions (burned in, or an .srt file) | `scripts/captions.py` |
| Logo, text, lower third, intro/outro, end card | `references/recipes.md` → Branding |
| Music, ducking, loudness, noise, muting | `references/recipes.md` → Audio |
| Speed up, slow-mo, reverse, freeze frame | `references/recipes.md` → Speed |
| Compress or export for a platform, or make a GIF | `references/recipes.md` → Export |

## Defaults that make videos look good

Apply these unless the user says otherwise. Explain a choice only if it's unusual.

- **Delivery encode:** H.264 + AAC, `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart`. `yuv420p` and `faststart` are what make files play everywhere, including iPhones and browsers.
- **Social shorts:** 1080x1920 at 30fps, captions on, big and centred in the lower-middle third (not at the very bottom, where app UI covers them), and under 60s unless asked otherwise. Silence removal is usually welcome on talking-heads.
- **Talking-head:** remove silences with a gentle threshold. When reframing to vertical, centre-crop and keep the face; if that cuts off important content, use the blurred-background mode.
- **Screen recordings:** never centre-crop to vertical, because you'll cut off the UI. Use blurred-background or padded mode, or zoom into the region that matters. Keep the frame rate, because text smears at low bitrates, so use `-crf 18`.
- **Product videos:** slow push-in zooms (Ken Burns) on stills and hero shots, clean text overlays, and music at about -18 dB under any voice.
- **Captions:** at most two short lines and about 32 characters per line. Use white text with a black outline, and the bold word-by-word style for shorts.
- **Loudness:** finish anything with speech using `loudnorm` at I=-14 LUFS, which is about what social platforms target. Add `-ar 48000`, because loudnorm otherwise outputs 96 kHz audio.

## Gotchas

- Timestamps: `-ss` before `-i` seeks fast and is frame-accurate when re-encoding. With `-c copy` it snaps to the nearest keyframe, so cuts can be off by a second or more. Re-encode when precision matters.
- Odd dimensions fail with libx264. Keep width and height even (`scale=trunc(iw/2)*2:trunc(ih/2)*2`).
- If there's no audio stream, drop audio filters and add `-an`, or generate silence with `anullsrc` when concatenating with clips that do have audio.
- Concatenating clips with different resolutions, fps or audio formats needs the `concat` filter after normalising them all, not the concat demuxer. See recipes.
- Paths with spaces, colons or apostrophes break inside `-vf` filter strings (subtitles, drawtext fontfile). Copy the file to a simple path, or escape it. The scripts handle this for you.
- Long renders: the scripts print ffmpeg progress. For videos over a few minutes, tell the user the render is running instead of going silent.
- In a sandbox without internet access, `faster-whisper` may fail to install or download its model. Tell the user captions need network access, and offer to burn in an `.srt` they supply instead (`captions.py --srt their.srt`).
