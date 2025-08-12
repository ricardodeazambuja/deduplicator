# Dedupe-Local: Technical Overview

> Technical guide for developers working on the Dedupe-Local file deduplication web application.

## 🏗️ Architecture

Dedupe-Local is a client-side web application that processes files entirely in the browser without server dependencies.

**Key Design Decisions:**
- **Privacy-First**: Files never leave the user's device
- **Performance**: Web Workers for non-blocking background processing
- **Memory Management**: Streaming processing to handle large datasets

## 🛠️ Technology Stack

### Core Technologies
```javascript
// React 19 with Vite
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- **React 19**: UI framework with concurrent features
- **Vite**: Build tool with fast HMR and optimized bundling
- **Material-UI v7**: Component library with accessibility built-in
- **Zustand**: Lightweight state management (2.5kb vs Redux 45kb)

### State Management
```javascript
import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  scanMode: 'exact',
  isScanning: false,
  progress: 0,
  setScanMode: (mode) => set({ scanMode: mode }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
}))
```

## 🔄 File Processing Pipeline

### Processing Stages
1. **File Discovery**: File System Access API for secure folder access
2. **File Reading**: FileReader API for binary data access
3. **Hash Computation**: Web Workers + SubtleCrypto for performance
4. **Duplicate Detection**: Algorithm execution
5. **Result Presentation**: UI updates

### File Discovery Implementation
```javascript
// FileSystemService.js - Recursive directory traversal
async getAllFiles(directoryHandle, path = '') {
  const files = []
  
  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile()
      files.push({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        path: `${path}/${name}`,
        file,
        fileHandle: handle
      })
    } else if (handle.kind === 'directory') {
      const subFiles = await this.getAllFiles(handle, `${path}/${name}`)
      files.push(...subFiles)
    }
  }
  
  return files
}
```

## 🧮 Duplicate Detection Algorithms

### 1. Exact Match (SHA-256)
Uses cryptographic hashing for identical file detection:

```javascript
// hashWorker.js - Web Worker implementation
self.onmessage = async function(e) {
  const { fileData, fileName, fileSize, id } = e.data
  
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    self.postMessage({ success: true, id, hash })
  } catch (error) {
    self.postMessage({ success: false, id, error: error.message })
  }
}
```

**Benefits**: Collision-resistant, deterministic, hardware-accelerated

### 2. Filename-Based Detection
Pattern recognition for common filename variations:

```javascript
class FilenameService {
  constructor() {
    this.patterns = {
      copyPattern: /\s*-?\s*(copy|Copy|COPY)(\s*\(\d+\))?$/,
      numberPattern: /\s*-?\s*\(\d+\)$/,
      versionPattern: /\s*[_-]?v?\d+(\.\d+)*$/,
      duplicatePattern: /\s*[_-]?(dup|duplicate)(\s*\d+)?$/
    }
  }
  
  calculateFilenameSimilarity(filename1, filename2, mode = 'smart') {
    switch (mode) {
      case 'exact': return filename1 === filename2 ? 1.0 : 0.0
      case 'smart': return this.smartPatternMatch(filename1, filename2)  
      case 'fuzzy': return this.levenshteinSimilarity(filename1, filename2)
    }
  }
}
```

### 3. Content Similarity (MinHash + Shingling)
For detecting similar binary files:

```javascript
function generateMinHashSignature(fileData) {
  const { numHashes, shingleSize } = { numHashes: 128, shingleSize: 4 }
  const signature = new Array(numHashes).fill(Number.MAX_SAFE_INTEGER)
  
  // Create shingles (overlapping byte sequences)
  const shingles = []
  const bytes = new Uint8Array(fileData)
  
  for (let i = 0; i <= bytes.length - shingleSize; i++) {
    const shingle = bytes.slice(i, i + shingleSize)
    shingles.push(Array.from(shingle))
  }
  
  // Generate MinHash signature using multiple hash functions
  for (let i = 0; i < numHashes; i++) {
    const prime = primes[i % primes.length]
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
  
  return { signature, shingleCount: shingles.length }
}
```

**Algorithm Properties:**
- Works on any binary file type
- O(1) space complexity for signatures
- Configurable similarity thresholds

### 4. Multi-Criteria Detection
Combines multiple detection methods with priority-based conflict resolution:

```javascript
class MultiCriteriaService {
  async findMultiCriteriaDuplicates(files, options, onProgress) {
    const { criteria, weights, priorityOrder } = options
    const results = new Map()
    
    // Run selected detection methods
    if (criteria.exact) {
      const exactGroups = await this.hashingService.findExactDuplicates(files)
      this.mergeResults(results, exactGroups, 'exact', weights.exact)
    }
    
    if (criteria.filename) {
      const filenameGroups = await this.filenameService.findFilenameDuplicates(files)
      this.mergeResults(results, filenameGroups, 'filename', weights.filename)
    }
    
    if (criteria.similarity) {
      const similarGroups = await this.similarityService.findSimilarFiles(files)
      this.mergeResults(results, similarGroups, 'similarity', weights.similarity)
    }
    
    return this.resolveConflicts(results, priorityOrder)
  }
}
```

## ⚡ Web Workers Implementation

### Dynamic Worker Creation
Workers are created using Blob URLs to work in production builds:

```javascript
initWorkers() {
  for (let i = 0; i < this.maxWorkers; i++) {
    const workerCode = `
      self.onmessage = async function(e) {
        // Worker implementation here
      }
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const worker = new Worker(URL.createObjectURL(blob))
    worker.busy = false
    this.workers.push(worker)
  }
}
```

### Worker Pool Management
```javascript
class WorkerPool {
  getAvailableWorker() {
    return this.workers.find(worker => !worker.busy)
  }
  
  async processFile(file) {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker()
      if (!worker) {
        this.jobQueue.push({ file, resolve, reject })
        return
      }
      
      this.executeJob(worker, file, resolve, reject)
    })
  }
}
```

## 💾 File System Integration

### Modern File System Access API
```javascript
class FileSystemService {
  async selectFolder() {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('File System Access API not supported')
    }
    
    const directoryHandle = await window.showDirectoryPicker({
      id: 'deduplicator-folder',
      mode: 'readwrite',
      startIn: 'documents'
    })
    
    return directoryHandle
  }
  
  async deleteFile(fileHandle, fileName) {
    const permission = await this.verifyPermission(fileHandle, 'readwrite')
    if (permission !== 'granted') {
      throw new Error(`Permission denied for ${fileName}`)
    }
    
    await fileHandle.remove()
    return { success: true, fileName }
  }
}
```

## 🚀 Performance Optimization

### Memory Management
```javascript
// Process files in chunks to avoid memory exhaustion
const chunkSize = this.maxWorkers
for (let i = 0; i < files.length; i += chunkSize) {
  const chunk = files.slice(i, i + chunkSize)
  await Promise.all(chunk.map(processFile))
  
  // Allow garbage collection between chunks
  if (i % (chunkSize * 10) === 0) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}
```

### Bundle Optimization
```javascript
// vite.config.js - Code splitting strategy
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@emotion/react'],
          utils: ['zustand', 'idb']
        }
      }
    }
  }
})
```

## 🔒 Security Considerations

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="
        default-src 'self';
        script-src 'self' 'unsafe-inline';
        worker-src 'self' blob:;
        connect-src 'self';
      ">
```

### Cryptographic Security
- Uses SubtleCrypto for SHA-256 (hardware-accelerated, timing-attack resistant)
- File System Access API provides secure, permission-based file access
- Web Worker isolation prevents memory attacks

## 🧪 Testing Strategy

### Test Architecture
```javascript
// Playwright E2E tests
test('SHA-256 hash consistency', async ({ page }) => {
  const testFile = new Uint8Array([1, 2, 3, 4, 5])
  
  const hash1 = await computeHash(testFile)
  const hash2 = await computeHash(testFile)
  
  expect(hash1).toBe(hash2)
  expect(hash1).toMatch(/^[a-f0-9]{64}$/)
})
```

### Page Object Model
```javascript
class DedupeApp {
  constructor(page) {
    this.page = page
    this.folderButton = page.locator('button:has-text("Choose Folder")')
    this.scanButton = page.locator('button:has-text("Start Scan")')
  }
  
  async selectExactMode() {
    await this.page.locator('input[value="exact"]').click()
  }
}
```

## 📦 Build and Deployment

### Build Pipeline
```javascript
const buildPipeline = {
  1: 'Source Code Compilation',
  2: 'Bundle Optimization', 
  3: 'Asset Processing',
  4: 'Worker Inline Conversion',
  5: 'Static Asset Generation'
}
```

### GitHub Actions CI/CD
```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [ main ]
    paths:
      - 'src/**'
      - 'public/**'
      - 'index.html'
      - 'package*.json'
      - 'vite.config.js'
      - 'tests/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'src/**'
      - 'public/**'
      - 'index.html'
      - 'package*.json'
      - 'vite.config.js'
      - 'tests/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build:github
      - run: npx playwright install --with-deps
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm run build:github
      - uses: actions/deploy-pages@v4
```

## 🎯 Advanced Patterns

### Service Layer Pattern
Each major feature is organized as an independent service with clean APIs:

```javascript
class HashingService {
  constructor() {
    this.workers = []
    this.maxWorkers = navigator.hardwareConcurrency || 4
  }
  
  async hashFiles(files, onProgress) { /* Implementation */ }
  cancel() { this.cancelled = true }
  cleanup() { /* Worker cleanup */ }
}
```

### Observer Pattern
Progress tracking without tight coupling:

```javascript
async hashFiles(files, onProgress) {
  for (const [index, file] of files.entries()) {
    const result = await this.processFile(file)
    
    onProgress({
      completed: index + 1,
      total: files.length,
      progress: (index + 1) / files.length,
      currentFile: file.name
    })
  }
}
```

## 🚀 Getting Started

### Prerequisites
```bash
node --version  # v18.0.0+
npm --version   # v8.0.0+
```

### Development Setup
```bash
git clone <repository-url>
cd deduplicator
npm install

npm run dev     # Development server
npm run test    # Test suite
npm run build   # Production build
```

### Code Structure
1. **`src/App.jsx`** - Main component structure
2. **`src/services/`** - Business logic implementation
3. **`src/workers/`** - Algorithm implementations
4. **`tests/`** - Testing patterns and examples
5. **`vite.config.js`** - Build configuration

---

This technical overview covers the essential architecture and implementation details for developers working on Dedupe-Local.