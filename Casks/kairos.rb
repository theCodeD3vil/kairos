cask "kairos" do
  version "1.1.11"
  sha256 "d1fdb0c9f48c5e777b6aff95d8bce251f7327d88b4edd644934fadde9c24d58c"

  url "https://github.com/theCodeD3vil/kairos/releases/download/v#{version}/Kairos-macos-v#{version}.dmg",
      verified: "github.com/theCodeD3vil/kairos/"
  name "Kairos"
  desc "Local-first coding activity tracker"
  homepage "https://github.com/theCodeD3vil/kairos"

  app "Kairos.app"

  zap trash: [
    "~/Library/Application Support/Kairos",
    "~/Library/Caches/com.kairos.desktop",
    "~/Library/Preferences/com.kairos.desktop.plist",
    "~/Library/Saved Application State/com.kairos.desktop.savedState",
  ]
end
