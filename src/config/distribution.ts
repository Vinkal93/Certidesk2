export interface PlatformDistributionInfo {
  id: "android" | "ios" | "windows" | "macos" | "linux" | "web";
  name: string;
  subtitle: string;
  installMethod: string;
  compatibility: string;
  version: string;
  steps: string[];
}

export const distributionConfig = {
  appName: "CertiDesk Pro",
  version: "2.4.0",
  releaseDate: "2026-11-27",
  playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() || null,
  supportedPlatformsSummary:
    "Android, iOS/iPadOS, Windows 10/11, macOS, Linux, Modern Web",
  requirements: "Modern browser with HTTPS (Chrome, Edge, Safari 16.4+, or Chromium)",
  platforms: [
    {
      id: "android",
      name: "Android App",
      subtitle: "Installable PWA for phones & tablets",
      installMethod: "Chrome Install Prompt / Add to Home Screen",
      compatibility: "Android 8.0+ with Chrome or Edge",
      version: "2.4.0 (PWA)",
      steps: [
        "Open CertiDesk Pro in Google Chrome or Microsoft Edge.",
        "Tap 'Install App' below or open the browser menu (⋮) → 'Install app' / 'Add to Home screen'.",
        "Launch directly from your home screen with full-screen standalone mode and camera QR login.",
      ],
    },
    {
      id: "ios",
      name: "iPhone & iPad",
      subtitle: "Standalone Web App via Safari",
      installMethod: "Safari Share Menu → Add to Home Screen",
      compatibility: "iOS / iPadOS 16.4+ (Safari)",
      version: "2.4.0 (PWA)",
      steps: [
        "Open this page in Apple Safari on your iPhone or iPad.",
        "Tap the Share icon at the bottom or top toolbar.",
        "Scroll down and tap 'Add to Home Screen', then tap 'Add'.",
      ],
    },
    {
      id: "windows",
      name: "Windows PC",
      subtitle: "Desktop App via Edge or Chrome",
      installMethod: "Browser Address Bar Install (PWA)",
      compatibility: "Windows 10 / Windows 11 (Edge or Chrome)",
      version: "2.4.0 (Desktop PWA)",
      steps: [
        "Open CertiDesk Pro in Microsoft Edge or Google Chrome.",
        "Click the 'Install App' button below or the Install icon in the address bar.",
        "Pin CertiDesk Pro to your Start Menu or Taskbar for 1-click access.",
      ],
    },
    {
      id: "macos",
      name: "macOS",
      subtitle: "Desktop App via Chrome or Edge",
      installMethod: "Browser Address Bar Install (PWA)",
      compatibility: "macOS 12+ with Google Chrome or Microsoft Edge",
      version: "2.4.0 (Desktop PWA)",
      steps: [
        "Open CertiDesk Pro in Google Chrome or Microsoft Edge.",
        "Click 'Install App' below or choose Menu → 'Install CertiDesk Pro'.",
        "Access CertiDesk Pro from Spotlight, Launchpad, or your Dock.",
      ],
    },
    {
      id: "linux",
      name: "Linux",
      subtitle: "Desktop App via Chromium / Chrome",
      installMethod: "Chromium App Installation (PWA)",
      compatibility: "Ubuntu, Fedora, Debian & Arch with Chrome / Chromium",
      version: "2.4.0 (Desktop PWA)",
      steps: [
        "Open CertiDesk Pro in Chrome, Edge, or Chromium.",
        "Click 'Install App' below or select the address bar install icon.",
        "Launch from your system application launcher as a standalone window.",
      ],
    },
    {
      id: "web",
      name: "Web App",
      subtitle: "Zero-install browser workspace",
      installMethod: "Direct Cloud Access",
      compatibility: "Any modern desktop or mobile browser",
      version: "2.4.0 (Live Cloud)",
      steps: [
        "No download or installation required.",
        "Sign in directly via Institute, Student, or QR Login.",
        "Always up to date automatically on every visit.",
      ],
    },
  ] satisfies PlatformDistributionInfo[],
  faqs: [
    {
      question: "Is CertiDesk Pro free to install?",
      answer:
        "Yes. Installing the CertiDesk Pro Progressive Web App on Android, iPhone, Windows, macOS, or Linux is completely free with no app-store fee.",
    },
    {
      question: "Can I install it on Windows?",
      answer:
        "Yes. Open CertiDesk Pro in Microsoft Edge or Google Chrome on Windows 10 or 11 and click 'Install App' to add it to your Desktop, Start Menu, and Taskbar.",
    },
    {
      question: "Does it work on Android?",
      answer:
        "Yes. On Android phones and tablets, Chrome and Edge support one-tap PWA installation, standalone full-screen mode, and camera-based QR sign-in for desktop.",
    },
    {
      question: "Can I use it without installing?",
      answer:
        "Yes. Every feature — Institute Admin, Student Portal, Fee Management, Online Exams, and Certificate Verification — works directly in your browser without installing.",
    },
    {
      question: "Does the application support offline access?",
      answer:
        "Static public pages and the offline status screen are cached for instant loading. Live student records, wallet transactions, and exams require an active internet connection for real-time accuracy.",
    },
    {
      question: "How do I update the application?",
      answer:
        "Updates are delivered automatically in the background. When a new version is ready, an 'Update' notification appears so you can refresh with one click.",
    },
  ],
};
