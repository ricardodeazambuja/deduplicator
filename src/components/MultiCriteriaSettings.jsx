import { 
  Box, 
  Typography, 
  FormGroup, 
  FormControlLabel, 
  Checkbox, 
  Slider, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material'
import { ExpandMore, Settings, Sort, ArrowUpward, ArrowDownward } from '@mui/icons-material'

export default function MultiCriteriaSettings({ 
  matchingCriteria, 
  onMatchingCriteriaChange,
  criteriaWeights,
  onCriteriaWeightsChange,
  priorityOrder,
  onPriorityOrderChange,
  filenameThreshold,
  onFilenameThresholdChange,
  disabled 
}) {
  
  const handleCriteriaChange = (criterion, enabled) => {
    onMatchingCriteriaChange({
      ...matchingCriteria,
      [criterion]: enabled
    })
  }

  const handleWeightChange = (criterion, weight) => {
    onCriteriaWeightsChange({
      ...criteriaWeights,
      [criterion]: weight / 100 // Convert percentage to decimal
    })
  }

  const movePriority = (criterion, direction) => {
    const currentIndex = priorityOrder.indexOf(criterion)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= priorityOrder.length) return

    const newOrder = [...priorityOrder]
    newOrder[currentIndex] = priorityOrder[newIndex]
    newOrder[newIndex] = criterion
    
    onPriorityOrderChange(newOrder)
  }

  const getCriterionDescription = (criterion) => {
    switch (criterion) {
      case 'exact':
        return 'Identical files (SHA-256 hash match)'
      case 'filename':
        return 'Similar filenames (ignoring copies, versions)'
      case 'similarity':
        return 'Similar content (MinHash algorithm)'
      default:
        return ''
    }
  }

  const getCriterionChipColor = (criterion) => {
    switch (criterion) {
      case 'exact':
        return 'success'
      case 'filename':
        return 'primary'
      case 'similarity':
        return 'secondary'
      default:
        return 'default'
    }
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion disabled={disabled}>
        <AccordionSummary 
          expandIcon={<ExpandMore />}
          sx={{ 
            bgcolor: 'primary.light', 
            color: 'primary.contrastText',
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground'
            }
          }}
        >
          <Settings sx={{ mr: 1 }} />
          <Typography variant="h6">Multi-Criteria Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            
            {/* Criteria Selection */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detection Methods
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose which methods to combine for finding duplicates
                  </Typography>
                  
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={matchingCriteria.exact}
                          onChange={(e) => handleCriteriaChange('exact', e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">Exact Match</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getCriterionDescription('exact')}
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={matchingCriteria.filename}
                          onChange={(e) => handleCriteriaChange('filename', e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">Filename Match</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getCriterionDescription('filename')}
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={matchingCriteria.similarity}
                          onChange={(e) => handleCriteriaChange('similarity', e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">Content Similarity</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getCriterionDescription('similarity')}
                          </Typography>
                        </Box>
                      }
                    />
                  </FormGroup>

                  {/* Filename Mode & Threshold */}
                  {matchingCriteria.filename && (
                    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body1" gutterBottom fontWeight="bold">
                        Filename Matching Configuration
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Configure how filename similarity is detected in multi-criteria mode
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        <strong>Note:</strong> This uses simplified settings for multi-criteria. 
                        For full filename control, use dedicated Filename Match mode.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Priority Order */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Sort sx={{ mr: 1 }} />
                    <Typography variant="h6">Priority Order</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Use arrows to reorder detection methods by priority (highest first)
                  </Typography>
                  
                  <List dense>
                    {priorityOrder.map((criterion, index) => (
                      <ListItem
                        key={criterion}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1
                        }}
                        secondaryAction={
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => movePriority(criterion, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUpward />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => movePriority(criterion, 'down')}
                              disabled={index === priorityOrder.length - 1}
                            >
                              <ArrowDownward />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={`${index + 1}`} 
                                size="small" 
                                color="primary"
                              />
                              <Chip 
                                label={criterion.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                size="small"
                                color={getCriterionChipColor(criterion)}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={getCriterionDescription(criterion)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Weights Configuration */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detection Weights
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Adjust how much each method contributes to the final confidence score
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {Object.entries(criteriaWeights).map(([criterion, weight]) => (
                      <Grid item xs={12} sm={4} key={criterion}>
                        <Box>
                          <Typography variant="body1" gutterBottom>
                            {criterion.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Weight: {Math.round(weight * 100)}%
                          </Typography>
                          <Slider
                            value={weight * 100}
                            onChange={(_, value) => handleWeightChange(criterion, value)}
                            min={0}
                            max={100}
                            step={5}
                            marks={[
                              { value: 0, label: '0%' },
                              { value: 25, label: '25%' },
                              { value: 50, label: '50%' },
                              { value: 75, label: '75%' },
                              { value: 100, label: '100%' }
                            ]}
                            color={getCriterionChipColor(criterion)}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="caption" color="text.secondary">
                    <strong>Tip:</strong> Higher weights give more importance to that detection method. 
                    The sum doesn't need to equal 100% - weights are normalized automatically.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}