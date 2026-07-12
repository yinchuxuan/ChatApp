param([Parameter(Mandatory = $true)][string]$TargetPath)

$thumbprint = $env:WINDOWS_CERTIFICATE_THUMBPRINT
if ([string]::IsNullOrWhiteSpace($thumbprint)) {
  Write-Host "Skipping Windows signing because no certificate is configured."
  exit 0
}

$signTool = (Get-Command signtool.exe -ErrorAction Stop).Source
& $signTool sign /sha1 $thumbprint /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 $TargetPath
if ($LASTEXITCODE -ne 0) {
  throw "signtool failed for $TargetPath with exit code $LASTEXITCODE"
}
