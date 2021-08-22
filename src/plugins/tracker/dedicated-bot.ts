import { Client, Logger, LogLevel, MapInfoPacket, PacketHook, PacketType } from "nrelay";
import { TrackerPlugin } from "..";

export class DedicatedBot {

    constructor(
        public trackerPlugin: TrackerPlugin,
        public client: Client
    ) {
        this.trackerPlugin.runtime.pluginManager.hookInstance(client, this);
    }
    
    @PacketHook()
    public onMapInfo(mapInfoPacket: MapInfoPacket): void {

        Logger.log(
            "Tracker",
            `Dedicated Bot "${this.client.account.guid}" connected to ${this.client.server.name} ${mapInfoPacket.name}`,
            LogLevel.Success
        );
    }
}