import React, { useState, useCallback } from 'react';
import { Button, Popover, ActionList } from '@shopify/polaris';
import { useEditorState } from '@tiptap/react';

interface HeadingMenuProps {
  editor: any;
  disabled:boolean
}

export default function HeadingMenu({ editor,disabled }: HeadingMenuProps) {
  const [active, setActive] = useState(false);

  const headingItems = [
    { key: 'p', content: 'Text', fontSize: '14px', fontWeight: 400 },
    { key: 'h1', content: 'h1', fontSize: '32px', fontWeight: 700 },
    { key: 'h2', content: 'h2', fontSize: '28px', fontWeight: 600 },
    { key: 'h3', content: 'h3', fontSize: '24px', fontWeight: 600 },
    { key: 'h4', content: 'h4', fontSize: '20px', fontWeight: 500 },
    { key: 'h5', content: 'h5', fontSize: '16px', fontWeight: 500 },
    { key: 'h6', content: 'h6', fontSize: '14px', fontWeight: 500 },
  ];

  // 监听编辑器状态
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isParagraph: ctx.editor?.isActive('paragraph') ?? false,
      isHeading1: ctx.editor?.isActive('heading', { level: 1 }) ?? false,
      isHeading2: ctx.editor?.isActive('heading', { level: 2 }) ?? false,
      isHeading3: ctx.editor?.isActive('heading', { level: 3 }) ?? false,
      isHeading4: ctx.editor?.isActive('heading', { level: 4 }) ?? false,
      isHeading5: ctx.editor?.isActive('heading', { level: 5 }) ?? false,
      isHeading6: ctx.editor?.isActive('heading', { level: 6 }) ?? false,
    }),
  });

  const getCurrentLabel = () => {
    if (editorState.isParagraph) return 'Text';
    if (editorState.isHeading1) return 'h1';
    if (editorState.isHeading2) return 'h2';
    if (editorState.isHeading3) return 'h3';
    if (editorState.isHeading4) return 'h4';
    if (editorState.isHeading5) return 'h5';
    if (editorState.isHeading6) return 'h6';
    return '正文';
  };

  const handleAction = (key: string) => {
    if (!editor) return;

    // 强制重新聚焦
    editor.commands.focus();

    if (key === 'p') {
      editor.commands.setParagraph();
    } else {
      const level = Number(key.replace('h', ''));
      editor.commands.toggleHeading({ level }); // 用 setHeading 而不是 toggleHeading
    }

    setActive(false);
  };

  const actions : any = headingItems.map((item) => ({
    content: (
      <span style={{ fontSize: item.fontSize, fontWeight: item.fontWeight, lineHeight: '1.2' }}>
        {item.content}
      </span>
    ),
    onAction: () => handleAction(item.key),
  }));

  return (
    <Popover
      active={active}
      activator={
        <Button disabled={disabled} variant="tertiary" disclosure onClick={() => setActive(!active)}>
          {getCurrentLabel()}
        </Button>
      }
      onClose={() => setActive(false)}
    >
      <ActionList items={actions} />
    </Popover>
  );
}
