// Package freshplugin embeds the Fresh editor plugin source so Kairos Desktop
// can install it on demand without requiring the user to download it separately.
package freshplugin

import _ "embed"

//go:embed src/kairos.ts
var PluginSource []byte

// PluginVersion must match the EXTENSION_VERSION constant in kairos.ts.
const PluginVersion = "0.1.0"
