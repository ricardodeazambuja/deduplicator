import { useState } from 'react'
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
  Link
} from '@mui/material'
import { ExpandMore, Delete, Info, OpenInNew, FolderOpen, DriveFileMove } from '@mui/icons-material'

export default function DuplicateResults({ duplicateGroups, onDeleteFiles, onMoveFiles }) {
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  if (!duplicateGroups || duplicateGroups.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No duplicate files found
        </Typography>
      </Paper>
    )
  }

  const handleFileSelection = (filePath) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath)
    } else {
      newSelected.add(filePath)
    }
    setSelectedFiles(newSelected)
  }

  const handleGroupSelection = (groupFiles, selectAll) => {
    const newSelected = new Set(selectedFiles)
    groupFiles.forEach((file, index) => {
      if (selectAll) {
        // Safety feature: Never select the first file (index 0) when selecting all
        // This ensures users always keep at least one copy of each duplicate group
        if (index > 0) {
          newSelected.add(file.path)
        }
      } else {
        newSelected.delete(file.path)
      }
    })
    setSelectedFiles(newSelected)
  }

  const handleDeleteSelected = () => {
    if (selectedFiles.size === 0) return
    
    // Find file handles for selected files
    const filesToDelete = []
    duplicateGroups.forEach(group => {
      group.forEach(file => {
        if (selectedFiles.has(file.path)) {
          filesToDelete.push({
            fileHandle: file.fileHandle,
            fileName: file.name,
            filePath: file.path,
            fileSize: file.size
          })
        }
      })
    })
    
    onDeleteFiles(filesToDelete)
  }

  const handleMoveSelected = () => {
    const filesToMove = duplicateGroups.flatMap(group => 
      group.filter(file => selectedFiles.has(file.path))
        .map(file => ({
          ...file,
          groupId: `exact-${group[0]?.hash || 'unknown'}`
        }))
    )
    
    onMoveFiles(filesToMove)
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
        const groupId = `group-${groupIndex}`
        const isExpanded = expandedGroups.has(groupId)
        const selectedInGroup = group.filter(file => selectedFiles.has(file.path)).length
        // For safety, "all selected" means all except the first file (keep one copy)
        const safeSelectCount = Math.max(0, group.length - 1)
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
                  onChange={(e) => {
                    e.stopPropagation()
                    handleGroupSelection(group, !allSelected)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ ml: 1 }}>
                  <Typography variant="subtitle1">
                    {group.length} identical files ({formatFileSize(group[0]?.size || 0)})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hash: {group[0]?.hash?.substring(0, 16)}... • Keep 1, select {Math.max(0, group.length - 1)}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <Info sx={{ fontSize: 16, mr: 1 }} />
                  These files are identical. Files marked "Keep" will be preserved. 
                  Select files to delete, or use the group checkbox to select all but the first file at once.
                </Typography>
              </Alert>
              
              <List dense>
                {group.map((file, fileIndex) => {
                  const isSelected = selectedFiles.has(file.path)
                  const showKeepIndicator = !isSelected
                  
                  return (
                    <ListItem
                      key={`${groupId}-${fileIndex}`}
                      sx={{ 
                        border: 1, 
                        borderColor: showKeepIndicator ? 'success.main' : 'divider',
                        borderRadius: 1, 
                        mb: 1,
                        bgcolor: isSelected ? 'action.selected' : showKeepIndicator ? 'success.50' : 'background.paper',
                        position: 'relative'
                      }}
                    >
                      {showKeepIndicator && (
                        <Chip
                          label="Keep"
                          size="small"
                          color="success"
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
                        onChange={() => handleFileSelection(file.path)}
                        title={isSelected ? "Unselect to keep this file" : "Select to delete this duplicate"}
                      />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {file.name}
                          </Typography>
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