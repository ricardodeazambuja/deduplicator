import { useState, useCallback } from 'react'
import { FileSystemService } from '../services/fileSystemService'
import { HashingService } from '../services/hashingService'
import { SimilarityService } from '../services/similarityService'
import { FilenameService } from '../services/filenameService'
import { MultiCriteriaService } from '../services/multiCriteriaService'
import { PerformanceOptimizer } from '../utils/performanceOptimizer'
import { useAppStore } from '../stores/appStore'

const fileSystemService = new FileSystemService()
const hashingService = new HashingService()
const similarityService = new SimilarityService()
const filenameService = new FilenameService()
const multiCriteriaService = new MultiCriteriaService()
const performanceOptimizer = new PerformanceOptimizer()

export function useFileScanning() {
  const [scanError, setScanError] = useState(null)
  const [scanResults, setScanResults] = useState(null)
  const [performanceWarnings, setPerformanceWarnings] = useState([])
  const [performanceMonitor, setPerformanceMonitor] = useState(null)
  const [isCancelRequested, setIsCancelRequested] = useState(false)
  
  const {
    isScanning,
    progress,
    currentFile,
    scanPhase,
    setIsScanning,
    setProgress,
    setCurrentFile,
    setScanPhase,
    setFiles,
    setDuplicateGroups,
    setSimilarGroups,
    setFilenameGroups,
    setMultiCriteriaGroups,
    scanMode,
    similarityThreshold,
    filenameThreshold,
    filenameMode,
    matchingCriteria,
    criteriaWeights,
    priorityOrder
  } = useAppStore()

  const startScan = useCallback(async (folderHandle) => {
    if (!folderHandle) {
      setScanError('No folder selected')
      return
    }

    setScanError(null)
    setIsScanning(true)
    setProgress(0)
    setScanResults(null)

    try {
      // Phase 1: Get all files
      setScanPhase('Scanning directory structure...')
      setCurrentFile(null)
      setProgress(0.1)
      const files = await fileSystemService.getAllFiles(folderHandle)
      
      if (files.length === 0) {
        throw new Error('No files found in the selected directory')
      }

      // Performance check before processing
      const memoryEstimate = performanceOptimizer.estimateMemoryUsage(files, scanMode)
      const canHandle = performanceOptimizer.canHandleDataset(files.length, memoryEstimate.total)
      
      setPerformanceWarnings(canHandle.warnings)
      
      // Create performance monitor
      const monitor = performanceOptimizer.createPerformanceMonitor()
      setPerformanceMonitor(monitor)

      setFiles(files)
      
      // Phase 2: Hash files
      setScanPhase('Computing file hashes...')
      setProgress(0.2)
      const hashedFiles = await hashingService.hashFiles(files, (progressData) => {
        // Progress from 0.2 to 0.8
        const hashProgress = 0.2 + (progressData.progress * 0.6)
        setProgress(hashProgress)
        setCurrentFile(progressData.currentFile || null)
        
        // Update performance monitor
        if (monitor) {
          monitor.measure('hashing', progressData.completed, progressData.total)
        }
      })

      if (scanMode === 'exact') {
        // Phase 3: Find exact duplicates
        setScanPhase('Finding exact duplicates...')
        setCurrentFile(null)
        setProgress(0.9)
        const duplicates = hashingService.findDuplicates(hashedFiles)
        setDuplicateGroups(duplicates)
        setSimilarGroups([])
        setFilenameGroups([])
        setMultiCriteriaGroups([])

        setScanPhase('Scan completed!')
        setCurrentFile(null)
        setProgress(1.0)
        const scanData = {
          scanMode,
          folderName: folderHandle.name,
          totalFiles: files.length,
          duplicateGroups: duplicates,
          similarGroups: [],
          filenameGroups: [],
          multiCriteriaGroups: [],
          similarityThreshold: similarityThreshold
        }
        
        setScanResults(scanData)

      } else if (scanMode === 'filename') {
        // Phase 3: Find filename-based duplicates
        setScanPhase('Analyzing filenames...')
        setCurrentFile(null)
        setProgress(0.8)
        const filenameGroups = await filenameService.findFilenameDuplicates(
          files,
          {
            mode: filenameMode,
            threshold: filenameThreshold
          },
          (progressData) => {
            // Progress from 0.8 to 0.95
            const filenameProgress = 0.8 + (progressData.progress * 0.15)
            setProgress(filenameProgress)
            setCurrentFile(progressData.currentFile || null)
            
            // Update performance monitor
            if (monitor) {
              monitor.measure('filename_analysis', progressData.completed, progressData.total)
            }
          }
        )
        
        setDuplicateGroups([])
        setSimilarGroups([])
        setFilenameGroups(filenameGroups)
        setMultiCriteriaGroups([])

        setScanPhase('Scan completed!')
        setCurrentFile(null)
        setProgress(1.0)
        const scanData = {
          scanMode,
          folderName: folderHandle.name,
          totalFiles: files.length,
          duplicateGroups: [],
          similarGroups: [],
          filenameGroups: filenameGroups,
          multiCriteriaGroups: [],
          filenameThreshold: filenameThreshold,
          filenameMode: filenameMode
        }
        
        setScanResults(scanData)

      } else if (scanMode === 'similarity') {
        // Phase 3: Process files for similarity detection
        setScanPhase('Analyzing file similarity...')
        setProgress(0.4)
        const processedFiles = await similarityService.processFiles(files, (progressData) => {
          // Progress from 0.4 to 0.8
          const processProgress = 0.4 + (progressData.progress * 0.4)
          setProgress(processProgress)
          setCurrentFile(progressData.currentFile || null)
          
          // Update performance monitor
          if (monitor) {
            monitor.measure('similarity_processing', progressData.completed, progressData.total)
          }
        })

        // Phase 4: Find similar files
        setScanPhase('Comparing files for similarity...')
        setCurrentFile(null)
        setProgress(0.8)
        const similarGroups = await similarityService.findSimilarFiles(
          processedFiles,
          similarityThreshold,
          (progressData) => {
            setProgress(0.9) // Show progress during comparison
            if (progressData.message) {
              setScanPhase(progressData.message)
            }
          }
        )
        
        setDuplicateGroups([])
        setSimilarGroups(similarGroups)
        setFilenameGroups([])
        setMultiCriteriaGroups([])

        setScanPhase('Scan completed!')
        setCurrentFile(null)
        setProgress(1.0)
        const scanData = {
          scanMode,
          folderName: folderHandle.name,
          totalFiles: files.length,
          duplicateGroups: [],
          similarGroups: similarGroups,
          filenameGroups: [],
          multiCriteriaGroups: [],
          similarityThreshold: similarityThreshold
        }
        
        setScanResults(scanData)
        
      } else if (scanMode === 'multi-criteria') {
        // Phase 3: Multi-criteria analysis
        setScanPhase('Running multi-criteria analysis...')
        setProgress(0.3)
        
        const multiCriteriaGroups = await multiCriteriaService.findMultiCriteriaDuplicates(
          files,
          {
            criteria: matchingCriteria,
            weights: criteriaWeights,
            priorityOrder: priorityOrder,
            similarityThreshold: similarityThreshold,
            filenameThreshold: filenameThreshold,
            filenameMode: filenameMode
          },
          (progressData) => {
            // Progress from 0.3 to 0.95
            const mcProgress = 0.3 + (progressData.progress * 0.65)
            setProgress(mcProgress)
            setCurrentFile(progressData.currentFile || null)
            setScanPhase(progressData.message || 'Multi-criteria analysis in progress...')
            
            // Update performance monitor
            if (monitor) {
              monitor.measure('multi_criteria', progressData.step || 0, progressData.totalSteps || 1)
            }
          }
        )
        
        setDuplicateGroups([])
        setSimilarGroups([])
        setFilenameGroups([])
        setMultiCriteriaGroups(multiCriteriaGroups)

        setScanPhase('Scan completed!')
        setCurrentFile(null)
        setProgress(1.0)
        const scanData = {
          scanMode,
          folderName: folderHandle.name,
          totalFiles: files.length,
          duplicateGroups: [],
          similarGroups: [],
          filenameGroups: [],
          multiCriteriaGroups: multiCriteriaGroups,
          similarityThreshold: similarityThreshold,
          filenameThreshold: filenameThreshold,
          filenameMode: filenameMode,
          matchingCriteria: matchingCriteria,
          criteriaWeights: criteriaWeights,
          priorityOrder: priorityOrder
        }
        
        setScanResults(scanData)
      }

    } catch (error) {
      if (error.message.includes('cancelled')) {
        setScanPhase('Scan cancelled')
        setScanError('Scan was cancelled by user')
      } else {
        setScanError(error.message)
        console.error('Scan error:', error)
      }
    } finally {
      setIsScanning(false)
      setCurrentFile(null)
      setScanPhase('')
      setIsCancelRequested(false)
    }
  }, [scanMode, similarityThreshold, filenameMode, filenameThreshold, matchingCriteria, criteriaWeights, priorityOrder, setIsScanning, setProgress, setCurrentFile, setScanPhase, setFiles, setDuplicateGroups, setSimilarGroups, setFilenameGroups, setMultiCriteriaGroups])

  const cancelScan = useCallback(() => {
    if (isScanning) {
      setIsCancelRequested(true)
      hashingService.cancel()
      similarityService.cancel()
      filenameService.cancel()
      multiCriteriaService.cancel()
      setScanPhase('Cancelling scan...')
    }
  }, [isScanning])

  const deleteScanResults = useCallback(() => {
    setScanResults(null)
    setScanError(null)
    setProgress(0)
    setCurrentFile(null)
    setScanPhase('')
    setFiles([])
    setDuplicateGroups([])
    setSimilarGroups([])
    setFilenameGroups([])
    setMultiCriteriaGroups([])
  }, [setFiles, setDuplicateGroups, setSimilarGroups, setFilenameGroups, setMultiCriteriaGroups, setProgress, setCurrentFile, setScanPhase])

  return {
    startScan,
    cancelScan,
    deleteScanResults,
    scanError,
    scanResults,
    isScanning,
    progress,
    currentFile,
    scanPhase,
    performanceWarnings,
    performanceMonitor,
    isCancelRequested
  }
}