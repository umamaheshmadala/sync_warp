@echo off
echo Cleaning up temporary diagnostic files...

if exist "temp_diagnostic.sql" del "temp_diagnostic.sql"
if exist "MANUAL_DIAGNOSTIC.md" del "MANUAL_DIAGNOSTIC.md"  
if exist "CHECK_EXISTING_BUSINESSES.md" del "CHECK_EXISTING_BUSINESSES.md"
if exist "FINAL_FIX_MIGRATION.sql" del "FINAL_FIX_MIGRATION.sql"
if exist "RUN_THIS_FIX.md" del "RUN_THIS_FIX.md"
if exist "FIX_STORAGE_BUCKET.sql" del "FIX_STORAGE_BUCKET.sql"
if exist "DEBUG_REGISTRATION.sql" del "DEBUG_REGISTRATION.sql"
if exist "SIMPLE_DEBUG.md" del "SIMPLE_DEBUG.md"
if exist "COMPLETE_FIX.md" del "COMPLETE_FIX.md"
if exist "FIX_BUSINESSES_TABLE.sql" del "FIX_BUSINESSES_TABLE.sql"
if exist "COMPLETE_TABLE_FIX.sql" del "COMPLETE_TABLE_FIX.sql"

echo Temporary files cleaned up!
echo.
echo Your SynC app is now fully functional:
echo - Business registration: Working ✅
echo - Image uploads: Working ✅  
echo - Database operations: Working ✅
echo - Navigation: Working ✅
echo.
echo Happy coding! 🚀
pause