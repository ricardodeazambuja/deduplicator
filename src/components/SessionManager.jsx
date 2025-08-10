import { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Menu,
  MenuItem
} from '@mui/material'
import {
  Save,
  FolderOpen,
  Delete,
  Download,
  Edit,
  MoreVert,
  Info
} from '@mui/icons-material'
import { StorageService } from '../services/storageService'

const storageService = new StorageService()

export default function SessionManager({
  currentScanData,
  onLoadSession,
  disabled
}) {
  const [savedSessions, setSavedSessions] = useState([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [storageStats, setStorageStats] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)

  useEffect(() => {
    loadSessions()
    loadStorageStats()
  }, [])

  const loadSessions = async () => {
    try {
      const sessions = await storageService.getAllSessions()
      setSavedSessions(sessions)
    } catch (error) {
      setError('Failed to load saved sessions')
      console.error('Load sessions error:', error)
    }
  }

  const loadStorageStats = async () => {
    try {
      const stats = await storageService.getStorageStats()
      setStorageStats(stats)
    } catch (error) {
      console.error('Load storage stats error:', error)
    }
  }

  const handleSaveSession = async () => {
    if (!currentScanData || !sessionName.trim()) return

    setLoading(true)
    try {
      await storageService.saveSession({
        name: sessionName.trim(),
        ...currentScanData
      })
      
      setShowSaveDialog(false)
      setSessionName('')
      await loadSessions()
      await loadStorageStats()
    } catch (error) {
      setError('Failed to save session')
      console.error('Save session error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSession = async (session) => {
    try {
      onLoadSession(session)
    } catch (error) {
      setError('Failed to load session')
      console.error('Load session error:', error)
    }
  }

  const handleDeleteSession = async (sessionId) => {
    try {
      await storageService.deleteSession(sessionId)
      await loadSessions()
      await loadStorageStats()
    } catch (error) {
      setError('Failed to delete session')
      console.error('Delete session error:', error)
    }
  }

  const handleExportSession = (session) => {
    try {
      const jsonData = storageService.exportSessionAsJSON(session)
      const filename = `dedupe-report-${session.name.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.json`
      storageService.downloadJSON(jsonData, filename)
    } catch (error) {
      setError('Failed to export session')
      console.error('Export session error:', error)
    }
  }

  const handleMenuOpen = (event, session) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setSelectedSession(session)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedSession(null)
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Session Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={() => {
            if (currentScanData) {
              setSessionName(`Scan ${new Date().toLocaleString()}`)
              setShowSaveDialog(true)
            }
          }}
          disabled={!currentScanData || disabled}
        >
          Save Current Results
        </Button>

        {storageStats && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              icon={<Info />}
              label={`${storageStats.sessionCount} sessions`}
              size="small"
            />
            <Chip
              label={`${formatFileSize(storageStats.totalSize)} used`}
              size="small"
            />
          </Box>
        )}
      </Box>

      {savedSessions.length > 0 ? (
        <List>
          {savedSessions.map((session) => (
            <ListItem
              key={session.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
              onClick={() => handleLoadSession(session)}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">
                      {session.name}
                    </Typography>
                    <Chip
                      label={session.scanMode}
                      size="small"
                      color={session.scanMode === 'exact' ? 'primary' : 'secondary'}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" component="span">
                      {formatDate(session.timestamp)} • {session.folderName || 'Unknown folder'}
                    </Typography>
                    <br />
                    <Typography variant="body2" component="span" color="text.secondary">
                      {session.stats.duplicateGroupsCount} groups • {session.stats.duplicateFilesCount} duplicates • {formatFileSize(session.stats.wastedSpace)} wasted
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={(e) => handleMenuOpen(e, session)}
                  size="small"
                >
                  <MoreVert />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          No saved sessions. Complete a scan and save the results to get started.
        </Typography>
      )}

      {/* Save Session Dialog */}
      <Dialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save Scan Results</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session Name"
            fullWidth
            variant="outlined"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            sx={{ mb: 2 }}
          />
          {currentScanData && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                This session will include:
              </Typography>
              <Typography variant="body2">
                • {currentScanData.totalFiles} total files scanned
              </Typography>
              <Typography variant="body2">
                • {currentScanData.duplicateGroups?.length || 0} duplicate groups found
              </Typography>
              <Typography variant="body2">
                • Scan mode: {currentScanData.scanMode}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveSession}
            disabled={!sessionName.trim() || loading}
            variant="contained"
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            handleExportSession(selectedSession)
            handleMenuClose()
          }}
        >
          <Download sx={{ mr: 1 }} />
          Export as JSON
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDeleteSession(selectedSession.id)
            handleMenuClose()
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Delete Session
        </MenuItem>
      </Menu>
    </Paper>
  )
}