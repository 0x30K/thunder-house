THUNDER UNIVERSITY LOCAL AUDIO VAULT
=====================================
You can drop your real MP3/WAV/M4A/FLAC audio files here to play them directly inside Thunder University!

Organization Options:
---------------------
Option A (Artist Folder Organization):
  assets/audio/library/michael-jackson/billie-jean.mp3
  assets/audio/library/prince/purple-rain.mp3

Option B (Flat File Organization):
  assets/audio/library/michael-jackson-billie-jean.mp3
  assets/audio/library/prince-purple-rain.mp3

Automated Music Folder Scanner:
-------------------------------
You don't have to copy files by hand! Whenever you organize your music folder, you can run our automated scanner tool:
  cd "tools"
  python scan_music_library.py "D:\Your\Music\Folder" --action symlink

This tool automatically detects all 307 artists and 1,535 curriculum tracks, creating instant zero-disk symlinks or copies!

Playback Behavior:
------------------
Whenever you click any study track in Thunder University:
1. It automatically looks in your Local Studio Vault first.
2. If found, it plays your genuine high-fidelity local file with ear-training tempo controls.
3. If not found, it seamlessly streams the full official track via YouTube Master Audio with picture-in-picture visualizer!
