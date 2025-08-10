import { 
  Box, 
  Typography, 
  Paper, 
  ToggleButtonGroup, 
  ToggleButton,
  Slider,
  Alert,
  Chip,
  Divider
} from '@mui/material'
import { 
  CheckCircle, 
  Psychology, 
  Tune, 
  FindInPage 
} from '@mui/icons-material'

export default function FilenameThresholdControl({ 
  mode = 'smart',
  threshold = 0.8,
  onModeChange,
  onThresholdChange,
  disabled 
}) {
  
  const getModeDescription = (selectedMode) => {
    switch (selectedMode) {
      case 'exact':
        return {
          title: 'Exact Match Only',
          description: 'ONLY files with completely identical names (including extension)',
          examples: '✓ document.txt = document.txt   ✗ document.txt ≠ document.pdf',
          color: 'success'
        }
      case 'exact-base':
        return {
          title: 'Same Base Name',
          description: 'Same base filename, any extension (ignores extension differences)',
          examples: '✓ document.txt = document.pdf   ✗ document.txt ≠ report.txt',
          color: 'info'  
        }
      case 'smart':
        return {
          title: 'Smart Pattern Matching',
          description: 'Finds variations like copies, duplicates, and version numbers',
          examples: '✓ document.txt = "document copy.txt" or "document (1).txt"',
          color: 'primary'
        }
      case 'fuzzy':
        return {
          title: 'Fuzzy Matching',
          description: 'Uses similarity algorithm - finds typos and abbreviations',
          examples: '✓ document.txt might match "documnt.txt" or "doc.txt" (depends on threshold)',
          color: 'warning'
        }
      default:
        return {
          title: 'Unknown Mode',
          description: '',
          examples: '',
          color: 'default'
        }
    }
  }

  const modeInfo = getModeDescription(mode)
  
  const showThresholdSlider = mode === 'fuzzy'

  const getThresholdDescription = (value) => {
    if (value >= 0.95) return { text: "Very Strict", color: "error" }
    if (value >= 0.85) return { text: "Strict", color: "warning" }  
    if (value >= 0.7) return { text: "Moderate", color: "info" }
    if (value >= 0.5) return { text: "Relaxed", color: "success" }
    return { text: "Very Relaxed", color: "default" }
  }

  const thresholdDesc = getThresholdDescription(threshold)

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FindInPage />
        Filename Matching Mode
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose how strictly filenames should be matched for duplicate detection
      </Typography>

      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(e, newMode) => newMode && onModeChange(newMode)}
        disabled={disabled}
        sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}
      >
        <ToggleButton value="exact" sx={{ flex: 1, minWidth: 120 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle sx={{ display: 'block', mb: 0.5 }} />
            <Typography variant="caption">Exact Only</Typography>
          </Box>
        </ToggleButton>
        
        <ToggleButton value="exact-base" sx={{ flex: 1, minWidth: 120 }}>
          <Box sx={{ textAlign: 'center' }}>
            <FindInPage sx={{ display: 'block', mb: 0.5 }} />
            <Typography variant="caption">Same Base</Typography>
          </Box>
        </ToggleButton>
        
        <ToggleButton value="smart" sx={{ flex: 1, minWidth: 120 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Psychology sx={{ display: 'block', mb: 0.5 }} />
            <Typography variant="caption">Smart</Typography>
          </Box>
        </ToggleButton>
        
        <ToggleButton value="fuzzy" sx={{ flex: 1, minWidth: 120 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Tune sx={{ display: 'block', mb: 0.5 }} />
            <Typography variant="caption">Fuzzy</Typography>
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Mode Description */}
      <Alert 
        severity="info" 
        sx={{ mb: showThresholdSlider ? 2 : 0 }}
        icon={false}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {modeInfo.title}
          </Typography>
          <Chip 
            size="small" 
            label={mode.toUpperCase()} 
            color={modeInfo.color}
          />
        </Box>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          {modeInfo.description}
        </Typography>
        
        <Typography variant="caption" color="text.secondary">
          <strong>Example:</strong> {modeInfo.examples}
        </Typography>
      </Alert>

      {/* Threshold Slider for Fuzzy Mode */}
      {showThresholdSlider && (
        <>
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Fuzzy Matching Threshold
          </Typography>
          
          <Box sx={{ px: 2, mb: 2 }}>
            <Slider
              value={threshold}
              onChange={(e, newValue) => onThresholdChange(newValue)}
              disabled={disabled}
              min={0.3}
              max={0.99}
              step={0.05}
              marks={[
                { value: 0.3, label: '30%' },
                { value: 0.5, label: '50%' },
                { value: 0.7, label: '70%' },
                { value: 0.9, label: '90%' },
                { value: 0.99, label: '99%' }
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Files with {Math.round(threshold * 100)}% or higher similarity will be grouped
            </Typography>
            
            <Chip
              label={thresholdDesc.text}
              color={thresholdDesc.color}
              size="small"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>Note:</strong> Higher values are more precise but may miss some duplicates. 
            Lower values find more matches but may include false positives.
          </Typography>
        </>
      )}
    </Paper>
  )
}