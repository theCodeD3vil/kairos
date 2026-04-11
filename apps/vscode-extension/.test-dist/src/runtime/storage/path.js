"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOutboxDatabasePath = resolveOutboxDatabasePath;
const node_path_1 = __importDefault(require("node:path"));
const types_1 = require("./types");
function resolveOutboxDatabasePath(options) {
    const fileName = options.fileName ?? types_1.OUTBOX_DATABASE_FILE_NAME;
    return node_path_1.default.join(options.context.globalStorageUri.fsPath, fileName);
}
//# sourceMappingURL=path.js.map