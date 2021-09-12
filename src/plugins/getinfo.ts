import { Client, Plugin, PacketHook, Runtime, TextPacket, Logger, LogLevel } from "nrelay";
import { PLAYER_NAME } from "..";

@Plugin({
    name: "Get Info",
    author: "Extacy",
    enabled: true
})
class GetInfoPlugin {

    constructor(
        private runtime: Runtime,
    ) {

    }

    @PacketHook()
    private onTextPacket(textPacket: TextPacket, client: Client): void {

        if (textPacket.author != PLAYER_NAME) return;
        if (!textPacket.text.startsWith("getinfo")) return;
        if (textPacket.recipient != client.name) return; // must be a pm

        const args = textPacket.text.slice("getinfo".length).trim().split(/ +/);
        let targetName = args[0];
        const propName = args[1];

        if (!targetName || !propName) {
            Logger.log("Get Info", "Usage: getinfo <name|you|me> <prop>", LogLevel.Warning);
            return;
        }

        switch (args[0]) {
            case "me":
                targetName = textPacket.author;
                break;
            case "you":
                targetName = textPacket.recipient;
                break;
            default:
                break;
        }

        const entity = client.entityTracker.players.find((value) => value.name == targetName);
        if (!entity) {
            Logger.log("Get Info", `Unable to find a player with the name: ${targetName}`, LogLevel.Warning);
            return;
        }
        
        if (!Object.keys(entity).includes(propName)) {
            Logger.log("Get Info", `Unknown property: ${propName}`, LogLevel.Warning);
            return;
        }
        
        Logger.log("Get Info", `The value of "${propName}" is:`, LogLevel.Success);
        console.log((entity as any)[propName]);
    }
}