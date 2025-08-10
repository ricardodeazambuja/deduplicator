/**
 * Multi-criteria duplicate detection service
 * Combines filename, exact match, and similarity detection with configurable priorities
 */

import { HashingService } from './hashingService'
import { SimilarityService } from './similarityService'
import { FilenameService } from './filenameService'

export class MultiCriteriaService {
  constructor() {
    this.hashingService = new HashingService()
    this.similarityService = new SimilarityService()
    this.filenameService = new FilenameService()
    this.cancelled = false
  }

  /**
   * Find duplicates using multiple criteria with priority-based merging
   */
  async findMultiCriteriaDuplicates(
    files,
    options = {},
    onProgress = null
  ) {
    this.cancelled = false

    const {
      criteria = { filename: true, exact: true, similarity: false },
      weights = { filename: 0.4, exact: 0.5, similarity: 0.1 },
      priorityOrder = ['exact', 'filename', 'similarity'],
      similarityThreshold = 0.8,
      filenameThreshold = 0.8,
      filenameMode = 'smart'
    } = options

    if (!files || files.length === 0) {
      return []
    }

    const results = {}
    const enabledCriteria = Object.keys(criteria).filter(key => criteria[key])
    let currentStep = 0
    const totalSteps = enabledCriteria.length + 1 // +1 for merging step

    // Step 1: Run each enabled detection method
    for (const criterion of enabledCriteria) {
      if (this.cancelled) {
        throw new Error('Operation cancelled')
      }

      const stepProgress = currentStep / totalSteps
      if (onProgress) {
        await onProgress({
          progress: stepProgress,
          message: `Running ${criterion} detection...`,
          phase: criterion,
          step: currentStep + 1,
          totalSteps: totalSteps
        })
      }

      try {
        if (criterion === 'exact') {
          // Hash files first
          const hashedFiles = await this.hashingService.hashFiles(files, (progressData) => {
            if (onProgress) {
              const subProgress = stepProgress + (progressData.progress * 0.8 / totalSteps)
              onProgress({
                progress: subProgress,
                message: `Computing file hashes... ${progressData.currentFile}`,
                currentFile: progressData.currentFile,
                phase: 'exact-hashing'
              })
            }
          })

          // Find exact duplicates
          results.exact = this.hashingService.findDuplicates(hashedFiles)

        } else if (criterion === 'similarity') {
          // Process files for similarity
          const processedFiles = await this.similarityService.processFiles(files, (progressData) => {
            if (onProgress) {
              const subProgress = stepProgress + (progressData.progress * 0.4 / totalSteps)
              onProgress({
                progress: subProgress,
                message: `Processing files for similarity... ${progressData.currentFile}`,
                currentFile: progressData.currentFile,
                phase: 'similarity-processing'
              })
            }
          })

          // Find similar files
          results.similarity = await this.similarityService.findSimilarFiles(
            processedFiles,
            similarityThreshold,
            (progressData) => {
              if (onProgress) {
                const subProgress = stepProgress + (0.4 + progressData.progress * 0.4) / totalSteps
                onProgress({
                  progress: subProgress,
                  message: 'Comparing files for similarity...',
                  phase: 'similarity-comparison'
                })
              }
            }
          )

        } else if (criterion === 'filename') {
          results.filename = await this.filenameService.findFilenameDuplicates(
            files,
            {
              mode: filenameMode,
              threshold: filenameThreshold
            },
            (progressData) => {
              if (onProgress) {
                const subProgress = stepProgress + (progressData.progress * 0.8 / totalSteps)
                onProgress({
                  progress: subProgress,
                  message: `Comparing filenames... ${progressData.message}`,
                  currentFile: progressData.currentFile,
                  phase: 'filename-comparison'
                })
              }
            }
          )
        }
      } catch (error) {
        console.error(`Error in ${criterion} detection:`, error)
        results[criterion] = []
      }

      currentStep++
    }

    // Step 2: Merge results with priority-based approach
    if (onProgress) {
      await onProgress({
        progress: currentStep / totalSteps,
        message: 'Merging results with priority-based approach...',
        phase: 'merging'
      })
    }

    const mergedGroups = this.mergeResultsWithPriority(
      results,
      priorityOrder,
      weights
    )

    if (onProgress) {
      await onProgress({
        progress: 1.0,
        message: `Multi-criteria analysis complete! Found ${mergedGroups.length} groups`,
        phase: 'complete'
      })
    }

    return mergedGroups
  }

  /**
   * Merge results from different criteria using priority order
   */
  mergeResultsWithPriority(results, priorityOrder, weights) {
    const fileGroups = new Map() // file path -> group info
    const finalGroups = []
    let groupId = 0

    // Process each criterion in priority order
    for (const criterion of priorityOrder) {
      if (!results[criterion]) continue

      const groups = results[criterion]
      
      for (const group of groups) {
        const groupFiles = group.files || group
        const newGroup = {
          id: `multi-${groupId++}`,
          type: 'multi-criteria',
          primaryCriterion: criterion,
          criteria: [criterion],
          files: [],
          confidence: this.calculateGroupConfidence(group, criterion, weights),
          metadata: {
            [criterion]: this.extractGroupMetadata(group, criterion)
          }
        }

        let hasUnprocessedFiles = false

        for (const file of groupFiles) {
          const filePath = file.path
          
          if (!fileGroups.has(filePath)) {
            // File hasn't been assigned to any group yet
            fileGroups.set(filePath, newGroup)
            newGroup.files.push(file)
            hasUnprocessedFiles = true
          } else {
            // File is already in another group - merge if appropriate
            const existingGroup = fileGroups.get(filePath)
            if (this.shouldMergeGroups(existingGroup, newGroup, priorityOrder)) {
              this.mergeGroups(existingGroup, newGroup, criterion)
            }
          }
        }

        // Only add groups with multiple files and at least one unprocessed file
        if (newGroup.files.length > 1 && hasUnprocessedFiles) {
          finalGroups.push(newGroup)
        }
      }
    }

    // Sort by confidence (highest first)
    finalGroups.sort((a, b) => b.confidence - a.confidence)

    return finalGroups
  }

  /**
   * Calculate confidence score for a group
   */
  calculateGroupConfidence(group, criterion, weights) {
    const baseWeight = weights[criterion] || 0.33
    let confidenceMultiplier = 1.0

    // Adjust based on group characteristics
    if (group.files) {
      const fileCount = group.files.length
      
      // More files = higher confidence (up to a point)
      confidenceMultiplier *= Math.min(2.0, 1 + (fileCount - 2) * 0.1)
    }

    // Criterion-specific confidence adjustments
    if (criterion === 'exact') {
      confidenceMultiplier *= 1.2 // Exact matches are very reliable
    } else if (criterion === 'filename') {
      const avgSimilarity = group.avgSimilarity || 0.8
      confidenceMultiplier *= avgSimilarity
    } else if (criterion === 'similarity') {
      const avgSimilarity = group.avgSimilarity || 0.8
      confidenceMultiplier *= avgSimilarity
    }

    return Math.min(1.0, baseWeight * confidenceMultiplier)
  }

  /**
   * Extract metadata from a group for a specific criterion
   */
  extractGroupMetadata(group, criterion) {
    if (criterion === 'exact') {
      return {
        hash: group.hash,
        size: group.size
      }
    } else if (criterion === 'filename') {
      return {
        baseFilename: group.baseFilename,
        extension: group.extension,
        avgSimilarity: group.avgSimilarity
      }
    } else if (criterion === 'similarity') {
      return {
        avgSimilarity: group.avgSimilarity,
        algorithm: 'MinHash+Shingling'
      }
    }
    return {}
  }

  /**
   * Determine if two groups should be merged
   */
  shouldMergeGroups(existingGroup, newGroup, priorityOrder) {
    const existingPriority = priorityOrder.indexOf(existingGroup.primaryCriterion)
    const newPriority = priorityOrder.indexOf(newGroup.primaryCriterion)
    
    // Higher priority criterion wins (lower index = higher priority)
    if (newPriority < existingPriority) {
      return true
    }
    
    // Same priority - merge if it increases confidence
    if (newPriority === existingPriority) {
      return newGroup.confidence > existingGroup.confidence
    }
    
    return false
  }

  /**
   * Merge two groups
   */
  mergeGroups(targetGroup, sourceGroup, newCriterion) {
    // Add the new criterion
    if (!targetGroup.criteria.includes(newCriterion)) {
      targetGroup.criteria.push(newCriterion)
    }
    
    // Merge metadata
    targetGroup.metadata[newCriterion] = sourceGroup.metadata[newCriterion]
    
    // Update confidence (weighted average)
    targetGroup.confidence = (targetGroup.confidence + sourceGroup.confidence) / 2
    
    // Update primary criterion if the new one has higher priority
    // This is handled by shouldMergeGroups, so we update it here
    targetGroup.primaryCriterion = sourceGroup.primaryCriterion
  }

  /**
   * Get detailed analysis for files in a multi-criteria group
   */
  analyzeMultiCriteriaGroup(group) {
    const analysis = {
      groupId: group.id,
      primaryCriterion: group.primaryCriterion,
      criteria: group.criteria,
      confidence: group.confidence,
      files: [],
      insights: []
    }

    // Analyze each file
    for (const file of group.files) {
      const fileAnalysis = {
        ...file,
        filenameAnalysis: this.filenameService.analyzeFilename(file.name),
        relationships: []
      }

      // Find relationships with other files in the group
      for (const otherFile of group.files) {
        if (otherFile !== file) {
          const relationship = this.analyzeFileRelationship(file, otherFile)
          if (relationship.strength > 0.5) {
            fileAnalysis.relationships.push(relationship)
          }
        }
      }

      analysis.files.push(fileAnalysis)
    }

    // Generate insights
    analysis.insights = this.generateGroupInsights(group, analysis.files)

    return analysis
  }

  /**
   * Analyze relationship between two files
   */
  analyzeFileRelationship(file1, file2) {
    const filenameSim = this.filenameService.calculateFilenameSimilarity(file1.name, file2.name)
    const sizeDiff = Math.abs(file1.size - file2.size) / Math.max(file1.size, file2.size)
    
    return {
      otherFile: file2.name,
      filenameSimilarity: filenameSim,
      sizeDifference: sizeDiff,
      strength: filenameSim * (1 - sizeDiff * 0.5)
    }
  }

  /**
   * Generate insights about a group
   */
  generateGroupInsights(group, files) {
    const insights = []
    
    // Check for version patterns
    const hasVersioning = files.some(f => 
      f.filenameAnalysis.patternsFound.includes('versionPattern') ||
      f.filenameAnalysis.patternsFound.includes('numberPattern')
    )
    
    if (hasVersioning) {
      insights.push({
        type: 'versioning',
        message: 'This group appears to contain different versions of the same file',
        recommendation: 'Keep the most recent version and delete older ones'
      })
    }

    // Check for copy patterns
    const hasCopies = files.some(f => 
      f.filenameAnalysis.patternsFound.includes('copyPattern') ||
      f.filenameAnalysis.patternsFound.includes('duplicatePattern')
    )
    
    if (hasCopies) {
      insights.push({
        type: 'copies',
        message: 'This group contains files that appear to be copies',
        recommendation: 'Keep the original and delete the copies'
      })
    }

    // Size-based insights
    const sizes = files.map(f => f.size)
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
    const maxSize = Math.max(...sizes)
    
    if (maxSize > avgSize * 1.5) {
      insights.push({
        type: 'size_variation',
        message: 'Files in this group have significantly different sizes',
        recommendation: 'Review carefully - they might not be true duplicates'
      })
    }

    return insights
  }

  /**
   * Cancel the current operation
   */
  cancel() {
    this.cancelled = true
    this.hashingService.cancel()
    this.similarityService.cancel()
    this.filenameService.cancel()
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.cancelled = false
    this.hashingService.cleanup()
    this.similarityService.cleanup()
    this.filenameService.cleanup()
  }
}