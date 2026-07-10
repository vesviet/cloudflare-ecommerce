import os
import json

migrations_dir = 'packages/database/migrations'
meta_dir = os.path.join(migrations_dir, 'meta')

print("🧹 Cleaning up extra migrations...")
# Remove extra files
for name in os.listdir(migrations_dir):
    if name.startswith(('0011_', '0012_', '0013_')) and name.endswith('.sql'):
        try:
            os.remove(os.path.join(migrations_dir, name))
        except Exception:
            pass
for name in os.listdir(meta_dir):
    if name.startswith(('0011_', '0012_')) and name.endswith('.json'):
        try:
            os.remove(os.path.join(meta_dir, name))
        except Exception:
            pass

print("🔄 Renaming snapshot JSON files...")
snapshots = {
    '0008_snapshot.json': '0009_snapshot.json',
    '0006_snapshot.json': '0007_snapshot.json',
    '0005_snapshot.json': '0006_snapshot.json',
    '0004_snapshot.json': '0005_snapshot.json',
    '0003_snapshot.json': '0004_snapshot.json',
    '0002_snapshot.json': '0003_snapshot.json',
    '0001_snapshot.json': '0002_snapshot.json',
}
for old_name, new_name in sorted(snapshots.items(), reverse=True):
    old_path = os.path.join(meta_dir, old_name)
    new_path = os.path.join(meta_dir, new_name)
    if os.path.exists(old_path):
        os.rename(old_path, new_path)

print("🔄 Renaming migration SQL files...")
sql_files = {
    '0008_far_malice.sql': '0009_far_malice.sql',
    '0007_cultured_thena.sql': '0008_cultured_thena.sql',
    '0006_migrate_data.sql': '0007_migrate_data.sql',
    '0005_large_satana.sql': '0006_large_satana.sql',
    '0004_hot_baron_strucker.sql': '0005_hot_baron_strucker.sql',
    '0003_dark_sharon_ventura.sql': '0004_dark_sharon_ventura.sql',
    '0002_real_colonel_america.sql': '0003_real_colonel_america.sql',
    '0001_lying_mephisto.sql': '0002_lying_mephisto.sql',
}
for old_name, new_name in sorted(sql_files.items(), reverse=True):
    old_path = os.path.join(migrations_dir, old_name)
    new_path = os.path.join(migrations_dir, new_name)
    if os.path.exists(old_path):
        os.rename(old_path, new_path)

print("✍️ Updating _journal.json...")
journal_path = os.path.join(meta_dir, '_journal.json')

journal_data = {
  "version": "5",
  "dialect": "sqlite",
  "entries": [
    {
      "idx": 0,
      "version": "5",
      "when": 1780978506925,
      "tag": "0000_massive_silver_fox",
      "breakpoints": True
    },
    {
      "idx": 1,
      "version": "5",
      "when": 1781364689791,
      "tag": "0001_lying_mephisto",
      "breakpoints": True
    },
    {
      "idx": 2,
      "version": "5",
      "when": 1781365880275,
      "tag": "0002_real_colonel_america",
      "breakpoints": True
    },
    {
      "idx": 3,
      "version": "5",
      "when": 1781401726701,
      "tag": "0003_dark_sharon_ventura",
      "breakpoints": True
    },
    {
      "idx": 4,
      "version": "5",
      "when": 1781425453484,
      "tag": "0004_hot_baron_strucker",
      "breakpoints": True
    },
    {
      "idx": 5,
      "version": "5",
      "when": 1781425523404,
      "tag": "0005_large_satana",
      "breakpoints": True
    },
    {
      "idx": 6,
      "version": "5",
      "when": 1781425560375,
      "tag": "0006_migrate_data",
      "breakpoints": True
    },
    {
      "idx": 7,
      "version": "5",
      "when": 1781425560376,
      "tag": "0007_cultured_thena",
      "breakpoints": True
    },
    {
      "idx": 8,
      "version": "5",
      "when": 1781449249551,
      "tag": "0008_far_malice",
      "breakpoints": True
    },
    {
      "idx": 9,
      "version": "5",
      "when": 1783597703843,
      "tag": "0010_schema_standardization",
      "breakpoints": True
    }
  ]
}

tag_renames = {
    "0001_lying_mephisto": "0002_lying_mephisto",
    "0002_real_colonel_america": "0003_real_colonel_america",
    "0003_dark_sharon_ventura": "0004_dark_sharon_ventura",
    "0004_hot_baron_strucker": "0005_hot_baron_strucker",
    "0005_large_satana": "0006_large_satana",
    "0006_migrate_data": "0007_migrate_data",
    "0007_cultured_thena": "0008_cultured_thena",
    "0008_far_malice": "0009_far_malice",
}

new_entries = []
for entry in journal_data["entries"]:
    tag = entry["tag"]
    if tag in tag_renames:
        entry["tag"] = tag_renames[tag]
        entry["idx"] += 1
    new_entries.append(entry)

journal_data["entries"] = new_entries

with open(journal_path, 'w') as f:
    json.dump(journal_data, f, indent=2)

print("✅ Renaming and journal update complete!")
