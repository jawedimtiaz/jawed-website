import React from 'react';
import {
  KeyboardShortcutModal,
  type KeyboardShortcutModalProps,
} from './KeyboardShortcutModal';

export type KeyboardShortcutHelpModalProps = KeyboardShortcutModalProps;

export const KeyboardShortcutHelpModal: React.FC<KeyboardShortcutHelpModalProps> = (props) => {
  return <KeyboardShortcutModal {...props} />;
};

export default KeyboardShortcutHelpModal;

