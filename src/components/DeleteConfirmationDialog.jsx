import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Box,
  Alert,
  LinearProgress
} from '@mui/material'
import { Warning, Delete } from '@mui/icons-material'

export default function DeleteConfirmationDialog({
  open,
  onClose,
  filesToDelete,
  onConfirmDelete,
  isDeleting,
  deleteProgress
}) {
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [finalConfirmation, setFinalConfirmation] = useState(false)

  if (!filesToDelete || filesToDelete.length === 0) {
    return null
  }

  const totalSize = filesToDelete.reduce((sum, file) => sum + (file.fileSize || 0), 0)
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationChecked(false)
      setFinalConfirmation(false)
      onClose()
    }
  }

  const handleDelete = () => {
    if (confirmationChecked && finalConfirmation) {
      onConfirmDelete()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isDeleting}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="warning" />
        Confirm File Deletion
      </DialogTitle>

      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="bold">
            ⚠️ PERMANENT DELETION WARNING
          </Typography>
          <Typography variant="body2">
            These files will be permanently deleted and cannot be recovered. 
            This action bypasses the system trash/recycle bin.
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom>
          Files to be deleted ({filesToDelete.length}):
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total size: {formatFileSize(totalSize)}
          </Typography>
        </Box>

        <List
          dense
          sx={{ 
            maxHeight: 300, 
            overflow: 'auto', 
            border: 1, 
            borderColor: 'divider',
            borderRadius: 1
          }}
        >
          {filesToDelete.map((file, index) => (
            <ListItem key={index} divider>
              <ListItemText
                primary={file.fileName}
                secondary={
                  <Box>
                    <Typography variant="body2" component="span">
                      Path: {file.filePath}
                    </Typography>
                    <br />
                    <Typography variant="body2" component="span" color="text.secondary">
                      Size: {formatFileSize(file.fileSize || 0)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        {isDeleting && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom>
              Deleting files... {Math.round((deleteProgress?.progress || 0) * 100)}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(deleteProgress?.progress || 0) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
            {deleteProgress?.currentFile && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Current: {deleteProgress.currentFile}
              </Typography>
            )}
          </Box>
        )}

        {!isDeleting && (
          <Box sx={{ mt: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmationChecked}
                  onChange={(e) => setConfirmationChecked(e.target.checked)}
                  color="warning"
                />
              }
              label={
                <Typography variant="body2">
                  I understand that these files will be permanently deleted and cannot be recovered
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={finalConfirmation}
                  onChange={(e) => setFinalConfirmation(e.target.checked)}
                  color="error"
                  disabled={!confirmationChecked}
                />
              }
              label={
                <Typography variant="body2" fontWeight="bold">
                  I am absolutely sure I want to delete these {filesToDelete.length} files
                </Typography>
              }
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          disabled={!confirmationChecked || !finalConfirmation || isDeleting}
          variant="contained"
          color="error"
          startIcon={<Delete />}
        >
          {isDeleting ? 'Deleting...' : `Delete ${filesToDelete.length} Files`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}