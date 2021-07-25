import { Client, Library, PacketHook, TextPacket, PlayerTextPacket, PlayerData, PlayerTracker } from "nrelay";

@Library({
    name: "Get Info",
    author: "Extacy",
    enabled: true
})
class GetInfoPlugin {

    private playerTracker: PlayerTracker;

    constructor(playerTracker: PlayerTracker) {
        this.playerTracker = playerTracker;
    }

    @PacketHook()
    public onText(client: Client, textPacket: TextPacket): void {

        // Check that the text packet was for the client.
        if (textPacket.recipient !== client.playerData.name) {
            return;
        }

        // Check that the message was "getinfo"
        if (!textPacket.text.startsWith("getinfo")) {
            return;
        }

        const args = textPacket.text.slice("getinfo".length).trim().split(/ +/);

        if (args[0] == "" || args[0] == undefined) {
            const reply = new PlayerTextPacket();
            reply.text = `/tell ${textPacket.name} Usage: /getinfo <name|bot|self> [prop]".`;
            client.io.send(reply);
            return;
        }

        let playerName: string;

        switch (args[0]) {
            case "self":
                playerName = textPacket.name;
                break;
            case "bot":
                playerName = client.playerData.name;
                break;
            default:
                playerName = args[0];
                break;
        }

        const allPlayers = this.playerTracker.getAllPlayers();
        const player = allPlayers.find((player: PlayerData) => player.name == playerName);
        if (player == undefined) {
            const reply = new PlayerTextPacket();
            reply.text = `/tell ${textPacket.name} Unable to find player "${playerName}".`;
            client.io.send(reply);
            return;
        }

        // Handle prop
        if (args[1] != "" && args[1] != undefined) {
            for (const [key, value] of Object.entries(player)) {

                // TypeScript is dumb, can't do just do player.args[1]
                if (key == args[1]) {
                    console.log(value);
                    return;
                }
            }

            const reply = new PlayerTextPacket();
            reply.text = `/tell ${textPacket.name} Prop "${args[1]}" was not found.`;
            client.io.send(reply);
            return;
        } else {
            console.log(player);
        }

        const reply = new PlayerTextPacket();
        reply.text = `/tell ${textPacket.name} Check your console.`;
        client.io.send(reply);
    }
}