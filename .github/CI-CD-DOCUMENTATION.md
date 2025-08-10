# GitHub Actions CI/CD Architecture

This directory contains automated workflows for the Dedupe-Local project, implementing a comprehensive CI/CD pipeline designed for static web application deployment.

## 🏗️ Architecture Overview

The CI/CD system uses a **two-job pipeline** with dependencies to ensure quality gates are enforced before deployment:

```
┌─────────────────┐    ┌─────────────────┐
│   Test Job      │───▶│  Deploy Job     │
│  - Lint/Build   │    │  - Pages Deploy │
│  - E2E Tests    │    │  - Asset Upload │
│  - Artifact Save│    │  - URL Output   │
└─────────────────┘    └─────────────────┘
```

## 🚀 Workflows Detailed Analysis

### 1. **CI/CD Pipeline** (`ci-cd.yml`)

**Purpose**: Complete automated testing, building, and deployment pipeline

**Trigger Conditions:**
```yaml
on:
  push:
    branches: [ main, master ]  # Deploys production
  pull_request:
    branches: [ main, master ]  # Tests only
```

**Why This Structure?**
- **Push events** trigger full pipeline including deployment
- **PR events** run tests only (no deployment)
- **Branch targeting** ensures only main/master changes deploy
- **Dual triggers** provide testing on both PR and merge

#### Job 1: Test Suite
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4      # Get source code
    - uses: actions/setup-node@v4    # Install Node.js
    - run: npm ci                    # Install dependencies (lockfile-exact)
    - run: npm run build             # Verify build works
    - run: npx playwright install    # Install E2E test browsers
    - run: npm test                  # Run comprehensive test suite
```

**Why These Steps?**
- **`npm ci`** (not `npm install`) ensures exact dependency versions
- **Build before test** catches build issues early
- **Playwright install** gets Chromium/Firefox for E2E testing
- **Artifact upload** preserves test reports even on failure

#### Job 2: Build & Deploy (Production Only)
```yaml
build-and-deploy:
  name: 🚀 Build & Deploy
  needs: test                      # Dependency: only run if tests pass
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
  
  permissions:
    pages: write      # Required for Pages deployment
    id-token: write   # Required for OIDC authentication
    contents: read    # Required for code checkout
```

**Design Decisions Explained:**
- **`needs: test`** = Quality gate - deployment only happens if all tests pass
- **Conditional deployment** = Only main/master branches deploy (not PRs)
- **Minimal permissions** = Security principle of least privilege
- **OIDC authentication** = Modern, secure authentication without long-lived secrets

### 2. **PR Check** (`pr-check.yml`) - Currently Placeholder

**Current Status**: Exists but is minimal (only in templates)
**Intended Purpose**: Additional PR-specific quality checks
**Future Enhancements**:
- Code quality metrics
- Bundle size analysis
- Security scanning
- Dependency vulnerability checks

### 3. **Release** (`release.yml`) - Currently Placeholder

**Current Status**: Exists but is minimal (only in templates)
**Intended Purpose**: Release automation
**Future Enhancements**:
- Semantic versioning
- Release notes generation
- Asset creation and upload
- Multi-platform distribution

## 🔧 Technical Implementation Details

### GitHub Pages Deployment Strategy

The deployment uses GitHub's native Pages deployment actions:

```yaml
- name: 📋 Setup Pages
  uses: actions/configure-pages@v5

- name: 📤 Upload Pages Artifact  
  uses: actions/upload-pages-artifact@v3
  with:
    path: ./dist                   # Vite build output

- name: 🚀 Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v4
```

**Why This Approach?**
- **Native GitHub integration** = Better reliability and performance
- **Automatic SSL/CDN** = GitHub provides HTTPS and global CDN
- **Zero configuration** = No manual Pages setup required
- **Artifact-based** = Supports complex build outputs

### Environment Configuration

```yaml
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
```

**Benefits:**
- **Environment tracking** = GitHub UI shows deployment status
- **URL output** = Actions provide live URL for verification
- **Protection rules** = Can add manual approvals if needed
- **Deployment history** = GitHub tracks all deployments

### Test Artifact Management

```yaml
- name: 📊 Upload Test Results
  uses: actions/upload-artifact@v4
  if: always() && hashFiles('playwright-report/**') != ''
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

**Smart Features:**
- **`if: always()`** = Uploads even if tests fail
- **`hashFiles()` check** = Only uploads if report directory exists
- **Retention policy** = Automatic cleanup after 30 days
- **Conditional upload** = Avoids "no files found" warnings

### Performance Optimizations

1. **Dependency Caching:**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'                   # Automatic npm cache
```

2. **Parallel Job Execution:**
- Test job runs independently until completion
- Deploy job waits for test completion
- Both jobs can prepare environments in parallel

3. **Artifact Streaming:**
- Test artifacts upload while deploy job initializes
- Pages artifact upload happens immediately after build
- Deployment starts as soon as artifact is ready

## ⚙️ Configuration Philosophy

### Security-First Design

**Principle of Least Privilege:**
```yaml
permissions:
  pages: write      # Only what's needed for deployment
  id-token: write   # Only for OIDC authentication
  contents: read    # Read-only code access
```

**No Long-Lived Secrets:**
- Uses OIDC (OpenID Connect) for authentication
- No manual secret configuration required
- Temporary tokens with limited scope

### Reliability Engineering

**Quality Gates:**
- Tests must pass before deployment
- Build verification before testing
- Artifact validation before upload

**Graceful Failure Handling:**
- Conditional artifact uploads
- Detailed error reporting
- Failed deployments don't affect repository

**Monitoring and Observability:**
- Environment status tracking
- Deployment URL output
- Detailed step logging
- Artifact retention for debugging

## 🎯 When Workflows Trigger

### Complete Trigger Matrix

| Event | Branch | Test Job | Deploy Job | Result |
|-------|--------|----------|------------|--------|
| Push | `main` | ✅ Runs | ✅ Runs | Full CI/CD |
| Push | `feature/*` | ❌ No trigger | ❌ No trigger | No action |
| PR to `main` | Any | ✅ Runs | ❌ Skipped | Test only |
| PR merge | `main` | ✅ Runs | ✅ Runs | Full CI/CD |

### Edge Cases Handled

1. **Failed Tests**: Deploy job never runs, no broken deployment
2. **Build Failures**: Caught in test job, clear error reporting
3. **Permission Issues**: Clear error messages, no silent failures
4. **Concurrent Deployments**: GitHub handles queueing automatically
5. **Missing Artifacts**: Conditional uploads prevent errors

## ⚙️ Setup Instructions

### 1. **Enable GitHub Pages**
1. Go to your repository **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"
3. The site will be available at: `https://<username>.github.io/<repository-name>`

### 2. **Configure Repository Settings**
Required permissions for workflows:
- **Actions**: Read and write permissions
- **Contents**: Write permission
- **Pages**: Write permission
- **Metadata**: Read permission

### 3. **Environment Setup**
The workflows will automatically:
- Install Node.js 18
- Cache npm dependencies
- Install Playwright browsers
- Run tests and build

### 4. **Branch Protection (Optional)**
Recommended branch protection rules for `main`/`master`:
- ✅ Require status checks to pass
- ✅ Require up-to-date branches
- ✅ Include administrators

## 🔧 Customization

### Environment Variables
Add these to **Settings** → **Secrets and variables** → **Actions**:
- `NODE_VERSION`: Node.js version (default: 18)
- Custom deployment secrets if needed

### Workflow Modifications
- **Test timeout**: Modify Playwright timeout in workflow
- **Build commands**: Adjust build scripts in `package.json`
- **Deployment target**: Change from GitHub Pages to other platforms

### Adding New Workflows
1. Create `.yml` file in `.github/workflows/`
2. Define triggers, jobs, and steps
3. Test with repository events

## 📊 Status Badges

Add these to your main README:

```markdown
![CI/CD](https://github.com/<username>/<repo>/workflows/CI/CD%20Pipeline/badge.svg)
![Tests](https://github.com/<username>/<repo>/workflows/PR%20Check/badge.svg)
```

## 🐛 Troubleshooting

### Common Issues:
1. **Tests failing**: Check Playwright browser installation
2. **Build errors**: Verify `package.json` scripts and ES module configuration
3. **Deployment issues**: Check Pages configuration and permissions
4. **Permission errors**: Review Actions permissions in Settings
5. **ES Module errors**: Ensure `"type": "module"` is set in `package.json`

### Recent Fixes Applied:
- **ES Module Support**: Added `"type": "module"` to `package.json` for proper Vite compatibility
- **Test Suite Optimization**: Fixed multi-criteria detection test selectors for 100% pass rate
- **CI/CD Reliability**: Updated static deployment tests for consistent CI environment behavior
- **Dependency Updates**: Automated security updates via Dependabot (e.g., actions/configure-pages@v5)

### Debugging:
- Check **Actions** tab for detailed logs
- Review failed step outputs
- Test locally with same Node.js version
- Verify ES module configuration if build fails

## 🔄 Maintenance

- **Dependencies**: Dependabot updates weekly
- **Actions**: Renovate or similar for workflow updates
- **Security**: Regular security audit of dependencies

---
*These workflows ensure code quality, automated testing, and seamless deployment for the Dedupe-Local project.*