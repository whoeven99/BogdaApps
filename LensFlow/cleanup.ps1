# LensFlow 项目冗余文件清理脚本
# 在 D:\下载\LensFlow 下运行此脚本
Write-Host "=== LensFlow Cleanup ===" -ForegroundColor Cyan

$base = "D:\下载\LensFlow"
$errors = @()

function SafeRemove($path, $desc) {
    $full = Join-Path $base $path
    if (Test-Path $full) {
        try {
            Remove-Item $full -Recurse -Force -ErrorAction Stop
            Write-Host "  [OK] $desc" -ForegroundColor Green
        } catch {
            $script:errors += $path
            Write-Host "  [FAIL] $desc : $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  [SKIP] $desc (not found)" -ForegroundColor Gray
    }
}

# 1. macOS 资源分叉
SafeRemove "__MACOSX.bak" "macOS metadata"

# 2. LensFlow 内部冗余
SafeRemove "LensFlow\node_modules" "inner node_modules (~400MB)"
SafeRemove "LensFlow\dist\src" "inner dist/src"
SafeRemove "LensFlow\dist\tests" "inner dist/tests"
SafeRemove "LensFlow\admin-ui" "inner admin-ui"
SafeRemove "LensFlow\prisma" "inner prisma"
SafeRemove "LensFlow\web" "inner web"
SafeRemove "LensFlow\.shopify" "inner .shopify"

# 3. LensFlow 根目录冗余文件
@(
    "LensFlow\package.json",
    "LensFlow\package-lock.json",
    "LensFlow\.DS_Store.bak",
    "LensFlow\.env.example",
    "LensFlow\cloudflared.exe",
    "LensFlow\Dockerfile",
    "LensFlow\docker-compose.yml",
    "LensFlow\shopify.app.toml.bak2",
    "LensFlow\_patch.js",
    "LensFlow\_patch.mjs",
    "LensFlow\__t.js"
) | ForEach-Object { SafeRemove $_ "inner root file" }

# 4. 各层 bak 文件
Get-ChildItem $base -Recurse -Filter "*.bak" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        Remove-Item $_.FullName -Force -ErrorAction Stop
        Write-Host "  [OK] bak: $($_.Name)" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] bak: $($_.Name)" -ForegroundColor Red
    }
}

# 5. 验证关键文件仍存在
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
@("LensFlow\extensions\theme-app-extension\shopify.extension.toml",
  "LensFlow\dist\public\index.html",
  "dist\src\index.js",
  "shopify.app.lensflow.toml"
) | ForEach-Object {
    $full = Join-Path $base $_
    if (Test-Path $full) {
        Write-Host "  [OK] $_" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
if ($errors.Count -gt 0) { Write-Host "Errors: $errors" -ForegroundColor Yellow }
