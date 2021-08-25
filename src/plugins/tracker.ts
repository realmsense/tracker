import { Plugin, Runtime, Client, Logger, LogLevel } from "nrelay";
import { DedicatedBot } from "./tracker/dedicated-bot";

@Plugin({
    name: "Tracker",
    author: "Extacy",
    enabled: false
})
export class TrackerPlugin {

    public allServersTracked: boolean;
    public currentServerIndex: number;

    public bots: {
        [serverName: string]: {
            dedicated: DedicatedBot,
            available: [] 
        }
    }

    constructor(
        public runtime: Runtime
    ) {
        this.bots = {};

        //  Runtime events
        this.runtime.emitter.on("Created", this.onClientCreated.bind(this));

        this.currentServerIndex = 0;
        this.allServersTracked = false;
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