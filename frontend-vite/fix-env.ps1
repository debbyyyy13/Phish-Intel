# fix-env.ps1
Write-Host "Replacing process.env.REACT_APP_* with import.meta.env.VITE_* ..."

# Go through all JS/JSX/TS/TSX files in src/
Get-ChildItem -Path .\src -Recurse -Include *.js,*.jsx,*.ts,*.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Replace REACT_APP_ variables
    $newContent = $content -replace 'process\.env\.REACT_APP_', 'import.meta.env.VITE_'

    # Replace NODE_ENV with MODE
    $newContent = $newContent -replace 'process\.env\.NODE_ENV', 'import.meta.env.MODE'

    # Only update if changes were made
    if ($content -ne $newContent) {
        Write-Host "Updated $($_.FullName)"
        Set-Content -Path $_.FullName -Value $newContent
    }
}

Write-Host "Replacement complete!"
