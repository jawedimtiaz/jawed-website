import { RackElevationDiagram } from './RackElevationDiagram';
import { PinoutDiagram } from './PinoutDiagram';
import { LedStatusMatrix } from './LedStatusMatrix';
import { DosAndDontsCard } from './DosAndDontsCard';
import { CopyableCodeBlock } from './CopyableCodeBlock';
import { CalloutBlock } from './CalloutBlock';
import { InteractiveChecklist } from './InteractiveChecklist';
import { WorkflowDiagram } from './WorkflowDiagram';

// Export primary component names
export {
  RackElevationDiagram,
  PinoutDiagram,
  LedStatusMatrix,
  DosAndDontsCard,
  CopyableCodeBlock,
  CalloutBlock,
  InteractiveChecklist,
  WorkflowDiagram
};

// Export exact requested aliases for developer ergonomics and route template imports
export { RackElevationDiagram as InteractiveServerRackElevation };
export { PinoutDiagram as ColorCodedRJ45Pinout };
export { LedStatusMatrix as PowerEdgeProLiantLedMatrix };
export { DosAndDontsCard as DoAndDontCard };
export { CopyableCodeBlock as CopyableCliBlock };
