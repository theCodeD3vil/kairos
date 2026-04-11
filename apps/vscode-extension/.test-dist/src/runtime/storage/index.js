"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SETTINGS_SNAPSHOT_DEFAULT_KEY = exports.OUTBOX_SCHEMA_VERSION = exports.OUTBOX_DATABASE_FILE_NAME = exports.openOutboxStorage = exports.getOutboxStorageMigrationStatus = exports.resolveOutboxDatabasePath = void 0;
var path_1 = require("./path");
Object.defineProperty(exports, "resolveOutboxDatabasePath", { enumerable: true, get: function () { return path_1.resolveOutboxDatabasePath; } });
var repository_1 = require("./repository");
Object.defineProperty(exports, "getOutboxStorageMigrationStatus", { enumerable: true, get: function () { return repository_1.getOutboxStorageMigrationStatus; } });
Object.defineProperty(exports, "openOutboxStorage", { enumerable: true, get: function () { return repository_1.openOutboxStorage; } });
var types_1 = require("./types");
Object.defineProperty(exports, "OUTBOX_DATABASE_FILE_NAME", { enumerable: true, get: function () { return types_1.OUTBOX_DATABASE_FILE_NAME; } });
Object.defineProperty(exports, "OUTBOX_SCHEMA_VERSION", { enumerable: true, get: function () { return types_1.OUTBOX_SCHEMA_VERSION; } });
Object.defineProperty(exports, "SETTINGS_SNAPSHOT_DEFAULT_KEY", { enumerable: true, get: function () { return types_1.SETTINGS_SNAPSHOT_DEFAULT_KEY; } });
//# sourceMappingURL=index.js.map