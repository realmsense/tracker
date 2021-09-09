import { Client, CreateSuccessPacket, delay, Logger, LogLevel, MapInfoPacket, PacketHook, PacketType, Point, Portal, ReconnectPacket, timestamp, UpdatePacket, UsePortalPacket } from "nrelay";
import { TrackerPlugin, Realm } from "..";
import TrackerConfig from "./config/tracker-config.json";

export class DedicatedBot {

    constructor(
        public trackerPlugin: TrackerPlugin,
        public client: Client
    ) {
        this.trackerPlugin.runtime.pluginManager.hookInstance(client, this);
        this.client.map.emitter.on("portalOpen", this.onPortalOpen.bind(this));
        this.client.map.emitter.on("portalUpdate", this.onPortalUpdate.bind(this));
        this.client.map.emitter.on("portalRemoved", this.onPortalRemoved.bind(this));
    }
    
    private onPortalOpen(portal: Portal): void {
        // Add Realm
        if (portal.name?.startsWith("NexusPortal")) {
            const realm = Realm.parseRealmPortal(portal);
            if (realm) {
                realm.server = this.client.server;
                this.trackerPlugin.addRealm(realm);
                return;
            }
        }
    }

    private onPortalUpdate(portal: Portal): void {
        // Update Realm
        if (portal.name?.startsWith("NexusPortal")) {
            const realm = Realm.parseRealmPortal(portal);
            if (realm) {
                this.trackerPlugin.updateRealm(realm);
                return;
            }
        }
    }

    private onPortalRemoved(portal: Portal): void {
        // Remove Realm
        if (portal.name?.startsWith("NexusPortal")) {
            const realm = Realm.parseRealmPortal(portal);
            if (realm) {
                this.trackerPlugin.removeRealm(realm);
                return;
            }
        }
    }

    @PacketHook()
    private async onCreateSuccess(createSuccessPacket: CreateSuccessPacket): Promise<void> {

        Logger.log(
            "Tracker",
            `Dedicated Bot "${this.client.account.guid}" connected to ${this.client.server.name} ${this.client.map.mapInfo.name}`,
            LogLevel.Success
        );

        const realmsPos = Point.fromArray(TrackerConfig.Locations.Realms);

        await delay(1000);
        this.client.pathfinding.findPath(realmsPos);

        this.client.pathfinding.emitter.once("arrived", async (point: Point) => {
            await delay(5000);
            this.client.pathfinding.moveTo(realmsPos);
        });
    }

    @PacketHook()
    private onUpdate(updatePacket: UpdatePacket): void {

    }
}