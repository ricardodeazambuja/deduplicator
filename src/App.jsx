import { useState } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { Paper, Alert, Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import { PlayArrow, CheckCircle, GitHub, ExpandMore } from '@mui/icons-material'

import FolderSelector from './components/FolderSelector'
import ScanModeSelector from './components/ScanModeSelector'
import ProgressTracker from './components/ProgressTracker'
import DuplicateResults from './components/DuplicateResults'
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog'
import DeleteResultsDialog from './components/DeleteResultsDialog'
import MoveConfirmationDialog from './components/MoveConfirmationDialog'
import MoveResultsDialog from './components/MoveResultsDialog'
import SessionManager from './components/SessionManager'
import SimilarityThresholdControl from './components/SimilarityThresholdControl'
import FilenameThresholdControl from './components/FilenameThresholdControl'
import SimilarityResults from './components/SimilarityResults'
import FilenameResults from './components/FilenameResults'
import MultiCriteriaResults from './components/MultiCriteriaResults'
import MultiCriteriaSettings from './components/MultiCriteriaSettings'
import PerformanceWarning from './components/PerformanceWarning'
import { useAppStore } from './stores/appStore'
import { useFileScanning } from './hooks/useFileScanning'
import { useFileDeletion } from './hooks/useFileDeletion'
import { useFileMoving } from './hooks/useFileMoving'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

function App() {
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [selectedFilenameFiles, setSelectedFilenameFiles] = useState(new Set())
  
  const { 
    scanMode, 
    setScanMode, 
    isScanning, 
    progress,
    currentFile,
    scanPhase,
    duplicateGroups,
    similarGroups,
    filenameGroups,
    multiCriteriaGroups,
    similarityThreshold,
    filenameThreshold,
    filenameMode,
    matchingCriteria,
    criteriaWeights,
    priorityOrder,
    setDuplicateGroups,
    setSimilarGroups,
    setFilenameGroups,
    setMultiCriteriaGroups,
    setSimilarityThreshold,
    setFilenameThreshold,
    setFilenameMode,
    setMatchingCriteria,
    setCriteriaWeights,
    setPriorityOrder
  } = useAppStore()
  
  const { startScan, cancelScan, scanError, scanResults, performanceWarnings, isCancelRequested } = useFileScanning()
  const [showPerformanceWarnings, setShowPerformanceWarnings] = useState(true)
  const {
    isDeleting,
    deleteProgress,
    showConfirmDialog,
    showResultsDialog,
    filesToDelete,
    deleteResults,
    startDeletion,
    confirmDeletion,
    cancelDeletion,
    closeResults
  } = useFileDeletion()

  const {
    isMoving,
    moveProgress,
    moveResults,
    showMoveConfirmDialog,
    showMoveResultsDialog,
    showArchivePicker,
    filesToMove,
    parentDirectory,
    customDirectoryName,
    directoryValidation,
    useDirectoryDirectly,
    startMove,
    selectArchiveDirectory,
    updateCustomDirectoryName,
    toggleDirectoryMode,
    confirmMove,
    cancelMove,
    closeMoveResults
  } = useFileMoving()

  const handleStartScan = () => {
    if (selectedFolder) {
      startScan(selectedFolder)
    }
  }

  const handleDeleteFiles = (filesToDelete) => {
    startDeletion(filesToDelete)
  }

  const handleMoveFiles = (filesToMove) => {
    startMove(filesToMove)
  }

  const handleLoadSession = (session) => {
    setDuplicateGroups(session.duplicateGroups || [])
    setSimilarGroups(session.similarGroups || [])
    setFilenameGroups(session.filenameGroups || [])
    setMultiCriteriaGroups(session.multiCriteriaGroups || [])
    if (session.settings?.similarityThreshold) {
      setSimilarityThreshold(session.settings.similarityThreshold)
    }
    if (session.settings?.filenameThreshold) {
      setFilenameThreshold(session.settings.filenameThreshold)
    }
    if (session.settings?.filenameMode) {
      setFilenameMode(session.settings.filenameMode)
    }
    if (session.settings?.matchingCriteria) {
      setMatchingCriteria(session.settings.matchingCriteria)
    }
    if (session.settings?.criteriaWeights) {
      setCriteriaWeights(session.settings.criteriaWeights)
    }
    if (session.settings?.priorityOrder) {
      setPriorityOrder(session.settings.priorityOrder)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* GitHub Corner Ribbon */}
      <Box
        component="a"
        href="https://github.com/ricardodeazambuja/deduplicator"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 1000,
          width: 80,
          height: 80,
          background: 'linear-gradient(-45deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          textDecoration: 'none',
          cursor: 'pointer',
          '&:hover': {
            background: 'linear-gradient(-45deg, #1565c0 0%, #0d47a1 100%)',
          },
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
          transition: 'all 0.3s ease',
        }}
      >
        <GitHub 
          sx={{ 
            position: 'absolute',
            top: 12,
            right: 12,
            fontSize: 20,
            transform: 'rotate(45deg)',
          }} 
        />
      </Box>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              component="img"
              src="./icon-256.png"
              alt="Dedupe-Local"
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                boxShadow: 2
              }}
            />
            <Box>
              <Typography variant="h3" component="h1" sx={{ mb: 0 }}>
                Dedupe-Local
              </Typography>
              <Typography variant="h6" component="h2" color="text.secondary">
                Client-Side File Deduplicator
              </Typography>
            </Box>
          </Box>
          <Typography variant="body1" gutterBottom sx={{ mb: 4 }}>
            Find and manage duplicate files with complete privacy - all processing happens in your browser.
          </Typography>

          <FolderSelector 
            onFolderSelected={setSelectedFolder}
            disabled={isScanning}
          />

          <ScanModeSelector
            scanMode={scanMode}
            onScanModeChange={setScanMode}
            disabled={isScanning}
          />

          {scanMode === 'similarity' && (
            <SimilarityThresholdControl
              threshold={similarityThreshold}
              onThresholdChange={setSimilarityThreshold}
              disabled={isScanning}
            />
          )}

          {scanMode === 'filename' && (
            <FilenameThresholdControl
              mode={filenameMode}
              threshold={filenameThreshold}
              onModeChange={setFilenameMode}
              onThresholdChange={setFilenameThreshold}
              disabled={isScanning}
            />
          )}

          {scanMode === 'multi-criteria' && (
            <MultiCriteriaSettings
              matchingCriteria={matchingCriteria}
              onMatchingCriteriaChange={setMatchingCriteria}
              criteriaWeights={criteriaWeights}
              onCriteriaWeightsChange={setCriteriaWeights}
              priorityOrder={priorityOrder}
              onPriorityOrderChange={setPriorityOrder}
              filenameThreshold={filenameThreshold}
              onFilenameThresholdChange={setFilenameThreshold}
              disabled={isScanning}
            />
          )}

          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleStartScan}
              disabled={!selectedFolder || isScanning}
              size="large"
            >
              Start Scan
            </Button>
          </Box>

          <SessionManager
            currentScanData={scanResults}
            onLoadSession={handleLoadSession}
            disabled={isScanning}
          />

          {performanceWarnings && performanceWarnings.length > 0 && showPerformanceWarnings && (
            <PerformanceWarning
              warnings={performanceWarnings}
              onProceed={() => setShowPerformanceWarnings(false)}
            />
          )}

          <ProgressTracker
            isScanning={isScanning}
            progress={progress}
            currentFile={currentFile}
            scanPhase={scanPhase}
            onCancel={cancelScan}
            isCancelRequested={isCancelRequested}
            scanError={scanError}
          />

          {/* Show message when scan completed but no duplicates found */}
          {scanResults && !isScanning && duplicateGroups.length === 0 && similarGroups.length === 0 && filenameGroups.length === 0 && multiCriteriaGroups.length === 0 && (
            <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Duplicate Files Found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Great news! Your folder appears to be clean. 
                {scanResults.scanMode === 'exact' && `Scanned ${scanResults.totalFiles} files and found no exact duplicates.`}
                {scanResults.scanMode === 'similarity' && `Scanned ${scanResults.totalFiles} files and found no similar files above ${Math.round(scanResults.similarityThreshold * 100)}% similarity threshold.`}
                {scanResults.scanMode === 'filename' && `Scanned ${scanResults.totalFiles} files and found no filename-based duplicates above ${Math.round(scanResults.filenameThreshold * 100)}% similarity threshold.`}
                {scanResults.scanMode === 'multi-criteria' && `Scanned ${scanResults.totalFiles} files using multi-criteria analysis and found no duplicates matching the selected criteria.`}
              </Typography>
              {(scanResults.scanMode === 'similarity' || scanResults.scanMode === 'filename') && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Tip: Try lowering the similarity threshold or switching to a different detection mode to find other types of duplicates.
                </Typography>
              )}
              {scanResults.scanMode === 'multi-criteria' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Tip: Try adjusting the criteria selection, weights, or thresholds to find different types of duplicates.
                </Typography>
              )}
            </Paper>
          )}

          {duplicateGroups.length > 0 && (
            <DuplicateResults
              duplicateGroups={duplicateGroups}
              onDeleteFiles={handleDeleteFiles}
              onMoveFiles={handleMoveFiles}
            />
          )}

          {similarGroups.length > 0 && (
            <SimilarityResults
              similarGroups={similarGroups}
              onDeleteFiles={handleDeleteFiles}
              onMoveFiles={handleMoveFiles}
            />
          )}

          {filenameGroups.length > 0 && (
            <FilenameResults
              groups={filenameGroups}
              onFileDelete={handleDeleteFiles}
              onFileMove={handleMoveFiles}
              selectedFiles={selectedFilenameFiles}
              onFileSelectionChange={setSelectedFilenameFiles}
            />
          )}

          {multiCriteriaGroups.length > 0 && (
            <MultiCriteriaResults
              groups={multiCriteriaGroups}
              onFileDelete={handleDeleteFiles}
              onFileMove={handleMoveFiles}
            />
          )}

          <DeleteConfirmationDialog
            open={showConfirmDialog}
            onClose={cancelDeletion}
            filesToDelete={filesToDelete}
            onConfirmDelete={confirmDeletion}
            isDeleting={isDeleting}
            deleteProgress={deleteProgress}
          />

          <DeleteResultsDialog
            open={showResultsDialog}
            onClose={closeResults}
            deleteResults={deleteResults}
          />

          <MoveConfirmationDialog
            open={showMoveConfirmDialog || showArchivePicker}
            onClose={cancelMove}
            filesToMove={filesToMove}
            parentDirectory={parentDirectory}
            customDirectoryName={customDirectoryName}
            directoryValidation={directoryValidation}
            onSelectArchive={selectArchiveDirectory}
            onUpdateDirectoryName={updateCustomDirectoryName}
            onConfirmMove={confirmMove}
            isMoving={isMoving}
            moveProgress={moveProgress}
            useDirectoryDirectly={useDirectoryDirectly}
            onToggleDirectoryMode={toggleDirectoryMode}
          />

          <MoveResultsDialog
            open={showMoveResultsDialog}
            onClose={closeMoveResults}
            moveResults={moveResults}
          />

          {/* Privacy & Security Information */}
          <Accordion sx={{ mt: 6 }}>
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{ 
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.main',
                },
                '& .MuiAccordionSummary-content': {
                  alignItems: 'center'
                }
              }}
            >
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🔒 Privacy Explained - Click to Learn How
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>This app is designed so your files stay on your device.</strong> Here's how it works:
              </Typography>
              
              <Box component="ul" sx={{ pl: 2, mb: 2, '& li': { mb: 1 } }}>
                <li>
                  <strong>Client-Side Processing:</strong> All file analysis happens entirely in your browser's memory
                </li>
                <li>
                  <strong>No Server Backend:</strong> This app is hosted as static files on GitHub Pages - no server can access your data
                </li>
                <li>
                  <strong>Zero Network Requests:</strong> No data is transmitted anywhere during file processing
                </li>
                <li>
                  <strong>Open Source:</strong> Complete source code is available for inspection
                </li>
              </Box>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Verify it yourself:</strong> Open Developer Tools (F12 on Windows/Linux, Cmd+Option+I on Mac) → Network tab while using this app. 
                  You should see no network requests during file processing!
                </Typography>
              </Alert>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Technical Details:</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 2, fontSize: '0.875rem', '& li': { mb: 0.5 } }}>
                <li>File System Access API for secure, permission-based folder access</li>
                <li>Web Workers for background processing without blocking your browser</li>
                <li>SHA-256 cryptographic hashing using browser's SubtleCrypto API</li>
                <li>IndexedDB for optional local session storage (designed not to transmit)</li>
                <li>Static hosting with no server backend - no server can access your data</li>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  href="https://github.com/ricardodeazambuja/deduplicator"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Source Code
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  href="https://pages.github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  About GitHub Pages
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* License Notice */}
          <Box sx={{ 
            mt: 3, 
            pt: 3, 
            borderTop: 1, 
            borderColor: 'divider',
            textAlign: 'center'
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              By using this application, you acknowledge that you have read and agree to the{' '}
              <Box
                component="a"
                href="https://github.com/ricardodeazambuja/deduplicator/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  color: 'primary.main', 
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                MIT License
              </Box>
              .
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This software is provided "as is" without warranty. Use at your own risk when deleting files.
            </Typography>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  )
}

export default App