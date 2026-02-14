"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const configPath = path_1.default.resolve(__dirname, '../../config.yml');
let config;
try {
    const fileContents = fs_1.default.readFileSync(configPath, 'utf8');
    config = js_yaml_1.default.load(fileContents);
    console.log('Configuration loaded successfully.');
}
catch (e) {
    console.error('Failed to load config.yml:', e);
    process.exit(1);
}
exports.default = config;
//# sourceMappingURL=config.js.map