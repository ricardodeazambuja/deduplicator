import { useState } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { Paper, Alert } from '@mui/material'
import { PlayArrow, CheckCircle, GitHub } from '@mui/icons-material'

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
    startMove,
    selectArchiveDirectory,
    updateCustomDirectoryName,
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
          <Typography variant="h3" component="h1" gutterBottom>
            Dedupe-Local
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom color="text.secondary">
            Client-Side File Deduplicator
          </Typography>
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
          />

          <MoveResultsDialog
            open={showMoveResultsDialog}
            onClose={closeMoveResults}
            moveResults={moveResults}
          />

          {/* License Notice */}
          <Box sx={{ 
            mt: 6, 
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