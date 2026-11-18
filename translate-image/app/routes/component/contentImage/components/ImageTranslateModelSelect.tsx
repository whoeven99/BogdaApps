import { useTranslation } from "react-i18next";
import { AiModelInFlowSelect } from "~/routes/app.translate-v4/components/AiModelInFlowSelect";
import { manageResourceModuleSelectWrapStyle } from "~/lib/manageTranslationToolbarStyles";
import type { InFlowOption } from "~/ui/components/InFlowSelect";
import listStyles from "~/ui/styles/appListPage.module.css";

/** 与语言/模块工具栏同款的文档流模型下拉，放在翻译按钮旁。 */
export function ImageTranslateModelSelect(props: {
  options: InFlowOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** 弹窗内下拉菜单需随 open 状态更新定位。 */
  active?: boolean;
  /** 更窄宽度（确认弹窗底栏）。 */
  compact?: boolean;
  /** 确认弹窗内：菜单优先向上展开，避免被 modal 底部裁切。 */
  inModalConfirm?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={
        props.inModalConfirm
          ? listStyles.modalConfirmModelField
          : props.compact
            ? listStyles.rowModelField
            : listStyles.modelField
      }
      style={{
        ...manageResourceModuleSelectWrapStyle,
        ...(props.inModalConfirm
          ? { width: "100%", minWidth: 0, maxWidth: "none" }
          : props.compact
            ? { width: 260, minWidth: 220, maxWidth: 280 }
            : { minWidth: 220, maxWidth: 320 }),
      }}
    >
      <AiModelInFlowSelect
        label={props.compact || props.inModalConfirm ? "" : t("imageTranslate.model")}
        labelHidden={props.compact || props.inModalConfirm}
        toolbarTrigger
        triggerTextNowrap
        menuFitContent
        menuAlignEnd={props.compact || props.inModalConfirm}
        menuPreferAbove={props.inModalConfirm}
        options={props.options}
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
        active={props.active}
      />
    </div>
  );
}
