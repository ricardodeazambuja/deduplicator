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
  Stack
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
import React from 'react'
import { formatBytes } from '../utils/formatters'
import { useFileGroupSelection } from '../hooks/useFileGroupSelection'
import OriginalFileSelector from './OriginalFileSelector'
import FileSelectionChip from './FileSelectionChip'

export default function FilenameResults({ 
  groups = [], 
  onFileDelete, 
  onFileMove,
  isDeleting = false,
  onOperationSuccess,
  onOperationError
}) {
  const {
    selectedFiles,
    originalFiles,
    handleFileSelection,
    handleOriginalSelection,
    handleGroupSelectAll,
    getFileState,
    isFileOriginal,
    getGroupSummary,
    handleOperationSuccess: handleOpSuccess,
    handleOperationError: handleOpError
  } = useFileGroupSelection()

  // Initialize first file as original for each group
  React.useEffect(() => {
    groups.forEach((group, index) => {
      const groupId = `filename-${index}`
      if (!originalFiles.has(groupId) && group.files && group.files.length > 0) {
        handleOriginalSelection(groupId, group.files[0].path)
      }
    })
  }, [groups, originalFiles, handleOriginalSelection])

  const handleDeleteSelected = () => {
    if (selectedFiles.size === 0) return
    
    // Find file handles for selected files
    const filesToDelete = []
    groups.forEach((group, index) => {
      const groupId = `filename-${index}`
      group.files.forEach(file => {
        if (selectedFiles.has(file.path) && getFileState(file.path) === 'exists') {
          filesToDelete.push({
            ...file,
            groupId
          })
        }
      })
    })
    
    onFileDelete(filesToDelete, handleOpSuccess, handleOpError)
  }

  const handleMoveSelected = () => {
    if (selectedFiles.size === 0) return
    
    const filesToMove = []
    groups.forEach((group, index) => {
      const groupId = `filename-${index}`
      group.files.forEach(file => {
        if (selectedFiles.has(file.path) && getFileState(file.path) === 'exists') {
          filesToMove.push({
            ...file,
            groupId
          })
        }
      })
    })
    
    onFileMove(filesToMove, handleOpSuccess, handleOpError)
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
                    onClick={() => handleGroupSelectAll(group, !allSelected, `filename-${groupIndex}`)}
                    variant={someSelected || allSelected ? "contained" : "outlined"}
                  >
                    {allSelected ? "Deselect All" : someSelected ? "Select All" : "Select All (Safe)"}
                  </Button>
                  
                  {selectedInGroup.length > 0 && (
                    <>
                      <Button
                        size="small"
                        startIcon={<Delete />}
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        color="error"
                      >
                        Delete Selected ({selectedFiles.size})
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DriveFileMove />}
                        onClick={handleMoveSelected}
                        disabled={isDeleting}
                        color="warning"
                      >
                        Move Selected ({selectedFiles.size})
                      </Button>
                    </>
                  )}
                </Stack>
              </Box>

              <List dense>
                {groupFiles.map((file, fileIndex) => {
                  const groupId = `filename-${groupIndex}`
                  const isSelected = selectedFiles.has(file.path)
                  const isOriginal = isFileOriginal(groupId, file.path)
                  const fileState = getFileState(file.path)
                  const isDisabled = fileState !== 'exists' || isDeleting
                  
                  return (
                    <ListItem 
                      key={file.path}
                      sx={{
                        border: '1px solid',
                        borderColor: isOriginal ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: isOriginal ? 'primary.light' : 'inherit',
                        opacity: isDisabled ? 0.6 : 1
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                        <OriginalFileSelector
                          groupId={groupId}
                          filePath={file.path}
                          isOriginal={isOriginal}
                          onOriginalSelect={handleOriginalSelection}
                          disabled={isDisabled}
                          fileState={fileState}
                        />
                      </ListItemIcon>
                      <ListItemIcon>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleFileSelection(file.path)}
                          disabled={isDisabled || isOriginal}
                        />
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              variant="body1"
                              sx={{ 
                                textDecoration: fileState === 'deleted' ? 'line-through' : 'none',
                                opacity: fileState === 'exists' ? 1 : 0.7
                              }}
                            >
                              {file.name}
                            </Typography>
                            <FileSelectionChip
                              fileState={fileState}
                              isOriginal={isOriginal}
                              isSelected={isSelected}
                              destinationPath={null} // TODO: Add destination path from operation history
                            />
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