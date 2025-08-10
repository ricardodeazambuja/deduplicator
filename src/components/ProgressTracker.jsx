import { Box, Typography, LinearProgress, Paper, Button, Alert } from '@mui/material'
import { Stop } from '@mui/icons-material'

export default function ProgressTracker({ 
  isScanning, 
  progress, 
  currentFile, 
  scanPhase,
  completedFiles, 
  totalFiles,
  onCancel,
  isCancelRequested,
  scanError 
}) {
  if (!isScanning && progress === 0 && !scanError) return null

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {isScanning ? (isCancelRequested ? 'Cancelling...' : 'Scanning Files...') : 'Scan Complete'}
        </Typography>
        
        {isScanning && onCancel && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Stop />}
            onClick={onCancel}
            disabled={isCancelRequested}
            size="small"
          >
            {isCancelRequested ? 'Cancelling...' : 'Stop'}
          </Button>
        )}
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <LinearProgress 
          variant="determinate" 
          value={progress * 100} 
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
      
      {scanError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {scanError}
        </Alert>
      )}
      
      {scanPhase && (
        <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
          {scanPhase}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {completedFiles !== undefined && totalFiles !== undefined 
            ? `${completedFiles} of ${totalFiles} files processed`
            : `${Math.round(progress * 100)}% complete`
          }
        </Typography>
      </Box>
      
      {currentFile && (
        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            <strong>Processing:</strong> {currentFile}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}