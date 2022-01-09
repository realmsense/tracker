import { Client, CreateSuccessPacket, delay, Logger, LogLevel, PacketHook, Point, Portal, TextPacket } from "nrelay";
import { TrackerPlugin, Realm, KeyPop } from "..";
import TrackerConfig from "./config/tracker-config.json";

export class DedicatedBot {

    constructor(
        public trackerPlugin: TrackerPlugin,
        public client: Client
    ) {
        this.trackerPlugin.runtime.pluginManager.hookInstance(client, this);
        
        // Portals
        this.client.map.emitter.on("portalOpen",    (portal) => this.handlePortal(portal, this.trackerPlugin.addRealm.bind(this.trackerPlugin)));
        this.client.map.emitter.on("portalUpdate",  (portal) => this.handlePortal(portal, this.trackerPlugin.updateRealm.bind(this.trackerPlugin)));
        this.client.map.emitter.on("portalRemoved", (portal) => this.handlePortal(portal, this.trackerPlugin.removeRealm.bind(this.trackerPlugin)));

        // Players
        this.client.entityTracker.emitter.on("playerEnter",     this.trackerPlugin.addPlayer.bind(this.trackerPlugin));
        this.client.entityTracker.emitter.on("playerUpdate",    this.trackerPlugin.updatePlayer.bind(this.trackerPlugin));
        this.client.entityTracker.emitter.on("playerLeave",     this.trackerPlugin.removePlayer.bind(this.trackerPlugin));
    }
    
    private handlePortal(portal: Portal, realmCallback: (realm: Realm) => void): void {
        // Realms
        if (portal.name?.startsWith("NexusPortal")) {
            const realm = Realm.parseRealmPortal(portal);
            if (realm) {
                realm.server = this.client.server;
                realmCallback(realm);
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

        this.client.pathfinding.emitter.once("noPath", () => {
            Logger.log("Tracker", `Dedicated Bot "${this.client.account.guid} has no path to realms!`);
            return;
        });
        
        this.client.pathfinding.emitter.once("arrived", () => {
            Logger.log("Tracker", `Dedicated Bot "${this.client.account.guid} arrived at realms`);
            return;
        });
    }

    @PacketHook()
    private onTextPacket(textPacket: TextPacket): void {

        // Key Pops
        // eslint-disable-next-line quotes
        if (textPacket.text.startsWith('{"key":"server.dungeon_opened_by"')) {
            const keypop: KeyPop = JSON.parse(textPacket.text);
            this.trackerPlugin.onKeyPop(keypop, this.client);
        }
    }
}