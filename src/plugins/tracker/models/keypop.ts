/**
 * The JSON format received in TextPacket#text when a player pops a key.
 */
export interface KeyPop {
    key: "server.dungeon_opened_by",
    tokens: {
        dungeon: string,
        name: string
    }
}