---
name: video-editing
description: Use when the user wants to edit a video or audio file - trim, cut, merge, resize, crop to vertical (Reels/Shorts/TikTok), add or burn subtitles, add music or a logo, change speed, extract audio, make a GIF, compress, or convert formats. Uses ffmpeg.
---

# Video editing with ffmpeg

## Workflow
1. Check ffmpeg exists: `ffmpeg -version`. If missing, tell the user how to install it
   (Mac: `brew install ffmpeg`, Windows: `winget install ffmpeg`, Linux: `apt-get install -y ffmpeg`).
2. Inspect every input first:
   `ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact input.mp4`
3. Never overwrite the source. Write results to an `output/` folder with a descriptive name.
4. Ask only if something important is unclear (e.g. which part to keep). Otherwise pick sensible defaults.
5. When done, report the output path, duration, resolution and file size.

## Recipes
- **Trim (fast, no re-encode):** `ffmpeg -ss 00:00:05 -to 00:00:20 -i in.mp4 -c copy output/clip.mp4`
- **Trim (frame-accurate):** `ffmpeg -ss 5 -to 20 -i in.mp4 -c:v libx264 -crf 20 -c:a aac output/clip.mp4`
- **Merge clips:** write `list.txt` with lines `file 'a.mp4'`, then
  `ffmpeg -f concat -safe 0 -i list.txt -c copy output/merged.mp4`
  (if clips differ in size/codec, re-encode instead of `-c copy`).
- **Vertical 9:16 (Reels/Shorts/TikTok):**
  `ffmpeg -i in.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:a copy output/vertical.mp4`
- **Square 1:1:** `-vf "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080"`
- **Burn subtitles:** `ffmpeg -i in.mp4 -vf subtitles=subs.srt output/subbed.mp4`
- **Replace audio with music:** `ffmpeg -i in.mp4 -i music.mp3 -map 0:v -map 1:a -shortest -c:v copy output/with-music.mp4`
- **Mix music under voice:**
  `ffmpeg -i in.mp4 -i music.mp3 -filter_complex "[1:a]volume=0.2[m];[0:a][m]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]" -c:v copy output/mixed.mp4`
- **Logo watermark (top-right):**
  `ffmpeg -i in.mp4 -i logo.png -filter_complex "[1]scale=150:-1[l];[0][l]overlay=W-w-20:20" output/logo.mp4`
- **Text overlay:** `-vf "drawtext=text='Big Sale':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=h-150:box=1:boxcolor=black@0.5"`
  (escape special characters: write \\% for a percent sign, or use `textfile=` instead)
- **Speed 2x:** `ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" -map "[v]" -map "[a]" output/fast.mp4`
- **Fade in/out (video length D seconds):** `-vf "fade=in:0:d=1,fade=out:st=D-1:d=1" -af "afade=in:d=1,afade=out:st=D-1:d=1"`
- **Extract audio:** `ffmpeg -i in.mp4 -vn -c:a libmp3lame -q:a 2 output/audio.mp3`
- **Remove audio:** `ffmpeg -i in.mp4 -an -c:v copy output/muted.mp4`
- **Compress for web/WhatsApp:** `ffmpeg -i in.mp4 -vcodec libx264 -crf 28 -preset medium -vf "scale=-2:720" -c:a aac -b:a 128k output/small.mp4`
- **GIF:** `ffmpeg -i in.mp4 -ss 0 -t 4 -vf "fps=12,scale=480:-1:flags=lanczos" output/clip.gif`
- **Thumbnail:** `ffmpeg -ss 00:00:03 -i in.mp4 -frames:v 1 output/thumb.jpg`
- **Convert format:** `ffmpeg -i in.mov -c:v libx264 -c:a aac output/converted.mp4`

## Defaults
- Codec H.264 (`libx264`) + AAC, `-crf 20` for quality, `-pix_fmt yuv420p` for phone compatibility.
- Add `-movflags +faststart` for videos meant for websites.
