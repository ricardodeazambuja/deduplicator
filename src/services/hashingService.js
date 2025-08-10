// Hashing service using Web Workers
export class HashingService {
  constructor() {
    this.workers = []
    this.maxWorkers = navigator.hardwareConcurrency || 4
    this.currentJobId = 0
    this.cancelled = false
  }

  // Initialize Web Workers pool
  initWorkers() {
    if (this.workers.length > 0) return // Already initialized

    for (let i = 0; i < this.maxWorkers; i++) {
      // Create worker using inline code to avoid path issues in production
      const workerCode = `
        // SHA-256 Web Worker for file hashing
        self.onmessage = async function(e) {
          const { fileData, fileName, fileSize, id } = e.data
          
          try {
            // Hash the file data using SubtleCrypto API
            const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
            
            // Send result back to main thread
            self.postMessage({
              success: true,
              id,
              fileName,
              fileSize,
              hash,
              progress: 1
            })
          } catch (error) {
            self.postMessage({
              success: false,
              id,
              fileName,
              error: error.message
            })
          }
        }
      `
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const worker = new Worker(URL.createObjectURL(blob))
      worker.busy = false
      this.workers.push(worker)
    }
  }

  // Get available worker
  getAvailableWorker() {
    return this.workers.find(worker => !worker.busy)
  }

  // Hash a single file
  async hashFile(file, fileName) {
    return new Promise((resolve, reject) => {
      this.initWorkers()
      
      const worker = this.getAvailableWorker()
      if (!worker) {
        reject(new Error('No available workers'))
        return
      }

      worker.busy = true
      const jobId = ++this.currentJobId

      const handleMessage = (e) => {
        const { success, id, hash, error } = e.data
        
        if (id === jobId) {
          worker.removeEventListener('message', handleMessage)
          worker.busy = false
          
          if (success) {
            resolve(hash)
          } else {
            reject(new Error(error))
          }
        }
      }

      worker.addEventListener('message', handleMessage)

      // Read file as ArrayBuffer and send to worker
      const reader = new FileReader()
      reader.onload = () => {
        worker.postMessage({
          fileData: reader.result,
          fileName,
          fileSize: file.size,
          id: jobId
        })
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  // Cancel current operation
  cancel() {
    this.cancelled = true
  }

  // Reset cancellation state
  resetCancellation() {
    this.cancelled = false
  }

  // Hash multiple files with progress callback
  async hashFiles(files, onProgress) {
    this.resetCancellation()
    this.initWorkers()
    
    const results = []
    const totalFiles = files.length
    let completedFiles = 0

    // Process files in parallel using available workers
    const processFile = async (fileInfo, index) => {
      try {
        const hash = await this.hashFile(fileInfo.file, fileInfo.name)
        const result = {
          ...fileInfo,
          hash,
          index
        }
        
        results.push(result)
        completedFiles++
        
        if (onProgress) {
          onProgress({
            completed: completedFiles,
            total: totalFiles,
            progress: completedFiles / totalFiles,
            currentFile: fileInfo.name,
            result
          })
        }
        
        return result
      } catch (error) {
        const result = {
          ...fileInfo,
          hash: null,
          error: error.message,
          index
        }
        
        results.push(result)
        completedFiles++
        
        if (onProgress) {
          onProgress({
            completed: completedFiles,
            total: totalFiles,
            progress: completedFiles / totalFiles,
            currentFile: fileInfo.name,
            result,
            error: error.message
          })
        }
        
        return result
      }
    }

    // Process files in chunks to avoid overwhelming the system
    const chunkSize = this.maxWorkers
    for (let i = 0; i < files.length; i += chunkSize) {
      if (this.cancelled) {
        throw new Error('Operation cancelled by user')
      }
      
      const chunk = files.slice(i, i + chunkSize)
      const promises = chunk.map((file, idx) => processFile(file, i + idx))
      await Promise.all(promises)
    }

    // Sort results by original index to maintain order
    return results.sort((a, b) => a.index - b.index)
  }

  // Find duplicate files by hash
  findDuplicates(hashedFiles) {
    const hashGroups = {}
    
    // Group files by hash
    hashedFiles.forEach(file => {
      if (file.hash && !file.error) {
        if (!hashGroups[file.hash]) {
          hashGroups[file.hash] = []
        }
        hashGroups[file.hash].push(file)
      }
    })

    // Return only groups with more than one file (duplicates)
    return Object.values(hashGroups).filter(group => group.length > 1)
  }

  // Cleanup workers
  cleanup() {
    this.workers.forEach(worker => {
      worker.terminate()
    })
    this.workers = []
  }
}