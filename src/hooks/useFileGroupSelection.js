import { useState, useCallback } from 'react'

export function useFileGroupSelection() {
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [originalFiles, setOriginalFiles] = useState(new Map()) // groupId -> filePath
  const [fileStates, setFileStates] = useState(new Map()) // filePath -> 'exists' | 'deleted' | 'moved' | 'error'
  const [operationHistory, setOperationHistory] = useState([]) // Track operations

  const handleFileSelection = useCallback((filePath) => {
    const fileState = fileStates.get(filePath) || 'exists'
    if (fileState !== 'exists') return // Ignore deleted/moved files
    
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath)
    } else {
      newSelected.add(filePath)
    }
    setSelectedFiles(newSelected)
  }, [selectedFiles, fileStates])

  const handleOriginalSelection = useCallback((groupId, filePath) => {
    const fileState = fileStates.get(filePath) || 'exists'
    if (fileState !== 'exists') return // Can't select deleted/moved files as original
    
    const newOriginalFiles = new Map(originalFiles)
    newOriginalFiles.set(groupId, filePath)
    setOriginalFiles(newOriginalFiles)
    
    // Remove the new original file from selected files
    const newSelected = new Set(selectedFiles)
    newSelected.delete(filePath)
    setSelectedFiles(newSelected)
  }, [originalFiles, selectedFiles, fileStates])

  const handleGroupSelectAll = useCallback((group, selectAll, groupId) => {
    const newSelected = new Set(selectedFiles)
    const originalFile = originalFiles.get(groupId)
    
    const groupFiles = group.files || group // Handle different group structures
    
    groupFiles.forEach((file) => {
      const filePath = file.path
      const fileState = fileStates.get(filePath) || 'exists'
      
      // Skip deleted/moved files and original file
      if (fileState !== 'exists' || filePath === originalFile) {
        return
      }
      
      if (selectAll) {
        newSelected.add(filePath)
      } else {
        newSelected.delete(filePath)
      }
    })
    
    setSelectedFiles(newSelected)
  }, [selectedFiles, originalFiles, fileStates])

  const handleOperationSuccess = useCallback((operation, files, destinationPath = null) => {
    const newFileStates = new Map(fileStates)
    const newOperationHistory = [...operationHistory]
    
    files.forEach(file => {
      const filePath = file.path || file.fileName
      if (operation === 'delete') {
        newFileStates.set(filePath, 'deleted')
      } else if (operation === 'move') {
        newFileStates.set(filePath, 'moved')
      }
    })
    
    // Record the operation
    newOperationHistory.push({
      operation,
      files: files.map(f => f.path || f.fileName),
      destinationPath,
      timestamp: new Date().toISOString()
    })
    
    setFileStates(newFileStates)
    setOperationHistory(newOperationHistory)
    
    // Clear selection for processed files
    const newSelected = new Set(selectedFiles)
    files.forEach(file => {
      const filePath = file.path || file.fileName
      newSelected.delete(filePath)
    })
    setSelectedFiles(newSelected)
  }, [fileStates, operationHistory, selectedFiles])

  const handleOperationError = useCallback((files) => {
    const newFileStates = new Map(fileStates)
    files.forEach(file => {
      const filePath = file.path || file.fileName
      newFileStates.set(filePath, 'error')
    })
    setFileStates(newFileStates)
  }, [fileStates])

  const getFileState = useCallback((filePath) => {
    return fileStates.get(filePath) || 'exists'
  }, [fileStates])

  const isFileOriginal = useCallback((groupId, filePath) => {
    return originalFiles.get(groupId) === filePath
  }, [originalFiles])

  const getGroupSummary = useCallback((group, groupId) => {
    const groupFiles = group.files || group
    const originalFile = originalFiles.get(groupId)
    
    let exists = 0, deleted = 0, moved = 0, errors = 0
    
    groupFiles.forEach(file => {
      const state = fileStates.get(file.path) || 'exists'
      switch (state) {
        case 'exists': exists++; break
        case 'deleted': deleted++; break
        case 'moved': moved++; break
        case 'error': errors++; break
      }
    })
    
    const selectedInGroup = groupFiles.filter(file => 
      selectedFiles.has(file.path) && fileStates.get(file.path) !== 'deleted' && fileStates.get(file.path) !== 'moved'
    ).length
    
    return {
      total: groupFiles.length,
      exists,
      deleted,
      moved,
      errors,
      selectedInGroup,
      hasOriginal: originalFile !== undefined,
      originalExists: originalFile ? (fileStates.get(originalFile) || 'exists') === 'exists' : false
    }
  }, [originalFiles, fileStates, selectedFiles])

  const resetSelection = useCallback(() => {
    setSelectedFiles(new Set())
  }, [])

  const resetOriginals = useCallback(() => {
    setOriginalFiles(new Map())
  }, [])

  const resetStates = useCallback(() => {
    setFileStates(new Map())
    setOperationHistory([])
  }, [])

  return {
    // State
    selectedFiles,
    originalFiles,
    fileStates,
    operationHistory,
    
    // Handlers
    handleFileSelection,
    handleOriginalSelection,
    handleGroupSelectAll,
    handleOperationSuccess,
    handleOperationError,
    
    // Utilities
    getFileState,
    isFileOriginal,
    getGroupSummary,
    
    // Reset functions
    resetSelection,
    resetOriginals,
    resetStates
  }
}