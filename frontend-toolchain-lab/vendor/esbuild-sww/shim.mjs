import shim from "./lib/main.js";

export const transform = shim.transform;
export const transformSync = shim.transformSync;
export const build = shim.build;
export const buildSync = shim.buildSync;
export const context = shim.context;
export const contextSync = shim.contextSync;
export const analyzeMetafile = shim.analyzeMetafile;
export const analyzeMetafileSync = shim.analyzeMetafileSync;
export const formatMessages = shim.formatMessages;
export const formatMessagesSync = shim.formatMessagesSync;
export const initialize = shim.initialize;
export const version = shim.version;
export default shim;
