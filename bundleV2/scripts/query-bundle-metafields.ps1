# 查询 bundle offers 相关 Shopify metafields
#
# 前置: shopify store auth --store <shop>.myshopify.com --scopes ...
#
# 示例 (PowerShell):
#   .\scripts\query-bundle-metafields.ps1 -Store ciwishop.myshopify.com
#   .\scripts\query-bundle-metafields.ps1 -Store ciwishop.myshopify.com -DiscountNodeId 1338158841879

param(
  [Parameter(Mandatory = $true)]
  [string]$Store,

  [string]$DiscountNodeId = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== Shop metafields (ciwi_bundle) ===" -ForegroundColor Cyan
shopify store execute --store $Store --json --query-file scripts/graphql/bundle-shop-metafields.graphql

Write-Host "`n=== Discount node metafields (Function) ===" -ForegroundColor Cyan
shopify store execute --store $Store --json --query-file scripts/graphql/bundle-discount-metafields.graphql

if ($DiscountNodeId) {
  $gid = "gid://shopify/DiscountAutomaticNode/$DiscountNodeId"
  $vars = "{ `"id`": `"$gid`" }"
  Write-Host "`n=== Discount node all metafields ($gid) ===" -ForegroundColor Cyan
  shopify store execute --store $Store --json `
    --query-file scripts/graphql/bundle-discount-node-all-metafields.graphql `
    --variables $vars
}
