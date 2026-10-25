import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import {
  Copy,
  Check,
  Edit3,
  Trash2,
  Sparkles,
  BookOpen,
  Building2,
  Briefcase,
  Award,
  CheckCircle2,
  HelpCircle,
  X,
  Target,
  Plus,
  Printer,
  GripVertical,
  Columns,
  List,
  Search,
  Eye,
  ExternalLink,
  FileText,
  Link2,
  Paperclip,
  Mic,
  MicOff,
  FileSpreadsheet,
  Download,
  Archive,
  ArchiveRestore,
  RotateCcw,
  FolderArchive,
  Lock,
  Unlock,
  GitFork,
  AlertTriangle,
  Repeat,
  RefreshCw,
  Tag,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export type StoryStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type RepeatFrequency = 'None' | 'Daily' | 'Weekly' | 'Monthly';

export const DEFAULT_CATEGORIES = [
  'Technical',
  'System Design',
  'Behavioral',
  'HR / General',
  'Coding / Algorithms',
  'Leadership',
  'Project Deep Dive'
] as const;

export interface TaskLink {
  id: string;
  title: string;
  url: string;
}

export interface TaskFileRef {
  id: string;
  name: string;
  fileType: string;
  notes?: string;
}

interface StarStory {
  id: number;
  theme: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  status: StoryStatus;
  priority?: TaskPriority;
  repeatFrequency?: RepeatFrequency;
  categoryLabel?: string;
  notes?: string;
  links?: TaskLink[];
  fileRefs?: TaskFileRef[];
  isArchived?: boolean;
  blockedByTaskIds?: number[];
}

export const getCategoryStyle = (categoryLabel: string = 'Behavioral') => {
  const norm = (categoryLabel || 'Behavioral').trim().toLowerCase();
  if (norm.includes('tech') || norm.includes('dev') || norm.includes('sysadmin') || norm.includes('net')) {
    return {
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.4)',
      color: '#38bdf8',
      icon: '💻',
      label: categoryLabel || 'Technical'
    };
  }
  if (norm.includes('system') || norm.includes('design') || norm.includes('arch') || norm.includes('cloud')) {
    return {
      bg: 'rgba(168, 85, 247, 0.15)',
      border: 'rgba(168, 85, 247, 0.4)',
      color: '#c084fc',
      icon: '🏛️',
      label: categoryLabel || 'System Design'
    };
  }
  if (norm.includes('behav') || norm.includes('star') || norm.includes('situation') || norm.includes('crisis')) {
    return {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      color: '#fbbf24',
      icon: '💬',
      label: categoryLabel || 'Behavioral'
    };
  }
  if (norm.includes('hr') || norm.includes('culture') || norm.includes('people') || norm.includes('general')) {
    return {
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.4)',
      color: '#34d399',
      icon: '🤝',
      label: categoryLabel || 'HR / General'
    };
  }
  if (norm.includes('code') || norm.includes('algo') || norm.includes('script') || norm.includes('program')) {
    return {
      bg: 'rgba(244, 63, 94, 0.15)',
      border: 'rgba(244, 63, 94, 0.4)',
      color: '#fb7185',
      icon: '⚡',
      label: categoryLabel || 'Coding / Algorithms'
    };
  }
  if (norm.includes('lead') || norm.includes('manage') || norm.includes('executive') || norm.includes('team')) {
    return {
      bg: 'rgba(234, 179, 8, 0.15)',
      border: 'rgba(234, 179, 8, 0.4)',
      color: '#facc15',
      icon: '👑',
      label: categoryLabel || 'Leadership'
    };
  }
  if (norm.includes('project') || norm.includes('deep') || norm.includes('case') || norm.includes('incident')) {
    return {
      bg: 'rgba(20, 184, 166, 0.15)',
      border: 'rgba(20, 184, 166, 0.4)',
      color: '#2dd4bf',
      icon: '🚀',
      label: categoryLabel || 'Project Deep Dive'
    };
  }

  return {
    bg: 'rgba(129, 140, 248, 0.15)',
    border: 'rgba(129, 140, 248, 0.4)',
    color: '#a5b4fc',
    icon: '🏷️',
    label: categoryLabel || 'Custom'
  };
};

const SAMPLE_STORIES: StarStory[] = [
  {
    id: 1,
    theme: 'High Severity Incident / Crisis Management',
    situation: 'Main office core switch failed during month-end payroll execution, threatening payroll processing for 120 employees and critical transaction cutoffs.',
    task: 'Take immediate operational command, isolate root packet collision, reroute critical traffic trunks, and safeguard transaction deadlines.',
    action: 'Isolated primary core loop, rerouted traffic through backup redundant trunk, and coordinated with network vendor for hot-swap chassis replacement within SLA.',
    result: 'Restored vital payroll subnet within 14 minutes; zero transaction delays; implemented daily automated VRRP failover health checks.',
    status: 'Done',
    priority: 'High',
    repeatFrequency: 'Weekly',
    categoryLabel: 'Technical',
    notes: 'Key Talking Point: Emphasize speed of isolation (14 minutes) and zero payroll cut-off delays. Be ready to explain packet collision mechanics and VRRP failover quorum.',
    links: [
      { id: 'l1', title: 'Network Outage Postmortem Doc', url: 'https://notion.so/network-incident-postmortem-2026' },
      { id: 'l2', title: 'Core Switch Topology Diagram', url: 'https://lucid.app/lucidchart/core-switch-vlan-architecture' }
    ],
    fileRefs: [
      { id: 'f1', name: 'VRRP_Failover_HealthCheck.sh', fileType: 'Shell Script', notes: 'Automated VRRP health check script deployed to backup chassis' },
      { id: 'f2', name: 'Incident_Timeline_Log.pdf', fileType: 'PDF Document', notes: 'Detailed minute-by-minute incident timeline log' }
    ],
    blockedByTaskIds: []
  },
  {
    id: 2,
    theme: 'Automation & Zero-Touch Fleet Provisioning',
    situation: 'Manual imaging and configuration of new hire engineer laptops took 4.5 hours per machine, creating a 3-week onboarding backlog across 45 remote engineers.',
    task: 'Design an automated, zero-touch provisioning pipeline that deploys secure, pre-configured laptops directly from manufacturer to employee.',
    action: 'Integrated Apple Business Manager with Jamf Pro and Okta SSO. Wrote modular bash/zsh post-enrollment scripts to automatically install developer toolchains, CrowdStrike Falcon, and network profiles.',
    result: 'Reduced provisioning time from 4.5 hours to 18 minutes per device with 99.4% zero-touch success rate, cutting IT onboarding backlog to zero.',
    status: 'In Progress',
    priority: 'Medium',
    repeatFrequency: 'Daily',
    categoryLabel: 'System Design',
    notes: 'Emphasize cross-functional coordination between Mac SysAdmins, Security (CrowdStrike), and Okta IDP team.',
    links: [
      { id: 'l3', title: 'Jamf Pro Zero-Touch Workflow', url: 'https://jamf.com/docs/zero-touch-apple-business-manager' }
    ],
    fileRefs: [
      { id: 'f3', name: 'PostEnrollment_Bootstrap.zsh', fileType: 'Shell Script', notes: 'Modular post-enrollment installer script' }
    ],
    blockedByTaskIds: [1]
  },
  {
    id: 3,
    theme: 'Zero-Trust Identity Federation & IAM Migration',
    situation: 'Legacy Active Directory domain controller lacked MFA for cloud infrastructure admin consoles, violating enterprise compliance mandates.',
    task: 'Architect Okta Adaptive MFA with conditional access policies and SAML/OIDC SSO across AWS accounts and internal Kubernetes clusters.',
    action: 'Enforced FIDO2 WebAuthn keys for root admins, migrated 24 legacy service accounts to short-lived STS tokens, and automated user provisioning via SCIM API.',
    result: 'Achieved 100% SOC2 / ISO27001 compliance; eliminated static API credentials; reduced password reset tickets by 82%.',
    status: 'To Do',
    priority: 'High',
    repeatFrequency: 'Monthly',
    categoryLabel: 'Behavioral',
    notes: 'Prerequisite dependency: Requires Zero-Touch Fleet Provisioning completion to distribute WebAuthn hardware keys to engineers.',
    links: [
      { id: 'l4', title: 'Okta SSO Architectural Spec', url: 'https://okta.com/docs/zero-trust-iam-spec' }
    ],
    fileRefs: [
      { id: 'f4', name: 'SCIM_Provisioning_Policy.json', fileType: 'PDF Document', notes: 'Automated SCIM group mapping definition' }
    ],
    blockedByTaskIds: [2]
  }
];

const getPriorityWeight = (priority?: TaskPriority): number => {
  if (priority === 'High') return 3;
  if (priority === 'Low') return 1;
  return 2;
};

const getPriorityStyle = (priority: TaskPriority = 'Medium') => {
  switch (priority) {
    case 'High':
      return {
        bg: 'rgba(244, 63, 94, 0.15)',
        border: 'rgba(244, 63, 94, 0.4)',
        color: '#f43f5e',
        label: '🔥 High',
      };
    case 'Medium':
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        color: '#f59e0b',
        label: '⚡ Medium',
      };
    case 'Low':
      return {
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.4)',
        color: '#38bdf8',
        label: '🔹 Low',
      };
  }
};

// Dependency Utility Helpers
const getPendingBlockers = (story: StarStory, allStories: StarStory[]): StarStory[] => {
  if (!story.blockedByTaskIds || story.blockedByTaskIds.length === 0) return [];
  return story.blockedByTaskIds
    .map(id => allStories.find(s => s.id === id))
    .filter((s): s is StarStory => !!s && s.status !== 'Done');
};

const getAllBlockers = (story: StarStory, allStories: StarStory[]): StarStory[] => {
  if (!story.blockedByTaskIds || story.blockedByTaskIds.length === 0) return [];
  return story.blockedByTaskIds
    .map(id => allStories.find(s => s.id === id))
    .filter((s): s is StarStory => !!s);
};

const getDependentTasks = (storyId: number, allStories: StarStory[]): StarStory[] => {
  return allStories.filter(s => s.blockedByTaskIds?.includes(storyId));
};

const getPriorityClassNames = (priority: TaskPriority = 'Medium', isBlocked: boolean = false): string => {
  const pClass = priority === 'High' ? 'task-priority-high' : priority === 'Low' ? 'task-priority-low' : 'task-priority-medium';
  return isBlocked ? `${pClass} task-is-blocked` : pClass;
};

export const InterviewPreparationPlanner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'vault' | 'archive' | 'questions' | 'guide'>('builder');

  const [roleTitle, setRoleTitle] = useState(() => {
    return localStorage.getItem('ipp_role') || 'Senior IT Support Specialist';
  });
  const [targetCompany, setTargetCompany] = useState(() => {
    return localStorage.getItem('ipp_company') || 'Fintech Enterprise / Cloud Infrastructure';
  });

  const [starStories, setStarStories] = useState<StarStory[]>(() => {
    try {
      const saved = localStorage.getItem('ipp_stories');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          status: s.status || 'To Do',
          priority: s.priority || 'Medium',
          repeatFrequency: s.repeatFrequency || 'None',
          categoryLabel: s.categoryLabel || 'Technical',
          isArchived: !!s.isArchived,
          blockedByTaskIds: Array.isArray(s.blockedByTaskIds) ? s.blockedByTaskIds : []
        }));
      }
    } catch {
      // fallback
    }
    return SAMPLE_STORIES;
  });

  const activeStories = useMemo(() => starStories.filter(s => !s.isArchived), [starStories]);
  const archivedStories = useMemo(() => starStories.filter(s => s.isArchived), [starStories]);

  // Individual Form Field States with LocalStorage Auto-Save
  const [storyTheme, setStoryTheme] = useState(() => {
    return localStorage.getItem('ipp_draft_theme') || '';
  });
  const [situation, setSituation] = useState(() => {
    return localStorage.getItem('ipp_draft_situation') || '';
  });
  const [task, setTask] = useState(() => {
    return localStorage.getItem('ipp_draft_task') || '';
  });
  const [action, setAction] = useState(() => {
    return localStorage.getItem('ipp_draft_action') || '';
  });
  const [result, setResult] = useState(() => {
    return localStorage.getItem('ipp_draft_result') || '';
  });
  const [storyStatus, setStoryStatus] = useState<StoryStatus>(() => {
    return (localStorage.getItem('ipp_draft_status') as StoryStatus) || 'To Do';
  });
  const [storyPriority, setStoryPriority] = useState<TaskPriority>(() => {
    return (localStorage.getItem('ipp_draft_priority') as TaskPriority) || 'Medium';
  });
  const [storyRepeat, setStoryRepeat] = useState<RepeatFrequency>(() => {
    return (localStorage.getItem('ipp_draft_repeat') as RepeatFrequency) || 'None';
  });
  const [storyCategory, setStoryCategory] = useState<string>(() => {
    return localStorage.getItem('ipp_draft_category') || 'Technical';
  });
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<number | null>(() => {
    const saved = localStorage.getItem('ipp_draft_editing_id');
    return saved ? Number(saved) : null;
  });

  // Vault Search, Filter, Sort, and Grouping States
  const [searchVault, setSearchVault] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | StoryStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | string>('All');
  const [prioritySort, setPrioritySort] = useState<'none' | 'high-to-low' | 'low-to-high'>('none');

  // Vault View Mode (Kanban Board vs Detailed List) & Group By Mode ('status' vs 'category')
  const [vaultViewMode, setVaultViewMode] = useState<'board' | 'list'>(() => {
    return (localStorage.getItem('ipp_vault_view_mode') as 'board' | 'list') || 'board';
  });
  const [groupByMode, setGroupByMode] = useState<'status' | 'category'>(() => {
    return (localStorage.getItem('ipp_group_by_mode') as 'status' | 'category') || 'status';
  });
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<{ [key: string]: boolean }>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  const [draggedStoryId, setDraggedStoryId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<StoryStatus | null>(null);
  const [dragOverSwimlane, setDragOverSwimlane] = useState<{ category: string; status: StoryStatus } | null>(null);

  // Task Detail Modal State & Input Handlers
  const [modalStory, setModalStory] = useState<StarStory | null>(null);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('Shell Script');
  const [newFileNotes, setNewFileNotes] = useState('');

  // Web Speech API Voice Dictation State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      showToast('Voice dictation stopped.');
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      showToast('Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Microphone active — start dictating your interview notes now...');
      };

      recognition.onresult = (event: any) => {
        let transcriptChunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcriptChunk += event.results[i][0].transcript;
          }
        }

        if (transcriptChunk.trim() && modalStory) {
          const currentNotes = modalStory.notes || '';
          const updatedNotes = currentNotes
            ? `${currentNotes.trim()} ${transcriptChunk.trim()}`
            : transcriptChunk.trim();
          handleSaveModalNotes(updatedNotes);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Web Speech API error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          showToast(`Voice dictation note: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setIsListening(false);
      showToast('Could not activate microphone.');
    }
  };

  const handleSaveModalNotes = (notesText: string) => {
    if (!modalStory) return;
    const updatedStory = { ...modalStory, notes: notesText };
    setModalStory(updatedStory);
    setStarStories(prev => {
      const updated = prev.map(s => s.id === modalStory.id ? updatedStory : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim() || !modalStory) {
      showToast('Please enter a URL.');
      return;
    }
    const rawUrl = newLinkUrl.trim();
    const formattedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const link: TaskLink = {
      id: String(Date.now()),
      title: newLinkTitle.trim() || rawUrl,
      url: formattedUrl
    };
    const updatedStory = {
      ...modalStory,
      links: [...(modalStory.links || []), link]
    };
    setModalStory(updatedStory);
    setStarStories(prev => {
      const updated = prev.map(s => s.id === modalStory.id ? updatedStory : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    setNewLinkTitle('');
    setNewLinkUrl('');
    showToast('Link added to task!');
  };

  const handleRemoveLink = (linkId: string) => {
    if (!modalStory) return;
    const updatedStory = {
      ...modalStory,
      links: (modalStory.links || []).filter(l => l.id !== linkId)
    };
    setModalStory(updatedStory);
    setStarStories(prev => {
      const updated = prev.map(s => s.id === modalStory.id ? updatedStory : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    showToast('Link removed.');
  };

  const handleAddFileRef = () => {
    if (!newFileName.trim() || !modalStory) {
      showToast('Please enter a file name.');
      return;
    }
    const fileRef: TaskFileRef = {
      id: String(Date.now()),
      name: newFileName.trim(),
      fileType: newFileType.trim() || 'Document',
      notes: newFileNotes.trim()
    };
    const updatedStory = {
      ...modalStory,
      fileRefs: [...(modalStory.fileRefs || []), fileRef]
    };
    setModalStory(updatedStory);
    setStarStories(prev => {
      const updated = prev.map(s => s.id === modalStory.id ? updatedStory : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    setNewFileName('');
    setNewFileType('Shell Script');
    setNewFileNotes('');
    showToast('File reference added!');
  };

  const handleRemoveFileRef = (fileId: string) => {
    if (!modalStory) return;
    const updatedStory = {
      ...modalStory,
      fileRefs: (modalStory.fileRefs || []).filter(f => f.id !== fileId)
    };
    setModalStory(updatedStory);
    setStarStories(prev => {
      const updated = prev.map(s => s.id === modalStory.id ? updatedStory : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    showToast('File reference removed.');
  };

  const handleAddBlocker = (targetStoryId: number, blockerStoryId: number) => {
    if (targetStoryId === blockerStoryId) return;
    setStarStories(prev => {
      const updated = prev.map(s => {
        if (s.id === targetStoryId) {
          const current = s.blockedByTaskIds || [];
          if (current.includes(blockerStoryId)) return s;
          return { ...s, blockedByTaskIds: [...current, blockerStoryId] };
        }
        return s;
      });
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });

    if (modalStory && modalStory.id === targetStoryId) {
      setModalStory(prev => {
        if (!prev) return null;
        const current = prev.blockedByTaskIds || [];
        if (current.includes(blockerStoryId)) return prev;
        return { ...prev, blockedByTaskIds: [...current, blockerStoryId] };
      });
    }
    showToast('Prerequisite task linked!');
  };

  const handleRemoveBlocker = (targetStoryId: number, blockerStoryId: number) => {
    setStarStories(prev => {
      const updated = prev.map(s => {
        if (s.id === targetStoryId) {
          return {
            ...s,
            blockedByTaskIds: (s.blockedByTaskIds || []).filter(id => id !== blockerStoryId)
          };
        }
        return s;
      });
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });

    if (modalStory && modalStory.id === targetStoryId) {
      setModalStory(prev => {
        if (!prev) return null;
        return {
          ...prev,
          blockedByTaskIds: (prev.blockedByTaskIds || []).filter(id => id !== blockerStoryId)
        };
      });
    }
    showToast('Blocker link removed.');
  };

  useEffect(() => {
    localStorage.setItem('ipp_vault_view_mode', vaultViewMode);
  }, [vaultViewMode]);

  useEffect(() => {
    localStorage.setItem('ipp_group_by_mode', groupByMode);
  }, [groupByMode]);

  useEffect(() => {
    localStorage.setItem('ipp_draft_category', storyCategory);
  }, [storyCategory]);

  const handleDragStart = (e: React.DragEvent, storyId: number) => {
    e.dataTransfer.setData('text/plain', String(storyId));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedStoryId(storyId);
  };

  const handleDragEnd = () => {
    setDraggedStoryId(null);
    setDragOverColumn(null);
    setDragOverSwimlane(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, status: StoryStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragOverSwimlane = (e: React.DragEvent, category: string, status: StoryStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverSwimlane || dragOverSwimlane.category !== category || dragOverSwimlane.status !== status) {
      setDragOverSwimlane({ category, status });
    }
  };

  const handleDragLeaveColumn = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const applyStatusUpdate = (prevStories: StarStory[], storyId: number, newStatus: StoryStatus) => {
    const targetStory = prevStories.find(s => s.id === storyId);
    if (!targetStory) return { updatedStories: prevStories, createdRepeatStory: null, targetStory: null };

    if (targetStory.status === newStatus) {
      return { updatedStories: prevStories, createdRepeatStory: null, targetStory };
    }

    let updatedStories = prevStories.map(s => s.id === storyId ? { ...s, status: newStatus } : s);
    let createdRepeatStory: StarStory | null = null;

    if (newStatus === 'Done' && targetStory.repeatFrequency && targetStory.repeatFrequency !== 'None') {
      createdRepeatStory = {
        ...targetStory,
        id: Date.now(),
        status: 'To Do',
        links: (targetStory.links || []).map(l => ({ ...l, id: String(Date.now() + Math.random()) })),
        fileRefs: (targetStory.fileRefs || []).map(f => ({ ...f, id: String(Date.now() + Math.random()) })),
        blockedByTaskIds: []
      };
      updatedStories = [createdRepeatStory, ...updatedStories];
    }

    return { updatedStories, createdRepeatStory, targetStory };
  };

  const handleDropToColumn = (e: React.DragEvent, targetStatus: StoryStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const storyIdStr = e.dataTransfer.getData('text/plain');
    const storyId = Number(storyIdStr);
    if (!storyId || isNaN(storyId)) {
      setDraggedStoryId(null);
      return;
    }

    setStarStories(prev => {
      const { updatedStories, createdRepeatStory, targetStory } = applyStatusUpdate(prev, storyId, targetStatus);
      if (targetStory) {
        let repeatNote = '';
        if (createdRepeatStory) {
          repeatNote = ` — New ${targetStory.repeatFrequency} review task created in To Do!`;
        }
        showToast(`Moved "${targetStory.theme}" to ${targetStatus}${repeatNote}`);
      }
      localStorage.setItem('ipp_stories', JSON.stringify(updatedStories));
      return updatedStories;
    });
    setDraggedStoryId(null);
  };

  const handleDropToSwimlane = (e: React.DragEvent, targetCategory: string, targetStatus: StoryStatus) => {
    e.preventDefault();
    setDragOverSwimlane(null);
    const storyIdStr = e.dataTransfer.getData('text/plain');
    const storyId = Number(storyIdStr);
    if (!storyId || isNaN(storyId)) {
      setDraggedStoryId(null);
      return;
    }

    setStarStories(prev => {
      const { updatedStories, createdRepeatStory, targetStory } = applyStatusUpdate(prev, storyId, targetStatus);
      const finalStories = updatedStories.map(s => s.id === storyId ? { ...s, categoryLabel: targetCategory } : s);
      if (targetStory) {
        let repeatNote = '';
        if (createdRepeatStory) {
          repeatNote = ` — New ${targetStory.repeatFrequency} review task created in To Do!`;
        }
        showToast(`Updated "${targetStory.theme}" → Category: ${targetCategory}, Status: ${targetStatus}${repeatNote}`);
      }
      localStorage.setItem('ipp_stories', JSON.stringify(finalStories));
      return finalStories;
    });
    setDraggedStoryId(null);
  };

  // UI Feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync core metadata to localStorage
  useEffect(() => {
    localStorage.setItem('ipp_role', roleTitle);
  }, [roleTitle]);

  useEffect(() => {
    localStorage.setItem('ipp_company', targetCompany);
  }, [targetCompany]);

  useEffect(() => {
    localStorage.setItem('ipp_stories', JSON.stringify(starStories));
  }, [starStories]);

  // Auto-save form draft fields to localStorage
  useEffect(() => {
    localStorage.setItem('ipp_draft_theme', storyTheme);
  }, [storyTheme]);

  useEffect(() => {
    localStorage.setItem('ipp_draft_situation', situation);
  }, [situation]);

  useEffect(() => {
    localStorage.setItem('ipp_draft_task', task);
  }, [task]);

  useEffect(() => {
    localStorage.setItem('ipp_draft_action', action);
  }, [action]);

  useEffect(() => {
    localStorage.setItem('ipp_draft_result', result);
  }, [result]);

  useEffect(() => {
    localStorage.setItem('ipp_draft_status', storyStatus);
  }, [storyStatus]);

  useEffect(() => {
    localStorage.setItem('ipp_draft_priority', storyPriority);
  }, [storyPriority]);

  useEffect(() => {
    localStorage.setItem('ipp_draft_repeat', storyRepeat);
  }, [storyRepeat]);

  useEffect(() => {
    if (editingId !== null) {
      localStorage.setItem('ipp_draft_editing_id', String(editingId));
    } else {
      localStorage.removeItem('ipp_draft_editing_id');
    }
  }, [editingId]);

  const clearDraft = () => {
    setStoryTheme('');
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
    setStoryStatus('To Do');
    setStoryPriority('Medium');
    setStoryRepeat('None');
    setStoryCategory('Technical');
    setCustomCategoryInput('');
    setIsCustomCategoryMode(false);
    setEditingId(null);
    localStorage.removeItem('ipp_draft_theme');
    localStorage.removeItem('ipp_draft_situation');
    localStorage.removeItem('ipp_draft_task');
    localStorage.removeItem('ipp_draft_action');
    localStorage.removeItem('ipp_draft_result');
    localStorage.removeItem('ipp_draft_status');
    localStorage.removeItem('ipp_draft_priority');
    localStorage.removeItem('ipp_draft_repeat');
    localStorage.removeItem('ipp_draft_category');
    localStorage.removeItem('ipp_draft_editing_id');
  };

  const handleUpdateCategory = (id: number, newCategory: string) => {
    setStarStories(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, categoryLabel: newCategory } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    if (modalStory && modalStory.id === id) {
      setModalStory(prev => prev ? { ...prev, categoryLabel: newCategory } : null);
    }
    showToast(`Category updated to "${newCategory}"`);
  };

  const handleUpdateStatus = (id: number, newStatus: StoryStatus) => {
    setStarStories(prev => {
      const { updatedStories, createdRepeatStory, targetStory } = applyStatusUpdate(prev, id, newStatus);
      if (targetStory) {
        let repeatNote = '';
        if (createdRepeatStory) {
          repeatNote = ` — New ${targetStory.repeatFrequency} review task created in To Do!`;
        }
        showToast(`Status updated to "${newStatus}"${repeatNote}`);
      }
      localStorage.setItem('ipp_stories', JSON.stringify(updatedStories));
      return updatedStories;
    });
  };

  const handleUpdatePriority = (id: number, newPriority: TaskPriority) => {
    setStarStories(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, priority: newPriority } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    showToast(`Priority updated to "${newPriority}"`);
  };

  const handleUpdateRepeatFrequency = (id: number, frequency: RepeatFrequency) => {
    setStarStories(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, repeatFrequency: frequency } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    if (modalStory && modalStory.id === id) {
      setModalStory(prev => prev ? { ...prev, repeatFrequency: frequency } : null);
    }
    showToast(frequency !== 'None' ? `Repeat schedule set to "${frequency}"` : 'Repeat schedule disabled.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const loadSampleStory = () => {
    setStoryTheme('Cross-Functional Data Migration & Zero Downtime');
    setSituation('During cloud consolidation, our customer billing database had to be migrated across AWS regions with a strict zero-downtime SLA during business hours.');
    setTask('Lead IT systems validation, engineer failover rollback scripts, and conduct pre-flight sync simulations without impacting active API requests.');
    setAction('Utilized AWS DMS with Change Data Capture (CDC). Orchestrated double-write verification in staging, wrote custom Python validation checksums, and executed the cutover during a 15-minute maintenance window.');
    setResult('100% data integrity verified; 0 seconds of unplanned downtime; saved $14,000 monthly in legacy infrastructure overhead.');
    setStoryStatus('In Progress');
    setStoryPriority('High');
    setStoryRepeat('Weekly');
    setStoryCategory('System Design');
    showToast('Sample STAR story loaded into editor!');
  };

  const handleAddStory = () => {
    if (!storyTheme.trim() && !situation.trim() && !task.trim() && !action.trim() && !result.trim()) {
      showToast('Please enter at least a theme or one STAR dimension.');
      return;
    }

    const finalCategory = isCustomCategoryMode && customCategoryInput.trim()
      ? customCategoryInput.trim()
      : storyCategory.trim() || 'Technical';

    if (editingId !== null) {
      setStarStories(prev =>
        prev.map(story =>
          story.id === editingId
            ? {
                ...story,
                theme: storyTheme.trim() || 'General Technical Achievement',
                situation: situation.trim(),
                task: task.trim(),
                action: action.trim(),
                result: result.trim(),
                status: storyStatus,
                priority: storyPriority,
                repeatFrequency: storyRepeat,
                categoryLabel: finalCategory,
              }
            : story
        )
      );
      showToast('Story updated in vault!');
    } else {
      const created: StarStory = {
        id: Date.now(),
        theme: storyTheme.trim() || 'General Technical Achievement',
        situation: situation.trim(),
        task: task.trim(),
        action: action.trim(),
        result: result.trim(),
        status: storyStatus,
        priority: storyPriority,
        repeatFrequency: storyRepeat,
        categoryLabel: finalCategory,
      };
      setStarStories(prev => [created, ...prev]);
      showToast('Story added to vault!');
    }

    clearDraft();
  };

  const handleEditStory = (story: StarStory) => {
    setEditingId(story.id);
    setStoryTheme(story.theme);
    setSituation(story.situation);
    setTask(story.task);
    setAction(story.action);
    setResult(story.result);
    setStoryStatus(story.status || 'To Do');
    setStoryPriority(story.priority || 'Medium');
    setStoryRepeat(story.repeatFrequency || 'None');
    setStoryCategory(story.categoryLabel || 'Technical');
    setCustomCategoryInput('');
    setIsCustomCategoryMode(false);
    setActiveTab('builder');

    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    clearDraft();
    showToast('Form cleared.');
  };

  const handleDeleteStory = (id: number) => {
    setStarStories(prev => prev.filter(s => s.id !== id));
    if (editingId === id) {
      handleCancelEdit();
    }
    showToast('Story removed from vault.');
  };

  const handleCopyStory = (story: StarStory) => {
    const formatted = `=== STAR STORY: ${story.theme.toUpperCase()} ===
[CATEGORY]: ${story.categoryLabel || 'Technical'}
[PRIORITY]: ${story.priority || 'Medium'}
[STATUS]: ${story.status || 'To Do'}
[SITUATION]:
${story.situation || 'N/A'}

[TASK]:
${story.task || 'N/A'}

[ACTION]:
${story.action || 'N/A'}

[RESULT]:
${story.result || 'N/A'}
`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(story.id);
    showToast('Story copied to clipboard!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const handleArchiveStory = (id: number) => {
    setStarStories(prev => {
      const story = prev.find(s => s.id === id);
      const updated = prev.map(s => s.id === id ? { ...s, isArchived: true } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      if (story) showToast(`Archived "${story.theme}"`);
      return updated;
    });
    if (modalStory && modalStory.id === id) {
      setModalStory(prev => prev ? { ...prev, isArchived: true } : null);
    }
  };

  const handleRestoreStory = (id: number) => {
    setStarStories(prev => {
      const story = prev.find(s => s.id === id);
      const updated = prev.map(s => s.id === id ? { ...s, isArchived: false } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      if (story) showToast(`Restored "${story.theme}" to active board`);
      return updated;
    });
    if (modalStory && modalStory.id === id) {
      setModalStory(prev => prev ? { ...prev, isArchived: false } : null);
    }
  };

  const handleArchiveAllDone = () => {
    const doneCount = activeStories.filter(s => s.status === 'Done').length;
    if (doneCount === 0) {
      showToast('No completed "Done" tasks to archive.');
      return;
    }
    setStarStories(prev => {
      const updated = prev.map(s => (!s.isArchived && s.status === 'Done') ? { ...s, isArchived: true } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    showToast(`Archived ${doneCount} completed task${doneCount > 1 ? 's' : ''}!`);
  };

  const handleRestoreAllArchived = () => {
    if (archivedStories.length === 0) return;
    const count = archivedStories.length;
    setStarStories(prev => {
      const updated = prev.map(s => s.isArchived ? { ...s, isArchived: false } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    showToast(`Restored all ${count} archived tasks to active board!`);
  };

  const handleToggleSelectTask = (id: number) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkMoveStatus = (newStatus: StoryStatus) => {
    if (selectedTaskIds.length === 0) return;
    setStarStories(prev => {
      const updated = prev.map(s => selectedTaskIds.includes(s.id) ? { ...s, status: newStatus } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    showToast(`Moved ${selectedTaskIds.length} tasks to ${newStatus}`);
    setSelectedTaskIds([]);
  };

  const handleBulkChangePriority = (newPriority: TaskPriority) => {
    if (selectedTaskIds.length === 0) return;
    setStarStories(prev => {
      const updated = prev.map(s => selectedTaskIds.includes(s.id) ? { ...s, priority: newPriority } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    showToast(`Updated priority of ${selectedTaskIds.length} tasks to ${newPriority}`);
    setSelectedTaskIds([]);
  };

  const handleBulkArchiveTasks = () => {
    if (selectedTaskIds.length === 0) return;
    setStarStories(prev => {
      const updated = prev.map(s => selectedTaskIds.includes(s.id) ? { ...s, isArchived: true } : s);
      localStorage.setItem('ipp_stories', JSON.stringify(updated));
      return updated;
    });
    showToast(`Archived ${selectedTaskIds.length} tasks`);
    setSelectedTaskIds([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const escapeCsvField = (field: string | undefined): string => {
    if (!field) return '""';
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const handleDownloadCsv = () => {
    if (starStories.length === 0) {
      showToast('No stories in vault to export.');
      return;
    }

    const headers = [
      'ID',
      'Theme / Competency',
      'Category Label',
      'Priority',
      'Status',
      'Prerequisites / Blockers',
      'Situation',
      'Task',
      'Action',
      'Result',
      'Prep Notes',
      'Resource Links',
      'File References'
    ];

    const rows = starStories.map(story => {
      const linksStr = (story.links || []).map(l => `${l.title}: ${l.url}`).join(' | ');
      const fileRefsStr = (story.fileRefs || []).map(f => `${f.name} [${f.fileType}]${f.notes ? ' - ' + f.notes : ''}`).join(' | ');
      const blockersStr = getAllBlockers(story, starStories).map(b => `${b.theme} [${b.status}]`).join(' | ');

      return [
        story.id,
        escapeCsvField(story.theme),
        escapeCsvField(story.categoryLabel || 'Technical'),
        escapeCsvField(story.priority || 'Medium'),
        escapeCsvField(story.status || 'To Do'),
        escapeCsvField(blockersStr),
        escapeCsvField(story.situation),
        escapeCsvField(story.task),
        escapeCsvField(story.action),
        escapeCsvField(story.result),
        escapeCsvField(story.notes),
        escapeCsvField(linksStr),
        escapeCsvField(fileRefsStr)
      ].join(',');
    });

    const csvData = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sanitizedRole = roleTitle.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'interview_prep';
    link.setAttribute('href', url);
    link.setAttribute('download', `${sanitizedRole}_star_stories_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('CSV file downloaded successfully!');
  };

  const statusCounts = useMemo(() => {
    const counts = { 'All': activeStories.length, 'To Do': 0, 'In Progress': 0, 'Done': 0 };
    activeStories.forEach(s => {
      const st = s.status || 'To Do';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [activeStories]);

  const allAvailableCategories = useMemo(() => {
    const categoriesSet = new Set<string>([...DEFAULT_CATEGORIES]);
    activeStories.forEach(s => {
      if (s.categoryLabel && s.categoryLabel.trim()) {
        categoriesSet.add(s.categoryLabel.trim());
      }
    });
    return Array.from(categoriesSet);
  }, [activeStories]);

  const summaryStats = useMemo(() => {
    const total = activeStories.length;
    if (total === 0) {
      return {
        total: 0,
        todoCount: 0,
        inProgressCount: 0,
        doneCount: 0,
        todoPct: 0,
        inProgressPct: 0,
        donePct: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        highPct: 0,
        mediumPct: 0,
        lowPct: 0,
        overallReadiness: 0,
      };
    }

    let todoCount = 0;
    let inProgressCount = 0;
    let doneCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    activeStories.forEach(s => {
      const st = s.status || 'To Do';
      if (st === 'Done') doneCount++;
      else if (st === 'In Progress') inProgressCount++;
      else todoCount++;

      const p = s.priority || 'Medium';
      if (p === 'High') highCount++;
      else if (p === 'Low') lowCount++;
      else mediumCount++;
    });

    const todoPct = Math.round((todoCount / total) * 100);
    const inProgressPct = Math.round((inProgressCount / total) * 100);
    const donePct = Math.round((doneCount / total) * 100);

    const highPct = Math.round((highCount / total) * 100);
    const mediumPct = Math.round((mediumCount / total) * 100);
    const lowPct = Math.round((lowCount / total) * 100);

    const overallReadiness = Math.round(((doneCount * 1.0 + inProgressCount * 0.5) / total) * 100);

    return {
      total,
      todoCount,
      inProgressCount,
      doneCount,
      todoPct,
      inProgressPct,
      donePct,
      highCount,
      mediumCount,
      lowCount,
      highPct,
      mediumPct,
      lowPct,
      overallReadiness,
    };
  }, [activeStories]);

  const filteredVault = activeStories.filter(story => {
    const q = searchVault.trim().toLowerCase();
    const matchesSearch = !q || (
      story.theme.toLowerCase().includes(q) ||
      story.situation.toLowerCase().includes(q) ||
      story.task.toLowerCase().includes(q) ||
      story.action.toLowerCase().includes(q) ||
      story.result.toLowerCase().includes(q) ||
      (story.categoryLabel || 'Technical').toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'All' || (story.status || 'To Do') === statusFilter;
    const matchesCategory = categoryFilter === 'All' || (story.categoryLabel || 'Technical') === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const sortedVault = useMemo(() => {
    if (prioritySort === 'none') return filteredVault;
    return [...filteredVault].sort((a, b) => {
      const wA = getPriorityWeight(a.priority);
      const wB = getPriorityWeight(b.priority);
      return prioritySort === 'high-to-low' ? wB - wA : wA - wB;
    });
  }, [filteredVault, prioritySort]);

  return (
    <main className="container page interview-planner-root">
      {/* Top Navigation & Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'Interview Preparation Planner' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="Interview Preparation Planner"
          text="Structure high-impact behavioral answers with the 4-part STAR methodology."
        />
      </div>

      {/* Header Tool Top Navigation Bar (matching CareerMatchResumeReview) */}
      <div className="tool-top">
        <div className="logo flex items-center gap-2">
          <Target className="w-5 h-5 text-sky-400" />
          <span>Interview Preparation Planner</span>
        </div>
        <nav className="tool-nav" role="tablist">
          <button
            type="button"
            className={activeTab === 'builder' ? 'on' : ''}
            onClick={() => setActiveTab('builder')}
          >
            {editingId !== null ? '✏️ Editing Story' : '📝 STAR Builder'}
          </button>
          <button
            type="button"
            className={activeTab === 'vault' ? 'on' : ''}
            onClick={() => setActiveTab('vault')}
          >
            🏆 Saved Vault ({activeStories.length})
          </button>
          <button
            type="button"
            className={activeTab === 'archive' ? 'on' : ''}
            onClick={() => setActiveTab('archive')}
          >
            📁 Archive ({archivedStories.length})
          </button>
          <button
            type="button"
            className={activeTab === 'questions' ? 'on' : ''}
            onClick={() => setActiveTab('questions')}
          >
            ❓ Reverse Questions
          </button>
          <button
            type="button"
            className={activeTab === 'guide' ? 'on' : ''}
            onClick={() => setActiveTab('guide')}
          >
            📖 STAR Guide
          </button>
        </nav>
      </div>

      {toastMessage && (
        <div className="notice" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--text-heading)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: STAR STORY BUILDER */}
      {activeTab === 'builder' && (
        <div>
          <div className="tool-hero">
            <h1>Structure High-Impact Behavioral Answers</h1>
            <p className="lead">
              Use the 4-part STAR methodology (Situation, Task, Action, Result) to craft metric-driven responses for technical, system administration, and engineering interviews.
            </p>
          </div>

          <div className="notice" role="note">
            <strong>Privacy &amp; Local Storage Note:</strong> Target roles and STAR stories are saved exclusively in your browser&apos;s local storage. Zero information is transmitted to external servers.
          </div>

          {/* Target Context Panel */}
          <div className="panel" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-heading)' }}>
              🎯 Target Context &amp; Application Goal
            </h3>
            <div className="grid2" style={{ marginTop: 0 }}>
              <div>
                <label htmlFor="target-role-title">Target Role Title</label>
                <input
                  id="target-role-title"
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior IT Support Specialist / Systems Administrator"
                />
              </div>
              <div>
                <label htmlFor="target-company">Target Company / Industry</label>
                <input
                  id="target-company"
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Fintech Enterprise / Cloud Infrastructure"
                />
              </div>
            </div>
          </div>

          {/* STAR Builder Form Panel */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles className="w-5 h-5 text-sky-400" />
                {editingId !== null ? 'Edit STAR Story' : 'Craft New STAR Story'}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="meta" style={{ fontSize: '0.78rem', color: 'var(--emerald)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                  ✓ Draft auto-saved
                </span>
                {editingId !== null && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleCancelEdit}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    Cancel Edit
                  </button>
                )}
                {(storyTheme || situation || task || action || result) && editingId === null && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={clearDraft}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    Clear Form
                  </button>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={loadSampleStory}
                  style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Load Sample Story
                </button>
              </div>
            </div>

            {/* Theme, Category Label, Priority Level, Preparation Status & Repeat Schedule Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3" style={{ marginBottom: '20px', marginTop: 0 }}>
              <div>
                <label htmlFor="story-theme">Theme / Answer Title</label>
                <input
                  id="story-theme"
                  type="text"
                  value={storyTheme}
                  onChange={(e) => setStoryTheme(e.target.value)}
                  placeholder="e.g. High-Severity Outage, Automation"
                />
              </div>
              <div>
                <label htmlFor="story-category">Category / Domain Tag</label>
                {!isCustomCategoryMode ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select
                      id="story-category"
                      value={storyCategory}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategoryMode(true);
                        } else {
                          setStoryCategory(e.target.value);
                        }
                      }}
                      style={{ flex: 1 }}
                    >
                      {DEFAULT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {getCategoryStyle(cat).icon} {cat}
                        </option>
                      ))}
                      <option value="__custom__">✏️ + Custom Tag...</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="e.g. Security, DevOps"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setIsCustomCategoryMode(false)}
                      style={{ padding: '0 8px', fontSize: '0.75rem', flexShrink: 0 }}
                      title="Back to standard preset categories"
                    >
                      Presets
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="story-priority">Task Priority Level</label>
                <select
                  id="story-priority"
                  value={storyPriority}
                  onChange={(e) => setStoryPriority(e.target.value as TaskPriority)}
                >
                  <option value="High">🔥 High Priority</option>
                  <option value="Medium">⚡ Medium Priority</option>
                  <option value="Low">🔹 Low Priority</option>
                </select>
              </div>
              <div>
                <label htmlFor="story-status">Preparation Status</label>
                <select
                  id="story-status"
                  value={storyStatus}
                  onChange={(e) => setStoryStatus(e.target.value as StoryStatus)}
                >
                  <option value="To Do">⏳ To Do (Drafting)</option>
                  <option value="In Progress">🔄 In Progress (Practicing)</option>
                  <option value="Done">✅ Done (Mastered)</option>
                </select>
              </div>
              <div>
                <label htmlFor="story-repeat">Repeat Schedule</label>
                <select
                  id="story-repeat"
                  value={storyRepeat}
                  onChange={(e) => setStoryRepeat(e.target.value as RepeatFrequency)}
                >
                  <option value="None">Off (One-off Task)</option>
                  <option value="Daily">🔁 Daily Review</option>
                  <option value="Weekly">🔁 Weekly Practice</option>
                  <option value="Monthly">🔁 Monthly Refresher</option>
                </select>
              </div>
            </div>

            {/* 2-Column Spacious Textarea Grid */}
            <div className="grid2">
              {/* Situation */}
              <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label htmlFor="star-situation" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  1. Situation (The Context)
                </label>
                <p className="meta" style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                  What was the initial state, challenge, failure event, or business urgency?
                </p>
                <textarea
                  id="star-situation"
                  rows={6}
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="Describe the context: failure event, urgent customer issue, or legacy environment..."
                  style={{ minHeight: '160px' }}
                />
              </div>

              {/* Task */}
              <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label htmlFor="star-task" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  2. Task (Your Responsibility)
                </label>
                <p className="meta" style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                  What were you personally tasked to solve, configure, or lead?
                </p>
                <textarea
                  id="star-task"
                  rows={6}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Detail your mandate, SLAs, and technical constraints..."
                  style={{ minHeight: '160px' }}
                />
              </div>

              {/* Action */}
              <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label htmlFor="star-action" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  3. Action (Specific Steps You Took)
                </label>
                <p className="meta" style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                  What tools, protocols, CLI commands, or scripts did you use?
                </p>
                <textarea
                  id="star-action"
                  rows={6}
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="Focus on what YOU did: CLI diagnostic steps, hardware swaps, scripts deployed..."
                  style={{ minHeight: '160px' }}
                />
              </div>

              {/* Result */}
              <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label htmlFor="star-result" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  4. Result (Measurable Outcome)
                </label>
                <p className="meta" style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                  Quantifiable metrics: time saved, % outage reduced, SLA met, cost cut
                </p>
                <textarea
                  id="star-result"
                  rows={6}
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="Outcome: e.g. restored connectivity in 14 minutes with zero downtime..."
                  style={{ minHeight: '160px' }}
                />
              </div>
            </div>

            <div className="actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="button"
                onClick={handleAddStory}
                style={{ padding: '12px 24px', fontSize: '1rem' }}
              >
                {editingId !== null ? 'Update Story in Vault' : 'Add Story to Vault'}
              </button>
              {starStories.length > 0 && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setActiveTab('vault')}
                >
                  View Saved Vault ({starStories.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SAVED VAULT */}
      {activeTab === 'vault' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', margin: '16px 0 20px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award className="w-7 h-7 text-sky-400" />
                STAR Story Vault
                <span className="pill" style={{ fontSize: '0.85rem', verticalAlign: 'middle' }}>
                  {activeStories.length} Active
                </span>
                {archivedStories.length > 0 && (
                  <span
                    className="pill"
                    onClick={() => setActiveTab('archive')}
                    style={{ fontSize: '0.82rem', verticalAlign: 'middle', cursor: 'pointer', background: 'rgba(100, 116, 139, 0.2)', color: 'var(--text-muted)' }}
                    title="Click to view archived tasks"
                  >
                    📁 {archivedStories.length} Archived
                  </span>
                )}
              </h1>
              <p className="meta" style={{ marginTop: '4px' }}>
                Review, refine, search, or copy your prepared behavioral answers for target role: <b>{roleTitle}</b> ({targetCompany}).
              </p>
            </div>

            {activeStories.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {summaryStats.doneCount > 0 && (
                  <button
                    type="button"
                    className="button button-secondary no-print"
                    onClick={handleArchiveAllDone}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Archive all completed 'Done' tasks to keep your board clean"
                  >
                    <Archive className="w-4 h-4 text-amber-400" />
                    Archive Completed ({summaryStats.doneCount})
                  </button>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    const allText = activeStories.map((s, idx) => `=== STORY #${idx + 1}: ${s.theme.toUpperCase()} ===
[SITUATION]: ${s.situation}
[TASK]: ${s.task}
[ACTION]: ${s.action}
[RESULT]: ${s.result}
----------------------------------------`).join('\n\n');
                    navigator.clipboard.writeText(allText);
                    showToast('All active STAR stories copied to clipboard!');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Copy className="w-4 h-4 text-sky-400" />
                  Copy All Active
                </button>
                <button
                  type="button"
                  className="button button-secondary no-print"
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer className="w-4 h-4 text-sky-400" />
                  Print / Export PDF
                </button>
                <button
                  type="button"
                  className="button button-secondary no-print"
                  onClick={handleDownloadCsv}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Export all tasks, statuses, priorities, notes, and links to CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Download CSV
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    handleCancelEdit();
                    setActiveTab('builder');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus className="w-4 h-4" />
                  Add New Story
                </button>
              </div>
            )}
          </div>

          {/* Summary & Progress Metrics Panel */}
          {starStories.length > 0 && (
            <div className="panel" style={{ marginBottom: '20px', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target className="w-5 h-5 text-sky-400" />
                  Interview Readiness & Progress Metrics
                </h3>
                <span className="pill" style={{ fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 12px' }}>
                  {summaryStats.overallReadiness}% Overall Completion
                </span>
              </div>

              {/* Stacked Multi-Segment Progress Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Status Distribution ({summaryStats.total} Total Tasks)</span>
                  <span>{summaryStats.donePct}% Mastered ({summaryStats.doneCount} / {summaryStats.total})</span>
                </div>
                <div style={{ height: '12px', width: '100%', background: 'var(--bg)', borderRadius: '99px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border)' }}>
                  <div style={{ width: `${summaryStats.todoPct}%`, background: '#64748b', transition: 'width 0.3s ease' }} title={`To Do: ${summaryStats.todoCount} (${summaryStats.todoPct}%)`} />
                  <div style={{ width: `${summaryStats.inProgressPct}%`, background: '#f59e0b', transition: 'width 0.3s ease' }} title={`In Progress: ${summaryStats.inProgressCount} (${summaryStats.inProgressPct}%)`} />
                  <div style={{ width: `${summaryStats.donePct}%`, background: '#10b981', transition: 'width 0.3s ease' }} title={`Done: ${summaryStats.doneCount} (${summaryStats.donePct}%)`} />
                </div>
              </div>

              {/* Category Cards with Individual Progress Bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* To Do */}
                <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⏳ To Do
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                      {summaryStats.todoCount} tasks ({summaryStats.todoPct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'var(--surface)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${summaryStats.todoPct}%`, background: '#64748b', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {/* In Progress */}
                <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🔄 In Progress
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b' }}>
                      {summaryStats.inProgressCount} tasks ({summaryStats.inProgressPct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'var(--surface)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${summaryStats.inProgressPct}%`, background: '#f59e0b', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {/* Done */}
                <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ✅ Done (Mastered)
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--emerald)' }}>
                      {summaryStats.doneCount} tasks ({summaryStats.donePct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'var(--surface)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${summaryStats.donePct}%`, background: '#10b981', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              </div>

              {/* Priority Breakdown Row with Dynamic Priority Badges */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>Priority Key &amp; Distribution:</span>
                <span className="pill task-priority-high" style={{ margin: 0, padding: '3px 10px', fontWeight: 700 }}>
                  🔥 High Priority: {summaryStats.highCount} ({summaryStats.highPct}%)
                </span>
                <span className="pill task-priority-medium" style={{ margin: 0, padding: '3px 10px', fontWeight: 700 }}>
                  ⚡ Medium Priority: {summaryStats.mediumCount} ({summaryStats.mediumPct}%)
                </span>
                <span className="pill task-priority-low" style={{ margin: 0, padding: '3px 10px', fontWeight: 700 }}>
                  🔹 Low Priority: {summaryStats.lowCount} ({summaryStats.lowPct}%)
                </span>
              </div>
            </div>
          )}

          {/* Search & Status Filter Panel */}
          {starStories.length > 0 && (
            <div className="panel" style={{ marginBottom: '20px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                {/* Status Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="meta" style={{ fontWeight: 700, marginRight: '4px' }}>Filter Status:</span>
                  {(['All', 'To Do', 'In Progress', 'Done'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      className={statusFilter === st ? 'button' : 'button button-secondary'}
                      onClick={() => setStatusFilter(st)}
                      style={{ padding: '5px 12px', fontSize: '0.85rem' }}
                    >
                      {st === 'All' ? `All (${statusCounts['All']})` :
                       st === 'To Do' ? `⏳ To Do (${statusCounts['To Do']})` :
                       st === 'In Progress' ? `🔄 In Progress (${statusCounts['In Progress']})` :
                       `✅ Done (${statusCounts['Done']})`}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Category Filter Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="meta" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Category:</span>
                    <select
                      aria-label="Filter tasks by category"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="All">All Categories ({allAvailableCategories.length})</option>
                      {allAvailableCategories.map(cat => (
                        <option key={cat} value={cat}>
                          {getCategoryStyle(cat).icon} {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Sort Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="meta" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Sort Priority:</span>
                    <select
                      aria-label="Sort tasks by priority level"
                      value={prioritySort}
                      onChange={(e) => setPrioritySort(e.target.value as 'none' | 'high-to-low' | 'low-to-high')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="none">Default Order</option>
                      <option value="high-to-low">🔥 High → 🔹 Low</option>
                      <option value="low-to-high">🔹 Low → 🔥 High</option>
                    </select>
                  </div>

                  {/* View Switcher: Board vs List */}
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-accent)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      className={vaultViewMode === 'board' ? 'button' : 'button button-secondary'}
                      onClick={() => setVaultViewMode('board')}
                      style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Columns className="w-3.5 h-3.5 text-sky-400" /> Kanban Board
                    </button>
                    <button
                      type="button"
                      className={vaultViewMode === 'list' ? 'button' : 'button button-secondary'}
                      onClick={() => setVaultViewMode('list')}
                      style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <List className="w-3.5 h-3.5 text-sky-400" /> Detailed List
                    </button>
                  </div>

                  {/* Group By Toggle: Status Columns vs Category Swimlanes */}
                  {vaultViewMode === 'board' && (
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-accent)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        className={groupByMode === 'status' ? 'button' : 'button button-secondary'}
                        onClick={() => setGroupByMode('status')}
                        style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Group board into standard status columns (To Do, In Progress, Done)"
                      >
                        <Columns className="w-3.5 h-3.5 text-sky-400" /> By Status
                      </button>
                      <button
                        type="button"
                        className={groupByMode === 'category' ? 'button' : 'button button-secondary'}
                        onClick={() => setGroupByMode('category')}
                        style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Group board into category swimlanes (Technical, System Design, Behavioral, HR, etc.)"
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-400" /> By Category Swimlanes
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Local Search Input Field */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={searchVault}
                    onChange={e => setSearchVault(e.target.value)}
                    placeholder="Search tasks by title or content (e.g., VLAN, Jamf, AWS, Incident, Payroll)..."
                    aria-label="Search tasks by title or content"
                    style={{
                      width: '100%',
                      paddingLeft: '38px',
                      paddingRight: searchVault ? '36px' : '12px',
                      margin: 0,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                    }}
                  />
                  {searchVault && (
                    <button
                      type="button"
                      aria-label="Clear search input"
                      onClick={() => setSearchVault('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X className="w-4 h-4 hover:text-slate-200" />
                    </button>
                  )}
                </div>

                {/* Filter Match Counter Badge */}
                {(searchVault || statusFilter !== 'All') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pill" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      {filteredVault.length} of {starStories.length} tasks
                    </span>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setSearchVault('');
                        setStatusFilter('All');
                      }}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {starStories.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Your Story Vault is Empty
              </h3>
              <p className="meta" style={{ maxWidth: '480px', margin: '8px auto 20px' }}>
                Use the STAR Builder tab to draft your first behavioral answer, or load a sample scenario to get started.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="button"
                  onClick={() => setActiveTab('builder')}
                >
                  Open STAR Builder
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    loadSampleStory();
                    setActiveTab('builder');
                  }}
                >
                  Load Sample Story
                </button>
              </div>
            </div>
          ) : filteredVault.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <p className="meta">No saved stories match &quot;{searchVault}&quot;.</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSearchVault('')}
                style={{ marginTop: '10px' }}
              >
                Clear Search Filter
              </button>
            </div>
           ) : vaultViewMode === 'board' ? (
             groupByMode === 'category' ? (
              /* KANBAN BOARD VIEW WITH CATEGORY SWIMLANES */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                {allAvailableCategories.map(cat => {
                  const catStyle = getCategoryStyle(cat);
                  const catStories = sortedVault.filter(s => (s.categoryLabel || 'Technical') === cat);
                  if (catStories.length === 0 && categoryFilter !== 'All' && categoryFilter !== cat) {
                    return null;
                  }
                  const isCollapsed = !!collapsedSwimlanes[cat];

                  const todoCount = catStories.filter(s => (s.status || 'To Do') === 'To Do').length;
                  const inProgressCount = catStories.filter(s => s.status === 'In Progress').length;
                  const doneCount = catStories.filter(s => s.status === 'Done').length;

                  return (
                    <div
                      key={cat}
                      className="panel"
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${catStyle.border}`,
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {/* Swimlane Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: isCollapsed ? 0 : '12px', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)' }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                          onClick={() => setCollapsedSwimlanes(prev => ({ ...prev, [cat]: !prev[cat] }))}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '8px',
                              background: catStyle.bg,
                              border: `1px solid ${catStyle.border}`,
                              color: catStyle.color,
                              fontWeight: 800,
                              fontSize: '0.95rem'
                            }}
                          >
                            <span>{catStyle.icon}</span>
                            <span>{cat} Swimlane</span>
                          </span>

                          <span className="pill" style={{ margin: 0, fontWeight: 700, fontSize: '0.8rem' }}>
                            {catStories.length} {catStories.length === 1 ? 'task' : 'tasks'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                          <span className="pill" style={{ margin: 0, background: 'var(--surface)', color: 'var(--text-muted)' }}>
                            ⏳ {todoCount} To Do
                          </span>
                          <span className="pill" style={{ margin: 0, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                            🔄 {inProgressCount} In Progress
                          </span>
                          <span className="pill" style={{ margin: 0, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--emerald)' }}>
                            ✅ {doneCount} Done
                          </span>
                        </div>
                      </div>

                      {/* Swimlane Columns Matrix */}
                      {!isCollapsed && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginTop: '14px' }}>
                          {(['To Do', 'In Progress', 'Done'] as const).map(colStatus => {
                            const columnStories = catStories.filter(s => (s.status || 'To Do') === colStatus);
                            const isOver = dragOverSwimlane?.category === cat && dragOverSwimlane?.status === colStatus;

                            return (
                              <div
                                key={colStatus}
                                onDragOver={(e) => handleDragOverSwimlane(e, cat, colStatus)}
                                onDragLeave={handleDragLeaveColumn}
                                onDrop={(e) => handleDropToSwimlane(e, cat, colStatus)}
                                style={{
                                  background: 'var(--bg)',
                                  border: isOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
                                  borderRadius: '12px',
                                  padding: '12px',
                                  minHeight: '160px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isOver ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: colStatus === 'Done' ? 'var(--emerald)' : colStatus === 'In Progress' ? '#f59e0b' : 'var(--text-heading)' }}>
                                    {colStatus === 'To Do' ? '⏳ To Do' : colStatus === 'In Progress' ? '🔄 In Progress' : '✅ Done'}
                                  </span>
                                  <span className="pill" style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700 }}>
                                    {columnStories.length}
                                  </span>
                                </div>

                                {columnStories.length === 0 ? (
                                  <div style={{ padding: '20px 8px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    Drag tasks here for {cat} ({colStatus})
                                  </div>
                                ) : (
                                  columnStories.map(story => {
                                    const priorityStyle = getPriorityStyle(story.priority || 'Medium');
                                    const pendingBlockers = getPendingBlockers(story, starStories);
                                    const allBlockers = getAllBlockers(story, starStories);
                                    const dependentTasks = getDependentTasks(story.id, starStories);
                                    const isBlocked = pendingBlockers.length > 0;

                                    return (
                                      <div
                                        key={story.id}
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, story.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`card ${getPriorityClassNames(story.priority, isBlocked)}`}
                                        style={{
                                          padding: '12px',
                                          borderRadius: '10px',
                                          cursor: 'grab',
                                          opacity: draggedStoryId === story.id ? 0.4 : 1,
                                          transition: 'all 0.15s ease',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                                          <div
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1 }}
                                            onClick={() => setModalStory(story)}
                                          >
                                            <GripVertical className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)', lineHeight: '1.3' }}>
                                              {story.theme}
                                            </h4>
                                          </div>

                                          <select
                                            aria-label={`Priority level for ${story.theme}`}
                                            value={story.priority || 'Medium'}
                                            onChange={(e) => handleUpdatePriority(story.id, e.target.value as TaskPriority)}
                                            style={{
                                              padding: '2px 6px',
                                              fontSize: '0.7rem',
                                              fontWeight: 700,
                                              borderRadius: '99px',
                                              border: `1px solid ${priorityStyle.border}`,
                                              background: priorityStyle.bg,
                                              color: priorityStyle.color,
                                              cursor: 'pointer',
                                              flexShrink: 0
                                            }}
                                          >
                                            <option value="High">🔥 High</option>
                                            <option value="Medium">⚡ Medium</option>
                                            <option value="Low">🔹 Low</option>
                                          </select>
                                        </div>

                                        {/* Dependency & Repeat Badges */}
                                        {(isBlocked || allBlockers.length > 0 || dependentTasks.length > 0 || (story.repeatFrequency && story.repeatFrequency !== 'None')) && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                                            {story.repeatFrequency && story.repeatFrequency !== 'None' && (
                                              <span
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '3px',
                                                  fontSize: '0.7rem',
                                                  fontWeight: 600,
                                                  padding: '1px 6px',
                                                  borderRadius: '4px',
                                                  background: 'rgba(129, 140, 248, 0.15)',
                                                  border: '1px solid rgba(129, 140, 248, 0.35)',
                                                  color: '#a5b4fc',
                                                }}
                                                title={`Repeat frequency: ${story.repeatFrequency}`}
                                              >
                                                <Repeat className="w-3 h-3 text-indigo-400" />
                                                {story.repeatFrequency}
                                              </span>
                                            )}

                                            {isBlocked ? (
                                              <span
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '3px',
                                                  fontSize: '0.7rem',
                                                  fontWeight: 700,
                                                  padding: '1px 6px',
                                                  borderRadius: '4px',
                                                  background: 'rgba(239, 68, 68, 0.18)',
                                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                                  color: '#f87171',
                                                }}
                                                title={`Blocked by ${pendingBlockers.length} prerequisite task(s)`}
                                              >
                                                <Lock className="w-3 h-3 text-rose-400" />
                                                Blocked
                                              </span>
                                            ) : null}
                                          </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                                          <select
                                            aria-label={`Status for ${story.theme}`}
                                            value={story.status || 'To Do'}
                                            onChange={(e) => handleUpdateStatus(story.id, e.target.value as StoryStatus)}
                                            style={{
                                              padding: '2px 6px',
                                              fontSize: '0.72rem',
                                              fontWeight: 700,
                                              borderRadius: '99px',
                                              border: '1px solid ' + (story.status === 'Done' ? 'var(--emerald)' : story.status === 'In Progress' ? '#f59e0b' : 'var(--border)'),
                                              background: story.status === 'Done' ? 'rgba(16, 185, 129, 0.15)' : story.status === 'In Progress' ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)',
                                              color: story.status === 'Done' ? 'var(--emerald)' : story.status === 'In Progress' ? '#f59e0b' : 'var(--text)',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            <option value="To Do">To Do</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Done">Done</option>
                                          </select>

                                          <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                              type="button"
                                              className="button button-secondary"
                                              onClick={() => setModalStory(story)}
                                              style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                                              title="View details"
                                            >
                                              <Eye className="w-3 h-3 text-sky-400" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* STANDARD KANBAN STATUS COLUMNS */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginTop: '16px' }}>
              {(['To Do', 'In Progress', 'Done'] as const).map(colStatus => {
                const columnStories = sortedVault.filter(s => (s.status || 'To Do') === colStatus);
                const isOver = dragOverColumn === colStatus;

                return (
                  <div
                    key={colStatus}
                    className="panel"
                    onDragOver={(e) => handleDragOverColumn(e, colStatus)}
                    onDragLeave={handleDragLeaveColumn}
                    onDrop={(e) => handleDropToColumn(e, colStatus)}
                    style={{
                      background: 'var(--surface)',
                      border: isOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '16px',
                      minHeight: '380px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                      boxShadow: isOver ? '0 0 15px rgba(56, 189, 248, 0.25)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {colStatus === 'To Do' ? '⏳ To Do' : colStatus === 'In Progress' ? '🔄 In Progress' : '✅ Done'}
                      </h3>
                      <span className="pill" style={{ margin: 0, fontWeight: 700 }}>
                        {columnStories.length}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '4px' }}>
                      📥 Drag cards here to move to {colStatus}
                    </div>

                    {columnStories.length === 0 ? (
                      <div style={{ padding: '32px 12px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No stories in {colStatus}
                      </div>
                    ) : (
                      columnStories.map((story) => {
                        const priorityStyle = getPriorityStyle(story.priority || 'Medium');
                        const pendingBlockers = getPendingBlockers(story, starStories);
                        const allBlockers = getAllBlockers(story, starStories);
                        const dependentTasks = getDependentTasks(story.id, starStories);
                        const isBlocked = pendingBlockers.length > 0;

                        return (
                          <div
                            key={story.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, story.id)}
                            onDragEnd={handleDragEnd}
                            className={`card ${getPriorityClassNames(story.priority, isBlocked)}`}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              cursor: 'grab',
                              opacity: draggedStoryId === story.id ? 0.4 : 1,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1 }}
                                onClick={() => setModalStory(story)}
                              >
                                <GripVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)', lineHeight: '1.3' }}>
                                  {story.theme}
                                </h4>
                              </div>

                              {/* Color-Coded Category & Priority Indicators */}
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <select
                                  aria-label={`Category label for ${story.theme}`}
                                  value={story.categoryLabel || 'Technical'}
                                  onChange={(e) => handleUpdateCategory(story.id, e.target.value)}
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: `1px solid ${getCategoryStyle(story.categoryLabel).border}`,
                                    background: getCategoryStyle(story.categoryLabel).bg,
                                    color: getCategoryStyle(story.categoryLabel).color,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {allAvailableCategories.map(cat => (
                                    <option key={cat} value={cat}>
                                      {getCategoryStyle(cat).icon} {cat}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  aria-label={`Priority level for ${story.theme}`}
                                  value={story.priority || 'Medium'}
                                  onChange={(e) => handleUpdatePriority(story.id, e.target.value as TaskPriority)}
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    borderRadius: '99px',
                                    border: `1px solid ${priorityStyle.border}`,
                                    background: priorityStyle.bg,
                                    color: priorityStyle.color,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <option value="High">🔥 High</option>
                                  <option value="Medium">⚡ Medium</option>
                                  <option value="Low">🔹 Low</option>
                                </select>
                              </div>
                            </div>

                            {/* Dependency, Blocker & Repeat Indicator Badges */}
                            {(isBlocked || allBlockers.length > 0 || dependentTasks.length > 0 || (story.repeatFrequency && story.repeatFrequency !== 'None')) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                {story.repeatFrequency && story.repeatFrequency !== 'None' && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: 'rgba(129, 140, 248, 0.15)',
                                      border: '1px solid rgba(129, 140, 248, 0.35)',
                                      color: '#a5b4fc',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setModalStory(story)}
                                    title={`Recurring task: auto-creates a new review task in To Do (${story.repeatFrequency}) when completed`}
                                  >
                                    <Repeat className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                    {story.repeatFrequency}
                                  </span>
                                )}

                                {isBlocked ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: 'rgba(239, 68, 68, 0.18)',
                                      border: '1px solid rgba(239, 68, 68, 0.4)',
                                      color: '#f87171',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setModalStory(story)}
                                    title={`Blocked by ${pendingBlockers.map(b => `"${b.theme}" (${b.status})`).join(', ')}`}
                                  >
                                    <Lock className="w-3 h-3 text-rose-400 flex-shrink-0" />
                                    Blocked ({pendingBlockers.length} pending)
                                  </span>
                                ) : allBlockers.length > 0 ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      color: 'var(--emerald)',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setModalStory(story)}
                                    title={`All ${allBlockers.length} prerequisite tasks completed`}
                                  >
                                    <Unlock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                    Unblocked
                                  </span>
                                ) : null}

                                {dependentTasks.length > 0 && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      border: '1px solid rgba(56, 189, 248, 0.3)',
                                      color: '#38bdf8',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setModalStory(story)}
                                    title={`Prerequisite for ${dependentTasks.map(d => `"${d.theme}"`).join(', ')}`}
                                  >
                                    <GitFork className="w-3 h-3 text-sky-400 flex-shrink-0" />
                                    Blocks {dependentTasks.length} task{dependentTasks.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            )}

                            {story.situation && (
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                                <strong style={{ color: 'var(--text)' }}>S:</strong> {story.situation}
                              </p>
                            )}

                            {story.result && (
                              <p style={{ fontSize: '0.82rem', color: 'var(--emerald)', fontWeight: 600, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                                <strong>R:</strong> {story.result}
                              </p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                              <select
                                aria-label={`Status for ${story.theme}`}
                                value={story.status || 'To Do'}
                                onChange={(e) => handleUpdateStatus(story.id, e.target.value as StoryStatus)}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  borderRadius: '99px',
                                  border: '1px solid ' + (story.status === 'Done' ? 'var(--emerald)' : story.status === 'In Progress' ? '#f59e0b' : 'var(--border)'),
                                  background: story.status === 'Done' ? 'rgba(16, 185, 129, 0.15)' : story.status === 'In Progress' ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)',
                                  color: story.status === 'Done' ? 'var(--emerald)' : story.status === 'In Progress' ? '#f59e0b' : 'var(--text)',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                              </select>

                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  onClick={() => setModalStory(story)}
                                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                  title="View task details, notes & links"
                                >
                                  <Eye className="w-3 h-3 text-sky-400" />
                                </button>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  onClick={() => handleCopyStory(story)}
                                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                  title="Copy story"
                                >
                                  <Copy className="w-3 h-3 text-sky-400" />
                                </button>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  onClick={() => handleEditStory(story)}
                                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                  title="Edit story"
                                >
                                  <Edit3 className="w-3 h-3 text-amber-400" />
                                </button>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  onClick={() => handleArchiveStory(story.id)}
                                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                  title="Archive story"
                                >
                                  <Archive className="w-3 h-3 text-slate-400" />
                                </button>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  onClick={() => handleDeleteStory(story.id)}
                                  style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--rose)' }}
                                  title="Delete story"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
            )
          ) : (
            /* DETAILED LIST VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sortedVault.map((story, index) => {
                const isCopied = copiedId === story.id;
                const isCurrentEditing = editingId === story.id;
                const priorityStyle = getPriorityStyle(story.priority || 'Medium');
                const pendingBlockers = getPendingBlockers(story, starStories);
                const allBlockers = getAllBlockers(story, starStories);
                const dependentTasks = getDependentTasks(story.id, starStories);
                const isBlocked = pendingBlockers.length > 0;

                return (
                  <div
                    key={story.id}
                    className={`panel ${getPriorityClassNames(story.priority, isBlocked)}`}
                    style={{
                      position: 'relative',
                      ...(isCurrentEditing ? { outline: '2px solid var(--accent)' } : {})
                    }}
                  >
                    {/* Story Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span className="pill" style={{ fontWeight: 800, margin: 0, background: 'var(--surface-accent)', color: 'var(--accent)' }}>
                          #{index + 1}
                        </span>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
                          {story.theme}
                        </h3>

                        {story.repeatFrequency && story.repeatFrequency !== 'None' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: 'rgba(129, 140, 248, 0.15)',
                              border: '1px solid rgba(129, 140, 248, 0.35)',
                              color: '#a5b4fc',
                              cursor: 'pointer',
                            }}
                            onClick={() => setModalStory(story)}
                            title={`Recurring task: auto-creates a new review task in To Do (${story.repeatFrequency}) when completed`}
                          >
                            <Repeat className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            Repeat: {story.repeatFrequency}
                          </span>
                        )}

                        {isBlocked ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.18)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#f87171',
                              cursor: 'pointer',
                            }}
                            onClick={() => setModalStory(story)}
                            title={`Blocked by ${pendingBlockers.map(b => `"${b.theme}" (${b.status})`).join(', ')}`}
                          >
                            <Lock className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                            Blocked ({pendingBlockers.length} pending)
                          </span>
                        ) : allBlockers.length > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: 'var(--emerald)',
                              cursor: 'pointer',
                            }}
                            onClick={() => setModalStory(story)}
                            title={`All ${allBlockers.length} prerequisite tasks completed`}
                          >
                            <Unlock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            Unblocked
                          </span>
                        ) : null}

                        {dependentTasks.length > 0 && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              cursor: 'pointer',
                            }}
                            onClick={() => setModalStory(story)}
                            title={`Prerequisite for ${dependentTasks.map(d => `"${d.theme}"`).join(', ')}`}
                          >
                            <GitFork className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                            Blocks {dependentTasks.length} task{dependentTasks.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Category Selector */}
                        <select
                          id={`category-select-${story.id}`}
                          aria-label={`Category label for ${story.theme}`}
                          value={story.categoryLabel || 'Technical'}
                          onChange={(e) => handleUpdateCategory(story.id, e.target.value)}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            borderRadius: '99px',
                            border: `1px solid ${getCategoryStyle(story.categoryLabel).border}`,
                            background: getCategoryStyle(story.categoryLabel).bg,
                            color: getCategoryStyle(story.categoryLabel).color,
                            cursor: 'pointer',
                          }}
                        >
                          {allAvailableCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {getCategoryStyle(cat).icon} {cat}
                            </option>
                          ))}
                        </select>

                        {/* Priority Selector */}
                        <select
                          id={`priority-select-${story.id}`}
                          aria-label={`Priority level for ${story.theme}`}
                          value={story.priority || 'Medium'}
                          onChange={(e) => handleUpdatePriority(story.id, e.target.value as TaskPriority)}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            borderRadius: '99px',
                            border: `1px solid ${priorityStyle.border}`,
                            background: priorityStyle.bg,
                            color: priorityStyle.color,
                            cursor: 'pointer',
                          }}
                        >
                          <option value="High">🔥 High Priority</option>
                          <option value="Medium">⚡ Medium Priority</option>
                          <option value="Low">🔹 Low Priority</option>
                        </select>

                        {/* Status Toggle Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <select
                            id={`status-select-${story.id}`}
                            aria-label={`Preparation status for ${story.theme}`}
                            value={story.status || 'To Do'}
                            onChange={(e) => handleUpdateStatus(story.id, e.target.value as StoryStatus)}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              borderRadius: '99px',
                              border: '1px solid ' + (
                                story.status === 'Done' ? 'var(--emerald)' :
                                story.status === 'In Progress' ? 'var(--amber, #f59e0b)' :
                                'var(--border)'
                              ),
                              background: (
                                story.status === 'Done' ? 'rgba(16, 185, 129, 0.15)' :
                                story.status === 'In Progress' ? 'rgba(245, 158, 11, 0.15)' :
                                'var(--surface)'
                              ),
                              color: (
                                story.status === 'Done' ? 'var(--emerald)' :
                                story.status === 'In Progress' ? '#f59e0b' :
                                'var(--text)'
                              ),
                              cursor: 'pointer',
                            }}
                          >
                            <option value="To Do">⏳ To Do</option>
                            <option value="In Progress">🔄 In Progress</option>
                            <option value="Done">✅ Done</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setModalStory(story)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                          title="View task details, notes & links"
                        >
                          <Eye className="w-4 h-4 text-sky-400" />
                          Details & Hub
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleCopyStory(story)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                          {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleEditStory(story)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Edit3 className="w-4 h-4 text-amber-400" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleArchiveStory(story.id)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                          title="Archive story to keep board clean"
                        >
                          <Archive className="w-4 h-4 text-slate-400" />
                          Archive
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleDeleteStory(story.id)}
                          style={{ padding: '6px 10px', fontSize: '0.85rem', color: 'var(--rose)' }}
                          title="Delete Story"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* STAR 4-Dimension Grid */}
                    <div className="grid2">
                      <div className="card" style={{ padding: '14px' }}>
                        <span className="pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 700 }}>
                          1. Situation
                        </span>
                        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)' }}>
                          {story.situation || <em className="muted">Not specified</em>}
                        </p>
                      </div>

                      <div className="card" style={{ padding: '14px' }}>
                        <span className="pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 700 }}>
                          2. Task
                        </span>
                        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)' }}>
                          {story.task || <em className="muted">Not specified</em>}
                        </p>
                      </div>

                      <div className="card" style={{ padding: '14px' }}>
                        <span className="pill" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 700 }}>
                          3. Action
                        </span>
                        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)' }}>
                          {story.action || <em className="muted">Not specified</em>}
                        </p>
                      </div>

                      <div className="card" style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        <span className="pill g" style={{ fontWeight: 700 }}>
                          4. Result
                        </span>
                        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)', fontWeight: 600 }}>
                          {story.result || <em className="muted" style={{ fontWeight: 400 }}>Not specified</em>}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

           {/* Floating Bulk Actions Toolbar */}
           {selectedTaskIds.length > 0 && (
             <div
               style={{
                 position: 'sticky',
                 bottom: '20px',
                 zIndex: 50,
                 background: 'var(--surface)',
                 border: '2px solid var(--accent)',
                 borderRadius: '16px',
                 padding: '12px 20px',
                 boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 flexWrap: 'wrap',
                 gap: '12px',
                 marginTop: '20px',
                 animation: 'fadeIn 0.2s ease'
               }}
             >
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <span className="pill" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent)', fontWeight: 800 }}>
                   {selectedTaskIds.length} tasks selected
                 </span>
                 <button
                   type="button"
                   className="button button-secondary"
                   onClick={() => setSelectedTaskIds(filteredVault.map(s => s.id))}
                   style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                 >
                   Select All Visible ({filteredVault.length})
                 </button>
                 <button
                   type="button"
                   className="button button-secondary"
                   onClick={() => setSelectedTaskIds([])}
                   style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                 >
                   Clear
                 </button>
               </div>

               <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                 <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>Batch Actions:</span>
                 <button
                   type="button"
                   className="button button-secondary"
                   onClick={() => handleBulkMoveStatus('To Do')}
                   style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                 >
                   ⏳ Move to To Do
                 </button>
                 <button
                   type="button"
                   className="button button-secondary"
                   onClick={() => handleBulkMoveStatus('In Progress')}
                   style={{ fontSize: '0.82rem', padding: '6px 12px', color: '#f59e0b', borderColor: '#f59e0b' }}
                 >
                   🔄 Move to In Progress
                 </button>
                 <button
                   type="button"
                   className="button button-secondary"
                   onClick={() => handleBulkMoveStatus('Done')}
                   style={{ fontSize: '0.82rem', padding: '6px 12px', color: 'var(--emerald)', borderColor: 'var(--emerald)' }}
                 >
                   ✅ Move to Done
                 </button>

                 <select
                   aria-label="Batch change priority for selected tasks"
                   onChange={(e) => {
                     if (e.target.value) {
                       handleBulkChangePriority(e.target.value as TaskPriority);
                       e.target.value = '';
                     }
                   }}
                   defaultValue=""
                   style={{
                     padding: '6px 12px',
                     fontSize: '0.82rem',
                     fontWeight: 700,
                     borderRadius: '8px',
                     background: 'var(--surface)',
                     border: '1px solid var(--border)',
                     color: 'var(--text)',
                     cursor: 'pointer'
                   }}
                 >
                   <option value="" disabled>Change Priority...</option>
                   <option value="High">🔥 Set High Priority</option>
                   <option value="Medium">⚡ Set Medium Priority</option>
                   <option value="Low">🔹 Set Low Priority</option>
                 </select>

                 <button
                   type="button"
                   className="button button-secondary"
                   onClick={handleBulkArchiveTasks}
                   style={{ fontSize: '0.82rem', padding: '6px 12px', color: 'var(--rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                 >
                   <Archive className="w-4 h-4" /> Bulk Archive
                 </button>
               </div>
             </div>
           )}
         </div>
       )}

      {/* VIEW 3: ARCHIVED TASKS */}
      {activeTab === 'archive' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', margin: '16px 0 20px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FolderArchive className="w-7 h-7 text-sky-400" />
                Archived Tasks
                <span className="pill" style={{ fontSize: '0.85rem', verticalAlign: 'middle' }}>
                  {archivedStories.length} Archived
                </span>
              </h1>
              <p className="meta" style={{ marginTop: '4px' }}>
                Completed or inactive interview prep tasks moved here to keep your active workspace organized. Restore tasks anytime.
              </p>
            </div>

            {archivedStories.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleRestoreAllArchived}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  Restore All ({archivedStories.length})
                </button>
              </div>
            )}
          </div>

          {archivedStories.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Archive className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                No Archived Tasks
              </h3>
              <p className="meta" style={{ maxWidth: '480px', margin: '8px auto 20px' }}>
                Your archive is clean. You can archive completed or inactive tasks from the Saved Vault board anytime to keep your active workspace clutter-free.
              </p>
              <button
                type="button"
                className="button"
                onClick={() => setActiveTab('vault')}
              >
                Go to Saved Vault ({activeStories.length})
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {archivedStories.map((story, index) => {
                const priorityStyle = getPriorityStyle(story.priority || 'Medium');

                return (
                  <div
                    key={story.id}
                    className={`panel ${getPriorityClassNames(story.priority, false)}`}
                    style={{
                      position: 'relative',
                      opacity: 0.9,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="pill" style={{ fontWeight: 800, margin: 0, background: 'rgba(100, 116, 139, 0.2)', color: 'var(--text-muted)' }}>
                          #{index + 1}
                        </span>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
                          {story.theme}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '99px',
                            border: `1px solid ${priorityStyle.border}`,
                            background: priorityStyle.bg,
                            color: priorityStyle.color,
                          }}
                        >
                          {priorityStyle.label}
                        </span>

                        <span
                          style={{
                            padding: '3px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '99px',
                            border: '1px solid ' + (story.status === 'Done' ? 'var(--emerald)' : story.status === 'In Progress' ? '#f59e0b' : 'var(--border)'),
                            background: story.status === 'Done' ? 'rgba(16, 185, 129, 0.15)' : story.status === 'In Progress' ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)',
                            color: story.status === 'Done' ? 'var(--emerald)' : story.status === 'In Progress' ? '#f59e0b' : 'var(--text)',
                          }}
                        >
                          {story.status || 'To Do'}
                        </span>

                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setModalStory(story)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-sky-400" />
                          Details
                        </button>

                        <button
                          type="button"
                          className="button"
                          onClick={() => handleRestoreStory(story.id)}
                          style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--emerald)', color: 'var(--emerald)' }}
                          title="Restore story to active board"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                          Restore
                        </button>

                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleDeleteStory(story.id)}
                          style={{ padding: '6px 10px', fontSize: '0.85rem', color: 'var(--rose)' }}
                          title="Permanently Delete Story"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      {story.situation && (
                        <p style={{ margin: '0 0 6px' }}>
                          <strong style={{ color: 'var(--text)' }}>Situation:</strong> {story.situation}
                        </p>
                      )}
                      {story.result && (
                        <p style={{ margin: 0, color: 'var(--emerald)', fontWeight: 600 }}>
                          <strong>Result:</strong> {story.result}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: REVERSE QUESTIONS */}
      {activeTab === 'questions' && (
        <div>
          <div className="tool-hero">
            <h1>High-Signal Reverse Interview Questions</h1>
            <p className="lead">
              Ask these during the final 10 minutes of your interview to signal operational maturity, technical depth, and forward-thinking leadership.
            </p>
          </div>

          <div className="grid2">
            {[
              {
                question: "What does the escalation path look like when Tier 1 encounters an ambiguous cloud identity or network degradation issue?",
                signal: "Proves familiarity with triage tiering and SLA preservation."
              },
              {
                question: "How does your team measure customer satisfaction and SLA adherence without incentivizing superficial ticket closes?",
                signal: "Demonstrates balanced focus on quality of resolution over raw metrics."
              },
              {
                question: "What are the top 2 internal tooling or automation initiatives the IT operations team plans to tackle over the next 12 months?",
                signal: "Shows forward-thinking mindset and interest in contributing to automation."
              },
              {
                question: "How is the organization currently managing endpoint hygiene and compliance across hybrid / remote fleets?",
                signal: "Demonstrates zero-trust security and modern MDM awareness."
              },
              {
                question: "When a major outage occurs, what does your post-mortem process look like, and how are lessons learned shared across engineering?",
                signal: "Demonstrates blameless culture, operational rigor, and continuous improvement."
              },
              {
                question: "What is the biggest friction point your team currently faces with existing service desk or infrastructure tools?",
                signal: "Shows empathy for the team's daily workflow and desire to solve real pain points."
              }
            ].map((item, i) => (
              <div key={i} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', lineHeight: '1.5', marginBottom: '14px' }}>
                  &ldquo;{item.question}&rdquo;
                </p>
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="meta" style={{ fontSize: '0.82rem', fontStyle: 'italic' }}>
                    Signal: {item.signal}
                  </span>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(item.question);
                      showToast('Question copied to clipboard!');
                    }}
                    style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: METHODOLOGY GUIDE */}
      {activeTab === 'guide' && (
        <div>
          <div className="tool-hero">
            <h1>The STAR Method Framework Guide</h1>
            <p className="lead">
              The STAR method structures behavioral answers so hiring managers can verify your decision-making, technical execution, and business impact.
            </p>
          </div>

          <div className="panel" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px' }}>
              The 4 Components of a Winning Answer
            </h2>

            <div className="grid2" style={{ marginTop: '16px' }}>
              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ color: '#38bdf8', fontSize: '1.05rem', margin: '0 0 6px' }}>1. Situation (15% of time)</h3>
                <p className="meta" style={{ margin: 0, lineHeight: '1.5' }}>
                  Set the scene concisely. Describe the specific crisis, legacy limitation, or business goal. Avoid lengthy preamble; establish the problem in 2 sentences.
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ color: '#818cf8', fontSize: '1.05rem', margin: '0 0 6px' }}>2. Task (15% of time)</h3>
                <p className="meta" style={{ margin: 0, lineHeight: '1.5' }}>
                  Clarify your specific responsibility or mandate. What were you expected to deliver under what constraints or SLAs?
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ color: '#c084fc', fontSize: '1.05rem', margin: '0 0 6px' }}>3. Action (50% of time)</h3>
                <p className="meta" style={{ margin: 0, lineHeight: '1.5' }}>
                  The core of your answer. Focus on what YOU personally did. Mention specific tools (Active Directory, Jamf, Cisco, Terraform, Python), commands, protocols, and cross-team coordination.
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ color: 'var(--emerald)', fontSize: '1.05rem', margin: '0 0 6px' }}>4. Result (20% of time)</h3>
                <p className="meta" style={{ margin: 0, lineHeight: '1.5' }}>
                  Conclude with verified, quantitative business metrics: downtime avoided, % ticket reduction, minutes saved, or 100% SLA compliance.
                </p>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px' }}>
              Before &amp; After Example
            </h2>

            <div className="card" style={{ padding: '16px', marginBottom: '14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <span className="pill r" style={{ fontWeight: 700 }}>❌ Weak / Vague Response</span>
              <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: 'var(--text)' }}>
                &ldquo;I worked on fixing laptop deployment issues because users were waiting too long. I helped set up Jamf and made things much faster.&rdquo;
              </p>
            </div>

            <div className="card" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <span className="pill g" style={{ fontWeight: 700 }}>✅ Strong STAR Response</span>
              <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: 'var(--text)' }}>
                &ldquo;Manual imaging took 4.5 hours per engineer laptop, causing a 3-week onboarding backlog across 45 new hires. As lead IT engineer, I designed a zero-touch provisioning pipeline linking Apple Business Manager, Jamf Pro, and Okta SSO with post-enrollment zsh scripts. This cut provisioning from 4.5 hours to 18 minutes with a 99.4% success rate and zero backlog.&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY INTERVIEW PREPARATION PLANNER CONTAINER */}
      <div className="printable-interview-planner hidden print:block bg-white text-slate-900 p-8">
        {/* Document Header */}
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '12px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22pt', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            INTERVIEW PREPARATION PLANNER
          </h1>
          <p style={{ fontSize: '10pt', color: '#64748b', margin: '4px 0 0 0' }}>
            Target Role: <strong>{roleTitle}</strong> &bull; Target Company: <strong>{targetCompany}</strong> &bull; Date: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Section 1: STAR Story Vault */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            STAR Behavioral Answer Vault ({starStories.length} Saved Stories)
          </h2>

          {starStories.length === 0 ? (
            <p style={{ fontSize: '11pt', color: '#64748b', fontStyle: 'italic' }}>No saved STAR stories available in vault.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {starStories.map((story, idx) => (
                <div
                  key={story.id}
                  className="printable-star-story"
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '14px',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#0369a1', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Story #{idx + 1}: {story.theme}</span>
                    <span style={{ fontSize: '9pt', color: story.status === 'Done' ? '#059669' : story.status === 'In Progress' ? '#d97706' : '#64748b', fontWeight: 'bold', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '99px', backgroundColor: '#ffffff' }}>
                      Status: {story.status || 'To Do'}
                    </span>
                  </div>

                  {/* 2x2 Table Layout for STAR breakdown */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px', fontSize: '10pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '50%', padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', backgroundColor: '#ffffff' }}>
                          <strong style={{ color: '#0284c7', display: 'block', marginBottom: '4px' }}>1. SITUATION (Context)</strong>
                          <span style={{ color: '#1e293b' }}>{story.situation || 'N/A'}</span>
                        </td>
                        <td style={{ width: '50%', padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', backgroundColor: '#ffffff' }}>
                          <strong style={{ color: '#4f46e5', display: 'block', marginBottom: '4px' }}>2. TASK (Responsibility)</strong>
                          <span style={{ color: '#1e293b' }}>{story.task || 'N/A'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '50%', padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', backgroundColor: '#ffffff' }}>
                          <strong style={{ color: '#7c3aed', display: 'block', marginBottom: '4px' }}>3. ACTION (Execution)</strong>
                          <span style={{ color: '#1e293b' }}>{story.action || 'N/A'}</span>
                        </td>
                        <td style={{ width: '50%', padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', backgroundColor: '#ffffff' }}>
                          <strong style={{ color: '#059669', display: 'block', marginBottom: '4px' }}>4. RESULT (Outcome)</strong>
                          <span style={{ color: '#065f46', fontWeight: '600' }}>{story.result || 'N/A'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Recommended High-Signal Reverse Questions */}
        <div>
          <h2 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recommended Reverse Interview Questions
          </h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#0f172a', width: '65%' }}>Question</th>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#0f172a', width: '35%' }}>Seniority Signal</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  question: "What does the escalation path look like when Tier 1 encounters an ambiguous cloud identity or network degradation issue?",
                  signal: "Proves familiarity with triage tiering and SLA preservation."
                },
                {
                  question: "How does your team measure customer satisfaction and SLA adherence without incentivizing superficial ticket closes?",
                  signal: "Demonstrates balanced focus on quality of resolution over raw metrics."
                },
                {
                  question: "What are the top 2 internal tooling or automation initiatives the IT operations team plans to tackle over the next 12 months?",
                  signal: "Shows forward-thinking mindset and interest in contributing to automation."
                },
                {
                  question: "How is the organization currently managing endpoint hygiene and compliance across hybrid / remote fleets?",
                  signal: "Demonstrates zero-trust security and modern MDM awareness."
                },
                {
                  question: "When a major outage occurs, what does your post-mortem process look like, and how are lessons learned shared across engineering?",
                  signal: "Demonstrates blameless culture, operational rigor, and continuous improvement."
                }
              ].map((q, idx) => (
                <tr key={idx} className="printable-question-card" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', color: '#0f172a', fontWeight: '500' }}>
                    &ldquo;{q.question}&rdquo;
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #cbd5e1', verticalAlign: 'top', color: '#475569', fontStyle: 'italic' }}>
                    {q.signal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TASK DETAIL & REFERENCE HUB MODAL */}
      {modalStory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setModalStory(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '840px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Eye className="w-5 h-5 text-sky-400" />
                  <span className="pill" style={{ fontWeight: 800, margin: 0, background: 'var(--surface-accent)', color: 'var(--accent)' }}>
                    Task Details & Reference Hub
                  </span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                  {modalStory.theme}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Priority selector */}
                <select
                  aria-label="Priority level"
                  value={modalStory.priority || 'Medium'}
                  onChange={(e) => {
                    const newP = e.target.value as TaskPriority;
                    handleUpdatePriority(modalStory.id, newP);
                    setModalStory(prev => prev ? { ...prev, priority: newP } : null);
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '99px',
                    border: `1px solid ${getPriorityStyle(modalStory.priority || 'Medium').border}`,
                    background: getPriorityStyle(modalStory.priority || 'Medium').bg,
                    color: getPriorityStyle(modalStory.priority || 'Medium').color,
                    cursor: 'pointer'
                  }}
                >
                  <option value="High">🔥 High Priority</option>
                  <option value="Medium">⚡ Medium Priority</option>
                  <option value="Low">🔹 Low Priority</option>
                </select>

                {/* Status selector */}
                <select
                  aria-label="Status"
                  value={modalStory.status || 'To Do'}
                  onChange={(e) => {
                    const newSt = e.target.value as StoryStatus;
                    handleUpdateStatus(modalStory.id, newSt);
                    setModalStory(prev => prev ? { ...prev, status: newSt } : null);
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '99px',
                    border: '1px solid ' + (
                      modalStory.status === 'Done' ? 'var(--emerald)' :
                      modalStory.status === 'In Progress' ? '#f59e0b' :
                      'var(--border)'
                    ),
                    background: (
                      modalStory.status === 'Done' ? 'rgba(16, 185, 129, 0.15)' :
                      modalStory.status === 'In Progress' ? 'rgba(245, 158, 11, 0.15)' :
                      'var(--surface)'
                    ),
                    color: (
                      modalStory.status === 'Done' ? 'var(--emerald)' :
                      modalStory.status === 'In Progress' ? '#f59e0b' :
                      'var(--text)'
                    ),
                    cursor: 'pointer'
                  }}
                >
                  <option value="To Do">⏳ To Do</option>
                  <option value="In Progress">🔄 In Progress</option>
                  <option value="Done">✅ Done</option>
                </select>

                {/* Repeat schedule selector */}
                <select
                  aria-label="Repeat schedule"
                  value={modalStory.repeatFrequency || 'None'}
                  onChange={(e) => {
                    const newFreq = e.target.value as RepeatFrequency;
                    handleUpdateRepeatFrequency(modalStory.id, newFreq);
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '99px',
                    border: '1px solid rgba(129, 140, 248, 0.4)',
                    background: 'rgba(129, 140, 248, 0.15)',
                    color: '#a5b4fc',
                    cursor: 'pointer'
                  }}
                  title="Configure automated review repeat frequency"
                >
                  <option value="None">🔁 No Repeat</option>
                  <option value="Daily">🔁 Repeat Daily</option>
                  <option value="Weekly">🔁 Repeat Weekly</option>
                  <option value="Monthly">🔁 Repeat Monthly</option>
                </select>

                <button
                  type="button"
                  onClick={() => setModalStory(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 hover:text-slate-200" />
                </button>
              </div>
            </div>

            {modalStory.repeatFrequency && modalStory.repeatFrequency !== 'None' && (
              <div style={{ background: 'rgba(129, 140, 248, 0.1)', border: '1px solid rgba(129, 140, 248, 0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Repeat className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>
                  <strong>Recurring Review Task:</strong> Set to repeat <strong>{modalStory.repeatFrequency}</strong>. Moving this story to <b>Done</b> will keep this completed answer and automatically generate a new practice instance in <b>To Do</b>.
                </span>
              </div>
            )}

            {/* STAR Story Dimensions Recap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modalStory.situation && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--accent)', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>1. Situation</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: 0, lineHeight: '1.4' }}>{modalStory.situation}</p>
                </div>
              )}
              {modalStory.task && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--accent)', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>2. Task</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: 0, lineHeight: '1.4' }}>{modalStory.task}</p>
                </div>
              )}
              {modalStory.action && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--accent)', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>3. Action</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: 0, lineHeight: '1.4' }}>{modalStory.action}</p>
                </div>
              )}
              {modalStory.result && (
                <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--emerald)', fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>4. Result</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--emerald)', margin: 0, lineHeight: '1.4', fontWeight: 600 }}>{modalStory.result}</p>
                </div>
              )}
            </div>

            {/* Task Dependencies & Blocker Linking Hub */}
            <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-heading)', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                  <GitFork className="w-4 h-4 text-sky-400" />
                  Task Dependencies & Blocker Linking
                </label>
                {getPendingBlockers(modalStory, starStories).length > 0 ? (
                  <span className="pill" style={{ margin: 0, fontWeight: 700, background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                    🔒 Blocked ({getPendingBlockers(modalStory, starStories).length} Pending Prerequisite)
                  </span>
                ) : getAllBlockers(modalStory, starStories).length > 0 ? (
                  <span className="pill" style={{ margin: 0, fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    ✅ Unblocked (All Prerequisites Done)
                  </span>
                ) : (
                  <span className="pill" style={{ margin: 0, fontWeight: 600, background: 'var(--surface)', color: 'var(--text-muted)' }}>
                    No Blockers Linked
                  </span>
                )}
              </div>

              {/* List of current prerequisite blocker tasks */}
              <div style={{ marginBottom: '12px' }}>
                <span className="meta" style={{ fontWeight: 700, fontSize: '0.82rem', display: 'block', marginBottom: '6px', color: 'var(--text-heading)' }}>
                  Prerequisites (Tasks that block this story until completed):
                </span>
                {getAllBlockers(modalStory, starStories).length === 0 ? (
                  <p className="meta" style={{ fontSize: '0.82rem', fontStyle: 'italic', margin: '4px 0 10px' }}>
                    No prerequisite blocker tasks linked. Select a task below to establish a dependency.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {getAllBlockers(modalStory, starStories).map(blocker => {
                      const isBlockerDone = blocker.status === 'Done';
                      return (
                        <div
                          key={blocker.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: isBlockerDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            border: `1px solid ${isBlockerDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: '8px',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            {isBlockerDone ? (
                              <Unlock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-rose-400 flex-shrink-0" />
                            )}
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {blocker.theme}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '99px',
                                border: '1px solid ' + (isBlockerDone ? 'var(--emerald)' : blocker.status === 'In Progress' ? '#f59e0b' : 'var(--border)'),
                                background: isBlockerDone ? 'rgba(16, 185, 129, 0.15)' : blocker.status === 'In Progress' ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)',
                                color: isBlockerDone ? 'var(--emerald)' : blocker.status === 'In Progress' ? '#f59e0b' : 'var(--text)',
                                flexShrink: 0
                              }}
                            >
                              {blocker.status}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveBlocker(modalStory.id, blocker.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', padding: '2px' }}
                            title="Remove prerequisite blocker link"
                          >
                            <Trash2 className="w-4 h-4 hover:text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown to add a blocker task */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    aria-label="Add prerequisite task blocker"
                    onChange={(e) => {
                      const selectedId = Number(e.target.value);
                      if (selectedId) {
                        handleAddBlocker(modalStory.id, selectedId);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem', margin: 0 }}
                  >
                    <option value="" disabled>+ Link Prerequisite Task (Blocker)...</option>
                    {starStories
                      .filter(s => s.id !== modalStory.id && !(modalStory.blockedByTaskIds || []).includes(s.id))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.theme} [{s.status}]
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Tasks waiting on this story */}
              {getDependentTasks(modalStory.id, starStories).length > 0 && (
                <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <span className="meta" style={{ fontWeight: 700, fontSize: '0.82rem', display: 'block', marginBottom: '6px', color: '#38bdf8' }}>
                    Tasks Waiting On This Story ({getDependentTasks(modalStory.id, starStories).length}):
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {getDependentTasks(modalStory.id, starStories).map(dep => (
                      <div
                        key={dep.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                          {dep.theme}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: dep.status === 'Done' ? 'var(--emerald)' : '#f59e0b', fontWeight: 700 }}>
                          {dep.status === 'Done' ? '✅ Unblocked' : `⏳ Waiting (${dep.status})`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rich Interview Prep Talking Points & Notes with Web Speech Voice Dictation */}
            <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-heading)', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                  <FileText className="w-4 h-4 text-sky-400" />
                  Rich Interview Talking Points & Prep Notes
                </label>

                {/* Voice Dictation Button */}
                <button
                  type="button"
                  className={isListening ? "button button-secondary animate-pulse" : "button button-secondary"}
                  onClick={toggleListening}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isListening ? '#f43f5e' : 'var(--text)',
                    borderColor: isListening ? 'rgba(244, 63, 94, 0.5)' : 'var(--border)',
                    background: isListening ? 'rgba(244, 63, 94, 0.12)' : 'var(--surface)',
                    boxShadow: isListening ? '0 0 12px rgba(244, 63, 94, 0.3)' : 'none'
                  }}
                  title={isListening ? "Click to stop voice dictation" : "Click to dictate notes using your microphone"}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      <span>🔴 Listening... Click to Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span>Dictate Voice Notes</span>
                    </>
                  )}
                </button>
              </div>

              <p className="meta" style={{ fontSize: '0.8rem', marginBottom: '10px' }}>
                Type or speak key metrics, technical nuances, mock interviewer questions, or CLI commands to remember.
              </p>
              <textarea
                rows={4}
                value={modalStory.notes || ''}
                onChange={(e) => handleSaveModalNotes(e.target.value)}
                placeholder="Type or click 'Dictate Voice Notes' to speak talking points, metrics, or answers..."
                style={{ width: '100%', minHeight: '100px', fontSize: '0.88rem', background: 'var(--surface)', border: '1px solid var(--border)', margin: 0 }}
              />
            </div>

            {/* External Links Hub */}
            <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-heading)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '10px' }}>
                <Link2 className="w-4 h-4 text-sky-400" />
                Resource & Documentation Links ({modalStory.links?.length || 0})
              </label>

              {/* Existing Links List */}
              {modalStory.links && modalStory.links.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {modalStory.links.map(link => (
                    <div key={link.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                        <ExternalLink className="w-3.5 h-3.5" />
                        {link.title}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(link.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', padding: '2px' }}
                        title="Remove link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Link Inputs */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Link Title (e.g., Incident Postmortem Doc)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  style={{ flex: 1, minWidth: '180px', margin: 0, fontSize: '0.85rem' }}
                />
                <input
                  type="url"
                  placeholder="URL (e.g., https://github.com/...)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  style={{ flex: 1.5, minWidth: '220px', margin: 0, fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleAddLink}
                  style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Link
                </button>
              </div>
            </div>

            {/* File Reference Placeholders Hub */}
            <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-heading)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '10px' }}>
                <Paperclip className="w-4 h-4 text-sky-400" />
                File & Document Reference Placeholders ({modalStory.fileRefs?.length || 0})
              </label>

              {/* Existing File Refs */}
              {modalStory.fileRefs && modalStory.fileRefs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {modalStory.fileRefs.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="pill" style={{ fontSize: '0.72rem', margin: 0, fontWeight: 700 }}>
                          {f.fileType}
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-heading)' }}>{f.name}</strong>
                        {f.notes && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>— {f.notes}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFileRef(f.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', padding: '2px' }}
                        title="Remove file reference"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add File Ref Inputs */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="File Name (e.g., Failover_Script.sh)"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  style={{ flex: 1, minWidth: '160px', margin: 0, fontSize: '0.85rem' }}
                />
                <select
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.85rem', margin: 0 }}
                >
                  <option value="Shell Script">Shell / Code Script</option>
                  <option value="PDF Document">PDF Document</option>
                  <option value="Log File">Log File</option>
                  <option value="Architecture Diagram">Architecture Diagram</option>
                  <option value="Other Reference">Other Reference</option>
                </select>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={newFileNotes}
                  onChange={(e) => setNewFileNotes(e.target.value)}
                  style={{ flex: 1, minWidth: '140px', margin: 0, fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleAddFileRef}
                  style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Ref
                </button>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => handleCopyStory(modalStory)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Copy className="w-4 h-4 text-sky-400" /> Copy Story Text
              </button>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {modalStory.isArchived ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => handleRestoreStory(modalStory.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                  >
                    <ArchiveRestore className="w-4 h-4 text-emerald-400" /> Restore Task
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => handleArchiveStory(modalStory.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                  >
                    <Archive className="w-4 h-4 text-slate-400" /> Archive Task
                  </button>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    handleEditStory(modalStory);
                    setModalStory(null);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <Edit3 className="w-4 h-4 text-amber-400" /> Open in STAR Builder
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => setModalStory(null)}
                  style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                >
                  Done / Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
