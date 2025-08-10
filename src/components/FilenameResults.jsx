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
  Radio
} from '@mui/material'
import { 
  ExpandMore, 
  Description, 
  FolderOpen, 
  SelectAll, 
  Delete,
  Info,
  FileCopy,
  Insights,
  DriveFileMove,
  Star
} from '@mui/icons-material'
import { formatBytes } from '../utils/formatters'

export default function FilenameResults({ 
  groups = [], 
  onFileDelete, 
  onFileMove,
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
        // You could show a toast notification here
        console.log('File path copied to clipboard:', file.path)
      } catch (clipboardError) {
        console.error('Could not open file location or copy to clipboard:', error, clipboardError)
      }
    }
  }

  const getFilenameInsights = (group) => {
    const insights = []
    const files = group.files || []
    
    // Check for common patterns
    const hasVersions = files.some(f => /[_-]?v?\d+(\.\d+)*$/.test(f.name))
    const hasCopies = files.some(f => /copy|Copy|COPY/.test(f.name))
    const hasNumbers = files.some(f => /\(\d+\)$/.test(f.name))
    const hasDuplicates = files.some(f => /duplicate|Duplicate|DUPLICATE/.test(f.name))
    
    if (hasVersions) insights.push({ type: 'version', text: 'Contains version numbers' })
    if (hasCopies) insights.push({ type: 'copy', text: 'Contains copy files' })
    if (hasNumbers) insights.push({ type: 'numbered', text: 'Contains numbered files' })
    if (hasDuplicates) insights.push({ type: 'duplicate', text: 'Contains duplicate markers' })
    
    return insights
  }

  if (!groups || groups.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="h6">No filename-based duplicates found</Typography>
        <Typography variant="body2">
          All files have unique base names. Try adjusting the similarity threshold or use a different detection method.
        </Typography>
      </Alert>
    )
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5">Filename-Based Duplicates</Typography>
        <Chip 
          label={`${groups.length} groups found`} 
          color="primary"
          icon={<FileCopy />}
        />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Filename matching</strong> finds files with similar names, ignoring common variations like 
          "copy", "(1)", "duplicate", version numbers, and timestamps. Files are grouped by their base name.
        </Typography>
      </Alert>

      {groups.map((group, groupIndex) => {
        const groupFiles = group.files || group
        const totalSize = groupFiles.reduce((sum, file) => sum + file.size, 0)
        const selectedInGroup = groupFiles.filter(file => selectedFiles.has(file.path))
        const allSelected = selectedInGroup.length === groupFiles.length
        const someSelected = selectedInGroup.length > 0 && selectedInGroup.length < groupFiles.length
        const insights = getFilenameInsights(group)

        return (
          <Accordion key={groupIndex} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                <Description color="primary" />
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">
                    {group.baseFilename || 'Similar Names'}
                    {group.extension && (
                      <Chip 
                        label={`.${group.extension}`} 
                        size="small" 
                        variant="outlined" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {groupFiles.length} files • {formatBytes(totalSize)} total
                    {group.avgSimilarity && (
                      <> • {Math.round(group.avgSimilarity * 100)}% similarity</>
                    )}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {insights.map((insight, idx) => (
                    <Tooltip key={idx} title={insight.text}>
                      <Chip 
                        size="small" 
                        label={insight.type}
                        color="secondary"
                        variant="outlined"
                      />
                    </Tooltip>
                  ))}
                  
                  <Chip 
                    label={`${selectedInGroup.length}/${groupFiles.length} selected`}
                    size="small"
                    color={selectedInGroup.length > 0 ? "primary" : "default"}
                  />
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
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
                    <>
                      <Button
                        size="small"
                        startIcon={<Delete />}
                        onClick={() => onFileDelete(selectedInGroup.map(f => f.path))}
                        disabled={isDeleting}
                        color="error"
                      >
                        Delete Selected ({selectedInGroup.length})
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DriveFileMove />}
                        onClick={() => onFileMove(selectedInGroup)}
                        disabled={isDeleting}
                        color="warning"
                      >
                        Move Selected ({selectedInGroup.length})
                      </Button>
                    </>
                  )}
                </Stack>
              </Box>

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
                                label="Original" 
                                size="small" 
                                color="success"
                                variant="filled"
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

              {insights.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Card variant="outlined" sx={{ bgcolor: 'info.light', borderColor: 'info.main' }}>
                    <CardContent sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Insights color="info" />
                        <Typography variant="subtitle2">Filename Analysis</Typography>
                      </Box>
                      <Typography variant="body2">
                        This group shows patterns typical of {insights.map(i => i.text.toLowerCase()).join(', ')}.
                        Consider keeping the original file and removing the variations.
                      </Typography>
                    </CardContent>
                  </Card>
                </>
              )}
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Box>
  )
}