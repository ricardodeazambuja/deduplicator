import React, { useState } from 'react'
import { 
  Box, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Chip,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Link,
  Radio,
  FormControlLabel
} from '@mui/material'
import { ExpandMore, Delete, Info, OpenInNew, FolderOpen, DriveFileMove, Star } from '@mui/icons-material'
import { useFileGroupSelection } from '../hooks/useFileGroupSelection'
import OriginalFileSelector from './OriginalFileSelector'
import FileSelectionChip from './FileSelectionChip'

export default function DuplicateResults({ duplicateGroups, onDeleteFiles, onMoveFiles, onOperationSuccess, onOperationError }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set())
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
    duplicateGroups.forEach((group, index) => {
      const groupId = `exact-${index}`
      if (!originalFiles.has(groupId) && group.length > 0) {
        handleOriginalSelection(groupId, group[0].path)
      }
    })
  }, [duplicateGroups, originalFiles, handleOriginalSelection])

  if (!duplicateGroups || duplicateGroups.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No duplicate files found
        </Typography>
      </Paper>
    )
  }


  const handleDeleteSelected = () => {
    if (selectedFiles.size === 0) return
    
    const filesToDelete = []
    duplicateGroups.forEach((group, index) => {
      const groupId = `exact-${index}`
      group.forEach(file => {
        if (selectedFiles.has(file.path) && getFileState(file.path) === 'exists') {
          filesToDelete.push({
            ...file,
            groupId
          })
        }
      })
    })
    
    onDeleteFiles(filesToDelete, handleOpSuccess, handleOpError)
  }

  const handleMoveSelected = () => {
    if (selectedFiles.size === 0) return
    
    const filesToMove = []
    duplicateGroups.forEach((group, index) => {
      const groupId = `exact-${index}`
      group.forEach(file => {
        if (selectedFiles.has(file.path) && getFileState(file.path) === 'exists') {
          filesToMove.push({
            ...file,
            groupId
          })
        }
      })
    })
    
    onMoveFiles(filesToMove, handleOpSuccess, handleOpError)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleOpenFileLocation = async (file) => {
    try {
      // Create a proper file URL that can be opened
      const fileUrl = `file://${file.path}`
      
      // Try to open the file URL in a new tab/window
      // This will either open the file or show it in the file manager
      const newWindow = window.open(fileUrl, '_blank')
      
      if (!newWindow) {
        // If popup blocked, copy to clipboard as fallback
        await navigator.clipboard.writeText(file.path)
        alert(`Popup blocked. File path copied to clipboard:\n${file.path}\n\nYou can paste this path into your file manager's address bar.`)
      }
    } catch (error) {
      // Fallback: copy path to clipboard with instructions
      try {
        await navigator.clipboard.writeText(file.path)
        alert(`File path copied to clipboard:\n${file.path}\n\nTo open the location:\n1. Open your file manager\n2. Paste the path (Ctrl+V) into the address bar\n3. Press Enter`)
      } catch (clipboardError) {
        // Last resort: show the path
        const userAgent = navigator.userAgent.toLowerCase()
        const instructions = userAgent.includes('win') 
          ? 'Press Win+R, type "explorer", then navigate to:'
          : userAgent.includes('mac')
          ? 'Press Cmd+Space, type "finder", then navigate to:'
          : 'Open your file manager and navigate to:'
        
        alert(`${instructions}\n\n${file.path}`)
      }
    }
  }

  const totalDuplicateFiles = duplicateGroups.reduce((sum, group) => sum + group.length, 0)
  const wastedSpace = duplicateGroups.reduce((sum, group) => {
    // Calculate wasted space (total size - size of one file)
    const fileSize = group[0]?.size || 0
    return sum + (fileSize * (group.length - 1))
  }, 0)

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Duplicate Files Found
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip 
            label={`${duplicateGroups.length} duplicate groups`} 
            color="primary" 
          />
          <Chip 
            label={`${totalDuplicateFiles} files total`} 
            color="secondary" 
          />
          <Chip 
            label={`${formatFileSize(wastedSpace)} wasted space`} 
            color="warning" 
          />
        </Box>

        {selectedFiles.size > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {selectedFiles.size} files selected
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={handleDeleteSelected}
              size="small"
            >
              Delete Selected ({selectedFiles.size})
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<DriveFileMove />}
              onClick={handleMoveSelected}
              size="small"
            >
              Move Selected ({selectedFiles.size})
            </Button>
          </Box>
        )}
      </Paper>

      {duplicateGroups.map((group, groupIndex) => {
        const groupId = `exact-${groupIndex}`
        const isExpanded = expandedGroups.has(groupId)
        const originalFile = originalFiles.get(groupId)
        const hasOriginal = originalFile !== undefined
        const selectedInGroup = group.filter(file => selectedFiles.has(file.path)).length
        // Safe select count is total files minus the original (if selected)
        const safeSelectCount = hasOriginal ? Math.max(0, group.length - 1) : 0
        const allSelected = selectedInGroup === safeSelectCount && safeSelectCount > 0
        const someSelected = selectedInGroup > 0 && selectedInGroup < safeSelectCount

        return (
          <Accordion
            key={groupId}
            expanded={isExpanded}
            onChange={() => {
              const newExpanded = new Set(expandedGroups)
              if (isExpanded) {
                newExpanded.delete(groupId)
              } else {
                newExpanded.add(groupId)
              }
              setExpandedGroups(newExpanded)
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mr: 1 }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={!hasOriginal}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleGroupSelectAll(group, !allSelected, groupId)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ ml: 1 }}>
                  <Typography variant="subtitle1">
                    {group.length} identical files ({formatFileSize(group[0]?.size || 0)})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hash: {group[0]?.hash?.substring(0, 16)}... • {hasOriginal ? `Original selected, can select ${safeSelectCount}` : 'Select original file first'}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Alert severity={hasOriginal ? "info" : "warning"} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <Info sx={{ fontSize: 16, mr: 1 }} />
                  {hasOriginal 
                    ? "Select which files to delete. The original file (marked with ⭐) will be preserved."
                    : "⚠️ Please select which file is the original using the radio buttons below. Then you can select files to delete."
                  }
                </Typography>
              </Alert>
              
              <List dense>
                {group.map((file, fileIndex) => {
                  const isSelected = selectedFiles.has(file.path)
                  const isOriginal = originalFile === file.path
                  const showKeepIndicator = isOriginal || !isSelected
                  
                  return (
                    <ListItem
                      key={`${groupId}-${fileIndex}`}
                      sx={{ 
                        border: 1, 
                        borderColor: isOriginal ? 'success.main' : 'divider',
                        borderRadius: 1, 
                        mb: 1,
                        bgcolor: isSelected ? 'action.selected' : isOriginal ? 'success.light' : 'background.paper',
                        position: 'relative'
                      }}
                    >
                      <OriginalFileSelector
                        groupId={groupId}
                        filePath={file.path}
                        isOriginal={isOriginal}
                        onOriginalSelect={handleOriginalSelection}
                        disabled={getFileState(file.path) !== 'exists'}
                        fileState={getFileState(file.path)}
                      />
                      {isOriginal && (
                        <Chip
                          label="Original"
                          size="small"
                          color="success"
                          variant="filled"
                          icon={<Star />}
                          sx={{ 
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                      )}
                      <Checkbox
                        checked={isSelected}
                        disabled={isOriginal || getFileState(file.path) !== 'exists'}
                        onChange={() => handleFileSelection(file.path)}
                        title={isOriginal ? "Cannot select original for deletion" : isSelected ? "Unselect to keep this file" : "Select to delete this duplicate"}
                      />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="subtitle2"
                            sx={{
                              textDecoration: getFileState(file.path) === 'deleted' ? 'line-through' : 'none',
                              opacity: getFileState(file.path) === 'exists' ? 1 : 0.7
                            }}
                          >
                            {file.name}
                          </Typography>
                          <FileSelectionChip
                            fileState={getFileState(file.path)}
                            isOriginal={isOriginal}
                            isSelected={isSelected}
                            destinationPath={null}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" component="span">
                              Path: 
                            </Typography>
                            <Link
                              component="button"
                              variant="body2"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleOpenFileLocation(file)
                              }}
                              sx={{ 
                                textAlign: 'left',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                color: 'primary.main',
                                '&:hover': {
                                  color: 'primary.dark',
                                  textDecoration: 'underline'
                                }
                              }}
                            >
                              {file.path}
                            </Link>
                            <Tooltip title="Click path above to open location">
                              <FolderOpen 
                                fontSize="small" 
                                sx={{ 
                                  color: 'primary.main',
                                  ml: 0.5
                                }} 
                              />
                            </Tooltip>
                          </Box>
                          <Typography variant="body2" component="span" color="text.secondary">
                            Modified: {new Date(file.lastModified).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
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