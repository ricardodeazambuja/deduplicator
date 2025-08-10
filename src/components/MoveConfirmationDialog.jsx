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
  Tooltip,
  TextField,
  FormHelperText,
  FormControlLabel,
  Switch
} from '@mui/material'
import { 
  DriveFileMove, 
  FolderOpen, 
  Warning, 
  Info,
  Close,
  CreateNewFolder,
  CheckCircle,
  ErrorOutline,
  Edit
} from '@mui/icons-material'

export default function MoveConfirmationDialog({
  open,
  onClose,
  filesToMove = [],
  parentDirectory,
  customDirectoryName,
  directoryValidation,
  onSelectArchive,
  onUpdateDirectoryName,
  onConfirmMove,
  isMoving = false,
  moveProgress = null,
  useDirectoryDirectly = false,
  onToggleDirectoryMode
}) {
  const [showArchiveSelector, setShowArchiveSelector] = useState(!parentDirectory)

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
    if (!parentDirectory) {
      setShowArchiveSelector(true)
      return
    }
    if (!useDirectoryDirectly && !directoryValidation.valid) {
      return // Don't proceed if directory name is invalid (only when creating subdirectory)
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
            {/* Parent Directory Status */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: parentDirectory ? 'success.light' : 'warning.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FolderOpen />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">
                    Parent Directory
                  </Typography>
                  {parentDirectory ? (
                    <Typography variant="body2">
                      Selected: <strong>{parentDirectory.name}</strong>
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No parent directory selected
                    </Typography>
                  )}
                </Box>
                <Button
                  variant={parentDirectory ? "outlined" : "contained"}
                  startIcon={<CreateNewFolder />}
                  onClick={handleSelectArchive}
                  size="small"
                >
                  {parentDirectory ? "Change Location" : "Choose Location"}
                </Button>
              </Box>
            </Paper>

            {/* Directory Usage Mode Toggle */}
            {parentDirectory && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useDirectoryDirectly}
                      onChange={(e) => onToggleDirectoryMode(e.target.checked)}
                    />
                  }
                  label={useDirectoryDirectly ? 
                    "Move files directly to selected directory" : 
                    "Create subdirectory for files"
                  }
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {useDirectoryDirectly ? 
                    `Files will be moved directly into: ${parentDirectory.name}` :
                    `A new subdirectory will be created inside: ${parentDirectory.name}`
                  }
                </Typography>
              </Paper>
            )}

            {/* Custom Directory Name Input */}
            {parentDirectory && !useDirectoryDirectly && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Archive Directory Name
                </Typography>
                <TextField
                  fullWidth
                  value={customDirectoryName}
                  onChange={(e) => onUpdateDirectoryName(e.target.value)}
                  error={!directoryValidation.valid}
                  helperText={
                    directoryValidation.valid ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {directoryValidation.exists ? (
                          <>
                            <CheckCircle fontSize="small" color="success" />
                            Directory exists
                          </>
                        ) : (
                          <>
                            <Info fontSize="small" color="info" />
                            Directory will be created
                          </>
                        )}
                        {directoryValidation.willBeRenamed && (
                          <>
                            {' • '}
                            <Warning fontSize="small" color="warning" />
                            Will be renamed to: {directoryValidation.finalName}
                          </>
                        )}
                      </Box>
                    ) : (
                      directoryValidation.error
                    )
                  }
                  placeholder="dedupelocal"
                  InputProps={{
                    startAdornment: parentDirectory && (
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        {parentDirectory.name}/
                      </Typography>
                    ),
                  }}
                />
                {directoryValidation.valid && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Full path: <strong>{parentDirectory.name}/{directoryValidation.finalName || customDirectoryName}</strong>
                  </Typography>
                )}
              </Paper>
            )}

            {/* Archive Selector */}
            {showArchiveSelector && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Parent Directory Required
                </Typography>
                <Typography variant="body2">
                  Please select a parent directory where your custom archive folder will be created.
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
                {useDirectoryDirectly ? (
                  <>• Files will be moved directly to: <code>{parentDirectory ? parentDirectory.name : 'Not configured'}</code></>
                ) : (
                  <>• Archive directory will be created: <code>{parentDirectory ? `${parentDirectory.name}/${directoryValidation.finalName || customDirectoryName}` : 'Not configured'}</code></>
                )}
                <br />
                • Files will be moved to the archive directory
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
                Make sure you have the correct parent directory and archive name configured.
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
            disabled={!parentDirectory || (!useDirectoryDirectly && !directoryValidation.valid) || filesToMove.length === 0}
            startIcon={<DriveFileMove />}
          >
            Move {filesToMove.length} Files
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}