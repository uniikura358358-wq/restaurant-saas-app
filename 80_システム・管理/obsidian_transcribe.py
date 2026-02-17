import os
import re
import pyperclip
import shutil
from datetime import datetime

# --- 設定（佐藤さんのパス） ---
VAULT_ROOT = r"C:\Users\SATO\Documents\_ObsidianVault_Hub"
BASE_DIR = os.path.join(VAULT_ROOT, "91_文字起こし")
COMBINED_DIR = os.path.join(BASE_DIR, "結合済み")
ARCHIVE_DIR = os.path.join(VAULT_ROOT, "98_アーカイブ/文字起こし済み")
MAX_FILES = 10

# フォルダ作成
for d in [BASE_DIR, COMBINED_DIR, ARCHIVE_DIR]:
    os.makedirs(d, exist_ok=True)

def sanitize_filename(filename):
    return re.sub(r'[\\/*?:"<>|]', '_', filename)

def save_and_process():
    print("--- YouTube文字起こし保存システム (Python版) ---")
    channel_name = input("チャンネル名: ").strip() or "Unknown"
    video_title = input("動画タイトル: ").strip() or "Untitled"
    date_str = datetime.now().strftime("%Y-%m-%d")

    content = pyperclip.paste().strip()
    if not content:
        print("❌ エラー: クリップボードにテキストがありません。")
        return

    file_name = f"{date_str}_{sanitize_filename(video_title)}.md"
    file_path = os.path.join(BASE_DIR, file_name)

    markdown_text = f"""---
チャンネル名: {channel_name}
取得日: {date_str}
動画タイトル: {video_title}
---

# {video_title}

{content}
"""

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(markdown_text)
    print(f"✅ 保存完了: {file_path}")

    # 10本溜まったら自動結合
    files = [f for f in os.listdir(BASE_DIR) if f.endswith(".md") and os.path.isfile(os.path.join(BASE_DIR, f))]
    if len(files) >= MAX_FILES:
        print(f"🚀 {MAX_FILES}本に到達。結合を開始します...")
        combined_path = os.path.join(COMBINED_DIR, f"COMBINED_{datetime.now().strftime('%Y%m%d_%H%M')}.md")
        with open(combined_path, "w", encoding="utf-8") as out:
            for f_n in sorted(files):
                p = os.path.join(BASE_DIR, f_n)
                with open(p, "r", encoding="utf-8") as inv:
                    out.write(inv.read() + "\n\n---\n\n")
                shutil.move(p, os.path.join(ARCHIVE_DIR, f_n))
        print(f"✨ 結合済みファイル作成完了: {combined_path}")

if __name__ == "__main__":
    save_and_process()