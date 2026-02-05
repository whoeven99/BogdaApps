export function initCiwiBundleBlock(bundleData, wrapper) {
  const basicInformation = bundleData.basic_information;
  const discountRules = bundleData.discount_rules;
  const styleConfig = bundleData.style_config;
  const subType = basicInformation.offerType.subtype;

  console.log("subType: ", subType);

  let rulesHtml = "";

  switch (subType) {
    case "quantity-breaks-same":
      rulesHtml = discountRules
        .map((rule, index) => {
          return `
          <div
            class="ciwi-rule"
            data-index="${index}"
            data-qty="${rule.quantity}"
            data-discount="${rule.discount.value}"
            style="
              border: 1px solid ${rule.selectedByDefault ? "#000" : styleConfig.card.border_color};
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 12px;
              position: relative;
              background: ${styleConfig.card.background_color};
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
                    rule.labelText
                      ? `
                        <span
                          style="
                            background:${styleConfig.card.label_color || "#f0f0f0"};
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
              <div class="ciwi-bundle-price" style="text-align:right">
              </div>
            </div>
          </div>
        `;
        })
        .join("");
      break;
    case "buy-x-get-y":
      rulesHtml = discountRules
        .map((rule, index) => {
          return `
          <div
            class="ciwi-rule"
            data-index="${index}"
            data-qty="${rule.quantity}"
            data-discount="${rule.quantity - rule.discount.value}"
            style="
              border: 1px solid ${rule.selectedByDefault ? "#000" : styleConfig.card.border_color};
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 12px;
              position: relative;
              background: ${styleConfig.card.background_color};
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
                    rule.labelText
                      ? `
                        <span
                          style="
                            background:${styleConfig.card.label_color || "#f0f0f0"};
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
              <div class="ciwi-bundle-price" style="text-align:right">
              </div>
            </div>
          </div>
        `;
        })
        .join("");
      break;
    case "quantity-breaks-different":
      rulesHtml = discountRules
        .map((rule, index) => {
          return `
          <div
            class="ciwi-rule"
            data-index="${index}"
            data-qty="${rule.quantity}"
            data-discount="${rule.discount.value}"
            style="
              border: 1px solid ${rule.selectedByDefault ? "#000" : styleConfig.card.border_color};
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 12px;
              position: relative;
              background: ${styleConfig.card.background_color};
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
                    rule.labelText
                      ? `
                        <span
                          style="
                            background:${styleConfig.card.label_color || "#f0f0f0"};
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
              <div class="ciwi-bundle-price" style="text-align:right">
              </div>
            </div>
          </div>
        `;
        })
        .join("");
      break;
    case "complete-bundle":
      break;
    case "subscription":
      break;
    case "progressive-gifts":
      break;
    default:
      break;
  }

  wrapper.innerHTML = `
        <h3
            style="
            font-size:${styleConfig.title.fontSize || "16px"};
            font-weight:${styleConfig.title.fontWeight || 600};
            color:${styleConfig.title.color || "#000"};
            margin-bottom:16px;
            "
        >
            ${styleConfig.title.text || ""}
        </h3>

        <div
          class="ciwi-bundle-countdown"
          style="
            display: none;
          "
        >
          <div
            style="
              font-size: 11px;
              color: #6d7175;
              margin-bottom: 4px;
            "
          >
            ⏱️ Limited time offer ends in
          </div>
          <span
            id="ciwi-countdown"
            style="
              font-size:18px;
              font-weight:600;
              font-family:monospace;
            "
          ></span>
        </div>

        ${rulesHtml}
    `;
}
