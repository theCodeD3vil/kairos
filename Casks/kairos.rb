cask "kairos" do
  version "1.0.5"
  sha256 "8e71fbdb2648da63dc5b44a1bbaf7aa20c4c0eb3fa53b3d324fbb36f85f3912c"

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
