# 🚀 進行中のプロジェクト (Todo)

```dataview
TABLE created_at as "作成日", tags as "タグ"
FROM #status/todo
SORT created_at DESC
```

---

# 💡 新着アイディア (New)

```dataview
TABLE created_at as "作成日"
FROM #idea AND #status/new
SORT created_at DESC
```

---

# 📝 最近更新したファイル

```dataview
TABLE updated_at as "更新日"
FROM ""
WHERE updated_at != null
SORT updated_at DESC
LIMIT 5
```

