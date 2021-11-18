import { RunOptions, Runtime } from "nrelay";
import { _GetEnvObject } from "../types/src/constants/environment.model";

const ENV = _GetEnvObject();

const options: RunOptions = {
    pluginPath: "dist/src/plugins",
    update: {
        enabled: true,
        // force: true,
        urls: {
            build_hash   : ENV.URL.Updater + "/build_hash.txt",
            exalt_version: ENV.URL.Updater + "/exalt_version.txt",
            objects_xml  : ENV.URL.Updater + "/xml/objects.xml",
            tiles_xml    : ENV.URL.Updater + "/xml/tiles.xml",
        }
    },
    debug: true
};

Runtime.start(options);