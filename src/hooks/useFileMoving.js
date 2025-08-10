import { useState } from 'react'
import { FileSystemService } from '../services/fileSystemService'

const fileSystemService = new FileSystemService()

export function useFileMoving() {
  const [isMoving, setIsMoving] = useState(false)
  const [moveProgress, setMoveProgress] = useState(null)
  const [moveResults, setMoveResults] = useState(null)
  const [showMoveConfirmDialog, setShowMoveConfirmDialog] = useState(false)
  const [showMoveResultsDialog, setShowMoveResultsDialog] = useState(false)
  const [filesToMove, setFilesToMove] = useState([])
  const [parentDirectoryHandle, setParentDirectoryHandle] = useState(null)
  const [parentDirectory, setParentDirectory] = useState(null)
  const [customDirectoryName, setCustomDirectoryName] = useState('dedupelocal')
  const [archiveDirHandle, setArchiveDirHandle] = useState(null)
  const [showArchivePicker, setShowArchivePicker] = useState(false)
  const [directoryValidation, setDirectoryValidation] = useState({ valid: true })

  const startMove = async (files) => {
    setFilesToMove(files)
    setMoveResults(null)
    setMoveProgress(null)
    
    // If no parent directory selected, show picker first
    if (!parentDirectory) {
      setShowArchivePicker(true)
    } else {
      setShowMoveConfirmDialog(true)
    }
  }

  const selectArchiveDirectory = async () => {
    try {
      setShowArchivePicker(false)
      
      // Select parent directory where custom directory will be created
      const parentDirHandle = await fileSystemService.selectArchiveDirectory()
      
      // Store parent directory info (don't create archive directory yet)
      setParentDirectoryHandle(parentDirHandle)
      setParentDirectory({
        name: parentDirHandle.name,
        handle: parentDirHandle
      })
      
      // Validate current custom directory name
      await validateCustomDirectoryName(customDirectoryName, parentDirHandle)
      
      // If we already have files to move, show confirmation dialog
      if (filesToMove.length > 0) {
        setShowMoveConfirmDialog(true)
      }
      
    } catch (error) {
      console.error('Parent directory selection error:', error)
      
      if (error.message.includes('cancelled')) {
        // For cancellation, just don't change the parent directory
        // but don't show error unless it's not the first time
        if (parentDirectory) {
          // User was trying to change directory but cancelled, keep existing
          setShowMoveConfirmDialog(true)
        } else {
          // First time and cancelled, show picker again
          setShowArchivePicker(true)
        }
      } else {
        // Real error occurred
        setParentDirectory(null)
        setParentDirectoryHandle(null)
        setArchiveDirHandle(null)
        setMoveResults({
          operations: [{
            success: false,
            fileName: 'Parent Directory Selection',
            error: error.message
          }],
          manifest: null,
          archiveDirectory: null
        })
        setShowMoveResultsDialog(true)
      }
      
      // Re-throw error so MoveConfirmationDialog can handle it
      throw error
    }
  }

  const validateCustomDirectoryName = async (name, parentHandle = parentDirectoryHandle) => {
    if (!parentHandle) {
      setDirectoryValidation({ valid: false, error: 'No parent directory selected' })
      return
    }

    const validation = fileSystemService.validateDirectoryName(name)
    if (!validation.valid) {
      setDirectoryValidation(validation)
      return
    }

    try {
      const exists = await fileSystemService.checkDirectoryExists(parentHandle, validation.name)
      const uniqueName = await fileSystemService.generateUniqueDirectoryName(parentHandle, validation.name)
      
      setDirectoryValidation({
        valid: true,
        name: validation.name,
        finalName: uniqueName,
        exists,
        willBeRenamed: uniqueName !== validation.name
      })
    } catch (error) {
      setDirectoryValidation({
        valid: false,
        error: error.message
      })
    }
  }

  const updateCustomDirectoryName = (name) => {
    setCustomDirectoryName(name)
    validateCustomDirectoryName(name)
  }

  const confirmMove = async () => {
    setShowMoveConfirmDialog(false)
    setIsMoving(true)
    setMoveProgress({ progress: 0, completed: 0, total: filesToMove.length })

    try {
      // First, create the archive directory now (only when user confirms)
      const directoryResult = await fileSystemService.createCustomDirectory(
        parentDirectoryHandle,
        customDirectoryName,
        true // auto-resolve conflicts
      )

      setArchiveDirHandle(directoryResult.handle)
      
      const archiveDirectoryPath = `${parentDirectory.name}/${directoryResult.name}`

      const { results, manifest } = await fileSystemService.moveFiles(
        filesToMove.map(file => ({
          fileHandle: file.fileHandle,
          fileName: file.fileName || file.name,
          path: file.path,
          size: file.size,
          groupId: file.groupId
        })),
        directoryResult.handle,
        (progressData) => {
          setMoveProgress({
            progress: progressData.progress,
            completed: progressData.completed,
            total: progressData.total,
            currentFile: progressData.currentFile,
            result: progressData.result
          })
        }
      )

      setMoveResults({ 
        operations: results, 
        manifest,
        archiveDirectory: archiveDirectoryPath,
        directoryCreated: {
          name: directoryResult.name,
          wasRenamed: directoryResult.wasRenamed,
          originalName: customDirectoryName
        }
      })
      setShowMoveResultsDialog(true)

    } catch (error) {
      console.error('Move operation error:', error)
      setMoveResults({
        operations: [{
          success: false,
          fileName: 'Move Operation',
          error: error.message
        }],
        manifest: null,
        archiveDirectory: parentDirectory ? `${parentDirectory.name}/${customDirectoryName}` : null
      })
      setShowMoveResultsDialog(true)
    } finally {
      setIsMoving(false)
      setMoveProgress(null)
    }
  }

  const cancelMove = () => {
    setShowMoveConfirmDialog(false)
    setShowArchivePicker(false)
    setFilesToMove([])
    setMoveResults(null)
    setMoveProgress(null)
  }

  const closeMoveResults = () => {
    setShowMoveResultsDialog(false)
    setMoveResults(null)
    setFilesToMove([])
  }

  const clearArchiveDirectory = () => {
    setParentDirectory(null)
    setParentDirectoryHandle(null)
    setArchiveDirHandle(null)
    setCustomDirectoryName('dedupelocal')
    setDirectoryValidation({ valid: true })
  }

  const openArchiveDirectory = async () => {
    if (archiveDirHandle) {
      try {
        // Try to open the directory in file explorer
        // This is a browser limitation - we can't directly open file explorer
        // But we can provide helpful feedback
        console.log('Archive directory:', archiveDirectory.path)
        
        // Copy path to clipboard as fallback
        if (navigator.clipboard && archiveDirectory.path) {
          await navigator.clipboard.writeText(archiveDirectory.path)
          return { success: true, method: 'clipboard' }
        }
        
        return { success: false, error: 'Cannot open directory directly from browser' }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }
    return { success: false, error: 'No archive directory selected' }
  }

  return {
    // State
    isMoving,
    moveProgress,
    moveResults,
    showMoveConfirmDialog,
    showMoveResultsDialog,
    showArchivePicker,
    filesToMove,
    parentDirectory,
    customDirectoryName,
    directoryValidation,
    
    // Actions
    startMove,
    selectArchiveDirectory,
    updateCustomDirectoryName,
    confirmMove,
    cancelMove,
    closeMoveResults,
    clearArchiveDirectory,
    openArchiveDirectory
  }
}