import os
import sys
import openpyxl
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables must be set.")
    sys.exit(1)

supabase: Client = create_client(url, key)

EXCEL_FILE = "assets/india_google_business_profile_taxonomy_github_Manchumahara.xlsx"

if not os.path.exists(EXCEL_FILE):
    print(f"Error: {EXCEL_FILE} not found.")
    sys.exit(1)

print(f"Loading taxonomy from {EXCEL_FILE}...")
wb = openpyxl.load_workbook(EXCEL_FILE)
sheet = wb.active

# Track generated IDs to maintain hierarchy
# L1 maps L1 name -> L1 UUID
# L2 maps (L1 name, L2 name) -> L2 UUID
l1_map = {}
l2_map = {}
l3_map = {} # just to track unique

# Assuming format: Level 1 (idx 2), Level 2 (idx 3), Level 3 (idx 4)
for row in sheet.iter_rows(min_row=3, values_only=True):  # Skip header
    if len(row) < 5:
        continue
    
    l1_name = str(row[2]).strip() if row[2] else None
    l2_name = str(row[3]).strip() if row[3] else None
    l3_name = str(row[4]).strip() if row[4] else None
    
    if not l1_name or not l2_name or not l3_name:
        continue
        
    # Extract just the category name if it follows the format "Category - Subcategory"
    if " - " in l1_name:
        l1_name = l1_name.split(" - ")[-1]
    if " - " in l2_name:
        l2_name = l2_name.split(" - ")[-1]
    if " - " in l3_name:
        l3_name = l3_name.split(" - ")[-1]

    # Gather unique L1 and assign UUID
    if l1_name not in l1_map:
        l1_map[l1_name] = None
        
    # Gather unique L2 and assign UUID
    if (l1_name, l2_name) not in l2_map:
        l2_map[(l1_name, l2_name)] = None
        
    # Gather unique L3 and assign UUID
    if (l1_name, l2_name, l3_name) not in l3_map:
        l3_map[(l1_name, l2_name, l3_name)] = None

print(f"Found {len(l1_map)} L1, {len(l2_map)} L2, {len(l3_map)} L3 categories.")

# 1. Insert Level 1 Categories
print("Inserting Level 1 categories...")
l1_insert_data = []
for idx, l1_name in enumerate(l1_map.keys()):
    l1_insert_data.append({
        "name": l1_name,
        "level": 1,
        "parent_id": None,
        "sort_order": idx * 10
    })

if l1_insert_data:
    try:
        res = supabase.table("product_category_master").upsert(l1_insert_data, on_conflict="name,level,parent_id").execute()
    except Exception as e:
        print(f"Error inserting L1: {e}")
    # Fetch back to get UUIDs
    l1_records = supabase.table("product_category_master").select("id, name").eq("level", 1).execute()
    for record in l1_records.data:
        l1_map[record['name']] = record['id']

# 2. Insert Level 2 Categories
print("Inserting Level 2 categories...")
l2_insert_data = []
for idx, (l1_name, l2_name) in enumerate(l2_map.keys()):
    l1_id = l1_map.get(l1_name)
    if l1_id:
        l2_insert_data.append({
            "name": l2_name,
            "level": 2,
            "parent_id": l1_id,
            "sort_order": idx * 10
        })

batch_size = 500
for i in range(0, len(l2_insert_data), batch_size):
    batch = l2_insert_data[i:i + batch_size]
    supabase.table("product_category_master").upsert(batch, on_conflict="name,level,parent_id").execute()

# Fetch back L2 to get UUIDs
l2_records = supabase.table("product_category_master").select("id, name, parent_id").eq("level", 2).execute()
id_to_l1_name = {v: k for k, v in l1_map.items()}
for record in l2_records.data:
    l2_name = record['name']
    parent_id = record['parent_id']
    if parent_id in id_to_l1_name:
        l1_name = id_to_l1_name[parent_id]
        l2_map[(l1_name, l2_name)] = record['id']

# 3. Insert Level 3 Categories
print("Inserting Level 3 categories...")
l3_insert_data = []
for idx, (l1_name, l2_name, l3_name) in enumerate(l3_map.keys()):
    l2_id = l2_map.get((l1_name, l2_name))
    if l2_id:
        l3_insert_data.append({
            "name": l3_name,
            "level": 3,
            "parent_id": l2_id,
            "sort_order": idx * 10
        })

for i in range(0, len(l3_insert_data), batch_size):
    print(f"  Batch {i//batch_size + 1}/{len(l3_insert_data)//batch_size + 1}...")
    batch = l3_insert_data[i:i + batch_size]
    supabase.table("product_category_master").upsert(batch, on_conflict="name,level,parent_id").execute()

print("Seeding complete!")

l1_count = supabase.table("product_category_master").select("id", count="exact").eq("level", 1).execute().count
l2_count = supabase.table("product_category_master").select("id", count="exact").eq("level", 2).execute().count
l3_count = supabase.table("product_category_master").select("id", count="exact").eq("level", 3).execute().count

print(f"Final DB Counts -> Level 1: {l1_count}, Level 2: {l2_count}, Level 3: {l3_count}")
print(f"Expected -> Level 1: {len(l1_map)}, Level 2: {len(l2_map)}, Level 3: {len(l3_map)}")
print(f"Total rows: {l1_count + l2_count + l3_count}")
