import urllib.request
import json
import os

url = "https://api.supabase.com/v1/projects/ysxmgbblljoyebvugrfo/database/lint/warnings"
headers = {
    "Authorization": f"Bearer {os.environ.get('SUPABASE_ACCESS_TOKEN')}",
    "Content-Type": "application/json"
}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        lints = data.get('lints', [])
        unindexed = [l for l in lints if l.get('name') == 'unindexed_foreign_keys']
        print(f"Total unindexed_foreign_keys warnings: {len(unindexed)}")
        if unindexed:
            for l in unindexed[:5]:
                meta = l.get('metadata', {})
                print(f"- {meta.get('schema')}.{meta.get('name')} FK: {meta.get('fkey_name')}")
except Exception as e:
    print(f"Error: {e}")
