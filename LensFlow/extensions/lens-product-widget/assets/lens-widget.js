(function () {
  const prototypeScenarios = [
    {
      id: "frame-prescription",
      title: "镜框 + 处方优先",
      subtitle: "先录入处方，再推荐适配镜片",
      tag: "推荐主路径",
      productTitle: "Aero Round 镜框",
      priceLabel: "镜框 $129 + 镜片待定",
      summary: [
        { label: "主商品", value: "Aero Round / Black / M" },
        { label: "导购路径", value: "处方优先" },
        { label: "当前处方", value: "SPH -4.50 / CYL -1.25 / PD 63" },
        { label: "推荐结果", value: "1.67 高折射率防蓝光镜片" },
      ],
      steps: [
        {
          title: "入口选择",
          description: "先帮助用户确认任务，而不是直接展示全部字段。",
          primaryActionLabel: "进入处方录入",
          secondaryActionLabel: "查看其他路径",
          cards: [
            {
              title: "交互目标",
              tone: "info",
              body: "入口要先让用户知道：系统会自动根据处方匹配镜片并形成完整方案。",
            },
          ],
        },
        {
          title: "处方录入",
          description: "按左右眼分组输入处方，并在高风险参数处实时给出提醒。",
          primaryActionLabel: "查看推荐结果",
          secondaryActionLabel: "返回入口",
          cards: [
            {
              title: "高度数提醒",
              tone: "warning",
              body: "命中高度数阈值后，系统会自动缩小镜片范围，并解释为什么推荐更薄方案。",
            },
          ],
        },
        {
          title: "推荐结果",
          description: "展示推荐镜片、备选方案和推荐原因，同时保留镜框与价格摘要。",
          primaryActionLabel: "确认方案",
          secondaryActionLabel: "修改处方",
          recommendations: [
            {
              title: "1.67 高折射率防蓝光镜片",
              badge: "系统推荐",
              price: "$168",
              summary: "更薄、更适合当前度数，兼顾日常屏幕使用。",
              reasons: [
                "度数较深，优先推荐高折射率。",
                "消费者偏好长时间屏幕使用场景。",
                "当前镜框尺寸适合此镜片厚度方案。",
              ],
            },
            {
              title: "1.61 标准防蓝光镜片",
              badge: "备选",
              price: "$128",
              summary: "价格更低，但边缘厚度表现略弱。",
              reasons: ["仍可加工，但厚度和重量表现不如推荐项。"],
            },
          ],
        },
        {
          title: "Bundle 确认",
          description: "确认页同时展示镜框、镜片、加工说明与价格拆分。",
          primaryActionLabel: "加入购物车",
          secondaryActionLabel: "返回结果页",
          note: "这里重点验证用户是否清楚自己买到的是镜框 + 镜片的完整方案。",
        },
      ],
    },
    {
      id: "frame-feature",
      title: "镜框 + 功能优先",
      subtitle: "先按用途选功能，再补处方",
      tag: "功能导购",
      productTitle: "City Square 镜框",
      priceLabel: "镜框 $149 + 镜片待定",
      summary: [
        { label: "主商品", value: "City Square / Tortoise / L" },
        { label: "导购路径", value: "功能优先" },
        { label: "已选功能", value: "驾驶 / 偏光 / 轻薄" },
        { label: "当前状态", value: "等待录入处方验证" },
      ],
      steps: [
        {
          title: "功能入口",
          description: "用户知道自己的使用场景，但不知道处方细节，先从用途开始。",
          primaryActionLabel: "选择镜片功能",
          secondaryActionLabel: "改走处方优先",
        },
        {
          title: "功能选择",
          description: "用卡片而不是字段展示偏光、变色、防蓝光和超薄的差异。",
          primaryActionLabel: "继续录入处方",
          secondaryActionLabel: "重置选择",
          cards: [
            {
              title: "驾驶 + 偏光",
              tone: "success",
              body: "降低路面反光，提升白天驾驶舒适度。",
              badge: "已选择",
              meta: "+$79",
            },
            {
              title: "变色",
              tone: "info",
              body: "室内外切换更方便，适合通勤。",
              meta: "+$99",
            },
            {
              title: "偏光说明",
              tone: "info",
              body: "偏光适合强反光场景，但结果页需要提醒部分数字屏幕可视性影响。",
            },
          ],
        },
        {
          title: "阻断与替代",
          description: "当前偏光方案与加工条件冲突，系统不只报错，而是解释并给替代建议。",
          primaryActionLabel: "查看替代方案",
          secondaryActionLabel: "重新选择功能",
          cards: [
            {
              title: "当前不可选原因",
              tone: "critical",
              body: "该镜框边型与当前偏光加工条件冲突，不能保证加工质量。",
            },
            {
              title: "替代建议",
              tone: "success",
              body: "建议改为驾驶增强 + 高折射率组合，保留清晰度并满足加工约束。",
            },
          ],
        },
      ],
    },
    {
      id: "contacts-subscription",
      title: "隐形眼镜订阅原型",
      subtitle: "验证抛期、折扣与订阅入口位置",
      tag: "订阅原型",
      productTitle: "Daily Soft 1-Day",
      priceLabel: "单盒 $36 / 订阅最低 9 折",
      summary: [
        { label: "商品", value: "Daily Soft 1-Day / 30 片装" },
        { label: "抛期", value: "daily" },
        { label: "订阅方案", value: "每 30 天配送 2 盒" },
        { label: "折扣", value: "首单 95 折 / 续订 9 折" },
      ],
      steps: [
        {
          title: "商品入口",
          description: "商品页优先展示一次性购买和订阅购买的切换，以及抛期说明。",
          primaryActionLabel: "查看订阅方案",
          secondaryActionLabel: "切换一次性购买",
        },
        {
          title: "订阅方案",
          description: "这里重点验证抛期映射、推荐购买量、周期选择和折扣是否清晰。",
          primaryActionLabel: "确认订阅",
          secondaryActionLabel: "修改方案",
          cards: [
            {
              title: "每 30 天 2 盒",
              tone: "success",
              body: "适合双眼每日佩戴。",
              badge: "推荐",
              meta: "9 折",
            },
            {
              title: "每 60 天 4 盒",
              tone: "info",
              body: "减少频繁配送，适合固定配戴习惯。",
              meta: "88 折",
            },
            {
              title: "订阅说明",
              tone: "info",
              body: "后续会替换成真实 Selling Plan，但当前先验证用户能否看懂周期和优惠。",
            },
          ],
        },
        {
          title: "订阅确认",
          description: "确认页展示参数、周期、折扣、下次配送时间和可暂停说明。",
          primaryActionLabel: "开始订阅",
          secondaryActionLabel: "返回修改",
          note: "这一页重点验证订阅比一次性购买多出来的信息是否过载。",
        },
      ],
    },
  ];

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
        prototypeScenarioId: prototypeScenarios[0].id,
        prototypeStepIndex: 0,
        prototypeSelections: {
          featureChoice: "drive-polarized",
          prescriptionPreset: "high_index",
          subscriptionChoice: "30-days",
        },
        prototypeDecisionMode: "system",
        prototypeSelectedRecommendation: "rec-1",
        prototypeRecoveryChoice: "high_index_drive",
        prototypePrescription: {
          leftEye: { sph: "-4.50", cyl: "-1.25", axis: "180" },
          rightEye: { sph: "-4.00", cyl: "-0.75", axis: "170" },
          add: "1.50",
          pd: "63",
        },
        prototypeComparisonMode: false,
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

  function renderPrototypeBadge(content, tone) {
    return `<span class="lens-widget__prototype-badge lens-widget__prototype-badge--${escapeHtml(
      tone || "info",
    )}">${escapeHtml(content)}</span>`;
  }

  function renderPrototypeCard(card) {
    return `
      <div class="lens-widget__prototype-card">
        <div class="lens-widget__prototype-card-top">
          <h5>${escapeHtml(card.title)}</h5>
          ${card.badge ? renderPrototypeBadge(card.badge, card.tone || "success") : ""}
          ${card.meta ? renderPrototypeBadge(card.meta, "info") : ""}
        </div>
        <div class="lens-widget__prototype-note">${escapeHtml(card.body)}</div>
      </div>
    `;
  }

  function renderPrototypeRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return "";
    }

    return recommendations
      .map(function (item) {
        return `
          <div class="lens-widget__prototype-card">
            <div class="lens-widget__prototype-card-top">
              <h5>${escapeHtml(item.title)}</h5>
              ${item.badge ? renderPrototypeBadge(item.badge, "success") : ""}
              ${item.price ? renderPrototypeBadge(item.price, "info") : ""}
            </div>
            <div class="lens-widget__prototype-note">${escapeHtml(item.summary)}</div>
            <ul class="lens-widget__prototype-list">
              ${(item.reasons || [])
                .map(function (reason) {
                  return `<li>${escapeHtml(reason)}</li>`;
                })
                .join("")}
            </ul>
          </div>
        `;
      })
      .join("");
  }

  function renderPrototypeResultRecommendations(step, state) {
    if (!step.recommendations || step.recommendations.length === 0) {
      return "";
    }

    return `
      <div class="lens-widget__prototype-grid">
        ${step.recommendations
          .map(function (item) {
            const active = item.id === state.prototypeSelectedRecommendation;
            return `
              <button
                type="button"
                class="lens-widget__prototype-choice lens-widget__prototype-choice--result ${active ? "is-active" : ""}"
                data-lens-widget-result-pick="${escapeHtml(item.id)}"
              >
                <div class="lens-widget__prototype-card-top">
                  <strong>${escapeHtml(item.title)}</strong>
                  ${item.badge ? renderPrototypeBadge(item.badge, item.id === "rec-1" ? "success" : "info") : ""}
                  ${item.price ? renderPrototypeBadge(item.price, "warning") : ""}
                </div>
                <span>${escapeHtml(item.summary)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPrototypeDecisionPanel(step, state) {
    if (!step.recommendations || step.recommendations.length === 0) {
      return "";
    }

    const selectedRecommendation =
      step.recommendations.find(function (item) {
        return item.id === state.prototypeSelectedRecommendation;
      }) || step.recommendations[0];
    const price = getPrototypePriceSummary(state);

    return `
      <div class="lens-widget__prototype-panel">
        <div class="lens-widget__prototype-card-top">
          <h5>选择模式</h5>
          <div class="lens-widget__prototype-chip-row">
            <button
              type="button"
              class="lens-widget__prototype-chip ${state.prototypeDecisionMode === "system" ? "is-active" : ""}"
              data-lens-widget-decision-mode="system"
            >
              系统推荐
            </button>
            <button
              type="button"
              class="lens-widget__prototype-chip ${state.prototypeDecisionMode === "manual" ? "is-active" : ""}"
              data-lens-widget-decision-mode="manual"
            >
              我自己选
            </button>
          </div>
        </div>
        <div class="lens-widget__prototype-note">系统推荐模式强调解释和默认推荐，自选模式强调可比性和价格感知。</div>
        ${renderPrototypeResultRecommendations(step, state)}
        <div class="lens-widget__prototype-card lens-widget__prototype-card--info">
          <div class="lens-widget__prototype-card-top">
            <h5>当前选中方案</h5>
            ${renderPrototypeBadge(price.lensPrice, "info")}
            ${renderPrototypeBadge(price.totalPrice, "success")}
          </div>
          <div class="lens-widget__prototype-note">${escapeHtml(selectedRecommendation.summary)}</div>
          <ul class="lens-widget__prototype-list">
            ${(selectedRecommendation.reasons || [])
              .map(function (reason) {
                return `<li>${escapeHtml(reason)}</li>`;
              })
              .join("")}
            <li>${escapeHtml(price.savings)}</li>
          </ul>
        </div>
      </div>
    `;
  }

  function renderPrototypeBlockedRecoveryPanel(state) {
    const options = [
      {
        id: "high_index_drive",
        title: "切换为驾驶增强 + 高折射率",
        description: "保留驾驶场景清晰度，同时满足加工约束。",
      },
      {
        id: "photochromic_backup",
        title: "改为变色备选方案",
        description: "牺牲偏光效果，换取更广的加工兼容性。",
      },
    ];

    return `
      <div class="lens-widget__prototype-panel">
        <h5>阻断后的恢复路径</h5>
        <div class="lens-widget__prototype-note">当前不是只报错，而是明确告诉用户下一步还能怎么继续。</div>
        <div class="lens-widget__prototype-grid">
          ${options
            .map(function (option) {
              const active = option.id === state.prototypeRecoveryChoice;
              return `
                <button
                  type="button"
                  class="lens-widget__prototype-choice ${active ? "is-active" : ""}"
                  data-lens-widget-recovery-choice="${escapeHtml(option.id)}"
                >
                  <strong>${escapeHtml(option.title)}</strong>
                  <span>${escapeHtml(option.description)}</span>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderPrototypeConfirmationPanel(scenario, state) {
    const price = getPrototypePriceSummary(state);
    const isSubscription = scenario.id === "contacts-subscription";
    const lines = isSubscription
      ? [
          { label: "商品", value: "Daily Soft 1-Day / 30 片装 x 2" },
          { label: "购买方式", value: "订阅购买" },
          { label: "配送周期", value: state.prototypeSelections.subscriptionChoice === "60-days" ? "每 60 天配送 4 盒" : "每 30 天配送 2 盒" },
          { label: "首单价格", value: "$68.40" },
          { label: "续订价格", value: "$64.80" },
        ]
      : [
          { label: "主商品", value: scenario.productTitle },
          { label: "镜片方案", value: state.prototypeSelectedRecommendation === "rec-2" ? "1.61 标准防蓝光镜片" : "1.67 高折射率防蓝光镜片" },
          { label: "加工服务", value: "标准加工 / 处方校验" },
          { label: "镜框价格", value: "$129" },
          { label: "镜片价格", value: price.lensPrice },
          { label: "预计总价", value: price.totalPrice },
        ];

    const notices = isSubscription
      ? [
          "可随时暂停、跳过或取消下一次配送。",
          "参数变更或库存异常时，需要重新确认订阅方案。",
          "首单折扣与续订折扣可能不同，需要在确认页明确说明。",
        ]
      : [
          "当前价格已包含主商品与镜片，用户不应误以为只购买镜框。",
          "高度数方案需要强调厚度、适配性和加工周期。",
          "下单前需要再次确认处方摘要与最终镜片选择。",
        ];

    return `
      <div class="lens-widget__prototype-panel">
        <div class="lens-widget__prototype-card-top">
          <h5>最终确认</h5>
          ${renderPrototypeBadge(isSubscription ? "订阅确认" : "Bundle 确认", "success")}
        </div>
        <div class="lens-widget__prototype-note">这里模拟加入购物车前的最后一步，目标是让用户真正理解自己买了什么，以及之后会发生什么。</div>
        <div class="lens-widget__prototype-confirm-list">
          ${lines
            .map(function (item) {
              return `
                <div class="lens-widget__prototype-confirm-row">
                  <span>${escapeHtml(item.label)}</span>
                  <strong>${escapeHtml(item.value)}</strong>
                </div>
              `;
            })
            .join("")}
        </div>
        <div class="lens-widget__prototype-card lens-widget__prototype-card--warning">
          <div class="lens-widget__prototype-card-top">
            <h5>${isSubscription ? "订阅说明" : "风险与免责声明"}</h5>
            ${renderPrototypeBadge(isSubscription ? "周期购买" : "请确认", "warning")}
          </div>
          <ul class="lens-widget__prototype-list">
            ${notices
              .map(function (item) {
                return `<li>${escapeHtml(item)}</li>`;
              })
              .join("")}
          </ul>
        </div>
      </div>
    `;
  }

  function getPrototypeSelectionSummary(state) {
    return [
      {
        label: "功能偏好",
        value:
          state.prototypeSelections.featureChoice === "photochromic"
            ? "变色"
            : state.prototypeSelections.featureChoice === "ultra-thin"
              ? "超薄"
              : "驾驶 + 偏光",
      },
      {
        label: "处方档位",
        value:
          state.prototypeSelections.prescriptionPreset === "standard"
            ? "常规度数"
            : state.prototypeSelections.prescriptionPreset === "progressive"
              ? "渐进需求"
              : "高度数",
      },
      {
        label: "决策模式",
        value: state.prototypeDecisionMode === "manual" ? "我自己选" : "系统推荐",
      },
      {
        label: "当前方案",
        value:
          state.prototypeSelectedRecommendation === "rec-2"
            ? "1.61 标准防蓝光镜片"
            : "1.67 高折射率防蓝光镜片",
      },
      {
        label: "左右眼摘要",
        value: `L ${state.prototypePrescription.leftEye.sph}/${state.prototypePrescription.leftEye.cyl} x ${state.prototypePrescription.leftEye.axis} | R ${state.prototypePrescription.rightEye.sph}/${state.prototypePrescription.rightEye.cyl} x ${state.prototypePrescription.rightEye.axis}`,
      },
      {
        label: "ADD / PD",
        value: `${state.prototypePrescription.add} / ${state.prototypePrescription.pd}`,
      },
      {
        label: "订阅偏好",
        value:
          state.prototypeSelections.subscriptionChoice === "60-days"
            ? "每 60 天 4 盒"
            : "每 30 天 2 盒",
      },
    ];
  }

  function getPrototypePriceSummary(state) {
    if (state.prototypeSelectedRecommendation === "rec-2") {
      return {
        lensPrice: "$128",
        totalPrice: "$257",
        savings: "比系统推荐便宜 $40",
      };
    }

    return {
      lensPrice: "$168",
      totalPrice: "$297",
      savings: "当前为更薄、更适合高度数的方案",
    };
  }

  function getPrototypePrescriptionInsight(state) {
    if (state.prototypeSelections.prescriptionPreset === "high_index") {
      return {
        tone: "warning",
        title: "高折射率提示",
        body: "当前处方档位偏高，系统应优先展示更薄镜片，并减少不适合的标准镜片选项。",
      };
    }

    if (state.prototypeSelections.prescriptionPreset === "progressive") {
      return {
        tone: "info",
        title: "渐进需求提示",
        body: "当前场景需要同时解释 ADD、适应期以及多焦点相关说明。",
      };
    }

    return {
      tone: "success",
      title: "常规处方提示",
      body: "当前可以优先展示标准镜片，再根据功能偏好提供升级项。",
    };
  }

  function renderPrototypePathCards(scenarioId) {
    const cards = [
      {
        scenarioId: "frame-prescription",
        title: "我有处方",
        description: "直接输入处方，让系统先过滤镜片范围。",
      },
      {
        scenarioId: "frame-feature",
        title: "我先看功能",
        description: "先按场景筛选，再补处方验证。",
      },
      {
        scenarioId: "contacts-subscription",
        title: "我想周期购买",
        description: "直接验证隐形眼镜订阅入口与折扣说明。",
      },
    ];

    return `
      <div class="lens-widget__prototype-grid">
        ${cards
          .map(function (card) {
            const active = card.scenarioId === scenarioId;
            return `
              <button
                type="button"
                class="lens-widget__prototype-choice ${active ? "is-active" : ""}"
                data-lens-widget-prototype-scenario="${escapeHtml(card.scenarioId)}"
              >
                <strong>${escapeHtml(card.title)}</strong>
                <span>${escapeHtml(card.description)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPrototypeFeatureChoices(state) {
    const options = [
      {
        id: "drive-polarized",
        title: "驾驶 + 偏光",
        description: "降低路面反光，适合日间驾驶。",
      },
      {
        id: "photochromic",
        title: "变色",
        description: "室内外切换更顺，适合通勤。",
      },
      {
        id: "ultra-thin",
        title: "超薄",
        description: "减轻边缘厚度，更适合较高处方。",
      },
    ];

    return `
      <div class="lens-widget__prototype-grid">
        ${options
          .map(function (option) {
            const active = option.id === state.prototypeSelections.featureChoice;
            return `
              <button
                type="button"
                class="lens-widget__prototype-choice ${active ? "is-active" : ""}"
                data-lens-widget-prototype-select="featureChoice"
                data-lens-widget-prototype-value="${escapeHtml(option.id)}"
              >
                <strong>${escapeHtml(option.title)}</strong>
                <span>${escapeHtml(option.description)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPrototypePrescriptionPresets(state) {
    const presets = [
      { id: "standard", title: "常规度数", meta: "标准镜片通常可售" },
      { id: "high_index", title: "高度数", meta: "触发高折射率推荐" },
      { id: "progressive", title: "渐进需求", meta: "需要 ADD 与多焦点说明" },
    ];

    return `
      <div class="lens-widget__prototype-grid">
        ${presets
          .map(function (preset) {
            const active = preset.id === state.prototypeSelections.prescriptionPreset;
            return `
              <button
                type="button"
                class="lens-widget__prototype-choice ${active ? "is-active" : ""}"
                data-lens-widget-prototype-select="prescriptionPreset"
                data-lens-widget-prototype-value="${escapeHtml(preset.id)}"
              >
                <strong>${escapeHtml(preset.title)}</strong>
                <span>${escapeHtml(preset.meta)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPrototypeSubscriptionChoices(state) {
    const choices = [
      { id: "30-days", title: "每 30 天 2 盒", meta: "推荐 / 9 折" },
      { id: "60-days", title: "每 60 天 4 盒", meta: "更少配送 / 88 折" },
    ];

    return `
      <div class="lens-widget__prototype-grid">
        ${choices
          .map(function (choice) {
            const active = choice.id === state.prototypeSelections.subscriptionChoice;
            return `
              <button
                type="button"
                class="lens-widget__prototype-choice ${active ? "is-active" : ""}"
                data-lens-widget-prototype-select="subscriptionChoice"
                data-lens-widget-prototype-value="${escapeHtml(choice.id)}"
              >
                <strong>${escapeHtml(choice.title)}</strong>
                <span>${escapeHtml(choice.meta)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPrototypeRxOptionGroup(title, eye, field, options, currentValue) {
    return `
      <div class="lens-widget__prototype-rx-group">
        <strong>${escapeHtml(title)}</strong>
        <div class="lens-widget__prototype-chip-row">
          ${options
            .map(function (option) {
              const active = option === currentValue;
              return `
                <button
                  type="button"
                  class="lens-widget__prototype-chip ${active ? "is-active" : ""}"
                  data-lens-widget-rx-eye="${escapeHtml(eye)}"
                  data-lens-widget-rx-field="${escapeHtml(field)}"
                  data-lens-widget-rx-value="${escapeHtml(option)}"
                >
                  ${escapeHtml(option)}
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderPrototypeExtrasGroup(field, title, options, currentValue) {
    return `
      <div class="lens-widget__prototype-rx-group">
        <strong>${escapeHtml(title)}</strong>
        <div class="lens-widget__prototype-chip-row">
          ${options
            .map(function (option) {
              const active = option === currentValue;
              return `
                <button
                  type="button"
                  class="lens-widget__prototype-chip ${active ? "is-active" : ""}"
                  data-lens-widget-rx-extra="${escapeHtml(field)}"
                  data-lens-widget-rx-value="${escapeHtml(option)}"
                >
                  ${escapeHtml(option)}
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderPrototypePrescriptionInput(state) {
    const insight = getPrototypePrescriptionInsight(state);
    return `
      <div class="lens-widget__prototype-panel">
        <h5>处方录入模拟</h5>
        <div class="lens-widget__prototype-note">这里用快捷档位和左右眼卡片模拟真实录入节奏，重点验证字段分组和提示方式。</div>
        ${renderPrototypePrescriptionPresets(state)}
        <div class="lens-widget__prototype-rx-layout">
          <div class="lens-widget__prototype-rx-eye">
            <div class="lens-widget__prototype-card-top">
              <h5>左眼 L</h5>
              ${renderPrototypeBadge(state.prototypePrescription.leftEye.sph, "info")}
            </div>
            ${renderPrototypeRxOptionGroup("SPH", "leftEye", "sph", ["-2.00", "-4.50", "-6.50"], state.prototypePrescription.leftEye.sph)}
            ${renderPrototypeRxOptionGroup("CYL", "leftEye", "cyl", ["0.00", "-0.75", "-1.25"], state.prototypePrescription.leftEye.cyl)}
            ${renderPrototypeRxOptionGroup("AXIS", "leftEye", "axis", ["90", "170", "180"], state.prototypePrescription.leftEye.axis)}
          </div>
          <div class="lens-widget__prototype-rx-eye">
            <div class="lens-widget__prototype-card-top">
              <h5>右眼 R</h5>
              ${renderPrototypeBadge(state.prototypePrescription.rightEye.sph, "info")}
            </div>
            ${renderPrototypeRxOptionGroup("SPH", "rightEye", "sph", ["-2.00", "-4.00", "-6.00"], state.prototypePrescription.rightEye.sph)}
            ${renderPrototypeRxOptionGroup("CYL", "rightEye", "cyl", ["0.00", "-0.75", "-1.25"], state.prototypePrescription.rightEye.cyl)}
            ${renderPrototypeRxOptionGroup("AXIS", "rightEye", "axis", ["80", "170", "180"], state.prototypePrescription.rightEye.axis)}
          </div>
        </div>
        <div class="lens-widget__prototype-rx-layout lens-widget__prototype-rx-layout--compact">
          ${renderPrototypeExtrasGroup("add", "ADD", ["0.00", "1.00", "1.50"], state.prototypePrescription.add)}
          ${renderPrototypeExtrasGroup("pd", "PD", ["60", "63", "66"], state.prototypePrescription.pd)}
        </div>
        <div class="lens-widget__prototype-card lens-widget__prototype-card--${escapeHtml(insight.tone)}">
          <div class="lens-widget__prototype-card-top">
            <h5>${escapeHtml(insight.title)}</h5>
            ${renderPrototypeBadge(insight.tone === "warning" ? "高风险" : insight.tone === "info" ? "需说明" : "可继续", insight.tone)}
          </div>
          <div class="lens-widget__prototype-note">${escapeHtml(insight.body)}</div>
        </div>
      </div>
    `;
  }

  function renderPrototypeInteractivePanel(scenario, stepIndex, state) {
    if (stepIndex === 0) {
      return `
        <div class="lens-widget__prototype-panel">
          <h5>路径切换</h5>
          <div class="lens-widget__prototype-note">这里模拟商品页顶部的任务型入口卡片。</div>
          ${renderPrototypePathCards(scenario.id)}
        </div>
      `;
    }

    if (scenario.id === "frame-prescription" && stepIndex === 1) {
      return renderPrototypePrescriptionInput(state);
    }

    if (scenario.id === "frame-feature" && stepIndex === 1) {
      return `
        <div class="lens-widget__prototype-panel">
          <h5>功能卡选择</h5>
          <div class="lens-widget__prototype-note">这里模拟卡片点击态，而不是传统 select 字段。</div>
          ${renderPrototypeFeatureChoices(state)}
        </div>
      `;
    }

    if (scenario.id === "contacts-subscription" && stepIndex === 1) {
      return `
        <div class="lens-widget__prototype-panel">
          <h5>订阅方案切换</h5>
          <div class="lens-widget__prototype-note">点击不同方案，验证推荐购买量和折扣表达是否清晰。</div>
          ${renderPrototypeSubscriptionChoices(state)}
        </div>
      `;
    }

    if (scenario.id === "frame-prescription" && stepIndex === 2) {
      return renderPrototypeDecisionPanel(scenario.steps[stepIndex], state);
    }

    if (scenario.id === "frame-feature" && stepIndex === 2) {
      return renderPrototypeBlockedRecoveryPanel(state);
    }

    if (scenario.id === "frame-prescription" && stepIndex === 3) {
      return renderPrototypeConfirmationPanel(scenario, state);
    }

    if (scenario.id === "contacts-subscription" && stepIndex === 2) {
      return renderPrototypeConfirmationPanel(scenario, state);
    }

    return "";
  }

  function renderPrototypeComparisonPanel(step, state) {
    if (!step.recommendations || step.recommendations.length === 0) {
      return "";
    }

    return `
      <div class="lens-widget__prototype-panel">
        <div class="lens-widget__prototype-card-top">
          <h5>结果对比</h5>
          <button
            type="button"
            class="lens-widget__prototype-button lens-widget__prototype-button--secondary"
            data-lens-widget-prototype-toggle="comparison"
          >
            ${state.prototypeComparisonMode ? "关闭对比" : "打开对比"}
          </button>
        </div>
        <div class="lens-widget__prototype-note">这里模拟用户在结果页切换“推荐项”和“备选项”的对比视图。</div>
        ${
          state.prototypeComparisonMode
            ? `<div class="lens-widget__prototype-grid lens-widget__prototype-grid--comparison">${renderPrototypeRecommendations(
                step.recommendations,
              )}</div>`
            : ""
        }
      </div>
    `;
  }

  function renderPrototypeHelperPanel(step) {
    const state = arguments[1];
    const insight = state ? getPrototypePrescriptionInsight(state) : null;
    const price = state ? getPrototypePriceSummary(state) : null;
    return `
      <div class="lens-widget__prototype-panel">
        <h5>辅助决策区</h5>
        <div class="lens-widget__prototype-note">这一块模拟真实商品页中靠近主流程的解释区，用来承接知识说明、风险提醒和下一步预期。</div>
        <ul class="lens-widget__prototype-list">
          <li>当前步骤：${escapeHtml(step.title)}</li>
          <li>主操作：${escapeHtml(step.primaryActionLabel || "下一步")}</li>
          ${insight ? `<li>${escapeHtml(insight.title)}：${escapeHtml(insight.body)}</li>` : ""}
          ${price ? `<li>镜片价格：${escapeHtml(price.lensPrice)} / 预计总价：${escapeHtml(price.totalPrice)}</li>` : ""}
          <li>这里后续可接规则解释、客服提示或交付时间说明。</li>
        </ul>
      </div>
    `;
  }

  function renderPrototype(root) {
    const output = root.querySelector("[data-lens-widget-output]");
    if (!output) {
      return;
    }

    const state = getWidgetState(root);
    const scenario =
      prototypeScenarios.find(function (item) {
        return item.id === state.prototypeScenarioId;
      }) || prototypeScenarios[0];
    const step = scenario.steps[state.prototypeStepIndex] || scenario.steps[0];
    const isFirstStep = state.prototypeStepIndex === 0;
    const isLastStep = state.prototypeStepIndex === scenario.steps.length - 1;
    const selectionSummary = getPrototypeSelectionSummary(state);

    output.innerHTML = `
      <div class="lens-widget__prototype-shell">
        <div class="lens-widget__prototype-hero">
          <div class="lens-widget__prototype-badges">
            ${renderPrototypeBadge(scenario.tag, "success")}
            ${renderPrototypeBadge(scenario.productTitle, "info")}
            ${renderPrototypeBadge(step.title, "warning")}
          </div>
          <h4 class="lens-widget__prototype-title">${escapeHtml(scenario.productTitle)}</h4>
          <div class="lens-widget__prototype-subtitle">${escapeHtml(scenario.subtitle)}</div>
          <div class="lens-widget__prototype-hero-meta">
            <div class="lens-widget__prototype-meta-block">
              <strong>当前步骤</strong>
              <span>${escapeHtml(step.title)}</span>
            </div>
            <div class="lens-widget__prototype-meta-block">
              <strong>路径模式</strong>
              <span>${escapeHtml(scenario.title)}</span>
            </div>
            <div class="lens-widget__prototype-meta-block">
              <strong>价格摘要</strong>
              <span>${escapeHtml(scenario.priceLabel)}</span>
            </div>
          </div>
        </div>

        <div class="lens-widget__prototype-body">
          <div class="lens-widget__prototype-content">
            <div class="lens-widget__prototype-entry-zone">
              <div class="lens-widget__prototype-section-head">
                <h5>入口区</h5>
                <div class="lens-widget__prototype-note">这一层模拟商品页上方的任务型路径入口。</div>
              </div>
              <div class="lens-widget__prototype-toolbar">
                ${prototypeScenarios
                  .map(function (item) {
                    const isActive = item.id === scenario.id;
                    return `
                      <button
                        type="button"
                        class="lens-widget__prototype-button ${isActive ? "" : "lens-widget__prototype-button--secondary"}"
                        data-lens-widget-prototype-scenario="${escapeHtml(item.id)}"
                      >
                        ${escapeHtml(item.title)}
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </div>

            <div class="lens-widget__prototype-workspace">
              <div class="lens-widget__prototype-main-column">
                <div class="lens-widget__prototype-step">
                  <div class="lens-widget__prototype-section-head">
                    <h5>主步骤区</h5>
                    <div class="lens-widget__prototype-note">这里承接当前步骤的核心输入、结果和决策内容。</div>
                  </div>

                  <div class="lens-widget__prototype-badges">
                    ${renderPrototypeBadge(scenario.tag, "success")}
                    ${renderPrototypeBadge(scenario.productTitle, "info")}
                  </div>
                  <h4 class="lens-widget__prototype-title">${escapeHtml(step.title)}</h4>
                  <div class="lens-widget__prototype-step-description">${escapeHtml(step.description)}</div>

                  <div class="lens-widget__prototype-grid">
                    ${(step.cards || []).map(renderPrototypeCard).join("")}
                    ${renderPrototypeRecommendations(step.recommendations)}
                  </div>

                  ${
                    step.note
                      ? `
                        <div class="lens-widget__prototype-panel">
                          <h5>设计观察点</h5>
                          <div class="lens-widget__prototype-note">${escapeHtml(step.note)}</div>
                        </div>
                      `
                      : ""
                  }

                  <div class="lens-widget__prototype-nav">
                    <button
                      type="button"
                      class="lens-widget__prototype-button lens-widget__prototype-button--secondary"
                      data-lens-widget-prototype-nav="prev"
                      ${isFirstStep ? "disabled" : ""}
                    >
                      上一步
                    </button>
                    <button
                      type="button"
                      class="lens-widget__prototype-button"
                      data-lens-widget-prototype-nav="next"
                      ${isLastStep ? "disabled" : ""}
                    >
                      ${escapeHtml(step.primaryActionLabel || "下一步")}
                    </button>
                    ${
                      step.secondaryActionLabel
                        ? `
                          <button
                            type="button"
                            class="lens-widget__prototype-button lens-widget__prototype-button--secondary"
                          >
                            ${escapeHtml(step.secondaryActionLabel)}
                          </button>
                        `
                        : ""
                    }
                  </div>
                </div>
              </div>

              <div class="lens-widget__prototype-side-column">
                ${renderPrototypeInteractivePanel(scenario, state.prototypeStepIndex, state)}
                ${renderPrototypeComparisonPanel(step, state)}
                ${renderPrototypeHelperPanel(step, state)}
              </div>
            </div>
          </div>

          <div class="lens-widget__prototype-summary">
            <div class="lens-widget__prototype-summary-card">
              <h5>步骤进度</h5>
              <ol class="lens-widget__prototype-progress">
                ${scenario.steps
                  .map(function (item, index) {
                    return `<li class="${index === state.prototypeStepIndex ? "is-active" : ""}">${escapeHtml(
                      item.title,
                    )}</li>`;
                  })
                  .join("")}
              </ol>
            </div>

            <div class="lens-widget__prototype-summary-card">
              <h5>当前摘要</h5>
              ${(scenario.summary || [])
                .map(function (item) {
                  return `<div class="lens-widget__prototype-summary-item"><strong>${escapeHtml(
                    item.label,
                  )}</strong>：${escapeHtml(item.value)}</div>`;
                })
                .join("")}
              ${selectionSummary
                .map(function (item) {
                  return `<div class="lens-widget__prototype-summary-item"><strong>${escapeHtml(
                    item.label,
                  )}</strong>：${escapeHtml(item.value)}</div>`;
                })
                .join("")}
            </div>

            <div class="lens-widget__prototype-summary-card">
              <h5>当前观察点</h5>
              <ul class="lens-widget__prototype-list">
                <li>入口是否先帮助用户确认任务，而不是直接填表。</li>
                <li>主商品、功能、处方的顺序是否自然。</li>
                <li>规则解释是否清楚到足以支撑购买决策。</li>
                <li>结果页和确认页是否让用户理解完整购买方案。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="lens-widget__prototype-sticky-bar">
        <div class="lens-widget__prototype-sticky-content">
          <div>
            <strong>${escapeHtml(scenario.productTitle)}</strong>
            <div class="lens-widget__prototype-note">
              ${escapeHtml(step.title)} / ${escapeHtml(scenario.priceLabel)}
            </div>
          </div>
          <div class="lens-widget__prototype-actions">
            <button
              type="button"
              class="lens-widget__prototype-button lens-widget__prototype-button--secondary"
              data-lens-widget-prototype-nav="prev"
              ${isFirstStep ? "disabled" : ""}
            >
              上一步
            </button>
            <button
              type="button"
              class="lens-widget__prototype-button"
              data-lens-widget-prototype-nav="next"
              ${isLastStep ? "disabled" : ""}
            >
              ${escapeHtml(step.primaryActionLabel || "下一步")}
            </button>
          </div>
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
    if (root.dataset.widgetMode === "prototype") {
      renderPrototype(root);
      return;
    }

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
        if (root.dataset.widgetMode === "prototype") {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        loadWidget(root);
      });
    }

    root.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (root.dataset.widgetMode === "prototype") {
        const selectButton = target.closest("[data-lens-widget-prototype-select]");
        if (selectButton instanceof HTMLElement) {
          const state = getWidgetState(root);
          const key = selectButton.getAttribute("data-lens-widget-prototype-select");
          const value = selectButton.getAttribute("data-lens-widget-prototype-value");
          if (key && value) {
            state.prototypeSelections[key] = value;
            renderPrototype(root);
          }
          return;
        }

        const rxButton = target.closest("[data-lens-widget-rx-field]");
        if (rxButton instanceof HTMLElement) {
          const state = getWidgetState(root);
          const eye = rxButton.getAttribute("data-lens-widget-rx-eye");
          const field = rxButton.getAttribute("data-lens-widget-rx-field");
          const value = rxButton.getAttribute("data-lens-widget-rx-value");
          if (
            (eye === "leftEye" || eye === "rightEye") &&
            (field === "sph" || field === "cyl" || field === "axis") &&
            value
          ) {
            state.prototypePrescription[eye][field] = value;
            renderPrototype(root);
          }
          return;
        }

        const rxExtraButton = target.closest("[data-lens-widget-rx-extra]");
        if (rxExtraButton instanceof HTMLElement) {
          const state = getWidgetState(root);
          const field = rxExtraButton.getAttribute("data-lens-widget-rx-extra");
          const value = rxExtraButton.getAttribute("data-lens-widget-rx-value");
          if ((field === "add" || field === "pd") && value) {
            state.prototypePrescription[field] = value;
            renderPrototype(root);
          }
          return;
        }

        const comparisonToggle = target.closest("[data-lens-widget-prototype-toggle]");
        if (comparisonToggle instanceof HTMLElement) {
          const state = getWidgetState(root);
          state.prototypeComparisonMode = !state.prototypeComparisonMode;
          renderPrototype(root);
          return;
        }

        const decisionModeButton = target.closest("[data-lens-widget-decision-mode]");
        if (decisionModeButton instanceof HTMLElement) {
          const state = getWidgetState(root);
          const mode = decisionModeButton.getAttribute("data-lens-widget-decision-mode");
          if (mode === "manual" || mode === "system") {
            state.prototypeDecisionMode = mode;
            renderPrototype(root);
          }
          return;
        }

        const resultPickButton = target.closest("[data-lens-widget-result-pick]");
        if (resultPickButton instanceof HTMLElement) {
          const state = getWidgetState(root);
          const resultId = resultPickButton.getAttribute("data-lens-widget-result-pick");
          if (resultId) {
            state.prototypeSelectedRecommendation = resultId;
            renderPrototype(root);
          }
          return;
        }

        const recoveryChoiceButton = target.closest("[data-lens-widget-recovery-choice]");
        if (recoveryChoiceButton instanceof HTMLElement) {
          const state = getWidgetState(root);
          const recoveryId = recoveryChoiceButton.getAttribute("data-lens-widget-recovery-choice");
          if (recoveryId) {
            state.prototypeRecoveryChoice = recoveryId;
            renderPrototype(root);
          }
          return;
        }

        const scenarioButton = target.closest("[data-lens-widget-prototype-scenario]");
        if (scenarioButton instanceof HTMLElement) {
          const state = getWidgetState(root);
          state.prototypeScenarioId =
            scenarioButton.getAttribute("data-lens-widget-prototype-scenario") ||
            prototypeScenarios[0].id;
          state.prototypeStepIndex = 0;
          state.prototypeComparisonMode = false;
          renderPrototype(root);
          return;
        }

        const navButton = target.closest("[data-lens-widget-prototype-nav]");
        if (navButton instanceof HTMLElement) {
          const state = getWidgetState(root);
          const scenario =
            prototypeScenarios.find(function (item) {
              return item.id === state.prototypeScenarioId;
            }) || prototypeScenarios[0];
          const direction = navButton.getAttribute("data-lens-widget-prototype-nav");
          if (direction === "next") {
            state.prototypeStepIndex = Math.min(
              state.prototypeStepIndex + 1,
              scenario.steps.length - 1,
            );
          } else {
            state.prototypeStepIndex = Math.max(state.prototypeStepIndex - 1, 0);
          }
          renderPrototype(root);
          return;
        }
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
