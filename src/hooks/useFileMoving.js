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
  const [archiveDirectory, setArchiveDirectory] = useState(null)
  const [archiveDirHandle, setArchiveDirHandle] = useState(null)
  const [showArchivePicker, setShowArchivePicker] = useState(false)

  const startMove = async (files) => {
    setFilesToMove(files)
    setMoveResults(null)
    setMoveProgress(null)
    
    // If no archive directory selected, show picker first
    if (!archiveDirectory) {
      setShowArchivePicker(true)
    } else {
      setShowMoveConfirmDialog(true)
    }
  }

  const selectArchiveDirectory = async () => {
    try {
      setShowArchivePicker(false)
      
      // Select parent directory where dedupelocal will be created
      const parentDirHandle = await fileSystemService.selectArchiveDirectory()
      
      // Create or get dedupelocal directory
      const dedupeDirHandle = await fileSystemService.createDedupeLocalDirectory(parentDirHandle)
      
      setArchiveDirHandle(dedupeDirHandle)
      setArchiveDirectory({
        name: dedupeDirHandle.name,
        path: `${parentDirHandle.name}/dedupelocal`,
        parentPath: parentDirHandle.name
      })
      
      // Now show confirmation dialog
      setShowMoveConfirmDialog(true)
      
    } catch (error) {
      console.error('Archive directory selection error:', error)
      setArchiveDirectory(null)
      setArchiveDirHandle(null)
      
      if (!error.message.includes('cancelled')) {
        setMoveResults([{
          success: false,
          fileName: 'Archive Selection',
          error: error.message
        }])
        setShowMoveResultsDialog(true)
      }
    }
  }

  const confirmMove = async () => {
    setShowMoveConfirmDialog(false)
    setIsMoving(true)
    setMoveProgress({ progress: 0, completed: 0, total: filesToMove.length })

    try {
      const { results, manifest } = await fileSystemService.moveFiles(
        filesToMove.map(file => ({
          fileHandle: file.fileHandle,
          fileName: file.fileName || file.name,
          path: file.path,
          size: file.size,
          groupId: file.groupId
        })),
        archiveDirHandle,
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
        archiveDirectory: archiveDirectory.path
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
        archiveDirectory: archiveDirectory?.path
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
    setArchiveDirectory(null)
    setArchiveDirHandle(null)
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
    archiveDirectory,
    
    // Actions
    startMove,
    selectArchiveDirectory,
    confirmMove,
    cancelMove,
    closeMoveResults,
    clearArchiveDirectory,
    openArchiveDirectory
  }
}