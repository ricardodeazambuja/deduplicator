import { 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography, 
  Box, 
  Chip, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Alert,
  Button,
  Stack,
  LinearProgress,
  Grid
} from '@mui/material'
import { 
  ExpandMore, 
  AccountTree, 
  FolderOpen, 
  SelectAll, 
  Delete,
  Info,
  Assessment,
  Insights,
  Security,
  FindInPage,
  CompareArrows,
  Star
} from '@mui/icons-material'
import { formatBytes } from '../utils/formatters'

export default function MultiCriteriaResults({ 
  groups = [], 
  onFileDelete, 
  isDeleting = false,
  selectedFiles = new Set(),
  onFileSelectionChange
}) {
  const handleGroupSelectAll = (group, selectAll) => {
    const updatedSelection = new Set(selectedFiles)
    
    if (selectAll) {
      // Select all files in the group (skip first file for safety)
      group.files.slice(1).forEach(file => {
        updatedSelection.add(file.path)
      })
    } else {
      // Deselect all files in the group
      group.files.forEach(file => {
        updatedSelection.delete(file.path)
      })
    }
    
    onFileSelectionChange(updatedSelection)
  }

  const handleFileSelectionChange = (filePath, selected) => {
    const updatedSelection = new Set(selectedFiles)
    
    if (selected) {
      updatedSelection.add(filePath)
    } else {
      updatedSelection.delete(filePath)
    }
    
    onFileSelectionChange(updatedSelection)
  }

  const openFileLocation = async (file) => {
    try {
      if (file.directoryHandle && file.fileHandle) {
        // Try to show the file in the directory (if supported)
        if ('showDirectoryPicker' in window && file.directoryHandle.getDirectoryHandle) {
          await window.showDirectoryPicker({ startIn: file.directoryHandle })
        }
      }
    } catch (error) {
      // Fallback: copy path to clipboard
      try {
        await navigator.clipboard.writeText(file.path)
        console.log('File path copied to clipboard:', file.path)
      } catch (clipboardError) {
        console.error('Could not open file location or copy to clipboard:', error, clipboardError)
      }
    }
  }

  const getCriterionIcon = (criterion) => {
    switch (criterion) {
      case 'exact':
        return <Security />
      case 'filename':
        return <FindInPage />
      case 'similarity':
        return <CompareArrows />
      default:
        return <Assessment />
    }
  }

  const getCriterionColor = (criterion) => {
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

  const getCriterionLabel = (criterion) => {
    switch (criterion) {
      case 'exact':
        return 'Exact Match'
      case 'filename':
        return 'Filename'
      case 'similarity':
        return 'Content Similarity'
      default:
        return criterion
    }
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'success'
    if (confidence >= 0.7) return 'primary'
    if (confidence >= 0.5) return 'warning'
    return 'error'
  }

  if (!groups || groups.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="h6">No multi-criteria duplicates found</Typography>
        <Typography variant="body2">
          No files matched the selected criteria combination. Try adjusting the detection methods or thresholds.
        </Typography>
      </Alert>
    )
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5">Multi-Criteria Duplicates</Typography>
        <Chip 
          label={`${groups.length} groups found`} 
          color="primary"
          icon={<AccountTree />}
        />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Multi-criteria detection</strong> combines multiple detection methods with configurable priorities. 
          Groups are ranked by confidence score based on how well they match the selected criteria.
        </Typography>
      </Alert>

      {groups.map((group, groupIndex) => {
        const groupFiles = group.files || group
        const totalSize = groupFiles.reduce((sum, file) => sum + file.size, 0)
        const selectedInGroup = groupFiles.filter(file => selectedFiles.has(file.path))
        const allSelected = selectedInGroup.length === groupFiles.length
        const someSelected = selectedInGroup.length > 0 && selectedInGroup.length < groupFiles.length

        return (
          <Accordion key={group.id || groupIndex} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                <AccountTree color="primary" />
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">
                    Multi-Criteria Group {groupIndex + 1}
                    <Chip 
                      icon={getCriterionIcon(group.primaryCriterion)}
                      label={getCriterionLabel(group.primaryCriterion)}
                      size="small" 
                      color={getCriterionColor(group.primaryCriterion)}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {groupFiles.length} files • {formatBytes(totalSize)} total
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Confidence Score */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Star color={getConfidenceColor(group.confidence)} />
                    <Typography variant="body2" color={`${getConfidenceColor(group.confidence)}.main`}>
                      {Math.round(group.confidence * 100)}%
                    </Typography>
                  </Box>
                  
                  {/* Criteria Used */}
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {group.criteria.map((criterion, idx) => (
                      <Tooltip key={idx} title={getCriterionLabel(criterion)}>
                        <Chip
                          size="small"
                          icon={getCriterionIcon(criterion)}
                          color={getCriterionColor(criterion)}
                          variant="outlined"
                        />
                      </Tooltip>
                    ))}
                  </Box>
                  
                  <Chip 
                    label={`${selectedInGroup.length}/${groupFiles.length} selected`}
                    size="small"
                    color={selectedInGroup.length > 0 ? "primary" : "default"}
                  />
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              {/* Group Analysis */}
              <Card variant="outlined" sx={{ mb: 2, bgcolor: 'background.paper' }}>
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Assessment color="info" />
                    <Typography variant="h6">Analysis</Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Confidence Score: {Math.round(group.confidence * 100)}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={group.confidence * 100}
                        color={getConfidenceColor(group.confidence)}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Based on {group.criteria.length} detection method(s)
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Detection Methods Used
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {group.criteria.map((criterion, idx) => (
                          <Chip
                            key={idx}
                            size="small"
                            label={getCriterionLabel(criterion)}
                            color={getCriterionColor(criterion)}
                            variant={criterion === group.primaryCriterion ? "filled" : "outlined"}
                          />
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                  
                  {/* Metadata Display */}
                  {group.metadata && Object.keys(group.metadata).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Detection Details
                      </Typography>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        {Object.entries(group.metadata).map(([criterion, meta], idx) => (
                          <Box key={idx}>
                            <Typography variant="caption" color="text.secondary">
                              {getCriterionLabel(criterion)}:
                            </Typography>
                            <Typography variant="body2">
                              {meta.hash && `Hash: ${meta.hash.substring(0, 12)}...`}
                              {meta.baseFilename && `Base: ${meta.baseFilename}`}
                              {meta.avgSimilarity && `${Math.round(meta.avgSimilarity * 100)}% similar`}
                              {meta.algorithm && `${meta.algorithm}`}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<SelectAll />}
                    onClick={() => handleGroupSelectAll(group, !allSelected)}
                    variant={someSelected || allSelected ? "contained" : "outlined"}
                  >
                    {allSelected ? "Deselect All" : someSelected ? "Select All" : "Select All (Safe)"}
                  </Button>
                  
                  {selectedInGroup.length > 0 && (
                    <Button
                      size="small"
                      startIcon={<Delete />}
                      onClick={() => onFileDelete(selectedInGroup.map(f => f.path))}
                      disabled={isDeleting}
                      color="error"
                    >
                      Delete Selected ({selectedInGroup.length})
                    </Button>
                  )}
                </Stack>
              </Box>

              {/* File List */}
              <List dense>
                {groupFiles.map((file, fileIndex) => {
                  const isSelected = selectedFiles.has(file.path)
                  const isFirst = fileIndex === 0
                  
                  return (
                    <ListItem 
                      key={file.path}
                      sx={{
                        border: '1px solid',
                        borderColor: isFirst ? 'success.main' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: isFirst ? 'success.light' : 'inherit'
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleFileSelectionChange(file.path, e.target.checked)}
                          disabled={isDeleting}
                        />
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1">
                              {file.name}
                            </Typography>
                            {isFirst && (
                              <Chip 
                                label="Recommended Keep" 
                                size="small" 
                                color="success"
                                variant="filled"
                                icon={<Star />}
                              />
                            )}
                            {!isSelected && !isFirst && (
                              <Chip 
                                label="Keep" 
                                size="small" 
                                color="info"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {formatBytes(file.size)} • {file.path}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Modified: {new Date(file.lastModified).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <Tooltip title="Open file location">
                          <IconButton 
                            size="small"
                            onClick={() => openFileLocation(file)}
                          >
                            <FolderOpen />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  )
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Box>
  )
}