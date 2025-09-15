<#
Simple diagnostic for Codeium (Windsurf) in VS Code on Windows.
Run this from PowerShell (run as your user, not elevated):

  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-codeium.ps1

What it checks:
- availability of `code` CLI
- whether the Codeium extension (`codeium.codeium`) is installed and its version
- presence of codeium-related settings in user and workspace settings.json
- quick guidance on where to look for extension output & developer tools
#>

function Write-Ok($msg) { Write-Host "[OK]    " $msg -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN]  " $msg -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERROR] " $msg -ForegroundColor Red }

Write-Host "Codeium diagnostic script\n" -ForegroundColor Cyan

# 1) code CLI
$codeCmd = Get-Command code -ErrorAction SilentlyContinue
if (-not $codeCmd) {
  Write-Warn "'code' CLI not found in PATH. To run this check install VS Code and enable the 'code' command (Command Palette -> 'Shell Command: Install 'code' command in PATH')."
} else {
  Write-Ok "'code' CLI found: $($codeCmd.Path)"
  Write-Host "Listing installed extensions (filtering for Codeium)...\n"
  $exts = & code --list-extensions --show-versions 2>$null
  if ($LASTEXITCODE -ne 0 -and -not $exts) {
    Write-Warn "Couldn't list extensions via 'code' CLI. It may still work via the GUI."
  } else {
    $codeium = $exts | Select-String "^codeium.codeium@?" -SimpleMatch
    if ($codeium) { Write-Ok "Found Codeium extension: $($codeium.Line)" } else { Write-Warn "Codeium extension (codeium.codeium) NOT found in installed extensions." }
  }
}

# 2) inspect user settings.json
$roaming = $env:APPDATA
$userSettingsPath = Join-Path $roaming 'Code\User\settings.json'
if (Test-Path $userSettingsPath) {
  try {
    $settingsText = Get-Content $userSettingsPath -Raw -ErrorAction Stop
    $settings = $settingsText | ConvertFrom-Json -ErrorAction Stop
    $keys = @('codeium.enabled','codeium.inlineSuggest.enable','codeium.autocomplete','editor.inlineSuggest.enabled')
    Write-Host "\nUser settings ($userSettingsPath):"
    foreach ($k in $keys) {
      if ($settings.PSObject.Properties.Name -contains $k) { Write-Ok "$k = $($settings.$k)" } else { Write-Warn "$k not set in user settings" }
    }
  } catch {
    Write-Warn "Could not parse user settings at ${userSettingsPath}: $($_.Exception.Message)"
  }
} else {
  Write-Warn "User settings.json not found at $userSettingsPath"
}

# 3) inspect workspace settings (if present)
$workspaceSettings = Join-Path (Get-Location) '.vscode\settings.json'
if (Test-Path $workspaceSettings) {
  try {
    $wtext = Get-Content $workspaceSettings -Raw -ErrorAction Stop
    $wsettings = $wtext | ConvertFrom-Json -ErrorAction Stop
    Write-Host "\nWorkspace settings (.vscode/settings.json):"
    if ($wsettings.PSObject.Properties.Name -contains 'codeium.enabled') { Write-Ok "codeium.enabled = $($wsettings.'codeium.enabled')" } else { Write-Warn "codeium.enabled not present in workspace settings" }
  } catch {
    Write-Warn "Could not parse workspace settings at ${workspaceSettings}: $($_.Exception.Message)"
  }
} else {
  Write-Warn "No workspace .vscode/settings.json found in repo root (it's commonly gitignored)."
}

# 4) Quick tips for runtime troubleshooting
Write-Host "\nRuntime troubleshooting tips:" -ForegroundColor Cyan
Write-Host "- Open the Codeium Output channel: View -> Output, then choose 'Codeium' from the dropdown. Look for errors or auth messages."
Write-Host "- Open Developer Tools Console: Help -> Toggle Developer Tools -> Console. Look for extension errors or blocked network requests."
Write-Host "- If Codeium requires sign-in, press Ctrl+Shift+P and run: 'Codeium: Sign In' and follow the flow."
Write-Host "- If completions do not appear inline, ensure 'Editor: Inline Suggest' is enabled and 'codeium.inlineSuggest.enable' = true in user/workspace settings."

Write-Host "\nIf you want, copy the output of this script and paste it here and I'll help interpret it and provide the next fix." -ForegroundColor Gray

# Exit with success
exit 0
