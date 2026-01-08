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

    const bundleData = Object.values(ciwiBundleconfig)[0] || {};

    const discountRules = bundleData.discountRules || [];

    const styleConfigData = bundleData.styleConfigData || {};

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

    qtyInput.value = discountRules[selectedIndex]?.buyQty || 1;

    const parent = form.parentElement;
    if (!parent) return;

    // 防止重复插入
    if (parent.querySelector(".ciwi-bundle-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "ciwi-bundle-wrapper";

    const rulesHtml = discountRules
      .map((rule, index) => {
        let priceHtml = "";

        if (rule.discountRate === 1) {
          priceHtml = `
            <strong style="font-size:16px">
              €${Number((rule.buyQty * configElJson.price) / 100).toFixed(2)}
            </strong>
          `;
        } else if (rule.discountRate === 0) {
          priceHtml = `<strong style="font-size:16px">Free</strong>`;
        } else if (rule.discountRate > 0 && rule.discountRate < 1) {
          priceHtml = `
            <strong style="font-size:16px">
              €${Number(
                (rule.buyQty * configElJson.price * rule.discountRate) / 100,
              ).toFixed(2)}
            </strong>
            <div style="font-size:12px;color:#6d7175;text-decoration:line-through">
              €${Number((rule.buyQty * configElJson.price) / 100).toFixed(2)}
            </div>
          `;
        }

        return `
          <div
            class="ciwi-rule"
            data-index="${index}"
            data-qty="${rule.buyQty}"
            style="
              border: 1px solid ${rule.selectedByDefault ? "#000" : styleConfigData.card_border_color};
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

            <div style="display:flex;align-items:center;gap:8px">
              <input
                type="radio"
                name="discount-rule-group"
                value="${rule.buyQty}"
                checked=${rule.selectedByDefault}
                style="width:16px;height:16px"
              />

              <div style="flex:1">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <strong style="font-size:14px">${rule.title}</strong>

                  ${
                    rule.discountRate < 1
                      ? `
                        <span
                          style="
                            background:${styleConfigData.card_label_color || "#f0f0f0"};
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
            font-size:${styleConfigData.card_title_text_fontSize || "16px"};
            font-weight:${styleConfigData.card_title_text_fontStyle || 600};
            color:${styleConfigData.card_title_color || "#000"};
            margin-bottom:16px;
            "
        >
            ${styleConfigData.card_title_text || ""}
        </h3>

        ${rulesHtml}

        <button style="
            width: 100%;
            background: ${styleConfigData?.card_button_primaryColor};
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin: 12px 0;
        ">
            ${styleConfigData?.card_button_text}
        </button>
    `;

    // 插入到 form 前
    parent.insertBefore(wrapper, form);

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
        el.style.border = `1px solid ${styleConfigData.card_border_color}`;
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
