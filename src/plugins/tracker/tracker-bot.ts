import { IBotStatus } from "@realmsense/shared";
import { Client, Logger, LogLevel } from "nrelay";
import { TrackerPlugin } from "..";

export class TrackerBot {

    constructor(
        protected trackerPlugin: TrackerPlugin,
        protected client: Client,
        public type: "Dedicated"|"Available"
    ) { }


    public updateStatus(status: IBotStatus["status"], message: string): void {
        const botStatus: IBotStatus = {
            guid: this.client.account.guid,
            message,
            status,
            time: new Date()
        };

        const logLevel = this.statusToLogLevel(status);
        Logger.log("Tracker|Bot Status", `(${status.toUpperCase()}) ${botStatus.guid} (${this.type}): ${message}`, logLevel);

        void this.trackerPlugin.api("Update Status", "PUT", "/logs/botStatus", botStatus);
    }

    private statusToLogLevel(status: IBotStatus["status"]): LogLevel {
        switch (status) {
            case "Error"  : return LogLevel.Error;
            case "Moving" : return LogLevel.Info;
            case "Waiting": return LogLevel.Message;
            case "Ready"  : return LogLevel.Success;
            default       : return LogLevel.Debug;
        }
    }
}