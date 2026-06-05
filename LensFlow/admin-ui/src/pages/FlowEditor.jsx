import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Steps, Button, Select, Spin, Alert, Typography, Space, message, Collapse, Tag } from "antd";
import {
  ArrowLeftOutlined, SaveOutlined, BuildOutlined, SettingOutlined, SendOutlined,
  PlusOutlined, UpOutlined, DownOutlined, DeleteOutlined,
} from "@ant-design/icons";
import { useApi } from "../hooks/useApi";
import { useMutation } from "../hooks/useMutation";
import { useI18n } from "../hooks/useI18n";
import PageConfigEditor from "../components/PageConfigEditor";
import PrescriptionTypeEditor from "../components/PrescriptionTypeEditor";
import SubmitMethodEditor from "../components/SubmitMethodEditor";
import PrescriptionFormEditor from "../components/PrescriptionFormEditor";
import ReadingFormEditor from "../components/ReadingFormEditor";
import UploadStepEditor from "../components/UploadStepEditor";
import LensPageEditor from "../components/LensPageEditor";
import LogicJumpsEditor from "../components/LogicJumpsEditor";
import ReviewOrderEditor from "../components/ReviewOrderEditor";
import TextTranslationEditor from "../components/TextTranslationEditor";
import GlobalStyleEditor from "../components/GlobalStyleEditor";
import GlobalSettingsEditor from "../components/GlobalSettingsEditor";
import PublishTab from "../components/PublishTab";
import ProductAssignment from "../components/ProductAssignment";

const { Title, Text, Paragraph } = Typography;

function useNodeLabels() {
  const { t } = useI18n();
  return {
    prescription_type: t("flowEditor.nodeLabels.prescription_type") || "Prescription Type",
    submit_method: t("flowEditor.nodeLabels.submit_method") || "Submit Method",
    single_vision_form: t("flowEditor.nodeLabels.single_vision_form") || "Single Vision Form",
    progressive_form: t("flowEditor.nodeLabels.progressive_form") || "Progressive Form",
    reading_form: t("flowEditor.nodeLabels.reading_form") || "Reading Form",
    upload_step: t("flowEditor.nodeLabels.upload_step") || "Upload Step",
    lens_step: t("flowEditor.nodeLabels.lens_step") || "Lens Step",
    review_order: t("flowEditor.nodeLabels.review_order") || "Order Review",
    custom_step: t("flowEditor.nodeLabels.custom_step") || "Custom",
  };
}

const NODE_LABELS_DEFAULT = {
  prescription_type: "Prescription Type",
  submit_method: "Submit Method",
  single_vision_form: "Single Vision Form",
  progressive_form: "Progressive Form",
  reading_form: "Reading Form",
  upload_step: "Upload Step",
  lens_step: "Lens Step",
  review_order: "Order Review",
  custom_step: "Custom",
};

const STEP_TAB_ORDER = [
  "prescription_type", "submit_method", "single_vision_form", "progressive_form",
  "reading_form", "upload_step", "lens_step", "review_order",
];

function getDefaultNode(type, ref) {
  const content = { title: NODE_LABELS_DEFAULT[type] || "Step", subtitle: "", description: "" };
  const base = { type, ref, content, translations: {} };
  switch (type) {
    case "prescription_type":
      return { ...base, options: [], config: { showImages: true, showPrices: true } };
    case "submit_method":
      return { ...base, options: [], config: { allowManual: true, allowUpload: true, allowLater: true } };
    case "single_vision_form":
    case "progressive_form":
      return { ...base, config: { sph: { field: "sph", label: "SPH", min: -20, max: 20, step: 0.25, required: true }, cyl: { field: "cyl", label: "CYL", min: -6, max: 6, step: 0.25, required: true }, axis: { field: "axis", label: "Axis", min: 0, max: 180, step: 1, required: true }, add: { field: "add", label: "ADD", min: 0, max: 4, step: 0.25, required: false }, pd: { field: "pd", label: "PD", min: 45, max: 85, step: 0.5, required: true }, showPrism: false, showOcHt: false } };
    case "reading_form":
      return { ...base, config: { maxMagnification: 4, step: 0.25 } };
    case "upload_step":
      return { ...base, config: { allowPdSelector: true, acceptTypes: ["image/*", "application/pdf"] } };
    case "lens_step":
      return { ...base, pages: [] };
    case "review_order":
      return { ...base, config: { showFrameInfo: true, showLensInfo: true, showPrescriptionInfo: true, showAddToCart: true } };
    case "custom_step":
      return { ...base, content: { ...content, htmlContent: "<p>Custom content</p>" } };
    default:
      return base;
  }
}

function StepNumber({ n }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 22, borderRadius: "50%", background: "#005bd3", color: "#fff",
      fontSize: 12, fontWeight: 700, marginRight: 6, flexShrink: 0,
    }}>{n}</span>
  );
}

function StepsBuilder({ config, setConfig, nodeRefs, selectedNodeRef, setSelectedNodeRef, NODE_LABELS, addNode, removeNode, moveNode, notAddedTypes, t }) {
  const selectedNode = useMemo(() => config.nodes.find((n) => n.ref === selectedNodeRef) || null, [config.nodes, selectedNodeRef]);

  const updateNode = (ref, partial) => {
    setConfig((prev) => ({ ...prev, nodes: prev.nodes.map((n) => (n.ref === ref ? { ...n, ...partial } : n)) }));
  };

  // Compute navigation info for annotations
  const navInfo = useMemo(() => {
    const nodes = config.nodes || [];
    const jumpRules = config.jumpRules || [];
    return nodes.map((node, i) => {
      const ref = node.ref || "";
      // All leadsTo targets from this node's options
      const leadsToRefs = [];
      const allOpts = [];
      if (Array.isArray(node.options)) allOpts.push(...node.options);
      if (node.type === "lens_step" && Array.isArray(node.pages)) {
        for (const page of node.pages) {
          if (Array.isArray(page.options)) allOpts.push(...page.options);
        }
      }
      for (const opt of allOpts) {
        if (opt.leadsTo && opt.leadsTo.trim()) leadsToRefs.push(opt.leadsTo.trim());
      }
      // Jump rule targets from this node
      const jumpToRefs = [];
      for (const jr of jumpRules) {
        const fromRef = jr.fromNodeRef || (jr.fromNodeIndex != null ? nodes[jr.fromNodeIndex]?.ref : null);
        const toRef = jr.toNodeRef || (jr.toNodeIndex != null ? nodes[jr.toNodeIndex]?.ref : null);
        if (fromRef === ref && toRef) jumpToRefs.push(toRef);
      }
      // Incoming jumps
      const incomingFrom = [];
      for (const jr of jumpRules) {
        const fromRef = jr.fromNodeRef || (jr.fromNodeIndex != null ? nodes[jr.fromNodeIndex]?.ref : null);
        const toRef = jr.toNodeRef || (jr.toNodeIndex != null ? nodes[jr.toNodeIndex]?.ref : null);
        if (toRef === ref && fromRef) incomingFrom.push(fromRef);
      }
      // Incoming from leadsTo of other nodes
      for (const other of nodes) {
        if (other.ref === ref) continue;
        const otherOpts = [];
        if (Array.isArray(other.options)) otherOpts.push(...other.options);
        if (other.type === "lens_step" && Array.isArray(other.pages)) {
          for (const page of other.pages) {
            if (Array.isArray(page.options)) otherOpts.push(...page.options);
          }
        }
        for (const opt of otherOpts) {
          if (opt.leadsTo && opt.leadsTo.trim() === ref && !incomingFrom.includes(other.ref)) {
            incomingFrom.push(other.ref);
          }
        }
      }
      // Default next
      const defaultNext = i < nodes.length - 1 ? nodes[i + 1]?.ref : null;
      return { ref, leadsToRefs: [...new Set(leadsToRefs)], jumpToRefs, incomingFrom: [...new Set(incomingFrom)], defaultNext, stepIndex: i };
    });
  }, [config.nodes, config.jumpRules]);

  const getNodeJumpLabel = (targetRef) => {
    const idx = config.nodes.findIndex(n => n.ref === targetRef);
    if (idx === -1) return targetRef;
    return `→ Step ${idx + 1}: ${NODE_LABELS[config.nodes[idx]?.type] || config.nodes[idx]?.type || targetRef}`;
  };

  const hasNodes = config.nodes.length > 0;

  return (
    <div style={{ display: "flex", gap: 20, minHeight: 400 }}>
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: "12px",
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "#555", display: "flex", alignItems: "center" }}>
            <BuildOutlined style={{ marginRight: 6 }} />
            {t("flowEditor.steps") || "Steps"}
          </div>

          {hasNodes ? (
            config.nodes.map((n, i) => {
              const info = navInfo[i] || { leadsToRefs: [], jumpToRefs: [], incomingFrom: [], defaultNext: null };
              const hasOutgoing = info.leadsToRefs.length > 0 || info.jumpToRefs.length > 0 || info.defaultNext;
              const hasIncoming = info.incomingFrom.length > 0;
              return (
              <div
                key={n.ref}
                onClick={() => setSelectedNodeRef(n.ref)}
                style={{
                  padding: "6px 10px", marginBottom: 4, borderRadius: 6, cursor: "pointer",
                  fontSize: 13,
                  background: selectedNodeRef === n.ref ? "#e8f0fe" : "#fafafa",
                  border: selectedNodeRef === n.ref ? "1px solid #005bd3" : "1px solid transparent",
                  fontWeight: selectedNodeRef === n.ref ? 600 : 400,
                  color: selectedNodeRef === n.ref ? "#005bd3" : "#333",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ color: "#999", fontSize: 11, marginRight: 4 }}>{i + 1}.</span>
                    {NODE_LABELS[n.type] || n.type}
                  </span>
                  <Space size={0} onClick={(e) => e.stopPropagation()}>
                    <Button type="text" size="small" icon={<UpOutlined />} disabled={i === 0}
                      style={{ padding: "0 3px", height: 22, fontSize: 10, color: "#999" }}
                      onClick={() => moveNode(n.ref, -1)} />
                    <Button type="text" size="small" icon={<DownOutlined />} disabled={i === config.nodes.length - 1}
                      style={{ padding: "0 3px", height: 22, fontSize: 10, color: "#999" }}
                      onClick={() => moveNode(n.ref, 1)} />
                    <Button type="text" danger size="small" icon={<DeleteOutlined />}
                      style={{ padding: "0 3px", height: 22, fontSize: 10 }}
                      onClick={() => removeNode(n.ref)} />
                  </Space>
                </div>
                {/* Navigation annotations */}
                <div style={{ marginTop: 3, fontSize: 10, lineHeight: "1.4" }}>
                  {info.leadsToRefs.map(ref => (
                    <div key={"lt-" + ref} style={{ color: "#005bd3", paddingLeft: 14 }}>
                      ⤷ Leads to: <span style={{ fontWeight: 500 }}>{getNodeJumpLabel(ref)}</span>
                    </div>
                  ))}
                  {info.jumpToRefs.map(ref => (
                    <div key={"jt-" + ref} style={{ color: "#fa8c16", paddingLeft: 14 }}>
                      ⤷ Conditional: <span style={{ fontWeight: 500 }}>{getNodeJumpLabel(ref)}</span>
                    </div>
                  ))}
                  {!hasOutgoing && i < config.nodes.length - 1 && (
                    <div style={{ color: "#999", paddingLeft: 14 }}>
                      → Next: {getNodeJumpLabel(info.defaultNext)}
                    </div>
                  )}
                  {info.incomingFrom.map(ref => (
                    <div key={"in-" + ref} style={{ color: "#52c41a", paddingLeft: 14, fontStyle: "italic" }}>
                      ← From: {getNodeJumpLabel(ref)}
                    </div>
                  ))}
                </div>
              </div>
            );})
          ) : (
            <div style={{ textAlign: "center", padding: "20px 8px", color: "#bbb", fontSize: 12 }}>
              {t("flowEditor.noSteps") || "No steps defined."}
            </div>
          )}

          {notAddedTypes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <Select
                style={{ width: "100%" }}
                size="small"
                value={undefined}
                placeholder={<span><PlusOutlined /> {t("flowEditor.addStep") || "Add step..."}</span>}
                onChange={(v) => { if (v) addNode(v); }}
                options={notAddedTypes.map((tp) => ({ value: tp, label: NODE_LABELS[tp] }))}
              />
            </div>
          )}
        </div>

        {hasNodes && (
          <div style={{
            marginTop: 10, padding: "8px 12px", background: "#f0f7ff", borderRadius: 6,
            fontSize: 11, color: "#005bd3", border: "1px solid #d0e3ff",
          }}>
            💡 {t("flowEditor.hintOrder") || "Steps run top to bottom. Drag arrows to reorder."}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!selectedNode && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", minHeight: 250, color: "#bbb", textAlign: "center", padding: 40,
            background: "#fff", borderRadius: 8, border: "1px dashed #ddd",
          }}>
            <BuildOutlined style={{ fontSize: 36, marginBottom: 12 }} />
            <Text type="secondary" style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
              {t("flowEditor.selectStep") || "Select a step from the left to edit it."}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("flowEditor.selectHint") || "Each step represents a screen in your customer's prescription journey."}
            </Text>
          </div>
        )}

        {selectedNode && (
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 20 }}>
            {/* Navigation Info Bar */}
            {(() => {
              const idx = config.nodes.findIndex(n => n.ref === selectedNode.ref);
              const info = navInfo[idx] || { leadsToRefs: [], jumpToRefs: [], incomingFrom: [], defaultNext: null, stepIndex: idx };
              return (
                <div style={{
                  marginBottom: 16, padding: "10px 14px",
                  background: info.incomingFrom.length > 0 || info.leadsToRefs.length > 0 || info.jumpToRefs.length > 0 ? "#f6ffed" : "#fafafa",
                  border: "1px solid #e5e5e5", borderRadius: 6, fontSize: 12,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: "#333" }}>
                    🧭 {t("flowEditor.navigation") || "Navigation"}
                  </div>
                  <div style={{ color: "#666", lineHeight: "1.6" }}>
                    {info.incomingFrom.length > 0 && (
                      <div>
                        <span style={{ color: "#52c41a" }}>← {t("flowEditor.incomingFrom") || "Incoming from"}: </span>
                        {info.incomingFrom.map((ref, j) => (
                          <Tag key={j} color="green" style={{ fontSize: 10, marginRight: 4 }}>
                            Step {(config.nodes.findIndex(n => n.ref === ref)) + 1}: {NODE_LABELS[config.nodes.find(n => n.ref === ref)?.type] || ref}
                          </Tag>
                        ))}
                      </div>
                    )}
                    <div>
                      <span style={{ color: "#333" }}>→ {t("flowEditor.defaultNext") || "Default next"}: </span>
                      {info.defaultNext ? (
                        <Tag color="default" style={{ fontSize: 10 }}>
                          Step {(config.nodes.findIndex(n => n.ref === info.defaultNext)) + 1}: {NODE_LABELS[config.nodes.find(n => n.ref === info.defaultNext)?.type] || info.defaultNext}
                        </Tag>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 11 }}>{t("flowEditor.lastStep") || "Last step"}</Text>
                      )}
                    </div>
                    {info.leadsToRefs.length > 0 && (
                      <div>
                        <span style={{ color: "#005bd3" }}>⤷ {t("flowEditor.leadsToFromOptions") || "Option leadsTo"}: </span>
                        {info.leadsToRefs.map((ref, j) => (
                          <Tag key={j} color="blue" style={{ fontSize: 10, marginRight: 4 }}>
                            Step {(config.nodes.findIndex(n => n.ref === ref)) + 1}: {NODE_LABELS[config.nodes.find(n => n.ref === ref)?.type] || ref}
                          </Tag>
                        ))}
                      </div>
                    )}
                    {info.jumpToRefs.length > 0 && (
                      <div>
                        <span style={{ color: "#fa8c16" }}>⤷ {t("flowEditor.conditionalJump") || "Conditional jump to"}: </span>
                        {info.jumpToRefs.map((ref, j) => (
                          <Tag key={j} color="orange" style={{ fontSize: 10, marginRight: 4 }}>
                            Step {(config.nodes.findIndex(n => n.ref === ref)) + 1}: {NODE_LABELS[config.nodes.find(n => n.ref === ref)?.type] || ref}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <PageConfigEditor
              content={selectedNode.content}
              onChange={(c) => updateNode(selectedNode.ref, { content: c })}
            />

            {selectedNode.type === "prescription_type" && (
              <PrescriptionTypeEditor
                options={selectedNode.options || []}
                config={selectedNode.config || { showImages: true, showPrices: true }}
                nodeRefs={nodeRefs}
                onChange={(o, cfg) => updateNode(selectedNode.ref, { options: o, config: cfg })}
              />
            )}
            {selectedNode.type === "submit_method" && (
              <SubmitMethodEditor
                options={selectedNode.options}
                config={selectedNode.config}
                onChange={(c) => updateNode(selectedNode.ref, { options: c.options || [], config: c.config })}
              />
            )}
            {(selectedNode.type === "single_vision_form" || selectedNode.type === "progressive_form") && (
              <PrescriptionFormEditor
                config={selectedNode.config}
                onChange={(cfg) => updateNode(selectedNode.ref, { config: cfg })}
              />
            )}
            {selectedNode.type === "reading_form" && (
              <ReadingFormEditor
                config={selectedNode.config}
                onChange={(cfg) => updateNode(selectedNode.ref, { config: cfg })}
              />
            )}
            {selectedNode.type === "upload_step" && (
              <UploadStepEditor
                config={selectedNode.config}
                onChange={(cfg) => updateNode(selectedNode.ref, { config: cfg })}
              />
            )}
            {selectedNode.type === "lens_step" && (
              <div>
                <LensPageEditor pages={selectedNode.pages || []} nodeRefs={nodeRefs}
                  onChange={(pages) => updateNode(selectedNode.ref, { pages })} />
                {selectedNode.pages && selectedNode.pages.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t("flowEditor.logicJumps") || "Logic Jumps"}</div>
                    <LogicJumpsEditor jumpRules={config.jumpRules || []} nodeRefs={nodeRefs} nodes={config.nodes}
                      onChange={(jr) => setConfig((prev) => ({ ...prev, jumpRules: jr }))} />
                  </div>
                )}
              </div>
            )}
            {selectedNode.type === "review_order" && (
              <ReviewOrderEditor config={selectedNode.config}
                onChange={(cfg) => updateNode(selectedNode.ref, { config: cfg })} />
            )}
            {selectedNode.type === "custom_step" && (
              <div>
                <div style={{ fontWeight: 500, fontSize: 12, color: "#888", marginBottom: 6 }}>
                  {t("flowEditor.htmlContent") || "HTML Content"}
                </div>
                <textarea
                  style={{ width: "100%", border: "1px solid #ddd", borderRadius: 6, padding: 10, fontSize: 13, minHeight: 120 }}
                  value={selectedNode.content?.htmlContent || ""}
                  onChange={(e) => updateNode(selectedNode.ref, { content: { ...selectedNode.content, htmlContent: e.target.value } })}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FlowDiagram({ config, NODE_LABELS }) {
  const nodes = config.nodes || [];
  const jumpRules = config.jumpRules || [];
  const [showDiagram, setShowDiagram] = useState(true);

  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 24, color: "#bbb", fontSize: 13 }}>
        Add steps to see the flow diagram.
      </div>
    );
  }

  // Build all connections: { fromIndex, toIndex, type, label }
  const connections = [];
  // Sequential connections
  for (let i = 0; i < nodes.length - 1; i++) {
    // Check if there are already explicit connections that skip this
    const hasOverride = jumpRules.some(jr => {
      const fromRef = jr.fromNodeRef || (jr.fromNodeIndex != null ? nodes[jr.fromNodeIndex]?.ref : null);
      return fromRef === nodes[i]?.ref;
    }) || (() => {
      const allOpts = [];
      const node = nodes[i];
      if (Array.isArray(node.options)) allOpts.push(...node.options);
      if (node.type === "lens_step" && Array.isArray(node.pages)) {
        for (const p of node.pages) if (Array.isArray(p.options)) allOpts.push(...p.options);
      }
      return allOpts.some(o => o.leadsTo && o.leadsTo.trim());
    })();
    connections.push({
      fromIndex: i, toIndex: i + 1,
      type: hasOverride ? "default-overridden" : "default",
      label: "",
    });
  }
  // LeadsTo connections from options
  for (let i = 0; i < nodes.length; i++) {
    const allOpts = [];
    const node = nodes[i];
    if (Array.isArray(node.options)) allOpts.push(...node.options);
    if (node.type === "lens_step" && Array.isArray(node.pages)) {
      for (const p of node.pages) if (Array.isArray(p.options)) allOpts.push(...p.options);
    }
    for (const opt of allOpts) {
      if (opt.leadsTo && opt.leadsTo.trim()) {
        const toIdx = nodes.findIndex(n => n.ref === opt.leadsTo.trim());
        if (toIdx >= 0 && toIdx !== i) {
          connections.push({ fromIndex: i, toIndex: toIdx, type: "leadsTo", label: opt.name || opt.type || opt.id || "option" });
        }
      }
    }
  }
  // Jump rule connections
  for (const jr of jumpRules) {
    const fromRef = jr.fromNodeRef || (jr.fromNodeIndex != null ? nodes[jr.fromNodeIndex]?.ref : null);
    const toRef = jr.toNodeRef || (jr.toNodeIndex != null ? nodes[jr.toNodeIndex]?.ref : null);
    const fromIdx = fromRef ? nodes.findIndex(n => n.ref === fromRef) : -1;
    const toIdx = toRef ? nodes.findIndex(n => n.ref === toRef) : -1;
    if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
      connections.push({
        fromIndex: fromIdx, toIndex: toIdx,
        type: "jumpRule",
        label: jr.condition ? `${jr.condition.field || "?"} ${jr.condition.operator || "?"} ${jr.condition.value || "?"}` : "condition",
      });
    }
  }

  if (!showDiagram) {
    return (
      <Button type="link" onClick={() => setShowDiagram(true)} style={{ padding: 0 }}>
        Show Flow Diagram
      </Button>
    );
  }

  const CARD_W = 140;
  const CARD_H = 44;
  const GAP_Y = 14;
  const LEFT_X = 0;
  const SVG_W = 600;
  const SVG_H = nodes.length * (CARD_H + GAP_Y) + 20;

  // Arrow colors
  const COLORS = {
    default: "#d9d9d9",
    "default-overridden": "#e8e8e8",
    leadsTo: "#005bd3",
    jumpRule: "#fa8c16",
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#666" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 2, background: "#d9d9d9", verticalAlign: "middle", marginRight: 4 }} /> Sequential</span>
          <span><span style={{ display: "inline-block", width: 10, height: 2, background: "#fa8c16", verticalAlign: "middle", marginRight: 4 }} /> Conditional Jump</span>
          <span><span style={{ display: "inline-block", width: 10, height: 2, background: "#005bd3", verticalAlign: "middle", marginRight: 4 }} /> Option leadsTo</span>
        </div>
        <Button type="link" size="small" onClick={() => setShowDiagram(false)}>Hide Diagram</Button>
      </div>
      <svg width={SVG_W} height={SVG_H} style={{ display: "block" }}>
        {connections.map((conn, ci) => {
          const y1 = conn.fromIndex * (CARD_H + GAP_Y) + (conn.type === "jumpRule" ? CARD_H : CARD_H);
          const y2 = conn.toIndex * (CARD_H + GAP_Y) + 0;
          const x1 = LEFT_X + CARD_W / 2 + (conn.type === "leadsTo" ? 30 : conn.type === "jumpRule" ? -30 : 0);
          const x2 = LEFT_X + CARD_W / 2;
          // Draw curved line
          const midY = (y1 + y2) / 2;
          const offsetX = Math.abs(conn.toIndex - conn.fromIndex) * 8;
          const cx = conn.type !== "default" ? LEFT_X + CARD_W + 20 + offsetX : LEFT_X + CARD_W / 2;
          const pathD = conn.type === "default"
            ? `M ${x1} ${y1} L ${x2} ${y2}`
            : `M ${x1} ${y1} Q ${cx} ${y1} ${cx} ${midY} Q ${cx} ${y2} ${(x2 + cx) / 2} ${y2} L ${x2} ${y2}`;
          return (
            <g key={ci}>
              <path d={pathD} fill="none" stroke={COLORS[conn.type] || "#d9d9d9"}
                strokeWidth={conn.type === "default" ? 1.5 : 2}
                strokeDasharray={conn.type === "default-overridden" ? "4 3" : conn.type === "default" ? "none" : "none"}
                markerEnd={conn.type !== "default-overridden" ? `url(#arrowhead-${conn.type})` : undefined}
                opacity={conn.type === "default-overridden" ? 0.3 : 1}
              />
              {conn.label && conn.type !== "default" && (
                <text x={cx + 4} y={midY} fontSize={9} fill={COLORS[conn.type]} textAnchor="start" dominantBaseline="middle">
                  {conn.label.length > 20 ? conn.label.slice(0, 18) + "…" : conn.label}
                </text>
              )}
            </g>
          );
        })}
        <defs>
          {Object.entries(COLORS).map(([key, color]) => (
            <marker key={key} id={`arrowhead-${key}`} viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="6" markerHeight="5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={color} />
            </marker>
          ))}
        </defs>
        {nodes.map((n, i) => (
          <g key={n.ref || i}>
            <rect x={LEFT_X} y={i * (CARD_H + GAP_Y)} width={CARD_W} height={CARD_H}
              rx={6} fill="#fff" stroke="#d9d9d9" strokeWidth={1} />
            <text x={LEFT_X + 8} y={i * (CARD_H + GAP_Y) + 16} fontSize={10} fill="#999">
              Step {i + 1}
            </text>
            <text x={LEFT_X + 8} y={i * (CARD_H + GAP_Y) + 32} fontSize={12} fill="#333" fontWeight={500}>
              {NODE_LABELS[n.type] || n.type || "Unknown"}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function AdvancedConfig({ config, setConfig, nodeRefs, NODE_LABELS, t }) {
  const items = [
    {
      key: "diagram",
      label: <span style={{ fontWeight: 600, fontSize: 14 }}>{t("flowEditor.tabs.diagram") || "Flow Diagram"}</span>,
      children: (
        <div>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
            {t("flowEditor.tabHint.diagram") || "Visual map of your flow. Click on Logic Jumps to configure conditional navigation."}
          </Paragraph>
          <FlowDiagram config={config} NODE_LABELS={NODE_LABELS} />
        </div>
      ),
    },
    {
      key: "jumps",
      label: <span style={{ fontWeight: 600, fontSize: 14 }}>{t("flowEditor.tabs.jumps") || "Logic Jumps"}</span>,
      children: (
        <div>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
            {t("flowEditor.tabHint.jumps")}
          </Paragraph>
          <LogicJumpsEditor jumpRules={config.jumpRules || []} nodeRefs={nodeRefs} nodes={config.nodes}
            onChange={(jr) => setConfig((prev) => ({ ...prev, jumpRules: jr }))} />
        </div>
      ),
    },
    {
      key: "translations",
      label: <span style={{ fontWeight: 600, fontSize: 14 }}>{t("flowEditor.tabs.translations") || "Translations"}</span>,
      children: (
        <div>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
            {t("flowEditor.tabHint.translations")}
          </Paragraph>
          <TextTranslationEditor nodes={config.nodes} translations={{}}
            onChange={(tr) => setConfig((prev) => ({ ...prev, translations: tr }))} />
        </div>
      ),
    },
    {
      key: "styles",
      label: <span style={{ fontWeight: 600, fontSize: 14 }}>{t("flowEditor.tabs.styles") || "Styles"}</span>,
      children: (
        <GlobalStyleEditor styles={config.styles || {}}
          onChange={(s) => setConfig((prev) => ({ ...prev, styles: s }))} />
      ),
    },
    {
      key: "settings",
      label: <span style={{ fontWeight: 600, fontSize: 14 }}>{t("flowEditor.tabs.settings") || "Settings"}</span>,
      children: (
        <div>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
            {t("flowEditor.tabHint.settings")}
          </Paragraph>
          <GlobalSettingsEditor settings={config.settings || {}}
            onChange={(s) => setConfig((prev) => ({ ...prev, settings: s }))} />
        </div>
      ),
    },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 20 }}>
      <Collapse
        ghost
        defaultActiveKey={["jumps"]}
        items={items}
      />
    </div>
  );
}

export default function FlowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: flow, loading, error, retry } = useApi("/api/admin/flows/" + id);
  const { mutate, loading: saving } = useMutation();
  const { t } = useI18n();
  const NODE_LABELS = useNodeLabels();

  const [config, setConfig] = useState({ nodes: [], jumpRules: [] });
  const [selectedNodeRef, setSelectedNodeRef] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [productIds, setProductIds] = useState([]);

  useEffect(() => {
    if (flow?.config) {
      setConfig({ ...flow.config, nodes: flow.config.nodes || [], jumpRules: flow.config.jumpRules || [] });
    }
    if (flow?.productIds) {
      setProductIds(flow.productIds);
    }
  }, [flow]);

  const nodeRefs = useMemo(() => config.nodes.map((n) => n.ref).filter(Boolean), [config.nodes]);

  const addNode = (type) => {
    const ref = type + "_" + Date.now();
    setConfig((prev) => ({ ...prev, nodes: [...prev.nodes, getDefaultNode(type, ref)] }));
    setSelectedNodeRef(ref);
  };

  const removeNode = (ref) => {
    setConfig((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.ref !== ref),
      jumpRules: prev.jumpRules.filter((r) => r.fromNodeRef !== ref && r.toNodeRef !== ref),
    }));
    if (selectedNodeRef === ref) setSelectedNodeRef(null);
  };

  const moveNode = (ref, dir) => {
    setConfig((prev) => {
      const idx = prev.nodes.findIndex((n) => n.ref === ref);
      if (idx === -1) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.nodes.length) return prev;
      const arr = [...prev.nodes];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...prev, nodes: arr };
    });
  };

  const handleSave = async () => {
    await mutate("/api/admin/flows/" + id, "PUT", { name: flow?.name, config, productIds });
    message.success(t("flowEditor.saved") || "Flow saved");
  };

  const handleRename = async (newName) => {
    const trimmed = (newName || "").trim();
    if (!trimmed || trimmed === flow?.name) return;
    try {
      await mutate("/api/admin/flows/" + id, "PUT", { name: trimmed, config, productIds });
      message.success(t("flowEditor.renamed") || "Name updated");
      retry();
    } catch (e) {
      message.error((t("common.failed") || "Failed") + ": " + (e?.message || ""));
    }
  };

  const notAddedTypes = STEP_TAB_ORDER.filter((tp) => !config.nodes.some((n) => n.type === tp));

  if (error) return <Alert type="error" message={t("common.failed") || "Failed to load"} description={error.message} action={<Button size="small" onClick={retry}>{t("common.retry") || "Retry"}</Button>} />;

  const wizardItems = [
    {
      title: <span style={{ fontSize: 14 }}><StepNumber n={1} /> {t("flowEditor.wizard.step1Title") || "Build Steps"}</span>,
      description: t("flowEditor.wizard.step1Desc") || "Add & configure each step",
      icon: <BuildOutlined />,
    },
    {
      title: <span style={{ fontSize: 14 }}><StepNumber n={2} /> {t("flowEditor.wizard.step2Title") || "Advanced"}</span>,
      description: t("flowEditor.wizard.step2Desc") || "Logic jumps, translations & styles",
      icon: <SettingOutlined />,
    },
    {
      title: <span style={{ fontSize: 14 }}><StepNumber n={3} /> {t("flowEditor.wizard.step3Title") || "Publish"}</span>,
      description: t("flowEditor.wizard.step3Desc") || "Review & go live",
      icon: <SendOutlined />,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/flows")} size="small">
            {t("common.back") || "Back"}
          </Button>
          <Title level={4} style={{ margin: 0 }} editable={flow ? { onChange: handleRename, tooltip: t("flowEditor.editName") || "Click to edit", triggerType: ["icon", "text"] } : false}>
            {flow?.name || t("common.loading") || "Loading..."}
          </Title>
        </Space>
        <Space>
          <Button onClick={handleSave} loading={saving} icon={<SaveOutlined />}>
            {t("common.save") || "Save"}
          </Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        closable
        message={t("flowEditor.intro") || "Build your prescription flow step by step."}
        style={{ marginBottom: 16 }}
      />

      <div style={{
        background: "#fff", borderRadius: 8, border: "1px solid #e5e5e5",
        padding: "20px 24px", marginBottom: 16,
      }}>
        <Steps
          current={currentStep}
          onChange={setCurrentStep}
          size="small"
          items={wizardItems}
          style={{ marginBottom: 20 }}
        />

        {currentStep === 0 && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
                {t("flowEditor.wizard.step1Help") || "Add steps from the left panel, arrange them in order, then click each step to configure its content on the right."}
              </Paragraph>
            </div>
            <StepsBuilder
              config={config} setConfig={setConfig} nodeRefs={nodeRefs}
              selectedNodeRef={selectedNodeRef} setSelectedNodeRef={setSelectedNodeRef}
              NODE_LABELS={NODE_LABELS}
              addNode={addNode} removeNode={removeNode} moveNode={moveNode}
              notAddedTypes={notAddedTypes} t={t}
            />
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
              {t("flowEditor.wizard.step2Help") || "Optional settings for fine-tuning your flow. Click each section to expand."}
            </Paragraph>
            <AdvancedConfig config={config} setConfig={setConfig} nodeRefs={nodeRefs} NODE_LABELS={NODE_LABELS} t={t} />
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
              {t("flowEditor.tabHint.publish")}
            </Paragraph>
            <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <ProductAssignment productIds={productIds} onChange={setProductIds} />
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 20 }}>
              <PublishTab flow={flow} onPublish={handleSave} saving={saving} />
            </div>
          </div>
        )}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>}
    </div>
  );
}
