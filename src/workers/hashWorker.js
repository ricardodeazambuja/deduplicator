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