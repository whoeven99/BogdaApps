(function () {
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getWidgetState(root) {
    if (!root.__lensWidgetState) {
      root.__lensWidgetState = {
        purchaseMode: "one_time",
        subscriptionPlanId: "",
      };
    }

    return root.__lensWidgetState;
  }

  function syncStateWithData(root, data) {
    const state = getWidgetState(root);
    const availablePlans = data.subscriptionOffering?.plans || [];
    const allowOneTime = data.allowOneTimePurchase !== false;
    const allowSubscription =
      Boolean(data.allowSubscription) && availablePlans.length > 0;

    if (!allowOneTime && allowSubscription) {
      state.purchaseMode = "subscription";
    } else if (!allowSubscription) {
      state.purchaseMode = "one_time";
    } else if (
      state.purchaseMode !== "one_time" &&
      state.purchaseMode !== "subscription"
    ) {
      state.purchaseMode = "one_time";
    }

    const selectedPlanExists = availablePlans.some(function (plan) {
      return plan.id === state.subscriptionPlanId;
    });

    if (!selectedPlanExists) {
      state.subscriptionPlanId =
        state.purchaseMode === "subscription" && availablePlans.length > 0
          ? availablePlans[0].id
          : "";
    }

    data.purchaseMode = state.purchaseMode;
    data.selectedSubscriptionPlanId = state.subscriptionPlanId;
    data.selectedSubscriptionPlan =
      availablePlans.find(function (plan) {
        return plan.id === state.subscriptionPlanId;
      }) || null;
  }

  function formatParameterValue(value) {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }

    return String(value);
  }

  function buildLineItemProperties(data) {
    const properties = {
      参数模板: data.template?.name || "未命名模板",
      参数签名: data.match?.signature || "",
      购买方式: data.purchaseMode === "subscription" ? "订阅购买" : "一次性购买",
    };

    (data.template?.parameters || []).forEach((parameter) => {
      if (!Object.prototype.hasOwnProperty.call(data.submittedValues || {}, parameter.code)) {
        return;
      }

      const rawValue = data.submittedValues[parameter.code];
      const propertyLabel = parameter.unitCode
        ? `${parameter.label} (${parameter.unitCode})`
        : parameter.label;

      properties[propertyLabel] = formatParameterValue(rawValue);
    });

    if (data.purchaseMode === "subscription" && data.selectedSubscriptionPlan) {
      properties.订阅方案 = data.selectedSubscriptionPlan.name;
      properties.订阅周期 = `${data.selectedSubscriptionPlan.intervalCount}${data.selectedSubscriptionPlan.interval}`;
    }

    return properties;
  }

  function renderPurchaseControls(data) {
    const availablePlans = data.subscriptionOffering?.plans || [];
    const allowOneTime = data.allowOneTimePurchase !== false;
    const allowSubscription = Boolean(data.allowSubscription);

    if (!allowOneTime && !allowSubscription) {
      return "";
    }

    const modeOptions = [
      allowOneTime
        ? `<option value="one_time" ${data.purchaseMode !== "subscription" ? "selected" : ""}>一次性购买</option>`
        : "",
      allowSubscription
        ? `<option value="subscription" ${data.purchaseMode === "subscription" ? "selected" : ""}>订阅购买</option>`
        : "",
    ].join("");

    return `
      <div class="lens-widget__group">
        <h4 class="lens-widget__group-title">购买方式</h4>
        <div class="lens-widget__field-grid lens-widget__field-grid--compact">
          <label class="lens-widget__field">
            <span>模式</span>
            <select data-lens-widget-purchase-mode>
              ${modeOptions}
            </select>
          </label>
          ${
            data.purchaseMode === "subscription"
              ? `
                <label class="lens-widget__field">
                  <span>订阅方案</span>
                  <select data-lens-widget-subscription-plan ${availablePlans.length === 0 ? "disabled" : ""}>
                    ${
                      availablePlans.length === 0
                        ? '<option value="">当前货品没有可用订阅方案</option>'
                        : availablePlans
                            .map(function (plan) {
                              const summary = `${plan.name} / 每${plan.intervalCount}${plan.interval}`;
                              const suffix = plan.sellingPlanId ? "" : "（未绑定）";
                              return `<option value="${escapeHtml(plan.id)}" ${data.selectedSubscriptionPlanId === plan.id ? "selected" : ""}>${escapeHtml(summary + suffix)}</option>`;
                            })
                            .join("")
                    }
                  </select>
                </label>
              `
              : ""
          }
        </div>
      </div>
    `;
  }

  async function logPurchaseRecord(root, data, status, notes) {
    const recordPath = root.dataset.recordPath;
    if (!recordPath || !data?.match?.matched) {
      return;
    }

    await fetch(recordPath, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        productId: data.product?.id || "",
        productTitle: data.product?.title || "",
        variantId: data.match.variantId || "",
        variantTitle: data.match.variantTitle || "",
        templateName: data.template?.name || "",
        signature: data.match.signature || "",
        submittedValues: data.submittedValues || {},
        purchaseMode: data.purchaseMode === "subscription" ? "subscription" : "one_time",
        status,
        subscriptionPlanId: data.selectedSubscriptionPlan?.id || "",
        subscriptionPlanName: data.selectedSubscriptionPlan?.name || "",
        sellingPlanId: data.selectedSubscriptionPlan?.sellingPlanId || "",
        priceAdjustment:
          typeof data.match.priceAdjustment === "number"
            ? data.match.priceAdjustment
            : null,
        notes: notes || "",
      }),
    }).catch(function () {
      return null;
    });
  }

  function renderDynamicFields(root, data) {
    const container = root.querySelector("[data-lens-widget-dynamic-fields]");
    if (!container) {
      return;
    }

    const parameters = data.template?.parameters || [];
    container.innerHTML =
      parameters.length === 0
        ? '<div class="lens-widget__empty">当前商品还没有可用参数模板。</div>'
        : parameters
            .map((parameter) => {
              const required = parameter.required ? "required" : "";
              const hint = parameter.unitCode
                ? `${escapeHtml(parameter.unitCode)}${parameter.helpText ? ` / ${escapeHtml(parameter.helpText)}` : ""}`
                : escapeHtml(parameter.helpText || "");

              if (parameter.type === "select") {
                return `
                  <label class="lens-widget__field">
                    <span>${escapeHtml(parameter.label)}</span>
                    <select name="${escapeHtml(parameter.code)}" ${required}>
                      <option value="">请选择</option>
                      ${(parameter.options || [])
                        .map(
                          (option) =>
                            `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`,
                        )
                        .join("")}
                    </select>
                    ${hint ? `<small class="lens-widget__hint">${hint}</small>` : ""}
                  </label>
                `;
              }

              if (parameter.type === "boolean") {
                return `
                  <label class="lens-widget__field lens-widget__field--checkbox">
                    <span>${escapeHtml(parameter.label)}</span>
                    <select name="${escapeHtml(parameter.code)}">
                      <option value="false">false</option>
                      <option value="true">true</option>
                    </select>
                    ${hint ? `<small class="lens-widget__hint">${hint}</small>` : ""}
                  </label>
                `;
              }

              return `
                <label class="lens-widget__field">
                  <span>${escapeHtml(parameter.label)}</span>
                  <input
                    type="${parameter.type === "number" ? "number" : "text"}"
                    name="${escapeHtml(parameter.code)}"
                    ${parameter.step !== null && parameter.step !== undefined ? `step="${escapeHtml(parameter.step)}"` : ""}
                    ${parameter.min !== null && parameter.min !== undefined ? `min="${escapeHtml(parameter.min)}"` : ""}
                    ${parameter.max !== null && parameter.max !== undefined ? `max="${escapeHtml(parameter.max)}"` : ""}
                    ${required}
                  >
                  ${hint ? `<small class="lens-widget__hint">${hint}</small>` : ""}
                </label>
              `;
            })
            .join("");
  }

  function renderOutput(root, data) {
    const output = root.querySelector("[data-lens-widget-output]");
    if (!output) {
      return;
    }

    const canAddToCart =
      Boolean(data.match?.matched) &&
      Boolean(data.match?.cartVariantId) &&
      Boolean(data.match?.inventoryAvailable);

    output.innerHTML = `
      <div class="lens-widget__group">
        <h4 class="lens-widget__group-title">系统判断</h4>
          <div class="lens-widget__summary">
          <div class="lens-widget__summary-item">商品: ${escapeHtml(data.product?.title || "未识别")}</div>
          <div class="lens-widget__summary-item">模板: ${escapeHtml(data.template?.name || "未配置")}</div>
          <div class="lens-widget__summary-item">购买方式: ${escapeHtml(data.purchaseMode === "subscription" ? "订阅购买" : "一次性购买")}</div>
          ${
            (data.messages || [])
              .map(
                (message) =>
                  `<div class="lens-widget__note">${escapeHtml(message)}</div>`,
              )
              .join("")
          }
        </div>
      </div>
      ${renderPurchaseControls(data)}
      ${!data.hasSubmittedValues ? '<div class="lens-widget__empty">请填写参数后再开始匹配。</div>' : ""}
      ${
        data.hasSubmittedValues && !data.match?.matched
          ? '<div class="lens-widget__feedback lens-widget__feedback--error">当前参数组合没有匹配到已配置货品。</div>'
          : ""
      }
      ${
        data.match?.matched
          ? `
            <div class="lens-widget__recommendations">
              <div class="lens-widget__item lens-widget__item--visible">
                <div class="lens-widget__item-name">${escapeHtml(data.match.variantTitle || data.match.variantId)}</div>
                <div class="lens-widget__item-meta">Variant ID: ${escapeHtml(data.match.variantId)}</div>
                <div class="lens-widget__item-meta">SKU: ${escapeHtml(data.match.sku || "未设置")}</div>
                <div class="lens-widget__item-meta">库存: ${escapeHtml(data.match.inventoryQuantity)}</div>
                <div class="lens-widget__item-meta">价格附加: ${escapeHtml(data.match.priceAdjustment ?? "未设置")}</div>
                <div class="lens-widget__messages">
                  <div class="lens-widget__note">${escapeHtml(data.match.inventoryAvailable ? "库存可用，可继续下单。" : "已匹配到货品，但库存不足。")}</div>
                </div>
                ${
                  canAddToCart
                    ? `
                      <div class="lens-widget__actions lens-widget__actions--stack">
                        <button type="button" class="lens-widget__submit" data-lens-widget-add-to-cart>
                          加入购物车
                        </button>
                        <button type="button" class="lens-widget__secondary" data-lens-widget-buy-now>
                          立即结账
                        </button>
                      </div>
                    `
                    : ""
                }
                ${
                  data.match.inventoryAvailable && !data.match.cartVariantId
                    ? '<div class="lens-widget__note">已匹配到货品，但当前无法转换为购物车变体 ID，请联系商家检查商品配置。</div>'
                    : ""
                }
              </div>
            </div>
          `
          : ""
      }
    `;
  }

  function setActionButtonsDisabled(root, disabled) {
    root
      .querySelectorAll("[data-lens-widget-add-to-cart], [data-lens-widget-buy-now]")
      .forEach((element) => {
        if (element instanceof HTMLButtonElement) {
          element.disabled = disabled;
        }
      });
  }

  async function addMatchedVariantToCart(root, redirectToCheckout) {
    const output = root.querySelector("[data-lens-widget-output]");
    const data = root.__lensWidgetData;
    if (!output || !data?.match?.matched || !data.match?.cartVariantId) {
      throw new Error("当前没有可下单的匹配货品");
    }

    if (
      data.purchaseMode === "subscription" &&
      !data.selectedSubscriptionPlan
    ) {
      throw new Error("请选择可用的订阅方案");
    }

    if (
      data.purchaseMode === "subscription" &&
      !data.selectedSubscriptionPlan?.sellingPlanId
    ) {
      throw new Error("当前订阅方案尚未绑定真实 Selling Plan，暂不能提交");
    }

    setActionButtonsDisabled(root, true);

    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: Number(data.match.cartVariantId),
              quantity: 1,
              selling_plan:
                data.purchaseMode === "subscription"
                  ? data.selectedSubscriptionPlan?.sellingPlanId
                  : undefined,
              properties: buildLineItemProperties(data),
            },
          ],
        }),
      });

      const payload = await response.json().catch(function () {
        return null;
      });

      if (!response.ok) {
        await logPurchaseRecord(
          root,
          data,
          "cart_add_failed",
          payload?.description || payload?.message || "加入购物车失败",
        );
        throw new Error(payload?.description || payload?.message || "加入购物车失败");
      }

      await logPurchaseRecord(
        root,
        data,
        redirectToCheckout ? "checkout_started" : "cart_added",
        "",
      );

      window.location.href = redirectToCheckout ? "/checkout" : "/cart";
    } finally {
      setActionButtonsDisabled(root, false);
    }
  }

  async function fetchWidgetData(root, includeFormValues) {
    const proxyPath = root.dataset.proxyPath;
    const productId = root.dataset.productId;
    const selectedVariantId = root.dataset.selectedVariantId || "";
    const form = root.querySelector("[data-lens-widget-form]");
    if (!proxyPath || !productId || !(form instanceof HTMLFormElement)) {
      throw new Error("插件初始化参数不完整");
    }

    const formData = new FormData(form);
    const params = new URLSearchParams({
      productId,
      selectedVariantId,
    });
    const state = getWidgetState(root);
    params.set("purchaseMode", state.purchaseMode);
    if (state.subscriptionPlanId) {
      params.set("subscriptionPlanId", state.subscriptionPlanId);
    }
    if (includeFormValues) {
      formData.forEach((value, key) => {
        if (typeof value === "string" && value.trim() !== "") {
          params.set(key, value);
        }
      });
    }

    const response = await fetch(`${proxyPath}?${params.toString()}`, {
      credentials: "same-origin",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "商品匹配失败");
    }

    return data;
  }

  async function loadSchema(root) {
    const output = root.querySelector("[data-lens-widget-output]");
    if (!output) {
      return;
    }

    output.innerHTML = '<div class="lens-widget__loading">正在加载参数模板...</div>';

    try {
      const data = await fetchWidgetData(root, false);
      syncStateWithData(root, data);
      root.__lensWidgetData = data;
      renderDynamicFields(root, data);
      renderOutput(root, data);
    } catch (error) {
      output.innerHTML = `<div class="lens-widget__error">${escapeHtml(error.message || "商品匹配失败")}</div>`;
    }
  }

  async function loadWidget(root) {
    const output = root.querySelector("[data-lens-widget-output]");
    if (!output) {
      return;
    }

    output.innerHTML = '<div class="lens-widget__loading">正在匹配商品...</div>';

    try {
      const data = await fetchWidgetData(root, true);
      syncStateWithData(root, data);
      root.__lensWidgetData = data;
      renderOutput(root, data);
    } catch (error) {
      output.innerHTML = `<div class="lens-widget__error">${escapeHtml(error.message || "商品匹配失败")}</div>`;
    }
  }

  function bindInteractions(root) {
    const form = root.querySelector("[data-lens-widget-form]");
    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        loadWidget(root);
      });
    }

    root.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const addToCartButton = target.closest("[data-lens-widget-add-to-cart]");
      if (addToCartButton) {
        event.preventDefault();
        addMatchedVariantToCart(root, false).catch(function (error) {
          const output = root.querySelector("[data-lens-widget-output]");
          if (output) {
            output.insertAdjacentHTML(
              "afterbegin",
              `<div class="lens-widget__feedback lens-widget__feedback--error">${escapeHtml(error.message || "加入购物车失败")}</div>`,
            );
          }
        });
        return;
      }

      const buyNowButton = target.closest("[data-lens-widget-buy-now]");
      if (buyNowButton) {
        event.preventDefault();
        addMatchedVariantToCart(root, true).catch(function (error) {
          const output = root.querySelector("[data-lens-widget-output]");
          if (output) {
            output.insertAdjacentHTML(
              "afterbegin",
              `<div class="lens-widget__feedback lens-widget__feedback--error">${escapeHtml(error.message || "立即结账失败")}</div>`,
            );
          }
        });
      }
    });

    root.addEventListener("change", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }

      if (target.matches("[data-lens-widget-purchase-mode]")) {
        const state = getWidgetState(root);
        state.purchaseMode = target.value === "subscription" ? "subscription" : "one_time";
        if (root.__lensWidgetData?.hasSubmittedValues) {
          loadWidget(root);
        } else if (root.__lensWidgetData) {
          syncStateWithData(root, root.__lensWidgetData);
          renderOutput(root, root.__lensWidgetData);
        }
        return;
      }

      if (target.matches("[data-lens-widget-subscription-plan]")) {
        const state = getWidgetState(root);
        state.subscriptionPlanId = target.value;
        if (root.__lensWidgetData?.hasSubmittedValues) {
          loadWidget(root);
        } else if (root.__lensWidgetData) {
          syncStateWithData(root, root.__lensWidgetData);
          renderOutput(root, root.__lensWidgetData);
        }
      }
    });
  }

  function init() {
    document.querySelectorAll("[data-lens-widget]").forEach((root) => {
      bindInteractions(root);
      loadSchema(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
