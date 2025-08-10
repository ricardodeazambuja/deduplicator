import { 
  Box, 
  Typography, 
  Slider, 
  Paper, 
  Chip, 
  Alert,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material'
import { 
  CompareArrows, 
  Security, 
  Tune 
} from '@mui/icons-material'

export default function SimilarityThresholdControl({ 
  threshold, 
  onThresholdChange, 
  disabled,
  title = "Content Similarity Threshold",
  description = "Files with {percentage} or higher similarity will be grouped together",
  showPresets = true
}) {
  
  const presets = [
    { value: 1.0, label: 'Identical Only', description: 'Only exactly identical content', icon: <Security /> },
    { value: 0.95, label: 'Nearly Identical', description: 'Almost identical with minor differences', icon: <CompareArrows /> },
    { value: 0.8, label: 'Very Similar', description: 'Clearly related with some differences', icon: <CompareArrows /> },
    { value: 0.6, label: 'Similar', description: 'Moderate similarity, may include some false positives', icon: <Tune /> }
  ]
  
  const marks = [
    { value: 0.5, label: '50%' },
    { value: 0.6, label: '60%' },
    { value: 0.7, label: '70%' },
    { value: 0.8, label: '80%' },
    { value: 0.9, label: '90%' },
    { value: 0.95, label: '95%' },
    { value: 1.0, label: '100%' }
  ]

  const getThresholdDescription = (value) => {
    if (value >= 1.0) return { text: "Identical Only", color: "success" }
    if (value >= 0.95) return { text: "Nearly Identical", color: "info" }
    if (value >= 0.85) return { text: "Very Similar", color: "primary" }
    if (value >= 0.7) return { text: "Similar", color: "warning" }
    if (value >= 0.5) return { text: "Somewhat Similar", color: "error" }
    return { text: "Loosely Similar", color: "error" }
  }

  const thresholdDesc = getThresholdDescription(threshold)
  
  const handlePresetClick = (preset) => {
    if (preset.value !== threshold) {
      onThresholdChange(preset.value)
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CompareArrows />
        {title}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Control how similar file content needs to be to be considered duplicates
      </Typography>

      {showPresets && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Quick Presets
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, mb: 3 }}>
            {presets.map((preset) => (
              <Box
                key={preset.value}
                onClick={() => handlePresetClick(preset)}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: Math.abs(threshold - preset.value) < 0.01 ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: Math.abs(threshold - preset.value) < 0.01 ? 'primary.light' : 'inherit',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: Math.abs(threshold - preset.value) < 0.01 ? 'primary.light' : 'action.hover',
                    borderColor: 'primary.main'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {preset.icon}
                  <Typography variant="body2" fontWeight="bold">
                    {preset.label}
                  </Typography>
                  <Chip size="small" label={`${Math.round(preset.value * 100)}%`} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {preset.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
      
      <Typography variant="subtitle2" gutterBottom>
        Custom Threshold: {Math.round(threshold * 100)}%
      </Typography>
      
      <Box sx={{ px: 2, mb: 2 }}>
        <Slider
          value={threshold}
          onChange={(e, newValue) => onThresholdChange(newValue)}
          disabled={disabled}
          min={0.5}
          max={1.0}
          step={0.01}
          marks={marks}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
        />
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">
            Current Setting: {thresholdDesc.text}
          </Typography>
          <Chip
            label={`${Math.round(threshold * 100)}%`}
            color={thresholdDesc.color}
            size="small"
          />
        </Box>
        <Typography variant="body2">
          {description.replace('{percentage}', `${Math.round(threshold * 100)}%`)}
        </Typography>
      </Alert>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        <strong>Tip:</strong> Set to 100% for exact matches only, or use lower values to find similar content. 
        Very low thresholds may produce false positives.
      </Typography>
    </Paper>
  )
}