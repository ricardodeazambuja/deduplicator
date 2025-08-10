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
  Paper,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import { 
  CheckCircle, 
  Error, 
  DriveFileMove,
  FolderOpen,
  Description,
  Close,
  ExpandMore,
  Info,
  Warning
} from '@mui/icons-material'

export default function MoveResultsDialog({
  open,
  onClose,
  moveResults = null
}) {
  if (!moveResults) return null

  const { operations = [], manifest, archiveDirectory, directoryCreated } = moveResults
  const successCount = operations.filter(op => op.success).length
  const failureCount = operations.filter(op => !op.success).length
  const totalCount = operations.length

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleOpenArchive = async () => {
    if (archiveDirectory) {
      try {
        // Copy archive directory path to clipboard as fallback
        await navigator.clipboard.writeText(archiveDirectory)
        alert(`Archive directory path copied to clipboard:\n${archiveDirectory}\n\nTo open:\n1. Open your file manager\n2. Paste the path (Ctrl+V) into the address bar\n3. Press Enter`)
      } catch (error) {
        alert(`Archive directory location:\n${archiveDirectory}\n\nOpen this path in your file manager.`)
      }
    }
  }

  const successfulOperations = operations.filter(op => op.success)
  const failedOperations = operations.filter(op => !op.success)

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {failureCount === 0 ? (
          <CheckCircle color="success" />
        ) : successCount === 0 ? (
          <Error color="error" />
        ) : (
          <Warning color="warning" />
        )}
        Move Operation Results
        <IconButton
          onClick={onClose}
          sx={{ ml: 'auto' }}
          size="small"
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Operation Summary
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip 
              label={`${successCount} Successful`}
              color="success"
              variant={successCount > 0 ? "filled" : "outlined"}
            />
            <Chip 
              label={`${failureCount} Failed`}
              color="error" 
              variant={failureCount > 0 ? "filled" : "outlined"}
            />
            <Chip 
              label={`${totalCount} Total`}
              color="info"
            />
          </Box>

          {archiveDirectory && (
            <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FolderOpen />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">
                    Archive Directory
                  </Typography>
                  <Typography variant="body2">
                    {archiveDirectory}
                  </Typography>
                  {directoryCreated && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {directoryCreated.wasRenamed 
                        ? `Directory created as "${directoryCreated.name}" (renamed from "${directoryCreated.originalName}")` 
                        : `Directory "${directoryCreated.name}" created successfully`}
                    </Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  onClick={handleOpenArchive}
                  startIcon={<FolderOpen />}
                >
                  Open Location
                </Button>
              </Box>
            </Paper>
          )}
        </Box>

        {/* Manifest Information */}
        {manifest && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Move Log Created
            </Typography>
            <Typography variant="body2">
              {manifest.manifest_file ? (
                <>A detailed log file <code>{manifest.manifest_file}</code> has been saved to the archive directory.</>
              ) : (
                <>Move operations have been logged with session ID: {manifest.session_id}</>
              )}
              {manifest.total_files_moved > 0 && (
                <> Successfully moved {manifest.total_files_moved} files.</>
              )}
            </Typography>
          </Alert>
        )}

        {/* Results Details */}
        <Box>
          {/* Successful Operations */}
          {successfulOperations.length > 0 && (
            <Accordion defaultExpanded={failedOperations.length === 0}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" fontSize="small" />
                  <Typography variant="subtitle1">
                    Successfully Moved ({successfulOperations.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {successfulOperations.map((operation, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={operation.fileName}
                        secondary={`Moved successfully`}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Failed Operations */}
          {failedOperations.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Error color="error" fontSize="small" />
                  <Typography variant="subtitle1">
                    Failed to Move ({failedOperations.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {failedOperations.map((operation, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Error color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={operation.fileName}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="error">
                              Error: {operation.error}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>

        {/* Additional Information */}
        {totalCount > 0 && (
          <Box sx={{ mt: 3 }}>
            <Alert severity={failureCount === 0 ? "success" : "warning"}>
              <Typography variant="body2">
                {failureCount === 0 ? (
                  <>
                    🎉 All files were successfully moved to the archive directory!
                    The original files have been removed from their previous locations.
                  </>
                ) : (
                  <>
                    {successCount > 0 && `${successCount} files were moved successfully. `}
                    {failureCount > 0 && `${failureCount} files could not be moved due to errors. `}
                    Files that failed to move remain in their original locations.
                  </>
                )}
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Manifest Details */}
        {manifest && manifest.summary && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Operation completed at {new Date(manifest.timestamp).toLocaleString()}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {archiveDirectory && (
          <Button 
            onClick={handleOpenArchive}
            startIcon={<FolderOpen />}
          >
            Open Archive
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}