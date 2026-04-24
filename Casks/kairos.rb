cask "kairos" do
  version "1.1.10"
  sha256 "bc27aba5a752471b9daa3bc285ddf0c3f81a346ed1519dbcf2809f2ca0554173"

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
