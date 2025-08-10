/**
 * Filename-based duplicate detection service
 * Detects duplicates based on filename patterns, ignoring extensions and variations
 */

export class FilenameService {
  constructor() {
    this.cancelled = false
    this.patterns = {
      // Common filename variations
      copyPattern: /\s*-?\s*(copy|Copy|COPY)(\s*\(\d+\))?$/,
      numberPattern: /\s*-?\s*\(\d+\)$/,
      versionPattern: /\s*[_-]?v?\d+(\.\d+)*$/,
      duplicatePattern: /\s*[_-]?(dup|duplicate|Duplicate|DUPLICATE)(\s*\d+)?$/,
      timestampPattern: /\s*[_-]?\d{4}[-_]\d{2}[-_]\d{2}(\s*[_-]?\d{2}[-_:]\d{2}([-_:]\d{2})?)?$/,
      bracketsPattern: /\s*\[.*?\]$/,
      parenthesesPattern: /\s*\((?!.*\.\w+\)$).*?\)$/  // Exclude file extensions in parentheses
    }
  }

  /**
   * Extract base filename by removing extensions and common variations
   */
  extractBaseFilename(filename) {
    if (!filename) return ''
    
    // Remove file extension
    const lastDotIndex = filename.lastIndexOf('.')
    let baseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename
    
    // Apply patterns to remove common variations
    for (const [patternName, pattern] of Object.entries(this.patterns)) {
      baseName = baseName.replace(pattern, '')
    }
    
    // Clean up whitespace and normalize
    baseName = baseName.trim()
    baseName = baseName.replace(/\s+/g, ' ') // Normalize multiple spaces
    
    return baseName.toLowerCase() // Case insensitive matching
  }

  /**
   * Extract file extension
   */
  extractExtension(filename) {
    if (!filename) return ''
    const lastDotIndex = filename.lastIndexOf('.')
    return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1).toLowerCase() : ''
  }

  /**
   * Get original base name without extension (but without pattern stripping)
   */
  getOriginalBaseName(filename) {
    if (!filename) return ''
    const lastDotIndex = filename.lastIndexOf('.')
    const baseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename
    return baseName.toLowerCase()
  }

  /**
   * Calculate similarity score between two filenames using a tiered approach
   */
  calculateFilenameSimilarity(filename1, filename2, mode = 'smart') {
    // Mode 1: Exact match only - compare full filenames exactly
    if (mode === 'exact') {
      return filename1 === filename2 ? 1.0 : 0.0
    }
    
    // For other modes, extract components
    const base1 = this.extractBaseFilename(filename1)
    const base2 = this.extractBaseFilename(filename2)
    const ext1 = this.extractExtension(filename1)
    const ext2 = this.extractExtension(filename2)
    
    // Mode 2: Exact base name, any extension (threshold = 0.95)
    if (mode === 'exact-base') {
      // Compare original base names without pattern stripping
      const origBase1 = this.getOriginalBaseName(filename1)
      const origBase2 = this.getOriginalBaseName(filename2)
      
      if (origBase1 === origBase2) {
        return ext1 === ext2 ? 1.0 : 0.95
      }
      return 0.0
    }
    
    // Mode 3: Smart pattern matching (threshold = 0.90)
    if (mode === 'smart') {
      // First check exact base name match (without pattern stripping)
      const origBase1 = this.getOriginalBaseName(filename1)
      const origBase2 = this.getOriginalBaseName(filename2)
      
      if (origBase1 === origBase2) {
        return ext1 === ext2 ? 1.0 : 0.95
      }
      
      // Then check if one is a variation of the other (with pattern stripping)
      if (base1 === base2) {
        return ext1 === ext2 ? 0.90 : 0.85
      }
      
      // Check if one is a clear variation of the other
      if (this.isVariationOf(origBase1, origBase2)) {
        return ext1 === ext2 ? 0.90 : 0.85
      }
      
      return 0.0 // No fuzzy matching in smart mode
    }
    
    // Mode 4: Fuzzy matching (threshold = configurable)
    if (mode === 'fuzzy') {
      // First check exact base name match (without pattern stripping)
      const origBase1 = this.getOriginalBaseName(filename1)
      const origBase2 = this.getOriginalBaseName(filename2)
      
      if (origBase1 === origBase2) {
        return ext1 === ext2 ? 1.0 : 0.95
      }
      
      // Then check pattern-cleaned base names
      if (base1 === base2) {
        return ext1 === ext2 ? 0.90 : 0.85
      }
      
      // Check for pattern variations
      if (this.isVariationOf(origBase1, origBase2)) {
        return ext1 === ext2 ? 0.90 : 0.85
      }
      
      // Use Levenshtein distance for fuzzy matching on original base names
      const similarity = this.calculateLevenshteinSimilarity(origBase1, origBase2)
      
      // Boost similarity if extensions match
      if (ext1 === ext2 && similarity > 0.6) {
        return Math.min(1.0, similarity + 0.1)
      }
      
      return similarity
    }
    
    return 0.0
  }
  
  /**
   * Check if one filename is a clear variation of another
   */
  isVariationOf(base1, base2) {
    if (!base1 || !base2) return false
    
    // Check if one contains the other with just variation patterns
    const longer = base1.length > base2.length ? base1 : base2
    const shorter = base1.length > base2.length ? base2 : base1
    
    // Remove common variation patterns from the longer name
    let cleaned = longer
    for (const [patternName, pattern] of Object.entries(this.patterns)) {
      cleaned = cleaned.replace(pattern, '')
    }
    cleaned = cleaned.trim()
    
    // If after cleaning the longer name equals the shorter name, it's a variation
    return cleaned === shorter
  }

  /**
   * Calculate Levenshtein similarity (0.0 to 1.0)
   */
  calculateLevenshteinSimilarity(str1, str2) {
    if (!str1 || !str2) return 0
    if (str1 === str2) return 1.0
    
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    
    if (maxLength === 0) return 1.0
    return Math.max(0, 1 - (distance / maxLength))
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Find filename-based duplicates
   */
  async findFilenameDuplicates(files, options = {}, onProgress = null) {
    const { 
      mode = 'smart',
      threshold = 0.8 
    } = options
    this.cancelled = false
    
    if (!files || files.length === 0) {
      return []
    }

    const groups = []
    const processed = new Set()
    let comparisons = 0
    const totalComparisons = (files.length * (files.length - 1)) / 2

    for (let i = 0; i < files.length; i++) {
      if (this.cancelled) {
        throw new Error('Operation cancelled')
      }

      if (processed.has(i)) continue

      const currentFile = files[i]
      const group = [currentFile]
      processed.add(i)

      // Compare with remaining files
      for (let j = i + 1; j < files.length; j++) {
        if (this.cancelled) {
          throw new Error('Operation cancelled')
        }

        if (processed.has(j)) continue

        const otherFile = files[j]
        const similarity = this.calculateFilenameSimilarity(
          currentFile.name,
          otherFile.name,
          mode
        )
        

        comparisons++

        if (similarity >= threshold) {
          group.push(otherFile)
          processed.add(j)
        }

        // Progress reporting
        if (onProgress && comparisons % 100 === 0) {
          const progress = comparisons / totalComparisons
          await onProgress({
            progress: Math.min(progress, 0.95),
            message: `Comparing filenames... ${comparisons}/${totalComparisons}`,
            currentFile: currentFile.name,
            completed: comparisons,
            total: totalComparisons
          })
        }
      }

      // Only add groups with duplicates
      if (group.length > 1) {
        // Sort by filename for consistent ordering
        group.sort((a, b) => a.name.localeCompare(b.name))
        
        // Add metadata for filename-based groups
        const groupWithMetadata = {
          files: group,
          type: 'filename',
          mode: mode,
          baseFilename: this.extractBaseFilename(currentFile.name),
          extension: this.extractExtension(currentFile.name),
          count: group.length,
          totalSize: group.reduce((sum, file) => sum + file.size, 0),
          // Calculate average similarity within group
          avgSimilarity: this.calculateGroupAverageSimilarity(group, mode)
        }
        
        groups.push(groupWithMetadata)
      }
    }

    if (onProgress) {
      await onProgress({
        progress: 1.0,
        message: `Found ${groups.length} filename-based duplicate groups`,
        completed: totalComparisons,
        total: totalComparisons
      })
    }

    return groups
  }

  /**
   * Calculate average similarity within a group
   */
  calculateGroupAverageSimilarity(files, mode = 'smart') {
    if (files.length < 2) return 1.0
    
    let totalSimilarity = 0
    let comparisons = 0
    
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        totalSimilarity += this.calculateFilenameSimilarity(files[i].name, files[j].name, mode)
        comparisons++
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 1.0
  }

  /**
   * Cancel the current operation
   */
  cancel() {
    this.cancelled = true
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.cancelled = false
  }

  /**
   * Get filename analysis for a file
   */
  analyzeFilename(filename) {
    const baseName = this.extractBaseFilename(filename)
    const originalBaseName = this.getOriginalBaseName(filename)
    const extension = this.extractExtension(filename)
    const patterns = []
    
    // Check which patterns were found
    for (const [patternName, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(filename)) {
        patterns.push(patternName)
      }
    }
    
    return {
      original: filename,
      baseName, // cleaned base name
      originalBaseName, // original base name (no pattern stripping)
      extension,
      patternsFound: patterns,
      normalized: `${baseName}.${extension}`
    }
  }

  /**
   * Debug method to test filename similarity in different modes
   */
  debugSimilarity(filename1, filename2) {
    console.log(`\n=== Debugging Filename Similarity ===`)
    console.log(`File 1: "${filename1}"`)
    console.log(`File 2: "${filename2}"`)
    
    const modes = ['exact', 'exact-base', 'smart', 'fuzzy']
    modes.forEach(mode => {
      const similarity = this.calculateFilenameSimilarity(filename1, filename2, mode)
      console.log(`${mode.padEnd(12)}: ${similarity.toFixed(3)} ${similarity >= 0.8 ? '✓ MATCH' : '✗ no match'}`)
    })
    
    console.log(`\nAnalysis:`)
    console.log(`File 1 analysis:`, this.analyzeFilename(filename1))
    console.log(`File 2 analysis:`, this.analyzeFilename(filename2))
  }
}