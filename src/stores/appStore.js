import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // App state
  scanMode: 'exact', // 'exact' | 'similarity' | 'filename' | 'multi-criteria'
  isScanning: false,
  progress: 0,
  currentFile: null,
  scanPhase: '',
  
  // Files and results
  selectedFolder: null,
  files: [],
  duplicateGroups: [],
  similarGroups: [],
  filenameGroups: [],
  multiCriteriaGroups: [],
  
  // Settings
  similarityThreshold: 0.8,
  filenameThreshold: 0.8,
  filenameMode: 'smart', // 'exact', 'exact-base', 'smart', 'fuzzy'
  
  // Multi-criteria settings
  matchingCriteria: {
    filename: true,
    exact: true,
    similarity: false
  },
  criteriaWeights: {
    filename: 0.4,
    exact: 0.5,
    similarity: 0.1
  },
  priorityOrder: ['exact', 'filename', 'similarity'], // Order of priority for multi-criteria
  
  // Actions
  setScanMode: (mode) => set({ scanMode: mode }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setProgress: (progress) => set({ progress }),
  setCurrentFile: (file) => set({ currentFile: file }),
  setScanPhase: (phase) => set({ scanPhase: phase }),
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  setFiles: (files) => set({ files }),
  setDuplicateGroups: (groups) => set({ duplicateGroups: groups }),
  setSimilarGroups: (groups) => set({ similarGroups: groups }),
  setFilenameGroups: (groups) => set({ filenameGroups: groups }),
  setMultiCriteriaGroups: (groups) => set({ multiCriteriaGroups: groups }),
  setSimilarityThreshold: (threshold) => set({ similarityThreshold: threshold }),
  setFilenameThreshold: (threshold) => set({ filenameThreshold: threshold }),
  setFilenameMode: (mode) => set({ filenameMode: mode }),
  setMatchingCriteria: (criteria) => set({ matchingCriteria: criteria }),
  setCriteriaWeights: (weights) => set({ criteriaWeights: weights }),
  setPriorityOrder: (order) => set({ priorityOrder: order }),
  
  // Reset functions
  reset: () => set({
    isScanning: false,
    progress: 0,
    currentFile: null,
    scanPhase: '',
    files: [],
    duplicateGroups: [],
    similarGroups: [],
    filenameGroups: [],
    multiCriteriaGroups: []
  })
}))