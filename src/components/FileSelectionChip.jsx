import { Chip } from '@mui/material'
import { Star, Delete, DriveFileMove, Error } from '@mui/icons-material'

export default function FileSelectionChip({ fileState, isOriginal, isSelected, destinationPath }) {
  // Handle different file states
  switch (fileState) {
    case 'deleted':
      return (
        <Chip 
          label="DELETED" 
          size="small" 
          color="error"
          variant="filled"
          icon={<Delete />}
          sx={{ textDecoration: 'line-through' }}
        />
      )
    
    case 'moved':
      return (
        <Chip 
          label={destinationPath ? `MOVED TO: ${destinationPath}` : "MOVED"} 
          size="small" 
          color="warning"
          variant="filled"
          icon={<DriveFileMove />}
          title={destinationPath ? `File moved to: ${destinationPath}` : "File has been moved"}
        />
      )
    
    case 'error':
      return (
        <Chip 
          label="OPERATION FAILED" 
          size="small" 
          color="error"
          variant="outlined"
          icon={<Error />}
        />
      )
    
    case 'exists':
    default:
      // Show original/keep indicators for existing files
      if (isOriginal) {
        return (
          <Chip 
            label="Original" 
            size="small" 
            color="primary"
            variant="filled"
            icon={<Star />}
          />
        )
      }
      
      if (!isSelected) {
        return (
          <Chip 
            label="Keep" 
            size="small" 
            color="info"
            variant="outlined"
          />
        )
      }
      
      return null
  }
}