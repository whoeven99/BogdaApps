(function () {
  async function insertHtmlNextToCartForms() {
    const configEl = document.getElementById("ciwi-bundles-config");
    if (!configEl) return;

    const configElJson = JSON.parse(configEl.textContent || "{}");
    const ciwiBundleconfig = Object.keys(configElJson)
      .filter((key) => key.startsWith("ciwi_bundles_config_"))
      .map((key) => ({
        bundleKey: key,
        ...configElJson[key],
      }));

    console.log("ciwiBundleconfig: ", ciwiBundleconfig);

    if (ciwiBundleconfig.length === 0) return;

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

    const variantInput =
      form.querySelector < HTMLInputElement > 'input[type="hidden"][name="id"]';

    if (!variantInput) return;

    // 4. 监听 value 变化（关键）
    const observer = new MutationObserver(() => {
      const variantId = String(variantInput.value);

      const inventory = configElJson?.[variantId];

      if (inventory === 0) {
        console.log("Variant out of stock:", variantId);
      }
    });

    // 只监听 value 属性变化
    observer.observe(variantInput, {
      attributes: true,
      attributeFilter: ["value"],
    });

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

    const bundleEntries = ciwiBundleconfig || [];

    let bundleData = null;

    for (const bundle of bundleEntries) {
      console.log("bundle: ", bundle);

      const discountRules = bundle?.discount_rules || [];
      console.log("discountRules: ", discountRules);
      const targetingSettingsData = bundle?.targeting_settings || {};
      console.log("targetingSettingsData: ", targetingSettingsData);
      const selectedProductVariantIds =
        bundle?.product_pool?.include_variant_ids || [];
      console.log("selectedProductVariantIds: ", selectedProductVariantIds);

      /* ---------- 1️⃣ market 校验 ---------- */
      const isInTargetMarketArray =
        targetingSettingsData?.marketVisibilitySettingData?.some((market) =>
          market?.includes(configElJson?.marketId),
        );
      console.log("isInTargetMarketArray: ", isInTargetMarketArray);

      if (!isInTargetMarketArray) continue;

      /* ---------- 2️⃣ variant 校验 ---------- */
      const isInSelectedProductVariantIdsArray =
        selectedProductVariantIds?.includes(String(configElJson?.variantId));
      console.log(
        "isInSelectedProductVariantIdsArray: ",
        isInSelectedProductVariantIdsArray,
      );

      if (!isInSelectedProductVariantIdsArray) continue;

      /* ---------- 3️⃣ 折扣规则有效 ---------- */
      console.log("discountRules: ", discountRules);

      if (!Array.isArray(discountRules) || discountRules.length === 0) continue;

      // ✅ 命中第一个符合的 bundle
      bundleData = bundle;
      break;
    }

    if (!bundleData) return;

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

    let selectedIndex = bundleData.discount_rules.findIndex(
      (r) => r.selectedByDefault,
    );
    if (selectedIndex === -1) selectedIndex = 0;

    qtyInput.value =
      bundleData.discount_rules[selectedIndex]?.trigger_scope?.min_quantity ||
      1;

    const wrapper = document.createElement("div");
    wrapper.className = "ciwi-bundle-wrapper";

    const rulesHtml = bundleData.discount_rules
      .map((rule, index) => {
        let priceHtml = "";

        if (rule.discount.value === 1) {
          priceHtml = `
            <strong style="font-size:16px">
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
            <strong style="font-size:16px">
              ${configElJson.currencySymbol}
              ${Number(
                (rule.trigger_scope.min_quantity *
                  configElJson.price *
                  rule.discount.value) /
                  100,
              ).toFixed(2)}
            </strong>
            <div style="font-size:12px;color:#6d7175;text-decoration:line-through">
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
              border: 1px solid ${rule.selectedByDefault ? "#000" : bundleData.style_config.card.border_color};
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 12px;
              position: relative;
              background: ${bundleData.style_config.card.background_color};
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
                            background:${bundleData.style_config.card.label_color || "#f0f0f0"};
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
            font-size:${bundleData.style_config.title.fontSize || "16px"};
            font-weight:${bundleData.style_config.title.fontWeight || 600};
            color:${bundleData.style_config.title.color || "#000"};
            margin-bottom:16px;
            "
        >
            ${bundleData.style_config.title.text || ""}
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
        el.style.border = `1px solid ${bundleData.style_config.card.border_color}`;
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
