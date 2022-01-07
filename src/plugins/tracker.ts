import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { Method } from "axios";
import { Plugin, Runtime, Client, Logger, LogLevel, Player, HttpClient, RequestHeaders } from "nrelay";
import { DedicatedBot, KeyPop, Realm } from ".";
import TrackerConfig from "./tracker/config/tracker-config.json";
import { ENV } from "@realmsense/shared";

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
    public readonly players: Player[];

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
        this.players = [];
        this.bots = {};

        this.api("DELETE", "/tracker/realms", null)
            .then((value) => Logger.log("Tracker|API", "Deleted all realms (startup)", LogLevel.Info))
            .catch((reason) => Logger.log("Tracker|API", `Failed to Delete all realms on startup: ${reason.response.data.message} (${reason.response.d.statusCode} ${reason.response.data.error})`, LogLevel.Error));
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

        this.api("PUT", "/tracker/realms", realm, { "Content-Type": "application/json" })
            .then((value) => Logger.log("Tracker|API", `Added realm (ObjectID: ${realm.objectID})`, LogLevel.Info))
            .catch((reason) => Logger.log("Tracker|API", `Failed to Add realm: ${reason.response.data.message} (${reason.response.data.statusCode} ${reason.response.data.error})`, LogLevel.Error));

        // TODO: call method to get an available bot to connect to the realm to track events / get IP address
        // if no available bots are available, add to realmQueue
    }

    public updateRealm(realm: Realm, index?: number): void {
        if (index == undefined) {
            index = this.realms.findIndex((value) => value.objectID == realm.objectID);
        }

        if (index == -1) return;

        this.realms[index].parseObjectStatus(realm.status);
        this.emitter.emit("realmUpdate", realm);
        Logger.log("Tracker", `Updated realm: ${realm.name}`, LogLevel.Debug);

        this.api("PATCH", "/tracker/realms", realm, { "Content-Type": "application/json" })
            .then((value) => Logger.log("Tracker|API", `Updated realm (ObjectID: ${realm.objectID})`, LogLevel.Info))
            .catch((reason) => Logger.log("Tracker|API", `Failed to Update realm: ${reason.response.data.message} (${reason.response.data.statusCode} ${reason.response.data.error})`, LogLevel.Error));
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

        this.api("DELETE", "/tracker/realms", realm, { "Content-Type": "application/json" })
            .then((value) => Logger.log("Tracker|API", `Deleted realm (ObjectID: ${realm.objectID})`, LogLevel.Info))
            .catch((reason) => Logger.log("Tracker|API", `Failed to Delete realm: ${reason.response.data.message} (${reason.response.data.statusCode} ${reason.response.data.error})`, LogLevel.Error));
    }

    public addPlayer(player: Player): void {
        const foundIndex = this.players.findIndex((value) => value.objectID == player.objectID);
        if (foundIndex != -1) {
            this.updatePlayer(player);
            return;
        }

        this.players.push(player);
        this.emitter.emit("playerEnter", player);
        // Logger.log("Tracker", `Added player: ${player.name}`, LogLevel.Debug);
    }

    public updatePlayer(player: Player, index?: number): void {
        if (index == undefined) {
            index = this.players.findIndex((value) => value.objectID == player.objectID);
        }

        if (index == -1) return;

        this.players[index].parseObjectStatus(player.status);
        this.emitter.emit("playerUpdate", player);
        // Logger.log("Tracker", `Updated player: ${player.name}`, LogLevel.Debug);
    }

    public removePlayer(player: Player): void {
        const index = this.players.findIndex((value) => value.objectID == player.objectID);
        if (index == -1) {
            Logger.log("Tracker", `Unable to remove non tracked player: ${player.name} (objectID: ${player.objectID})`, LogLevel.Warning);
            return;
        }

        this.players.slice(index, 1);
        this.emitter.emit("playerLeave", player);
        // Logger.log("Tracker", `Removed player: ${player.name}`, LogLevel.Debug);
    }

    public onKeyPop(keypop: KeyPop, client: Client): void {
        this.emitter.emit("keyPop", keypop, client);
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

    /**
     * Wrapper method for sending requests to our API. See `HttpClient#request`.
     */
    private api(method: Method, path: string, data?: unknown, headers: RequestHeaders = {}): Promise<string> {
        if (!ENV.Tracker.API) {
            return Promise.resolve("API is not enabled");
        }

        return HttpClient.request(
            method,
            ENV.URL.API + path,
            { authkey: ENV.Authkey.Realms },
            null,
            undefined,
            headers
        );
    }
}

export interface TrackerEvents {
    realmOpen: (realm: Realm) => void,
    realmUpdate: (realm: Realm) => void,
    realmClose: (realm: Realm) => void,

    playerEnter: (player: Player) => void,
    playerUpdate: (player: Player) => void,
    playerLeave: (player: Player) => void,

    keyPop: (keypop: KeyPop, client: Client) => void,
    raidStarted: (player: Player) => void,
}