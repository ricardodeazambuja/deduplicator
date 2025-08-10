// Performance optimization utilities
export class PerformanceOptimizer {
  constructor() {
    this.memoryThresholds = {
      warning: 100 * 1024 * 1024, // 100MB
      error: 500 * 1024 * 1024    // 500MB
    }
    this.fileCountThresholds = {
      small: 1000,
      medium: 5000,
      large: 10000
    }
  }

  // Check if browser can handle large datasets
  canHandleDataset(fileCount, estimatedMemoryUsage) {
    const available = this.getAvailableMemory()
    
    return {
      fileCount: fileCount <= this.fileCountThresholds.large,
      memory: estimatedMemoryUsage <= (available * 0.8), // Use max 80% of available
      recommended: this.getRecommendedLimits(),
      warnings: this.generateWarnings(fileCount, estimatedMemoryUsage)
    }
  }

  // Estimate memory usage for file scanning
  estimateMemoryUsage(files, scanMode) {
    let baseMemoryPerFile = 1024 // 1KB base overhead per file
    
    if (scanMode === 'exact') {
      // SHA-256 hash storage + file metadata
      baseMemoryPerFile += 64 + 200 // 64 bytes hash + 200 bytes metadata
    } else if (scanMode === 'similarity') {
      // MinHash signature + shingles overhead
      baseMemoryPerFile += 128 * 4 + 500 // 128 hash values + shingle overhead
    }
    
    const totalFiles = files.length
    const averageFileSize = files.reduce((sum, f) => sum + (f.size || 0), 0) / totalFiles || 0
    
    // Estimate processing memory (files read into memory for hashing)
    const processingMemory = Math.min(
      averageFileSize * 10, // Process up to 10 files at once
      50 * 1024 * 1024      // But never more than 50MB
    )
    
    return {
      baseMemory: totalFiles * baseMemoryPerFile,
      processingMemory: processingMemory,
      total: totalFiles * baseMemoryPerFile + processingMemory,
      estimated: true
    }
  }

  // Get available memory (rough estimate)
  getAvailableMemory() {
    // Try to use Performance API if available
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.jsHeapSizeLimit - performance.memory.usedJSHeapSize
    }
    
    // Fallback estimates based on device capabilities
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /mobile|tablet|android|iphone|ipad/.test(userAgent)
    
    if (isMobile) {
      return 256 * 1024 * 1024 // Assume 256MB available on mobile
    } else {
      return 1024 * 1024 * 1024 // Assume 1GB available on desktop
    }
  }

  // Generate performance warnings
  generateWarnings(fileCount, memoryUsage) {
    const warnings = []
    
    if (fileCount > this.fileCountThresholds.medium) {
      warnings.push({
        type: 'file_count',
        level: fileCount > this.fileCountThresholds.large ? 'error' : 'warning',
        message: `Processing ${fileCount} files may be slow. Consider scanning smaller batches.`,
        suggestion: 'Try scanning subdirectories separately for better performance.'
      })
    }
    
    if (memoryUsage > this.memoryThresholds.warning) {
      warnings.push({
        type: 'memory',
        level: memoryUsage > this.memoryThresholds.error ? 'error' : 'warning',
        message: `Estimated memory usage: ${this.formatBytes(memoryUsage)}`,
        suggestion: 'Close other browser tabs to free up memory.'
      })
    }
    
    return warnings
  }

  // Get recommended limits for current device
  getRecommendedLimits() {
    const availableMemory = this.getAvailableMemory()
    const isMobile = /mobile|tablet|android|iphone|ipad/.test(navigator.userAgent.toLowerCase())
    
    return {
      maxFiles: isMobile ? 2000 : 8000,
      maxMemory: Math.floor(availableMemory * 0.6), // Use max 60% of available
      recommendedBatchSize: isMobile ? 500 : 2000,
      device: isMobile ? 'mobile' : 'desktop'
    }
  }

  // Optimize worker pool size based on device capabilities
  getOptimalWorkerCount(taskType = 'hashing') {
    const cores = navigator.hardwareConcurrency || 4
    const isMobile = /mobile|tablet|android|iphone|ipad/.test(navigator.userAgent.toLowerCase())
    
    if (taskType === 'similarity') {
      // Similarity detection is more CPU intensive
      return Math.max(1, Math.floor(cores * 0.5))
    } else {
      // Regular hashing can use more workers
      return isMobile ? Math.max(2, Math.floor(cores * 0.6)) : Math.max(2, cores - 1)
    }
  }

  // Suggest batch processing strategy
  getBatchStrategy(files, scanMode) {
    const memoryEstimate = this.estimateMemoryUsage(files, scanMode)
    const limits = this.getRecommendedLimits()
    
    if (files.length <= limits.recommendedBatchSize) {
      return {
        strategy: 'single_batch',
        batches: [files],
        message: 'Processing all files in one batch'
      }
    }
    
    const batchSize = Math.floor(limits.recommendedBatchSize * 0.8) // Leave some headroom
    const batches = []
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize))
    }
    
    return {
      strategy: 'multi_batch',
      batches: batches,
      batchSize: batchSize,
      message: `Processing ${files.length} files in ${batches.length} batches for optimal performance`
    }
  }

  // Monitor performance during scanning
  createPerformanceMonitor() {
    const startTime = performance.now()
    let lastMemoryCheck = startTime
    const measurements = []
    
    return {
      measure: (phase, completed, total) => {
        const now = performance.now()
        const memory = this.getCurrentMemoryUsage()
        
        measurements.push({
          timestamp: now,
          phase,
          completed,
          total,
          progress: completed / total,
          memory,
          duration: now - startTime
        })
        
        // Check memory usage every 5 seconds
        if (now - lastMemoryCheck > 5000) {
          lastMemoryCheck = now
          this.checkMemoryPressure(memory)
        }
      },
      
      getStats: () => {
        const latest = measurements[measurements.length - 1]
        if (!latest) return null
        
        const avgProcessingTime = measurements.length > 1 
          ? (latest.timestamp - measurements[0].timestamp) / latest.completed
          : 0
          
        return {
          duration: latest.duration,
          filesProcessed: latest.completed,
          averageTimePerFile: avgProcessingTime,
          currentMemoryUsage: latest.memory,
          estimatedTimeRemaining: avgProcessingTime * (latest.total - latest.completed),
          efficiency: this.calculateEfficiency(measurements)
        }
      }
    }
  }

  // Get current memory usage
  getCurrentMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      }
    }
    return null
  }

  // Check for memory pressure and suggest actions
  checkMemoryPressure(memoryInfo) {
    if (!memoryInfo) return null
    
    const usageRatio = memoryInfo.used / memoryInfo.limit
    
    if (usageRatio > 0.8) {
      return {
        level: 'critical',
        message: 'High memory usage detected. Consider pausing the scan.',
        actions: ['Close other browser tabs', 'Reduce batch size', 'Restart browser if necessary']
      }
    } else if (usageRatio > 0.6) {
      return {
        level: 'warning',
        message: 'Moderate memory usage. Monitor performance.',
        actions: ['Close unused tabs', 'Avoid opening new applications']
      }
    }
    
    return null
  }

  // Calculate processing efficiency
  calculateEfficiency(measurements) {
    if (measurements.length < 2) return 1
    
    const recent = measurements.slice(-10) // Last 10 measurements
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp
    const filesProcessed = recent[recent.length - 1].completed - recent[0].completed
    
    if (timeSpan === 0) return 1
    
    const actualRate = filesProcessed / (timeSpan / 1000) // files per second
    const expectedRate = 10 // Expected 10 files per second baseline
    
    return Math.min(1, actualRate / expectedRate)
  }

  // Format bytes for display
  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Cleanup and garbage collection hints
  cleanup() {
    // Suggest garbage collection if available (Chrome DevTools)
    if (typeof window !== 'undefined' && window.gc) {
      window.gc()
    }
    
    // Clear any large objects from memory
    return {
      message: 'Performance optimization cleanup completed',
      suggestion: 'Consider refreshing the page if performance issues persist'
    }
  }
}