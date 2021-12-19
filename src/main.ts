import { RunOptions, Runtime } from "nrelay";
import { ENV } from "@realmsense/shared";

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