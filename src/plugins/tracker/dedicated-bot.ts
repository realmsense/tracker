import { Client, Logger, LogLevel, MapInfoPacket, PacketType } from "nrelay";
import { TrackerPlugin } from "..";

export class DedicatedBot {


    constructor(
        public trackerPlugin: TrackerPlugin,
        public client: Client
    ) {

        // Hook packets
        const packetHooks = {
            [PacketType.MAP_INFO]:  this.onMapInfo,
            // [PacketType.UPDATE]:    this.onUpdate,
            // [PacketType.NEW_TICK]:  this.onTick,
            // [PacketType.TEXT]:      this.onText,
        };

        for (const [packetType, hookFunction] of Object.entries(packetHooks)) {
            this.client.packetIO.on(packetType, hookFunction.bind(this));
        }
    }
    
    private onMapInfo(mapInfoPacket: MapInfoPacket) {

        Logger.log(
            "Tracker",
            `Dedicated Bot "${this.client.account.guid}" connected to ${this.client.server.name} ${mapInfoPacket.name}`,
            LogLevel.Info
        );
    }
}