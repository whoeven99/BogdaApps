import { useMemo, useState } from "react";

import {
  getPrototypeScenario,
  prototypeScenarios,
  type PrototypeChoice,
  type PrototypeRecommendation,
  type PrototypeScenario,
  type PrototypeStep,
} from "../../src/mocks/lensFlowPrototype.js";

function getToneForStep(step: PrototypeStep) {
  if (step.type === "blocked") {
    return "critical";
  }

  if (step.type === "confirm" || step.type === "subscription") {
    return "success";
  }

  return "info";
}

function renderChoiceCards(choices: PrototypeChoice[] | undefined) {
  if (!choices || choices.length === 0) {
    return null;
  }

  return (
    <s-stack direction="block" gap="base">
      {choices.map((choice) => (
        <s-box key={choice.id} padding="base" border="base" border-radius="base">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base" align-items="center">
              <s-heading>{choice.title}</s-heading>
              {choice.badge ? <s-badge tone="success">{choice.badge}</s-badge> : null}
              {choice.priceDelta ? <s-badge tone="info">{choice.priceDelta}</s-badge> : null}
            </s-stack>
            <s-paragraph>{choice.description}</s-paragraph>
          </s-stack>
        </s-box>
      ))}
    </s-stack>
  );
}

function renderRecommendations(recommendations: PrototypeRecommendation[] | undefined) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <s-stack direction="block" gap="base">
      {recommendations.map((item) => (
        <s-box key={item.id} padding="base" border="base" border-radius="base">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base" align-items="center">
              <s-heading>{item.title}</s-heading>
              {item.badge ? <s-badge tone="success">{item.badge}</s-badge> : null}
              <s-badge tone="info">{item.price}</s-badge>
            </s-stack>
            <s-paragraph>{item.summary}</s-paragraph>
            <s-unordered-list>
              {item.reasons.map((reason) => (
                <s-list-item key={reason}>{reason}</s-list-item>
              ))}
            </s-unordered-list>
          </s-stack>
        </s-box>
      ))}
    </s-stack>
  );
}

function ScenarioOverview({
  scenario,
  isActive,
  onSelect,
}: {
  scenario: PrototypeScenario;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <s-box padding="base" border="base" border-radius="base">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base" align-items="center">
          <s-heading>{scenario.title}</s-heading>
          <s-badge tone={isActive ? "success" : "info"}>{scenario.tag}</s-badge>
        </s-stack>
        <s-paragraph>{scenario.subtitle}</s-paragraph>
        <s-paragraph>商品：{scenario.productTitle}</s-paragraph>
        <s-paragraph>价格：{scenario.priceLabel}</s-paragraph>
        <s-button type="button" variant={isActive ? "primary" : "secondary"} onClick={onSelect}>
          {isActive ? "当前预览中" : "切换到此原型"}
        </s-button>
      </s-stack>
    </s-box>
  );
}

export default function PrototypePage() {
  const [scenarioId, setScenarioId] = useState(prototypeScenarios[0]?.id ?? "");
  const [stepIndex, setStepIndex] = useState(0);
  const [comparisonMode, setComparisonMode] = useState(false);

  const scenario = useMemo(() => getPrototypeScenario(scenarioId), [scenarioId]);
  const currentStep = scenario.steps[stepIndex] ?? scenario.steps[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === scenario.steps.length - 1;

  function selectScenario(nextScenarioId: string) {
    setScenarioId(nextScenarioId);
    setStepIndex(0);
    setComparisonMode(false);
  }

  function goNext() {
    setStepIndex((current) => Math.min(current + 1, scenario.steps.length - 1));
  }

  function goPrevious() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  return (
    <s-page heading="导购体验原型">
      <s-section heading="原型目标">
        <s-stack direction="block" gap="base">
          <s-banner tone="info" heading="当前为前端优先的假数据原型">
            这一页不依赖真实 Shopify 商品、Prisma 规则或下单接口，目标是先验证入口、步骤、结果、阻断和确认页的整体交互。
          </s-banner>
          <s-paragraph>
            建议你重点看这几个问题：入口是否清楚、术语是否太重、规则解释是否好懂、Bundle
            摘要是否清晰、订阅入口是否自然。
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="场景切换">
        <s-stack direction="block" gap="base">
          {prototypeScenarios.map((item) => (
            <ScenarioOverview
              key={item.id}
              scenario={item}
              isActive={item.id === scenario.id}
              onSelect={() => selectScenario(item.id)}
            />
          ))}
        </s-stack>
      </s-section>

      <s-section heading="当前场景">
        <s-stack direction="block" gap="base">
          <s-box padding="base" border="base" border-radius="base">
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="base" align-items="center">
                <s-heading>{scenario.title}</s-heading>
                <s-badge tone="success">{scenario.entryMode}</s-badge>
              </s-stack>
              <s-paragraph>{scenario.subtitle}</s-paragraph>
              <s-paragraph>主商品：{scenario.productTitle}</s-paragraph>
              <s-paragraph>商品类型：{scenario.productType}</s-paragraph>
              <s-paragraph>价格信息：{scenario.priceLabel}</s-paragraph>
            </s-stack>
          </s-box>

          <s-box padding="base" border="base" border-radius="base">
            <s-stack direction="block" gap="base">
              <s-heading>步骤进度</s-heading>
              <s-unordered-list>
                {scenario.steps.map((step, index) => (
                  <s-list-item key={step.id}>
                    <s-text type={index === stepIndex ? "strong" : "generic"}>
                      {index + 1}. {step.title}
                    </s-text>
                    {index === stepIndex ? " / 当前步骤" : ""}
                  </s-list-item>
                ))}
              </s-unordered-list>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading={currentStep.title}>
        <s-stack direction="block" gap="base">
          <s-banner tone={getToneForStep(currentStep)} heading={currentStep.title}>
            {currentStep.description}
          </s-banner>

          {renderChoiceCards(currentStep.choices)}
          {renderRecommendations(currentStep.recommendations)}

          {currentStep.knowledgeCards && currentStep.knowledgeCards.length > 0 ? (
            <s-stack direction="block" gap="base">
              {currentStep.knowledgeCards.map((card) => (
                <s-box key={card.id} padding="base" border="base" border-radius="base">
                  <s-stack direction="block" gap="base">
                    <s-stack direction="inline" gap="base" align-items="center">
                      <s-heading>{card.title}</s-heading>
                      <s-badge tone={card.tone}>{card.tone}</s-badge>
                    </s-stack>
                    <s-paragraph>{card.body}</s-paragraph>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          ) : null}

          {currentStep.summaryNote ? (
            <s-box padding="base" border="base" border-radius="base">
              <s-heading>设计观察点</s-heading>
              <s-paragraph>{currentStep.summaryNote}</s-paragraph>
            </s-box>
          ) : null}

          <s-stack direction="inline" gap="base">
            <s-button type="button" variant="secondary" disabled={isFirstStep} onClick={goPrevious}>
              上一步
            </s-button>
            <s-button type="button" variant="primary" disabled={isLastStep} onClick={goNext}>
              {currentStep.primaryActionLabel ?? "下一步"}
            </s-button>
            <s-button
              type="button"
              variant="secondary"
              onClick={() => setComparisonMode((current) => !current)}
            >
              {comparisonMode ? "关闭对比视图" : "打开对比视图"}
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="悬浮摘要原型" slot="aside">
        <s-stack direction="block" gap="base">
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>当前已选摘要</s-heading>
            <s-unordered-list>
              {scenario.summary.map((item) => (
                <s-list-item key={item.label}>
                  <s-text type="strong">{item.label}</s-text>：{item.value}
                </s-list-item>
              ))}
            </s-unordered-list>
          </s-box>

          <s-box padding="base" border="base" border-radius="base">
            <s-heading>当前观察点</s-heading>
            <s-unordered-list>
              <s-list-item>入口是否先帮助用户确认任务，而不是直接填表。</s-list-item>
              <s-list-item>处方、功能、主商品三者的顺序是否自然。</s-list-item>
              <s-list-item>规则解释是否清楚到足以支撑购买决策。</s-list-item>
              <s-list-item>结果页和确认页是否让用户理解买到的完整方案。</s-list-item>
            </s-unordered-list>
          </s-box>

          {comparisonMode ? (
            <s-box padding="base" border="base" border-radius="base">
              <s-heading>对比视图原型</s-heading>
              <s-paragraph>
                当前切换到对比模式。后续真实版本中，这里会展示 2 到 3 个镜片方案的价格、厚度、适用场景和推荐等级。
              </s-paragraph>
            </s-box>
          ) : null}
        </s-stack>
      </s-section>
    </s-page>
  );
}
