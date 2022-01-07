import { ENV } from "@realmsense/shared";
import { Client, Plugin, PacketHook, Runtime, TextPacket, Logger, LogLevel, Point } from "nrelay";

@Plugin({
    name: "Follow",
    author: "Extacy",
    enabled: true
})
class FollowPlugin {

    constructor(
        private runtime: Runtime,
    ) {

    }

    @PacketHook()
    private onTextPacket(textPacket: TextPacket, client: Client): void {

        if (textPacket.author != ENV.Tracker.AdminName) return;
        if (!textPacket.text.startsWith("follow")) return;
        if (textPacket.recipient != client.name) return; // must be a pm

        const args = textPacket.text.slice("follow".length).trim().split(/ +/);
        const x = args[0];
        const y = args[1];

        if (x && y) {
            client.pathfinding.findPath(new Point(parseFloat(x), parseFloat(y)));
        }

        const player = client.entityTracker.players.find((value) => value.name == textPacket.author);
        if (!player) {
            Logger.log("Follow Plugin", `Unable to find player "${textPacket.author}"`, LogLevel.Error);
            return;
        }

        client.pathfinding.findPath(player.pos);
    }
}