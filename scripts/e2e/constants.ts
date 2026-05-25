import path from "node:path";

import { loadConfig } from "shared/config";

const config = loadConfig();

export const TMP_DIR = path.join(process.cwd(), ".tmp");
export const edgeUrl = `http://${config.edge.devHost}:${config.edge.devPort}`;
