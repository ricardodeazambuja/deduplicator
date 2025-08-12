# Dedupe-Local - Client-Side File Deduplicator

> Find and manage duplicate files with complete privacy - all processing happens in your browser.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Test Coverage](https://img.shields.io/badge/coverage-97.7%25-green)
![Bundle Size](https://img.shields.io/badge/bundle-185KB%20gzipped-blue)
![Browser Support](https://img.shields.io/badge/browser-Chrome%2086%2B-blue)

## 🎯 Overview

Dedupe-Local is a privacy-first file deduplication tool that runs entirely in your browser. No uploads, no servers, no data collection - just powerful duplicate detection.

## ✨ Features

### 🔍 **Detection Modes**
- **Exact Match**: SHA-256 hashing for identical files
- **Filename Match**: Smart filename analysis ignoring copies, versions, and variations  
- **Content Similarity**: MinHash + Shingling for similar binary files
- **Multi-Criteria**: Combination of all detection methods with configurable priorities

### 🛡️ **Privacy & Security**
- **Client-Side Design**: Aims for local processing with privacy focus
- **Secure File Access**: Modern File System Access API with proper permissions
- **Memory Safe**: Built-in performance monitoring and optimization

### 💾 **Smart Management**
- **Session Persistence**: Save/load scan results using IndexedDB
- **Safe Deletion**: Multi-confirmation workflow with detailed warnings
- **Flexible Move Operations**: Move duplicates to existing directories OR create custom archive subdirectories
- **Directory Usage Modes**: Choose between "use directory directly" or "create new subdirectory"
- **Move Manifest**: JSON log of all file operations for tracking and audit
- **Export Reports**: Generate comprehensive JSON reports with metadata
- **Unified File Selection**: Consistent radio button + checkbox interface across all scan modes
- **File State Tracking**: Visual indicators for deleted/moved files with operation history

### ⚡ **Performance Optimized**
- **Web Workers**: Non-blocking background processing
- **Memory Monitoring**: Automatic optimization for large datasets
- **Progress Tracking**: Real-time feedback with detailed statistics

## 🚀 Quick Start

### For Users
1. **Visit the App**: Open in Chrome 86+ or Edge 86+
2. **Select Folder**: Click "Choose Folder" and grant permissions
3. **Choose Mode**: Select detection mode (Exact, Filename, Similarity, or Multi-Criteria)
4. **Configure Settings**: Adjust thresholds and criteria as needed
5. **Start Scan**: Review results and choose how to handle duplicates
6. **Manage Files**: Delete unwanted files OR move them to archive (with flexible directory options)
7. **Save Results**: Optional - save sessions for later review

### For Developers

```bash
# Clone and install
git clone <repository-url>
cd deduplicator
npm install

# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm test            # Run Playwright tests
```

## 🌐 Deployment

### Static Hosting
Deploy the built `dist/` folder to any static hosting service:

- **Netlify**: Drag `dist/` folder to dashboard
- **Vercel**: Connect GitHub repo (build: `npm run build`, output: `dist`)  
- **GitHub Pages**: Upload `dist/` contents to gh-pages branch
- **Any HTTP Server**: Serve the `dist/` directory

**Requirements**: HTTPS needed for File System Access API

## 💻 Browser Requirements

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 86+ | Full support |
| Edge | 86+ | Full support |
| Firefox | ❌ | File System Access API not supported |
| Safari | ❌ | File System Access API not supported |

**Required APIs:**
- File System Access API (for folder selection)
- Web Workers (for background processing)
- SubtleCrypto (for SHA-256 hashing)
- IndexedDB (for session storage)

## 🔧 How It Works

### Exact Match Algorithm
1. **File Selection**: Secure folder access via File System Access API
2. **Parallel Processing**: Files processed in Web Worker pool
3. **SHA-256 Hashing**: Cryptographic hashing in SubtleCrypto
4. **Grouping**: Files with identical hashes grouped together
5. **Safe Actions**: Multi-confirmation deletion workflow

### Filename Match Algorithm
1. **Pattern Recognition**: Detects common filename variations (copy, duplicate, versions)
2. **Base Name Extraction**: Removes extensions and variation markers
3. **Similarity Calculation**: Uses Levenshtein distance for fuzzy matching
4. **Threshold Filtering**: Configurable similarity threshold (50%-98%)
5. **Smart Grouping**: Groups files by normalized base names

### Content Similarity Algorithm
1. **Binary Shingling**: Files split into overlapping byte sequences (configurable size)
2. **MinHash Generation**: Multiple hash signatures using different hash functions
3. **Jaccard Similarity**: Comparison using Hamming distance on signatures
4. **Threshold Matching**: User-configurable similarity threshold (50%-98%)
5. **Universal Support**: Works on ANY binary file type (images, documents, videos, etc.)

### Multi-Criteria Algorithm  
1. **Method Selection**: Choose combination of exact, filename, and similarity detection
2. **Priority Ordering**: Configure detection method priority for conflict resolution
3. **Weighted Scoring**: Adjustable weights for each detection method
4. **Intelligent Merging**: Combines results using priority-based conflict resolution
5. **Confidence Scoring**: Provides confidence ratings for each duplicate group

### Performance Optimization
- **Memory Monitoring**: Real-time memory usage tracking
- **Batch Processing**: Intelligent file batching for large datasets  
- **Worker Pool**: Optimized worker count based on device capabilities
- **Progress Feedback**: Detailed progress reporting with ETA

## 🏗️ Architecture

### Project Structure
```
src/
├── components/              # React UI Components
│   ├── FolderSelector.jsx   # File System Access API integration
│   ├── ScanModeSelector.jsx # Mode selection (Exact, Filename, Similarity, Multi-Criteria)
│   ├── ProgressTracker.jsx  # Real-time scan progress
│   ├── DuplicateResults.jsx # Exact match results display
│   ├── SimilarityResults.jsx# Content similarity results display
│   ├── FilenameResults.jsx  # Filename match results display
│   ├── MultiCriteriaResults.jsx # Multi-criteria results display  
│   ├── MultiCriteriaSettings.jsx # Advanced multi-criteria configuration
│   ├── SessionManager.jsx   # Save/load functionality
│   ├── DeleteConfirmationDialog.jsx # Safe deletion workflow
│   ├── PerformanceWarning.jsx # Memory optimization alerts
│   ├── FileSelectionChip.jsx # Visual file state indicators
│   └── OriginalFileSelector.jsx # Reusable original file selection
├── workers/                 # Web Workers (background processing)
│   ├── hashWorker.js       # SHA-256 hashing with SubtleCrypto
│   └── similarityWorker.js # MinHash + Shingling algorithm
├── services/               # Core Business Logic
│   ├── fileSystemService.js # File System Access API wrapper
│   ├── hashingService.js   # Exact match coordination
│   ├── similarityService.js# Content similarity detection coordination
│   ├── filenameService.js  # Filename-based duplicate detection
│   ├── multiCriteriaService.js # Multi-criteria analysis coordination
│   └── storageService.js   # IndexedDB session management
├── stores/                 # State Management
│   └── appStore.js         # Zustand global state
├── hooks/                  # Custom React Hooks
│   ├── useFileScanning.js  # Scan orchestration logic
│   ├── useFileDeletion.js  # Safe deletion workflow
│   └── useFileGroupSelection.js # Unified file selection state management
└── utils/                  # Utilities
    └── performanceOptimizer.js # Memory & performance monitoring
```

### Technical Stack
- **Frontend**: React 19 + Material-UI (MUI)
- **Build Tool**: Vite with optimized chunking
- **State Management**: Zustand (lightweight alternative to Redux)
- **Testing**: Playwright (E2E testing framework)
- **Storage**: IndexedDB via `idb` wrapper
- **Algorithms**: SHA-256 (exact), Levenshtein distance (filename), MinHash + Shingling (similarity)

### Bundle Size
**Total**: ~640KB (~185KB gzipped)

## 🧪 Testing

### Test Coverage: 97.7% (43/44 tests passing)

```bash
npm test                    # Run all tests
npm test -- --headed       # Run with browser UI
npm test -- --ui          # Interactive test UI
npm test specific.spec.js  # Run specific test file
```

### Test Categories
- Basic Functionality, Browser Compatibility, File Operations
- Deletion Workflow, Session Management, Similarity Detection  
- Static Deployment verification

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/deduplicator
cd deduplicator

# 3. Install dependencies
npm install

# 4. Create a feature branch
git checkout -b feature/your-feature-name

# 5. Start development server
npm run dev
```

### Development Guidelines
- **Code Style**: ESLint + Prettier (auto-formatted)
- **Commits**: Conventional Commits format (`feat:`, `fix:`, `docs:`, etc.)
- **Testing**: Add tests for new features, aim for high coverage
- **Documentation**: Update README and JSDoc comments
- **Performance**: Consider memory usage and large dataset scenarios

### Before Submitting PRs
```bash
# Run the full test suite
npm test

# Build and verify
npm run build
npm run preview

# Check bundle size impact
npm run build -- --analyze
```

### Contribution Areas
- **Enhanced reporting** - HTML/Markdown exports
- **UI/UX improvements** - Dark mode, animations, mobile responsiveness  
- **Performance optimizations** - Large dataset handling
- **Browser compatibility** - Polyfills for wider support
- **Advanced filters** - Size, date, extension-based filtering

### Getting Help
- 💬 **GitHub Discussions**: Ask questions, share ideas
- 🐛 **Issues**: Report bugs with reproduction steps

## 🛡️ Privacy & Security

### Your Files Never Leave Your Device

**Our design aims for complete privacy.** Here's how it works:

#### ✅ **Client-Side Processing Only**
- All file analysis is designed to happen in your browser's memory
- The architecture avoids uploads, downloads, or data transmission
- Files are processed using Web Workers in your browser

#### ✅ **No Server Backend**
- This app is hosted as **static files** on GitHub Pages
- No server exists that could access your data
- Static hosting means no database, no logging, no data collection

#### ✅ **Minimal Network Requests During Processing**
- **Verify yourself**: Open Developer Tools (`F12` on Windows/Linux, `Cmd+Option+I` on Mac) → `Network` tab while using the app
- You should see no network requests during file processing (beyond initial page load)
- Only the initial page load requires network access

#### ✅ **Open Source Transparency**
- **Complete source code**: Available on GitHub for inspection
- **No hidden code**: What you see is exactly what runs
- **Community audited**: Anyone can verify the privacy claims

#### ✅ **Modern Browser Security**
- **File System Access API**: Secure, permission-based folder access
- **SubtleCrypto API**: Hardware-accelerated, secure hashing
- **Web Worker isolation**: Secure processing environment
- **HTTPS required**: Encrypted connection for initial load

### How to Verify Privacy Yourself

**For Non-Technical Users:**
1. **Static Hosting**: This app runs on GitHub Pages (static files only)
2. **Open Source**: All code is visible at [github.com/ricardodeazambuja/deduplicator](https://github.com/ricardodeazambuja/deduplicator)
3. **No Login Required**: No accounts, no registration, no tracking
4. **Works Offline**: Once loaded, you can disconnect from internet and it still works

**For Technical Users:**
1. **Network Monitoring**: Open DevTools (`F12` on Windows/Linux, `Cmd+Option+I` on Mac) → Network tab during file processing
2. **Source Code Review**: Inspect the complete codebase on GitHub
3. **Static Hosting**: Verify GitHub Pages deployment (no server backend)
4. **Worker Isolation**: Inspect Web Workers in DevTools → Sources tab

### Technical Implementation

```
Your Files → Browser Memory → Web Workers → Results Display
     ↓              ↓             ↓            ↓
  (Local)      (Local)       (Local)      (Local)
```

**No step involves external servers or network transmission.**

### Security Measures
- **Permission-based access**: File System Access API requires explicit user consent
- **Memory isolation**: Web Workers provide secure processing environment
- **Static hosting**: No server backend that could access or log your data
- **Input validation**: Robust error handling for all file operations

### Reporting Security Issues
Found a security concern? Please report via GitHub's private vulnerability disclosure.

## 📊 Performance Metrics

### Benchmarks (Typical Hardware)
| Dataset Size | Files | Time (Exact) | Time (Similarity) | Memory Usage |
|-------------|-------|--------------|------------------|--------------|
| Small | 1,000 | 5-10 sec | 30-60 sec | 50-100 MB |
| Medium | 5,000 | 30-60 sec | 5-15 min | 200-400 MB |
| Large | 10,000 | 2-5 min | 15-45 min | 400-800 MB |

### Optimization Features
- Automatic batching, memory monitoring, worker pool scaling
- Real-time progress with ETA calculations
- Automatic resource cleanup

## 🔮 Roadmap

### Upcoming Features
- [ ] Enhanced HTML/Markdown reports
- [ ] Dark mode and UI improvements
- [ ] Cross-platform desktop app
- [ ] Advanced similarity algorithms
- [ ] Mobile app versions

## 📄 License

**MIT License** - See [LICENSE](LICENSE) for details.

This project is open source and free for personal and commercial use.

## 📞 Support

- 💬 **GitHub Discussions**: Community support
- 🐛 **Bug Reports**: Use GitHub Issues
- 💡 **Feature Requests**: GitHub Issues with enhancement label

---

**Built with ❤️ and privacy in mind**

*Making duplicate file management simple, secure, and private for everyone.*