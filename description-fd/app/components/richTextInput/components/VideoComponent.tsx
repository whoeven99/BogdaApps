import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Modal, TextField } from '@shopify/polaris';

interface VideoComponentProps {
  onInsert: (url: string) => void;
}

const VideoComponent = forwardRef(({ onInsert }: VideoComponentProps, ref) => {
  const [active, setActive] = useState(false); // Polaris用active控制显示
  const [videoUrl, setVideoUrl] = useState('');

  const openModal = () => {
    setVideoUrl('');
    setActive(true);
  };

  const handleClose = () => {
    setActive(false);
  };

  const handleOk = () => {
    if (videoUrl.trim()) {
      onInsert(videoUrl.trim());
      setActive(false);
    }
  };

  useImperativeHandle(ref, () => ({
    openModal,
  }));

  return (
    <Modal
      open={active} // Polaris 用 open 控制显示
      onClose={handleClose}
      title="insert video"
      primaryAction={{
        content: 'confirm',
        onAction: handleOk,
      }}
      secondaryActions={[
        {
          content: 'cancel',
          onAction: handleClose,
        },
      ]}
    >
      <Modal.Section>
        <TextField
          label="video link"
          placeholder="Please enter the iframe video link"
          value={videoUrl}
          onChange={(value) => setVideoUrl(value)}
          autoComplete="off"
        />
      </Modal.Section>
    </Modal>
  );
});

export default VideoComponent;
