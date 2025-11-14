import { Button, Modal, Spin } from "antd";
import { useEffect, useRef, useState } from "react";

interface AidgeEditorProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  languageCode: string;
  onComplete: (editedImageUrl: string) => void;
  sourceLanguage: string;
  onSaveImage: (data: any) => void;
}

export default function AidgeEditorModal({
  open,
  onClose,
  imageUrl,
  languageCode,
  onComplete,
  sourceLanguage,
  onSaveImage,
}: AidgeEditorProps) {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ✅ 拼接编辑器地址（正确方式）
  const domain = "https://image-editor.aidc-ai.com/editor/index.html#/";
  const route = "translate";

  const payload = {
    apiHost: "aibcn", // 中文站
    reEdit: false,
    lang: "zh-cn",
    trial: true, // 开启试用
    charge: true,
    imageUrl: imageUrl,
    sourceLanguage,
    targetLanguage: languageCode,
  };

  const editorUrl = `${domain}${route}?payload=${encodeURIComponent(
    JSON.stringify(payload),
  )}`;

  // useEffect(() => {
  //   const handleMessage = (event: MessageEvent) => {
  //     if (!event.origin.includes("aidc-ai.com")) return;
  //     const data = event.data;
  //     if (data?.type === "AIDGE_EDIT_COMPLETE") {
  //       console.log("data: ", data);

  //       onComplete(data.editedImageUrl);
  //       onClose();
  //     }
  //   };
  //   window.addEventListener("message", handleMessage);
  //   return () => window.removeEventListener("message", handleMessage);
  // }, [onClose, onComplete]);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全检查：确认是来自编辑器的消息
      if (!event.origin.includes("aidc-ai.com")) return;

      const { action, data, errMessage, code, biz } = event.data;
      console.log("event data: ", event.data);

      switch (action) {
        case "pageReady":
          console.log("✅ 编辑器已加载完毕");
          break;

        case "taskSuccess":
          console.log("🖼️ 生成任务成功：", data);
          break;

        case "submitAll":
          console.log("💾 用户保存或下载：", data);
          // data 中包含最终图片 URL + JSON 协议
          onSaveImage(data);
          onClose();
          break;
        case "checkCharge":
          console.log("💾 拦截到用户的付费调用，手动验证是否有额度", data);
          break;
        case "generate":
          iframeRef?.current?.contentWindow?.postMessage(
            {
              biz: biz, // 抠图 nhci-cutout；消除 nhci-elimination；场景图 nhci-scene；图翻nhci-translate；图翻pro nhci-translate-pro
              action: "respond",
              success: true,
            },
            "*",
          );
          break;
        default:
          console.log("📩 其他事件：", action, data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // window.addEventListener("message", (event) => {
  //   const { action } = event.data;

  //   if (action === "checkCharge") {
  //     // 拦截到用户的付费调用，手动验证是否有额度
  //     console.log("监听到付费API的调用");

  //     //   const hasCredit = checkUserCredits(); // 你的逻辑

  //     //   // 返回给编辑器，是否放行
  //     //   event.source?.postMessage(
  //     //     {
  //     //       action: "checkChargeResult",
  //     //       success: hasCredit,
  //     //       message: hasCredit ? "" : "您的额度不足",
  //     //     },
  //     //     "*",
  //     //   );
  //   }
  // });
  // 请求编辑器返回当前结果
  // 如果接入方需要从外部获取到编辑器内的结果数据，可以通过发送 action 为 requestResult 的事件实现
  const requestResult = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { action: "requestResult" },
      "*",
    );
  };

  // 发送历史 JSON 协议以再次编辑
  const renderSchema = (schema: any) => {
    iframeRef.current?.contentWindow?.postMessage(
      { action: "renderSchema", data: schema },
      "*",
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        <iframe
          key={languageCode}
          ref={iframeRef}
          className="aidc-open-frame"
          src={editorUrl}
          onLoad={() => setLoading(false)}
          style={{
            width: "100%",
            height: "80vh",
            border: "none",
            borderRadius: 8,
          }}
        />
      </Spin>
      <Button onClick={requestResult}>请求编辑器返回当前结果</Button>
      <Button onClick={renderSchema}>再次编辑</Button>
    </Modal>
  );
}
