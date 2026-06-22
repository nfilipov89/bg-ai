$folders = @(
  "C:\Users\Dari\Desktop\demo-123",
  "C:\Users\Dari\Desktop\test-shop",
  "C:\Users\Dari\Desktop\my-saas-platform"
)
foreach ($f in $folders) {
  if (Test-Path $f) {
    Remove-Item -Recurse -Force $f
    Write-Host "Deleted: $f"
  } else {
    Write-Host "Not found: $f"
  }
}
Write-Host "Cleanup done."
