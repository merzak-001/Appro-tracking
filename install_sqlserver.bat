@echo off
echo ===================================================
echo   PROCUREMENT ORDER TRACKER - SQL SERVER INSTALLER
echo ===================================================
echo Target Instance: localhost\SQLEXPRESS
echo Authentication : Windows Authentication
echo.

set INSTANCE=localhost\SQLEXPRESS
if NOT "%~1"=="" set INSTANCE=%~1

echo Running schema_sqlserver.sql on [%INSTANCE%]...
sqlcmd -S "%INSTANCE%" -E -I -i "%~dp0schema_sqlserver.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo SUCCESS! ProcurementDB database installed cleanly.
    echo ===================================================
) else (
    echo.
    echo ERROR: Execution failed. Please check if SQL Server Express is running.
)

pause
