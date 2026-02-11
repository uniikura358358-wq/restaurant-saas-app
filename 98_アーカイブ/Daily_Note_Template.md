---
created_at: <% tp.date.now("YYYY-MM-DD HH:mm") %>
tags:
  - daily-log # 日報
  - journal # 記録
  - status/done # 完了
  - product/google-review # Google口コミ自動化
  - product/insta-auto # Instagram半自動投稿
  - product/ai-secretary # AIお助け秘書
  - product/pop-creator # POP・メニュー作成
  - category/research # リサーチ内容
  - category/bug # バグ・修正
  - biz/pricing # 料金プラン
archive_path: 98_アーカイブ/<% tp.date.now("YYYY") %>/<% tp.date.now("MM") %>
---
<% tp.file.rename(tp.date.now("YYYY-MM-DD")) %>

# <% tp.date.now("YYYY-MM-DD") %> の活動記録
