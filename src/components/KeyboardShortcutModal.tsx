import React from 'react';
import {
  KeyboardShortcutHelpModal,
  type KeyboardShortcutHelpModalProps,
} from './KeyboardShortcutHelpModal';

export type KeyboardShortcutModalProps = KeyboardShortcutHelpModalProps;

export const KeyboardShortcutModal: React.FC<KeyboardShortcutModalProps> = (props) => {
  return <KeyboardShortcutHelpModal {...props} />;
};

export default KeyboardShortcutModal;
