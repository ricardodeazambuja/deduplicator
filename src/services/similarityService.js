// Similarity detection service using MinHash + Shingling
export class SimilarityService {
  constructor() {
    this.workers = []
    this.maxWorkers = Math.max(2, Math.floor(navigator.hardwareConcurrency / 2)) // Use fewer workers for intensive processing
    this.currentJobId = 0
    this.cancelled = false
  }

  // Initialize Web Workers pool
  initWorkers() {
    if (this.workers.length > 0) return // Already initialized

    for (let i = 0; i < this.maxWorkers; i++) {
      // Create worker using inline code to avoid path issues in production
      const workerCode = this.getWorkerCode()
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

  // Wait for available worker
  async waitForAvailableWorker() {
    return new Promise((resolve) => {
      const checkWorker = () => {
        const worker = this.getAvailableWorker()
        if (worker) {
          resolve(worker)
        } else {
          setTimeout(checkWorker, 100) // Check every 100ms
        }
      }
      checkWorker()
    })
  }

  // Process a single file to get MinHash signature
  async processFile(file, fileName) {
    return new Promise(async (resolve, reject) => {
      this.initWorkers()
      
      const worker = await this.waitForAvailableWorker()
      worker.busy = true
      const jobId = ++this.currentJobId

      const handleMessage = (e) => {
        const { type, success, data, error } = e.data
        
        if (type === 'FILE_PROCESSED' && data.id === jobId) {
          worker.removeEventListener('message', handleMessage)
          worker.busy = false
          
          if (success) {
            resolve({
              id: data.id,
              fileName: data.fileName,
              fileSize: data.fileSize,
              shingleCount: data.shingleCount,
              signature: data.signature
            })
          } else {
            reject(new Error(error || 'Failed to process file'))
          }
        } else if (type === 'ERROR' && data?.id === jobId) {
          worker.removeEventListener('message', handleMessage)
          worker.busy = false
          reject(new Error(error))
        }
      }

      worker.addEventListener('message', handleMessage)

      // Read file as ArrayBuffer and send to worker
      const reader = new FileReader()
      reader.onload = () => {
        worker.postMessage({
          type: 'PROCESS_FILE',
          data: {
            fileData: reader.result,
            fileName,
            fileSize: file.size,
            id: jobId
          }
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

  // Get worker code as string
  getWorkerCode() {
    return `
      // MinHash + Shingling worker for similarity detection
      let minHashConfig = {
        numHashes: 128,
        shingleSize: 4,
        primes: [
          982451653, 982451729, 982451747, 982451821, 982451857, 982451867, 982451893, 982451929,
          982451981, 982452001, 982452013, 982452079, 982452091, 982452097, 982452139, 982452181
        ]
      }

      // Generate MinHash signature for file data
      function generateMinHashSignature(fileData) {
        const { numHashes, shingleSize } = minHashConfig
        const signature = new Array(numHashes).fill(Number.MAX_SAFE_INTEGER)
        
        // Create shingles from byte data
        const shingles = []
        const bytes = new Uint8Array(fileData)
        
        for (let i = 0; i <= bytes.length - shingleSize; i++) {
          const shingle = bytes.slice(i, i + shingleSize)
          shingles.push(Array.from(shingle))
        }
        
        // Generate MinHash signature
        for (let i = 0; i < numHashes; i++) {
          const prime = minHashConfig.primes[i % minHashConfig.primes.length]
          let minHash = Number.MAX_SAFE_INTEGER
          
          for (const shingle of shingles) {
            let hash = 0
            for (let j = 0; j < shingle.length; j++) {
              hash = (hash * prime + shingle[j]) % 2147483647
            }
            minHash = Math.min(minHash, hash)
          }
          
          signature[i] = minHash
        }
        
        return {
          signature,
          shingleCount: shingles.length
        }
      }
      
      // Calculate Jaccard similarity between signatures
      function calculateJaccardSimilarity(sig1, sig2) {
        if (sig1.length !== sig2.length) return 0
        
        let matches = 0
        for (let i = 0; i < sig1.length; i++) {
          if (sig1[i] === sig2[i]) matches++
        }
        
        return matches / sig1.length
      }
      
      self.onmessage = function(e) {
        const { type, data } = e.data
        
        try {
          if (type === 'SET_PARAMETERS') {
            minHashConfig.numHashes = data.numHashes || 128
            minHashConfig.shingleSize = data.shingleSize || 4
            self.postMessage({ type: 'PARAMETERS_SET' })
            
          } else if (type === 'PROCESS_FILE') {
            const { fileData, fileName, fileSize, id } = data
            const result = generateMinHashSignature(fileData)
            
            self.postMessage({
              type: 'FILE_PROCESSED',
              success: true,
              data: {
                id,
                fileName,
                fileSize,
                signature: result.signature,
                shingleCount: result.shingleCount
              }
            })
            
          } else if (type === 'COMPARE_SIGNATURES') {
            const { signatures, threshold, batchId } = data
            const similarities = []
            
            for (let i = 0; i < signatures.length; i++) {
              for (let j = i + 1; j < signatures.length; j++) {
                const similarity = calculateJaccardSimilarity(
                  signatures[i].signature,
                  signatures[j].signature
                )
                
                if (similarity >= threshold) {
                  similarities.push({
                    file1: signatures[i],
                    file2: signatures[j],
                    similarity
                  })
                }
              }
            }
            
            self.postMessage({
              type: 'SIMILARITIES_FOUND',
              success: true,
              data: {
                batchId,
                similarities
              }
            })
          }
        } catch (error) {
          self.postMessage({
            type: 'ERROR',
            success: false,
            error: error.message
          })
        }
      }
    `
  }

  // Process multiple files to get MinHash signatures
  async processFiles(files, onProgress) {
    this.resetCancellation()
    this.initWorkers()
    
    const results = []
    const totalFiles = files.length
    let completedFiles = 0

    // Process files in smaller chunks to prevent memory issues
    const chunkSize = this.maxWorkers
    for (let i = 0; i < files.length; i += chunkSize) {
      if (this.cancelled) {
        throw new Error('Operation cancelled by user')
      }
      
      const chunk = files.slice(i, i + chunkSize)
      const promises = chunk.map(async (fileInfo, idx) => {
        try {
          const result = await this.processFile(fileInfo.file, fileInfo.name)
          const processedFile = {
            ...fileInfo,
            ...result,
            index: i + idx
          }
          
          results.push(processedFile)
          completedFiles++
          
          if (onProgress) {
            onProgress({
              completed: completedFiles,
              total: totalFiles,
              progress: completedFiles / totalFiles,
              currentFile: fileInfo.name,
              result: processedFile
            })
          }
          
          return processedFile
        } catch (error) {
          const errorResult = {
            ...fileInfo,
            signature: null,
            error: error.message,
            index: i + idx
          }
          
          results.push(errorResult)
          completedFiles++
          
          if (onProgress) {
            onProgress({
              completed: completedFiles,
              total: totalFiles,
              progress: completedFiles / totalFiles,
              currentFile: fileInfo.name,
              result: errorResult,
              error: error.message
            })
          }
          
          return errorResult
        }
      })

      await Promise.all(promises)
    }

    // Sort results by original index to maintain order
    return results.sort((a, b) => a.index - b.index)
  }

  // Find similar files using MinHash signatures
  async findSimilarFiles(processedFiles, similarityThreshold = 0.8, onProgress) {
    return new Promise(async (resolve, reject) => {
      this.initWorkers()
      
      // Filter out files that failed processing
      const validFiles = processedFiles.filter(file => file.signature && !file.error)
      
      if (validFiles.length < 2) {
        resolve([])
        return
      }

      const worker = await this.waitForAvailableWorker()
      worker.busy = true
      const batchId = ++this.currentJobId

      const handleMessage = (e) => {
        const { type, success, data, error } = e.data
        
        if (type === 'SIMILARITIES_FOUND' && data.batchId === batchId) {
          worker.removeEventListener('message', handleMessage)
          worker.busy = false
          
          if (success) {
            // Group similar files
            const similarGroups = this.groupSimilarFiles(data.similarities, validFiles)
            resolve(similarGroups)
          } else {
            reject(new Error(error || 'Failed to find similarities'))
          }
        } else if (type === 'ERROR') {
          worker.removeEventListener('message', handleMessage)
          worker.busy = false
          reject(new Error(error))
        }
      }

      worker.addEventListener('message', handleMessage)

      // Send signatures for comparison
      worker.postMessage({
        type: 'COMPARE_SIGNATURES',
        data: {
          signatures: validFiles.map(file => ({
            id: file.id || file.name,
            fileName: file.name,
            signature: file.signature,
            fileInfo: file
          })),
          threshold: similarityThreshold,
          batchId: batchId
        }
      })

      // Progress reporting for similarity detection
      if (onProgress) {
        const progressInterval = setInterval(() => {
          onProgress({
            phase: 'comparing',
            message: 'Comparing file signatures for similarity...'
          })
        }, 1000)

        const originalResolve = resolve
        resolve = (result) => {
          clearInterval(progressInterval)
          originalResolve(result)
        }
      }
    })
  }

  // Group similar files from similarity pairs
  groupSimilarFiles(similarities, files) {
    const fileMap = new Map()
    files.forEach(file => {
      fileMap.set(file.name, file)
    })

    // Create a graph of similar files
    const graph = new Map()
    similarities.forEach(sim => {
      const file1Name = sim.file1.fileName
      const file2Name = sim.file2.fileName
      
      if (!graph.has(file1Name)) graph.set(file1Name, new Set())
      if (!graph.has(file2Name)) graph.set(file2Name, new Set())
      
      graph.get(file1Name).add({ fileName: file2Name, similarity: sim.similarity })
      graph.get(file2Name).add({ fileName: file1Name, similarity: sim.similarity })
    })

    // Find connected components (groups of similar files)
    const visited = new Set()
    const groups = []

    function dfs(fileName, currentGroup) {
      if (visited.has(fileName)) return
      visited.add(fileName)
      
      const fileInfo = fileMap.get(fileName)
      if (fileInfo) {
        currentGroup.push(fileInfo)
      }

      if (graph.has(fileName)) {
        for (const neighbor of graph.get(fileName)) {
          dfs(neighbor.fileName, currentGroup)
        }
      }
    }

    // Find all connected components
    for (const fileName of graph.keys()) {
      if (!visited.has(fileName)) {
        const group = []
        dfs(fileName, group)
        if (group.length > 1) {
          groups.push(group)
        }
      }
    }

    return groups
  }

  // Cleanup workers
  cleanup() {
    this.workers.forEach(worker => {
      worker.terminate()
    })
    this.workers = []
  }

  // Set similarity parameters
  async setSimilarityParameters(numHashes = 128, shingleSize = 4) {
    this.initWorkers()
    
    const promises = this.workers.map(worker => {
      return new Promise((resolve) => {
        const handleMessage = (e) => {
          if (e.data.type === 'PARAMETERS_SET') {
            worker.removeEventListener('message', handleMessage)
            resolve()
          }
        }
        worker.addEventListener('message', handleMessage)
        worker.postMessage({
          type: 'SET_PARAMETERS',
          data: { numHashes, shingleSize }
        })
      })
    })

    await Promise.all(promises)
  }
}