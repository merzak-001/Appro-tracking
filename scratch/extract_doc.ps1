$docPath = "C:\Users\msai\Downloads\Revue de processus appros juin 2026.doc"
$outPath = "c:\Users\msai\antigravity\Procurement-Order-Tracker\scratch\revue_text.txt"

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $doc = $word.Documents.Open($docPath)
    $text = $doc.Content.Text
    
    # Also extract tables specifically
    $tableCount = $doc.Tables.Count
    $tablesText = "`n`n=== TABLES ($tableCount) ===`n"
    for ($i = 1; $i -le $tableCount; $i++) {
        $table = $doc.Tables.Item($i)
        $tablesText += "`n--- TABLE $i (Rows: $($table.Rows.Count), Cols: $($table.Columns.Count)) ---`n"
        for ($r = 1; $r -le $table.Rows.Count; $r++) {
            $rowText = ""
            for ($c = 1; $c -le $table.Columns.Count; $c++) {
                try {
                    $cell = $table.Cell($r, $c)
                    $cellText = $cell.Range.Text -replace "[\r\n\x07]", ""
                    $rowText += "$cellText | "
                } catch {
                    $rowText += "[Merged] | "
                }
            }
            $tablesText += "$rowText`n"
        }
    }
    
    $fullContent = $text + $tablesText
    [System.IO.File]::WriteAllText($outPath, $fullContent, [System.Text.Encoding]::UTF8)
    $doc.Close()
    $word.Quit()
    Write-Output "Successfully extracted to $outPath (Length: $($fullContent.Length))"
} catch {
    Write-Error $_.Exception.Message
    if ($word) { $word.Quit() }
}
