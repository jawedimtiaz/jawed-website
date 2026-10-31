import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardShortcutHelpModal,
  type KeyboardShortcutHelpModalProps,
} from './KeyboardShortcutHelpModal';

export type KeyboardShortcutModalProps = KeyboardShortcutHelpModalProps;

const SR_ONLY_LIVE_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export const KeyboardShortcutModal: React.FC<KeyboardShortcutModalProps> = (props) => {
  const { isOpen, shortcuts } = props;
  const [modalStateAnnouncement, setModalStateAnnouncement] = useState('');
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setModalStateAnnouncement(
        `Keyboard Shortcuts modal opened. ${shortcuts.length} shortcuts available. Focus moved to filter input; press Tab to navigate within modal or Escape to close.`
      );
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      setModalStateAnnouncement('Keyboard Shortcuts modal closed. Focus restored.');
    }
  }, [isOpen, shortcuts.length]);

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={SR_ONLY_LIVE_STYLE}
      >
        {modalStateAnnouncement}
      </div>
      <KeyboardShortcutHelpModal {...props} />
    </>
  );
};

export default KeyboardShortcutModal;

