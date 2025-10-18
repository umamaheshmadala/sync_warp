# Database Table Creation Checklist

**Purpose:** Prevent duplicate or redundant tables in Supabase database

---

## ⚠️ MANDATORY CHECKS BEFORE CREATING ANY TABLE

### 1. ✅ Check if Table Already Exists

**Always run this query FIRST:**
```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'your_proposed_table_name';
```

**If result is NOT empty** → Table exists! Use it instead.

---

### 2. ✅ Check for Similar/Related Tables

**Search for tables with similar purpose:**
```sql
-- Find tables with similar names
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%keyword%';
```

**Examples:**
- Before creating `favorite_products`, search for `%favorite%`
- Before creating `user_preferences`, search for `%user%` and `%preference%`
- Before creating `business_reviews`, search for `%review%`

---

### 3. ✅ Check Existing Table Structure

**If similar table exists, examine its structure:**
```sql
-- Check table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'existing_table_name' 
ORDER BY ordinal_position;

-- Check table comment/description
SELECT obj_description(oid) as table_description
FROM pg_class 
WHERE relname = 'existing_table_name';
```

---

### 4. ✅ Check for Generic/Unified Tables

**Look for tables that handle multiple entity types:**
```sql
-- Check if there's a unified table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('favorites', 'activities', 'notifications', 'logs');

-- Check if table has entity_type column (indicates unified design)
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'entity_type' 
AND table_schema = 'public';
```

---

## 📋 Decision Tree

```
┌─────────────────────────────────────┐
│ Need to store new data?             │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Does similar table exist?           │
├─────────────┬───────────────────────┤
│ YES         │ NO                    │
▼             │                       ▼
┌─────────────┴─────┐   ┌──────────────────────┐
│ Can it be extended│   │ Is this a specific   │
│ or reused?        │   │ entity type of a     │
├─────┬─────────────┤   │ generic concept?     │
│ YES │ NO          │   ├─────┬────────────────┤
▼     │             │   │ YES │ NO             │
USE   │             │   ▼     │                ▼
IT    │             │   USE   │                CREATE
      ▼             │   GENERIC                NEW
      ┌─────────────┘   TABLE                  TABLE
      │
      ▼
  DOCUMENT WHY
  NEW TABLE IS
  NEEDED
```

---

## 🎯 Real Example: Favorites System

### ❌ WRONG Approach (What Happened):
```sql
-- Created new table without checking
CREATE TABLE favorite_products (...);
-- Result: Duplicate! 'favorites' table already existed
```

### ✅ CORRECT Approach:
```sql
-- 1. Check if favorites table exists
SELECT * FROM information_schema.tables 
WHERE table_name LIKE '%favorite%';
-- Found: 'favorites' table

-- 2. Check its structure
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'favorites';
-- Found: id, user_id, entity_type, entity_id, created_at

-- 3. Verify it handles products
SELECT DISTINCT entity_type FROM favorites;
-- Can store: 'business', 'coupon', 'product'

-- 4. Decision: USE EXISTING TABLE
-- Just use entity_type='product' instead of creating new table
```

---

## 📝 Standard Table Patterns

### Unified Tables (Handle Multiple Types):
These tables use `entity_type` and `entity_id`:
- ✅ `favorites` - stores favorites of any type
- ✅ `activities` - stores activity logs of any type
- ✅ `notifications` - stores notifications for any entity
- ✅ `shares` - stores shares of any content type

**Check these FIRST before creating type-specific tables!**

### When to Use Existing Table:
- ✅ Similar data structure
- ✅ Same access patterns
- ✅ Same security requirements
- ✅ Can be filtered by type/category

### When to Create New Table:
- ✅ Completely different data structure
- ✅ Different access patterns
- ✅ Different security/RLS requirements
- ✅ Performance benefits from separation
- ✅ No unified table exists that could handle it

---

## 🔍 Pre-Creation Query Template

**Run this before every table creation:**

```sql
-- STEP 1: Check exact name
SELECT EXISTS(
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'proposed_table_name'
) as table_exists;

-- STEP 2: Check similar names
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%keyword%'
ORDER BY table_name;

-- STEP 3: Check for unified tables with entity_type
SELECT t.table_name, c.column_name
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND c.column_name IN ('entity_type', 'entity_id', 'type', 'resource_type')
ORDER BY t.table_name;

-- STEP 4: If similar table found, examine structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'similar_table_name'
ORDER BY ordinal_position;
```

---

## ✅ Mandatory Review Checklist

Before creating any table, confirm:

- [ ] Searched for existing tables with similar names
- [ ] Checked for unified/generic tables
- [ ] Examined similar table structures
- [ ] Confirmed no existing table can be reused
- [ ] Documented why new table is needed
- [ ] Added table comment explaining purpose
- [ ] Named table consistently with existing patterns

---

## 🚨 Red Flags

**STOP and reconsider if:**
- ❌ Table name is very similar to existing table (`favorite_products` vs `favorites`)
- ❌ Table has same columns as existing table with just one field different
- ❌ You're creating 3rd+ table for same concept (`user_products`, `business_products`, `favorite_products`)
- ❌ Table purpose can be described as "X for Y type" (likely should use unified table)
- ❌ No one else on team knows about this new table

---

## 📚 Documentation Requirements

When creating a new table, MUST document:
1. **Purpose:** What does this table store?
2. **Why New:** Why not use existing table X?
3. **Relationships:** How does it relate to other tables?
4. **Access Patterns:** How will it be queried?

**Add as table comment:**
```sql
COMMENT ON TABLE new_table IS 
  'Purpose: Stores X for Y. 
   Why New: Existing Z table cannot handle W because of P. 
   Relationships: Links to A via B. 
   Created: 2025-01-18';
```

---

## 🎯 Quick Reference Commands

### Check Table Exists:
```bash
# Using Supabase MCP
execute_sql: SELECT EXISTS(SELECT FROM pg_tables WHERE tablename='table_name');
```

### List All Tables:
```bash
# Using Supabase MCP
execute_sql: SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
```

### Find Similar Tables:
```bash
# Using Supabase MCP
execute_sql: SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%keyword%';
```

---

## ✨ Remember

> **"When in doubt, check it out!"** 
> 
> Always search before creating. It takes 30 seconds to check, but hours to fix duplicate tables.

---

**Last Updated:** January 18, 2025  
**Applies To:** All database schema changes
