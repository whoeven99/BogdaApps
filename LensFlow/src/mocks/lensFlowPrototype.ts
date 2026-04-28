export type PrototypeTone = "info" | "success" | "warning" | "critical";

export type PrototypePathMode =
  | "prescription_first"
  | "feature_first"
  | "product_first";

export type PrototypeStepType =
  | "entry"
  | "feature_choice"
  | "prescription"
  | "result"
  | "blocked"
  | "confirm"
  | "subscription";

export type PrototypeChoice = {
  id: string;
  title: string;
  description: string;
  badge?: string;
  priceDelta?: string;
};

export type PrototypeKnowledgeCard = {
  id: string;
  tone: PrototypeTone;
  title: string;
  body: string;
};

export type PrototypeRecommendation = {
  id: string;
  title: string;
  badge?: string;
  price: string;
  summary: string;
  reasons: string[];
};

export type PrototypeStep = {
  id: string;
  title: string;
  type: PrototypeStepType;
  description: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  choices?: PrototypeChoice[];
  knowledgeCards?: PrototypeKnowledgeCard[];
  recommendations?: PrototypeRecommendation[];
  summaryNote?: string;
};

export type PrototypeSummaryItem = {
  label: string;
  value: string;
};

export type PrototypeScenario = {
  id: string;
  title: string;
  subtitle: string;
  productTitle: string;
  productType: string;
  entryMode: PrototypePathMode;
  tag: string;
  priceLabel: string;
  steps: PrototypeStep[];
  summary: PrototypeSummaryItem[];
};

export const prototypeScenarios: PrototypeScenario[] = [
  {
    id: "frame-prescription",
    title: "镜框 + 处方优先",
    subtitle: "先录入处方，再推荐适配镜片",
    productTitle: "Aero Round 镜框",
    productType: "镜框主商品",
    entryMode: "prescription_first",
    tag: "推荐主路径",
    priceLabel: "镜框 $129 + 镜片待定",
    summary: [
      { label: "主商品", value: "Aero Round / Black / M" },
      { label: "导购路径", value: "处方优先" },
      { label: "当前处方", value: "SPH -4.50 / CYL -1.25 / PD 63" },
      { label: "推荐结果", value: "1.67 高折射率防蓝光镜片" },
    ],
    steps: [
      {
        id: "entry",
        title: "入口选择",
        type: "entry",
        description:
          "消费者从镜框商品页进入，系统默认展示“我有处方”入口，并告知会在后续自动匹配可售镜片。",
        primaryActionLabel: "进入处方录入",
        secondaryActionLabel: "查看其他路径",
        knowledgeCards: [
          {
            id: "entry-note",
            tone: "info",
            title: "交互目标",
            body: "首页不直接堆字段，而是先确认用户任务，减少首次进入时的信息压力。",
          },
        ],
      },
      {
        id: "prescription",
        title: "处方录入",
        type: "prescription",
        description:
          "按左右眼分组录入 SPH/CYL/AXIS/PD，采用步进式输入，系统边录边检查高折射率需求。",
        primaryActionLabel: "查看推荐结果",
        secondaryActionLabel: "返回入口",
        knowledgeCards: [
          {
            id: "prescription-high-index",
            tone: "warning",
            title: "高度数提醒",
            body: "当 SPH 超过阈值时，系统应自动缩小到更薄镜片范围，并同步解释原因。",
          },
        ],
      },
      {
        id: "result",
        title: "推荐结果",
        type: "result",
        description:
          "系统给出推荐镜片、备选方案和原因说明，同时继续展示镜框与总价摘要。",
        primaryActionLabel: "确认方案",
        secondaryActionLabel: "修改处方",
        recommendations: [
          {
            id: "rec-1",
            title: "1.67 高折射率防蓝光镜片",
            badge: "系统推荐",
            price: "$168",
            summary: "更薄、更适合当前度数，兼顾日常屏幕使用。",
            reasons: [
              "度数较深，优先推荐高折射率。",
              "消费者勾选了长时间屏幕使用场景。",
              "当前镜框尺寸适合此镜片厚度方案。",
            ],
          },
          {
            id: "rec-2",
            title: "1.61 标准防蓝光镜片",
            badge: "备选",
            price: "$128",
            summary: "价格更低，但边缘厚度表现略弱。",
            reasons: [
              "仍可加工，但厚度和重量表现不如推荐项。",
            ],
          },
        ],
      },
      {
        id: "confirm",
        title: "Bundle 确认",
        type: "confirm",
        description:
          "最终确认页同时展示镜框、镜片、加工说明与价格拆分，用户确认后再进入购物车。",
        primaryActionLabel: "加入购物车",
        secondaryActionLabel: "返回结果页",
        summaryNote: "这里需要验证主商品与镜片的组合展示是否足够清晰，避免用户误以为只买了镜框。",
      },
    ],
  },
  {
    id: "frame-feature",
    title: "镜框 + 功能优先",
    subtitle: "先按功能筛选，再补处方",
    productTitle: "City Square 镜框",
    productType: "镜框主商品",
    entryMode: "feature_first",
    tag: "功能导购",
    priceLabel: "镜框 $149 + 镜片待定",
    summary: [
      { label: "主商品", value: "City Square / Tortoise / L" },
      { label: "导购路径", value: "功能优先" },
      { label: "已选功能", value: "驾驶 / 偏光 / 轻薄" },
      { label: "当前状态", value: "等待录入处方验证" },
    ],
    steps: [
      {
        id: "entry",
        title: "功能入口",
        type: "entry",
        description:
          "用户不清楚度数，但知道自己主要是驾驶场景，先按用途选择功能卡片。",
        primaryActionLabel: "选择镜片功能",
        secondaryActionLabel: "改走处方优先",
      },
      {
        id: "feature-choice",
        title: "功能选择",
        type: "feature_choice",
        description:
          "用卡片展示防蓝光、偏光、变色、超薄等功能差异，而不是让用户先填复杂参数。",
        primaryActionLabel: "继续录入处方",
        secondaryActionLabel: "重置选择",
        choices: [
          {
            id: "drive-polarized",
            title: "驾驶 + 偏光",
            description: "降低路面反光，提升白天驾驶舒适度。",
            badge: "已选择",
            priceDelta: "+$79",
          },
          {
            id: "photochromic",
            title: "变色",
            description: "室内外切换更方便，适合通勤。",
            priceDelta: "+$99",
          },
          {
            id: "ultra-thin",
            title: "超薄",
            description: "针对较高处方，减少边缘厚度。",
            priceDelta: "+$120",
          },
        ],
        knowledgeCards: [
          {
            id: "polarized-note",
            tone: "info",
            title: "偏光说明",
            body: "偏光适合强反光场景，但需要在结果页提醒部分数字屏幕可视性影响。",
          },
        ],
      },
      {
        id: "prescription",
        title: "处方验证",
        type: "prescription",
        description:
          "系统在功能预选后再要求录入必要处方，验证当前功能组合是否可加工。",
        primaryActionLabel: "查看验证结果",
        secondaryActionLabel: "返回功能选择",
      },
      {
        id: "blocked",
        title: "阻断与替代",
        type: "blocked",
        description:
          "当前偏光方案与高散光加工限制冲突，系统不直接报错，而是解释原因并给出替代路线。",
        primaryActionLabel: "查看替代方案",
        secondaryActionLabel: "重新选择功能",
        knowledgeCards: [
          {
            id: "blocked-rule",
            tone: "critical",
            title: "当前不可选原因",
            body: "该镜框边型与当前偏光加工条件冲突，不能保证加工质量。",
          },
          {
            id: "alternative-rule",
            tone: "success",
            title: "替代建议",
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
    productTitle: "Daily Soft 1-Day",
    productType: "隐形眼镜订阅商品",
    entryMode: "product_first",
    tag: "订阅原型",
    priceLabel: "单盒 $36 / 订阅最低 9 折",
    summary: [
      { label: "商品", value: "Daily Soft 1-Day / 30 片装" },
      { label: "抛期", value: "daily" },
      { label: "订阅方案", value: "每 30 天配送 2 盒" },
      { label: "折扣", value: "首单 95 折 / 续订 9 折" },
    ],
    steps: [
      {
        id: "entry",
        title: "商品入口",
        type: "entry",
        description:
          "用户从商品页进入后，优先看到一次性购买与订阅购买的双模式切换，以及抛期说明。",
        primaryActionLabel: "查看订阅方案",
        secondaryActionLabel: "切换一次性购买",
      },
      {
        id: "subscription",
        title: "订阅方案",
        type: "subscription",
        description:
          "订阅页重点验证抛期映射、推荐购买量、周期选择、折扣和下次配送说明是否清晰。",
        primaryActionLabel: "确认订阅",
        secondaryActionLabel: "修改方案",
        choices: [
          {
            id: "30-days",
            title: "每 30 天 2 盒",
            description: "适合日常双眼每日佩戴。",
            badge: "推荐",
            priceDelta: "9 折",
          },
          {
            id: "60-days",
            title: "每 60 天 4 盒",
            description: "减少频繁配送，适合固定配戴习惯。",
            priceDelta: "88 折",
          },
        ],
        knowledgeCards: [
          {
            id: "subscription-note",
            tone: "info",
            title: "订阅说明",
            body: "这里后续需要替换成真实 Selling Plan，但当前先验证用户是否能看懂周期和优惠。",
          },
        ],
      },
      {
        id: "confirm",
        title: "订阅确认",
        type: "confirm",
        description:
          "确认页展示参数、周期、折扣、下次配送时间和可随时暂停/跳过的说明。",
        primaryActionLabel: "开始订阅",
        secondaryActionLabel: "返回修改",
        summaryNote: "这一页重点验证订阅比一次性购买多出来的信息是否过载。",
      },
    ],
  },
];

export function getPrototypeScenario(id: string) {
  return prototypeScenarios.find((scenario) => scenario.id === id) ?? prototypeScenarios[0];
}
