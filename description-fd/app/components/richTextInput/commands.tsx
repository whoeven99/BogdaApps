import { useEditorState } from "@tiptap/react";
import {
  CodeIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@shopify/polaris-icons";
import "./styles/commands.css";
import { useState, useEffect, useRef } from "react";
import Typography from "@tiptap/extension-typography";
import TableMenu from "./components/TableMenu";
import { AlignText } from "./components/AlignText";
import HeadingMenu from "./components/Heading";
// import VideoComponent from './components/VideoComponent'
import ImageUpload from "./components/ImageUpload";
import { Button, Icon, InlineStack, Tooltip } from "@shopify/polaris";

const Commands = ({ editor, handleTiptap, className, setHtmlContent }: any) => {
  const sanitizeHtml = (html: any) => {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "") // 移除 script
      .replace(/\son\w+="[^"]*"/gi, ""); // 移除 onClick/onError 等事件
  };

  const textareaRef = useRef(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor?.isActive("bold") ?? false,
      canBold: ctx.editor.can().chain().toggleBold().run() ?? false,
      isItalic: ctx.editor?.isActive("italic") ?? false,
      canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,
      canUnderline: ctx.editor.can().chain().toggleUnderline().run() ?? false,
      isParagraph: ctx.editor?.isActive("paragraph") ?? false,
      isHeading1: ctx.editor?.isActive("heading", { level: 1 }) ?? false,
      isHeading2: ctx.editor?.isActive("heading", { level: 2 }) ?? false,
      isHeading3: ctx.editor?.isActive("heading", { level: 3 }) ?? false,
      isHeading4: ctx.editor?.isActive("heading", { level: 4 }) ?? false,
      isHeading5: ctx.editor?.isActive("heading", { level: 5 }) ?? false,
      isHeading6: ctx.editor?.isActive("heading", { level: 6 }) ?? false,
    }),
  });

  const [isHtmlMode, setIsHtmlMode] = useState(false);
  useEffect(() => {
    if (isHtmlMode && textareaRef.current) {
      const el = textareaRef.current as HTMLTextAreaElement;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [isHtmlMode]);
  // 初始化编辑器内容
  useEffect(() => {
    if (editor && !editor.getJSON().content) {
      editor.commands.setContent("<p>Please enter content</p>");
    }
  }, [editor]);

  const toggleHtmlMode = () => {
    if (!editor) return;
    if (!isHtmlMode) {
      setIsHtmlMode(true);
      handleTiptap(false);
    } else {
      setIsHtmlMode(false);
      handleTiptap(true);
    }
  };

  return (
    <div className={className}>
      <div className="commands">
        <InlineStack gap="200" align="center" blockAlign="center" wrap={false}>
          <Tooltip content="heading" dismissOnMouseOut>
            <HeadingMenu editor={editor} disabled={isHtmlMode} />
          </Tooltip>
          <Tooltip content="Bold" dismissOnMouseOut>
            <Button
              variant="tertiary"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor || !editorState.canBold || isHtmlMode}
              icon={TextBoldIcon}
            />
          </Tooltip>
          <Tooltip content="Italic" dismissOnMouseOut>
            <Button
              variant="tertiary"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor || !editorState.canItalic || isHtmlMode}
              icon={TextItalicIcon}
            />
          </Tooltip>
          <Tooltip content="Underline" dismissOnMouseOut>
            <Button
              variant="tertiary"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              disabled={!editor || !editorState.canUnderline || isHtmlMode}
              icon={TextUnderlineIcon}
            />
          </Tooltip>

          <Tooltip content="table" dismissOnMouseOut>
            <TableMenu editor={editor} disabled={isHtmlMode} />
          </Tooltip>

          {/* <Button
          type="text"
          onClick={() => videoRef.current?.openModal()}
        >
          <IconFileVideo />
        </Button>
        <VideoComponent ref={videoRef}  onInsert={(url) => {
          editor.chain().focus().setVideo({ src: url }).run();
        }}/> */}
          <Tooltip content="Image" dismissOnMouseOut>
            <ImageUpload editor={editor} disabled={isHtmlMode} />
          </Tooltip>
        </InlineStack>
        <Tooltip
          content={isHtmlMode ? "Show Editor" : "Show HTML"}
          dismissOnMouseOut
        >
          <Button
            variant="tertiary"
            onClick={toggleHtmlMode}
            disabled={!editor}
            icon={CodeIcon}
          ></Button>
        </Tooltip>
      </div>
      {/* {isHtmlMode && (
        <textarea
          ref={textareaRef}
          value={formatHtml(htmlContent)}
          onChange={(e) => formatHtml(e.target.value)}
          style={{
            border: "1px solid #ccc",
            padding: "8px",
            height: "100%",
            fontFamily: "monospace",
            whiteSpace: "pre",
            overflow: "auto",
            width: "100%",
            borderRadius: "0 0 10px 10px",
          }}
        />
      )} */}
    </div>
  );
};

export default Commands;
