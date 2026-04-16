# iOS Socket Tester App

This is a Capacitor-based iOS app designed to test WebSocket and Socket.io connections on iOS devices and Sauce Labs.

## Features
- **Dual Mode**: Test both Socket.io (v2.3.0) and Raw WebSockets.
- **On-Screen Logs**: Full diagnostic logging directly in the app UI, perfect for mobile testing where console access is limited.
- **Customizable**: Change Target URL, Path, and Query Params (JSON) on the fly.
- **iOS Optimized**: Styled with a premium dark-mode iOS aesthetic.

## Folder Structure
- `dist/`: Web assets (HTML, JS, CSS).
- `ios/`: Native Xcode project.
- `.github/workflows/`: Automation for building the app without a local Mac.

## How to Build for Sauce Labs

Since building iOS apps requires macOS, you have two options:

### Option 1: Using GitHub Actions (Recommended)
1. Push this folder to a GitHub repository.
2. The included workflow in `.github/workflows/build-ios.yml` will automatically build the app.
3. Download the `ios-simulator-build` artifact from the Actions tab.
4. Upload the resulting `.app` (usually zipped) to Sauce Labs.

### Option 2: Local Mac
1. Open terminal in the `ios-app` directory.
2. Run `npm install`.
3. Run `npx cap sync ios`.
4. Run `npx cap open ios` to launch Xcode.
5. In Xcode, select a Simulator and press **Command + R** to run.
6. To get the build for Sauce Labs, go to **Product > Archive** or find the `.app` in the DerivedData folder.

## Sauce Labs Testing Tips
- For **Real Devices**: You will need to sign the app in Xcode with your Apple Developer Team ID before archiving to an `.ipa`.
- For **Simulators**: You can upload the `.app` folder (zip it first).
- Use the **Live Testing** feature in Sauce Labs to interact with the UI and see the logs in real-time.

## Connection Debugging
If you see connection errors on iOS:
1. Ensure the server uses `wss://` (HTTPS).
2. Check if the server requires a specific `Sec-WebSocket-Protocol`.
3. If using Socket.io, ensure the `path` matches exactly (e.g., `/ws/chat/` vs `/socket.io/`).
