import { detectNumberFormat } from "./utils.js";

async function insertHtmlNextToCartForms() {
  const configEl = document.getElementById("ciwi-bundles-config");
  if (!configEl) return;

  const configElJson = JSON.parse(configEl.textContent || "{}");
  console.log("configElJson: ", configElJson);

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
    console.log(configElJson.variantIds);

    for (const child of children) {
      console.log(child.tagName === "INPUT");
      console.log(child.value);
      console.log(configElJson.variantIds.includes(Number(child.value)));
      if (
        child.tagName === "INPUT" &&
        child.name === "id" &&
        configElJson.variantIds.includes(Number(child.value))
      ) {
        form = cartAddform;
        break;
      }
    }
  }

  console.log("form: ", form);

  if (!form) return;

  const variantInput = form.querySelector('input[name="id"]');

  console.log("variantInput: ", variantInput);

  if (!variantInput) return;

  let insertTarget = null;
  let insertBeforeNode = null;

  const productForm = form.closest("product-form");
  if (productForm && productForm.parentElement) {
    insertTarget = productForm.parentElement;
    insertBeforeNode = productForm;
  } else if (form.parentElement) {
    insertTarget = form.parentElement;
    insertBeforeNode = form;
  }

  if (!insertTarget || !insertBeforeNode) return;
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

    const isInTargetMarketArray =
      targetingSettingsData?.marketVisibilitySettingData?.some((market) =>
        market?.includes(configElJson?.marketId),
      );
    console.log("isInTargetMarketArray: ", isInTargetMarketArray);

    if (!isInTargetMarketArray) continue;

    const isInSelectedProductVariantIdsArray =
      selectedProductVariantIds?.includes(String(variantInput?.value));
    console.log(
      "isInSelectedProductVariantIdsArray: ",
      isInSelectedProductVariantIdsArray,
    );

    if (!isInSelectedProductVariantIdsArray) continue;

    console.log("discountRules: ", discountRules);

    if (!Array.isArray(discountRules) || discountRules.length === 0) continue;

    bundleData = bundle;
    break;
  }

  console.log("bundleData: ", bundleData);

  if (!bundleData) return;

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

  qtyInput.value = bundleData.discount_rules[selectedIndex]?.quantity || 1;

  const wrapper = document.createElement("div");
  wrapper.className = "ciwi-bundle-wrapper";

  const rulesHtml = bundleData.discount_rules
    .map((rule, index) => {
      let priceHtml = "";

      if (rule.discount.value === 1) {
        priceHtml = `
            <strong class="ciwi-money" style="font-size:16px">
              ${configElJson.currencySymbol}
              ${detectNumberFormat(
                configElJson.moneyFormat,
                Number((rule.quantity * configElJson.price) / 100).toFixed(2),
              )}
            </strong>
          `;
      } else if (rule.discount.value === 0) {
        priceHtml = `<strong class="ciwi-money" style="font-size:16px">Free</strong>`;
      } else {
        priceHtml = `
            <strong class="ciwi-money" style="font-size:16px">
              ${configElJson.currencySymbol}
              ${detectNumberFormat(
                configElJson.moneyFormat,
                Number(
                  (rule.quantity * configElJson.price * rule.discount.value) /
                    100,
                ).toFixed(2),
              )}
            </strong>
            <div class="ciwi-money" style="font-size:12px;color:#6d7175;text-decoration:line-through">
              ${configElJson.currencySymbol}
              ${detectNumberFormat(
                configElJson.moneyFormat,
                Number((rule.quantity * configElJson.price) / 100).toFixed(2),
              )}
            </div>
          `;
      }

      return `
          <div
            class="ciwi-rule"
            data-index="${index}"
            data-qty="${rule.quantity}"
            data-discount="${rule.discount.value}"
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
                    rule.labelText
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
              <div class="ciwi-bundle-price" style="text-align:right">
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

        <div
          class="ciwi-bundle-countdown"
          style="
            display: none,
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

  setTimeout(() => {
    const defaultRule = wrapper.querySelector(
      '.ciwi-rule[data-index="' + selectedIndex + '"] input',
    );
    if (defaultRule) defaultRule.checked = true;
  }, 0);

  function renderRulePrice(discount, quantity, price) {
    const original = (quantity * price) / 100;

    if (discount === 1) {
      return `
      <strong class="ciwi-money" style="font-size:16px">
        ${configElJson.currencySymbol}
        ${detectNumberFormat(configElJson.moneyFormat, original.toFixed(2))}
      </strong>
    `;
    }

    if (discount === 0) {
      return `<strong class="ciwi-money ciwi-bundle-price" style="font-size:16px">Free</strong>`;
    }

    const discounted = (quantity * price * discount) / 100;

    return `
    <strong class="ciwi-money ciwi-bundle-price" style="font-size:16px">
      ${configElJson.currencySymbol}
      ${detectNumberFormat(configElJson.moneyFormat, discounted.toFixed(2))}
    </strong>

    <div
      class="ciwi-money"
      style="font-size:12px;color:#6d7175;text-decoration:line-through"
    >
      ${configElJson.currencySymbol}
      ${detectNumberFormat(configElJson.moneyFormat, original.toFixed(2))}
    </div>
  `;
  }

  function syncBundleDisabled() {
    const variantId = String(variantInput.value);
    sessionStorage.setItem(
      "current-ciwi-bundle-rule",
      JSON.stringify({
        [`${variantId}`]: `#Bundle ${bundleData?.bundleKey.split("ciwi_bundles_config_")[1]}`,
      }),
    );
    const variantData = configElJson?.[variantId];
    const inventoryQuantity = Number(variantData?.inventoryQuantity);
    const inventoryPolicy = variantData?.inventoryPolicy;
    const inventoryAvailable = variantData?.available;
    const price = Number(variantData?.price);

    const disabled =
      inventoryQuantity === 0 &&
      inventoryPolicy === "deny" &&
      inventoryAvailable === false;

    wrapper.querySelectorAll(".ciwi-rule").forEach((ruleEl) => {
      ruleEl.style.opacity = disabled ? "0.5" : "1";
      ruleEl.style.cursor = disabled ? "not-allowed" : "pointer";
      const qty = ruleEl.dataset.qty;
      const discount = ruleEl.dataset.discount;
      const radio = ruleEl.querySelector('input[type="radio"]');
      if (radio) {
        radio.disabled = disabled;
        if (disabled) radio.checked = false;
      }
      const priceEl = ruleEl.querySelector(".ciwi-bundle-price");
      if (priceEl) {
        priceEl.innerHTML = renderRulePrice(discount, qty, price);
      }
    });
  }

  function CountdownEnable(enable, deadline, durationHours, color) {
    console.log("enable: ", enable);
    console.log("deadline: ", deadline);
    console.log("durationHours: ", durationHours);
    console.log("color: ", color);

    if (!enable || !deadline) return;

    const maxDurationMs = durationHours * 60 * 60 * 1000;
    const now = Date.now();
    const endTime = new Date(deadline).getTime();

    // 不在倒计时窗口内，不渲染
    if (endTime - now > maxDurationMs) return;

    const el = document.getElementById("ciwi-countdown");
    if (!el) return;

    el.style.color = color;

    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function tick() {
      const diff = endTime - Date.now();

      if (diff <= 0) {
        el.textContent = "00:00:00";
        clearInterval(timer);

        const wrapper = document.querySelector(".ciwi-bundle-wrapper");
        if (wrapper) {
          wrapper.style.display = "none";
        }

        return;
      }

      const totalSeconds = Math.floor(diff / 1000);

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      el.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

      const countdownEl = document.querySelector(".ciwi-bundle-countdown");
      if (countdownEl) {
        countdownEl.style.display = "block";
        countdownEl.style.background = "#fff8f0";
        countdownEl.style.border = "1px solid #ffd700";
        countdownEl.style.borderRadius = "6px";
        countdownEl.style.padding = "8px 12px";
        countdownEl.style.marginBottom = "16px";
        countdownEl.style.textAlign = "center";
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
  }

  function CiwiBundleInitialize() {
    const enabled = bundleData.style_config?.countdown?.enabled;
    const deadline = bundleData.targeting_settings?.schedule?.endsAt;
    const duration = bundleData.style_config?.countdown?.duration;
    const color = bundleData.style_config?.countdown?.color;

    if (deadline) {
      const now = Date.now();
      const endTime = new Date(deadline).getTime();
      if (now - endTime >= 0) {
        return;
      }
    }

    wrapper.addEventListener("click", (e) => {
      if (Number(configElJson?.[String(variantInput.value)]) === 0) return;

      const ruleEl = e.target.closest(".ciwi-rule");
      if (!ruleEl) return;

      const qty = ruleEl.dataset.qty;
      qtyInput.value = qty;

      wrapper.querySelectorAll(".ciwi-rule").forEach((el) => {
        el.style.border = `1px solid ${bundleData.style_config.card.border_color}`;
        el.querySelector('input[type="radio"]').checked = false;
      });

      ruleEl.style.border = "1px solid #000";
      ruleEl.querySelector('input[type="radio"]').checked = true;
    });

    insertTarget.insertBefore(wrapper, insertBeforeNode);

    CountdownEnable(enabled, deadline, duration, color);
  }

  const observer = new MutationObserver(syncBundleDisabled);
  observer.observe(variantInput, {
    attributes: true,
    attributeFilter: ["value"],
  });

  syncBundleDisabled();
  CiwiBundleInitialize();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", insertHtmlNextToCartForms);
} else {
  insertHtmlNextToCartForms();
}
