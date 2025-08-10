import { useState } from 'react'
import { FileSystemService } from '../services/fileSystemService'

const fileSystemService = new FileSystemService()

export function useFileDeletion() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState(null)
  const [deleteResults, setDeleteResults] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [filesToDelete, setFilesToDelete] = useState([])

  const startDeletion = (files) => {
    setFilesToDelete(files)
    setDeleteResults(null)
    setDeleteProgress(null)
    setShowConfirmDialog(true)
  }

  const confirmDeletion = async () => {
    setShowConfirmDialog(false)
    setIsDeleting(true)
    setDeleteProgress({ progress: 0, completed: 0, total: filesToDelete.length })

    try {
      const results = await fileSystemService.deleteFiles(
        filesToDelete.map(file => ({
          fileHandle: file.fileHandle,
          fileName: file.fileName
        })),
        (progressData) => {
          setDeleteProgress({
            progress: progressData.progress,
            completed: progressData.completed,
            total: progressData.total,
            currentFile: progressData.currentFile
          })
        }
      )

      setDeleteResults(results)
      setShowResultsDialog(true)

    } catch (error) {
      console.error('Deletion error:', error)
      setDeleteResults([{
        success: false,
        fileName: 'Unknown',
        error: error.message
      }])
      setShowResultsDialog(true)
    } finally {
      setIsDeleting(false)
      setDeleteProgress(null)
    }
  }

  const cancelDeletion = () => {
    setShowConfirmDialog(false)
    setFilesToDelete([])
    setDeleteResults(null)
    setDeleteProgress(null)
  }

  const closeResults = () => {
    setShowResultsDialog(false)
    setDeleteResults(null)
    setFilesToDelete([])
  }

  return {
    // State
    isDeleting,
    deleteProgress,
    deleteResults,
    showConfirmDialog,
    showResultsDialog,
    filesToDelete,
    
    // Actions
    startDeletion,
    confirmDeletion,
    cancelDeletion,
    closeResults
  }
}