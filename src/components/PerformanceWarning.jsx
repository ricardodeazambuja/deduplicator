import { Alert, AlertTitle, Box, Typography, Button, Chip } from '@mui/material'
import { Warning, Error, Memory, Speed } from '@mui/icons-material'

export default function PerformanceWarning({ 
  warnings = [], 
  onProceed, 
  onOptimize, 
  recommendations 
}) {
  if (!warnings || warnings.length === 0) return null

  const hasError = warnings.some(w => w.level === 'error')
  const hasWarning = warnings.some(w => w.level === 'warning')

  const getSeverity = () => {
    if (hasError) return 'error'
    if (hasWarning) return 'warning'
    return 'info'
  }

  const getIcon = () => {
    if (hasError) return <Error />
    if (hasWarning) return <Warning />
    return <Memory />
  }

  return (
    <Alert 
      severity={getSeverity()} 
      icon={getIcon()}
      sx={{ mb: 3 }}
    >
      <AlertTitle>Performance Warning</AlertTitle>
      
      {warnings.map((warning, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">
            {warning.message}
          </Typography>
          {warning.suggestion && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              💡 {warning.suggestion}
            </Typography>
          )}
        </Box>
      ))}

      {recommendations && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Recommendations for your device:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip 
              icon={<Speed />}
              label={`Max files: ${recommendations.maxFiles}`} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              icon={<Memory />}
              label={`Memory limit: ${recommendations.maxMemory ? 
                (recommendations.maxMemory / 1024 / 1024).toFixed(0) + 'MB' : 'Unknown'}`} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              label={`Device: ${recommendations.device || 'Unknown'}`} 
              size="small" 
              variant="outlined"
            />
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {!hasError && (
          <Button 
            variant="outlined" 
            size="small" 
            onClick={onProceed}
            color={hasWarning ? "warning" : "primary"}
          >
            Proceed Anyway
          </Button>
        )}
        
        {onOptimize && (
          <Button 
            variant="contained" 
            size="small" 
            onClick={onOptimize}
            color="primary"
          >
            Optimize Settings
          </Button>
        )}
      </Box>

      {hasError && (
        <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
          ⚠️ Scanning is not recommended with current settings. Please reduce the number of files or try batch processing.
        </Typography>
      )}
    </Alert>
  )
}