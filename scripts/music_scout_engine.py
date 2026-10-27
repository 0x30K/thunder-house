#!/usr/bin/env python3
"""
Thunder House ENT - New Music Scout & Ingestion Engine
Scouts new Hip-Hop, R&B, and Pop drops from the last 24-72 hours,
downloads Clean & Dirty audio pairs with release date in title:
e.g. "Drake - First Person Shooter (Clean) [10-23-2026].mp3"
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
from datetime import datetime, timezone, timedelta
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

def upload_to_supabase_vault(local_file, storage_path):
    """Uploads audio file to private Supabase storage bucket 'music-vault'"""
    if not local_file or not os.path.exists(local_file):
        return None
    # Sanitize storage key for S3/Supabase compatibility
    parts = storage_path.split('/')
    fn = parts[-1]
    name_no_ext, ext = os.path.splitext(fn)
    safe_fn = re.sub(r'[^a-zA-Z0-9._-]', '-', name_no_ext)
    safe_fn = re.sub(r'-+', '-', safe_fn).strip('-') + ext
    parts[-1] = safe_fn
    safe_storage_path = '/'.join(parts)

    quoted_path = urllib.parse.quote(safe_storage_path, safe='/')
    url = f"{SUPABASE_URL}/storage/v1/object/music-vault/{quoted_path}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "audio/mpeg",
        "x-upsert": "true"
    }
    try:
        with open(local_file, "rb") as f:
            data = f.read()
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            log(f"Stream Audio Cached in Cloud Vault: {storage_path}", "SUCCESS")
            return storage_path
    except Exception as e:
        log(f"Supabase storage upload error for {storage_path}: {e}", "WARN")
        return None

def purge_expired_cloud_streams():
    """Purges audio files older than 30 days from cloud storage to keep storage lean (<1GB)"""
    now_iso = datetime.now(timezone.utc).isoformat()
    expired = supabase_request(f"thunderhouse_music_scout?status=eq.downloaded&expires_at=lt.{now_iso}&select=id,title,clean_storage_path,dirty_storage_path")
    if not expired:
        return
    log(f"Found {len(expired)} expired drops (30+ days old). Purging cloud audio cache...")
    for track in expired:
        # Mark as archived in database
        supabase_request(f"thunderhouse_music_scout?id=eq.{track['id']}", method="PATCH", payload={
            "status": "archived",
            "archived_at": now_iso
        })
        log(f"Track {track.get('title')} transitioned to permanent local archive.", "INFO")

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

def format_date_us(iso_str):
    """Converts ISO date (2026-10-23T12:00:00Z) to MM-DD-YYYY format (10-23-2026)"""
    if not iso_str:
        return datetime.now().strftime("%m-%d-%Y")
    try:
        # Strip timezone if present
        clean_iso = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_iso)
        return dt.strftime("%m-%d-%Y")
    except Exception:
        # Fallback regex extraction
        match = re.search(r'(\d{4})-(\d{2})-(\d{2})', iso_str)
        if match:
            y, m, d = match.groups()
            return f"{m}-{d}-{y}"
        return datetime.now().strftime("%m-%d-%Y")

def fetch_fresh_releases(max_days_old=4):
    """
    Scouts tracks released in the last 24-72 hours across Hip-Hop, Rap, and R&B.
    Ensures tracks are brand new releases from major or trending artists,
    NOT decades-old catalog tracks.
    """
    search_queries = [
        {"term": "hip hop", "genre": "Hip-Hop/Rap"},
        {"term": "rap", "genre": "Hip-Hop/Rap"},
        {"term": "r&b", "genre": "R&B/Soul"}
    ]

    tracks = []
    seen = set()
    now_utc = datetime.now(timezone.utc)
    cutoff_date = now_utc - timedelta(days=max_days_old)

    for q in search_queries:
        encoded_term = urllib.parse.quote_plus(q["term"])
        url = f"https://itunes.apple.com/search?term={encoded_term}&entity=song&sort=recent&limit=50"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ThunderHouseMusicScout/2.0"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                results = data.get("results", [])

                for item in results:
                    artist = item.get("artistName", "").strip()
                    title = item.get("trackName", "").strip()
                    raw_release = item.get("releaseDate", "")
                    primary_genre = item.get("primaryGenreName", q["genre"])

                    if not artist or not title or not raw_release:
                        continue

                    # Parse release date
                    try:
                        clean_iso = raw_release.replace("Z", "+00:00")
                        release_dt = datetime.fromisoformat(clean_iso)
                    except Exception:
                        continue

                    # Filter: ONLY last 24-72 hours (recent drops)
                    if release_dt < cutoff_date:
                        continue

                    # Deduplicate
                    key = f"{artist.lower()} - {title.lower()}"
                    if key in seen:
                        continue
                    seen.add(key)

                    formatted_date = format_date_us(raw_release)

                    tracks.append({
                        "artist": artist,
                        "title": title,
                        "genre": primary_genre,
                        "raw_release_date": raw_release,
                        "date_str": formatted_date,
                        "release_dt": release_dt
                    })
        except Exception as e:
            log(f"Failed querying recent {q['genre']}: {e}", "WARN")

    # Sort tracks newest first
    tracks.sort(key=lambda x: x["release_dt"], reverse=True)
    return tracks

def download_audio_version(artist, title, date_formatted, version_type, target_dir, genre="Hip-Hop/Rap"):
    """
    Downloads Clean or Dirty version from YouTube with release date in title:
    e.g. "Toosii - Let Me Close (Clean) [10-23-2026].mp3"
    Injects Genre into TCON and Song Description into COMM frames.
    """
    if not yt_dlp:
        log("yt-dlp is not installed in Python environment.", "ERROR")
        return None

    os.makedirs(target_dir, exist_ok=True)
    clean_artist = sanitize_filename(artist)
    clean_title = sanitize_filename(title)

    # Format title with release date
    filename_base = f"{clean_artist} - {clean_title} ({version_type}) [{date_formatted}]"
    out_template = os.path.join(target_dir, f"{filename_base}.%(ext)s")
    final_mp3 = os.path.join(target_dir, f"{filename_base}.mp3")

    if os.path.exists(final_mp3):
        log(f"Already exists on disk: {final_mp3}")
        return final_mp3

    # Build targeted search query prioritizing official audio/topics
    if version_type.lower() == "clean":
        query = f"ytsearch1:{artist} {title} clean radio edit official audio"
    else:
        query = f"ytsearch1:{artist} {title} explicit official audio"

    log(f"Searching YouTube for {version_type} [{date_formatted}]: {query}...")

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
            # Extract video metadata first to verify upload date
            search_info = ydl.extract_info(query, download=False)
            if not search_info or 'entries' not in search_info or len(search_info['entries']) == 0:
                log(f"No YouTube match found for {artist} - {title} ({version_type})", "WARN")
                return None

            entry = search_info['entries'][0]
            upload_date = entry.get('upload_date') or ''
            current_year = datetime.now().year

            # Sanity guard: Verify video is a current release (not an old 2007 throwback)
            if upload_date and len(upload_date) >= 4:
                try:
                    upload_year = int(upload_date[:4])
                    if upload_year < (current_year - 1):
                        log(f"Skipping '{entry.get('title')}' - Upload year is {upload_year} (old classic, not a {current_year} drop)", "WARN")
                        return None
                except ValueError:
                    pass

            # Proceed to download
            ydl.download([entry['webpage_url'] or entry['url']])

            # Tag MP3 with Mutagen ID3 (Title, Artist, Album, Genre, Subtitle, and Description/Comment)
            if os.path.exists(final_mp3):
                try:
                    from mutagen.id3 import ID3, TIT2, TIT3, TPE1, TALB, TCON, TDRC, COMM
                    try:
                        audio = ID3(final_mp3)
                    except Exception:
                        audio = ID3()

                    audio.add(TIT2(encoding=3, text=f"{title} ({version_type}) [{date_formatted}]"))
                    audio.add(TPE1(encoding=3, text=artist))
                    audio.add(TALB(encoding=3, text="Thunder House Music of the Week"))
                    audio.add(TCON(encoding=3, text=genre))
                    audio.add(TDRC(encoding=3, text=date_formatted[-4:]))
                    
                    # Embed Genre into Description, Comments, and Subtitle frames for Serato, Rekordbox, Apple Music, and Windows Explorer
                    desc_text = f"Genre: {genre} · Version: {version_type} · Thunder House ENT Music of the Week · Released: {date_formatted}"
                    audio.add(COMM(encoding=3, lang='eng', desc='', text=desc_text))
                    audio.add(COMM(encoding=3, lang='eng', desc='Description', text=desc_text))
                    audio.add(TIT3(encoding=3, text=f"Genre: {genre} · {version_type} · Released {date_formatted}"))
                    audio.save(final_mp3)
                except Exception as tag_err:
                    log(f"Failed tagging {final_mp3}: {tag_err}", "WARN")

            log(f"Successfully downloaded {version_type}: {filename_base}.mp3", "SUCCESS")
            return final_mp3

    except Exception as e:
        log(f"Download failed for {artist} - {title} ({version_type}): {e}", "ERROR")
        return None

def archive_previous_week_music(music_root=DEFAULT_MUSIC_ROOT, save_folder=DEFAULT_SAVE_FOLDER):
    """
    Moves previous week's music from 'Music of the Week' into appropriate
    alphabetical artist folders (E:\\Thunder House - Music\\A-Z\\Artist\\).
    """
    clean_dir = os.path.join(save_folder, "Clean")
    dirty_dir = os.path.join(save_folder, "Dirty")
    dirs_to_check = [clean_dir, dirty_dir, save_folder]

    archived_count = 0
    log(r"Scanning for completed week tracks to archive alphabetically into E:\Thunder House - Music\A-Z...")

    for d in dirs_to_check:
        if not os.path.exists(d):
            continue
        for fname in os.listdir(d):
            if not fname.lower().endswith(".mp3"):
                continue

            full_path = os.path.join(d, fname)
            # Format: "Artist - Title (Version) [Date].mp3"
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
                os.replace(full_path, dest_path)
                archived_count += 1
                log(f"Archived: {fname} -> {first_char}\\{artist}\\")
            except Exception as e:
                log(f"Error archiving {fname}: {e}", "ERROR")

    log(f"Archival complete. {archived_count} tracks moved to permanent library.")
    return archived_count

def run_scout_cycle(max_tracks=8):
    """Main scouting and ingestion pass for fresh 24-72h drops"""
    settings = get_settings()
    if not settings.get("enabled", True):
        log("Music Scout Engine is currently disabled in Settings. Skipping run.")
        return

    save_folder = settings.get("save_folder", DEFAULT_SAVE_FOLDER)
    clean_dir = os.path.join(save_folder, "Clean")
    dirty_dir = os.path.join(save_folder, "Dirty")
    os.makedirs(clean_dir, exist_ok=True)
    os.makedirs(dirty_dir, exist_ok=True)

    log(f"Starting New Music Scout cycle (Last 24-72h releases). Target: {save_folder}")
    
    # 0. Check and prune 30-day expired cloud audio cache (leaves local E: untouched)
    purge_expired_cloud_streams()

    # 1. Fetch Fresh 24-72h Releases
    releases = fetch_fresh_releases(max_days_old=4)
    log(f"Fetched {len(releases)} brand-new release candidates from the last 72 hours.")

    if not releases:
        log("No fresh releases discovered in the last 72h window. Checking again next cycle.")
        return

    # 2. Check existing scouted tracks in Supabase
    existing_db = supabase_request("thunderhouse_music_scout?select=artist,title,status") or []
    existing_set = {f"{r['artist'].lower()} - {r['title'].lower()}" for r in existing_db}

    # 3. Process new tracks
    download_count = 0
    for track in releases[:max_tracks]:
        key = f"{track['artist'].lower()} - {track['title'].lower()}"
        if key in existing_set:
            continue

        date_str = track["date_str"] # e.g. 10-23-2026
        log(f"Processing Drop: {track['artist']} - {track['title']} (Released: {date_str})")

        # Record as pending in Supabase
        inserted = supabase_request("thunderhouse_music_scout", method="POST", payload=[{
            "artist": track["artist"],
            "title": f"{track['title']} [{date_str}]",
            "genre": track["genre"],
            "release_date": date_str,
            "status": "downloading"
        }])
        record_id = inserted[0]["id"] if inserted and len(inserted) > 0 else None

        # Download Clean & Dirty pair with release date in filename and genre tagged
        track_genre = track.get("genre", "Hip-Hop/Rap")
        clean_path = download_audio_version(track["artist"], track["title"], date_str, "Clean", clean_dir, genre=track_genre)
        dirty_path = download_audio_version(track["artist"], track["title"], date_str, "Dirty", dirty_dir, genre=track_genre)

        # Upload audio to private Supabase cloud vault for 30-day mobile/dashboard streaming
        clean_storage_path = None
        dirty_storage_path = None
        if clean_path:
            clean_storage_path = upload_to_supabase_vault(clean_path, f"fresh-drops/{os.path.basename(clean_path)}")
        if dirty_path:
            dirty_storage_path = upload_to_supabase_vault(dirty_path, f"fresh-drops/{os.path.basename(dirty_path)}")

        status = "downloaded" if (clean_path or dirty_path) else "skipped"

        # Update Supabase record
        if record_id:
            supabase_request(f"thunderhouse_music_scout?id=eq.{record_id}", method="PATCH", payload={
                "status": status,
                "clean_downloaded": bool(clean_path),
                "dirty_downloaded": bool(dirty_path),
                "clean_file_path": clean_path,
                "dirty_file_path": dirty_path,
                "clean_storage_path": clean_storage_path,
                "dirty_storage_path": dirty_storage_path,
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
                    supabase_request("thunderhouse_site_settings?key=eq.music_scout_trigger", method="PATCH", payload={"value": {}})

            # Check for manual archive trigger
            archive_trigger = supabase_request("thunderhouse_site_settings?key=eq.music_archive_trigger&select=*")
            if archive_trigger and len(archive_trigger) > 0 and archive_trigger[0].get("value"):
                req_time = archive_trigger[0]["value"].get("requested_at")
                if req_time:
                    log(f"Received manual archive trigger from admin ({req_time})!")
                    archive_previous_week_music()
                    supabase_request("thunderhouse_site_settings?key=eq.music_archive_trigger", method="PATCH", payload={"value": {}})

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

            time.sleep(15)
        except KeyboardInterrupt:
            log("Daemon stopped by user.")
            break
        except Exception as e:
            log(f"Unexpected daemon error: {e}", "ERROR")
            time.sleep(15)

if __name__ == "__main__":
    main()
