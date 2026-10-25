#!/usr/bin/env python3
"""
Thunder House ENT - New Music Scout & Ingestion Engine
Scouts weekly Hip-Hop, R&B, and Pop drops, downloads Clean & Dirty audio pairs
directly to E:\\Thunder House - Music\\Music of the Week, and auto-archives
previous week music into alphabetical artist folders.
"""

import os
import sys
import time
import json
import re
import urllib.request
import urllib.error
from datetime import datetime, timedelta
import subprocess

# Dependencies
try:
    import yt_dlp
except ImportError:
    yt_dlp = None

try:
    from mutagen.easyid3 import EasyID3
    from mutagen.mp3 import MP3
except ImportError:
    EasyID3 = None
    MP3 = None

SUPABASE_URL = "https://kxoivmflghfgtvawhktt.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4b2l2bWZsZ2hmZ3R2YXdoa3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTI5NTEsImV4cCI6MjEwNzIyODk1MX0.lrbLr6Q6tNwRWUGH7T3g6dL3jwU3TbaoUL1yRliBgTY"

DEFAULT_MUSIC_ROOT = r"E:\Thunder House - Music"
DEFAULT_SAVE_FOLDER = r"E:\Thunder House - Music\Music of the Week"

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def supabase_request(endpoint, method="GET", payload=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    data_bytes = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else []
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        log(f"Supabase HTTP {e.code} on {endpoint}: {err_msg}", "ERROR")
        return None
    except Exception as e:
        log(f"Supabase connection error: {e}", "ERROR")
        return None

def get_settings():
    """Retrieve music scout settings from Supabase or defaults"""
    data = supabase_request("thunderhouse_site_settings?key=eq.music_scout_settings&select=*")
    if data and len(data) > 0 and data[0].get("value"):
        return data[0]["value"]
    return {
        "enabled": True,
        "scout_time": "06:00",
        "save_folder": DEFAULT_SAVE_FOLDER,
        "auto_archive": True
    }

def sanitize_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def fetch_trending_releases():
    """Fetch new releases from official Hip-Hop and R&B feeds (iTunes Top Feeds)"""
    genres = [
        {"id": "18", "name": "Hip-Hop/Rap"},
        {"id": "15", "name": "R&B/Soul"},
        {"id": "14", "name": "Pop"}
    ]
    tracks = []
    seen = set()

    for g in genres:
        url = f"https://itunes.apple.com/us/rss/topsongs/limit=25/genre={g['id']}/json"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ThunderHouseMusicScout/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                entries = data.get("feed", {}).get("entry", [])
                for entry in entries:
                    artist = entry.get("im:artist", {}).get("label", "").strip()
                    title = entry.get("im:name", {}).get("label", "").strip()
                    release_date = entry.get("im:releaseDate", {}).get("label", "")
                    
                    # Clean up titles (e.g. remove "(feat. ...)" duplicates if needed)
                    key = f"{artist.lower()} - {title.lower()}"
                    if artist and title and key not in seen:
                        seen.add(key)
                        tracks.append({
                            "artist": artist,
                            "title": title,
                            "genre": g["name"],
                            "release_date": release_date
                        })
        except Exception as e:
            log(f"Failed fetching {g['name']} feed: {e}", "WARN")

    return tracks

def download_audio_version(artist, title, version_type, target_dir):
    """
    Downloads either Clean or Dirty version from YouTube using yt-dlp and ffmpeg.
    version_type: 'Clean' or 'Dirty'
    """
    if not yt_dlp:
        log("yt-dlp is not installed in Python environment.", "ERROR")
        return None

    os.makedirs(target_dir, exist_ok=True)
    clean_artist = sanitize_filename(artist)
    clean_title = sanitize_filename(title)
    filename_base = f"{clean_artist} - {clean_title} ({version_type})"
    out_template = os.path.join(target_dir, f"{filename_base}.%(ext)s")
    final_mp3 = os.path.join(target_dir, f"{filename_base}.mp3")

    if os.path.exists(final_mp3):
        log(f"Already exists on disk: {final_mp3}")
        return final_mp3

    # Build search query
    if version_type.lower() == "clean":
        query = f"ytsearch1:{artist} {title} clean radio edit official audio"
    else:
        query = f"ytsearch1:{artist} {title} explicit official audio"

    log(f"Searching YouTube for {version_type}: {query}...")

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': out_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'no_warnings': True,
        'default_search': 'ytsearch1',
        'noplaylist': True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(query, download=True)
            if not info or 'entries' not in info or len(info['entries']) == 0:
                log(f"No YouTube match found for {artist} - {title} ({version_type})", "WARN")
                return None
            
            # Tag MP3 with Mutagen
            if os.path.exists(final_mp3) and EasyID3:
                try:
                    audio = MP3(final_mp3, ID3=EasyID3)
                    audio['artist'] = artist
                    audio['title'] = f"{title} ({version_type})"
                    audio['album'] = "Thunder House Music of the Week"
                    audio['genre'] = "Hip-Hop / Urban"
                    audio.save()
                except Exception as tag_err:
                    log(f"Failed tagging {final_mp3}: {tag_err}", "WARN")

            log(f"Successfully downloaded {version_type} version: {final_mp3}", "SUCCESS")
            return final_mp3

    except Exception as e:
        log(f"Download failed for {artist} - {title} ({version_type}): {e}", "ERROR")
        return None

def archive_previous_week_music(music_root=DEFAULT_MUSIC_ROOT, save_folder=DEFAULT_SAVE_FOLDER):
    """
    Moves previous week's music from 'Music of the Week' into appropriate
    alphabetical artist folders (E:\Thunder House - Music\A-Z\Artist\).
    """
    clean_dir = os.path.join(save_folder, "Clean")
    dirty_dir = os.path.join(save_folder, "Dirty")
    dirs_to_check = [clean_dir, dirty_dir, save_folder]

    archived_count = 0
    log("Scanning for completed week tracks to archive alphabetically...")

    for d in dirs_to_check:
        if not os.path.exists(d):
            continue
        for fname in os.listdir(d):
            if not fname.lower().endswith(".mp3"):
                continue

            full_path = os.path.join(d, fname)
            # Inspect modification date - if older than 5 days or triggered
            # Format usually: "Artist - Title (Version).mp3"
            parts = fname.split(" - ", 1)
            if len(parts) >= 2:
                artist = parts[0].strip()
            else:
                artist = "Unknown"

            # Determine first letter folder
            first_char = artist[0].upper() if artist else "#"
            if not first_char.isalpha():
                first_char = "#"

            artist_folder = os.path.join(music_root, first_char, artist)
            os.makedirs(artist_folder, exist_ok=True)
            dest_path = os.path.join(artist_folder, fname)

            try:
                # Move file
                os.replace(full_path, dest_path)
                archived_count += 1
                log(f"Archived: {fname} -> {first_char}\\{artist}\\")
            except Exception as e:
                log(f"Error archiving {fname}: {e}", "ERROR")

    log(f"Archival complete. {archived_count} tracks moved to permanent library.")
    return archived_count

def run_scout_cycle():
    """Main scouting and ingestion pass"""
    settings = get_settings()
    if not settings.get("enabled", True):
        log("Music Scout Engine is currently disabled in Settings. Skipping run.")
        return

    save_folder = settings.get("save_folder", DEFAULT_SAVE_FOLDER)
    clean_dir = os.path.join(save_folder, "Clean")
    dirty_dir = os.path.join(save_folder, "Dirty")
    os.makedirs(clean_dir, exist_ok=True)
    os.makedirs(dirty_dir, exist_ok=True)

    log(f"Starting New Music Scout cycle. Target: {save_folder}")

    # 1. Fetch Trending Releases
    releases = fetch_trending_releases()
    log(f"Fetched {len(releases)} trending release candidates from charts.")

    # 2. Check existing scouted tracks in Supabase
    existing_db = supabase_request("thunderhouse_music_scout?select=artist,title,status") or []
    existing_set = {f"{r['artist'].lower()} - {r['title'].lower()}" for r in existing_db}

    # 3. Process new tracks (limit to top 10 per run to respect bandwidth)
    download_count = 0
    for track in releases[:12]:
        key = f"{track['artist'].lower()} - {track['title'].lower()}"
        if key in existing_set:
            continue

        log(f"Discovered New Track: {track['artist']} - {track['title']} ({track['genre']})")

        # Record as pending in Supabase
        inserted = supabase_request("thunderhouse_music_scout", method="POST", payload=[{
            "artist": track["artist"],
            "title": track["title"],
            "genre": track["genre"],
            "release_date": track.get("release_date"),
            "status": "downloading"
        }])
        record_id = inserted[0]["id"] if inserted and len(inserted) > 0 else None

        # Download Clean & Dirty pair
        clean_path = download_audio_version(track["artist"], track["title"], "Clean", clean_dir)
        dirty_path = download_audio_version(track["artist"], track["title"], "Dirty", dirty_dir)

        status = "downloaded" if (clean_path or dirty_path) else "skipped"

        # Update Supabase record
        if record_id:
            supabase_request(f"thunderhouse_music_scout?id=eq.{record_id}", method="PATCH", payload={
                "status": status,
                "clean_downloaded": bool(clean_path),
                "dirty_downloaded": bool(dirty_path),
                "clean_file_path": clean_path,
                "dirty_file_path": dirty_path,
                "downloaded_at": datetime.now().isoformat()
            })

        download_count += 1
        time.sleep(2)  # respectful delay between YouTube requests

    log(f"Scout pass finished. {download_count} new track pairs processed.")

def main():
    if "--archive-now" in sys.argv:
        archive_previous_week_music()
        return

    if "--run-now" in sys.argv:
        run_scout_cycle()
        return

    # Daemon mode: watches for manual triggers or 6:00 AM daily schedule
    log("Thunder House Music Scout Daemon started. Running in background...")
    last_run_day = None

    while True:
        try:
            settings = get_settings()
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            # Check for manual trigger in Supabase
            trigger = supabase_request("thunderhouse_site_settings?key=eq.music_scout_trigger&select=*")
            if trigger and len(trigger) > 0 and trigger[0].get("value"):
                req_time = trigger[0]["value"].get("requested_at")
                if req_time:
                    log(f"Received manual scout trigger from admin ({req_time})!")
                    run_scout_cycle()
                    # Clear trigger
                    supabase_request("thunderhouse_site_settings?key=eq.music_scout_trigger", method="PATCH", payload={"value": {}})

            # Check Daily Scheduled Time (Default 06:00 AM)
            target_time_str = settings.get("scout_time", "06:00")
            current_time_str = now.strftime("%H:%M")

            if current_time_str == target_time_str and last_run_day != today_str:
                last_run_day = today_str
                log(f"Daily scheduled run triggered at {current_time_str}!")
                run_scout_cycle()

                # If Sunday / Monday, run auto-archive of previous week
                if now.weekday() == 0 and settings.get("auto_archive", True):
                    log("Monday detected: Running end-of-week alphabetical library archive...")
                    archive_previous_week_music()

            time.sleep(30)
        except KeyboardInterrupt:
            log("Daemon stopped by user.")
            break
        except Exception as e:
            log(f"Unexpected daemon error: {e}", "ERROR")
            time.sleep(30)

if __name__ == "__main__":
    main()
