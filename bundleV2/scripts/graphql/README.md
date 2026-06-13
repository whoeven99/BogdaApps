# Bundle offers — Shopify metafield GraphQL 查询

用于查看 app 写入 Shopify 的 bundle offer 数据。

## 前置条件

```powershell
cd c:\repo\BogdaApps\bundleV2

shopify store auth `
  --store <你的店铺>.myshopify.com `
  --scopes write_metaobject_definitions,write_metaobjects,write_products,write_discounts,read_products,write_pixels,read_customer_events,read_themes,read_markets
```

## 一键查询

```powershell
.\scripts\query-bundle-metafields.ps1 -Store ciwishop.myshopify.com

# 可选：指定 prod Product Discount 节点 ID（从 discount 查询结果里复制数字部分）
.\scripts\query-bundle-metafields.ps1 -Store ciwishop.myshopify.com -DiscountNodeId 1338158841879
```

## 单独执行 GraphQL 文件

| 文件 | 作用 |
|------|------|
| `graphql/bundle-shop-metafields.graphql` | Shop 上 `ciwi_bundle` 命名空间（主题 + 瘦版副本 + sync 时间） |
| `graphql/bundle-discount-metafields.graphql` | Active Automatic Discount 上的 Function metafields |
| `graphql/bundle-discount-node-all-metafields.graphql` | 单个 discount 节点全部 metafields（需 `--variables`） |

```powershell
shopify store execute --store <shop>.myshopify.com --json `
  --query-file scripts/graphql/bundle-shop-metafields.graphql
```

## App 写入的 Shop metafield keys

| Key | 用途 |
|-----|------|
| `ciwi-bundle-offers` | 主题读取，含 hydrated 产品数据 |
| `ciwi-bundle-offers-fn` | 瘦版 offers（与 Function payload 同结构，便于调试） |
| `ciwi-bundle-offer-sync-at` | 最后一次 sync 的 ISO 时间戳 |

## Discount 节点 metafield keys（Checkout Function 读取）

| Namespace | Key | 用途 |
|-----------|-----|------|
| `$app:ciwi_bundle` | `offers`, `offers-1` | 主分片 + 分片 1（按 discount class 写入） |
| `$app` | `offers`, `offers-1` | fallback |

Toggle status 成功后会触发 `runOfferPostWriteSync`，更新上述 Shop keys，并尝试写入 Discount 节点分片。
