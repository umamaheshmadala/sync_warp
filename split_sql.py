import os

with open('optimize_rls.sql', 'r') as f:
    lines = f.readlines()

# lines[0] is BEGIN;
# lines[-1] is COMMIT;
body_lines = lines[1:-1]

# split by empty lines or 'DROP POLICY '
policies = []
curr = []
for line in body_lines:
    if line.startswith('DROP POLICY '):
        if curr:
            policies.append(''.join(curr))
            curr = []
    curr.append(line)
if curr:
    policies.append(''.join(curr))

chunk_size = 70
chunks = [policies[i:i + chunk_size] for i in range(0, len(policies), chunk_size)]

for idx, chunk in enumerate(chunks):
    with open(f'optimize_{idx+1}.sql', 'w') as f:
        f.write('BEGIN;\n')
        f.write(''.join(chunk))
        f.write('COMMIT;\n')
        
print(f"Split into {len(chunks)} chunks.")
