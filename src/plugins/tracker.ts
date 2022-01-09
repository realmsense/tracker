import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { Method } from "axios";
import { Plugin, Runtime, Client, Logger, LogLevel, Player, HttpClient, RequestHeaders } from "nrelay";
import { DedicatedBot, KeyPop, Realm } from ".";
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

        this.api("Delete realms (startup)", "DELETE", "/tracker/realms", null);
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
        this.api(`Add realm ${realm.toString()}`, "PUT", "/tracker/realms", realm, { "Content-Type": "application/json" })

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
        this.api(`Update realm ${realm.toString()}`, "PATCH", "/tracker/realms", realm, { "Content-Type": "application/json" })
    }

    public removeRealm(realm: Realm): void {
        const index = this.realms.findIndex((value) => value.objectID == realm.objectID);
        if (index == -1) {
            Logger.log("Tracker", `Unable to remove non tracked realm: ${realm.server.name} ${realm.name} (objectID: ${realm.objectID})`, LogLevel.Warning);
            return;
        }

        this.realms.slice(index, 1);
        this.emitter.emit("realmClose", realm);
        this.api(`Delete realm ${realm.toString()}`, "DELETE", "/tracker/realms", realm, { "Content-Type": "application/json" })
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

        if (this.currentServerIndex >= serverList.servers.length) {
            if (!this.allServersTracked) {
                Logger.log("Tracker", `All server nexuses are tracked (${serverList.servers.length})`, LogLevel.Success);
                this.allServersTracked = true;
                this.currentServerIndex = 0; // restart counter, to assign available bots
            }
            return;
        }

        // Create Dedicated bot
        if (!this.allServersTracked) {
            const server = serverList.servers[this.currentServerIndex];
            const dedicatedBot = new DedicatedBot(this, client);

            this.bots[server.name] = {
                dedicated: dedicatedBot,
                available: []
            };

            Logger.log(
                "Tracker",
                `Assigning client "${client.account.guid}" to track ${server.name} nexus. (${this.currentServerIndex + 1}/${serverList.servers.length})`,
                LogLevel.Warning
            );

            // Make sure we aren't connecting to the default server
            if (client.account.autoConnect) {
                client.reconnectCooldown = 5000;
                client.account.autoConnect = false;
                client.disconnect();
            };

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
    private async api(logMessage: string, method: Method, path: string, data?: unknown, headers: RequestHeaders = {}): Promise<boolean> {
        if (!ENV.Tracker.API) {
            Logger.log("Tracker", `${logMessage} (API disabled)`, LogLevel.Info);
            return true;
        }

        const request = HttpClient.request(
            method,
            ENV.URL.API + path,
            { authkey: ENV.Authkey.Realms },
            data,
            undefined,
            headers
        );

        return request
            .then((value) => {
                Logger.log("Tracker|API", `Success "${logMessage}". Response: "${value}"`, LogLevel.Message);
                return true;
            })
            .catch((err) => {
                Logger.log("Tracker|API", `Failed to "${logMessage}". Response: "${err.message}". Message: "${err?.response?.data?.message}`, LogLevel.Error);
                return false;
            })
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