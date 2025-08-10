# Dedupe-Local: Technical Architecture Deep Dive

> A comprehensive technical guide to understanding the architecture, algorithms, and implementation decisions behind the Dedupe-Local file deduplication web application.

## 🏗️ Architecture Overview

Dedupe-Local is a sophisticated client-side web application that demonstrates advanced web development patterns, algorithms, and browser APIs. This document provides a deep technical analysis suitable for developers who want to understand the complete system design.

## 📚 Table of Contents

- [Architecture Philosophy](#architecture-philosophy)
- [Technology Stack Justification](#technology-stack-justification)
- [Core Systems Architecture](#core-systems-architecture)
- [File Processing Pipeline](#file-processing-pipeline)
- [Duplicate Detection Algorithms](#duplicate-detection-algorithms)
- [State Management Strategy](#state-management-strategy)
- [Web Workers Implementation](#web-workers-implementation)
- [File System Integration](#file-system-integration)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Testing Strategy](#testing-strategy)
- [Build and Deployment](#build-and-deployment)
- [Advanced Patterns Used](#advanced-patterns-used)

---

## 🎯 Architecture Philosophy

### Privacy-First Design
The entire application runs in the browser with **zero server dependencies**. This architectural decision was driven by:

- **Privacy Guarantees**: Files never leave the user's device
- **Security**: No attack surface from server vulnerabilities  
- **Scalability**: No server infrastructure costs
- **Accessibility**: Works offline and on any web server

### Performance-Oriented Architecture
The system is designed to handle large datasets (thousands of files) efficiently:

- **Web Workers**: Non-blocking background processing
- **Streaming**: Process files without loading everything into memory
- **Progressive Enhancement**: Features degrade gracefully
- **Memory Management**: Proactive cleanup and monitoring

---

## 🛠️ Technology Stack Justification

### React 19 + Vite
```javascript
// React 19 with concurrent features and strict mode
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

**Why React 19?**
- **Concurrent Features**: Built-in support for background processing
- **Automatic Batching**: Optimizes state updates during file processing
- **Improved Error Boundaries**: Better error handling during file operations
- **Server Components**: Future-proof for potential SSR

**Why Vite?**
- **Fast HMR**: Essential during development with complex state
- **Native ES Modules**: Efficient code splitting for workers
- **Optimized Bundle**: Tree-shaking and chunk splitting
- **Web Worker Support**: First-class support for worker imports

### Material-UI (MUI) v7
```javascript
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline, Container, Typography } from '@mui/material'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
})
```

**Design System Rationale:**
- **Accessibility**: WCAG 2.1 compliance built-in
- **Theming**: Consistent design tokens and responsive breakpoints
- **Components**: Complex components (Accordion, Dialog, Slider) pre-built
- **TypeScript**: Excellent TypeScript support for large codebases

### Zustand State Management
```javascript
import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // State
  scanMode: 'exact',
  isScanning: false,
  progress: 0,
  
  // Actions
  setScanMode: (mode) => set({ scanMode: mode }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
}))
```

**Why Zustand over Redux/Context?**
- **Simplicity**: No boilerplate, direct mutations
- **Performance**: Fine-grained subscriptions prevent unnecessary re-renders
- **DevTools**: Great debugging experience
- **Bundle Size**: Tiny footprint (2.5kb vs Redux 45kb)

---

## 🏛️ Core Systems Architecture

### System Components Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │FolderSelect │  │Progress     │  │Results Display      │ │
│  │Component    │  │Tracker      │  │Components           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   State Management Layer                    │
│                     (Zustand Store)                        │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │File System │  │Hashing      │  │Similarity           │ │
│  │Service      │  │Service      │  │Service              │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                     Worker Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │SHA-256      │  │MinHash      │  │File I/O             │ │
│  │Workers      │  │Workers      │  │Workers              │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Browser APIs Layer                        │
│  File System Access │ Web Workers │ SubtleCrypto │ IndexedDB│
└─────────────────────────────────────────────────────────────┘
```

### Service Architecture Pattern

Each major feature is organized as an independent service:

```javascript
// Service Interface Pattern
class HashingService {
  constructor() {
    this.workers = []
    this.maxWorkers = navigator.hardwareConcurrency || 4
    this.cancelled = false
  }
  
  async hashFiles(files, onProgress) { /* Implementation */ }
  cancel() { this.cancelled = true }
  cleanup() { /* Worker cleanup */ }
}
```

This pattern provides:
- **Separation of Concerns**: Each service handles one domain
- **Testability**: Services can be tested in isolation
- **Reusability**: Services can be used across components
- **Resource Management**: Proper cleanup and lifecycle management

---

## 🔄 File Processing Pipeline

### Pipeline Architecture

The file processing system uses a multi-stage pipeline:

```javascript
// Pipeline stages
const processingPipeline = {
  1: 'File Discovery',      // File System Access API
  2: 'File Reading',        // FileReader API
  3: 'Hash Computation',    // Web Workers + SubtleCrypto
  4: 'Duplicate Detection', // Algorithm execution
  5: 'Result Presentation'  // UI updates
}
```

### Stage 1: File Discovery
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
        fileHandle: handle,
        directoryHandle
      })
    } else if (handle.kind === 'directory') {
      // Recursive traversal
      const subFiles = await this.getAllFiles(handle, `${path}/${name}`)
      files.push(...subFiles)
    }
  }
  
  return files
}
```

**Key Decisions:**
- **Recursive Traversal**: Handles nested directory structures
- **Metadata Preservation**: Keeps file handles for operations
- **Memory Efficiency**: Streams results instead of building large arrays

### Stage 2: Parallel Processing Strategy
```javascript
// Chunk-based processing for optimal performance
async hashFiles(files, onProgress) {
  const chunkSize = this.maxWorkers
  
  for (let i = 0; i < files.length; i += chunkSize) {
    if (this.cancelled) throw new Error('Operation cancelled')
    
    const chunk = files.slice(i, i + chunkSize)
    const promises = chunk.map((file, idx) => this.processFile(file, i + idx))
    
    await Promise.all(promises) // Parallel execution within chunk
  }
}
```

**Performance Characteristics:**
- **Parallelism**: Processes files in parallel up to hardware limits
- **Backpressure**: Chunk-based processing prevents memory overflow
- **Cancellation**: Responsive to user cancellation requests
- **Progress**: Real-time feedback on processing status

---

## 🧮 Duplicate Detection Algorithms

### 1. Exact Match Algorithm (SHA-256)

```javascript
// hashWorker.js - Cryptographic hashing in Web Worker
self.onmessage = async function(e) {
  const { fileData, fileName, fileSize, id } = e.data
  
  try {
    // Use SubtleCrypto for performance and security
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    self.postMessage({ success: true, id, hash })
  } catch (error) {
    self.postMessage({ success: false, id, error: error.message })
  }
}
```

**Algorithm Properties:**
- **Cryptographic Security**: SHA-256 is collision-resistant
- **Deterministic**: Same file always produces same hash
- **Fast**: SubtleCrypto API uses hardware acceleration when available
- **Cross-platform**: Works identically across all browsers/OS

### 2. Filename-Based Detection Algorithm

```javascript
// filenameService.js - Intelligent filename pattern recognition
class FilenameService {
  constructor() {
    this.patterns = {
      copyPattern: /\s*-?\s*(copy|Copy|COPY)(\s*\(\d+\))?$/,
      numberPattern: /\s*-?\s*\(\d+\)$/,
      versionPattern: /\s*[_-]?v?\d+(\.\d+)*$/,
      duplicatePattern: /\s*[_-]?(dup|duplicate|Duplicate)(\s*\d+)?$/,
      timestampPattern: /\s*[_-]?\d{4}[-_]\d{2}[-_]\d{2}/
    }
  }
  
  calculateFilenameSimilarity(filename1, filename2, mode = 'smart') {
    switch (mode) {
      case 'exact': return filename1 === filename2 ? 1.0 : 0.0
      case 'exact-base': return this.compareBaseNames(filename1, filename2)
      case 'smart': return this.smartPatternMatch(filename1, filename2)  
      case 'fuzzy': return this.levenshteinSimilarity(filename1, filename2)
    }
  }
}
```

**Algorithm Features:**
- **Pattern Recognition**: Detects common filename variations (copy, duplicate, versions)
- **Four Detection Modes**: Exact, exact-base, smart pattern matching, fuzzy similarity
- **Levenshtein Distance**: For fuzzy matching with configurable thresholds
- **Base Name Extraction**: Normalizes filenames by removing patterns and extensions

### 3. Content Similarity Algorithm (MinHash + Shingling)

The similarity detection uses a sophisticated algorithm for detecting similar binary files:

```javascript
// similarityWorker.js - MinHash implementation
function generateMinHashSignature(fileData) {
  const { numHashes, shingleSize } = minHashConfig // 128 hashes, 4-byte shingles
  const signature = new Array(numHashes).fill(Number.MAX_SAFE_INTEGER)
  
  // Step 1: Create shingles (overlapping byte sequences)
  const shingles = []
  const bytes = new Uint8Array(fileData)
  
  for (let i = 0; i <= bytes.length - shingleSize; i++) {
    const shingle = bytes.slice(i, i + shingleSize)
    shingles.push(Array.from(shingle))
  }
  
  // Step 2: Generate MinHash signature
  for (let i = 0; i < numHashes; i++) {
    const prime = primes[i % primes.length] // Use different hash functions
    let minHash = Number.MAX_SAFE_INTEGER
    
    for (const shingle of shingles) {
      // Hash each shingle with this hash function
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

**Algorithm Deep Dive:**

1. **Shingling**: Converts files to sets of overlapping byte sequences
   ```
   File bytes: [0x48, 0x65, 0x6C, 0x6C, 0x6F] "Hello"
   4-byte shingles: 
   - [0x48, 0x65, 0x6C, 0x6C]
   - [0x65, 0x6C, 0x6C, 0x6F]
   ```

2. **MinHash**: Creates compact signatures preserving similarity
   - Uses multiple hash functions (different primes)
   - Takes minimum hash value for each function
   - Results in fixed-size signature regardless of file size

3. **Jaccard Similarity**: Compares signatures
   ```javascript
   function calculateJaccardSimilarity(sig1, sig2) {
     let matches = 0
     for (let i = 0; i < sig1.length; i++) {
       if (sig1[i] === sig2[i]) matches++
     }
     return matches / sig1.length
   }
   ```

**Why This Algorithm?**
- **Universal**: Works on any binary file type (not just images)
- **Efficient**: O(1) space complexity for signatures
- **Scalable**: Comparison is O(n²) but with small constant factors
- **Tunable**: Threshold allows precision/recall tradeoffs

### 4. Multi-Criteria Detection Algorithm

```javascript
// multiCriteriaService.js - Advanced priority-based detection
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
    
    // Apply priority-based conflict resolution
    return this.resolveConflicts(results, priorityOrder)
  }
}
```

**Advanced Features:**
- **Configurable Criteria**: Select which detection methods to combine
- **Priority-Based Resolution**: Handles conflicts between detection methods
- **Weighted Scoring**: Adjustable influence of each detection method
- **Confidence Scoring**: Provides confidence ratings for each duplicate group

---

## 📊 State Management Strategy

### Zustand Store Architecture

```javascript
// appStore.js - Complete state management
export const useAppStore = create((set, get) => ({
  // Core scanning state
  scanMode: 'exact',
  isScanning: false,
  progress: 0,
  currentFile: null,
  scanPhase: '',
  
  // Results state
  files: [],
  duplicateGroups: [],
  similarGroups: [],
  
  // UI state
  selectedFolder: null,
  similarityThreshold: 0.8,
  
  // Actions with optimized updates
  setProgress: (progress) => set({ progress }),
  setCurrentFile: (file) => set({ currentFile: file }),
  
  // Batch updates for performance
  updateScanProgress: (progress, currentFile, phase) => set({
    progress,
    currentFile,
    scanPhase: phase
  }),
  
  // Complex state transitions
  startScan: () => set({
    isScanning: true,
    progress: 0,
    currentFile: null,
    duplicateGroups: [],
    similarGroups: []
  })
}))
```

### State Update Patterns

**Real-time Progress Updates:**
```javascript
// High-frequency updates optimized with batching
const updateProgress = useCallback((progressData) => {
  // Batch multiple state updates
  updateScanProgress(
    progressData.progress,
    progressData.currentFile,
    progressData.phase
  )
}, [updateScanProgress])
```

**Memory Management:**
```javascript
// Cleanup pattern for large datasets
const reset = () => set({
  isScanning: false,
  progress: 0,
  currentFile: null,
  scanPhase: '',
  files: [],           // Release file references
  duplicateGroups: [], // Release duplicate data
  similarGroups: []    // Release similarity data
})
```

---

## ⚡ Web Workers Implementation

### Architecture Decision: Inline vs External Workers

**Challenge**: External worker files don't exist in production builds.

**Solution**: Dynamic worker creation using Blob URLs:

```javascript
// hashingService.js - Dynamic worker creation
initWorkers() {
  for (let i = 0; i < this.maxWorkers; i++) {
    // Create worker from inline code
    const workerCode = `
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
// Intelligent worker allocation
class WorkerPool {
  constructor(maxWorkers) {
    this.workers = []
    this.maxWorkers = maxWorkers
    this.jobQueue = []
    this.currentJobId = 0
  }
  
  getAvailableWorker() {
    return this.workers.find(worker => !worker.busy)
  }
  
  async processFile(file) {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker()
      if (!worker) {
        // Queue job if no workers available
        this.jobQueue.push({ file, resolve, reject })
        return
      }
      
      this.executeJob(worker, file, resolve, reject)
    })
  }
}
```

**Benefits:**
- **Production Compatibility**: Works in built applications
- **Resource Management**: Automatic worker lifecycle management
- **Load Balancing**: Distributes work across available cores
- **Error Handling**: Graceful degradation on worker failures

---

## 💾 File System Integration

### File System Access API Implementation

```javascript
// fileSystemService.js - Modern file system integration
class FileSystemService {
  async selectFolder() {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('File System Access API not supported')
    }
    
    try {
      const directoryHandle = await window.showDirectoryPicker({
        id: 'deduplicator-folder',
        mode: 'readwrite', // Needed for file deletion
        startIn: 'documents'
      })
      
      return directoryHandle
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('User cancelled folder selection')
      }
      throw error
    }
  }
  
  // Recursive directory traversal with permission handling
  async getAllFiles(directoryHandle, path = '') {
    const files = []
    
    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        // Request permission for each entry
        if (await this.verifyPermission(handle) === 'denied') {
          continue // Skip inaccessible files
        }
        
        if (handle.kind === 'file') {
          files.push(await this.createFileInfo(handle, path, name))
        } else if (handle.kind === 'directory') {
          const subFiles = await this.getAllFiles(handle, `${path}/${name}`)
          files.push(...subFiles)
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${path}:`, error)
    }
    
    return files
  }
}
```

### Security and Permissions

**Permission Verification:**
```javascript
async verifyPermission(handle, mode = 'read') {
  const options = { mode }
  
  // Check current permission
  if (await handle.queryPermission(options) === 'granted') {
    return 'granted'
  }
  
  // Request permission if not granted
  if (await handle.requestPermission(options) === 'granted') {
    return 'granted'
  }
  
  return 'denied'
}
```

**Safe File Operations:**
```javascript
async deleteFile(fileHandle, fileName) {
  try {
    // Double-check permission
    const permission = await this.verifyPermission(fileHandle, 'readwrite')
    if (permission !== 'granted') {
      throw new Error(`Permission denied for ${fileName}`)
    }
    
    await fileHandle.remove()
    return { success: true, fileName }
  } catch (error) {
    return { success: false, fileName, error: error.message }
  }
}
```

---

## 🚀 Performance Optimization

### Memory Management Strategy

**Problem**: Large file sets can exhaust browser memory.

**Solutions Implemented:**

1. **Streaming File Processing:**
```javascript
// Process files in chunks to avoid memory buildup
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

2. **Memory Monitoring:**
```javascript
// performanceOptimizer.js - Real-time memory tracking
class PerformanceOptimizer {
  createPerformanceMonitor() {
    return {
      measure(operation, completed, total) {
        const memoryInfo = performance.memory
        if (memoryInfo) {
          const usedMB = memoryInfo.usedJSHeapSize / 1048576
          const totalMB = memoryInfo.totalJSHeapSize / 1048576
          
          // Warn if memory usage is high
          if (usedMB / totalMB > 0.8) {
            console.warn('High memory usage detected:', {
              used: `${usedMB.toFixed(1)}MB`,
              total: `${totalMB.toFixed(1)}MB`,
              operation,
              progress: `${completed}/${total}`
            })
          }
        }
      }
    }
  }
}
```

### Bundle Optimization

**Code Splitting Strategy:**
```javascript
// vite.config.js - Manual chunk optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],           // Core React (11.8KB)
          ui: ['@mui/material', '@emotion/react'],  // UI components (281KB)
          utils: ['zustand', 'idb']                 // Utilities (4KB)
        }
      }
    }
  }
})
```

**Result**: Optimized loading with parallel chunk downloads and effective caching.

---

## 🔒 Security Considerations

### Client-Side Security Model

**Threat Model Analysis:**

1. **Data Leakage**: Prevented by client-side-only processing
2. **File System Access**: Limited by browser security model
3. **Code Injection**: Mitigated by Content Security Policy
4. **Memory Attacks**: Addressed by Web Worker isolation

### Content Security Policy

```html
<!-- Recommended CSP for production -->
<meta http-equiv="Content-Security-Policy" 
      content="
        default-src 'self';
        script-src 'self' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        worker-src 'self' blob:;
        connect-src 'self';
        img-src 'self' data:;
      ">
```

### Cryptographic Considerations

**SHA-256 Implementation:**
```javascript
// Using SubtleCrypto for cryptographic security
const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)

// Why SubtleCrypto?
// - Hardware acceleration when available
// - Constant-time implementations (timing attack resistant)
// - Browser-native security features
// - FIPS 140-2 compliance in some environments
```

---

## 🧪 Testing Strategy

### Multi-Level Testing Architecture

```
┌─────────────────────────────────────────────────┐
│               E2E Tests (Playwright)            │
│  Full user workflows, browser compatibility     │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│            Integration Tests                    │
│  Service interactions, API integrations        │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│              Unit Tests                         │
│  Algorithm correctness, utility functions      │
└─────────────────────────────────────────────────┘
```

### Playwright Test Patterns

**Page Object Model:**
```javascript
// page-objects/DedupeApp.js
class DedupeApp {
  constructor(page) {
    this.page = page
    this.folderButton = page.locator('button:has-text("Choose Folder")')
    this.scanButton = page.locator('button:has-text("Start Scan")')
    this.progressBar = page.locator('.MuiLinearProgress-root')
  }
  
  async selectExactMode() {
    await this.page.locator('input[value="exact"]').click()
  }
  
  async waitForScanComplete() {
    await this.progressBar.waitFor({ state: 'visible' })
    await this.progressBar.waitFor({ state: 'hidden' })
  }
}
```

**Algorithm Testing:**
```javascript
// Algorithm correctness tests
test('SHA-256 hash consistency', async ({ page }) => {
  // Test that identical files produce identical hashes
  const testFile = new Uint8Array([1, 2, 3, 4, 5])
  
  const hash1 = await computeHash(testFile)
  const hash2 = await computeHash(testFile)
  
  expect(hash1).toBe(hash2)
  expect(hash1).toMatch(/^[a-f0-9]{64}$/) // Valid SHA-256 format
})

test('MinHash similarity properties', async ({ page }) => {
  const file1 = createTestFile("Hello World")
  const file2 = createTestFile("Hello World!")  // Similar
  const file3 = createTestFile("Completely different")
  
  const sig1 = await generateMinHash(file1)
  const sig2 = await generateMinHash(file2)
  const sig3 = await generateMinHash(file3)
  
  const similarity12 = jaccardSimilarity(sig1, sig2)
  const similarity13 = jaccardSimilarity(sig1, sig3)
  
  expect(similarity12).toBeGreaterThan(similarity13)
})
```

---

## 📦 Build and Deployment

### Build Process Architecture

```javascript
// Build pipeline stages
const buildPipeline = {
  1: 'Source Code Compilation',    // TypeScript/JSX → JavaScript
  2: 'Bundle Optimization',        // Tree-shaking, code splitting
  3: 'Asset Processing',          // Image optimization, CSS processing
  4: 'Worker Inline Conversion', // Convert workers to inline code
  5: 'Static Asset Generation',  // Generate optimized static files
}
```

### Vite Configuration Deep Dive

```javascript
// vite.config.js - Production optimizations
export default defineConfig({
  plugins: [react()],
  
  build: {
    // Target modern browsers for optimal performance
    target: 'es2020',
    
    // Optimization settings
    minify: 'esbuild', // Fast minification
    sourcemap: false,  // Reduce bundle size in production
    
    rollupOptions: {
      output: {
        // Optimize chunk loading
        manualChunks(id) {
          // Vendor chunk for external dependencies
          if (id.includes('node_modules')) {
            if (id.includes('@mui')) return 'ui'
            if (id.includes('react')) return 'vendor'
            return 'vendor'
          }
          
          // Feature-based chunks
          if (id.includes('worker')) return 'workers'
          if (id.includes('service')) return 'services'
        },
        
        // Optimize file naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  // Development optimizations
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: false // Prevent overlay blocking during development
    }
  }
})
```

### GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/ci-cd.yml - Complete automation
name: CI/CD Pipeline

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      # Install dependencies
      - run: npm ci
      
      # Build application
      - run: npm run build
      
      # Install browsers for testing
      - run: npx playwright install --with-deps
      
      # Run comprehensive test suite
      - run: npm test
      
      # Upload test artifacts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    # GitHub Pages deployment
    permissions:
      pages: write
      id-token: write
      contents: read
    
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - run: npm ci
      - run: npm run build
      
      # Deploy to GitHub Pages
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## 🎯 Advanced Patterns Used

### 1. Service Layer Pattern
**Implementation:**
```javascript
// Separation of business logic from UI components
class HashingService {
  // Encapsulates all hashing logic
  // Manages worker lifecycle
  // Provides clean API to components
}

// Usage in components
const hashingService = new HashingService()
const results = await hashingService.hashFiles(files, onProgress)
```

**Benefits:**
- Testable business logic
- Reusable across components
- Clear separation of concerns
- Resource management

### 2. Observer Pattern for Progress Tracking
**Implementation:**
```javascript
// Real-time progress updates without tight coupling
async hashFiles(files, onProgress) {
  for (const [index, file] of files.entries()) {
    const result = await this.processFile(file)
    
    // Notify observers
    onProgress({
      completed: index + 1,
      total: files.length,
      progress: (index + 1) / files.length,
      currentFile: file.name,
      result
    })
  }
}
```

### 3. Factory Pattern for Workers
**Implementation:**
```javascript
// Dynamic worker creation based on algorithm type
class WorkerFactory {
  static createWorker(type) {
    const workerCode = this.getWorkerCode(type)
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    return new Worker(URL.createObjectURL(blob))
  }
  
  static getWorkerCode(type) {
    switch (type) {
      case 'hash': return this.hashWorkerCode
      case 'similarity': return this.similarityWorkerCode
      default: throw new Error(`Unknown worker type: ${type}`)
    }
  }
}
```

### 4. Command Pattern for File Operations
**Implementation:**
```javascript
// Encapsulate file operations as commands
class DeleteCommand {
  constructor(fileHandle, fileName) {
    this.fileHandle = fileHandle
    this.fileName = fileName
  }
  
  async execute() {
    return await this.fileHandle.remove()
  }
  
  async undo() {
    // Restoration logic (if possible)
  }
}

// Usage
const commands = files.map(f => new DeleteCommand(f.handle, f.name))
const results = await Promise.all(commands.map(cmd => cmd.execute()))
```

### 5. Strategy Pattern for Algorithms
**Implementation:**
```javascript
// Interchangeable duplicate detection algorithms
class DuplicateDetector {
  constructor(strategy) {
    this.strategy = strategy
  }
  
  async findDuplicates(files) {
    return await this.strategy.detect(files)
  }
}

// Strategies
class ExactMatchStrategy {
  async detect(files) {
    // SHA-256 based detection
  }
}

class SimilarityMatchStrategy {
  async detect(files) {
    // MinHash based detection
  }
}
```

---

## 🎓 Learning Outcomes

By studying this codebase, developers will understand:

### Modern Web Development
- **React 19 patterns** and concurrent features
- **State management** with Zustand
- **Performance optimization** techniques
- **Bundle optimization** strategies

### Advanced Browser APIs
- **File System Access API** for native file operations
- **Web Workers** for background processing
- **SubtleCrypto API** for cryptographic operations
- **IndexedDB** for client-side storage

### Algorithm Implementation
- **Cryptographic hashing** (SHA-256)
- **Locality-sensitive hashing** (MinHash)
- **Similarity detection** algorithms
- **Performance optimization** for large datasets

### Software Architecture
- **Service-oriented architecture** patterns
- **Separation of concerns** principles
- **Error handling** strategies
- **Resource management** techniques

### DevOps and Testing
- **Automated testing** with Playwright
- **CI/CD pipelines** with GitHub Actions
- **Static site deployment** strategies
- **Performance monitoring** techniques

---

## 🚀 Getting Started with Development

### Prerequisites
```bash
# Required software
node --version  # v18.0.0 or higher
npm --version   # v8.0.0 or higher
git --version   # v2.0.0 or higher
```

### Development Setup
```bash
# Clone and setup
git clone <repository-url>
cd deduplicator
npm install

# Development server
npm run dev     # Start development server
npm run test    # Run test suite
npm run build   # Build for production
```

### Code Exploration Guide
1. **Start with `src/App.jsx`** - Main component structure
2. **Study `src/services/`** - Business logic implementation
3. **Examine `src/workers/`** - Algorithm implementations
4. **Review `tests/`** - Testing patterns and examples
5. **Analyze `vite.config.js`** - Build configuration

---

This technical deep dive provides a comprehensive understanding of the Dedupe-Local architecture, from high-level design decisions to low-level implementation details. The codebase serves as an excellent example of modern web development practices, advanced algorithms, and professional software engineering patterns.

**Happy coding!** 🚀