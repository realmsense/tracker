import { Client, CreateSuccessPacket, delay, PacketHook, Point, Portal, TextPacket } from "nrelay";
import { TrackerPlugin, Realm, KeyPop } from "..";
import TrackerConfig from "./config/tracker-config.json";
import { TrackerBot } from "./tracker-bot";

export class DedicatedBot extends TrackerBot {

    constructor(
        public trackerPlugin: TrackerPlugin,
        public client: Client
    ) {
        super(trackerPlugin, client, "Dedicated");
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

        this.updateStatus("Ready", `Connected to ${this.client.server.name} ${this.client.map.mapInfo.name}`);
        
        await delay(1000);
        const realmsPos = Point.fromArray(TrackerConfig.Locations.Realms);
        this.updateStatus("Moving", `Walking to realms pos`);
        this.client.pathfinding.findPath(realmsPos);

        this.client.pathfinding.emitter.once("noPath", () => {
            this.updateStatus("Error", "No path to realms!");
            return;
        });
        
        this.client.pathfinding.emitter.once("arrived", () => {
            this.updateStatus("Ready", "Arrived at realms");
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