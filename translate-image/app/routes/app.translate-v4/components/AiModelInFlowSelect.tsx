import { InFlowSelect, type InFlowOption } from "~/ui/components/InFlowSelect";

export function AiModelInFlowSelect(props: {
  label: string;
  labelHidden?: boolean;
  options: InFlowOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  active?: boolean;
  toolbarTrigger?: boolean;
  triggerTextNowrap?: boolean;
  menuFitContent?: boolean;
  menuAlignEnd?: boolean;
  menuPreferAbove?: boolean;
}) {
  return <InFlowSelect {...props} />;
}
