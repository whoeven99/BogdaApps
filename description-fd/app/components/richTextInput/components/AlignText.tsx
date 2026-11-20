import React, { useState, useCallback } from 'react';
import { Button, Popover, ActionList, Icon } from '@shopify/polaris';
import {
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
} from '@shopify/polaris-icons';

interface AlignTextProps {
  editor: any;
}

export const AlignText: React.FC<AlignTextProps> = ({ editor }) => {
  const [active, setActive] = useState(false);
  const [currentAlign, setCurrentAlign] = useState<'left' | 'center' | 'right'>('left');

  const toggleActive = useCallback(() => setActive((active) => !active), []);
  const handleClose = useCallback(() => setActive(false), []);

  const handleAlignClick = (align: 'left' | 'center' | 'right') => {
    if (!editor) return;

    editor.chain().focus().setTextAlign(align).run();
    setCurrentAlign(align);
    setActive(false);
  };

  const actions = [
    {
      content: 'Left Align',
      icon: TextAlignLeftIcon,
      onAction: () => handleAlignClick('left'),
    },
    {
      content: 'Left Center',
      icon: TextAlignCenterIcon,
      onAction: () => handleAlignClick('center'),
    },
    {
      content: 'Left Right',
      icon: TextAlignRightIcon,
      onAction: () => handleAlignClick('right'),
    },
  ];

  const currentIcon =
    currentAlign === 'left'
      ? TextAlignLeftIcon
      : currentAlign === 'center'
      ? TextAlignCenterIcon
      : TextAlignRightIcon;

  return (
    <Popover
      active={active}
      activator={
        <Button
          variant="tertiary"
          icon={<Icon source={currentIcon} />}
          onClick={toggleActive}
          size="slim"
        />
      }
      onClose={handleClose}
    >
      <ActionList items={actions} />
    </Popover>
  );
};
