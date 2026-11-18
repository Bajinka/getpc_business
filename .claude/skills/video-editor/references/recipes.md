# ffmpeg recipes

Tested commands for the jobs the scripts don't cover. `$ENC` stands for the delivery settings:
`-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart`.
Add `-hide_banner -y` to taste.

## Contents
- [Cutting](#cutting): trim, cut out a middle section, split, join
- [Branding](#branding): logo, text, lower third, intro/outro, end card
- [Audio](#audio): music + ducking, loudness, noise, mute, replace, extract
- [Speed](#speed): speed up, slow-mo, reverse, freeze frame
- [Visual fixes](#visual-fixes): rotate, flip, colour, stabilise, fades, crop
- [Images to video](#images-to-video): slideshow, still with audio
- [Export](#export): platform presets, compress to a size, GIF, thumbnails

---

## Cutting

**Trim, frame-accurate** (re-encodes):
```bash
ffmpeg -ss 00:00:05 -to 00:00:42.5 -i in.mp4 $ENC out.mp4
```
**Trim, instant, no quality loss** (cuts snap to keyframes, so they may be off by up to ~2s):
```bash
ffmpeg -ss 5 -to 42.5 -i in.mp4 -c copy -avoid_negative_ts make_zero out.mp4
```
Note: when `-ss` comes before `-i`, `-to` counts from the original timeline in ffmpeg ≥ 5. Use `-t <duration>` if you'd rather give a length.

**Cut out a middle section** (keep 0–10 and 25–end):
```bash
ffmpeg -i in.mp4 -filter_complex \
 "[0:v]trim=0:10,setpts=PTS-STARTPTS[v0];[0:a]atrim=0:10,asetpts=PTS-STARTPTS[a0]; \
  [0:v]trim=start=25,setpts=PTS-STARTPTS[v1];[0:a]atrim=start=25,asetpts=PTS-STARTPTS[a1]; \
  [v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" $ENC out.mp4
```
To keep several ranges, add more trim pairs and raise `n`. For many ranges, the `select` approach used in `scripts/remove_silence.py` is shorter.

**Split into equal chunks** (for example 60s parts for Stories):
```bash
ffmpeg -i in.mp4 -c copy -map 0 -f segment -segment_time 60 -reset_timestamps 1 part_%02d.mp4
```

**Join clips that share the same codec, size and fps** (lossless):
```bash
printf "file '%s'\n" clip1.mp4 clip2.mp4 clip3.mp4 > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy joined.mp4
```
**Join clips that differ** (phone and screen recordings, different sizes): normalise each one, then concat.
```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
 "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v0]; \
  [1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v1]; \
  [0:a]aformat=sample_rates=48000:channel_layouts=stereo[a0];[1:a]aformat=sample_rates=48000:channel_layouts=stereo[a1]; \
  [v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" $ENC joined.mp4
```
If a clip has no audio, give it silence first: add `-f lavfi -t <dur> -i anullsrc=r=48000:cl=stereo` as an input and use that as its audio.

**Crossfade between two clips** (offset = clip A duration minus fade length):
```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
 "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=9.5,format=yuv420p[v];[0:a][1:a]acrossfade=d=0.5[a]" \
 -map "[v]" -map "[a]" $ENC out.mp4
```
Other transitions include `wipeleft`, `slideup`, `circleopen`, `dissolve`, `smoothleft` and `zoomin`. Both inputs need the same size and fps.

---

## Branding

**Logo watermark** in the top-right corner, 12% of the video width, at 85% opacity:
```bash
ffmpeg -i in.mp4 -i logo.png -filter_complex \
 "[1:v][0:v]scale2ref=w=iw*0.12:h=ow/mdar[l][base];[l]format=rgba,colorchannelmixer=aa=0.85[lo]; \
  [base][lo]overlay=W-w-W*0.03:H*0.03" $ENC out.mp4
```
Positions: top-left `W*0.03:H*0.03`, bottom-right `W-w-W*0.03:H-h-H*0.03`. Show it only for part of the video by adding `:enable='between(t,2,8)'` to `overlay`.

**Text overlay / title** (find a font with `fc-list | grep -i <name>`):
```bash
ffmpeg -i in.mp4 -vf "drawtext=fontfile=/path/Inter-Bold.ttf:text='NEW RTX 5090 BUILD':fontsize=h*0.06:fontcolor=white:borderw=4:bordercolor=black@0.8:x=(w-tw)/2:y=h*0.12:enable='between(t,0,3)'" $ENC out.mp4
```
For text containing `:`, `'` or `%`, put it in a file and use `textfile=title.txt`, which avoids escaping problems.
To fade the text in, add `:alpha='if(lt(t,0.4),t/0.4,1)'`.

**Lower third** (name and title over a translucent bar, from 1s to 6s):
```bash
ffmpeg -i in.mp4 -vf "\
drawbox=x=0:y=ih*0.78:w=iw*0.55:h=ih*0.13:color=black@0.55:t=fill:enable='between(t,1,6)',\
drawtext=fontfile=/path/Inter-Bold.ttf:text='Alex Rivera':fontsize=h*0.045:fontcolor=white:x=w*0.04:y=h*0.795:enable='between(t,1,6)',\
drawtext=fontfile=/path/Inter-Regular.ttf:text='Founder, GetPC':fontsize=h*0.03:fontcolor=0xFFD400:x=w*0.04:y=h*0.855:enable='between(t,1,6)'" $ENC out.mp4
```

**Intro/outro clip**: render or receive it at the same size and fps, then use the "Join clips that differ" recipe above.

**End card from a still image** (5s, with a fade in), then join it to the end:
```bash
ffmpeg -loop 1 -t 5 -i endcard.png -f lavfi -t 5 -i anullsrc=r=48000:cl=stereo \
 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,fade=in:d=0.5,format=yuv420p" \
 -shortest $ENC endcard.mp4
```

**Progress bar** along the bottom (for shorts):
```bash
ffmpeg -i in.mp4 -filter_complex "color=c=0xFFD400:s=1080x12[bar];[0:v][bar]overlay=x='-w+w*t/DURATION':y=H-h:shortest=1" $ENC out.mp4
```
Replace DURATION with the clip length in seconds, taken from probe.py.

---

## Audio

**Background music under a voice, with automatic ducking**:
```bash
ffmpeg -i in.mp4 -stream_loop -1 -i music.mp3 -filter_complex \
 "[1:a]volume=0.35,afade=in:d=1[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck]; \
  [0:a][duck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest out.mp4
```
For music only, with no voice: `-filter_complex "[1:a]volume=0.8,afade=in:d=1,afade=out:st=<dur-2>:d=2[a]" -map 0:v -map "[a]" -shortest`.

`loudnorm` resamples to 96 kHz internally, so always add `-ar 48000` to the output when using it.

**Normalise loudness** (for social, -14 LUFS; for podcasts and YouTube talking-heads, -16 is fine):
```bash
ffmpeg -i in.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v copy -c:a aac -b:a 160k -ar 48000 out.mp4
```

**Clean up voice** (rumble, hiss and harshness), a gentle chain that works for most phone and webcam audio:
```bash
ffmpeg -i in.mp4 -af "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=10:release=200,loudnorm=I=-14:TP=-1.5" -c:v copy -c:a aac -b:a 160k -ar 48000 out.mp4
```

**Mute** with `-an`. **Replace audio**: `-i video.mp4 -i new.wav -map 0:v -map 1:a -c:v copy -shortest`.
**Extract audio**: `ffmpeg -i in.mp4 -vn -c:a libmp3lame -q:a 2 audio.mp3`.
**Mute one section** (8–12s): `-af "volume=enable='between(t,8,12)':volume=0"`.

---

## Speed

**2x speed** (video and audio):
```bash
ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=PTS/2[v];[0:a]atempo=2[a]" -map "[v]" -map "[a]" $ENC out.mp4
```
`atempo` accepts 0.5–100. For a timelapse at 8x with no audio: `-vf setpts=PTS/8 -an`.

**Slow motion at 0.5x**: use `setpts=PTS*2` and `atempo=0.5`. For smoother slow-mo from 30fps footage, add `minterpolate=fps=60:mi_mode=mci` after setpts. It's slow to render, but it looks much better.

**Speed up only one section** (10–20s at 3x): split it into three parts with trim/atrim, apply setpts/atempo to the middle one, then concat. See "Cut out a middle section".

**Reverse** (for short clips only, since it's memory-heavy): `-vf reverse -af areverse`.

**Freeze frame** at 5s for 2s:
```bash
ffmpeg -i in.mp4 -vf "tpad=stop_mode=clone:stop_duration=0,loop=loop=60:size=1:start=150,setpts=N/FRAME_RATE/TB" -af "apad=pad_dur=2" $ENC out.mp4
```
Here `start` is the frame number (5s × 30fps = 150) and `loop` is the number of frames (2s × 30fps = 60). Audio continues, so for silent freezes, splitting the clip is cleaner.

---

## Visual fixes

- Rotate 90° clockwise: `-vf transpose=1` (counter-clockwise is `transpose=2`, and 180° is `transpose=1,transpose=1`)
- Mirror: `-vf hflip`
- Brighter, punchier colour: `-vf "eq=brightness=0.04:contrast=1.08:saturation=1.2"`
- Sharpen slightly: `-vf unsharp=5:5:0.6`
- Fade in and out of black: `-vf "fade=in:d=0.5,fade=out:st=<dur-0.5>:d=0.5" -af "afade=in:d=0.5,afade=out:st=<dur-0.5>:d=0.5"`
- Crop to a region (w:h:x:y): `-vf crop=1280:720:320:180`
- Blur a region (for example an email address in a screen recording):
  ```bash
  ffmpeg -i in.mp4 -filter_complex "[0:v]crop=400:60:100:900,boxblur=12[b];[0:v][b]overlay=100:900:enable='between(t,3,9)'" $ENC out.mp4
  ```
- Stabilise shaky phone footage, in two passes (needs ffmpeg built with vidstab: check `ffmpeg -filters | grep vidstab`):
  ```bash
  ffmpeg -i in.mp4 -vf vidstabdetect=shakiness=6:result=t.trf -f null -
  ffmpeg -i in.mp4 -vf vidstabtransform=input=t.trf:smoothing=20,unsharp=5:5:0.6 $ENC out.mp4
  ```
  Without vidstab, use `-vf deshake`, which is weaker.

---

## Images to video

**Slideshow** (3s per image, each one fitted to 1080x1920):
```bash
ffmpeg -framerate 1/3 -pattern_type glob -i 'photos/*.jpg' \
 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" \
 -c:v libx264 -crf 20 -movflags +faststart slideshow.mp4
```
For a product feel, render each photo to a clip with `scripts/zoom.py --kenburns 1.0 1.12`, then crossfade the clips together.

**Still image plus voiceover**:
```bash
ffmpeg -loop 1 -i cover.jpg -i voice.mp3 -c:v libx264 -tune stillimage -pix_fmt yuv420p -c:a aac -shortest out.mp4
```

---

## Export

| Target | Size | Notes |
|---|---|---|
| Reels / TikTok / Shorts | 1080x1920, 30fps | `-crf 20 -maxrate 8M -bufsize 16M`, ≤ 90s for Reels, ≤ 60s safe for Shorts |
| Instagram feed | 1080x1350 (4:5) or 1080x1080 | same settings |
| YouTube | source size, keep fps | `-crf 18`, `-b:a 192k` |
| LinkedIn / X | 1920x1080 or 1080x1350 | keep under 200 MB / 512 MB |
| WhatsApp / email | 720p | `-vf scale=-2:720 -crf 26 -b:a 96k` |
| Website hero loop | 1280–1920 wide, muted | `-an -crf 26 -movflags +faststart`, plus a WebM: `-c:v libvpx-vp9 -crf 34 -b:v 0` |

**Compress to fit a size limit** (for example 25 MB), using two-pass at a computed bitrate:
```bash
# kbps = (size_MB * 8192 / duration_s) - audio_kbps
ffmpeg -y -i in.mp4 -c:v libx264 -b:v 2500k -pass 1 -an -f null /dev/null && \
ffmpeg -i in.mp4 -c:v libx264 -b:v 2500k -pass 2 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart out.mp4
```
On Windows, use `NUL` instead of `/dev/null`.

**High-quality GIF** (palette method):
```bash
ffmpeg -ss 3 -t 4 -i in.mp4 -filter_complex "fps=12,scale=600:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" out.gif
```

**Thumbnails**: for one frame, use `ffmpeg -ss 7 -i in.mp4 -frames:v 1 -q:v 2 thumb.jpg`. For a contact sheet, use `ffmpeg -i in.mp4 -vf "fps=1/5,scale=320:-1,tile=4x3" -frames:v 1 sheet.jpg`. A contact sheet is a good way to look at a whole video and find moments to cut or zoom.
