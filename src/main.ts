import { RunOptions, Runtime } from "nrelay";

const UPDATE_URL = "https://rotmg.extacy.cc/production/client/current/";

const options: RunOptions = {
    pluginPath: "dist/src/plugins",
    update: {
        enabled: true,
        // force: true,
        urls: {
            build_hash: UPDATE_URL + "build_hash.txt",
            exalt_version: UPDATE_URL + "exalt_version.txt",
            objects_xml: UPDATE_URL + "xml/objects.xml",
            tiles_xml: UPDATE_URL + "xml/tiles.xml",
        }
    },
    debug: true
};

Runtime.start(options);