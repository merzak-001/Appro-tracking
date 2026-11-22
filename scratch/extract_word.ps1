$docPath = 'C:\Users\msai\Downloads\Revue de processus appros juin 2026.doc'
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $doc = $word.Documents.Open($docPath, $false, $true)
    $text = $doc.Content.Text
    Set-Content -Path 'scratch\extracted_doc_text.txt' -Value $text -Encoding UTF8
    
    # Also extract tables
    $tableIndex = 1
    $tablesText = ""
    foreach ($table in $doc.Tables) {
        $tablesText += "`n=== TABLE $tableIndex ===`n"
        for ($r = 1; $r -le $table.Rows.Count; $r++) {
            $rowStr = @()
            for ($c = 1; $c -le $table.Columns.Count; $c++) {
                try {
                    $cellText = $table.Cell($r, $c).Range.Text.TrimEnd("`r", "`n", [char]7)
                    $rowStr += $cellText
                } catch {}
            }
            $tablesText += ($rowStr -join ' | ') + "`n"
        }
        $tableIndex++
    }
    Set-Content -Path 'scratch\extracted_doc_tables.txt' -Value $tablesText -Encoding UTF8
    $doc.Close([ref]$false)
    $word.Quit()
    Write-Host "Successfully extracted with Word COM!"
} catch {
    Write-Error $_
}
