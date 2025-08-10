// MinHash + Shingling Web Worker for similarity detection
class MinHashSimilarity {
  constructor(numHashes = 128, shingleSize = 4) {
    this.numHashes = numHashes
    this.shingleSize = shingleSize
    
    // Generate random hash functions using simple linear congruential generators
    this.hashFunctions = []
    for (let i = 0; i < numHashes; i++) {
      this.hashFunctions.push({
        a: this.randomPrime(i + 1),
        b: this.randomPrime(i + 2),
        p: 2147483647 // Large prime
      })
    }
  }

  // Generate a simple prime for hash functions (not cryptographically secure)
  randomPrime(seed) {
    const primes = [
      2147483647, 2147483629, 2147483587, 2147483579, 2147483563, 2147483549, 
      2147483543, 2147483497, 2147483489, 2147483477, 2147483423, 2147483399,
      2147483353, 2147483323, 2147483269, 2147483249, 2147483237, 2147483179
    ]
    return primes[seed % primes.length]
  }

  // Create shingles from binary data
  createShingles(data) {
    const shingles = new Set()
    const uint8Array = new Uint8Array(data)
    
    if (uint8Array.length < this.shingleSize) {
      // For very small files, use the entire content as one shingle
      const shingleValue = Array.from(uint8Array).join(',')
      shingles.add(shingleValue)
      return shingles
    }

    // Create overlapping shingles
    for (let i = 0; i <= uint8Array.length - this.shingleSize; i++) {
      const shingle = uint8Array.slice(i, i + this.shingleSize)
      const shingleValue = Array.from(shingle).join(',')
      shingles.add(shingleValue)
    }

    return shingles
  }

  // Simple hash function for strings
  stringHash(str, hashFunc) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash * hashFunc.a) + str.charCodeAt(i)) % hashFunc.p
    }
    return ((hash * hashFunc.a) + hashFunc.b) % hashFunc.p
  }

  // Generate MinHash signature for a set of shingles
  generateMinHashSignature(shingles) {
    const signature = new Array(this.numHashes).fill(Number.MAX_SAFE_INTEGER)
    
    for (const shingle of shingles) {
      for (let i = 0; i < this.numHashes; i++) {
        const hash = this.stringHash(shingle, this.hashFunctions[i])
        signature[i] = Math.min(signature[i], hash)
      }
    }

    return signature
  }

  // Calculate Jaccard similarity between two MinHash signatures
  calculateJaccardSimilarity(sig1, sig2) {
    if (sig1.length !== sig2.length) return 0

    let matches = 0
    for (let i = 0; i < sig1.length; i++) {
      if (sig1[i] === sig2[i]) {
        matches++
      }
    }

    return matches / sig1.length
  }

  // Process a file and return its MinHash signature
  processFile(fileData) {
    const shingles = this.createShingles(fileData)
    const signature = this.generateMinHashSignature(shingles)
    
    return {
      shingleCount: shingles.size,
      signature: signature
    }
  }
}

// Global instance
const minHashProcessor = new MinHashSimilarity()

self.onmessage = async function(e) {
  const { type, data } = e.data

  try {
    if (type === 'PROCESS_FILE') {
      const { fileData, fileName, fileSize, id } = data
      
      // Process the file to get MinHash signature
      const result = minHashProcessor.processFile(fileData)
      
      self.postMessage({
        type: 'FILE_PROCESSED',
        success: true,
        data: {
          id,
          fileName,
          fileSize,
          shingleCount: result.shingleCount,
          signature: result.signature
        }
      })

    } else if (type === 'COMPARE_SIGNATURES') {
      const { signatures, threshold, batchId } = data
      const similarities = []
      
      // Compare all pairs of signatures
      for (let i = 0; i < signatures.length; i++) {
        for (let j = i + 1; j < signatures.length; j++) {
          const similarity = minHashProcessor.calculateJaccardSimilarity(
            signatures[i].signature,
            signatures[j].signature
          )
          
          if (similarity >= threshold) {
            similarities.push({
              file1: signatures[i],
              file2: signatures[j],
              similarity: similarity
            })
          }
        }
      }

      self.postMessage({
        type: 'SIMILARITIES_FOUND',
        success: true,
        data: {
          batchId,
          similarities,
          processed: signatures.length
        }
      })

    } else if (type === 'SET_PARAMETERS') {
      const { numHashes, shingleSize } = data
      minHashProcessor = new MinHashSimilarity(numHashes, shingleSize)
      
      self.postMessage({
        type: 'PARAMETERS_SET',
        success: true,
        data: { numHashes, shingleSize }
      })
    }

  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      success: false,
      error: error.message,
      data: data
    })
  }
}