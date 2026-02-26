import json

with open('/Users/deepakmyneni/.gemini/antigravity/brain/30e65b7d-0b04-4104-92ec-2843beb30a45/.system_generated/steps/3906/output.txt', 'r') as f:
    text = json.loads(f.read())

start = text.find('[')
end = text.rfind(']') + 1
data_str = text[start:end]
policies = json.loads(data_str)

sql_statements = []
sql_statements.append("BEGIN;")

count = 0

def needs_replace(text):
    if not text: return False
    if 'auth.uid()' in text and 'SELECT auth.uid()' not in text.upper():
        return True
    if "current_setting('request.jwt.claims', true)" in text and 'SELECT CURRENT_SETTING' not in text.upper():
        return True
    return False

def do_replace(text):
    if not text: return text
    res = text.replace('auth.uid()', '(select auth.uid())')
    res = res.replace("current_setting('request.jwt.claims', true)", "(select current_setting('request.jwt.claims', true))")
    return res

for p in policies:
    qual = p.get('qual')
    with_check = p.get('with_check')

    if needs_replace(qual) or needs_replace(with_check):
        count += 1
        table = p['tablename']
        policy = p['policyname']
        cmd = p['cmd']
        
        new_qual = do_replace(qual)
        new_with_check = do_replace(with_check)
        
        sql = f'DROP POLICY IF EXISTS "{policy}" ON public."{table}";\n'
        sql += f'CREATE POLICY "{policy}" ON public."{table}" FOR {cmd}'
        
        if new_qual:
            sql += f'\n  USING ({new_qual})'
        if new_with_check:
            sql += f'\n  WITH CHECK ({new_with_check})'
            
        sql += ';\n'
        sql_statements.append(sql)

sql_statements.append("COMMIT;")

with open('optimize_rls.sql', 'w') as f:
    f.write('\n'.join(sql_statements))

print(f"Generated SQL for {count} policies. Total statements: {len(sql_statements)}")
