# GitHub Actions CI/CD Setup

This directory contains automated workflows for the Dedupe-Local project.

## 🚀 Workflows Overview

### CI/CD Pipeline (`ci-cd.yml`)
**Purpose**: Automated testing, building, and deployment

**Triggers:**
- **Push to main/master**: Runs tests + deploys to GitHub Pages
- **Pull Requests**: Runs tests only (no deployment)

**Jobs:**
1. **Test**: Install dependencies, build, run Playwright tests
2. **Deploy**: Build and deploy to GitHub Pages (only on main/master)

## ⚙️ Setup Instructions

### 1. Enable GitHub Pages
1. Go to repository **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"
3. Site will be available at: `https://<username>.github.io/<repository-name>`

### 2. Configure Repository Permissions
Go to **Settings** → **Actions** → **General**:
- **Actions permissions**: Allow all actions
- **Workflow permissions**: Read and write permissions

### 3. Required Repository Settings
The workflows need these permissions:
- **Actions**: Read and write
- **Contents**: Write
- **Pages**: Write
- **Metadata**: Read

## 🔧 Technical Implementation

### Test Job
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run build
    - run: npx playwright install --with-deps
    - run: npm test
```

### Deploy Job (Production Only)
```yaml
build-and-deploy:
  needs: test
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  
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
    - run: npm ci
    - run: npm run build
    - uses: actions/configure-pages@v5
    - uses: actions/upload-pages-artifact@v3
      with:
        path: ./dist
    - uses: actions/deploy-pages@v4
      id: deployment
```

## 🎯 When Workflows Run

| Event | Branch | Test Job | Deploy Job | Result |
|-------|--------|----------|------------|--------|
| Push | `main` | ✅ Runs | ✅ Runs | Full CI/CD |
| Push | `feature/*` | ❌ No trigger | ❌ No trigger | No action |
| PR to `main` | Any | ✅ Runs | ❌ Skipped | Test only |
| PR merge | `main` | ✅ Runs | ✅ Runs | Full CI/CD |

## 🔧 Customization

### Environment Variables
Add to **Settings** → **Secrets and variables** → **Actions**:
- `NODE_VERSION`: Node.js version (default: 18)

### Workflow Modifications
- **Test timeout**: Modify Playwright config
- **Build commands**: Update `package.json` scripts
- **Deployment target**: Change actions in deploy job

### Branch Protection (Optional)
Recommended for `main` branch:
- ✅ Require status checks to pass
- ✅ Require up-to-date branches
- ✅ Include administrators

## 📊 Status Badges
Add to your README:

```markdown
![CI/CD](https://github.com/<username>/<repo>/workflows/CI/CD%20Pipeline/badge.svg)
```

## 🐛 Troubleshooting

### Common Issues
1. **Tests failing**: Check Playwright browser installation
2. **Build errors**: Verify `package.json` scripts
3. **Deploy fails**: Check Pages configuration and permissions
4. **Permission errors**: Review Actions permissions in Settings

### Debug Steps
1. Check **Actions** tab for detailed logs
2. Review failed step outputs
3. Test locally with same Node.js version
4. Verify `"type": "module"` in `package.json`

### Recent Fixes Applied
- **ES Module Support**: Added proper module configuration
- **Test Optimization**: Fixed selectors for 100% pass rate
- **Dependency Updates**: Automated via Dependabot

## 🔄 Maintenance

The workflows automatically:
- Cache npm dependencies for faster builds
- Install required browsers for testing
- Deploy only when tests pass
- Provide deployment URLs for verification

**Dependencies**: Updated weekly via Dependabot
**Security**: Regular automated security audits

---

These workflows ensure code quality and seamless deployment for the Dedupe-Local project.