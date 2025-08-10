import { useState, useEffect } from 'react'
import { Button, Box, Typography, Alert, IconButton } from '@mui/material'
import { Folder, FolderOpen, Close } from '@mui/icons-material'
import { FileSystemService } from '../services/fileSystemService'

const fileSystemService = new FileSystemService()

export default function FolderSelector({ onFolderSelected, disabled }) {
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Auto-dismiss cancellation errors after 5 seconds
  useEffect(() => {
    if (error && error.includes('cancelled')) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSelectFolder = async () => {
    if (!fileSystemService.isSupported()) {
      setError('File System Access API is not supported in this browser. Please use Chrome 86+ or Edge 86+')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const dirHandle = await fileSystemService.selectDirectory()
      setSelectedFolder(dirHandle)
      onFolderSelected(dirHandle)
    } catch (error) {
      // Don't show error for user cancellations unless it's a persistent issue
      if (error.message.includes('cancelled')) {
        // Only show cancellation message if user repeatedly cancels
        setError(`Folder selection was cancelled. Click "Choose Folder" to try again.`)
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDismissError = () => {
    setError(null)
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Select Folder to Scan
      </Typography>
      
      <Button
        variant="contained"
        startIcon={selectedFolder ? <FolderOpen /> : <Folder />}
        onClick={handleSelectFolder}
        disabled={disabled || loading}
        size="large"
        sx={{ mr: 2 }}
      >
        {loading ? 'Selecting...' : selectedFolder ? 'Change Folder' : 'Choose Folder'}
      </Button>

      {selectedFolder && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Selected: {selectedFolder.name}
        </Typography>
      )}

      {error && (
        <Alert 
          severity={error.includes('cancelled') ? "warning" : "error"} 
          sx={{ mt: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleDismissError}
            >
              <Close fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {!fileSystemService.isSupported() && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          This app requires the File System Access API. Please use a supported browser like Chrome 86+ or Edge 86+.
        </Alert>
      )}
    </Box>
  )
}