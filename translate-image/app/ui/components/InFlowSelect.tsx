import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";

export type InFlowOption = {
  label: string;
  value: string;
  disabled?: boolean;
  /** 选项角标（如 Recommended），下拉与触发器展示。 */
  badge?: string;
  /** 副文案：下拉项与选中触发器均可展示（如速度/流畅度/积分指标）。 */
  description?: string;
};

type OptionInput = InFlowOption | string;

type Props = {
  label: string;
  options: OptionInput[];
  value: string;
  onChange: (value: string) => void;
  labelHidden?: boolean;
  disabled?: boolean;
  error?: string | boolean;
  placeholder?: string;
  style?: CSSProperties;
  /** 折叠/弹窗关闭时收起菜单。 */
  active?: boolean;
  /** 单行省略（页头工具栏）。 */
  triggerTextNowrap?: boolean;
  /** 与页头 plan · credits 控件统一字号/字重。 */
  toolbarTrigger?: boolean;
  /** 菜单按最长选项放宽（页头语言选择等窄触发器）。 */
  menuFitContent?: boolean;
  /** 菜单与触发器右缘对齐（避免页头右侧溢出视口）。 */
  menuAlignEnd?: boolean;
  /** 弹窗底栏等场景：优先向上展开菜单。 */
  menuPreferAbove?: boolean;
};

function normalizeOptions(options: OptionInput[]): InFlowOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
}

/**
 * 商户向单选。菜单画在组件内部（不 portal、不用原生 select），
 * 避免 AppSModal 裁切系统下拉或挡住 Polaris Popover。
 */
export function InFlowSelect({
  label,
  options,
  value,
  onChange,
  labelHidden = false,
  disabled = false,
  error,
  placeholder,
  style,
  active = true,
  triggerTextNowrap = false,
  toolbarTrigger = false,
  menuFitContent = false,
  menuAlignEnd = false,
  menuPreferAbove = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<"below" | "above">("below");
  const [resolvedMenuAlignEnd, setResolvedMenuAlignEnd] = useState(menuAlignEnd);
  const [resolvedMenuMaxWidth, setResolvedMenuMaxWidth] = useState<
    number | undefined
  >(undefined);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const items = normalizeOptions(options);
  const selectedOption = items.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? placeholder ?? value;
  const selectedDescription = selectedOption?.description;
  const selectedBadge = selectedOption?.badge;
  const hasError = Boolean(error);
  const errorText = typeof error === "string" ? error : null;
  const showLabel = Boolean(label) && !labelHidden;

  useEffect(() => {
    if (!active || disabled) setOpen(false);
  }, [active, disabled]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node)) return;
      if (!root.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPlacement("below");
      setResolvedMenuAlignEnd(menuAlignEnd);
      setResolvedMenuMaxWidth(undefined);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;

    const adjustMenuLayout = () => {
      const list = listRef.current;
      const rect = trigger.getBoundingClientRect();
      const margin = 8;
      const viewportInner = window.innerWidth - margin * 2;
      const defaultCap = menuFitContent ? 280 : 320;

      const estimatedMenuHeight =
        list?.offsetHeight ?? Math.min(240, items.length * 38 + 12);
      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (menuPreferAbove && spaceAbove >= estimatedMenuHeight + gap) {
        setMenuPlacement("above");
      } else if (
        spaceBelow < estimatedMenuHeight + gap &&
        spaceAbove > spaceBelow
      ) {
        setMenuPlacement("above");
      } else {
        setMenuPlacement("below");
      }

      const measuredWidth =
        list?.offsetWidth ??
        (menuFitContent ? Math.min(defaultCap, viewportInner) : rect.width);
      let alignEnd = menuAlignEnd;
      if (menuAlignEnd && rect.right - measuredWidth < margin) {
        alignEnd = false;
      }
      const anchorX = alignEnd ? rect.right - measuredWidth : rect.left;
      const maxW = Math.min(
        defaultCap,
        viewportInner,
        window.innerWidth - anchorX - margin,
      );
      setResolvedMenuAlignEnd(alignEnd);
      setResolvedMenuMaxWidth(Math.max(rect.width, maxW));
    };

    adjustMenuLayout();
    if (!listRef.current?.offsetWidth) {
      requestAnimationFrame(adjustMenuLayout);
    }
  }, [menuAlignEnd, menuFitContent, menuPreferAbove, open, items.length]);

  return (
    <div
      ref={rootRef}
      className={open ? "in-flow-select in-flow-select--open" : "in-flow-select"}
      style={{ ...rootStyle, ...style }}
    >
      {showLabel ? <div style={labelStyle}>{label}</div> : null}
      <button
        ref={triggerRef}
        type="button"
        aria-label={label || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        style={triggerStyle(open, hasError, disabled, toolbarTrigger)}
      >
        <span
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            textAlign: "start",
          }}
        >
          <span
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              whiteSpace: triggerTextNowrap ? "nowrap" : "normal",
              wordBreak: triggerTextNowrap ? "normal" : "break-word",
              overflowWrap: triggerTextNowrap ? "normal" : "anywhere",
              overflow: triggerTextNowrap ? "hidden" : undefined,
              textOverflow: triggerTextNowrap ? "ellipsis" : undefined,
            }}
          >
            <span>{selectedLabel}</span>
            {selectedDescription && !triggerTextNowrap ? (
              <span
                className="in-flow-select__trigger-description"
                style={optionDescriptionStyle}
              >
                {selectedDescription}
              </span>
            ) : null}
          </span>
          {selectedBadge ? (
            <InFlowOptionBadge text={selectedBadge} compact={toolbarTrigger} />
          ) : null}
        </span>
        <span
          className={`v4-caret${open ? " v4-caret--open" : ""}`}
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          ⌄
        </span>
      </button>
      {open ? (
        <InFlowOptionList
          listRef={listRef}
          placement={menuPlacement}
          label={label}
          value={value}
          options={items}
          menuFitContent={menuFitContent}
          menuAlignEnd={resolvedMenuAlignEnd}
          menuMaxWidth={resolvedMenuMaxWidth}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      ) : null}
      {errorText ? <div style={errorStyle}>{errorText}</div> : null}
    </div>
  );
}

function InFlowOptionList({
  listRef,
  placement,
  label,
  value,
  options,
  menuFitContent,
  menuAlignEnd,
  menuMaxWidth,
  onSelect,
}: {
  listRef: Ref<HTMLDivElement>;
  placement: "below" | "above";
  label: string;
  value: string;
  options: InFlowOption[];
  menuFitContent: boolean;
  menuAlignEnd: boolean;
  menuMaxWidth?: number;
  onSelect: (value: string) => void;
}) {
  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={label}
      style={listStyle(placement, menuFitContent, menuAlignEnd, menuMaxWidth)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={option.disabled}
            onClick={() => {
              if (!option.disabled) onSelect(option.value);
            }}
            style={optionStyle(selected, Boolean(option.disabled), menuFitContent)}
          >
            <span style={optionLabelWrapStyle}>
              <span style={optionLabelTextStyle}>
                <span style={{ display: "block" }}>{option.label}</span>
                {option.description ? (
                  <span style={optionDescriptionStyle}>{option.description}</span>
                ) : null}
              </span>
              {option.badge ? <InFlowOptionBadge text={option.badge} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const rootStyle: CSSProperties = {
  position: "relative",
  width: "100%",
};

const labelStyle: CSSProperties = {
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--app-color-text)",
  lineHeight: 1.35,
};

function triggerStyle(
  open: boolean,
  hasError: boolean,
  disabled: boolean,
  toolbarTrigger: boolean,
): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 36,
    gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${
      hasError
        ? "var(--p-color-border-critical, #ce4a54)"
        : "var(--app-color-border-secondary)"
    }`,
    background: "var(--app-color-surface)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: toolbarTrigger ? 600 : 500,
    color: "var(--app-color-text)",
    lineHeight: 1.35,
    opacity: disabled ? 0.5 : 1,
    boxShadow: open ? "0 0 0 1px var(--p-color-border, var(--app-color-border-secondary))" : "none",
  };
}

function listStyle(
  placement: "below" | "above",
  menuFitContent: boolean,
  menuAlignEnd: boolean,
  menuMaxWidth?: number,
): CSSProperties {
  const defaultMax = menuFitContent ? 280 : 320;
  return {
    position: "absolute",
    zIndex: 10000,
    insetInlineStart: menuAlignEnd ? "auto" : 0,
    insetInlineEnd: menuAlignEnd ? 0 : "auto",
    ...(placement === "above"
      ? { bottom: "calc(100% + 4px)", top: "auto" }
      : { top: "calc(100% + 4px)", bottom: "auto" }),
    minWidth: menuFitContent ? "max(100%, 220px)" : "100%",
    width: menuFitContent ? "max-content" : "100%",
    maxWidth: menuMaxWidth ?? defaultMax,
    maxHeight: 240,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: 6,
    borderRadius: 10,
    border: "1px solid var(--app-color-border-secondary)",
    background: "var(--app-color-surface)",
    boxShadow: "var(--app-shadow-card-strong, 0 18px 40px rgba(15, 23, 42, 0.08))",
  };
}

function InFlowOptionBadge({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <span style={optionBadgeStyle(compact)} aria-hidden>
      {text}
    </span>
  );
}

const optionLabelWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
};

const optionLabelTextStyle: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  textAlign: "start",
};

const optionDescriptionStyle: CSSProperties = {
  display: "block",
  marginTop: 2,
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.35,
  color: "var(--p-color-text-secondary, var(--app-color-text-secondary))",
};

function optionBadgeStyle(compact: boolean): CSSProperties {
  return {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: compact ? "1px 6px" : "2px 8px",
    borderRadius: 999,
    fontSize: compact ? 10 : 11,
    fontWeight: 600,
    lineHeight: "16px",
    letterSpacing: "0.01em",
    color: "var(--app-color-text-info, var(--p-color-text-info))",
    background: "var(--app-color-surface-info, rgba(46, 125, 246, 0.12))",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };
}

function optionStyle(
  selected: boolean,
  disabled: boolean,
  menuFitContent: boolean,
): CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "start",
    minHeight: 36,
    padding: "8px 10px",
    border: "none",
    borderRadius: 8,
    background: selected ? "rgba(46, 125, 246, 0.10)" : "transparent",
    color: selected ? "var(--p-color-text-info)" : "var(--app-color-text)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: selected ? 600 : 500,
    lineHeight: 1.35,
    whiteSpace: menuFitContent ? "nowrap" : "normal",
    overflowWrap: menuFitContent ? "normal" : "anywhere",
    opacity: disabled ? 0.5 : 1,
  };
}

const errorStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "var(--p-color-text-critical, #8e0a21)",
  lineHeight: 1.35,
};
