import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { Plugin, Runtime, Client, Logger, LogLevel, Player } from "nrelay";
import { DedicatedBot, Realm } from ".";
import TrackerConfig from "./tracker/config/tracker-config.json";

@Plugin({
    name: "Tracker",
    author: "Extacy",
    enabled: true
})
export class TrackerPlugin {

    public runtime: Runtime;
    public readonly emitter: TypedEmitter<TrackerEvents>;

    public allServersTracked: boolean;
    public currentServerIndex: number;

    public readonly realms: Realm[];

    public bots: {
        [serverName: string]: {
            dedicated: DedicatedBot,
            available: [] 
        }
    }

    constructor(runtime: Runtime) {
        
        this.runtime = runtime;
        this.runtime.emitter.on("Created", this.onClientCreated.bind(this));
        
        this.emitter = new EventEmitter();
        
        this.currentServerIndex = 0;
        this.allServersTracked = false;
        
        this.realms = [];
        this.bots = {};
    }

    public addRealm(realm: Realm): void {
        // Duplicate realm
        const foundIndex = this.realms.findIndex((value) => value.objectID == realm.objectID);
        if (foundIndex != -1) {
            this.updateRealm(realm);
            return;
        }

        this.realms.push(realm);
        this.emitter.emit("realmOpen", realm);
        Logger.log("Tracker", `Added realm: ${realm.name}`, LogLevel.Debug);

        // TODO: call method to get an available bot to connect to the realm to track events / get IP address
        // if no available bots are available, add to realmQueue
    }

    public updateRealm(realm: Realm, index?: number): void {
        if (index == undefined) {
            index = this.realms.findIndex((value) => value.objectID == realm.objectID);
        }

        if (index == -1) return;

        this.realms[index].parseStatus(realm.status);
        this.emitter.emit("realmUpdate", realm);
        Logger.log("Tracker", `Updated realm: ${realm.name}`, LogLevel.Debug);
    }
        
    public removeRealm(realm: Realm): void {
        const index = this.realms.findIndex((value) => value.objectID == realm.objectID);
        if (index == -1) {
            Logger.log("Tracker", `Unable to remove non tracked realm: ${realm.server.name} ${realm.name} (objectID: ${realm.objectID})`, LogLevel.Warning);
            return;
        }

        this.realms.slice(index, 1);
        this.emitter.emit("realmClose", realm);
        Logger.log("Tracker", `Removed realm: ${realm.name}`, LogLevel.Debug);
    }

    private onClientCreated(client: Client): void {

        const serverList = this.runtime.serverList;

        if (this.currentServerIndex >= serverList.length) {
            if (!this.allServersTracked) {
                Logger.log("Tracker", `All server nexuses are tracked (${serverList.length})`, LogLevel.Success);
                this.allServersTracked = true;
                this.currentServerIndex = 0; // restart counter, to assign available bots
            }
            return;
        }

        // Create Dedicated bot
        if (!this.allServersTracked) {
            const server = serverList[this.currentServerIndex];
            const dedicatedBot = new DedicatedBot(this, client);

            this.bots[server.name] = {
                dedicated: dedicatedBot,
                available: []
            };

            Logger.log(
                "Tracker",
                `Assigning client "${client.account.guid}" to track ${server.name} nexus. (${this.currentServerIndex + 1}/${serverList.length})`,
                LogLevel.Warning
            );

            if (TrackerConfig.debug.enabled) return;

            // Make sure we aren't connecting to the default server
            client.reconnectCooldown = 5000;
            client.account.autoConnect = false;
            client.disconnect();

            client.connectToServer(server);
            this.currentServerIndex++;
            return;
        }

        // Create Available bot
        // should be designated to a server, because we will be sharing proxy across servers
    }
}

export interface TrackerEvents {
    realmOpen  : (realm: Realm) => void,
    realmUpdate: (realm: Realm) => void,
    realmClose : (realm: Realm) => void,
    
    playerEnter: (player: Player) => void,
    playerLeave: (player: Player) => void,
    
    keyPop: () => void,
    raidStarted: (player: Player) => void,
}