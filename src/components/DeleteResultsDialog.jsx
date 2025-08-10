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
  ListItemIcon,
  Box,
  Alert
} from '@mui/material'
import { CheckCircle, Error, Info } from '@mui/icons-material'

export default function DeleteResultsDialog({
  open,
  onClose,
  deleteResults
}) {
  if (!deleteResults || deleteResults.length === 0) {
    return null
  }

  const successful = deleteResults.filter(result => result.success)
  const failed = deleteResults.filter(result => !result.success)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Deletion Results
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert 
            severity={failed.length === 0 ? "success" : failed.length === deleteResults.length ? "error" : "warning"}
            sx={{ mb: 2 }}
          >
            <Typography variant="body1">
              {successful.length} of {deleteResults.length} files deleted successfully
              {failed.length > 0 && ` (${failed.length} failed)`}
            </Typography>
          </Alert>

          {successful.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                Successfully Deleted ({successful.length})
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {successful.map((result, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={result.fileName}
                      secondary="File deleted successfully"
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {failed.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Error color="error" />
                Failed to Delete ({failed.length})
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {failed.map((result, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Error color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={result.fileName}
                      secondary={`Error: ${result.error}`}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <Info sx={{ fontSize: 16, mr: 1 }} />
                  Files may have failed to delete due to permissions, being in use by another application, 
                  or other system restrictions. You may need to delete these files manually.
                </Typography>
              </Alert>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}