import { Runtime, RunOptions } from "nrelay";

const options: RunOptions = {
    pluginPath: "dist/plugins"
};

Runtime.start(options);