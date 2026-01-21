(function () {
  function insertHtmlNextToCartForms() {
    const configEl = document.getElementById("ciwi-bundles-config");
    if (!configEl) return;

    const configElJson = JSON.parse(configEl.textContent || "{}");
    const ciwiBundleconfig = configElJson?.config;

    if (!ciwiBundleconfig) return;

    let form = null;
    const cartAddforms = document.querySelectorAll('form[action*="/cart/add"]');

    for (const cartAddform of cartAddforms) {
      const children = Array.from(cartAddform.children);
      for (const child of children) {
        if (
          child.tagName === "INPUT" &&
          child.name === "id" &&
          String(child.value) === String(configElJson?.variantId)
        ) {
          form = cartAddform;
        }
      }
    }

    if (!form) return;

    /* --------------------------------------------------
       插入位置策略（主路径 + 保底路径）
    -------------------------------------------------- */
    let insertTarget = null;
    let insertBeforeNode = null;

    const productForm = form.closest("product-form");
    if (productForm && productForm.parentElement) {
      // ✅ 主路径：插在 product-form 外
      insertTarget = productForm.parentElement;
      insertBeforeNode = productForm;
    } else if (form.parentElement) {
      // ✅ 保底：插在 form 前
      insertTarget = form.parentElement;
      insertBeforeNode = form;
    }

    if (!insertTarget || !insertBeforeNode) return;

    // 防止重复插入（在最终容器判断）
    if (insertTarget.querySelector(".ciwi-bundle-wrapper")) return;

    const bundleData = Object.values(ciwiBundleconfig)[0] || {};

    const discountRules = bundleData.discount_rules || [];

    const styleConfigData = bundleData.style_config || {};

    const targetingSettingsData = bundleData.targeting_settings || {};

    const selectedProductVariantIds =
      bundleData.product_pool?.include_variant_ids || [];

    const isInTargetMarketArray =
      targetingSettingsData?.marketVisibilitySettingData?.find((market) =>
        market?.includes(configElJson?.marketId),
      );

    if (!isInTargetMarketArray) return;

    const isInSelectedProductVariantIdsArray =
      selectedProductVariantIds?.includes(configElJson?.variantId?.toString());

    if (!isInSelectedProductVariantIdsArray) return;

    /* -----------------------
       确保 form 里有 quantity
    ----------------------- */
    let qtyInput = null;

    Array.from(form.children).forEach((child) => {
      if (child.tagName === "INPUT" && child.name === "quantity") {
        qtyInput = child;
      }
    });

    if (!qtyInput) {
      qtyInput = document.createElement("input");
      qtyInput.type = "hidden";
      qtyInput.name = "quantity";
      form.appendChild(qtyInput);
    }

    let selectedIndex = discountRules.findIndex((r) => r.selectedByDefault);
    if (selectedIndex === -1) selectedIndex = 0;

    qtyInput.value =
      discountRules[selectedIndex]?.trigger_scope?.min_quantity || 1;

    const wrapper = document.createElement("div");
    wrapper.className = "ciwi-bundle-wrapper";

    const rulesHtml = discountRules
      .map((rule, index) => {
        let priceHtml = "";

        if (rule.discount.value === 1) {
          priceHtml = `
            <strong class="ciwi-ciwi-money" style="font-size:16px">
              ${configElJson.currencySymbol}
              ${Number(
                (rule.trigger_scope.min_quantity * configElJson.price) / 100,
              ).toFixed(2)}
            </strong>
          `;
        } else if (rule.discount.value === 0) {
          priceHtml = `<strong style="font-size:16px">Free</strong>`;
        } else {
          priceHtml = `
            <strong class="ciwi-ciwi-money" style="font-size:16px">
              ${configElJson.currencySymbol}
              ${Number(
                (rule.trigger_scope.min_quantity *
                  configElJson.price *
                  rule.discount.value) /
                  100,
              ).toFixed(2)}
            </strong>
            <div class="ciwi-ciwi-money" style="font-size:12px;color:#6d7175;text-decoration:line-through">
              ${configElJson.currencySymbol}
              ${Number(
                (rule.trigger_scope.min_quantity * configElJson.price) / 100,
              ).toFixed(2)}
            </div>
          `;
        }

        return `
          <div
            class="ciwi-rule"
            data-index="${index}"
            data-qty="${rule.trigger_scope.min_quantity}"
            style="
              border: 1px solid ${rule.selectedByDefault ? "#000" : styleConfigData.card.border_color};
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 12px;
              position: relative;
              background: ${rule.badgeText ? "#ffffff" : "#f9fafb"};
              cursor: pointer;
            "
          >
            ${
              rule.badgeText
                ? `
                <div
                  style="
                    position:absolute;
                    top:-8px;
                    right:12px;
                    background:#000;
                    color:#fff;
                    padding:2px 12px;
                    border-radius:12px;
                    font-size:10px;
                    font-weight:600;
                    max-width:100%;
                    overflow:hidden;
                    text-overflow:ellipsis;
                  "
                >
                  ${rule.badgeText}
                </div>
              `
                : ""
            }

            <div class="ciwi-rule__content">
              <input
                type="radio"
                name="discount-rule-group"
                value="${rule.discount.value}"
                checked=${rule.selectedByDefault}
                style="width:16px;height:16px"
              />

              <div style="flex:1">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <strong style="font-size:14px">${rule.title}</strong>

                  ${
                    rule.discount.value < 1
                      ? `
                        <span
                          style="
                            background:${styleConfigData.card.label_color || "#f0f0f0"};
                            padding:2px 6px;
                            border-radius:4px;
                            font-size:10px;
                          "
                        >
                          ${rule.labelText}
                        </span>
                      `
                      : ""
                  }
                </div>

                <div style="font-size:12px;color:#6d7175">
                  ${rule.subtitle || ""}
                </div>
              </div>

              <div style="text-align:right">
                ${priceHtml}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    wrapper.innerHTML = `
        <h3
            style="
            font-size:${styleConfigData.title.fontSize || "16px"};
            font-weight:${styleConfigData.title.fontWeight || 600};
            color:${styleConfigData.title.color || "#000"};
            margin-bottom:16px;
            "
        >
            ${styleConfigData.title.text || ""}
        </h3>

        ${rulesHtml}
    `;

    // 插入到 form 前
    insertTarget.insertBefore(wrapper, insertBeforeNode);

    /* -----------------------
       交互逻辑（最关键）
    ----------------------- */
    wrapper.addEventListener("click", (e) => {
      const ruleEl = e.target.closest(".ciwi-rule");
      if (!ruleEl) return;

      const qty = ruleEl.dataset.qty;

      // 更新 quantity
      qtyInput.value = qty;

      // UI 状态同步
      wrapper.querySelectorAll(".ciwi-rule").forEach((el) => {
        el.style.border = `1px solid ${styleConfigData.card.border_color}`;
        el.querySelector('input[type="radio"]').checked = false;
      });

      ruleEl.style.border = "1px solid #000";
      ruleEl.querySelector('input[type="radio"]').checked = true;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertHtmlNextToCartForms);
  } else {
    insertHtmlNextToCartForms();
  }
})();
