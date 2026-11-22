# Procurement Order Tracker - SQL Server Auto-Installer
param(
    [string]$Instance = "localhost\SQLEXPRESS"
)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " PROCUREMENT ORDER TRACKER - SQL SERVER INSTALLER" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Target Instance : $Instance" -ForegroundColor Yellow
Write-Host "Authentication  : Windows Authentication (-E)" -ForegroundColor Yellow
Write-Host ""

if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
    Write-Host "Executing schema_sqlserver.sql on $Instance..." -ForegroundColor Green
    sqlcmd -S $Instance -E -I -i "$PSScriptRoot\schema_sqlserver.sql"
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "===================================================" -ForegroundColor Green
        Write-Host " SUCCESS! ProcurementDB database created successfully." -ForegroundColor Green
        Write-Host "===================================================" -ForegroundColor Green
    } else {
        Write-Host "Execution failed with exit code $LASTEXITCODE." -ForegroundColor Red
    }
} elseif (Get-Module -ListAvailable -Name SqlServer) {
    Import-Module SqlServer
    Write-Host "Executing using PowerShell SqlServer module..." -ForegroundColor Green
    Invoke-Sqlcmd -ServerInstance $Instance -InputFile "$PSScriptRoot\schema_sqlserver.sql"
    Write-Host "Database ProcurementDB installed successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Neither 'sqlcmd' nor 'SqlServer' PowerShell module was found." -ForegroundColor Red
    Write-Host "Please open SSMS or install SQL Server Command Line Utilities." -ForegroundColor Yellow
}
