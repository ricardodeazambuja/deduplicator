import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Alert,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material'
import { 
  DriveFileMove, 
  FolderOpen, 
  Warning, 
  Info,
  Close,
  CreateNewFolder
} from '@mui/icons-material'

export default function MoveConfirmationDialog({
  open,
  onClose,
  filesToMove = [],
  archiveDirectory,
  onSelectArchive,
  onConfirmMove,
  isMoving = false,
  moveProgress = null
}) {
  const [showArchiveSelector, setShowArchiveSelector] = useState(!archiveDirectory)

  const handleSelectArchive = async () => {
    setShowArchiveSelector(false)
    try {
      await onSelectArchive()
    } catch (error) {
      // Re-enable archive selector if selection fails
      setShowArchiveSelector(true)
    }
  }

  const handleConfirm = () => {
    if (!archiveDirectory) {
      setShowArchiveSelector(true)
      return
    }
    onConfirmMove()
  }

  const totalSize = filesToMove.reduce((sum, file) => sum + (file.size || 0), 0)

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <Dialog 
      open={open} 
      onClose={!isMoving ? onClose : undefined}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isMoving}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DriveFileMove color="warning" />
        Move Files to Archive
        {!isMoving && (
          <IconButton
            onClick={onClose}
            sx={{ ml: 'auto' }}
            size="small"
          >
            <Close />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        {isMoving ? (
          // Moving Progress
          <Box>
            <Typography variant="h6" gutterBottom>
              Moving Files...
            </Typography>
            
            {moveProgress && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Progress: {moveProgress.completed}/{moveProgress.total} files
                  </Typography>
                  <Typography variant="body2">
                    {Math.round(moveProgress.progress * 100)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={moveProgress.progress * 100} 
                />
                {moveProgress.currentFile && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Currently processing: {moveProgress.currentFile}
                  </Typography>
                )}
              </Box>
            )}

            <Alert severity="info" icon={<Info />}>
              Please wait while files are being moved to the archive directory.
              Do not close this dialog.
            </Alert>
          </Box>
        ) : (
          // Confirmation Content
          <Box>
            {/* Archive Directory Status */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: archiveDirectory ? 'success.light' : 'warning.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FolderOpen />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">
                    Archive Directory
                  </Typography>
                  {archiveDirectory ? (
                    <Typography variant="body2">
                      Files will be moved to: <strong>{archiveDirectory.path}</strong>
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No archive directory selected
                    </Typography>
                  )}
                </Box>
                <Button
                  variant={archiveDirectory ? "outlined" : "contained"}
                  startIcon={<CreateNewFolder />}
                  onClick={handleSelectArchive}
                  size="small"
                >
                  {archiveDirectory ? "Change Location" : "Choose Location"}
                </Button>
              </Box>
            </Paper>

            {/* Archive Selector */}
            {showArchiveSelector && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Archive Directory Required
                </Typography>
                <Typography variant="body2">
                  Please select a parent directory where the 'dedupelocal' archive folder will be created.
                </Typography>
              </Alert>
            )}

            {/* Files to Move */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6">
                  Files to Move ({filesToMove.length})
                </Typography>
                <Chip 
                  label={`Total size: ${formatFileSize(totalSize)}`}
                  size="small"
                  color="info"
                />
              </Box>

              <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                <List dense>
                  {filesToMove.map((file, index) => (
                    <ListItem key={`${file.path}-${index}`}>
                      <ListItemIcon>
                        <DriveFileMove fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name || file.fileName}
                        secondary={
                          <Box>
                            <Typography variant="caption" component="div">
                              {file.path}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(file.size || 0)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>

            {/* Important Notes */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                What will happen:
              </Typography>
              <Typography variant="body2" component="div">
                • Files will be moved to: <code>{archiveDirectory?.path || 'dedupelocal'}</code>
                <br />
                • Name conflicts will be resolved with underscores (file_1.jpg, file_2.jpg)
                <br />
                • A JSON manifest file will be created with details of all operations
                <br />
                • Original files will be removed from their current locations
              </Typography>
            </Alert>

            <Alert severity="warning" icon={<Warning />}>
              <Typography variant="body2">
                This operation cannot be undone automatically. Files will be moved to the archive directory.
                Make sure you have the correct archive location selected.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      {!isMoving && (
        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            variant="contained"
            color="warning"
            disabled={!archiveDirectory || filesToMove.length === 0}
            startIcon={<DriveFileMove />}
          >
            Move {filesToMove.length} Files
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}