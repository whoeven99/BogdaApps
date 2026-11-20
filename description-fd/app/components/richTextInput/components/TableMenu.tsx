import React, { useState, useCallback } from 'react';
import { Button, Popover, ActionList, Icon } from '@shopify/polaris';
import { DataTableIcon } from '@shopify/polaris-icons';

interface TableMenuProps {
  editor: any;
  disabled: boolean;
}

export default function TableMenu({ editor, disabled }: TableMenuProps) {
  const [active, setActive] = useState(false);

  const toggleActive = useCallback(() => setActive((prev) => !prev), []);
  const handleClose = useCallback(() => setActive(false), []);

  const handleAction = (key: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();

    switch (key) {
      case 'insert':
        chain.insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
        break;
      case 'addRow':
        chain.addRowAfter().run();
        break;
      case 'addCol':
        chain.addColumnAfter().run();
        break;
      case 'delete':
        chain.deleteTable().run();
        break;
    }

    setActive(false); // 点击后关闭 Popover
  };

  // 判断表格操作的可用性
  const canAddRow = editor?.can().addRowAfter() ?? false;
  const canAddCol = editor?.can().addColumnAfter() ?? false;
  const canDelete = editor?.can().deleteTable() ?? false;

  const actions = [
    {
      content: 'Insert a 2x2 table',
      onAction: () => handleAction('insert'),
    },
    {
      content: 'Insert row below',
      onAction: () => handleAction('addRow'),
      disabled: !canAddRow,
    },
    {
      content: 'Insert column to the right',
      onAction: () => handleAction('addCol'),
      disabled: !canAddCol,
    },
    {
      content: 'Delete a table',
      destructive: true,
      onAction: () => handleAction('delete'),
      disabled: !canDelete,
    },
  ];

  return (
    <Popover
      active={active}
      activator={
        <Button
          disabled={disabled}
          variant="tertiary"
          icon={<Icon source={DataTableIcon} />}
          onClick={toggleActive}
          size="slim"
        />
      }
      onClose={handleClose}
    >
      <ActionList items={actions} />
    </Popover>
  );
}
