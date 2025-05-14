# Sesame Research Demo Application

## Overview
This Electron-based desktop application provides a focused view of the Sesame Research webpage section for exploring voice interactions.

## Prerequisites
- Node.js (v16 or later)
- npm (v8 or later)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/sesame-demo-app.git
cd sesame-demo-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Application
```bash
npm run build
```

### 4. Run the Application
```bash
npm start
```

### 5. Package for Distribution
```bash
npm run package-win  # For Windows
npm run package-mac  # For macOS
npm run package-linux  # For Linux
```

## Development

### Project Structure
```
sesame-demo-app/
│
├── src/
│   ├── index.html
│   ├── renderer.js
│   ├── preload.js
│   └── main.js
│
├── package.json
├── webpack.config.js
└── README.md
```

### Key Dependencies
- Electron
- electron-builder
- webpack

## Microphone Permissions
The application automatically handles microphone permissions through Electron's webContents API.

## Troubleshooting
- Ensure all dependencies are installed correctly
- Check console for any error messages
- Verify system microphone settings

## License
[Your License Here]

## Contact
[Your Contact Information]
